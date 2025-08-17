import {
    getCurrentUser,
    getFullUserProfile, refreshLastActive,
} from "@/server-side-helpers/user.helpers";
import { redirect } from "next/navigation";
import UserProfile from "./user-profile";
import ProfileAccessError from "./profile-access-error";
import { cookies } from "next/headers";
import './user-profile.scss';
import { Metadata } from "next";
import { cache } from "react";

// Cache the user data to avoid duplicate fetching
const getLoggedInUser = cache(async () => {
    return getCurrentUser(await cookies());
});

// Cache the user profile data to avoid duplicate fetching
const getUserProfile = cache(async (userId: string) => {
    const currentUser = await getLoggedInUser();
    if (!currentUser) {
        return { statusCode: 401, error: "Not authenticated", userProfileDetails: undefined };
    }

    // Ensure getFullUserProfile also returns a consistent shape, especially for errors
    const profileResult = await getFullUserProfile(Number(userId), Number(currentUser.id));
    if ("error" in profileResult && profileResult.error) {
        return { ...profileResult, userProfileDetails: undefined };
    }

    return profileResult;
});

export async function generateMetadata({ params }: any): Promise<Metadata> {
    const currentUser = await getLoggedInUser();

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
    if (!("userProfileDetails" in userProfileResult) || ("error" in userProfileResult && userProfileResult.error) ||
        ("userProfileDetails" in userProfileResult && !userProfileResult.userProfileDetails)) {
        return {
            title: `${process.env.APP_NAME} | Profile`
        };
    }

    return {
        title: `${process.env.APP_NAME} | ${userProfileResult.userProfileDetails.user.displayName ?? 'Profile'}`
    };
}

export default async function UserProfilePage({ params }: any) {
    const currentUser = await getLoggedInUser();
    const { userId } = await params;

    if (!currentUser) {
        redirect(`/login?redirect=/user/${userId}`);
    }

    const userProfileResult = await getUserProfile(userId);

    if (!("userProfileDetails" in userProfileResult) || ("error" in userProfileResult && userProfileResult.error) || ("userProfileDetails" in userProfileResult && !userProfileResult.userProfileDetails)) {
        // Check if this is a gender restriction error (403 status with specific message pattern)
        if ("error" in userProfileResult && userProfileResult.statusCode === 403 &&
            userProfileResult.error?.includes("seeking") && userProfileResult.error?.includes("indicates")) {
            return <ProfileAccessError title={'Profile Access Restricted'} errorMessage={userProfileResult.error} />;
        }

        return <ProfileAccessError title={'Profile Not Available'} errorMessage={userProfileResult.error} />;
    }

    return (
        <UserProfile
            currentUser={currentUser}
            userProfileDetail={userProfileResult.userProfileDetails}
        />
    );
}
