'use client';
import { Suspense, use } from "react";
import CenterScreenLoader from "@/common/center-screen-loader/center-screen-loader";
import DashboardWrapper from "@/common/dashboard-wrapper/dashboard-wrapper";
import { User } from "@/types";
import { NotificationCenterData } from "@/types/notification-center-data.interface";
import { UserPreview } from "@/types/user-preview.interface";
import UserProfilePreview from "@/common/user-profile-preview/user-profile-preview";
import { InfoCircleIcon } from "react-line-awesome";

interface LikesViewProps {
    currentUser: User,
    notificationsPromise: Promise<NotificationCenterData>,
    likesPromise: Promise<UserPreview[]>
}

function LikesListing({ currentUser, likesPromise }: Omit<LikesViewProps, "notificationsPromise">) {
    const usersWhoLikedMe = use(likesPromise);

    return (
        <div className="user-likes-listing-container">
            {usersWhoLikedMe.length === 0 &&
                <div className="no-likes-notice"><InfoCircleIcon/> You have no likes at this time.</div>}

            {usersWhoLikedMe.map((user: UserPreview) =>
                <UserProfilePreview key={user.id} userPreview={user} type={'like'}/>)}
        </div>
    );
}

export default function LikesView({ currentUser, notificationsPromise, likesPromise }: LikesViewProps) {
    return (
        <DashboardWrapper
            activeTab="likes"
            currentUser={currentUser}
            notificationsPromise={notificationsPromise}>
            <Suspense fallback={<CenterScreenLoader />}>
                <LikesListing currentUser={currentUser} likesPromise={likesPromise} />
            </Suspense>
        </DashboardWrapper>
    );
}
