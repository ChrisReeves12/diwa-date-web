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
import { getLikes } from "./likes.actions";
import './likes.scss';
import { LikesSortBy } from "@/types/likes-sort-by.enum";

interface LikesViewProps {
    currentUser: User,
    notificationsPromise: Promise<NotificationCenterData>,
    likesPromise: Promise<{ hasMore: boolean; likes: UserPreview[] }>
}

function LikesListing({ currentUser, likesPromise }: Omit<LikesViewProps, "notificationsPromise">) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialLikesData = use(likesPromise);

    const [likes, setLikes] = useState(initialLikesData.likes);
    const [hasMore, setHasMore] = useState(initialLikesData.hasMore);
    const [isLoading, setIsLoading] = useState(false);

    // Get filter values from URL or use defaults
    const sortBy = (searchParams.get('sortBy') as LikesSortBy) || LikesSortBy.LastActive;
    const page = Number(searchParams.get('page')) || 1;

    // Fetch likes when filter parameters change
    useEffect(() => {
        async function fetchFilteredLikes() {
            setIsLoading(true);
            try {
                const updatedLikes = await getLikes({
                    sortBy,
                    page
                });

                setLikes(updatedLikes.likes);
                setHasMore(updatedLikes.hasMore);
            } catch (error) {
                console.error("Error fetching likes:", error);
            } finally {
                setIsLoading(false);
            }
        }

        // Only fetch if URL parameters changed after initial load
        if (initialLikesData && searchParams.toString()) {
            fetchFilteredLikes();
        }
    }, [sortBy, page, searchParams]);

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
                                    <option value={LikesSortBy.ReceivedAt}>Received By</option>
                                    <option value={LikesSortBy.LastActive}>LastActive</option>
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

            {isLoading ? (
                <div className="likes-loading-container">
                    <CenterScreenLoader />
                </div>
            ) : (
                <div className="user-likes-listing-container">
                    {likes.length === 0 &&
                        <div className="no-likes-notice"><InfoCircleIcon /> You have no likes at this time.</div>}

                    {likes.map((user: UserPreview) =>
                        <UserProfilePreview key={user.id} userPreview={user} type={'like'} />)}
                </div>
            )}
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
                <LikesListing currentUser={currentUser} likesPromise={likesPromise} />
            </Suspense>
        </DashboardWrapper>
    );
}
