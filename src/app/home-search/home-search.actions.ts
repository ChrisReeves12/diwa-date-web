'use server';

import { getCurrentUser } from "@/server-side-helpers/user.helpers";
import { redirect } from "next/navigation";
import { prismaRead, prismaWrite } from "@/lib/prisma";
import { SearchParameters, SearchSortBy } from "@/types/search-parameters.interface";
import { logError } from "@/server-side-helpers/logging.helpers";
import { cookies } from "next/headers";
import { createSearchPromise } from "@/server-side-helpers/search.helpers";

/**
 * Perform search, for updating on page search results.
 * @param page
 * @param sortBy
 */
export async function getUpdatedSearchResults(page: number, sortBy: SearchSortBy) {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
        redirect('/login');
    }

    return createSearchPromise(currentUser, { page, sortBy });
}

/**
 * Updates user's search preferences
 * @param searchPrefs
 * @param sortBy
 */
export async function updateUserSearchPreferences(searchPrefs: Partial<SearchParameters>, sortBy: SearchSortBy) {
    try {
        const currentUser = await getCurrentUser(await cookies());
        if (!currentUser) {
            redirect('/login');
        }

        await prismaWrite.users.update({
            where: { id: currentUser.id },
            data: {
                seekingMinAge: searchPrefs.seekingMinAge || currentUser.seekingMinAge,
                seekingMaxAge: searchPrefs.seekingMaxAge || currentUser.seekingMaxAge,
                seekingMinHeight: searchPrefs.seekingMinHeight || currentUser.seekingMinHeight,
                seekingMaxHeight: searchPrefs.seekingMaxHeight || currentUser.seekingMaxHeight,
                seekingNumOfPhotos: searchPrefs.numberOfPhotos || currentUser.seekingNumOfPhotos,
                ethnicPreferences: searchPrefs.ethnicities,
                religiousPreferences: searchPrefs.religions,
                languagePreferences: searchPrefs.languages,
                interestPreferences: searchPrefs.interests,
                maritalStatusPreferences: searchPrefs.maritalStatus,
                bodyTypePreferences: searchPrefs.bodyType,
                hasChildrenPreferences: searchPrefs.hasChildren,
                wantsChildrenPreferences: searchPrefs.wantsChildren,
                educationPreferences: searchPrefs.education,
                smokingPreferences: searchPrefs.smoking,
                drinkingPreferences: searchPrefs.drinking,
                seekingCountries: searchPrefs.seekingCountries,
                seekingDistanceOrigin: searchPrefs.seekingDistanceOrigin || currentUser.seekingDistanceOrigin,
                seekingMaxDistance: searchPrefs.seekingMaxDistance || currentUser.seekingMaxDistance,
                seekingGender: currentUser.seekingGender,
                singleSearchLocation: searchPrefs.searchFromLocation ? JSON.parse(JSON.stringify(searchPrefs.searchFromLocation)) : undefined
            }
        });


        const refreshedUser = await getCurrentUser(await cookies());

        return createSearchPromise(refreshedUser!, { page: 1, sortBy });
    } catch (err: any) {
        logError(err);
        throw err;
    }
}
