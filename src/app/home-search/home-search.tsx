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
import { getUpdatedSearchResults, updateUserSearchPreferences } from "@/app/home-search/home-search.actions";
import Modal from '@mui/material/Modal';
import { Box } from "@mui/system";
import SearchFiltersDialog from "@/app/home-search/search-filters-dialog/search-filters-dialog";
import { showAlert } from '@/util';
import { AngleLeftIcon, AngleRightIcon } from "react-line-awesome";

function SearchErrorDisplay() {
    return (
        <div className="search-error-message">
            An error occurred while performing search, please try again later.
        </div>
    );
}

function SearchResultsView({ currentUser: initialCurrentUser, searchPromise }: {
    currentUser: Omit<User, 'password'>,
    searchPromise: Promise<SearchResponse>
}) {
    const searchParams = useSearchParams();
    const [currentUser, setCurrentUser] = useState(initialCurrentUser);
    const [isSearchFiltersModalOpen, setIsSearchFiltersModalOpen] = useState<boolean>(false);
    const [seekingMinAge, setSeekingMinAge] = useState<number>(currentUser.seekingMinAge || businessConfig.defaults.minAge);
    const [seekingMaxAge, setSeekingMaxAge] = useState<number>(currentUser.seekingMaxAge || businessConfig.defaults.maxAge);
    const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
    const [isUpdatingSearchResults, setIsUpdatingSearchResults] = useState(false);
    const [updatedSearchResponse, setUpdatedSearchResponse] = useState<SearchResponse | undefined>();
    const innerWidth = window.innerWidth;

    const searchSortBy = (searchParams.get('sortBy') || SearchSortBy.LastActive) as SearchSortBy;
    const page = Number(searchParams.get('page')) || 1;

    useEffect(() => {
        setSeekingMinAge(currentUser.seekingMinAge || businessConfig.defaults.minAge);
        setSeekingMaxAge(currentUser.seekingMaxAge || businessConfig.defaults.maxAge);
    }, [currentUser.seekingMinAge, currentUser.seekingMaxAge]);

    // Reload search results upon update of page or sort
    useEffect(() => {
        if (isInitialLoadComplete) {
            setIsUpdatingSearchResults(true);
            getUpdatedSearchResults(page, searchSortBy)
                .then((result: SearchResponse) => setUpdatedSearchResponse(result))
                .finally(() => setIsUpdatingSearchResults(false));
        }

        setIsInitialLoadComplete(true);
    }, [page, searchSortBy, isInitialLoadComplete]);

    const searchResponse = updatedSearchResponse || use(searchPromise);
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
                                            setIsUpdatingSearchResults(true);
                                            updateUserSearchPreferences({
                                                seekingMinAge: newValues.minAge,
                                                seekingMaxAge: newValues.maxAge
                                            }, searchSortBy)
                                                .then((searchResponse) => {
                                                    const params = new URLSearchParams(searchParams.toString());
                                                    if (params.get('page') !== '1') {
                                                        params.set('page', '1');
                                                        history.pushState({}, '', `?${params.toString()}`);
                                                    }

                                                    setUpdatedSearchResponse(searchResponse);
                                                    setCurrentUser(searchResponse!.currentUser);
                                                })
                                                .catch(() => {
                                                    showAlert('An error occurred while updating search preferences.');
                                                }).finally(() => setIsUpdatingSearchResults(false));
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
                                            history.pushState({}, '', `?${params.toString()}`);
                                        }} className="order-by">
                                        <option value={SearchSortBy.LastActive}>Last Active</option>
                                        <option value={SearchSortBy.Newest}>Newest Member</option>
                                        <option value={SearchSortBy.Age}>Age</option>
                                        <option value={SearchSortBy.NumberOfPhotos}>Photo Count</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsSearchFiltersModalOpen(true)}
                            className="search-filters-button">Search Filters
                        </button>
                    </div>
                    <div className="paginator-section">
                        <div className="paginator-container">
                            {page > 1 && <button onClick={() => {
                                const params = new URLSearchParams(searchParams.toString());
                                params.set('page', (page - 1).toString());
                                history.pushState({}, '', `?${params.toString()}`);
                            }} className="previous-button">
                                <AngleLeftIcon />
                                <span>Previous Page</span>
                            </button>}
                            {searchResponse.hasNextPage && <button onClick={() => {
                                const params = new URLSearchParams(searchParams.toString());
                                params.set('page', (page + 1).toString());
                                history.pushState({}, '', `?${params.toString()}`);
                            }} className="next-button">
                                <span>Next Page</span>
                                <AngleRightIcon />
                            </button>}
                        </div>
                    </div>
                </div>
                <div className="search-results-section">
                    {isUpdatingSearchResults && <CenterScreenLoader />}
                    {searchResponse.searchResults.length === 0 ?
                        <h3 className="no-results-label">No results found.</h3> :
                        searchResponse.searchResults.map((userPreview) =>
                            <UserProfilePreview isInactive={isUpdatingSearchResults} type="search" userPreview={userPreview}
                                key={userPreview.id.toString()} />
                        )
                    }
                </div>
            </div>
            <Modal open={isSearchFiltersModalOpen}>
                <Box className="modal-background" sx={{
                    position: 'absolute',
                    top: innerWidth <= 768 ? '50%' : '48%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: innerWidth <= 768 ? '95vw' : '70vw',
                    height: innerWidth <= 768 ? '80vh' : '90vh',
                    maxHeight: '1200px',
                    bgcolor: 'white',
                    outlineWidth: 0,
                    borderRadius: 1.5,
                    boxShadow: 24,
                    overflowY: 'auto',
                    overflowX: 'hidden'
                }}><SearchFiltersDialog
                        onApply={(searchResponse) => {
                            const params = new URLSearchParams(searchParams.toString());
                            if (params.get('page') !== '1') {
                                params.set('page', '1');
                                history.pushState({}, '', `?${params.toString()}`);
                            }

                            setUpdatedSearchResponse(searchResponse);
                            setCurrentUser(searchResponse.currentUser);
                        }}
                        onClose={() => setIsSearchFiltersModalOpen(false)}
                        currentUser={currentUser} />
                </Box>
            </Modal>
        </>
    );
}

export default function HomeSearch({ currentUser, searchPromise }: {
    currentUser: User,
    searchPromise: Promise<SearchResponse>
}) {
    return (
        <DashboardWrapper
            activeTab="search"
            currentUser={currentUser}
        >
            <Suspense fallback={<CenterScreenLoader />}>
                <SearchResultsView currentUser={currentUser}
                    searchPromise={searchPromise} />
            </Suspense>
        </DashboardWrapper>
    );
}
