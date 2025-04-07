'use client';

import './home-search.scss';
import { SearchFromOrigin, User } from "../../types";
import DashboardWrapper from "@/common/dashboard-wrapper/dashboard-wrapper";
import AgeRangeSelect from "@/common/age-range-select/age-range-select";
import Paginator from "@/common/paginator/paginator";
import { Suspense, useEffect, useState } from "react";
import { SearchParameters, SearchSortBy } from "@/types/search-parameters.interface";
import { useRouter, useSearchParams } from "next/navigation";
import { businessConfig } from "@/config/business";
import { LocalityViewport } from "@/types/locality-viewport.interface";
import { UserPreview } from "@/types/user-preview.interface";
import { SearchResponse } from "@/types/search-response.interface";
import { CircularProgress } from "@mui/material";
import UserProfilePreview from "@/common/user-profile-preview/user-profile-preview";

export default function HomeSearch({ currentUser }: { currentUser: User }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [seekingMinAge, setSeekingMinAge] = useState<number>(currentUser.seeking_min_age || businessConfig.defaults.minAge);
    const [seekingMaxAge, setSeekingMaxAge] = useState<number>(currentUser.seeking_max_age || businessConfig.defaults.maxAge);
    const [seekingMinHeight, setSeekingMinHeight] = useState<number>(currentUser.seeking_min_height || businessConfig.defaults.minHeight);
    const [seekingMaxHeight, setSeekingMaxHeight] = useState<number>(currentUser.seeking_max_height || businessConfig.defaults.maxHeight);
    const [searchNumOfPhotos, setSearchNumOfPhotos] = useState<number>(currentUser.seeking_num_of_photos || businessConfig.defaults.numOfPhotos);
    const [ethnicPreferences, setEthnicPreferences] = useState<string[] | undefined>(currentUser.ethnic_preferences);
    const [religiousPreferences, setReligiousPreferences] = useState<string[] | undefined>(currentUser.religious_preferences);
    const [languagePreferences, setLanguagePreferences] = useState<string[] | undefined>(currentUser.language_preferences);
    const [interestPreferences, setInterestPreferences] = useState<string[] | undefined>(currentUser.interest_preferences);
    const [maritalStatusPreferences, setMaritalStatusPreferences] = useState<string[] | undefined>(currentUser.marital_status_preferences);
    const [bodyTypePreferences, setBodyTypePreferences] = useState<string[] | undefined>(currentUser.body_type_preferences);
    const [hasChildrenPreferences, setHasChildrenPreferences] = useState<string[] | undefined>(currentUser.has_children_preferences);
    const [wantsChildrenPreferences, setWantsChildrenPreferences] = useState<string[] | undefined>(currentUser.wants_children_preferences);
    const [educationPreferences, setEducationPreferences] = useState<string[] | undefined>(currentUser.education_preferences);
    const [smokingPreferences, setSmokingPreferences] = useState<string[] | undefined>(currentUser.smoking_preferences);
    const [drinkingPreferences, setDrinkingPreferences] = useState<string[] | undefined>(currentUser.drinking_preferences);
    const [seekingCountries, setSeekingCountries] = useState<string[] | undefined>(currentUser.seeking_countries);
    const [seekingDistanceOrigin, setSeekingDistanceOrigin] = useState<SearchFromOrigin>((currentUser.seeking_distance_origin || SearchFromOrigin.CurrentLocation) as SearchFromOrigin);
    const [seekingMaxDistance, setSeekingMaxDistance] = useState<number>(currentUser.seeking_max_distance || businessConfig.defaults.maxDistance);
    const [seekingGenders, setSeekingGenders] = useState<string[] | undefined>(currentUser.seeking_genders);
    const [searchSortBy, setSearchSortBy] = useState<SearchSortBy>(SearchSortBy.LastActive);
    const [searchFromLocation, setSearchFromLocation] = useState<{ viewport?: LocalityViewport, search_countries?: string[] } | undefined>();
    const [searchResults, setSearchResults] = useState<UserPreview[]>([]);
    const [pageCount, setPageCount] = useState<number>(1);
    const [isSearching, setIsSearching] = useState(true);

    // Perform user search
    useEffect(() => {
        fetch('/api/search', {
            method: 'POST',
            body: JSON.stringify({
                page: Number(searchParams.get('page') || 1),
                seeking_min_age: seekingMinAge,
                seeking_max_age: seekingMaxAge,
                seeking_min_height: seekingMinHeight,
                seeking_max_height: seekingMaxHeight,
                number_of_photos: searchNumOfPhotos,
                ethnicities: ethnicPreferences,
                religions: religiousPreferences,
                languages: languagePreferences,
                interests: interestPreferences,
                marital_status: maritalStatusPreferences,
                body_type: bodyTypePreferences,
                has_children: hasChildrenPreferences,
                wants_children: wantsChildrenPreferences,
                education: educationPreferences,
                smoking: smokingPreferences,
                drinking: drinkingPreferences,
                seeking_countries: seekingCountries,
                seeking_distance_origin: seekingDistanceOrigin,
                seeking_max_distance: seekingMaxDistance,
                seeking_genders: seekingGenders,
                sort_by: searchSortBy,
                search_from_location: searchFromLocation
            } as SearchParameters),
            headers: {
                'content-type': 'application/json',
                'accept': 'application/json'
            }
        }).then((response) => response.json()).then((jsonResponse: SearchResponse) => {
            setSearchResults(jsonResponse.searchResults);
            setPageCount(jsonResponse.pageCount);
        }).finally(() => setIsSearching(false));
    }, []);

    return (
        <DashboardWrapper activeTab="search" currentUser={currentUser}>
            <div className="home-search-container">
                <div className="search-filters-section">
                    <div className="filter-section">
                        <div className="age-order-by-container">
                            <div className="filter">
                                <label>Age</label>
                                <div className="input-container">
                                    <AgeRangeSelect
                                        onMinAgeChange={(e) => { }}
                                        onMaxAgeChange={(e) => { }}
                                    />
                                </div>
                            </div>
                            <div className="filter">
                                <label>Order By</label>
                                <div className="input-container">
                                    <select className="order-by">
                                        <option>Last Active</option>
                                        <option>Newest Member</option>
                                        <option>Age</option>
                                        <option>Photo Count</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <button className="search-filters-button">Search Filters</button>
                    </div>
                    <div className="paginator-section">
                        <Paginator pageCount={pageCount} />
                    </div>
                </div>
                {isSearching &&
                    <div style={{flex: 1, display: 'flex', justifyContent: 'center', paddingTop: '10vh'}}>
                        <CircularProgress thickness={1} size={220} color="info"/>
                    </div>}
                {!isSearching &&
                    <div className="search-results-section">
                        {searchResults.length === 0 ?
                            <h3 className="no-results-label">No results found.</h3> :
                            searchResults.map((userPreview) =>
                                <UserProfilePreview userPreview={userPreview} key={userPreview.id.toString()}/>
                            )
                        }
                    </div>}
            </div>
        </DashboardWrapper>
    );
}
