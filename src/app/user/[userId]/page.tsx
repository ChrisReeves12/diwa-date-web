import {
    getCurrentUser,
    getFullUserProfile, refreshLastActive,
} from "@/server-side-helpers/user.helpers";
import { redirect } from "next/navigation";
import UserProfile from "./user-profile";
import { createNotificationCenterDataPromise } from "@/server-side-helpers/notification.helper";
import { cookies } from "next/headers";
import './user-profile.scss';
// import { InfoCircleIcon } from "react-line-awesome"; // Commented out as UserProfileError is not used
// import UserProfileError from "@/app/user/[userId]/user-profile-error"; // Commented out as UserProfileError is not used
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
        // Return a more specific type for error cases
        return { statusCode: 401, error: "Not authenticated", userProfileDetails: undefined };
    }

    // Ensure getFullUserProfile also returns a consistent shape, especially for errors
    const profileResult = await getFullUserProfile(Number(userId), Number(currentUser.id));
    if (profileResult.error) {
        return { ...profileResult, userProfileDetails: undefined };
    }
    return profileResult;
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

    // Check for error before accessing userProfileDetails
    if (userProfileResult.error || !userProfileResult.userProfileDetails) {
        return {
            title: `${process.env.APP_NAME} | Profile`
        };
    }

    return {
        title: `${process.env.APP_NAME} | ${userProfileResult.userProfileDetails.user.displayName ?? 'Profile'}`
    };
}

export default async function UserProfilePage({ params }: any) {
    const currentUser = await getUser();
    const { userId } = await params;

    if (!currentUser) {
        redirect('/');
    }


    const userProfileResult = await getUserProfile(userId);

    if (userProfileResult.error || !userProfileResult.userProfileDetails) {
        // Ensure a fallback UI for errors or missing details
        return <div>Error: {userProfileResult.error || "Profile not found"}</div>;
    }

    return (
        <UserProfile
            currentUser={currentUser}

            userProfileDetail={userProfileResult.userProfileDetails}
        />
    );
}
