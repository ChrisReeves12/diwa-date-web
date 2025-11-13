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
import { prismaRead } from "@/lib/prisma";
import { sendEmail } from "@/server-side-helpers/mail.helper";

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
        const user = await prismaRead.users.findUnique({
            where: { email: email.toLowerCase() },
            select: { id: true, email: true, firstName: true, lastName: true, googleId: true }
        });

        if (!user) {
            return { error: 'No account found with this email address.' };
        }

        if (user.googleId) {
            const loginUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/login`;
            const content = `
                <h1>Password Reset Not Available</h1>
                <p>Hi ${user.firstName}!</p>
                <p>It looks like your Diwa Date account is linked with your Google account.</p>
                <p>To access your account, please sign in using <strong>Continue with Google</strong>.</p>
                <p><a href="${loginUrl}" class="button">Go to Sign In</a></p>
                <p>If you no longer have access to your Google account, please contact support.</p>
            `;

            await sendEmail([user.email], `Sign in with Google to access your account`, content);
            return { success: true };
        }

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
