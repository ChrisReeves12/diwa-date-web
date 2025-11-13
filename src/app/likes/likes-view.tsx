'use client';
import { Suspense, use, useState, useEffect, useRef } from "react";
import CenterScreenLoader from "@/common/center-screen-loader/center-screen-loader";
import DashboardWrapper from "@/common/dashboard-wrapper/dashboard-wrapper";
import { NotificationCenterData } from "@/types/notification-center-data.interface";
import { showAlert } from '@/util';
import { UserPreview } from "@/types/user-preview.interface";
import UserProfilePreview from "@/common/user-profile-preview/user-profile-preview";
import { InfoCircleIcon } from "react-line-awesome";
import { useSearchParams } from "next/navigation";
import './likes.scss';
import { LikesSortBy } from "@/types/likes-sort-by.enum";
import { getLikes } from "./likes.actions";

interface LikesViewProps {
    likesPromise: Promise<{ hasMore: boolean; likes: UserPreview[] }>
}

function LikesListing({ likesPromise }: LikesViewProps) {
    const [updatedLikes, setUpdatedLikes] = useState<UserPreview[] | undefined>();
    const [updatedHasMore, setUpdatedHasMore] = useState<boolean | undefined>();
    const [isLoading, setIsLoading] = useState(false);
    const isFirstMount = useRef(true);

    const searchParams = useSearchParams();
    const likesData = use(likesPromise);

    const likes = updatedLikes || likesData.likes;
    const hasMore = typeof updatedHasMore !== 'undefined' ? updatedHasMore : likesData.hasMore;

    // Get filter values from URL or use defaults
    const sortBy = (searchParams.get('sortBy') as LikesSortBy) || LikesSortBy.ReceivedAt;
    const page = Number(searchParams.get('page')) || 1;

    // React to searchParams changes and reload likes
    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }

        reloadLikes();
    }, [searchParams]);

    // Handle sort change
    const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('sortBy', e.target.value);
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({}, '', newUrl);
    };

    // Handle pagination change
    const handlePageChange = (direction: 'prev' | 'next') => {
        const params = new URLSearchParams(searchParams.toString());
        const newPage = direction === 'next' ? page + 1 : page - 1;
        params.set('page', newPage.toString());
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({}, '', newUrl);
    };

    const reloadLikes = async () => {
        try {
            setIsLoading(true);
            const updatedLikeData = await getLikes({ sortBy: sortBy || LikesSortBy.ReceivedAt, page: page || 1 });
            setUpdatedLikes(updatedLikeData.likes);
            setUpdatedHasMore(updatedLikeData.hasMore);
        } catch (e) {
            showAlert('An error occurred while reloading your matches.');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="likes-view-container">
            {isLoading && <CenterScreenLoader />}
            {likes.length > 0 && <div className="likes-filters-section">
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
            </div>}
            <div className="user-likes-listing-container">
                {likes.length === 0 &&
                    <div className="no-likes-notice"><InfoCircleIcon /> You currently have no received likes.</div>}

                {likes.map((user: UserPreview) =>
                    <UserProfilePreview isInactive={isLoading} onCallToRefresh={() => reloadLikes()} key={user.id} userPreview={user} type={'like'} />)}
            </div>
        </div>
    );
}

export default function LikesView({ currentUser, likesPromise }: any) {
    return (
        <DashboardWrapper
            activeTab="likes"
            currentUser={currentUser}>
            <Suspense fallback={<CenterScreenLoader />}>
                <LikesListing likesPromise={likesPromise} />
            </Suspense>
        </DashboardWrapper>
    );
}
