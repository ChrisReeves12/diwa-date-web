import LikesView from "@/app/likes/likes-view";
import { redirect } from "next/navigation";
import { getCurrentUser, getUserLikes } from "@/server-side-helpers/user.helpers";
import { cookies } from "next/headers";
import { createNotificationCenterDataPromise } from "@/server-side-helpers/notification.helper";
import './likes.scss';
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: `${process.env.APP_NAME} | Likes`
    };
}

export default async function LikesPage() {
    const currentUser = await getCurrentUser(await cookies());

    if (!currentUser) {
        redirect('/');
    }

    const notificationsPromise = createNotificationCenterDataPromise(currentUser);
    const getLikesPromise = getUserLikes(Number(currentUser.id));

    return (
        <LikesView
            likesPromise={getLikesPromise}
            currentUser={currentUser}
            notificationsPromise={notificationsPromise}/>
    );
}
