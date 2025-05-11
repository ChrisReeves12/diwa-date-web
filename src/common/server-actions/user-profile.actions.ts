'use server';

import {
    getCurrentUser,
    sendUserMatchRequest,
    removeUserMatchRequest,
    blockUser,
    unBlockUser, muteUserById, unMuteUserById
} from "@/server-side-helpers/user.helpers";
import { redirect } from "next/navigation";
import { logError } from "@/server-side-helpers/logging.helpers";
import { cookies } from "next/headers";

/**
 * Remove a match between the current user and another user
 * @param recipientId The ID of the user to remove the match with
 */
export async function removeUserMatch(recipientId: number) {
    try {
        const currentUser = await getCurrentUser(await cookies());
        if (!currentUser) {
            redirect('/');
        }

        await removeUserMatchRequest(Number(currentUser.id), recipientId);
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), 'Error removing user match');
    }
}

/**
 * Mute the user by Id.
 * @param recipientId
 */
export async function muteUser(recipientId: number) {
    try {
        const currentUser = await getCurrentUser(await cookies());
        if (!currentUser) {
            redirect('/');
        }

        await muteUserById(Number(currentUser.id), recipientId);
        return true;
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), 'Error muting user');
        return false;
    }
}

/**
 * Unmute the user by Id.
 * @param recipientId
 */
export async function unMuteUser(recipientId: number) {
    try {
        const currentUser = await getCurrentUser(await cookies());
        if (!currentUser) {
            redirect('/');
        }

        await unMuteUserById(Number(currentUser.id), recipientId);
        return true;
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), 'Error unmuting user');
        return false;
    }
}

/**
 * Send a match request from the current user to another user
 * @param recipientId The ID of the user to send the match request to
 * @returns The status of the match after the operation ('pending' or 'matched')
 */
export async function sendUserMatch(recipientId: number): Promise<'pending' | 'matched' | undefined> {
    try {
        const currentUser = await getCurrentUser(await cookies());
        if (!currentUser) {
            redirect('/');
        }

        return await sendUserMatchRequest(Number(currentUser.id), recipientId);
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), 'Error sending user match');
        return undefined;
    }
}

/**
 * Block a user
 * @param blockedUserId The ID of the user to block
 * @returns True if the operation was successful
 */
export async function blockUserAction(blockedUserId: number): Promise<boolean> {
    try {
        const currentUser = await getCurrentUser(await cookies());
        if (!currentUser) {
            redirect('/');
        }

        return await blockUser(Number(currentUser.id), blockedUserId);
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), 'Error blocking user');
        return false;
    }
}

/**
 * Unblock a user
 * @param blockedUserId The ID of the user to unblock
 * @returns True if the operation was successful
 */
export async function unBlockUserAction(blockedUserId: number): Promise<boolean> {
    try {
        const currentUser = await getCurrentUser(await cookies());
        if (!currentUser) {
            redirect('/');
        }

        return await unBlockUser(Number(currentUser.id), blockedUserId);
    } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), 'Error unblocking user');
        return false;
    }
}


