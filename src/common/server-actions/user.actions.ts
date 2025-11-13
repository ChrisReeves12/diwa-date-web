'use server';

import { getCurrentUser, hashPassword, comparePasswords, getBlockedUsers, unBlockUser, generateEmailUpdateUrl } from "@/server-side-helpers/user.helpers";
import { enableTwoFactorAuth, disableTwoFactorAuth, generateAndSendTwoFactorCode, validateTwoFactorCode } from "@/server-side-helpers/two-factor.helpers";
import { cookies } from "next/headers";
import { prismaRead, prismaWrite } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { deleteSession, getSessionId } from "@/server-side-helpers/session.helpers";
import { sendEmail } from "@/server-side-helpers/mail.helper";
import { cancelPayPalSubscription } from "@/server-side-helpers/paypal.helpers";
import { pgDbReadPool } from "@/lib/postgres";
import { S3Helper } from "@/server-side-helpers/s3.helper";
import { UserPhoto } from "@/types/user-photo.type";
import { logError } from "@/server-side-helpers/logging.helpers";

/**
 * Toggles the online status visibility for the current user.
 * @param hideOnlineStatus
 */
export async function toggleOnlineStatus(hideOnlineStatus: boolean) {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
        throw new Error("User not found");
    }

    await prismaWrite.users.update({
        where: { id: currentUser.id },
        data: { hideOnlineStatus }
    });

    // Don't revalidate the path to prevent popover from closing
    // The UI state is managed locally in the component
}

/**
 * Updates the user's password after verifying the current password
 * @param currentPassword The user's current password
 * @param newPassword The new password to set
 * @returns Success status and any error messages
 */
export async function updatePassword(currentPassword: string, newPassword: string) {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
        return { success: false, error: "User not found" };
    }

    // Get the user's current password hash from the database
    const userWithPassword = await prismaRead.users.findUnique({
        where: { id: currentUser.id },
        select: { password: true }
    });

    if (!userWithPassword || !userWithPassword.password) {
        return { success: false, error: "User not found or password not set" };
    }

    // Verify the current password
    const isCurrentPasswordValid = await comparePasswords(currentPassword, userWithPassword.password);
    if (!isCurrentPasswordValid) {
        return { success: false, error: "Current password is incorrect" };
    }

    // Validate new password
    if (newPassword.length < 8) {
        return { success: false, error: "New password must be at least 8 characters long" };
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
        return { success: false, error: "New password must contain at least one special character" };
    }

    // Hash the new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update the password in the database
    await prismaWrite.users.update({
        where: { id: currentUser.id },
        data: {
            password: hashedNewPassword,
            updatedAt: new Date()
        }
    });

    revalidatePath('/account/security');
    return { success: true };
}

/**
 * Permanently deletes the current user's account and all associated data
 * @param password The user's current password for verification
 * @returns Success status and any error messages
 */
