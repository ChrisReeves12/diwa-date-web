import {
    getCurrentUser,
    getFullUserProfile,
} from "@/server-side-helpers/user.helpers";
import { redirect, notFound } from "next/navigation";
import UserProfile from "./user-profile";
import { createNotificationCenterDataPromise } from "@/server-side-helpers/notification.helper";
import { cookies } from "next/headers";
import SiteTopBar from "@/common/site-top-bar/site-top-bar";
import { CurrentUserProvider } from "@/common/context/current-user-context";
import './user-profile.scss';
import { InfoCircleIcon } from "react-line-awesome";
import UserProfileError from "@/app/user/[userId]/user-profile-error";

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
    const notificationsPromise = createNotificationCenterDataPromise(currentUser);
    const userProfileResult = await getFullUserProfile(Number(userId), Number(currentUser.id));

    if (userProfileResult.statusCode !== 200) {
        return (
            <UserProfileError currentUser={currentUser} notificationsPromise={notificationsPromise}>
                <h2><InfoCircleIcon/> {userProfileResult.error}</h2>
            </UserProfileError>
        );
    }

    return (
        <UserProfile
            currentUser={currentUser}
            notificationsPromise={notificationsPromise}
            userProfileDetail={userProfileResult.userProfileDetails!} />
    );
}
