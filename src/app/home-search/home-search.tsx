'use client';

import './home-search.scss';
import { User } from "../../types";
import DashboardWrapper from "@/common/dashboard-wrapper/dashboard-wrapper";
import AgeRangeSelect from "@/common/age-range-select/age-range-select";
import { Suspense, use, useEffect, useState } from "react";
import { SearchSortBy } from "@/types/search-parameters.interface";
import { useRouter, useSearchParams } from "next/navigation";
import { businessConfig } from "@/config/business";
import { SearchResponse } from "@/types/search-response.interface";
import UserProfilePreview from "@/common/user-profile-preview/user-profile-preview";
import CenterScreenLoader from "@/common/center-screen-loader/center-screen-loader";
import { updateUserSearchPreferences } from "@/app/home-search/home-search.actions";
import Modal from '@mui/material/Modal';
import { Box } from "@mui/system";
import SearchFiltersDialog from "@/app/home-search/search-filters-dialog/search-filters-dialog";
import { NotificationCenterData } from "@/types/notification-center-data.interface";

function SearchErrorDisplay() {
    return (
        <div className="search-error-message">
            An error occurred while performing search, please try again later.
        </div>
    );
}

function SearchResultsView({ currentUser, searchPromise }: {
    currentUser: User,
    searchPromise: Promise<SearchResponse>
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isSearchFiltersModalOpen, setIsSearchFiltersModalOpen] = useState<boolean>(false);
    const [seekingMinAge, setSeekingMinAge] = useState<number>(currentUser.seekingMinAge || businessConfig.defaults.minAge);
    const [seekingMaxAge, setSeekingMaxAge] = useState<number>(currentUser.seekingMaxAge || businessConfig.defaults.maxAge);

    // Update state when currentUser changes
    useEffect(() => {
        setSeekingMinAge(currentUser.seekingMinAge || businessConfig.defaults.minAge);
        setSeekingMaxAge(currentUser.seekingMaxAge || businessConfig.defaults.maxAge);
    }, [currentUser.seekingMinAge, currentUser.seekingMaxAge]);

    const searchSortBy = searchParams.get('sortBy') || SearchSortBy.LastActive;
    const page = Number(searchParams.get('page')) || 1;

    const searchResponse = use(searchPromise);
    if (searchResponse.hasError) {
        return (
            <SearchErrorDisplay />
        );
    }

    return (
        <>
            <div className="home-search-container">
                <div className="search-filters-section">
                    <div className="filter-section">
                        <div className="age-order-by-container">
                            <div className="filter">
                                <label>Age</label>
                                <div className="input-container">
                                    <AgeRangeSelect
                                        minAge={seekingMinAge}
                                        maxAge={seekingMaxAge}
                                        onChange={(newValues) => {
                                            setSeekingMinAge(newValues.minAge);
                                            setSeekingMaxAge(newValues.maxAge);
                                            updateUserSearchPreferences({
                                                seekingMinAge: newValues.minAge,
                                                seekingMaxAge: newValues.maxAge,
                                                sortBy: searchSortBy as SearchSortBy,
                                                page: 1
                                            }).then(() => {
                                                const params = new URLSearchParams(searchParams.toString());
                                                params.set('page', '1');
                                                router.push(`?${params.toString()}`);
                                            }).catch(() => {
                                                alert('An error occurred while updating search preferences.');
                                            });
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="filter">
                                <label>Order By</label>
                                <div className="input-container">
                                    <select value={searchSortBy}
                                        onChange={(e) => {
                                            const params = new URLSearchParams(searchParams.toString());
                                            params.set('sortBy', e.target.value);
                                            router.push(`?${params.toString()}`);
                                        }} className="order-by">
                                        <option value={SearchSortBy.LastActive}>Last Active</option>
                                        <option value={SearchSortBy.Newest}>Newest Member</option>
                                        <option value={SearchSortBy.Age}>Age</option>
                                        <option value={SearchSortBy.NumberOfPhotos}>Photo Count</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsSearchFiltersModalOpen(true)} className="search-filters-button">Search Filters</button>
                    </div>
                    <div className="paginator-section">
                        <div className="paginator-container">
                            {page > 1 && <button onClick={() => {
                                const params = new URLSearchParams(searchParams.toString());
                                params.set('page', (page - 1).toString());
                                router.push(`?${params.toString()}`);
                            }} className="previous-button">Previous Page</button>}
                            {searchResponse.hasNextPage && <button onClick={() => {
                                const params = new URLSearchParams(searchParams.toString());
                                params.set('page', (page + 1).toString());
                                router.push(`?${params.toString()}`);
                            }} className="next-button">Next Page</button>}
                        </div>
                    </div>
                </div>
                <div className="search-results-section">
                    {searchResponse.searchResults.length === 0 ?
                        <h3 className="no-results-label">No results found.</h3> :
                        searchResponse.searchResults.map((userPreview) =>
                            <UserProfilePreview type="search" userPreview={userPreview}
                                key={userPreview.id.toString()} />
                        )
                    }
                </div>
            </div>
            <Modal open={isSearchFiltersModalOpen}>
                <Box sx={{
                    position: 'absolute',
                    top: '48%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '70vw',
                    height: '90vh',
                    maxHeight: '1200px',
                    bgcolor: 'white',
                    outlineWidth: 0,
                    borderRadius: 1.5,
                    boxShadow: 24,
                    overflowY: 'auto',
                    overflowX: 'hidden'
                }}><SearchFiltersDialog
                        onApply={() => router.refresh()}
                        onClose={() => setIsSearchFiltersModalOpen(false)}
                        currentUser={currentUser} />
                </Box>
            </Modal>
        </>
    );
}

export default function HomeSearch({ currentUser, searchPromise, notificationsPromise }: {
    currentUser: User,
    searchPromise: Promise<SearchResponse>,
    notificationsPromise: Promise<NotificationCenterData>
}) {
    return (
        <DashboardWrapper
            activeTab="search"
            currentUser={currentUser}
            notificationsPromise={notificationsPromise}
        >
            <Suspense fallback={<CenterScreenLoader />}>
                <SearchResultsView currentUser={currentUser} searchPromise={searchPromise} />
            </Suspense>
        </DashboardWrapper>
    );
}
