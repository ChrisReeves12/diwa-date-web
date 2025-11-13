'use server';

import { getUserLikes, isUserPremium } from "@/server-side-helpers/user.helpers";
import { getCurrentUser } from "@/server-side-helpers/user.helpers";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { LikesSortBy } from "@/types/likes-sort-by.enum";
import { UserPreview } from "@/types/user-preview.interface";

/**
 * Server action to get likes for the current user with filtering and sorting.
 *
 * @param params Filter, sort, and pagination parameters
 * @returns Object with hasMore boolean and likes array
 */
export async function getLikes({
    sortBy = LikesSortBy.LastActive,
    page = 1
}: {
    sortBy?: LikesSortBy;
    page?: number
}): Promise<{ hasMore: boolean; likes: UserPreview[] }> {
    // Get current user
    const currentUser = await getCurrentUser(await cookies());

    if (!currentUser) {
        notFound();
    }

    // Fetch likes with filtering and sorting
    return await getUserLikes(
        Number(currentUser.id),
        sortBy,
        page
    );
}
