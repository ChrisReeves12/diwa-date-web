'use server';

import { sendVerificationEmailToUser } from "@/server-side-helpers/user.helpers";

export async function resendVerificationEmail(userId: number) {
    await sendVerificationEmailToUser(userId);
}