export async function deleteAccount(password: string) {
    const cookieStore = await cookies();
    const currentUser = await getCurrentUser(cookieStore);

    if (!currentUser) {
        return { success: false, error: "User not found" };
    }

    // Get the user's current password hash from the database
    const userWithPassword = await prismaRead.users.findUnique({
        where: { id: currentUser.id },
        select: { password: true }
    });

    if (!userWithPassword || !userWithPassword.password) {
        return { success: false, error: "User not found or password not set" };
    }

    // Verify the current password
    const isPasswordValid = await comparePasswords(password, userWithPassword.password);
    if (!isPasswordValid) {
        return { success: false, error: "Password is incorrect" };
    }

    try {
        // Cancel any active PayPal subscriptions before deleting the account
        const { rows: subscriptionRows } = await pgDbReadPool.query(`
            SELECT id, "paypalSubscriptionId" 
            FROM "subscriptionPlanEnrollments" 
            WHERE "userId" = $1 
            AND "paypalSubscriptionId" IS NOT NULL
        `, [currentUser.id]);

        // Attempt to cancel each active PayPal subscription
        for (const subscription of subscriptionRows) {
            if (subscription.paypalSubscriptionId) {
                try {
                    console.log(`Cancelling PayPal subscription ${subscription.paypalSubscriptionId} for account deletion`);
                    const cancelResult = await cancelPayPalSubscription(
                        subscription.paypalSubscriptionId,
                        'Account deleted by user'
                    );

                    if (!cancelResult.success) {
                        console.error(`Failed to cancel PayPal subscription ${subscription.paypalSubscriptionId}:`, cancelResult.error);
                        // Log the error but continue with account deletion
                        // The subscription will be orphaned, but the user's account will still be deleted
                    } else {
                        console.log(`Successfully cancelled PayPal subscription ${subscription.paypalSubscriptionId}`);
                    }
                } catch (error) {
                    console.error(`Error cancelling PayPal subscription ${subscription.paypalSubscriptionId}:`, error);
                    // Continue with account deletion even if PayPal cancellation fails
                }
            }
        }

        // Fetch ALL user photos
        const userWithPhotos = await prismaRead.users.findUnique({
            where: { id: currentUser.id },
            select: { photos: true }
        });

        const allUserPhotos = (userWithPhotos?.photos as unknown as UserPhoto[]) || [];
        if (allUserPhotos.length > 0) {
            console.log(`Deleting ${allUserPhotos.length} photos from S3 for user ${currentUser.id}`);
            const s3Helper = new S3Helper();

            for (const photo of allUserPhotos) {
                try {
                    if (photo.path) {
                        const originalS3Path = `user-images/${photo.path}`;
                        await s3Helper.deleteFromAllBuckets(originalS3Path);
                        console.log(`Deleted original image: ${originalS3Path}`);
                    }

                    if (photo.croppedImageData?.croppedImagePath) {
                        const croppedS3Path = `user-images/${photo.croppedImageData.croppedImagePath}`;
                        await s3Helper.deleteFromAllBuckets(croppedS3Path);
                        console.log(`Deleted cropped image: ${croppedS3Path}`);
                    }
                } catch (error) {
                    const errorMessage = `Failed to delete photo ${photo.path} from S3 for user ${currentUser.id}`;
                    console.error(errorMessage, error);

                    logError(error instanceof Error ? error : new Error(errorMessage), `Account deletion - S3 cleanup`);
                }
            }
            console.log(`Successfully deleted all photos from S3 for user ${currentUser.id}`);
        }

        // Get the current session ID to delete it after account deletion
        const sessionId = await getSessionId(cookieStore);

        // Delete the user account - this will cascade delete all related records
        // due to the onDelete: Cascade constraints in the database schema
        await prismaWrite.users.delete({
            where: { id: currentUser.id }
        });

        // Delete the current session from Redis
        if (sessionId) {
            await deleteSession(sessionId);
        }

        return { success: true };
    } catch (error) {
        console.error('Account deletion error:', error);
        return { success: false, error: "Failed to delete account. Please try again." };
    }
}

export async function requestAccountDeletionCode() {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
        return { success: false, error: "User not found" };
    }
    const result = await generateAndSendTwoFactorCode(currentUser.id, true);
    if (!result.success) {
        return { success: false, error: result.error || "Failed to send verification code" };
    }
    return { success: true, message: result.message };
}

