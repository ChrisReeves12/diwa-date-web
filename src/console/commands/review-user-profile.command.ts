import ConsoleCommand from "./console.command";
import { Command } from "commander";
import { getUser } from "@/server-side-helpers/user.helpers";
import { S3Helper } from "../../server-side-helpers/s3.helper";
import { prismaWrite } from "@/lib/prisma";
import { emitAccountMessage } from "@/server-side-helpers/notification-emitter.helper";
import * as Sentry from '@sentry/nextjs';
import { reviewPhotos as complianceReviewPhotos } from "@/server-side-helpers/compliance.helper";

// This command now delegates photo analysis to the central compliance helper.

export default class ReviewUserProfileCommand extends ConsoleCommand {
    constructor() {
        super(
            'users:review',
            'Review user profile data and generate analysis report',
            [
                {
                    option: '-u, --user-id <userId>',
                    description: 'ID of the user to review',
                    required: false
                }
            ]
        );
    }

    /**
     * Handle command.
     * @param prog
     */
    async handle(prog: Command): Promise<number> {
        const options = prog.opts();

        // Handle single user review
        if (options.userId) {
            const userId = parseInt(options.userId, 10);

            if (isNaN(userId)) {
                console.error('Invalid user ID provided.');
                return 1;
            }

            // For single user review, we'll do a full review
            const result = await this.reviewUser(userId);

            if (result?.error) {
                console.error(result.error);
                Sentry.logger.error('Error during user reviews polling job:', { error: result.error });
                return 1;
            }

            return 0;
        }

        // Batch processing via userReviews has been removed.
        console.error('Please provide a --user-id to review a specific user.');
        return 1;
    }

    /**
     * Review user.
     * Uses compliance helper to review the user's existing photos.
     */
    async reviewUser(userId: number) {
        const user = await getUser(userId);
        if (!user) {
            return { error: 'User not found', success: false };
        }

        if (user.suspendedAt) {
            return { error: 'User is suspended', success: false };
        }

        const s3Helper = new S3Helper();
        const imageFiles: { imageFile: File, s3Path: string }[] = [];

        for (const photo of (user.photos || [])) {
            try {
                const imageBuffer = await s3Helper.downloadImage(photo.path);
                if (!imageBuffer) continue;

                const ext = (photo.path.split('.').pop() || 'jpg').toLowerCase();
                const mimeExt = ext === 'jpg' ? 'jpeg' : ext;
                const file = new File([imageBuffer], photo.path, { type: `image/${mimeExt}` });
                imageFiles.push({ imageFile: file, s3Path: photo.path });
            } catch (e) {
                console.error(`Failed to download or prepare photo ${photo.path} for user ${userId}`, e);
            }
        }

        if (imageFiles.length === 0) {
            return { error: null, success: true };
        }

        const reviewPhotosResult = await complianceReviewPhotos(imageFiles, userId);
        if (reviewPhotosResult?.error) {
            return { error: reviewPhotosResult.error, success: false };
        }

        // complianceReviewPhotos updates user photos/mainPhoto/numOfPhotos in DB.
        // Fetch fresh user to compute notifications and suspension logic.
        const freshUser = await getUser(userId);
        const allPhotos = freshUser?.photos || [];

        let shouldSuspendUser = false;
        for (const p of allPhotos) {
            if (p.isRejected && Array.isArray(p.messages) && p.messages.some(msg =>
                msg.toLowerCase().includes('violence') ||
                msg.toLowerCase().includes('gore') ||
                msg.toLowerCase().includes('nudity') ||
                msg.toLowerCase().includes('scam')
            )) {
                shouldSuspendUser = true;
                break;
            }
        }

        if (shouldSuspendUser) {
            await prismaWrite.users.update({
                where: { id: userId },
                data: {
                    suspendedAt: new Date(),
                    suspendedReason: 'Your account was suspended due to policy violations in profile review. Please contact support for more information.'
                }
            });
            return { error: null, success: true };
        }

        const rejectedPhotos = allPhotos.filter(p => p.isRejected);
        const approvedPhotos = allPhotos.filter(p => !p.isRejected);

        // Delete any existing photo-related notifications
        await prismaWrite.notifications.deleteMany({
            where: {
                recipientId: userId,
                type: "account",
                OR: [
                    {
                        data: {
                            path: ["content"],
                            string_contains: "photos were approved"
                        }
                    },
                    {
                        data: {
                            path: ["content"],
                            string_contains: "photos that were not approved"
                        }
                    }
                ]
            }
        });

        try {
            if (rejectedPhotos.length > 0) {
                const notification = await prismaWrite.notifications.create({
                    data: {
                        recipientId: userId,
                        type: "account",
                        data: { content: "You have some photos that were not approved." }
                    }
                });

                await emitAccountMessage(userId, {
                    noticeType: "account:photosNotApproved",
                    message: "You have some photos that were not approved",
                    data: {
                        notificationId: notification.id,
                        rejectedPhotos,
                        approvedPhotos
                    }
                });
            }
        } catch (notificationError) {
            console.error(`Failed to send notification for user ${userId}:`, notificationError);
            Sentry.logger.error('Error sending photo review notification:', {
                userId,
                error: notificationError,
                rejectedCount: rejectedPhotos.length,
                approvedCount: approvedPhotos.length
            });
        }

        return { error: null, success: true };
    }



}
