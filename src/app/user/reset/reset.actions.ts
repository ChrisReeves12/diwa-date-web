'use server';

import {
    checkUserExists,
    comparePasswords,
    findUserByResetToken,
    updateUserEmail,
    findUserByPasswordResetToken,
    generatePasswordResetToken,
    updateUserPassword
} from "@/server-side-helpers/user.helpers";

/**
 * Reset user's email address
 * @param password
 * @param token
 */
export async function resetUserEmail(password: string, token: string) {
    const user = await findUserByResetToken(token);
    if (!user) {
        return { error: 'The token is invalid or has expired. Please try resetting your email again.', statusCode: 403 };
    }

    // Validate password
    const isPasswordValid = await comparePasswords(password, user.password!);
    if (!isPasswordValid) {
        return { error: 'The password entered does not match our records.', statusCode: 401 };
    }

    // Check if email is already taken
    const exists = await checkUserExists(user.newDesiredEmail!);
    if (exists) {
        return { error: `A user with the email: ${user.newDesiredEmail} already exists.`, statusCode: 421 };
    }

    await updateUserEmail(user.id, user.newDesiredEmail!);

    return { statusCode: 200 };
}

/**
 * Request password reset for user
 * @param email
 */
export async function requestPasswordReset(email: string) {
    try {
        const resetUrl = await generatePasswordResetToken(email);
        if (!resetUrl) {
            return { error: 'No account found with this email address.' };
        }

        return { success: true };
    } catch (error) {
        return { error: 'An error occurred while processing your request.' };
    }
}

/**
 * Reset user's password
 * @param password
 * @param token
 */
export async function resetPassword(password: string, token: string) {
    const user = await findUserByPasswordResetToken(token);
    if (!user) {
        return { error: 'The token is invalid or has expired. Please try resetting your password again.' };
    }

    // Hash and update password
    await updateUserPassword(user.id, password);

    return { success: true };
}
