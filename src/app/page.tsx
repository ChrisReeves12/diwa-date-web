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
        seekingMinAge: currentUser.seekingMinAge || businessConfig.defaults.minAge,
        seekingMaxAge: currentUser.seekingMaxAge || businessConfig.defaults.maxAge,
        seekingMinHeight: currentUser.seekingMinHeight || businessConfig.defaults.minHeight,
        seekingMaxHeight: currentUser.seekingMaxHeight || businessConfig.defaults.maxHeight,
        numberOfPhotos: currentUser.seekingNumOfPhotos || businessConfig.defaults.numOfPhotos,
        ethnicities: currentUser.ethnicPreferences,
        religions: currentUser.religiousPreferences,
        languages: currentUser.languagePreferences,
        interests: currentUser.interestPreferences,
        maritalStatus: currentUser.maritalStatusPreferences,
        bodyType: currentUser.bodyTypePreferences,
        hasChildren: currentUser.hasChildrenPreferences,
        wantsChildren: currentUser.wantsChildrenPreferences,
        education: currentUser.educationPreferences,
        smoking: currentUser.smokingPreferences,
        drinking: currentUser.drinkingPreferences,
        seekingCountries: currentUser.seekingCountries,
        seekingDistanceOrigin: currentUser.seekingDistanceOrigin as SearchFromOrigin,
        seekingMaxDistance: currentUser.seekingMaxDistance,
        seekingGender: currentUser.seekingGender || "",
        sortBy: searchParams?.sortBy || SearchSortBy.LastActive,
        searchFromLocation: undefined
    });
}
