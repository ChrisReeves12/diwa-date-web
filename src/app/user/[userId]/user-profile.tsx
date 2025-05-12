'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { User } from "@/types";
import { NotificationCenterData } from "@/types/notification-center-data.interface";
import { CurrentUserProvider } from "@/common/context/current-user-context";
import SiteTopBar from "@/common/site-top-bar/site-top-bar";
import UserPhotoDisplay from "@/common/user-photo-display/user-photo-display";
import { UserPhoto } from "@/types/user-photo.type";
import Link from 'next/link';
import { humanizeTimeDiff } from '@/util';
import {
    AngleLeftIcon,
    AngleRightIcon, BanIcon,
    CheckCircleIcon,
    CommentsIcon, ExclamationTriangleIcon,
    EyeSlashIcon, HeartBrokenIcon,
    HeartIcon, ImageIcon, MapMarkerIcon, StarIcon, UnlockIcon, UserCircleIcon
} from "react-line-awesome";
import _ from 'lodash';
import { UserProfileDetail } from "@/types/user-profile-detail.interface";
import UserSubscriptionPlanDisplay from '@/common/user-subscription-plan-display/user-subscription-plan-display';
import {
    removeUserMatch,
    sendUserMatch,
    blockUserAction,
    unBlockUserAction,
    muteUser, unMuteUser, loadFullUserProfile
} from '@/common/server-actions/user-profile.actions';

interface UserProfileProps {
    userProfileDetail: UserProfileDetail,
    currentUser: User,
    notificationsPromise: Promise<NotificationCenterData>
}

