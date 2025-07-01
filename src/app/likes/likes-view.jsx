"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LikesView;
const react_1 = require("react");
const center_screen_loader_1 = __importDefault(require("@/common/center-screen-loader/center-screen-loader"));
const dashboard_wrapper_1 = __importDefault(require("@/common/dashboard-wrapper/dashboard-wrapper"));
const user_profile_preview_1 = __importDefault(require("@/common/user-profile-preview/user-profile-preview"));
const react_line_awesome_1 = require("react-line-awesome");
const navigation_1 = require("next/navigation");
require("./likes.scss");
const likes_sort_by_enum_1 = require("@/types/likes-sort-by.enum");
const likes_actions_1 = require("./likes.actions");
function LikesListing({ likesPromise }) {
    const [updatedLikes, setUpdatedLikes] = (0, react_1.useState)();
    const [updatedHasMore, setUpdatedHasMore] = (0, react_1.useState)();
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const isFirstMount = (0, react_1.useRef)(true);
    const searchParams = (0, navigation_1.useSearchParams)();
    const likesData = (0, react_1.use)(likesPromise);
    const likes = updatedLikes || likesData.likes;
    const hasMore = typeof updatedHasMore !== 'undefined' ? updatedHasMore : likesData.hasMore;
    // Get filter values from URL or use defaults
    const sortBy = searchParams.get('sortBy') || likes_sort_by_enum_1.LikesSortBy.ReceivedAt;
    const page = Number(searchParams.get('page')) || 1;
    // React to searchParams changes and reload likes
    (0, react_1.useEffect)(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }
        reloadLikes();
    }, [searchParams]);
    // Handle sort change
    const handleSortChange = (e) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('sortBy', e.target.value);
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({}, '', newUrl);
    };
    // Handle pagination change
    const handlePageChange = (direction) => {
        const params = new URLSearchParams(searchParams.toString());
        const newPage = direction === 'next' ? page + 1 : page - 1;
        params.set('page', newPage.toString());
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({}, '', newUrl);
    };
    const reloadLikes = async () => {
        try {
            setIsLoading(true);
            const updatedLikeData = await (0, likes_actions_1.getLikes)({ sortBy: sortBy || likes_sort_by_enum_1.LikesSortBy.ReceivedAt, page: page || 1 });
            setUpdatedLikes(updatedLikeData.likes);
            setUpdatedHasMore(updatedLikeData.hasMore);
        }
        catch (e) {
            alert('An error occurred while reloading your matches.');
        }
        finally {
            setIsLoading(false);
        }
    };
    return (<div className="likes-view-container">
            {isLoading && <center_screen_loader_1.default />}
            <div className="likes-filters-section">
                <div className="filter-section">
                    <div className="age-order-by-container">
                        <div className="filter">
                            <label>Order By</label>
                            <div className="input-container">
                                <select value={sortBy} onChange={handleSortChange} className="order-by">
                                    <option value={likes_sort_by_enum_1.LikesSortBy.ReceivedAt}>Time Received</option>
                                    <option value={likes_sort_by_enum_1.LikesSortBy.LastActive}>Last Active</option>
                                    <option value={likes_sort_by_enum_1.LikesSortBy.Newest}>Newest Member</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="paginator-section">
                    {page > 1 && (<button onClick={() => handlePageChange('prev')}>
                            Previous Page
                        </button>)}
                    {hasMore && (<button onClick={() => handlePageChange('next')}>
                            Next Page
                        </button>)}
                </div>
            </div>
            <div className="user-likes-listing-container">
                {likes.length === 0 &&
            <div className="no-likes-notice"><react_line_awesome_1.InfoCircleIcon /> You have no likes at this time.</div>}

                {likes.map((user) => <user_profile_preview_1.default isInactive={isLoading} onCallToRefresh={() => reloadLikes()} key={user.id} userPreview={user} type={'like'}/>)}
            </div>
        </div>);
}
function LikesView({ currentUser, likesPromise }) {
    return (<dashboard_wrapper_1.default activeTab="likes" currentUser={currentUser}>
            <react_1.Suspense fallback={<center_screen_loader_1.default />}>
                <LikesListing likesPromise={likesPromise}/>
            </react_1.Suspense>
        </dashboard_wrapper_1.default>);
}
//# sourceMappingURL=likes-view.jsx.map