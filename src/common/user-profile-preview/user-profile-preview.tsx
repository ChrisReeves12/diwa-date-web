import './user-profile-preview.scss';

import { UserPreview } from "@/types/user-preview.interface";
import UserPhotoDisplay from "@/common/user-photo-display/user-photo-display";
import { humanizeTimeDiff, userProfileLink } from "@/util";
import Image from "next/image";
import { BanIcon, CommentsIcon, ExclamationTriangleIcon, HeartBrokenIcon, HeartIcon, TimesIcon, UnlockIcon, UserCircleIcon } from "react-line-awesome";
import { useState, useRef, useEffect, useCallback } from "react";
import { UserPhoto } from "@/types/user-photo.type";
import { AngleLeftIcon, AngleRightIcon } from "react-line-awesome";
import { removeUserMatch, sendUserMatch, blockUserAction, unBlockUserAction } from '../server-actions/user-profile.actions';
import _ from 'lodash';

export default function UserProfilePreview({ userPreview, type, isInactive = false }: { userPreview: UserPreview, type: 'search' | 'like', isInactive?: boolean }) {
    const [showPhotoPopover, setShowPhotoPopover] = useState(false);
    const [showMoreOptionsPopover, setShowMoreOptionsPopover] = useState(false);
    const [showImageViewer, setShowImageViewer] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [userMatchStatus, setUserMatchStatus] = useState<string | undefined>(userPreview.matchStatus);
    const [blockedThem, setBlockedThem] = useState<boolean | undefined>(userPreview.blockedThem);
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
        setShowPhotoPopover(!showPhotoPopover);
        if (showMoreOptionsPopover) setShowMoreOptionsPopover(false);
    };

    const toggleMoreOptionsPopover = () => {
        setShowMoreOptionsPopover(!showMoreOptionsPopover);
        if (showPhotoPopover) setShowPhotoPopover(false);
    };

    const handleLike = async () => {
        if (userMatchStatus === 'pending' && !userPreview.theyLikedMe) {
            await removeUserMatch(Number(userPreview.id));
            setUserMatchStatus(undefined);
        } else {
            const sendUserMatchResult = await sendUserMatch(Number(userPreview.id));
            if (typeof sendUserMatchResult === 'object' && "error" in sendUserMatchResult) {
                alert(sendUserMatchResult.error);
                return;
            }

            setUserMatchStatus(sendUserMatchResult);
        }
    };

    const handleBlock = async () => {
        if (blockedThem) {
            await unBlockUserAction(Number(userPreview.id));
            setBlockedThem(false);
        } else {
            await blockUserAction(Number(userPreview.id));
            setBlockedThem(true);
        }
    };

    const handleReport = () => {
        console.log("Reported user:", userPreview.id);
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

    return (
        <div className={"user-profile-preview-container" + (isInactive ? " inactive" : "")}>
            <div className="image-container">
                <a href={userProfileLink(userPreview)}>
                    <UserPhotoDisplay
                        alt={userPreview.displayName}
                        shape="rounded-square"
                        imageUrl={userPreview.publicMainPhoto}
                        croppedImageData={userPreview.mainPhotoCroppedImageData}
                        width={210}
                        height={210}
                        gender={userPreview.gender} />
                </a>
            </div>
            <div className="image-container-info-section">
                <div className="info-photo-count-container">
                    <div className="info-container">
                        <a className="user-display-name" href={userProfileLink(userPreview)}>
                            {userPreview.displayName}
                        </a>
                        <div className="info-line age">Age: {userPreview.age}</div>
                        <div className="info-line location">Location: {userPreview.locationName}</div>
                        <div className="info-line last-active">Last
                            Active {humanizeTimeDiff(userPreview.lastActiveAt)}</div>
                        {userPreview.theyLikedMe && (
                            <div className="info-line they-liked-me">
                                <HeartIcon style={{ marginRight: '4px' }} />
                                Liked you
                            </div>
                        )}
                    </div>
                    <div className="photo-count-container">
                        <button
                            className="photo-count"
                            onClick={togglePhotoPopover}
                            ref={buttonRef}>
                            <span className="count-value">{userPreview.numOfPhotos}</span>
                            <Image className="camera-icon" width="20" height="20" alt="Camera" src="/images/camera.svg" />
                        </button>
                        {showPhotoPopover && (
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
                    </div>
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
                        {showMoreOptionsPopover && (
                            <div className="more-options-popover" ref={moreOptionsPopoverRef}>
                                <h4>More Options</h4>
                                <a href={userProfileLink(userPreview)}><UserCircleIcon /> View Profile</a>
                                {userMatchStatus === 'matched' ?
                                    <a href=""><CommentsIcon /> Send Message</a> :
                                    <button onClick={handleLike}>
                                        {userPreview.theyLikedMe ?
                                            <><HeartIcon /> Accept Match</> :
                                            userMatchStatus === 'pending' ?
                                                <><HeartBrokenIcon /> Remove Like</> :
                                                <><HeartIcon /> Like</>}
                                    </button>
                                }
                                <button onClick={handleBlock}>{blockedThem ? <><UnlockIcon /> Unblock</> : <><BanIcon /> Block</>}</button>
                                <button onClick={handleReport}><ExclamationTriangleIcon /> Report</button>
                            </div>
                        )}
                    </div>
                    <div className="action-buttons-container">
                        {type === 'search' ?
                            (userMatchStatus !== 'matched' ?
                                <button
                                    className={"like-button" + (userMatchStatus === 'pending' && !userPreview.theyLikedMe ? " liked" : "")}
                                    title={userPreview.theyLikedMe ? "Accept Match" : userMatchStatus === 'pending' ? "Remove Like" : "Like"}
                                    onClick={async () => {
                                        if (userMatchStatus === 'pending' && !userPreview.theyLikedMe) {
                                            await removeUserMatch(Number(userPreview.id));
                                            setUserMatchStatus(undefined);
                                        } else {
                                            const sendUserMatchResult = await sendUserMatch(Number(userPreview.id));
                                            if (typeof sendUserMatchResult === 'object' && "error" in sendUserMatchResult) {
                                                alert(sendUserMatchResult.error);
                                                return;
                                            }

                                            setUserMatchStatus(sendUserMatchResult);
                                        }
                                    }}><HeartIcon /></button> : <a className="message-link" href=""><CommentsIcon /></a>
                            ) :
                            <div className="match-buttons">
                                <button title="Like" className="like">
                                    <HeartIcon />
                                </button>
                                <button title="Pass" className="pass">
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
                                    src={userPreview.publicPhotos?.[currentImageIndex].croppedImageData?.croppedImagePath ||
                                        userPreview.publicPhotos?.[currentImageIndex].path}
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
        </div>
    );
}
