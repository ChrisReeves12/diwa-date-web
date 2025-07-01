import GuestHome from "@/app/guest-home/guest-home";
import { getCurrentUser, refreshLastActive } from "@/server-side-helpers/user.helpers";
import HomeSearch from "@/app/home-search/home-search";
import { createSearchPromise } from "@/server-side-helpers/search.helpers";
import { SearchSortBy } from "@/types/search-parameters.interface";
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
        title: currentUser ? `${process.env.APP_NAME} | Search` : `${process.env.APP_NAME} | ${process.env.APP_TAGLINE}`
    };
}

export default async function Home({ searchParams }: { searchParams: Promise<{ page?: number, sortBy?: SearchSortBy }> }) {
    const currentUser = await getUser();

    if (currentUser) {
        refreshLastActive(currentUser).then();
    }

    const lSearchParams = await searchParams;

    return (
        currentUser ?
            <HomeSearch
                searchPromise={createSearchPromise(currentUser, lSearchParams)}
                currentUser={currentUser} /> : <GuestHome />
    );
}
