'use server';

import { getCurrentUser, hashPassword, comparePasswords, getBlockedUsers, unBlockUser } from "@/server-side-helpers/user.helpers";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { deleteSession, getSessionId } from "@/server-side-helpers/session.helpers";
import { redirect } from "next/navigation";

/**
 * Toggles the online status visibility for the current user.
 * @param hideOnlineStatus
 */
export async function toggleOnlineStatus(hideOnlineStatus: boolean) {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
        throw new Error("User not found");
    }

    await prisma.users.update({
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
    const userWithPassword = await prisma.users.findUnique({
        where: { id: currentUser.id },
        select: { password: true }
    });

    if (!userWithPassword) {
        return { success: false, error: "User not found" };
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
    await prisma.users.update({
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
    const userWithPassword = await prisma.users.findUnique({
        where: { id: currentUser.id },
        select: { password: true }
    });

    if (!userWithPassword) {
        return { success: false, error: "User not found" };
    }

    // Verify the current password
    const isPasswordValid = await comparePasswords(password, userWithPassword.password);
    if (!isPasswordValid) {
        return { success: false, error: "Password is incorrect" };
    }

    try {
        // Get the current session ID to delete it after account deletion
        const sessionId = await getSessionId(cookieStore);

        // Delete the user account - this will cascade delete all related records
        // due to the onDelete: Cascade constraints in the database schema
        await prisma.users.delete({
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

    await prisma.users.update({
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
