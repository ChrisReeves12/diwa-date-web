'use client';
import { Suspense, use, useState, useEffect } from "react";
import CenterScreenLoader from "@/common/center-screen-loader/center-screen-loader";
import DashboardWrapper from "@/common/dashboard-wrapper/dashboard-wrapper";
import { User } from "@/types";
import { NotificationCenterData } from "@/types/notification-center-data.interface";
import { UserPreview } from "@/types/user-preview.interface";
import UserProfilePreview from "@/common/user-profile-preview/user-profile-preview";
import { InfoCircleIcon } from "react-line-awesome";
import AgeRangeSelect from "@/common/age-range-select/age-range-select";
import { useRouter, useSearchParams } from "next/navigation";
import { businessConfig } from "@/config/business";
import { Pagination } from "@mui/material";
import { getLikes } from "./likes.actions";
import './likes.scss';
import { LikesSortBy } from "@/types/likes-sort-by.enum";

interface LikesViewProps {
    currentUser: User,
    notificationsPromise: Promise<NotificationCenterData>,
    likesPromise: Promise<{ likes: UserPreview[], totalCount: number, pageCount: number }>
}

function LikesListing({ currentUser, likesPromise }: Omit<LikesViewProps, "notificationsPromise">) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialLikesData = use(likesPromise);

    const [likesData, setLikesData] = useState(initialLikesData);
    const [isLoading, setIsLoading] = useState(false);

    // Get filter values from URL or use defaults
    const sortBy = (searchParams.get('sortBy') as LikesSortBy) || LikesSortBy.LastActive;
    // const sortBy = 'lastActive' as LikesSortBy.LastActive;
    const page = Number(searchParams.get('page')) || 1;
    const minAge = Number(searchParams.get('minAge')) || currentUser.seeking_min_age || businessConfig.defaults.minAge;
    const maxAge = Number(searchParams.get('maxAge')) || currentUser.seeking_max_age || businessConfig.defaults.maxAge;

    // Fetch likes when filter parameters change
    useEffect(() => {
        async function fetchFilteredLikes() {
            setIsLoading(true);
            try {
                const updatedLikes = await getLikes({
                    minAge,
                    maxAge,
                    sortBy,
                    page,
                    pageSize: 10
                });
                setLikesData(updatedLikes);
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
    }, [sortBy, page, minAge, maxAge, searchParams]);

    // Handle age filter change
    const handleAgeFilterChange = (newValues: { minAge: number, maxAge: number }) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('minAge', newValues.minAge.toString());
        params.set('maxAge', newValues.maxAge.toString());
        params.set('page', '1'); // Reset to page 1 when filters change
        router.push(`?${params.toString()}`);
    };

    // Handle sort change
    const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('sortBy', e.target.value);
        router.push(`?${params.toString()}`);
    };

    // Handle pagination change
    const handlePageChange = (_: React.ChangeEvent<unknown>, newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', newPage.toString());
        router.push(`?${params.toString()}`);
    };

    return (
        <>
            <div className="likes-filters-section">
                <div className="filter-section">
                    <div className="age-order-by-container">
                        <div className="filter">
                            <label>Age</label>
                            <div className="input-container">
                                <AgeRangeSelect
                                    minAge={minAge}
                                    maxAge={maxAge}
                                    onChange={handleAgeFilterChange}
                                />
                            </div>
                        </div>
                        <div className="filter">
                            <label>Order By</label>
                            <div className="input-container">
                                <select
                                    value={sortBy}
                                    onChange={handleSortChange}
                                    className="order-by">
                                    <option value={LikesSortBy.LastActive}>Last Active</option>
                                    <option value={LikesSortBy.Newest}>Newest</option>
                                    <option value={LikesSortBy.Age}>Age</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                {likesData.totalCount > 0 && (
                    <div className="paginator-section">
                        <Pagination
                            color={'primary'}
                            count={likesData.pageCount}
                            onChange={handlePageChange}
                            page={page}
                        />
                    </div>
                )}
            </div>

            {isLoading ? (
                <div className="likes-loading-container">
                    <CenterScreenLoader />
                </div>
            ) : (
                <div className="user-likes-listing-container">
                    {likesData.likes.length === 0 &&
                        <div className="no-likes-notice"><InfoCircleIcon/> You have no likes at this time.</div>}

                    {likesData.likes.map((user: UserPreview) =>
                        <UserProfilePreview key={user.id} userPreview={user} type={'like'}/>)}
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
