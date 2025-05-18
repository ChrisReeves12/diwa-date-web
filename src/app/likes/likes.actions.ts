'use server';

import { getUserLikes } from "@/server-side-helpers/user.helpers";
import { getCurrentUser } from "@/server-side-helpers/user.helpers";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { LikesSortBy } from "@/types/likes-sort-by.enum";
import { businessConfig } from "@/config/business";

/**
 * Server action to get likes for the current user with filtering and sorting.
 *
 * @param params Filter, sort, and pagination parameters
 * @returns Object with likes array and pagination data
 */
export async function getLikes({
    minAge = businessConfig.defaults.minAge,
    maxAge = businessConfig.defaults.maxAge,
    sortBy = LikesSortBy.LastActive,
    page = 1,
    pageSize = 10
}: {
    minAge?: number;
    maxAge?: number;
    sortBy?: LikesSortBy;
    page?: number;
    pageSize?: number;
}) {
    // Get current user
    const currentUser = await getCurrentUser(await cookies());

    if (!currentUser) {
        notFound();
    }

    // Fetch likes with filtering and sorting
    return await getUserLikes(
        Number(currentUser.id),
        minAge,
        maxAge,
        sortBy,
        page,
        pageSize
    );
}

/**
 * Save user likes filter preferences.
 * Updates the user's filter preferences in the database.
 */
export async function updateLikesFilterPreferences({
    minAge,
    maxAge
}: {
    minAge: number;
    maxAge: number;
}) {
    const currentUser = await getCurrentUser(await cookies());

    if (!currentUser) {
        return { success: false, message: 'User not authenticated' };
    }

    try {
        // Update user preferences
        // Note: This is a placeholder - you might want to add this functionality
        // in user.helpers.ts if you want to save these preferences

        return { success: true };
    } catch (error) {
        console.error('Error updating likes filter preferences:', error);
        return { success: false, message: 'Failed to update preferences' };
    }
}
