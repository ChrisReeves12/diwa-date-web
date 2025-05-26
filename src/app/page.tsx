import GuestHome from "@/app/guest-home/guest-home";
import { getCurrentUser, refreshLastActive } from "@/server-side-helpers/user.helpers";
import HomeSearch from "@/app/home-search/home-search";
import { searchUsers } from "@/server-side-helpers/search.helpers";
import { businessConfig } from "@/config/business";
import { SearchFromOrigin, User } from "@/types";
import { SearchParameters, SearchSortBy } from "@/types/search-parameters.interface";
import { createNotificationCenterDataPromise } from "@/server-side-helpers/notification.helper";
import { cookies } from "next/headers";
import { Metadata } from "next";
import { cache } from "react";

// Cache the user data to avoid duplicate fetching
const getUser = cache(async () => {
    return getCurrentUser(await cookies());
});

export async function generateMetadata(): Promise<Metadata> {
    const currentUser = await getUser();

    return {
        title: currentUser ? `${process.env.APP_NAME} | Search` : process.env.APP_NAME
    };
}

export default async function Home({ searchParams }: { searchParams: Promise<any> }) {
    const currentUser = await getUser();

    if (currentUser) {
        refreshLastActive(currentUser).then();
    }

    return (
        currentUser ?
            <HomeSearch
                searchPromise={createSearchPromise(currentUser, await searchParams)}
                notificationsPromise={createNotificationCenterDataPromise(currentUser)}
                currentUser={currentUser}
            /> : <GuestHome />
    );
}

async function createSearchPromise(currentUser: User, searchParams: SearchParameters) {
    return searchUsers(currentUser, {
        page: Number(searchParams?.page || 1),
        seeking_min_age: currentUser.seekingMinAge || businessConfig.defaults.minAge,
        seeking_max_age: currentUser.seekingMaxAge || businessConfig.defaults.maxAge,
        seeking_min_height: currentUser.seekingMinHeight || businessConfig.defaults.minHeight,
        seeking_max_height: currentUser.seekingMaxHeight || businessConfig.defaults.maxHeight,
        number_of_photos: currentUser.seekingNumOfPhotos || businessConfig.defaults.numOfPhotos,
        ethnicities: currentUser.ethnicPreferences,
        religions: currentUser.religiousPreferences,
        languages: currentUser.languagePreferences,
        interests: currentUser.interestPreferences,
        marital_status: currentUser.maritalStatusPreferences,
        body_type: currentUser.bodyTypePreferences,
        has_children: currentUser.hasChildrenPreferences,
        wants_children: currentUser.wantsChildrenPreferences,
        education: currentUser.educationPreferences,
        smoking: currentUser.smokingPreferences,
        drinking: currentUser.drinkingPreferences,
        seeking_countries: currentUser.seekingCountries,
        seeking_distance_origin: currentUser.seekingDistanceOrigin as SearchFromOrigin,
        seeking_max_distance: currentUser.seekingMaxDistance,
        seekingGender: currentUser.seekingGender || "",
        sortBy: searchParams?.sortBy || SearchSortBy.LastActive,
        search_from_location: undefined
    });
}
