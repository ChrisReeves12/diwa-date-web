'use server';

import { sendVerificationEmailToUser } from "@/server-side-helpers/user.helpers";

export async function resendVerificationEmail(userId: number, email: string, firstName: string, lastName: string) {
    await sendVerificationEmailToUser(userId, email, firstName, lastName);
}