export default function UserProfile({ notificationsPromise, userProfileDetail, currentUser }: UserProfileProps) {
    const [userProfile, setUserProfile] = useState<UserProfileDetail>(userProfileDetail);

    const [isUpdatingMatch, setIsUpdatingMatch] = useState(false);
    const [isBlockingOrUnBlocking, setIsBlockingOrUnBlocking] = useState(false);
    const [showImageViewer, setShowImageViewer] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const imageViewerRef = useRef<HTMLDivElement>(null);

    const onPhotoView = (e: React.MouseEvent, idx: number) => {
        if (e) e.preventDefault();
        if (userProfile.user.public_photos) {
            setCurrentImageIndex(idx);
            setShowImageViewer(true);
        }
    };

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

    const navigateImage = useCallback((direction: 'prev' | 'next', event: React.MouseEvent) => {
        event.stopPropagation();

        if (!userProfile.user.public_photos) return;

        if (direction === 'prev') {
            setCurrentImageIndex(prev =>
                prev === 0 ? userProfile.user.public_photos!.length - 1 : prev - 1
            );
        } else {
            setCurrentImageIndex(prev =>
                prev === userProfile.user.public_photos!.length - 1 ? 0 : prev + 1
            );
        }
    }, [userProfile.user.public_photos]);

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
    }, [showImageViewer, userProfile.user.public_photos, navigateImage]);

    const onRequestMatchClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        setIsUpdatingMatch(true);
        try {
            const sendUserMatchResult = await sendUserMatch(Number(userProfile.user.id));
            if (typeof sendUserMatchResult === 'object' && 'error' in sendUserMatchResult) {
                alert(sendUserMatchResult.error);
                return;
            }

            await unMuteUser(Number(userProfile.user.id));

            const result = await loadFullUserProfile(Number(userProfile.user.id));
            if (result.error || !result.userProfileDetails) {
                alert(result.error || 'An error occurred sending update. Please try again later.');
                return;
            }

            setUserProfile(result.userProfileDetails);
        } catch (error) {
            console.error('Error sending match request:', error);
        } finally {
            setIsUpdatingMatch(false);
        }
    };

    const onCancelMatchClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        setIsUpdatingMatch(true);
        try {
            await removeUserMatch(Number(userProfile.user.id));
            const result = await loadFullUserProfile(Number(userProfile.user.id));
            if (result.error || !result.userProfileDetails) {
                alert(result.error || 'An error occurred sending update. Please try again later.');
                return;
            }

            setUserProfile(result.userProfileDetails);
        } catch (error) {
            console.error('Error canceling match request:', error);
        } finally {
            setIsUpdatingMatch(false);
        }
    };

    const onIgnoreMatchClick = async (e: React.MouseEvent) => {
        e.preventDefault();

        setIsUpdatingMatch(true);
        try {
            await muteUser(Number(userProfile.user.id));
            const result = await loadFullUserProfile(Number(userProfile.user.id));
            if (result.error || !result.userProfileDetails) {
                alert(result.error || 'An error occurred sending update. Please try again later.');
                return;
            }

            setUserProfile(result.userProfileDetails);
        } catch (error) {
            console.error('Error rejecting match request:', error);
        } finally {
            setIsUpdatingMatch(false);
        }
    };

    const onBlockUserClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        setIsBlockingOrUnBlocking(true);
        try {
            await blockUserAction(Number(userProfile.user.id));
            const result = await loadFullUserProfile(Number(userProfile.user.id));
            if (result.error || !result.userProfileDetails) {
                alert(result.error || 'An error occurred sending update. Please try again later.');
                return;
            }

            setUserProfile(result.userProfileDetails);
        } catch (error) {
            console.error('Error blocking user:', error);
        } finally {
            setIsBlockingOrUnBlocking(false);
        }
    };

    const onUnBlockUserClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        setIsBlockingOrUnBlocking(true);
        try {
            await unBlockUserAction(Number(userProfile.user.id));
            const result = await loadFullUserProfile(Number(userProfile.user.id));
            if (result.error || !result.userProfileDetails) {
                alert(result.error || 'An error occurred sending update. Please try again later.');
                return;
            }

            setUserProfile(result.userProfileDetails);
        } catch (error) {
            console.error('Error unblocking user:', error);
        } finally {
            setIsBlockingOrUnBlocking(false);
        }
    };

    return (
        <CurrentUserProvider currentUser={currentUser}>
            <SiteTopBar notificationsPromise={notificationsPromise} />
            <div className="user-profile-container">
                <div className="container">
                    {!userProfile ? (
                        <h2 className="profile-msg">User cannot be found.</h2>
                    ) : userProfile.they_blocked_me ? (
                        <h2 className="profile-msg">You have been blocked by this user.</h2>
                    ) : userProfile.suspended_at ? (
                        <h2 className="profile-msg">This user has been suspended.</h2>
                    ) : !userProfile ? (
                        <h2 className="profile-msg">User cannot be found.</h2>
                    ) : (
                        <div className="user-content-wrapper">
                            <UserSubscriptionPlanDisplay />

                            <div className="user-profile-info-section">
                                <a onClick={(e) => onPhotoView(e, 0)}>
                                    <UserPhotoDisplay
                                        alt={userProfile.user.display_name}
                                        croppedImageData={userProfile.user.main_photo_cropped_image_data}
                                        imageUrl={userProfile.user.public_main_photo}
                                        width={300}
                                        height={300}
                                        gender={userProfile.user.gender}
                                    />
                                </a>

                                <div className="user-basic-info-section">
                                    <h1 className="user-display-name">{userProfile.user.display_name}</h1>
                                    <h4 className="user-age">{userProfile.user.age} Year Old {userProfile.user.gender === 'male' ? 'Man' : 'Woman'}</h4>
                                    {userProfile.match_is_towards_me === true && userProfile.match_status === 'pending' ? (
                                        <h5 className="user-like-label">{userProfile.user.gender === 'male' ? 'He' : 'She'} Likes You</h5>
                                    ) : null}

                                    <div className="online-status-location-container">
                                        <div className="online-lamp-section">
                                            <div className="online-lamp online"></div>
                                            <div className="online-status-label">Online</div>
                                        </div>
                                        <div className="location-section">
                                            <MapMarkerIcon />
                                            <div className="location-name">{userProfile.user.location_name}</div>
                                        </div>
                                    </div>

                                    <div className="basic-info-buttons-container">
                                        <div className="basic-info-container">
                                            <div className="basic-info-line">
                                                <div className="label">Seeking:</div>
                                                <div className="value">{userProfile.seeking_label}</div>
                                            </div>
                                            <div className="basic-info-line">
                                                <div className="label">Marital Status:</div>
                                                <div className="value">{userProfile.marital_status_label}</div>
                                            </div>
                                            <div className="basic-info-line">
                                                <div className="label">Ethnicity:</div>
                                                <div className="value">{userProfile.ethnicity_label}</div>
                                            </div>
                                            <div className="basic-info-line">
                                                <div className="label">Height:</div>
                                                <div className="value">{userProfile.height_label}</div>
                                            </div>
                                            <div className="basic-info-line">
                                                <div className="label">Body Type:</div>
                                                <div className="value">{userProfile.body_type_label}</div>
                                            </div>
                                            <div className="basic-info-line">
                                                <div className="label">Religion:</div>
                                                <div className="value">{userProfile.religion_label}</div>
                                            </div>
                                            <div className="basic-info-line">
                                                <div className="label">Drinking:</div>
                                                <div className="value">{userProfile.drinking_label}</div>
                                            </div>
                                            <div className="basic-info-line">
                                                <div className="label">Smoking:</div>
                                                <div className="value">{userProfile.smoking_label}</div>
                                            </div>
                                            <div className="basic-info-line">
                                                <div className="label">Education:</div>
                                                <div className="value">{userProfile.education_label}</div>
                                            </div>
                                            <div className="basic-info-line">
                                                <div className="label">Has Children:</div>
                                                <div className="value">{userProfile.has_children_label}</div>
                                            </div>
                                            <div className="basic-info-line">
                                                <div className="label">Wants Children:</div>
                                                <div className="value">{userProfile.wants_children_label}</div>
                                            </div>
                                            <div className="basic-info-line">
                                                <div className="label">Last Active:</div>
                                                <div className="value">{humanizeTimeDiff(userProfile.user.last_active_at)}</div>
                                            </div>
                                        </div>

                                        <div className="buttons-container">
                                            {userProfile.match_status === 'pending' && !userProfile.match_is_towards_me ? (
                                                <button
                                                    disabled={isUpdatingMatch}
                                                    onClick={onCancelMatchClick}
                                                    className="request-match">
                                                    <HeartBrokenIcon />
                                                    <div className="label">Cancel Match Request</div>
                                                </button>
                                            ) : userProfile.match_status === 'pending' && userProfile.match_is_towards_me ? (
                                                <>
                                                    <button
                                                        disabled={isUpdatingMatch}
                                                        onClick={onRequestMatchClick}
                                                        className="request-match"
                                                    >
                                                        <HeartIcon />
                                                        <div className="label">Accept Match</div>
                                                    </button>
                                                    <button
                                                        disabled={isUpdatingMatch}
                                                        onClick={onIgnoreMatchClick}
                                                        className="reject-match"
                                                    >
                                                        <EyeSlashIcon/>
                                                        <div className="label">Ignore</div>
                                                    </button>
                                                </>
                                            ) : userProfile.match_status === 'matched' ? (
                                                <>
                                                    <div className="matched">
                                                        <CheckCircleIcon />
                                                        <div className="label">Matched</div>
                                                    </div>

                                                    {userProfile.match_id && (
                                                        <Link href={`/messages/${userProfile.match_id}`} className="request-match">
                                                            <CommentsIcon />
                                                            <div className="label">Send Message</div>
                                                        </Link>
                                                    )}
                                                </>
                                            ) : (
                                                <button
                                                    disabled={isUpdatingMatch}
                                                    onClick={onRequestMatchClick}
                                                    className="request-match"
                                                >
                                                    <HeartIcon />
                                                    <div className="label">Like</div>
                                                </button>
                                            )}

                                            <div className="cancel-block-button-container">
                                                {!userProfile.blocked_them ? (
                                                    <button
                                                        disabled={isBlockingOrUnBlocking}
                                                        onClick={onBlockUserClick}
                                                        className="block-user"
                                                    >
                                                        <BanIcon />
                                                        <div className="label">Block User</div>
                                                    </button>
                                                ) : (
                                                    <button
                                                        disabled={isBlockingOrUnBlocking}
                                                        onClick={onUnBlockUserClick}
                                                        className="block-user">
                                                        <UnlockIcon />
                                                        <div className="label">Unblock User</div>
                                                    </button>
                                                )}

                                                <button className="report-user">
                                                    <ExclamationTriangleIcon />
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
                                        <ImageIcon />
                                        <div className="title">Photos</div>
                                    </div>
                                    <div className="photos">
                                        {userProfile.user.public_photos?.map((photo: UserPhoto, idx: number) => (
                                            <a key={idx} onClick={(e) => onPhotoView(e, idx)} href="">
                                                <UserPhotoDisplay
                                                    imageUrl={photo.path}
                                                    alt={userProfile.user.display_name}
                                                    width={96}
                                                    height={96}
                                                    shape="square"
                                                    croppedImageData={photo.cropped_image_data}
                                                    gender={userProfile.user.gender}
                                                />
                                            </a>
                                        ))}
                                    </div>
                                </div>

                                <div className="information-container">
                                    <div className="section-title">
                                        <UserCircleIcon />
                                        <div className="title">Biography</div>
                                    </div>
                                    <div className="bio">{userProfile.user.bio || 'No biography available yet.'}</div>

                                    {userProfile.interest_labels?.length > 0 && (
                                        <>
                                            <div className="section-title">
                                                <StarIcon />
                                                <div className="title">Interests</div>
                                            </div>
                                            <div className="interests">
                                                {userProfile.interest_labels.map((interest: any, idx: number) => (
                                                    <div key={idx} className="interest-bubble">
                                                        <div className="bubble-container">
                                                            <div className="emoji">{interest.emoji}</div>
                                                            <div className="label">{interest.label}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Full-screen Image Viewer */}
                {showImageViewer && userProfile.user.public_photos && userProfile.user.public_photos.length > 0 && (
                    <div className="image-viewer-overlay" ref={imageViewerRef}>
                        <div className="image-viewer-content">
                            <div className="image-viewer-nav image-viewer-prev"
                                onClick={(e) => navigateImage('prev', e)}>
                                <AngleLeftIcon />
                            </div>
                            <div className="image-viewer-image-wrapper">
                                <div className="image-viewer-image-container">
                                    <img
                                        src={userProfile.user.public_photos[currentImageIndex].cropped_image_data?.cropped_image_path ||
                                            userProfile.user.public_photos[currentImageIndex].path}
                                        alt={`${userProfile.user.display_name}'s photo ${currentImageIndex + 1}`}
                                        className="image-viewer-image"
                                    />
                                </div>
                                {userProfile.user.public_photos[currentImageIndex].caption && (
                                    <div className="image-viewer-caption">
                                        {_.truncate(userProfile.user.public_photos[currentImageIndex].caption, { length: 180 })}
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
        </CurrentUserProvider>
    );
}

