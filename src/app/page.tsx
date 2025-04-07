import GuestHome from "@/app/guest-home/guest-home";
import { getCurrentUser } from "@/server-side-helpers/user.helpers";
import HomeSearch from "@/app/home-search/home-search";
import { Metadata } from "next";
import { Suspense } from "react";

export async function generateMetadata(): Promise<Metadata | undefined> {
    const currentUser = await getCurrentUser();
    if (currentUser) {
        return {
            title: `${process.env.APP_NAME} | Search`,
        };
    }
}

export default async function Home() {
    const currentUser = await getCurrentUser();

    return (
        currentUser ? <HomeSearch currentUser={currentUser}/> : <GuestHome/>
    );
}
