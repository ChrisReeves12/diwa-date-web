import { getCurrentUser, getUser, getUserProfileDetail, prepareUser } from "@/server-side-helpers/user.helpers";
import { redirect, notFound } from "next/navigation";
import UserProfile from "./user-profile";
import { createNotificationCenterDataPromise } from "@/server-side-helpers/notification.helper";
import { cookies } from "next/headers";

interface UserProfileParams {
    params: {
        userId: string
    }
}

export default async function UserProfilePage({ params }: UserProfileParams) {
    const currentUser = await getCurrentUser(await cookies());
    const { userId } = await params;

    if (!currentUser) {
        redirect('/');
    }

    const user = await getUser(Number(userId));
    if (!user) {
        notFound();
    }

    // Todo: check if current user has been blocked

    const userProfileDetails = await getUserProfileDetail(currentUser.id, user);

    return (
        <UserProfile
            currentUser={currentUser}
            notificationsPromise={createNotificationCenterDataPromise(currentUser)}
            userProfileDetail={userProfileDetails} />
    );
}
