import ConsoleCommand from "./console.command";
import { Command } from "commander";
import { getUser } from "@/server-side-helpers/user.helpers";
import { S3Helper } from "../../server-side-helpers/s3.helper";
import { v4 as uuidv4 } from 'uuid';
import fs from "fs";
import axios from "axios";
import http from "http";
import { prismaRead, prismaWrite } from "@/lib/prisma";
import FormData from 'form-data';
import { ImageAnalysisSummary } from "@/types/image-analysis.types";
import { UserPhoto } from "@/types";
import ssim from 'ssim.js';
import sharp from 'sharp';
import { emitAccountMessage } from "@/server-side-helpers/notification-emitter.helper";

const axiosInstance = axios.create({
    httpAgent: new http.Agent({keepAlive: true, maxSockets: 100}),
});

const SIGHTENGINE_MODELS = [
    'nudity-2.1',
    'weapon',
    'recreational_drug',
    'medical',
    'type',
    'offensive-2.0',
    'faces',
    'scam',
    'text-content',
    'face-attributes',
    'gore-2.0',
    'text',
    'qr-content',
    'tobacco',
    'genai',
    'violence',
    'self-harm',
    'gambling'
];

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

        if (options.userId) {
            console.log(`Starting user profile review for user ID: ${options.userId}`);
        } else {
            console.log('Starting batch user profile review...');
        }

        // Handle single user review
        if (options.userId) {
            const userId = parseInt(options.userId, 10);

            if (isNaN(userId)) {
                console.error('Invalid user ID provided.');
                return 1;
            }

            const result = await this.reviewUser(userId);

            if (result?.error) {
                console.error(result.error);
                return 1;
            }

            console.log('User profile review completed successfully.');
            return 0;
        }

        // Handle batch user reviews
        const batchSize = 5000;
        let offset = 0;

        while (true) {
            const userReviews = await prismaRead.userReviews.findMany({
                orderBy: {
                    createdAt: 'asc',
                },
                take: batchSize,
                skip: offset
            });

            if (userReviews.length === 0) break;

            for (const userReview of userReviews) {
                const result = await this.reviewUser(userReview.userId);
                if (result?.error) {
                    if (result.error.includes('suspended')) {
                        console.log('User has already been suspended');
                    } else {
                        console.error(result.error);
                    }
                }

                await prismaWrite.userReviews.delete({
                    where: {
                        id: userReview.id
                    }
                });
            }

            offset += userReviews.length;
        }

        return 0;
    }

    /**
     * Review user.
     * @param userId
     */
    async reviewUser(userId: number) {
        const user = await getUser(userId);
        if (!user) {
            return {error: 'User not found', success: false};
        }

        if (user.suspendedAt) {
            return {error: 'User is suspended', success: false};
        }

        console.log(`Reviewing profile for user ID: ${userId}, Email: ${user.email}`);

        // Review photos
        const reviewPhotosResult= (user.photos || []).filter(p => p.isUnderReview).length > 0 ?
            await this.reviewPhotos(user.photos!) : null;

        if (reviewPhotosResult?.error) {
            return {error: reviewPhotosResult.error, success: false};
        }

        if (reviewPhotosResult?.photos && reviewPhotosResult.photos.length > 0) {
            // Update photos in database
            await prismaWrite.users.update({
                where: { id: userId },
                data: {
                    photos: user.photos!.map(photo => {
                        const updatedPhoto = reviewPhotosResult.photos!.find(p => p.photo.path === photo.path);
                        return updatedPhoto ? updatedPhoto.photo : photo;
                    }) as any
                }
            });

            let shouldSuspendUser = false;

            // If any photos were rejected for serious issues, suspend the user
            for (const photoWithFilePath of reviewPhotosResult.photos) {
                if (photoWithFilePath.photo.isRejected && photoWithFilePath.photo.messages &&
                    photoWithFilePath.photo.messages.some(msg =>
                        msg.toLowerCase().includes('violence') ||
                        msg.toLowerCase().includes('gore') ||
                        msg.toLowerCase().includes('nudity') ||
                        msg.toLowerCase().includes('scam'))) {
                    shouldSuspendUser = true;
                    break;
                }
            }

            if (shouldSuspendUser) {
                console.log(`Suspending user ID: ${userId} due to serious infractions.`);
                await prismaWrite.users.update({
                    where: {id: userId},
                    data: {
                        suspendedAt: new Date(),
                        suspendedReason: 'Your account was suspended due to policy violations in profile review. Please contact support for more information.'
                    }
                });

                // Todo: Send suspension email to user
                return {error: null, success: true};
            }

            const rejectedPhotos = reviewPhotosResult.photos.filter(p =>
                p.photo.isRejected).map(p => p.photo);
            const approvedPhotos = reviewPhotosResult.photos.filter(p =>
                !p.photo.isRejected).map(p => p.photo);

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

            if (rejectedPhotos.length > 0) {
                const notification = await prismaWrite.notifications.create({
                    data: {
                        recipientId: userId,
                        type: "account",
                        data: {content: "You have some photos that were not approved."}
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
            } else {
                // Create database notification for approved photos
                const notification = await prismaWrite.notifications.create({
                    data: {
                        recipientId: userId,
                        type: "account",
                        data: {content: "Your photos were approved!"}
                    }
                });

                await emitAccountMessage(userId, {
                    noticeType: "account:photosApproved",
                    message: "Your photos were approved!",
                    data: {
                        notificationId: notification.id,
                        rejectedPhotos,
                        approvedPhotos
                    }
                });
            }
        }

        // Todo: Review other profile data (bio, interests, etc.)

        return {error: null, success: true};
    }

    /**
     * Review user photos
     * @param allUserPhotos
     * @param allUserPhotos
     */
    async reviewPhotos(allUserPhotos: UserPhoto[]) {
        // Download images from S3 that are in review
        const s3Helper = new S3Helper();

        const reviewPhotosWithFilePath: { tempFilePath: string, photo: UserPhoto }[] = [];
        const allPhotosWithFilePath: { tempFilePath: string, photo: UserPhoto }[] = [];

        for (const photo of allUserPhotos) {
            try {
                if (photo.isRejected) continue;

                const imageBuffer = await s3Helper.downloadImage(photo.path);

                // Save images to temp files
                const fileExt = photo.path.split('.').pop();
                const tempFilePath = `/tmp/temp-img-${uuidv4()}.${fileExt}`;

                await fs.promises.writeFile(tempFilePath, imageBuffer);
                allPhotosWithFilePath.push({tempFilePath, photo});

                if (photo.isUnderReview) {
                    reviewPhotosWithFilePath.push({tempFilePath, photo});
                }
            } catch (e) {
                return {error: `Failed to download or write temp file for: ${photo.path}`, success: false};
            }
        }

        // Send each image to the external review service
        for (const photoWithFilePath of reviewPhotosWithFilePath) {
            // First check to see if this image is using the same base image as an existing image
            const isDupedImageResult = await this.isImageDuplicated(photoWithFilePath.tempFilePath,
                allPhotosWithFilePath.map(p => p.tempFilePath));

            if (isDupedImageResult.error) {
                return {error: isDupedImageResult.error, success: false};
            }

            if (isDupedImageResult.isDuplicate) {
                photoWithFilePath.photo.isRejected = true;
                photoWithFilePath.photo.messages = ['Photo appears to be a duplicate of another photo'];

                fs.unlink(photoWithFilePath.tempFilePath, (err) => {
                    if (err) console.error('Failed to delete temp file:', err);
                });

                continue;
            }

            // Make a call to SightEngine for further image analysis
            const data = new FormData();
            data.append('media', fs.createReadStream(photoWithFilePath.tempFilePath));
            data.append('models', SIGHTENGINE_MODELS.join(','));
            data.append('api_user', process.env.SIGHTENGINE_API_USER as string);
            data.append('api_secret', process.env.SIGHTENGINE_API_SECRET as string);

            const response = await axiosInstance
                .post('https://api.sightengine.com/1.0/check.json', data, {
                    headers: data.getHeaders(),
                    validateStatus: (status) => true
                });

            if (response.status !== 200) {
                return {
                    error: `External review service returned status ${response.status}`,
                    success: false
                };
            }

            const summary = this.summarizeImageAnalysis(response.data);
            if (!summary.success || !summary.analysis) {
                console.error(summary.error);
                return {
                    error: `Failed to summarize image analysis for ${photoWithFilePath.photo.path}`,
                    success: false
                };
            }

            // Image should be approved if no issues found
            if (!summary.analysis.messages || summary.analysis.messages.length === 0) {
                photoWithFilePath.photo.isUnderReview = false;
                photoWithFilePath.photo.isRejected = false;
                continue;
            }

            // Add issues for review
            photoWithFilePath.photo.isRejected = true;
            photoWithFilePath.photo.messages = summary.analysis.messages;

            fs.unlink(photoWithFilePath.tempFilePath, (err) => {
                if (err) console.error('Failed to delete temp file:', err);
            });
        }

        return {error: null, success: true, photos: reviewPhotosWithFilePath};
    }

    /**
     * Summarize image analysis from SiteEngine.
     * @param data
     */
    summarizeImageAnalysis(data: any) {
        const analysisReport: any = {};

        if (data.status !== 'success') {
            return {error: 'Image analysis failed', success: false};
        }

        // Process nudity analysis
        if (data.nudity) {
            analysisReport.nudity = {
                raw: data.nudity,
                isNude: data.nudity.raw > 0.5 || data.nudity.partial > 0.5,
                isPartialNude: data.nudity.partial > 0.5 && data.nudity.raw <= 0.5,
                isSafe: data.nudity.safe > 0.5
            };

            if (analysisReport.nudity.isNude) {
                analysisReport.messages = [...(analysisReport.messages || []),
                    analysisReport.nudity.isPartialNude ? 'Photo contains partial nudity' : 'Photo contains full nudity'];
            }
        }

        // Process weapon detection
        if (data.weapon) {
            analysisReport.weapon = {
                raw: data.weapon,
                containsWeapon: data.weapon > 0.5
            };

            if (analysisReport.weapon.containsWeapon) {
                analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains weapon'];
            }
        }

        // Process recreational drug detection
        if (data.recreational_drug) {
            analysisReport.recreational_drug = {
                raw: data.recreational_drug,
                containsRecreationalDrug: data.recreational_drug > 0.5
            };

            if (analysisReport.recreational_drug.containsRecreationalDrug) {
                analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains recreational drug'];
            }
        }

        // Process medical content detection
        if (data.medical) {
            analysisReport.medical = {
                raw: data.medical,
                containsMedicalContent: data.medical > 0.5
            };

            if (analysisReport.medical.containsMedicalContent) {
                analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains medical content'];
            }
        }

        // Process offensive content detection
        if (data.offensive) {
            analysisReport.offensive = {
                raw: data.offensive,
                isOffensive: data.offensive > 0.5
            };

            if (analysisReport.offensive.isOffensive) {
                analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains offensive content'];
            }
        }

        // Process gore detection
        if (data.gore) {
            analysisReport.gore = {
                raw: data.gore,
                containsGore: data.gore > 0.5
            };

            if (analysisReport.gore.containsGore) {
                analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains gore'];
            }
        }

        // Process violence detection
        if (data.violence) {
            analysisReport.violence = {
                raw: data.violence,
                containsViolence: data.violence > 0.5
            };

            if (analysisReport.violence.containsViolence) {
                analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains violence'];
            }
        }

        // Process self-harm detection
        if (data['self-harm']) {
            analysisReport.self_harm = {
                raw: data['self-harm'],
                containsSelfHarmContent: data['self-harm'] > 0.5
            };

            if (analysisReport.self_harm.containsSelfHarmContent) {
                analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains self-harm content'];
            }
        }

        // Process scam detection
        if (data.scam) {
            analysisReport.scam = {
                raw: data.scam,
                containsScamContent: data.scam > 0.5
            };

            if (analysisReport.scam.containsScamContent) {
                analysisReport.messages = [...(analysisReport.messages || []), 'Photo has been identified as scam content'];
            }
        }

        // Process gambling detection
        if (data.gambling) {
            analysisReport.gambling = {
                raw: data.gambling,
                containsGamblingContent: data.gambling > 0.5
            };

            if (analysisReport.gambling.containsGamblingContent) {
                analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains gambling content'];
            }
        }

        // Process tobacco detection
        if (data.tobacco) {
            analysisReport.tobacco = {
                raw: data.tobacco,
                containsTobaccoContent: data.tobacco > 0.5
            };

            if (analysisReport.tobacco.containsTobaccoContent) {
                analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains tobacco content'];
            }
        }

        // Process generative AI detection
        if (data.type) {
            analysisReport.aiGenerated = {
                raw: data.type,
                isAIGenerated: data.type.ai_generated > 0.5
            };

            if (analysisReport.aiGenerated.isAIGenerated) {
                analysisReport.messages = [...(analysisReport.messages || []), 'Photo appears to be AI-generated'];
            }
        }

        // Process is illustration detection
        if (data.type) {
            analysisReport.isIllustration = {
                raw: data.type,
                isIllustration: data.type.illustration > 0.5
            };

            if (analysisReport.isIllustration.isIllustration) {
                analysisReport.messages = [...(analysisReport.messages || []), 'Photo appears to be an illustration'];
            }
        }

        // Process qr-content detection
        if (data.qr) {
            analysisReport.qrContent = {
                raw: data.qr,
                hasLinks: Array.isArray(data.qr.link) && data.qr.link.length > 0,
                hasSocialLinks: Array.isArray(data.qr.social) && data.qr.social.length > 0,
                hasSpamContent: Array.isArray(data.qr.spam) && data.qr.spam.length > 0,
                hasProfanity: Array.isArray(data.qr.profanity) && data.qr.profanity.length > 0,
                isBlacklisted: Array.isArray(data.qr.blacklist) && data.qr.blacklist.length > 0,
                hasPersonalInfo: Array.isArray(data.qr.personal) && data.qr.personal.length > 0
            };

            if (analysisReport.qrContent.isBlacklisted) {
                analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains blacklisted QR code'];
            }
        }

        // Process text detection
        if (data.text) {
            analysisReport.text = {
                raw: data.text,
                hasProfanity: Array.isArray(data.text.profanity) && data.text.profanity.length > 0,
                hasPersonalInfo: Array.isArray(data.text.personal) && data.text.personal.length > 0,
                hasLinks: Array.isArray(data.text.link) && data.text.link.length > 0,
                hasSocialLinks: Array.isArray(data.text.social) && data.text.social.length > 0,
                hasExtremism: Array.isArray(data.text.extremism) && data.text.extremism.length > 0,
                hasMedicalContent: Array.isArray(data.text.medical) && data.text.medical.length > 0,
                hasDrugReferences: Array.isArray(data.text.drug) && data.text.drug.length > 0,
                hasWeaponReferences: Array.isArray(data.text.weapon) && data.text.weapon.length > 0,
                hasContentTrade: Array.isArray(data.text["content-trade"]) && data.text["content-trade"].length > 0,
                hasMoneyTransactions: Array.isArray(data.text["money-transaction"]) && data.text["money-transaction"].length > 0,
                hasSpam: Array.isArray(data.text.spam) && data.text.spam.length > 0,
                hasViolence: Array.isArray(data.text.violence) && data.text.violence.length > 0,
                hasSelfHarm: Array.isArray(data.text["self-harm"]) && data.text["self-harm"].length > 0,
                hasArtificialText: data.text.has_artificial > 0.5,
                hasNaturalText: data.text.has_natural > 0.5
            };

            if (analysisReport.text.hasProfanity) {
                analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains inappropriate text'];
            }
        }

        // Process faces detection
        if (data.faces) {
            analysisReport.faces = {
                raw: data.faces,
                count: Array.isArray(data.faces) ? data.faces.length : 0,
                hasFaces: Array.isArray(data.faces) && data.faces.length > 0,
                hasMinors: Array.isArray(data.faces) && data.faces.some((face: any) =>
                    face.attributes && face.attributes.minor > 0.5),
                hasSunglasses: Array.isArray(data.faces) && data.faces.some((face: any) =>
                    face.attributes && face.attributes.sunglasses > 0.5)
            };

            if (analysisReport.faces.hasMinors) {
                analysisReport.messages = [...(analysisReport.messages || []), 'Photo contains faces of minors'];
            }

            if (!analysisReport.faces.hasFaces) {
                analysisReport.messages = [...(analysisReport.messages || []), 'You must have a clear face in your photo'];
            }
        }

        return {
            error: null, success: true,
            analysis: analysisReport as ImageAnalysisSummary
        };
    }

    /**
     * Check if image is duplicated.
     * @param tempFilePath
     * @param allTempImagePaths
     */
    async isImageDuplicated(tempFilePath: string, allTempImagePaths: string[]) {

        try {
            for (const otherTempFilePath of allTempImagePaths) {
                if (otherTempFilePath === tempFilePath) continue;

                // Convert images to ImageData objects
                const img1 = await this.loadImageData(tempFilePath);
                const img2 = await this.loadImageData(otherTempFilePath);

                const result = ssim(img1, img2);
                if (result.mssim >= 0.95) {
                    return {error: null, success: true, isDuplicate: true};
                }
            }

            return {error: null, success: true, isDuplicate: false};
        } catch (e) {
            return {error: 'Failed to compare images for duplication', success: false, isDuplicate: false};
        }
    }

    /**
     * Load image data from file path and convert to ImageData format
     * Resizes images to a standard size for comparison
     * @param filePath
     */
    private async loadImageData(filePath: string): Promise<ImageData> {
        const STANDARD_SIZE = 256;

        const image = sharp(filePath);
        const { data, info } = await image
            .resize(STANDARD_SIZE, STANDARD_SIZE, { fit: 'fill' })
            .raw()
            .ensureAlpha()
            .toBuffer({ resolveWithObject: true });

        return {
            data: new Uint8ClampedArray(data),
            width: info.width,
            height: info.height
        } as ImageData;
    }
}
