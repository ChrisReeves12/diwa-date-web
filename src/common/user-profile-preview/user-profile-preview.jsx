"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = UserProfilePreview;
require("./user-profile-preview.scss");
const user_photo_display_1 = __importDefault(require("@/common/user-photo-display/user-photo-display"));
const util_1 = require("@/util");
const image_1 = __importDefault(require("next/image"));
const react_line_awesome_1 = require("react-line-awesome");
const react_1 = require("react");
const react_line_awesome_2 = require("react-line-awesome");
const user_profile_actions_1 = require("../server-actions/user-profile.actions");
const lodash_1 = __importDefault(require("lodash"));
function UserProfilePreview({ userPreview, type, onCallToRefresh, isInactive = false }) {
    var _a, _b, _c, _d, _e;
    const [showPhotoPopover, setShowPhotoPopover] = (0, react_1.useState)(false);
    const [showMoreOptionsPopover, setShowMoreOptionsPopover] = (0, react_1.useState)(false);
    const [showImageViewer, setShowImageViewer] = (0, react_1.useState)(false);
    const [currentImageIndex, setCurrentImageIndex] = (0, react_1.useState)(0);
    const [userMatchStatus, setUserMatchStatus] = (0, react_1.useState)(userPreview.matchStatus);
    const [blockedThem, setBlockedThem] = (0, react_1.useState)(userPreview.blockedThem);
    const popoverRef = (0, react_1.useRef)(null);
    const buttonRef = (0, react_1.useRef)(null);
    const moreOptionsPopoverRef = (0, react_1.useRef)(null);
    const moreOptionsButtonRef = (0, react_1.useRef)(null);
    const imageViewerRef = (0, react_1.useRef)(null);
    // Close popovers when clicking outside
    (0, react_1.useEffect)(() => {
        function handleClickOutside(event) {
            if (popoverRef.current && buttonRef.current &&
                !popoverRef.current.contains(event.target) &&
                !buttonRef.current.contains(event.target)) {
                setShowPhotoPopover(false);
            }
            if (moreOptionsPopoverRef.current && moreOptionsButtonRef.current &&
                !moreOptionsPopoverRef.current.contains(event.target) &&
                !moreOptionsButtonRef.current.contains(event.target)) {
                setShowMoreOptionsPopover(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);
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
    const togglePhotoPopover = () => {
        setShowPhotoPopover(!showPhotoPopover);
        if (showMoreOptionsPopover)
            setShowMoreOptionsPopover(false);
    };
    const toggleMoreOptionsPopover = () => {
        setShowMoreOptionsPopover(!showMoreOptionsPopover);
        if (showPhotoPopover)
            setShowPhotoPopover(false);
    };
    const handleLike = async () => {
        if (userMatchStatus === 'pending' && !userPreview.theyLikedMe) {
            await (0, user_profile_actions_1.removeUserMatch)(Number(userPreview.id));
            setUserMatchStatus(undefined);
        }
        else {
            const sendUserMatchResult = await (0, user_profile_actions_1.sendUserMatch)(Number(userPreview.id));
            if (typeof sendUserMatchResult === 'object' && "error" in sendUserMatchResult) {
                alert(sendUserMatchResult.error);
                return;
            }
            setUserMatchStatus(sendUserMatchResult);
        }
    };
    const handleBlock = async () => {
        if (blockedThem) {
            await (0, user_profile_actions_1.unBlockUserAction)(Number(userPreview.id));
            setBlockedThem(false);
        }
        else {
            await (0, user_profile_actions_1.blockUserAction)(Number(userPreview.id));
            setBlockedThem(true);
        }
    };
    const handleReport = () => {
        console.log("Reported user:", userPreview.id);
    };
    const openImageViewer = (index) => {
        setCurrentImageIndex(index);
        setShowImageViewer(true);
    };
    const navigateImage = (0, react_1.useCallback)((direction, event) => {
        event.stopPropagation();
        if (!userPreview.photos)
            return;
        if (direction === 'prev') {
            setCurrentImageIndex(prev => prev === 0 ? userPreview.photos.length - 1 : prev - 1);
        }
        else {
            setCurrentImageIndex(prev => prev === userPreview.photos.length - 1 ? 0 : prev + 1);
        }
    }, [userPreview.photos]);
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
    }, [showImageViewer, userPreview.photos, navigateImage]);
    const confirmMatch = async () => {
        const sendUserMatchResult = await (0, user_profile_actions_1.sendUserMatch)(Number(userPreview.id));
        if (typeof sendUserMatchResult === 'object' && "error" in sendUserMatchResult) {
            alert('An error occurred while sending user match confirmation.');
            return;
        }
        setUserMatchStatus(sendUserMatchResult);
    };
    const passOnMatch = async () => {
        const muteResult = await (0, user_profile_actions_1.muteUser)(Number(userPreview.id));
    };
    return (<div className={"user-profile-preview-container" + (isInactive ? " inactive" : "")}>
            <div className="image-container">
                <a href={(0, util_1.userProfileLink)(userPreview)}>
                    <user_photo_display_1.default alt={userPreview.displayName} shape="rounded-square" imageUrl={userPreview.publicMainPhoto} croppedImageData={userPreview.mainPhotoCroppedImageData} width={210} height={210} gender={userPreview.gender}/>
                </a>
            </div>
            <div className="image-container-info-section">
                <div className="info-photo-count-container">
                    <div className="info-container">
                        <div className="display-name-container">
                            <a className="user-display-name" href={(0, util_1.userProfileLink)(userPreview)}>
                                {userPreview.displayName}
                            </a>
                            {userPreview.isOnline && <div className="online-lamp" title="Online now"></div>}
                        </div>
                        <div className="info-line age">Age: {userPreview.age}</div>
                        <div className="info-line location">Location: {userPreview.locationName}</div>
                        {type === 'like' && (<div className="info-line received-on">Received {userPreview.receivedLikeHumanized}</div>)}
                        <div className="info-line last-active">Last
                            Active {userPreview.lastActiveHumanized}</div>
                        {userPreview.theyLikedMe && (<div className="info-line they-liked-me">
                                <react_line_awesome_1.HeartIcon style={{ marginRight: '4px' }}/>
                                Liked you
                            </div>)}
                    </div>
                    <div className="photo-count-container">
                        <button className="photo-count" onClick={togglePhotoPopover} ref={buttonRef}>
                            <span className="count-value">{userPreview.numOfPhotos}</span>
                            <image_1.default className="camera-icon" width="20" height="20" alt="Camera" src="/images/camera.svg"/>
                        </button>
                        {showPhotoPopover && (<div className="photo-popover" ref={popoverRef}>
                                <div className="photo-grid">
                                    {userPreview.publicPhotos && userPreview.publicPhotos.map((photo, index) => (<div key={index} className="photo-grid-item" onClick={() => openImageViewer(index)}>
                                            <user_photo_display_1.default alt={`${userPreview.displayName}'s photo ${index + 1}`} shape="square" imageUrl={photo.path} croppedImageData={photo.croppedImageData} width={64} height={64} gender={userPreview.gender}/>
                                        </div>))}
                                </div>
                            </div>)}
                    </div>
                </div>
                <div className="controls-container">
                    <div className="more-options-container">
                        <button className="more-options-button" onClick={toggleMoreOptionsPopover} ref={moreOptionsButtonRef}>
                            <span className="light-dark">
                                <span className="light">
                                    <image_1.default width="35" height="35" alt="More" src="/images/circle-ellipse.svg"/>
                                </span>
                                <span className="dark">
                                    <image_1.default width="35" height="35" alt="More" src="/images/circle-ellipse-dark.svg"/>
                                </span>
                            </span>
                        </button>
                        {showMoreOptionsPopover && (<div className="more-options-popover" ref={moreOptionsPopoverRef}>
                                <h4>More Options</h4>
                                <a href={(0, util_1.userProfileLink)(userPreview)}><react_line_awesome_1.UserCircleIcon /> View Profile</a>
                                {type === 'search' && <>
                                    {userMatchStatus === 'matched' ?
                    <a href=""><react_line_awesome_1.CommentsIcon /> Send Message</a> :
                    <button onClick={handleLike}>
                                            {userPreview.theyLikedMe ?
                            <><react_line_awesome_1.HeartIcon /> Accept Match</> :
                            userMatchStatus === 'pending' ?
                                <><react_line_awesome_1.HeartBrokenIcon /> Remove Like</> :
                                <><react_line_awesome_1.HeartIcon /> Like</>}
                                        </button>}
                                </>}
                                <button onClick={handleBlock}>{blockedThem ? <><react_line_awesome_1.UnlockIcon /> Unblock</> : <><react_line_awesome_1.BanIcon /> Block</>}</button>
                                <button onClick={handleReport}><react_line_awesome_1.ExclamationTriangleIcon /> Report</button>
                            </div>)}
                    </div>
                    <div className="action-buttons-container">
                        {type === 'search' ?
            (userMatchStatus !== 'matched' ?
                <button className={"like-button" + (userMatchStatus === 'pending' && !userPreview.theyLikedMe ? " liked" : "")} title={userPreview.theyLikedMe ? "Accept Match" : userMatchStatus === 'pending' ? "Remove Like" : "Like"} onClick={async () => {
                        if (userMatchStatus === 'pending' && !userPreview.theyLikedMe) {
                            await (0, user_profile_actions_1.removeUserMatch)(Number(userPreview.id));
                            setUserMatchStatus(undefined);
                        }
                        else {
                            const sendUserMatchResult = await (0, user_profile_actions_1.sendUserMatch)(Number(userPreview.id));
                            if (typeof sendUserMatchResult === 'object' && "error" in sendUserMatchResult) {
                                alert(sendUserMatchResult.error);
                                return;
                            }
                            setUserMatchStatus(sendUserMatchResult);
                        }
                    }}><react_line_awesome_1.HeartIcon /></button> : <a className="message-link" href=""><react_line_awesome_1.CommentsIcon /></a>) :
            <div className="match-buttons">
                                <button onClick={async () => {
                    await confirmMatch();
                    if (onCallToRefresh) {
                        await onCallToRefresh();
                    }
                }} title="Confirm Match" className="like">
                                    <react_line_awesome_1.HeartIcon />
                                </button>
                                <button onClick={async () => {
                    await passOnMatch();
                    if (onCallToRefresh) {
                        await onCallToRefresh();
                    }
                }} title="Pass" className="pass">
                                    <react_line_awesome_1.TimesIcon />
                                </button>
                            </div>}
                    </div>
                </div>
            </div>

            {/* Full-screen Image Viewer */}
            {showImageViewer && userPreview.photos && userPreview.photos.length > 0 && (<div className="image-viewer-overlay" ref={imageViewerRef}>
                    <div className="image-viewer-content">
                        <div className="image-viewer-nav image-viewer-prev" onClick={(e) => navigateImage('prev', e)}>
                            <react_line_awesome_2.AngleLeftIcon />
                        </div>
                        <div className="image-viewer-image-wrapper">
                            <div className="image-viewer-image-container">
                                <img src={((_b = (_a = userPreview.publicPhotos) === null || _a === void 0 ? void 0 : _a[currentImageIndex].croppedImageData) === null || _b === void 0 ? void 0 : _b.croppedImagePath) ||
                ((_c = userPreview.publicPhotos) === null || _c === void 0 ? void 0 : _c[currentImageIndex].path)} alt={`${userPreview.displayName}'s photo ${currentImageIndex + 1}`} className="image-viewer-image"/>
                            </div>
                            {((_d = userPreview.publicPhotos) === null || _d === void 0 ? void 0 : _d[currentImageIndex].caption) && (<div className="image-viewer-caption">
                                    {lodash_1.default.truncate((_e = userPreview.publicPhotos) === null || _e === void 0 ? void 0 : _e[currentImageIndex].caption, { length: 180 })}
                                </div>)}
                        </div>
                        <div className="image-viewer-nav image-viewer-next" onClick={(e) => navigateImage('next', e)}>
                            <react_line_awesome_2.AngleRightIcon />
                        </div>
                    </div>
                </div>)}
        </div>);
}
//# sourceMappingURL=user-profile-preview.jsx.map