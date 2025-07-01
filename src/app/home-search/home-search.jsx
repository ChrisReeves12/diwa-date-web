"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HomeSearch;
require("./home-search.scss");
const dashboard_wrapper_1 = __importDefault(require("@/common/dashboard-wrapper/dashboard-wrapper"));
const age_range_select_1 = __importDefault(require("@/common/age-range-select/age-range-select"));
const react_1 = require("react");
const search_parameters_interface_1 = require("@/types/search-parameters.interface");
const navigation_1 = require("next/navigation");
const business_1 = require("@/config/business");
const user_profile_preview_1 = __importDefault(require("@/common/user-profile-preview/user-profile-preview"));
const center_screen_loader_1 = __importDefault(require("@/common/center-screen-loader/center-screen-loader"));
const home_search_actions_1 = require("@/app/home-search/home-search.actions");
const Modal_1 = __importDefault(require("@mui/material/Modal"));
const system_1 = require("@mui/system");
const search_filters_dialog_1 = __importDefault(require("@/app/home-search/search-filters-dialog/search-filters-dialog"));
function SearchErrorDisplay() {
    return (<div className="search-error-message">
            An error occurred while performing search, please try again later.
        </div>);
}
function SearchResultsView({ currentUser: initialCurrentUser, searchPromise }) {
    const router = (0, navigation_1.useRouter)();
    const searchParams = (0, navigation_1.useSearchParams)();
    const [currentUser, setCurrentUser] = (0, react_1.useState)(initialCurrentUser);
    const [isSearchFiltersModalOpen, setIsSearchFiltersModalOpen] = (0, react_1.useState)(false);
    const [seekingMinAge, setSeekingMinAge] = (0, react_1.useState)(currentUser.seekingMinAge || business_1.businessConfig.defaults.minAge);
    const [seekingMaxAge, setSeekingMaxAge] = (0, react_1.useState)(currentUser.seekingMaxAge || business_1.businessConfig.defaults.maxAge);
    const [isInitialLoadComplete, setIsInitialLoadComplete] = (0, react_1.useState)(false);
    const [isUpdatingSearchResults, setIsUpdatingSearchResults] = (0, react_1.useState)(false);
    const [updatedSearchResponse, setUpdatedSearchResponse] = (0, react_1.useState)();
    const searchSortBy = (searchParams.get('sortBy') || search_parameters_interface_1.SearchSortBy.LastActive);
    const page = Number(searchParams.get('page')) || 1;
    (0, react_1.useEffect)(() => {
        setSeekingMinAge(currentUser.seekingMinAge || business_1.businessConfig.defaults.minAge);
        setSeekingMaxAge(currentUser.seekingMaxAge || business_1.businessConfig.defaults.maxAge);
    }, [currentUser.seekingMinAge, currentUser.seekingMaxAge]);
    // Reload search results upon update of page or sort
    (0, react_1.useEffect)(() => {
        if (isInitialLoadComplete) {
            setIsUpdatingSearchResults(true);
            (0, home_search_actions_1.getUpdatedSearchResults)(page, searchSortBy)
                .then((result) => setUpdatedSearchResponse(result))
                .finally(() => setIsUpdatingSearchResults(false));
        }
        setIsInitialLoadComplete(true);
    }, [page, searchSortBy]);
    const searchResponse = updatedSearchResponse || (0, react_1.use)(searchPromise);
    if (searchResponse.hasError) {
        return (<SearchErrorDisplay />);
    }
    return (<>
            <div className="home-search-container">
                <div className="search-filters-section">
                    <div className="filter-section">
                        <div className="age-order-by-container">
                            <div className="filter">
                                <label>Age</label>
                                <div className="input-container">
                                    <age_range_select_1.default minAge={seekingMinAge} maxAge={seekingMaxAge} onChange={(newValues) => {
            setSeekingMinAge(newValues.minAge);
            setSeekingMaxAge(newValues.maxAge);
            setIsUpdatingSearchResults(true);
            (0, home_search_actions_1.updateUserSearchPreferences)({
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
                setCurrentUser(searchResponse.currentUser);
            })
                .catch(() => {
                alert('An error occurred while updating search preferences.');
            }).finally(() => setIsUpdatingSearchResults(false));
        }}/>
                                </div>
                            </div>
                            <div className="filter">
                                <label>Order By</label>
                                <div className="input-container">
                                    <select value={searchSortBy} onChange={(e) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set('sortBy', e.target.value);
            history.pushState({}, '', `?${params.toString()}`);
        }} className="order-by">
                                        <option value={search_parameters_interface_1.SearchSortBy.LastActive}>Last Active</option>
                                        <option value={search_parameters_interface_1.SearchSortBy.Newest}>Newest Member</option>
                                        <option value={search_parameters_interface_1.SearchSortBy.Age}>Age</option>
                                        <option value={search_parameters_interface_1.SearchSortBy.NumberOfPhotos}>Photo Count</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsSearchFiltersModalOpen(true)} className="search-filters-button">Search Filters
                        </button>
                    </div>
                    <div className="paginator-section">
                        <div className="paginator-container">
                            {page > 1 && <button onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set('page', (page - 1).toString());
                history.pushState({}, '', `?${params.toString()}`);
            }} className="previous-button">Previous Page</button>}
                            {searchResponse.hasNextPage && <button onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set('page', (page + 1).toString());
                history.pushState({}, '', `?${params.toString()}`);
            }} className="next-button">Next Page</button>}
                        </div>
                    </div>
                </div>
                <div className="search-results-section">
                    {isUpdatingSearchResults && <center_screen_loader_1.default />}
                    {searchResponse.searchResults.length === 0 ?
            <h3 className="no-results-label">No results found.</h3> :
            searchResponse.searchResults.map((userPreview) => <user_profile_preview_1.default isInactive={isUpdatingSearchResults} type="search" userPreview={userPreview} key={userPreview.id.toString()}/>)}
                </div>
            </div>
            <Modal_1.default open={isSearchFiltersModalOpen}>
                <system_1.Box sx={{
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
        }}><search_filters_dialog_1.default onApply={(searchResponse) => {
            const params = new URLSearchParams(searchParams.toString());
            if (params.get('page') !== '1') {
                params.set('page', '1');
                history.pushState({}, '', `?${params.toString()}`);
            }
            setUpdatedSearchResponse(searchResponse);
            setCurrentUser(searchResponse.currentUser);
        }} onClose={() => setIsSearchFiltersModalOpen(false)} currentUser={currentUser}/>
                </system_1.Box>
            </Modal_1.default>
        </>);
}
function HomeSearch({ currentUser, searchPromise }) {
    return (<dashboard_wrapper_1.default activeTab="search" currentUser={currentUser}>
            <react_1.Suspense fallback={<center_screen_loader_1.default />}>
                <SearchResultsView currentUser={currentUser} searchPromise={searchPromise}/>
            </react_1.Suspense>
        </dashboard_wrapper_1.default>);
}
//# sourceMappingURL=home-search.jsx.map