export async function deleteAccountWithCode(code: string) {
    const cookieStore = await cookies();
    const currentUser = await getCurrentUser(cookieStore);

    if (!currentUser) {
        return { success: false, error: "User not found" };
    }

    const validation = await validateTwoFactorCode(currentUser.id, code);
    if (!validation.success) {
        return { success: false, error: validation.error || "Invalid verification code" };
    }

    try {
        const { rows: subscriptionRows } = await pgDbReadPool.query(`
            SELECT id, "paypalSubscriptionId" 
            FROM "subscriptionPlanEnrollments" 
            WHERE "userId" = $1 
            AND "paypalSubscriptionId" IS NOT NULL
        `, [currentUser.id]);

        for (const subscription of subscriptionRows) {
            if (subscription.paypalSubscriptionId) {
                try {
                    console.log(`Cancelling PayPal subscription ${subscription.paypalSubscriptionId} for account deletion`);
                    const cancelResult = await cancelPayPalSubscription(
                        subscription.paypalSubscriptionId,
                        'Account deleted by user'
                    );

                    if (!cancelResult.success) {
                        console.error(`Failed to cancel PayPal subscription ${subscription.paypalSubscriptionId}:`, cancelResult.error);
                    } else {
                        console.log(`Successfully cancelled PayPal subscription ${subscription.paypalSubscriptionId}`);
                    }
                } catch (error) {
                    console.error(`Error cancelling PayPal subscription ${subscription.paypalSubscriptionId}:`, error);
                }
            }
        }

        const userWithPhotos = await prismaRead.users.findUnique({
            where: { id: currentUser.id },
            select: { photos: true }
        });

        const allUserPhotos = (userWithPhotos?.photos as unknown as UserPhoto[]) || [];
        if (allUserPhotos.length > 0) {
            console.log(`Deleting ${allUserPhotos.length} photos from S3 for user ${currentUser.id}`);
            const s3Helper = new S3Helper();

            for (const photo of allUserPhotos) {
                try {
                    if (photo.path) {
                        const originalS3Path = `user-images/${photo.path}`;
                        await s3Helper.deleteFromAllBuckets(originalS3Path);
                        console.log(`Deleted original image: ${originalS3Path}`);
                    }

                    if (photo.croppedImageData?.croppedImagePath) {
                        const croppedS3Path = `user-images/${photo.croppedImageData.croppedImagePath}`;
                        await s3Helper.deleteFromAllBuckets(croppedS3Path);
                        console.log(`Deleted cropped image: ${croppedS3Path}`);
                    }
                } catch (error) {
                    const errorMessage = `Failed to delete photo ${photo.path} from S3 for user ${currentUser.id}`;
                    console.error(errorMessage, error);

                    logError(error instanceof Error ? error : new Error(errorMessage), `Account deletion - S3 cleanup`);
                }
            }
            console.log(`Successfully deleted all photos from S3 for user ${currentUser.id}`);
        }

        const sessionId = await getSessionId(cookieStore);

        await prismaWrite.users.delete({
            where: { id: currentUser.id }
        });

        if (sessionId) {
            await deleteSession(sessionId);
        }

        return { success: true };
    } catch (error) {
        console.error('Account deletion error:', error);
        return { success: false, error: "Failed to delete account. Please try again." };
    }
}

/**
 * Toggles the account deactivation status for the current user
 * @param deactivate Whether to deactivate (true) or reactivate (false) the account
 * @returns Success status and any error messages
 */
export async function toggleAccountDeactivation(deactivate: boolean) {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
        return { success: false, error: "User not found" };
    }

    await prismaWrite.users.update({
        where: { id: currentUser.id },
        data: {
            deactivatedAt: deactivate ? new Date() : null,
            updatedAt: new Date()
        }
    });

    revalidatePath('/account/security');
    return { success: true };
}

/**
 * Gets the list of blocked users for the current user
 * @returns Array of blocked user details
 */
export async function getBlockedUsersList() {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
        return [];
    }

    return await getBlockedUsers(currentUser.id);
}

/**
 * Unblocks a user for the current user
 * @param blockedUserId The ID of the user to unblock
 * @returns Success status and any error messages
 */
export async function unblockUser(blockedUserId: number) {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
        return { success: false, error: "User not found" };
    }

    try {
        await unBlockUser(currentUser.id, blockedUserId);
        revalidatePath('/account/security');
        return { success: true };
    } catch (error) {
        console.error('Unblock user error:', error);
        return { success: false, error: "Failed to unblock user. Please try again." };
    }
}

/**
 * Updates the user's email address after verification
 * @param newEmail The new email address
 * @returns Success status and any error messages
 */
