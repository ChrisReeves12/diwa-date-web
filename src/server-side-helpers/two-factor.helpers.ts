import { randomInt } from 'crypto';
import { User } from '@/types/user.interface';
import { log, logError } from '@/server-side-helpers/logging.helpers';
import { sendEmail } from '@/server-side-helpers/mail.helper';
import { prismaRead, prismaWrite } from '@/lib/prisma';

const COOLDOWN_PERIOD = 60 * 1000; // 1 minute in milliseconds
const CODE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_ATTEMPTS = 5;

/**
 * Generate a secure 6-digit two-factor authentication code
 * @returns A 6-digit string code
 */
export function generateTwoFactorCode(): string {
    return randomInt(100000, 999999).toString();
}

/**
 * Send two-factor authentication code via email
 * @param email - Recipient email address
 * @param code - 6-digit authentication code
 * @param isDeletionVerification
 * @returns Promise with result of email send operation
 */
export async function sendTwoFactorCode(email: string, code: string, isDeletionVerification = false) {
    try {
        const content = `
            <h1>Your ${isDeletionVerification ? 'Account Deletion' : 'Sign In'} Verification Code</h1>
            <p>Hello,</p>
            <p>You are attempting to ${isDeletionVerification ? 'delete' : 'sign in to'} your Diwa Date account. To complete the ${isDeletionVerification ? 'deletion' : 'sign-in'} process, please enter the following 6-digit verification code:</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <h2 style="font-size: 36px; letter-spacing: 8px; margin: 0; font-family: monospace; color: #0092e4;">${code}</h2>
            </div>
            
            <p><strong>This code will expire in 5 minutes</strong> for your security.</p>
            
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                <h3 style="color: #856404; margin-top: 0;">Security Notice</h3>
                <p style="color: #856404; margin-bottom: 0;">
                    <strong>Never share this code with anyone.</strong> Diwa Date will never ask you for this code via phone, email, or any other method. 
                    If you did not request this code, please ignore this email and consider changing your password.
                </p>
            </div>
            
            <p>If you have any questions or concerns about your account security, please contact our support team immediately. ${isDeletionVerification ? 'We appreciate you being a part of the Diwa Date community, and wish you the best of luck in your search.' : ''}</p>
            
            <p>Best regards,<br>The Diwa Date Security Team</p>
        `;

        const result = await sendEmail(
            [email],
            `Your ${isDeletionVerification ? 'Account Deletion' : 'Sign In'} Verification Code`,
            content
        );

        if (result.hasError) {
            log(`Failed to send 2FA code to ${email}`, 'error');
            logError(result.error);
            return { success: false, error: result.error };
        }

        log(`2FA code sent successfully to ${email}`, 'info');
        return { success: true };

    } catch (error: any) {
        log('Error sending 2FA code email', 'error');
        logError(error);
        return { success: false, error };
    }
}

/**
 * Validate a two-factor authentication code with rate limiting and expiration checks
 * @param userId - User ID to validate code for
 * @param inputCode - Code input by user
 * @returns Promise with validation result
 */
export async function validateTwoFactorCode(userId: number, inputCode: string) {
    try {
        const user = await prismaRead.users.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                twoFactorCode: true,
                twoFactorCodeExpiry: true,
                twoFactorCodeAttempts: true
            }
        });

        if (!user) {
            return {
                success: false,
                error: 'User not found',
                errorCode: 'USER_NOT_FOUND'
            };
        }

        if (!user.twoFactorCode || !user.twoFactorCodeExpiry) {
            return {
                success: false,
                error: 'No active 2FA code found',
                errorCode: 'NO_ACTIVE_CODE'
            };
        }

        // Check if code has expired
        if (new Date() > user.twoFactorCodeExpiry) {
            await cleanupExpiredCodes();
            return {
                success: false,
                error: 'Code has expired. Please request a new one.',
                errorCode: 'CODE_EXPIRED'
            };
        }

        // Check if too many attempts
        if ((user.twoFactorCodeAttempts || 0) >= MAX_ATTEMPTS) {
            await prismaWrite.users.update({
                where: { id: userId },
                data: {
                    twoFactorCode: null,
                    twoFactorCodeExpiry: null,
                    twoFactorCodeAttempts: 0
                }
            });

            return {
                success: false,
                error: 'Too many failed attempts. Please request a new code.',
                errorCode: 'TOO_MANY_ATTEMPTS'
            };
        }

        // Validate the code
        if (user.twoFactorCode !== inputCode.trim()) {
            // Increment attempts
            await prismaWrite.users.update({
                where: { id: userId },
                data: {
                    twoFactorCodeAttempts: (user.twoFactorCodeAttempts || 0) + 1
                }
            });

            const remainingAttempts = MAX_ATTEMPTS - ((user.twoFactorCodeAttempts || 0) + 1);

            log(`Invalid 2FA code attempt for user ${userId}. Remaining attempts: ${remainingAttempts}`, 'warn');

            return {
                success: false,
                error: `Invalid code. ${remainingAttempts} attempts remaining.`,
                errorCode: 'INVALID_CODE',
                remainingAttempts
            };
        }

        // Code is valid - clear the 2FA code data
        await prismaWrite.users.update({
            where: { id: userId },
            data: {
                twoFactorCode: null,
                twoFactorCodeExpiry: null,
                twoFactorCodeAttempts: 0
            }
        });

        log(`2FA code validated successfully for user ${userId}`, 'info');

        return {
            success: true,
            message: 'Code validated successfully'
        };

    } catch (error: any) {
        log('Error validating 2FA code', 'error');
        logError(error);
        return {
            success: false,
            error: 'An error occurred while validating the code',
            errorCode: 'VALIDATION_ERROR'
        };
    }
}

