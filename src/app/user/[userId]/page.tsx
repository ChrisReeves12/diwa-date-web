import {
    getCurrentUser,
    getFullUserProfile, refreshLastActive,
} from "@/server-side-helpers/user.helpers";
import { redirect } from "next/navigation";
import UserProfile from "./user-profile";
import { createNotificationCenterDataPromise } from "@/server-side-helpers/notification.helper";
import { cookies } from "next/headers";
import './user-profile.scss';
import { InfoCircleIcon } from "react-line-awesome";
import UserProfileError from "@/app/user/[userId]/user-profile-error";
import { Metadata } from "next";
import { cache } from "react";

// Cache the user data to avoid duplicate fetching
const getUser = cache(async () => {
    return getCurrentUser(await cookies());
});

// Cache the user profile data to avoid duplicate fetching
const getUserProfile = cache(async (userId: string) => {
    const currentUser = await getUser();
    if (!currentUser) {
        return { statusCode: 401, error: "Not authenticated" };
    }

    return await getFullUserProfile(Number(userId), Number(currentUser.id));
});

export async function generateMetadata({ params }: any): Promise<Metadata> {
    const currentUser = await getUser();

    if (!currentUser) {
        return {
            title: process.env.APP_NAME
        };
    } else {
        refreshLastActive(currentUser).then();
    }

    const { userId } = await params;
    const userProfileResult = await getUserProfile(userId);

    if (userProfileResult.statusCode !== 200) {
        return {
            title: `${process.env.APP_NAME} | Profile`
        };
    }

    return {
        // @ts-expect-error TypeScript is not cooperating
        title: `${process.env.APP_NAME} | ${userProfileResult.userProfileDetails?.user.display_name ?? 'Profile'}`
    };
}

export default async function UserProfilePage({ params }: any) {
    const currentUser = await getUser();
    const { userId } = await params;

    if (!currentUser) {
        redirect('/');
    }

    const notificationsPromise = createNotificationCenterDataPromise(currentUser);
    const userProfileResult = await getUserProfile(userId);

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
            // @ts-expect-error TypeScript is not cooperating
            userProfileDetail={userProfileResult.userProfileDetails!} />
    );
}