export async function updateEmail(newEmail: string) {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
        return { success: false, error: "User not found" };
    }

    try {
        // Validate email format
        if (!newEmail.trim()) {
            return { success: false, error: "Email is required" };
        }

        if (!/\S+@\S+\.\S+/.test(newEmail)) {
            return { success: false, error: "Email format is invalid" };
        }

        // Check if email is the same as current
        if (newEmail.toLowerCase() === currentUser.email.toLowerCase()) {
            return { success: false, error: "This is already your current email address" };
        }

        // Check if email is already in use by another user
        const existingUser = await prismaRead.users.findFirst({
            where: {
                email: newEmail.toLowerCase(),
                id: { not: currentUser.id }
            }
        });

        if (existingUser) {
            return { success: false, error: "This email address is already in use" };
        }

        // Generate email verification URL
        const emailUpdateUrl = await generateEmailUpdateUrl(currentUser.id, newEmail);

        // Send verification email to the new email address
        await sendEmail(
            [`${currentUser.firstName} ${currentUser.lastName} <${newEmail}>`],
            `Verification of email change for ${currentUser.firstName} ${currentUser.lastName}`,
            `
                <h1>Verification Of Email Change</h1>
                <div>
                    <p>Hello ${currentUser.firstName}!</p>
                    <p>You are receiving this email because we received a request for the email belonging to the account 
                        for ${currentUser.firstName} ${currentUser.lastName} to be updated from <strong>${currentUser.email}</strong> to <strong>${newEmail}</strong>. If you did not make this request, please let us know so that we can 
                        investigate the matter.</p>
                    <p>Your account email will <strong>not</strong> be updated until you click the link below, in which you will be asked to confirm this update with your account password.</p>
                    <p>Click the link below to validate your email change request.</p>
                    <p><a href="${emailUpdateUrl}" class="button">Verify Email Change</a></p>
                    <p>If the button doesn't work, copy and paste this link into your browser:</p>
                    <p><a href="${emailUpdateUrl}">${emailUpdateUrl}</a></p>
                </div>
            `
        );

        revalidatePath('/account/settings');
        return { success: true };
    } catch (error) {
        console.error('Email update error:', error);
        return { success: false, error: "Failed to send verification email. Please try again." };
    }
}

/**
 * Server action to report a user
 * @param reportedUserId The ID of the user being reported
 * @param reportContent The reason for reporting
 * @returns Success status and any error messages
 */
export async function reportUserAction(
    reportedUserId: number,
    reportContent: string
) {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
        return { success: false, error: "User not found" };
    }

    const { reportUser } = await import("@/server-side-helpers/user.helpers");
    return await reportUser(currentUser.id, reportedUserId, reportContent);
}

/**
 * Enable two-factor authentication for the current user
 * @param password The user's current password for verification (no longer used)
 * @returns Success status and any error messages
 */
export async function enableTwoFactor(password: string) {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
        return { success: false, error: "User not found" };
    }

    // Check if 2FA is already enabled
    if (currentUser.require2fa) {
        return { success: false, error: "Two-factor authentication is already enabled" };
    }

    try {
        // Enable 2FA
        const result = await enableTwoFactorAuth(currentUser.id);

        if (!result.success) {
            return { success: false, error: result.error || "Failed to enable two-factor authentication" };
        }

        revalidatePath('/account/settings');
        return { success: true, message: "Two-factor authentication has been enabled for your account" };
    } catch (error) {
        console.error('Enable 2FA error:', error);
        return { success: false, error: "Failed to enable two-factor authentication. Please try again." };
    }
}

/**
 * Disable two-factor authentication for the current user
 * @param password The user's current password for verification (no longer used)
 * @returns Success status and any error messages
 */
export async function disableTwoFactor(password: string) {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
        return { success: false, error: "User not found" };
    }

    // Check if 2FA is already disabled
    if (!currentUser.require2fa) {
        return { success: false, error: "Two-factor authentication is already disabled" };
    }

    try {
        // Disable 2FA
        const result = await disableTwoFactorAuth(currentUser.id);

        if (!result.success) {
            return { success: false, error: result.error || "Failed to disable two-factor authentication" };
        }

        revalidatePath('/account/settings');
        return { success: true, message: "Two-factor authentication has been disabled for your account" };
    } catch (error) {
        console.error('Disable 2FA error:', error);
        return { success: false, error: "Failed to disable two-factor authentication. Please try again." };
    }
}
