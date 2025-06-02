'use client';
import { Suspense, use, useState, useEffect } from "react";
import CenterScreenLoader from "@/common/center-screen-loader/center-screen-loader";
import DashboardWrapper from "@/common/dashboard-wrapper/dashboard-wrapper";
import { User } from "@/types";
import { NotificationCenterData } from "@/types/notification-center-data.interface";
import { UserPreview } from "@/types/user-preview.interface";
import UserProfilePreview from "@/common/user-profile-preview/user-profile-preview";
import { InfoCircleIcon } from "react-line-awesome";
import { useRouter, useSearchParams } from "next/navigation";
import './likes.scss';
import { LikesSortBy } from "@/types/likes-sort-by.enum";

interface LikesViewProps {
    notificationsPromise: Promise<NotificationCenterData>,
    likesPromise: Promise<{ hasMore: boolean; likes: UserPreview[] }>
}

function LikesListing({ likesPromise }: Omit<LikesViewProps, "notificationsPromise">) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { likes, hasMore } = use(likesPromise);

    // Get filter values from URL or use defaults
    const sortBy = (searchParams.get('sortBy') as LikesSortBy) || LikesSortBy.ReceivedAt;
    const page = Number(searchParams.get('page')) || 1;

    // Handle sort change
    const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('sortBy', e.target.value);
        router.push(`?${params.toString()}`);
    };

    // Handle pagination change
    const handlePageChange = (direction: 'prev' | 'next') => {
        const params = new URLSearchParams(searchParams.toString());
        const newPage = direction === 'next' ? page + 1 : page - 1;
        params.set('page', newPage.toString());
        router.push(`?${params.toString()}`);
    };

    return (
        <>
            <div className="likes-filters-section">
                <div className="filter-section">
                    <div className="age-order-by-container">
                        <div className="filter">
                            <label>Order By</label>
                            <div className="input-container">
                                <select
                                    value={sortBy}
                                    onChange={handleSortChange}
                                    className="order-by">
                                    <option value={LikesSortBy.ReceivedAt}>Time Received</option>
                                    <option value={LikesSortBy.LastActive}>Last Active</option>
                                    <option value={LikesSortBy.Newest}>Newest Member</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="paginator-section">
                    {page > 1 && (
                        <button onClick={() => handlePageChange('prev')}>
                            Previous Page
                        </button>
                    )}
                    {hasMore && (
                        <button onClick={() => handlePageChange('next')}>
                            Next Page
                        </button>
                    )}
                </div>
            </div>
            <div className="user-likes-listing-container">
                {likes.length === 0 &&
                    <div className="no-likes-notice"><InfoCircleIcon /> You have no likes at this time.</div>}

                {likes.map((user: UserPreview) =>
                    <UserProfilePreview key={user.id} userPreview={user} type={'like'} />)}
            </div>
        </>
    );
}

export default function LikesView({ currentUser, notificationsPromise, likesPromise }: any) {
    return (
        <DashboardWrapper
            activeTab="likes"
            currentUser={currentUser}
            notificationsPromise={notificationsPromise}>
            <Suspense fallback={<CenterScreenLoader />}>
                <LikesListing likesPromise={likesPromise} />
            </Suspense>
        </DashboardWrapper>
    );
}
