'use server';

import { getCurrentUser } from "@/server-side-helpers/user.helpers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { SearchParameters } from "@/types/search-parameters.interface";
import { logError } from "@/server-side-helpers/logging.helpers";
import { cookies } from "next/headers";

/**
 * Updates user's search preferences
 * @param searchPrefs
 */
export async function updateUserSearchPreferences(searchPrefs: Partial<SearchParameters>) {
    try {
        const currentUser = await getCurrentUser(await cookies());
        if (!currentUser) {
            redirect('/');
        }

        await prisma.users.update({
            where: { id: currentUser.id },
            data: {
                seekingMinAge: searchPrefs.seeking_min_age || currentUser.seekingMinAge,
                seekingMaxAge: searchPrefs.seeking_max_age || currentUser.seekingMaxAge,
                seekingMinHeight: searchPrefs.seeking_min_height || currentUser.seekingMinHeight,
                seekingMaxHeight: searchPrefs.seeking_max_height || currentUser.seekingMaxHeight,
                seekingNumOfPhotos: searchPrefs.number_of_photos || currentUser.seekingNumOfPhotos,
                ethnicPreferences: searchPrefs.ethnicities,
                religiousPreferences: searchPrefs.religions,
                languagePreferences: searchPrefs.languages,
                interestPreferences: searchPrefs.interests,
                maritalStatusPreferences: searchPrefs.marital_status,
                bodyTypePreferences: searchPrefs.body_type,
                hasChildrenPreferences: searchPrefs.has_children,
                wantsChildrenPreferences: searchPrefs.wants_children,
                educationPreferences: searchPrefs.education,
                smokingPreferences: searchPrefs.smoking,
                drinkingPreferences: searchPrefs.drinking,
                seekingCountries: searchPrefs.seeking_countries,
                seekingDistanceOrigin: searchPrefs.seeking_distance_origin || currentUser.seekingDistanceOrigin,
                seekingMaxDistance: searchPrefs.seeking_max_distance || currentUser.seekingMaxDistance,
                seekingGender: currentUser.seekingGender,
                singleSearchLocation: searchPrefs.search_from_location ? JSON.parse(JSON.stringify(searchPrefs.search_from_location)) : undefined
            }
        });
    } catch (err: any) {
        logError(err);
        throw err;
    }
}
