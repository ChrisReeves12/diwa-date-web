import GuestHome from "@/app/guest-home/guest-home";
import { getCurrentUser } from "@/server-side-helpers/user.helpers";
import SearchHome from "@/app/search-home/search-home";
import { Metadata } from "next";

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
        currentUser ? <SearchHome currentUser={currentUser} /> : <GuestHome />
    );
}
