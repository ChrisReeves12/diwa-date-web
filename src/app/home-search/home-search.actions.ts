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
                seeking_min_age: searchPrefs.seeking_min_age || currentUser.seeking_min_age,
                seeking_max_age: searchPrefs.seeking_max_age || currentUser.seeking_max_age,
                seeking_min_height: searchPrefs.seeking_min_height || currentUser.seeking_min_height,
                seeking_max_height: searchPrefs.seeking_max_height || currentUser.seeking_max_height,
                seeking_num_of_photos: searchPrefs.number_of_photos || currentUser.seeking_num_of_photos,
                ethnic_preferences: searchPrefs.ethnicities,
                religious_preferences: searchPrefs.religions,
                language_preferences: searchPrefs.languages,
                interest_preferences: searchPrefs.interests,
                marital_status_preferences: searchPrefs.marital_status,
                body_type_preferences: searchPrefs.body_type,
                has_children_preferences: searchPrefs.has_children,
                wants_children_preferences: searchPrefs.wants_children,
                education_preferences: searchPrefs.education,
                smoking_preferences: searchPrefs.smoking,
                drinking_preferences: searchPrefs.drinking,
                seeking_countries: searchPrefs.seeking_countries,
                seeking_distance_origin: searchPrefs.seeking_distance_origin,
                seeking_max_distance: searchPrefs.seeking_max_distance || currentUser.seeking_max_distance,
                single_search_location: searchPrefs.search_from_location ? JSON.parse(JSON.stringify(searchPrefs.search_from_location)) : undefined,
                seeking_genders: currentUser.seeking_genders
            }
        });
    } catch (err: any) {
        logError(err);
        throw err;
    }
}
