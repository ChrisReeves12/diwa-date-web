import GuestHome from "@/app/guest-home/guest-home";
import { getCurrentUser } from "@/server-side-helpers/user.helpers";
import HomeSearch from "@/app/home-search/home-search";
import { searchUsers } from "@/server-side-helpers/search.helpers";
import { businessConfig } from "@/config/business";
import { SearchFromOrigin, User } from "@/types";
import { SearchSortBy } from "@/types/search-parameters.interface";
import { createNotificationCenterDataPromise } from "@/server-side-helpers/notification.helper";
import { cookies } from "next/headers";

export default async function Home({ searchParams }: { searchParams: Promise<any> }) {
    const currentUser = await getCurrentUser(await cookies());

    return (
        currentUser ?
            <HomeSearch
                searchPromise={createSearchPromise(currentUser, await searchParams)}
                notificationsPromise={createNotificationCenterDataPromise(currentUser)}
                currentUser={currentUser}
            /> : <GuestHome />
    );
}

async function createSearchPromise(currentUser: User, searchParams: any) {
    return searchUsers(currentUser, {
        page: Number(searchParams?.page || 1),
        seeking_min_age: currentUser.seeking_min_age || businessConfig.defaults.minAge,
        seeking_max_age: currentUser.seeking_max_age || businessConfig.defaults.maxAge,
        seeking_min_height: currentUser.seeking_min_height || businessConfig.defaults.minHeight,
        seeking_max_height: currentUser.seeking_max_height || businessConfig.defaults.maxHeight,
        number_of_photos: currentUser.seeking_num_of_photos || businessConfig.defaults.numOfPhotos,
        ethnicities: currentUser.ethnic_preferences,
        religions: currentUser.religious_preferences,
        languages: currentUser.language_preferences,
        interests: currentUser.interest_preferences,
        marital_status: currentUser.marital_status_preferences,
        body_type: currentUser.body_type_preferences,
        has_children: currentUser.has_children_preferences,
        wants_children: currentUser.wants_children_preferences,
        education: currentUser.education_preferences,
        smoking: currentUser.smoking_preferences,
        drinking: currentUser.drinking_preferences,
        seeking_countries: currentUser.seeking_countries,
        seeking_distance_origin: currentUser.seeking_distance_origin as SearchFromOrigin,
        seeking_max_distance: currentUser.seeking_max_distance,
        seeking_genders: currentUser.seeking_genders,
        sort_by: searchParams?.sortBy || SearchSortBy.LastActive,
        search_from_location: undefined
    });
}
