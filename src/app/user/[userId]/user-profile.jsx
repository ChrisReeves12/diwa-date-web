"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = UserProfile;
const react_1 = require("react");
const current_user_context_1 = require("@/common/context/current-user-context");
const site_top_bar_1 = __importDefault(require("@/common/site-top-bar/site-top-bar"));
const user_photo_display_1 = __importDefault(require("@/common/user-photo-display/user-photo-display"));
const link_1 = __importDefault(require("next/link"));
const react_line_awesome_1 = require("react-line-awesome");
const lodash_1 = __importDefault(require("lodash"));
const user_subscription_plan_display_1 = __importDefault(require("@/common/user-subscription-plan-display/user-subscription-plan-display"));
const user_profile_actions_1 = require("@/common/server-actions/user-profile.actions");
const use_websocket_1 = require("@/hooks/use-websocket");
const user_helpers_1 = require("@/helpers/user.helpers");
function UserProfile({ userProfileDetail, currentUser }) {
    var _a, _b, _c;
    const [userProfile, setUserProfile] = (0, react_1.useState)(userProfileDetail);
    const [isUpdatingMatch, setIsUpdatingMatch] = (0, react_1.useState)(false);
    const [isBlockingOrUnBlocking, setIsBlockingOrUnBlocking] = (0, react_1.useState)(false);
    const [showImageViewer, setShowImageViewer] = (0, react_1.useState)(false);
    const [currentImageIndex, setCurrentImageIndex] = (0, react_1.useState)(0);
    const imageViewerRef = (0, react_1.useRef)(null);
    const { on, off, isConnected } = (0, use_websocket_1.useWebSocket)();
    const refetchUserProfile = (0, react_1.useCallback)(async () => {
        try {
            const result = await (0, user_profile_actions_1.loadFullUserProfile)(Number(userProfile.user.id));
            if ('userProfileDetails' in result && result.userProfileDetails) {
                console.log('Successfully refetched user profile, updating state');
                setUserProfile(result.userProfileDetails);
            }
            else if ('error' in result) {
                console.error('Error refetching user profile:', result.error);
            }
            else {
                console.error('Unexpected response format from loadFullUserProfile:', result);
            }
        }
        catch (error) {
            console.error('Error refetching user profile:', error);
        }
    }, [userProfile.user.id]);
    const onPhotoView = (e, idx) => {
        if (e)
            e.preventDefault();
        if (userProfile.user.publicPhotos) {
            setCurrentImageIndex(idx);
            setShowImageViewer(true);
        }
    };
    // Handle image viewer click to close
    (0, react_1.useEffect)(() => {
        function handleImageViewerClick(event) {
            if (event.target instanceof Element) {
                if (event.target.closest('.image-viewer-nav') ||
                    event.target.closest('.image-viewer-caption')) {
                    return;
                }
            }
            setShowImageViewer(false);
        }
        if (showImageViewer) {
            document.addEventListener("click", handleImageViewerClick);
        }
        return () => {
            document.removeEventListener("click", handleImageViewerClick);
        };
    }, [showImageViewer]);
    const navigateImage = (0, react_1.useCallback)((direction, event) => {
        event.stopPropagation();
        if (!userProfile.user.publicPhotos)
            return;
        if (direction === 'prev') {
            setCurrentImageIndex(prev => prev === 0 ? userProfile.user.publicPhotos.length - 1 : prev - 1);
        }
        else {
            setCurrentImageIndex(prev => prev === userProfile.user.publicPhotos.length - 1 ? 0 : prev + 1);
        }
    }, [userProfile.user.publicPhotos]);
    // Handle keyboard navigation with arrow keys
    (0, react_1.useEffect)(() => {
        function handleKeyDown(event) {
            if (!showImageViewer)
                return;
            if (event.key === 'ArrowLeft') {
                navigateImage('prev', event);
            }
            else if (event.key === 'ArrowRight') {
                navigateImage('next', event);
            }
            else if (event.key === 'Escape') {
                setShowImageViewer(false);
            }
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [showImageViewer, userProfile.user.publicPhotos, navigateImage]);
    (0, react_1.useEffect)(() => {
        if (!isConnected || !currentUser)
            return;
        const handleMatchEvent = () => {
            console.log('Match event received - refreshing user profile');
            refetchUserProfile();
        };
        const handleMessageEvent = () => {
            console.log('Message event received - refreshing user profile');
            refetchUserProfile();
        };
        const handleBlockEvent = (data) => {
            console.log('Block event received:', data);
            console.log('Current user ID:', currentUser.id, 'Viewed user ID:', userProfile.user.id);
            // Only update state if the current user was blocked by the user being viewed
            if (data.blockedBy === userProfile.user.id && data.blockedUserId === currentUser.id) {
                console.log('Current user was blocked by viewed user - updating local state');
                setUserProfile(prev => (Object.assign(Object.assign({}, prev), { theyBlockedMe: true })));
            }
            else {
                console.log('Block event not relevant to current profile view');
            }
        };
        const handleUnblockEvent = (data) => {
            console.log('Unblock event received:', data);
            console.log('Current user ID:', currentUser.id, 'Viewed user ID:', userProfile.user.id);
            // Only update state if the current user was unblocked by the user being viewed
            if (data.unblockedBy === userProfile.user.id && data.unblockedUserId === currentUser.id) {
                console.log('Current user was unblocked by viewed user - updating local state');
                setUserProfile(prev => (Object.assign(Object.assign({}, prev), { theyBlockedMe: false })));
            }
            else {
                console.log('Unblock event not relevant to current profile view');
            }
        };
        on('match:new', handleMatchEvent);
        on('match:cancelled', handleMatchEvent);
        on('message:new', handleMessageEvent);
        on('user:blocked', handleBlockEvent);
        on('user:unblocked', handleUnblockEvent);
        return () => {
            off('match:new', handleMatchEvent);
            off('match:cancelled', handleMatchEvent);
            off('message:new', handleMessageEvent);
            off('user:blocked', handleBlockEvent);
            off('user:unblocked', handleUnblockEvent);
        };
    }, [isConnected, currentUser, on, off, refetchUserProfile]);
    const onRequestMatchClick = async (e) => {
        e.preventDefault();
        setIsUpdatingMatch(true);
        try {
            const sendUserMatchResult = await (0, user_profile_actions_1.sendUserMatch)(Number(userProfile.user.id));
            if (typeof sendUserMatchResult === 'object' && 'error' in sendUserMatchResult) {
                alert(sendUserMatchResult.error);
                return;
            }
            await (0, user_profile_actions_1.unMuteUser)(Number(userProfile.user.id));
            const result = await (0, user_profile_actions_1.loadFullUserProfile)(Number(userProfile.user.id));
            if (!("userProfileDetails" in result) || ("error" in result && result.error) || ("userProfileDetails" in result && !result.userProfileDetails)) {
                alert(("error" in result && result.error) || 'An error occurred sending update. Please try again later.');
                return;
            }
            setUserProfile(result.userProfileDetails);
        }
        catch (error) {
            console.error('Error sending match request:', error);
        }
        finally {
            setIsUpdatingMatch(false);
        }
    };
    const onCancelMatchClick = async (e) => {
        e.preventDefault();
        setIsUpdatingMatch(true);
        try {
            await (0, user_profile_actions_1.removeUserMatch)(Number(userProfile.user.id));
            const result = await (0, user_profile_actions_1.loadFullUserProfile)(Number(userProfile.user.id));
            if ('error' in result || !result.userProfileDetails) {
                alert(('error' in result && result.error) || 'An error occurred sending update. Please try again later.');
                return;
            }
            setUserProfile(result.userProfileDetails);
        }
        catch (error) {
            console.error('Error canceling match request:', error);
        }
        finally {
            setIsUpdatingMatch(false);
        }
    };
    const onIgnoreMatchClick = async (e) => {
        e.preventDefault();
        setIsUpdatingMatch(true);
        try {
            await (0, user_profile_actions_1.muteUser)(Number(userProfile.user.id));
            const result = await (0, user_profile_actions_1.loadFullUserProfile)(Number(userProfile.user.id));
            if ('error' in result || !result.userProfileDetails) {
                alert(('error' in result && result.error) || 'An error occurred sending update. Please try again later.');
                return;
            }
            setUserProfile(result.userProfileDetails);
        }
        catch (error) {
            console.error('Error rejecting match request:', error);
        }
        finally {
            setIsUpdatingMatch(false);
        }
    };
    const onBlockUserClick = async (e) => {
        e.preventDefault();
        setIsBlockingOrUnBlocking(true);
        try {
            await (0, user_profile_actions_1.blockUserAction)(Number(userProfile.user.id));
            const result = await (0, user_profile_actions_1.loadFullUserProfile)(Number(userProfile.user.id));
            if ('error' in result || !result.userProfileDetails) {
                alert(('error' in result && result.error) || 'An error occurred sending update. Please try again later.');
                return;
            }
            setUserProfile(result.userProfileDetails);
        }
        catch (error) {
            console.error('Error blocking user:', error);
        }
        finally {
            setIsBlockingOrUnBlocking(false);
        }
    };
    const onUnBlockUserClick = async (e) => {
        e.preventDefault();
        setIsBlockingOrUnBlocking(true);
        try {
            await (0, user_profile_actions_1.unBlockUserAction)(Number(userProfile.user.id));
            const result = await (0, user_profile_actions_1.loadFullUserProfile)(Number(userProfile.user.id));
            if ('error' in result || !result.userProfileDetails) {
                alert(('error' in result && result.error) || 'An error occurred sending update. Please try again later.');
                return;
            }
            setUserProfile(result.userProfileDetails);
        }
        catch (error) {
            console.error('Error unblocking user:', error);
        }
        finally {
            setIsBlockingOrUnBlocking(false);
        }
    };
    return (<current_user_context_1.CurrentUserProvider currentUser={currentUser}>
            <site_top_bar_1.default />
            <div className="user-profile-container">
                <div className="container">
                    {!userProfile ? (<h2 className="profile-msg">User cannot be found.</h2>) : userProfile.theyBlockedMe ? (<h2 className="profile-msg">You have been blocked by this user.</h2>) : userProfile.suspendedAt ? (<h2 className="profile-msg">This user has been suspended.</h2>) : !userProfile ? (<h2 className="profile-msg">User cannot be found.</h2>) : (<div className="user-content-wrapper">
                            <user_subscription_plan_display_1.default />

                            <div className="user-profile-info-section">
                                <a onClick={(e) => onPhotoView(e, 0)}>
                                    <user_photo_display_1.default alt={userProfile.user.displayName} croppedImageData={userProfile.user.mainPhotoCroppedImageData} imageUrl={userProfile.user.publicMainPhoto} width={300} height={300} gender={userProfile.user.gender}/>
                                </a>

                                <div className="user-basic-info-section">
                                    <h1 className="user-display-name">{userProfile.user.displayName}</h1>
                                    <h4 className="user-age">{userProfile.user.age} Year Old {userProfile.user.gender === 'male' ? 'Man' : 'Woman'}</h4>
                                    {userProfile.matchIsTowardsMe === true && userProfile.matchStatus === 'pending' ? (<h5 className="user-like-label">{userProfile.user.gender === 'male' ? 'He' : 'She'} Likes You</h5>) : null}

                                    <div className="online-status-location-container">
                                        <div className="online-lamp-section">
                                            <div className={`online-lamp ${userProfile.user.lastActiveAt && (0, user_helpers_1.isUserOnline)(userProfile.user.lastActiveAt, userProfile.user.hideOnlineStatus) ? 'online' : 'offline'}`}></div>
                                            <div className="online-status-label">{userProfile.user.lastActiveAt && (0, user_helpers_1.isUserOnline)(userProfile.user.lastActiveAt, userProfile.user.hideOnlineStatus) ? 'Online' : 'Offline'}</div>
                                        </div>
                                        <div className="location-section">
                                            <react_line_awesome_1.MapMarkerIcon />
                                            <div className="location-name">{userProfile.user.locationName}</div>
                                        </div>
                                    </div>

                                    <div className="basic-info-buttons-container">
                                        <div className="basic-info-container">
                                            <div className="basic-info-line">
                                                <div className="label">Seeking:</div>
                                                <div className="value">{userProfile.seekingLabel}</div>
                                            </div>
                                            <div className="basic-info-line">
                                                <div className="label">Marital Status:</div>
                                                <div className="value">{userProfile.maritalStatusLabel}</div>
                                            </div>
                                            <div className="basic-info-line">
                                                <div className="label">Ethnicity:</div>
                                                <div className="value">{userProfile.ethnicityLabel}</div>
                                            </div>
                                            <div className="basic-info-line">
                                                <div className="label">Height:</div>
                                                <div className="value">{userProfile.heightLabel}</div>
                                            </div>
                                            <div className="basic-info-line">
                                                <div className="label">Body Type:</div>
                                                <div className="value">{userProfile.bodyTypeLabel}</div>
                                            </div>
                                            <div className="basic-info-line">
                                                <div className="label">Religion:</div>
                                                <div className="value">{userProfile.religionLabel}</div>
                                            </div>
                                            <div className="basic-info-line">
                                                <div className="label">Drinking:</div>
                                                <div className="value">{userProfile.drinkingLabel}</div>
                                            </div>
                                            <div className="basic-info-line">
                                                <div className="label">Smoking:</div>
                                                <div className="value">{userProfile.smokingLabel}</div>
                                            </div>
                                            <div className="basic-info-line">
                                                <div className="label">Education:</div>
                                                <div className="value">{userProfile.educationLabel}</div>
                                            </div>
                                            <div className="basic-info-line">
                                                <div className="label">Has Children:</div>
                                                <div className="value">{userProfile.hasChildrenLabel}</div>
                                            </div>
                                            <div className="basic-info-line">
                                                <div className="label">Wants Children:</div>
                                                <div className="value">{userProfile.wantsChildrenLabel}</div>
                                            </div>
                                            <div className="basic-info-line">
                                                <div className="label">Last Active:</div>
                                                <div className="value">{userProfile.lastActiveHumanized}</div>
                                            </div>
                                        </div>

                                        <div className="buttons-container">
                                            {userProfile.matchStatus === 'pending' && !userProfile.matchIsTowardsMe ? (<button disabled={isUpdatingMatch} onClick={onCancelMatchClick} className="request-match">
                                                    <react_line_awesome_1.HeartBrokenIcon />
                                                    <div className="label">Cancel Match Request</div>
                                                </button>) : userProfile.matchStatus === 'pending' && userProfile.matchIsTowardsMe ? (<>
                                                    <button disabled={isUpdatingMatch} onClick={onRequestMatchClick} className="request-match">
                                                        <react_line_awesome_1.HeartIcon />
                                                        <div className="label">Accept Match</div>
                                                    </button>
                                                    <button disabled={isUpdatingMatch} onClick={onIgnoreMatchClick} className="reject-match">
                                                        <react_line_awesome_1.TimesIcon />
                                                        <div className="label">Pass</div>
                                                    </button>
                                                </>) : userProfile.matchStatus === 'matched' ? (<>
                                                    <div className="matched">
                                                        <react_line_awesome_1.CheckCircleIcon />
                                                        <div className="label">Matched</div>
                                                    </div>

                                                    {userProfile.matchId && (<link_1.default href={`/messages/${userProfile.matchId}`} className="request-match">
                                                            <react_line_awesome_1.CommentsIcon />
                                                            <div className="label">Send Message</div>
                                                        </link_1.default>)}
                                                </>) : (<button disabled={isUpdatingMatch} onClick={onRequestMatchClick} className="request-match">
                                                    <react_line_awesome_1.HeartIcon />
                                                    <div className="label">Like</div>
                                                </button>)}

                                            <div className="cancel-block-button-container">
                                                {!userProfile.blockedThem ? (<button disabled={isBlockingOrUnBlocking} onClick={onBlockUserClick} className="block-user">
                                                        <react_line_awesome_1.BanIcon />
                                                        <div className="label">Block User</div>
                                                    </button>) : (<button disabled={isBlockingOrUnBlocking} onClick={onUnBlockUserClick} className="block-user">
                                                        <react_line_awesome_1.UnlockIcon />
                                                        <div className="label">Unblock User</div>
                                                    </button>)}

                                                <button className="report-user">
                                                    <react_line_awesome_1.ExclamationTriangleIcon />
                                                    <div className="label">Report User</div>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="photos-additional-info-section">
                                <div className="photos-container">
                                    <div className="section-title">
                                        <react_line_awesome_1.ImageIcon />
                                        <div className="title">Photos</div>
                                    </div>
                                    <div className="photos">
                                        {(_a = userProfile.user.publicPhotos) === null || _a === void 0 ? void 0 : _a.map((photo, idx) => (<a key={idx} onClick={(e) => onPhotoView(e, idx)} href="">
                                                <user_photo_display_1.default imageUrl={photo.path} alt={`${userProfile.user.displayName}'s photo ${idx + 1}`} width={96} height={96} shape="square" croppedImageData={photo.croppedImageData} gender={userProfile.user.gender}/>
                                            </a>))}
                                    </div>
                                </div>

                                <div className="information-container">
                                    <div className="section-title">
                                        <react_line_awesome_1.UserCircleIcon />
                                        <div className="title">Biography</div>
                                    </div>
                                    <div className="bio">{userProfile.user.bio || 'No biography available yet.'}</div>

                                    {((_b = userProfile.interestLabels) === null || _b === void 0 ? void 0 : _b.length) > 0 && (<>
                                            <div className="section-title">
                                                <react_line_awesome_1.StarIcon />
                                                <div className="title">Interests</div>
                                            </div>
                                            <div className="interests">
                                                {userProfile.interestLabels.map((interest, idx) => (<div key={idx} className="interest-bubble">
                                                        <div className="bubble-container">
                                                            <div className="emoji">{interest.emoji}</div>
                                                            <div className="label">{interest.label}</div>
                                                        </div>
                                                    </div>))}
                                            </div>
                                        </>)}
                                </div>
                            </div>
                        </div>)}
                </div>

                {/* Full-screen Image Viewer */}
                {showImageViewer && userProfile.user.publicPhotos && userProfile.user.publicPhotos.length > 0 && (<div className="image-viewer-overlay" ref={imageViewerRef}>
                        <div className="image-viewer-content">
                            <div className="image-viewer-nav image-viewer-prev" onClick={(e) => navigateImage('prev', e)}>
                                <react_line_awesome_1.AngleLeftIcon />
                            </div>
                            <div className="image-viewer-image-wrapper">
                                <div className="image-viewer-image-container">
                                    <img src={((_c = userProfile.user.publicPhotos[currentImageIndex].croppedImageData) === null || _c === void 0 ? void 0 : _c.croppedImagePath) ||
                userProfile.user.publicPhotos[currentImageIndex].path} alt={`${userProfile.user.displayName}'s photo ${currentImageIndex + 1}`} className="image-viewer-image"/>
                                </div>
                                {userProfile.user.publicPhotos[currentImageIndex].caption && (<div className="image-viewer-caption">
                                        {lodash_1.default.truncate(userProfile.user.publicPhotos[currentImageIndex].caption, { length: 180 })}
                                    </div>)}
                            </div>
                            <div className="image-viewer-nav image-viewer-next" onClick={(e) => navigateImage('next', e)}>
                                <react_line_awesome_1.AngleRightIcon />
                            </div>
                        </div>
                    </div>)}
            </div>
        </current_user_context_1.CurrentUserProvider>);
}
//# sourceMappingURL=user-profile.jsx.map