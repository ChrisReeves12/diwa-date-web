import './user-profile-preview.scss';

import { UserPreview } from "@/types/user-preview.interface";
import UserPhotoDisplay from "@/common/user-photo-display/user-photo-display";
import { userProfileLink, showAlert } from "@/util";
import Image from "next/image";
import {
    BanIcon,
    CommentsIcon,
    ExclamationTriangleIcon,
    HeartBrokenIcon,
    HeartIcon,
    TimesIcon,
    UnlockIcon,
    UserCircleIcon,
} from "react-line-awesome";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { UserPhoto } from "@/types/user-photo.type";
import { AngleLeftIcon, AngleRightIcon } from "react-line-awesome";
import { removeUserMatch, sendUserMatch, blockUserAction, unBlockUserAction, muteUser } from '../server-actions/user-profile.actions';
import _ from 'lodash';
import ReportUserDialog from '../report-user-dialog/report-user-dialog';
import Link from "next/link";
import { CircularProgress } from "@mui/material";
import { TbDiamond } from "react-icons/tb";

interface UserProfilePreviewProps {
    userPreview: UserPreview,
    type: 'search' | 'like',
    isInactive?: boolean,
    onCallToRefresh?: () => Promise<void>
}

export default function UserProfilePreview({ userPreview, type, onCallToRefresh, isInactive = false }: UserProfilePreviewProps) {
    const [showPhotoPopover, setShowPhotoPopover] = useState(false);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [showMoreOptionsModal, setShowMoreOptionsModal] = useState(false);
    const [showMoreOptionsPopover, setShowMoreOptionsPopover] = useState(false);
    const [showImageViewer, setShowImageViewer] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [userMatchStatus, setUserMatchStatus] = useState<string | undefined>(userPreview.matchStatus);
    const [blockedThem, setBlockedThem] = useState<boolean | undefined>(userPreview.blockedThem);
    const [showReportDialog, setShowReportDialog] = useState(false);
    const [isLikeLoading, setIsLikeLoading] = useState(false);
    const [isBlockLoading, setIsBlockLoading] = useState(false);
    const innerWidth = window.innerWidth;
    const popoverRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const moreOptionsPopoverRef = useRef<HTMLDivElement>(null);
    const moreOptionsButtonRef = useRef<HTMLButtonElement>(null);
    const imageViewerRef = useRef<HTMLDivElement>(null);

    // Close popovers when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (popoverRef.current && buttonRef.current &&
                !popoverRef.current.contains(event.target as Node) &&
                !buttonRef.current.contains(event.target as Node)) {
                setShowPhotoPopover(false);
            }

            if (moreOptionsPopoverRef.current && moreOptionsButtonRef.current &&
                !moreOptionsPopoverRef.current.contains(event.target as Node) &&
                !moreOptionsButtonRef.current.contains(event.target as Node)) {
                setShowMoreOptionsPopover(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Handle image viewer click to close
    useEffect(() => {
        function handleImageViewerClick(event: MouseEvent) {
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
        if (innerWidth <= 768) {
            setShowPhotoModal(!showPhotoModal);
        } else {
            setShowPhotoPopover(!showPhotoPopover);
        }
        if (showMoreOptionsPopover) setShowMoreOptionsPopover(false);
    };

    const toggleMoreOptionsPopover = () => {
        if (innerWidth <= 768) {
            setShowMoreOptionsModal(!showMoreOptionsModal);
        } else {
            setShowMoreOptionsPopover(!showMoreOptionsPopover);
        }
        if (showPhotoPopover || showPhotoModal) {
            setShowPhotoPopover(false);
            setShowPhotoModal(false);
        }
    };

    const handleLike = async () => {
        setIsLikeLoading(true);

        setTimeout(async () => {
            if (userMatchStatus === 'pending' && !userPreview.theyLikedMe) {
                await removeUserMatch(Number(userPreview.id));
                setUserMatchStatus(undefined);
            } else {
                const sendUserMatchResult = await sendUserMatch(Number(userPreview.id));
                if (typeof sendUserMatchResult === 'object' && "error" in sendUserMatchResult) {
                    showAlert(sendUserMatchResult.error);
                    return;
                }

                setUserMatchStatus(sendUserMatchResult);
            }

            window.dispatchEvent(new CustomEvent('notification-center-refresh'));
            setIsLikeLoading(false);
        }, 500);
    };

    const handleBlock = async () => {
        setIsBlockLoading(true);

        setTimeout(async () => {
            try {
                if (blockedThem) {
                    await unBlockUserAction(Number(userPreview.id));
                    setBlockedThem(false);
                } else {
                    await blockUserAction(Number(userPreview.id));
                    setBlockedThem(true);
                }

                window.dispatchEvent(new CustomEvent('notification-center-refresh'));
            } finally {
                setIsBlockLoading(false);
            }
        }, 500);
    };

    const handleReport = () => {
        setShowMoreOptionsPopover(false);
        setShowReportDialog(true);
    };

    const openImageViewer = (index: number) => {
        setCurrentImageIndex(index);
        setShowImageViewer(true);
    };

    const navigateImage = useCallback((direction: 'prev' | 'next', event: React.MouseEvent) => {
        event.stopPropagation();

        if (!userPreview.photos) return;

        if (direction === 'prev') {
            setCurrentImageIndex(prev =>
                prev === 0 ? userPreview.photos!.length - 1 : prev - 1
            );
        } else {
            setCurrentImageIndex(prev =>
                prev === userPreview.photos!.length - 1 ? 0 : prev + 1
            );
        }
    }, [userPreview.photos]);

    // Handle keyboard navigation with arrow keys
    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (!showImageViewer) return;

            if (event.key === 'ArrowLeft') {
                navigateImage('prev', event as unknown as React.MouseEvent);
            } else if (event.key === 'ArrowRight') {
                navigateImage('next', event as unknown as React.MouseEvent);
            } else if (event.key === 'Escape') {
                setShowImageViewer(false);
            }
        }

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [showImageViewer, userPreview.photos, navigateImage]);

    const confirmMatch = async () => {
        const sendUserMatchResult = await sendUserMatch(Number(userPreview.id));
        if (typeof sendUserMatchResult === 'object' && "error" in sendUserMatchResult) {
            showAlert(sendUserMatchResult.error);
            return;
        }

        setUserMatchStatus(sendUserMatchResult);
        window.dispatchEvent(new CustomEvent('notification-center-refresh'));
    }

    const passOnMatch = async () => {
        await muteUser(Number(userPreview.id));
        window.dispatchEvent(new CustomEvent('notification-center-refresh'));
    }

    // Calculate user image size
    let userImgSize = 210;
    if (innerWidth <= 768) {
        userImgSize = 128;
    }

    return (
        <div className={"user-profile-preview-container" + (isInactive ? " inactive" : "")}>
            <div className="image-container">
                <a href={userProfileLink(userPreview)}>
                    <UserPhotoDisplay
                        alt={userPreview.displayName}
                        shape="rounded-square"
                        imageUrl={userPreview.publicMainPhoto}
                        croppedImageData={userPreview.mainPhotoCroppedImageData}
                        width={userImgSize}
                        height={userImgSize}
                        gender={userPreview.gender} />
                </a>
            </div>
            <div className="image-container-info-section">
                <div className="info-photo-count-container">
                    <div className="info-container">
                        <div className="display-name-container">
                            <a className="user-display-name" href={userProfileLink(userPreview)}>
                                {_.truncate(userPreview.displayName, { length: 18 })}
                            </a>
                            {userPreview.isPremium && (
                                <div className="premium-badge" title="Premium Member">
                                    <TbDiamond size={16} />
                                </div>
                            )}
                            {userPreview.isOnline && <div className="online-lamp" title="Online now"></div>}
                        </div>
                        <div className="info-line age"><strong>Age:</strong> {userPreview.age}</div>
                        <div className="info-line location"><strong>Location:</strong> {_.truncate(userPreview.locationName, { length: 30 })}</div>
                        {type === 'like' && (
                            <div className="info-line received-on"><strong>Received:</strong> {userPreview.receivedLikeHumanized}</div>
                        )}
                        {/*<div className="info-line last-active"><strong>Last*/}
                        {/*    Active:</strong> {userPreview.lastActiveHumanized}</div>*/}
                        {userPreview.theyLikedMe && (
                            <div className="info-line they-liked-me">
                                <HeartIcon style={{ marginRight: '4px' }} />
                                Liked you
                            </div>
                        )}
                        {userPreview.isPremium &&
                            <div className="info-line premium-label">Premium Member</div>}
                    </div>
                    {(userPreview.publicPhotos || []).length > 0 &&
                        <div className="photo-count-container">
                            <button
                                className="photo-count"
                                onClick={togglePhotoPopover}
                                ref={buttonRef}>
                                <span className="count-value">{userPreview.numOfPhotos}</span>
                                <Image className="camera-icon" width="20" height="20" alt="Camera" src="/images/camera.svg" />
                            </button>
                            {showPhotoPopover && innerWidth > 768 && (
                                <div className="photo-popover" ref={popoverRef}>
                                    <div className="photo-grid">
                                        {userPreview.publicPhotos && userPreview.publicPhotos.map((photo: UserPhoto, index: number) => (
                                            <div
                                                key={index}
                                                className="photo-grid-item"
                                                onClick={() => openImageViewer(index)}>
                                                <UserPhotoDisplay
                                                    alt={`${userPreview.displayName}'s photo ${index + 1}`}
                                                    shape="square"
                                                    imageUrl={photo.path}
                                                    croppedImageData={photo.croppedImageData}
                                                    width={64}
                                                    height={64}
                                                    gender={userPreview.gender}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>}
                </div>
                <div className="controls-container">
                    <div className="more-options-container">
                        <button
                            className="more-options-button"
                            onClick={toggleMoreOptionsPopover}
                            ref={moreOptionsButtonRef}>
                            <span className="light-dark">
                                <span className="light">
                                    <Image
                                        width="35" height="35" alt="More"
                                        src="/images/circle-ellipse.svg" />
                                </span>
                                <span className="dark">
                                    <Image width="35" height="35" alt="More"
                                        src="/images/circle-ellipse-dark.svg" />
                                </span>
                            </span>
                        </button>
                        {showMoreOptionsPopover && innerWidth > 768 && (
                            <div className="more-options-popover" ref={moreOptionsPopoverRef}>
                                <h4>More Options</h4>
                                <a href={userProfileLink(userPreview)}><UserCircleIcon /> View Profile</a>
                                {type === 'search' && <>
                                    {userMatchStatus === 'matched' ?
                                        <a href=""><CommentsIcon /> Send Message</a> :
                                        (isLikeLoading ?
                                            <div style={{ paddingLeft: 20, paddingTop: 5, paddingBottom: 5 }}>
                                                <CircularProgress size={20} sx={{ color: "primary.light" }} />
                                            </div> :
                                            <button onClick={handleLike}>
                                                {userPreview.theyLikedMe ?
                                                    <><HeartIcon /> Accept Match</> :
                                                    userMatchStatus === 'pending' ?
                                                        <><HeartBrokenIcon /> Remove Like</> :
                                                        <><HeartIcon /> Like</>}
                                            </button>)
                                    }
                                </>}
                                {isBlockLoading ? (
                                    <div style={{ paddingLeft: 20, paddingTop: 5, paddingBottom: 5 }}>
                                        <CircularProgress size={20} sx={{ color: "primary.light" }} />
                                    </div>
                                ) : (
                                    <button onClick={handleBlock}>{blockedThem ? <><UnlockIcon /> Unblock</> : <><BanIcon /> Block</>}</button>
                                )}
                                <button onClick={handleReport}><ExclamationTriangleIcon /> Report</button>
                            </div>
                        )}
                    </div>
                    <div className="action-buttons-container">
                        {type === 'search' ?
                            (userMatchStatus !== 'matched' ?
                                (isLikeLoading ? <CircularProgress size={24} sx={{ color: "primary.light" }} /> : <button
                                    className={"like-button" + (userMatchStatus === 'pending' && !userPreview.theyLikedMe ? " liked" : "")}
                                    title={userPreview.theyLikedMe ? "Accept Match" : userMatchStatus === 'pending' ? "Remove Like" : "Like"}
                                    onClick={async () => {
                                        setIsLikeLoading(true);

                                        setTimeout(async () => {
                                            if (userMatchStatus === 'pending' && !userPreview.theyLikedMe) {
                                                await removeUserMatch(Number(userPreview.id));
                                                setUserMatchStatus(undefined);
                                            } else {
                                                const sendUserMatchResult = await sendUserMatch(Number(userPreview.id));
                                                if (typeof sendUserMatchResult === 'object' && "error" in sendUserMatchResult) {
                                                    showAlert(sendUserMatchResult.error);
                                                    return;
                                                }

                                                setUserMatchStatus(sendUserMatchResult);
                                            }

                                            window.dispatchEvent(new CustomEvent('notification-center-refresh'));
                                            setIsLikeLoading(false);
                                        }, 500);
                                    }}>
                                    <HeartIcon /></button>) : <Link className="message-link" href={`/messages/${userPreview.matchId}`}><CommentsIcon /></Link>
                            ) :
                            <div className="match-buttons">
                                <button onClick={async () => {
                                    await confirmMatch();

                                    if (onCallToRefresh) {
                                        await onCallToRefresh();
                                    }
                                }} title="Confirm Match" className="like">
                                    <HeartIcon />
                                </button>
                                <button onClick={async () => {
                                    await passOnMatch();

                                    if (onCallToRefresh) {
                                        await onCallToRefresh();
                                    }
                                }} title="Pass" className="pass">
                                    <TimesIcon />
                                </button>
                            </div>}
                    </div>
                </div>
            </div>

            {/* Full-screen Image Viewer */}
            {showImageViewer && userPreview.photos && userPreview.photos.length > 0 && (
                <div className="image-viewer-overlay" ref={imageViewerRef}>
                    <div className="image-viewer-content">
                        <div className="image-viewer-nav image-viewer-prev"
                            onClick={(e) => navigateImage('prev', e)}>
                            <AngleLeftIcon />
                        </div>
                        <div className="image-viewer-image-wrapper">
                            <div className="image-viewer-image-container">
                                <img
                                    src={userPreview.publicPhotos?.[currentImageIndex].path}
                                    alt={`${userPreview.displayName}'s photo ${currentImageIndex + 1}`}
                                    className="image-viewer-image"
                                />
                            </div>
                            {userPreview.publicPhotos?.[currentImageIndex].caption && (
                                <div className="image-viewer-caption">
                                    {_.truncate(userPreview.publicPhotos?.[currentImageIndex].caption, { length: 180 })}
                                </div>
                            )}
                        </div>
                        <div
                            className="image-viewer-nav image-viewer-next"
                            onClick={(e) => navigateImage('next', e)}>
                            <AngleRightIcon />
                        </div>
                    </div>
                </div>
            )}

            {/* Photo Grid Modal for Mobile */}
            {showPhotoModal && innerWidth <= 768 && (
                <div className="photo-modal-overlay" onClick={() => setShowPhotoModal(false)}>
                    <div className="photo-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="photo-modal-header">
                            <h3>{userPreview.displayName}&apos;s Photos</h3>
                            <button
                                className="photo-modal-close"
                                onClick={() => setShowPhotoModal(false)}
                            >
                                <TimesIcon />
                            </button>
                        </div>
                        <div className="photo-modal-grid">
                            {userPreview.publicPhotos && userPreview.publicPhotos.map((photo: UserPhoto, index: number) => (
                                <div
                                    key={index}
                                    className="photo-modal-grid-item"
                                    onClick={() => {
                                        setShowPhotoModal(false);
                                        openImageViewer(index);
                                    }}>
                                    <UserPhotoDisplay
                                        alt={`${userPreview.displayName}'s photo ${index + 1}`}
                                        shape="square"
                                        imageUrl={photo.path}
                                        croppedImageData={photo.croppedImageData}
                                        width={120}
                                        height={120}
                                        gender={userPreview.gender}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* More Options Modal for Mobile */}
            {showMoreOptionsModal && innerWidth <= 768 && (
                <div className="more-options-modal-overlay" onClick={() => setShowMoreOptionsModal(false)}>
                    <div className="more-options-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="more-options-modal-header">
                            <h3>More Options</h3>
                            <button
                                className="more-options-modal-close"
                                onClick={() => setShowMoreOptionsModal(false)}
                            >
                                <TimesIcon />
                            </button>
                        </div>
                        <div className="more-options-modal-body">
                            <a href={userProfileLink(userPreview)} className="more-options-modal-item">
                                <UserCircleIcon /> View Profile
                            </a>
                            {type === 'search' && <>
                                {userMatchStatus === 'matched' ?
                                    <a href="" className="more-options-modal-item">
                                        <CommentsIcon /> Send Message
                                    </a> :
                                    (isLikeLoading ?
                                        <div className="more-options-modal-loading">
                                            <CircularProgress size={20} sx={{ color: "primary.light" }} />
                                        </div> :
                                        <button
                                            onClick={() => {
                                                setShowMoreOptionsModal(false);
                                                handleLike();
                                            }}
                                            className="more-options-modal-item"
                                        >
                                            {userPreview.theyLikedMe ?
                                                <><HeartIcon /> Accept Match</> :
                                                userMatchStatus === 'pending' ?
                                                    <><HeartBrokenIcon /> Remove Like</> :
                                                    <><HeartIcon /> Like</>}
                                        </button>)
                                }
                            </>}
                            {isBlockLoading ? (
                                <div className="more-options-modal-loading">
                                    <CircularProgress size={20} sx={{ color: "primary.light" }} />
                                </div>
                            ) : (
                                <button
                                    onClick={() => {
                                        setShowMoreOptionsModal(false);
                                        handleBlock();
                                    }}
                                    className="more-options-modal-item"
                                >
                                    {blockedThem ? <><UnlockIcon /> Unblock</> : <><BanIcon /> Block</>}
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setShowMoreOptionsModal(false);
                                    handleReport();
                                }}
                                className="more-options-modal-item"
                            >
                                <ExclamationTriangleIcon /> Report
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Report User Dialog */}
            <ReportUserDialog
                isOpen={showReportDialog}
                onClose={() => setShowReportDialog(false)}
                userId={Number(userPreview.id)}
                userName={userPreview.displayName}
                onSuccess={onCallToRefresh}
            />
        </div>
    );
}
