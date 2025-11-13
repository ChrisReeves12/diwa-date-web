import LikesView from "@/app/likes/likes-view";
import { redirect } from "next/navigation";
import { getCurrentUser, getUserLikes } from "@/server-side-helpers/user.helpers";
import { cookies } from "next/headers";
import './likes.scss';
import { Metadata } from "next";
import { LikesSortBy } from "@/types/likes-sort-by.enum";

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: `${process.env.APP_NAME} | Likes`
    };
}

export default async function LikesPage({ searchParams }: { searchParams: any }) {
    const currentUser = await getCurrentUser(await cookies());

    if (!currentUser) {
        redirect('/login?redirect=/likes');
    }


    const lSearchParams = await searchParams;

    const sortBy = (lSearchParams.sortBy as LikesSortBy) || LikesSortBy.ReceivedAt;
    const page = Number(lSearchParams.page) || 1;

    const getLikesPromise = getUserLikes(
        Number(currentUser.id),
        sortBy,
        page
    );

    return (
        <LikesView
            likesPromise={getLikesPromise}
            currentUser={currentUser} />
    );
}