/**
 * Check if a user can request a new 2FA code (cooldown period check)
 * @param userId - User ID to check
 * @returns Promise with result indicating if new code can be requested
 */
export async function canRequestNewCode(userId: number) {
    try {
        const user = await prismaRead.users.findUnique({
            where: { id: userId },
            select: {
                lastTwoFactorCodeSentAt: true
            }
        });

        if (!user) {
            return { canRequest: false, error: 'User not found' };
        }

        if (!user.lastTwoFactorCodeSentAt) {
            return { canRequest: true };
        }

        const timeSinceLastRequest = Date.now() - user.lastTwoFactorCodeSentAt.getTime();

        if (timeSinceLastRequest < COOLDOWN_PERIOD) {
            const remainingTime = Math.ceil((COOLDOWN_PERIOD - timeSinceLastRequest) / 1000);
            return {
                canRequest: false,
                error: `Please wait ${remainingTime} seconds before requesting a new code`,
                remainingSeconds: remainingTime
            };
        }

        return { canRequest: true };

    } catch (error: any) {
        log('Error checking 2FA code request cooldown', 'error');
        logError(error);
        return { canRequest: false, error: 'An error occurred' };
    }
}

/**
 * Generate and send a new 2FA code to a user
 * @param userId - User ID to send code to
 * @param isDeletionVerification
 * @returns Promise with result of code generation and send operation
 */
export async function generateAndSendTwoFactorCode(userId: number, isDeletionVerification = false) {
    try {
        // Check cooldown period
        const canRequestResponse = await canRequestNewCode(userId);
        if (!canRequestResponse.canRequest) {
            return {
                success: false,
                error: canRequestResponse.error,
                errorCode: 'COOLDOWN_ACTIVE',
                remainingSeconds: canRequestResponse.remainingSeconds
            };
        }

        const user = await prismaRead.users.findUnique({
            where: { id: userId },
            select: { id: true, email: true }
        });

        if (!user) {
            return {
                success: false,
                error: 'User not found',
                errorCode: 'USER_NOT_FOUND'
            };
        }

        const code = generateTwoFactorCode();
        const expiry = new Date(Date.now() + CODE_EXPIRY);

        // Update user with new code
        await prismaWrite.users.update({
            where: { id: userId },
            data: {
                twoFactorCode: code,
                twoFactorCodeExpiry: expiry,
                twoFactorCodeAttempts: 0,
                lastTwoFactorCodeSentAt: new Date()
            }
        });

        // Send the code via email
        const emailResult = await sendTwoFactorCode(user.email, code, isDeletionVerification);

        if (!emailResult.success) {
            return {
                success: false,
                error: 'Failed to send verification code. Please try again.',
                errorCode: 'EMAIL_SEND_FAILED'
            };
        }

        return {
            success: true,
            message: 'Verification code sent to your email',
            expiresAt: expiry
        };

    } catch (error: any) {
        log(`Error generating and sending ${isDeletionVerification ? 'Account deletion' : '2FA'} code`, 'error');
        logError(error);
        return {
            success: false,
            error: 'An error occurred while sending the code',
            errorCode: 'GENERATION_ERROR'
        };
    }
}

/**
 * Clean up expired 2FA codes from the database
 * @returns Promise with cleanup result
 */
export async function cleanupExpiredCodes() {
    try {
        const result = await prismaWrite.users.updateMany({
            where: {
                twoFactorCodeExpiry: {
                    lt: new Date()
                }
            },
            data: {
                twoFactorCode: null,
                twoFactorCodeExpiry: null,
                twoFactorCodeAttempts: 0
            }
        });

        if (result.count > 0) {
            log(`Cleaned up ${result.count} expired 2FA codes`, 'info');
        }

        return { success: true, cleanedCount: result.count };

    } catch (error: any) {
        log('Error cleaning up expired 2FA codes', 'error');
        logError(error);
        return { success: false, error };
    }
}

/**
 * Enable 2FA for a user
 * @param userId - User ID to enable 2FA for
 * @returns Promise with result of enabling 2FA
 */
export async function enableTwoFactorAuth(userId: number) {
    try {
        await prismaWrite.users.update({
            where: { id: userId },
            data: {
                require2fa: true
            }
        });

        log(`2FA enabled for user ${userId}`, 'info');
        return { success: true, message: '2FA has been enabled for your account' };

    } catch (error: any) {
        log('Error enabling 2FA', 'error');
        logError(error);
        return { success: false, error: 'Failed to enable 2FA' };
    }
}

/**
 * Disable 2FA for a user
 * @param userId - User ID to disable 2FA for
 * @returns Promise with result of disabling 2FA
 */
export async function disableTwoFactorAuth(userId: number) {
    try {
        await prismaWrite.users.update({
            where: { id: userId },
            data: {
                require2fa: false,
                twoFactorCode: null,
                twoFactorCodeExpiry: null,
                twoFactorCodeAttempts: 0,
                lastTwoFactorCodeSentAt: null
            }
        });

        log(`2FA disabled for user ${userId}`, 'info');
        return { success: true, message: '2FA has been disabled for your account' };

    } catch (error: any) {
        log('Error disabling 2FA', 'error');
        logError(error);
        return { success: false, error: 'Failed to disable 2FA' };
    }
}
