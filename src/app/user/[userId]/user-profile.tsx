'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, filter, tap } from 'rxjs/operators';
import { User } from "@/types";
import { CurrentUserProvider } from "@/common/context/current-user-context";
import SiteTopBar from "@/common/site-top-bar/site-top-bar";
import UserPhotoDisplay from "@/common/user-photo-display/user-photo-display";
import { showAlert } from '@/util';
import { UserPhoto } from "@/types/user-photo.type";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    AngleLeftIcon,
    AngleRightIcon,
    BanIcon,
    CommentsIcon, ExclamationTriangleIcon,
    HeartBrokenIcon,
    HeartIcon, ImageIcon, InfoCircleIcon, MapMarkerIcon, StarIcon, TimesIcon, UnlockIcon, UserCircleIcon
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
import { useWebSocket } from '@/hooks/use-websocket';
import { isUserOnline } from '@/helpers/user.helpers';
import ReportUserDialog from '@/common/report-user-dialog/report-user-dialog';
import { CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { WebSocketMessage } from "../../../../types/websocket-events.types";
import { TbDiamond } from "react-icons/tb";
import { BsArrowLeft } from "react-icons/bs";

interface UserProfileProps {
    userProfileDetail: UserProfileDetail,
    currentUser: User
}

export default function UserProfile({ userProfileDetail, currentUser }: UserProfileProps) {
    const [userProfile, setUserProfile] = useState<UserProfileDetail>(userProfileDetail);

    const [isUpdatingMatch, setIsUpdatingMatch] = useState(false);
    const [isBlockingOrUnBlocking, setIsBlockingOrUnBlocking] = useState(false);
    const [showImageViewer, setShowImageViewer] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [showReportDialog, setShowReportDialog] = useState(false);
    const [showBioModal, setShowBioModal] = useState(false);
    const [showUnmatchDialog, setShowUnmatchDialog] = useState(false);
    const imageViewerRef = useRef<HTMLDivElement>(null);
    const profileDataFetchTrigger$ = useRef(new Subject<void>()).current;
    const profileDataFetchSubRef = useRef<Subscription | null>(null);
    const { on, isConnected } = useWebSocket();
    const router = useRouter();

    const refetchUserProfile = useCallback(async () => {
        try {
            const result = await loadFullUserProfile(Number(userProfile.user.id));
            if ('userProfileDetails' in result && result.userProfileDetails) {
                setUserProfile(result.userProfileDetails);

                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('notification-center-refresh'));
                }
            } else if ('error' in result) {
                console.error('Error refetching user profile:', result.error);
            } else {
                console.error('Unexpected response format from loadFullUserProfile:', result);
            }
        } catch (error) {
            console.error('Error refetching user profile:', error);
        }
    }, [userProfile.user.id]);

    const onPhotoView = (e: React.MouseEvent, idx: number) => {
        if (e) e.preventDefault();
        if (userProfile.user.publicPhotos) {
            setCurrentImageIndex(idx);
            setShowImageViewer(true);
        }
    };

    // Trigger refetching user profile data
    useEffect(() => {
        profileDataFetchSubRef.current = profileDataFetchTrigger$
            .pipe(debounceTime(300))
            .subscribe(() => {
                refetchUserProfile();
            });

        return () => {
            profileDataFetchSubRef.current?.unsubscribe();
            profileDataFetchSubRef.current = null;
        };
    }, [refetchUserProfile, profileDataFetchTrigger$]);

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

        if (!userProfile.user.publicPhotos) return;

        if (direction === 'prev') {
            setCurrentImageIndex(prev =>
                prev === 0 ? userProfile.user.publicPhotos!.length - 1 : prev - 1
            );
        } else {
            setCurrentImageIndex(prev =>
                prev === userProfile.user.publicPhotos!.length - 1 ? 0 : prev + 1
            );
        }
    }, [userProfile.user.publicPhotos]);

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
    }, [showImageViewer, userProfile.user.publicPhotos, navigateImage]);

    // Listen for real-time updates via WebSocket
    useEffect(() => {
        if (!isConnected || !currentUser) return;

        const debounceTimeMs = 300;
        const subscriptions = [
            on('match:notification')
                .pipe(
                    debounceTime(debounceTimeMs),
                    filter((data: WebSocketMessage) =>
                        ['match:new', 'match:cancel'].includes(data.eventLabel) &&
                        (data.eventLabel === 'match:new' ?
                            Number(data.payload.sender.id) === Number(userProfile.user.id) :
                            Number(data.payload.canceledBy) === Number(userProfile.user.id))
                    )
                )
                .subscribe(() => profileDataFetchTrigger$.next()),

            on('account:notification')
                .pipe(debounceTime(debounceTimeMs))
                .subscribe((data: WebSocketMessage) => {
                    if (
                        (data.eventLabel === 'account:blocked' && Number(data.payload.blockedBy) === Number(userProfile.user.id)
                            && Number(data.payload.blockedUserId) === Number(currentUser.id)) ||
                        (data.eventLabel === 'account:unblocked' && Number(data.payload.unblockedBy) === Number(userProfile.user.id) &&
                            Number(data.payload.unblockedUserId) === Number(currentUser.id))
                    ) {
                        setUserProfile(prev => ({
                            ...prev,
                            theyBlockedMe: data.eventLabel === 'account:blocked'
                        }));
                    }
                }),
        ];

        return () => {
            subscriptions.forEach(sub => sub.unsubscribe());
        };
    }, [isConnected, currentUser, on, refetchUserProfile, userProfile.user.id]);

    const onRequestMatchClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        setIsUpdatingMatch(true);

        setTimeout(async () => {
            try {
                const sendUserMatchResult = await sendUserMatch(Number(userProfile.user.id));
                if (typeof sendUserMatchResult === 'object' && 'error' in sendUserMatchResult) {
                    showAlert(sendUserMatchResult.error);
                    return;
                }

                await unMuteUser(Number(userProfile.user.id));

                // Refetch full user profile details
                profileDataFetchTrigger$.next();


            } catch (error) {
                console.error('Error sending match request:', error);
            } finally {
                setIsUpdatingMatch(false);
            }
        }, 500);
    };

    const onCancelMatchClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        setIsUpdatingMatch(true);

        setTimeout(async () => {
            try {
                await removeUserMatch(Number(userProfile.user.id));
                profileDataFetchTrigger$.next();
            } catch (error) {
                console.error('Error canceling match request:', error);
            } finally {
                setIsUpdatingMatch(false);
            }
        }, 500);
    };

    const onIgnoreMatchClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        setIsUpdatingMatch(true);

        setTimeout(async () => {
            try {
                await muteUser(Number(userProfile.user.id));
                profileDataFetchTrigger$.next();
            } catch (error) {
                console.error('Error rejecting match request:', error);
            } finally {
                setIsUpdatingMatch(false);
            }
        }, 500);
    };

    const onBlockUserClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        setIsBlockingOrUnBlocking(true);

        setTimeout(async () => {
            try {
                await blockUserAction(Number(userProfile.user.id));
                profileDataFetchTrigger$.next();
            } catch (error) {
                console.error('Error blocking user:', error);
            } finally {
                setIsBlockingOrUnBlocking(false);
            }
        }, 500);
    };

    const onUnBlockUserClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        setIsBlockingOrUnBlocking(true);

        setTimeout(async () => {
            try {
                await unBlockUserAction(Number(userProfile.user.id));
                profileDataFetchTrigger$.next();
            } catch (error) {
                console.error('Error unblocking user:', error);
            } finally {
                setIsBlockingOrUnBlocking(false);
            }
        }, 500);
    };

    const onUnMatchClick = (e: React.MouseEvent) => {
        e.preventDefault();
        setShowUnmatchDialog(true);
    };

    const handleUnmatch = async () => {
        setShowUnmatchDialog(false);
        setIsUpdatingMatch(true);

        setTimeout(async () => {
            try {
                await removeUserMatch(Number(userProfile.user.id));
                profileDataFetchTrigger$.next();
            } catch (error) {
                console.error('Error unmatching user:', error);
            } finally {
                setIsUpdatingMatch(false);
            }
        }, 500);
    };

    const onReportUserClick = (e: React.MouseEvent) => {
        e.preventDefault();
        setShowReportDialog(true);
    };

    const ButtonsContainer = ({ containerName }: { containerName: string }) => {
        return (
            <div className={containerName}>
                {userProfile.matchStatus === 'pending' && !userProfile.matchIsTowardsMe ? (
                    <button
                        disabled={isUpdatingMatch}
                        onClick={onCancelMatchClick}
                        className="request-match">
                        {isUpdatingMatch ? <CircularProgress size={20} sx={{ color: "primary.contrastText" }} /> : <>
                            <HeartBrokenIcon />
                            <div className="label">Cancel Match Request</div>
                        </>}
                    </button>
                ) : userProfile.matchStatus === 'pending' && userProfile.matchIsTowardsMe ? (
                    <>
                        <button
                            disabled={isUpdatingMatch}
                            onClick={onRequestMatchClick}
                            className="request-match"
                        >
                            {isUpdatingMatch ? <CircularProgress size={20} sx={{ color: "primary.contrastText" }} /> : <>
                                <HeartIcon />
                                <div className="label">Accept Match</div>
                            </>}
                        </button>
                        <button
                            disabled={isUpdatingMatch}
                            onClick={onIgnoreMatchClick}
                            className="reject-match"
                        >
                            {isUpdatingMatch ? <CircularProgress size={20} sx={{ color: "primary.contrastText" }} /> : <>
                                <TimesIcon />
                                <div className="label">Pass</div>
                            </>}
                        </button>
                    </>
                ) : userProfile.matchStatus === 'matched' ? (
                    <>
                        <button onClick={onUnMatchClick} className="unmatch">
                            <HeartBrokenIcon />
                            <div className="label">Remove Match</div>
                        </button>

                        {userProfile.matchId && (
                            <Link href={`/messages/${userProfile.matchId}`} className="request-match">
                                <CommentsIcon />
                                <div className="label">Send Message</div>
                            </Link>
                        )}
                    </>
                ) : (
                    <button
                        disabled={isUpdatingMatch}
                        onClick={onRequestMatchClick}
                        className="request-match">
                        {isUpdatingMatch ? <CircularProgress size={20} sx={{ color: "primary.contrastText" }} /> : <>
                            <HeartIcon />
                            <div className="label">Like</div>
                        </>}
                    </button>
                )}

                <div className="cancel-block-button-container">
                    {!userProfile.blockedThem ? (
                        <button
                            disabled={isBlockingOrUnBlocking}
                            onClick={onBlockUserClick}
                            className="block-user"
                        >
                            {isBlockingOrUnBlocking ? <CircularProgress size={20} sx={{ color: "primary.contrastText" }} /> : <>
                                <BanIcon />
                                <div className="label">Block User</div>
                            </>}
                        </button>
                    ) : (
                        <button
                            disabled={isBlockingOrUnBlocking}
                            onClick={onUnBlockUserClick}
                            className="block-user">
                            {isBlockingOrUnBlocking ? <CircularProgress size={20} sx={{ color: "primary.contrastText" }} /> : <>
                                <UnlockIcon />
                                <div className="label">Unblock User</div>
                            </>}
                        </button>
                    )}

                    <button
                        className="report-user"
                        onClick={onReportUserClick}
                    >
                        <ExclamationTriangleIcon />
                        <div className="label">Report User</div>
                    </button>
                </div>
            </div>
        )
    };

    const onReadMoreBio = (e: any) => {
        e.preventDefault();
        setShowBioModal(true);
    };

    const showReadMoreBio = (userProfile.user.bio || '').length > 450;

    return (
        <CurrentUserProvider currentUser={currentUser}>
            <SiteTopBar />
            <div className="user-profile-container">
                <div className="container">
                    {!userProfile ? (
                        <h2 className="profile-msg">User cannot be found.</h2>
                    ) : userProfile.theyBlockedMe ? (
                        <h2 className="profile-msg">You have been blocked by this user.</h2>
                    ) : userProfile.suspendedAt ? (
                        <h2 className="profile-msg">This user has been suspended.</h2>
                    ) : !userProfile ? (
                        <h2 className="profile-msg">User cannot be found.</h2>
                    ) : (
                        <div className="user-content-wrapper">
                            <UserSubscriptionPlanDisplay />
                            <button className='go-back' onClick={() => router.back()}>
                                <BsArrowLeft className='icon' />
                                <div className='label'>Back</div>
                            </button>

                            <div className="user-profile-info-section">
                                <a onClick={(e) => onPhotoView(e, 0)}>
                                    <UserPhotoDisplay
                                        alt={userProfile.user.displayName}
                                        croppedImageData={userProfile.user.mainPhotoCroppedImageData}
                                        imageUrl={userProfile.user.publicMainPhoto}
                                        width={300}
                                        height={300}
                                        gender={userProfile.user.gender}
                                    />
                                </a>

                                <div className="user-basic-info-section">
                                    <div className="display-name-container">
                                        <h1 className="user-display-name">{userProfile.user.displayName}</h1>
                                        {userProfile.user.isPremium && !userProfile.user.isFoundingMember && (
                                            <div className="premium-badge" title="Premium Member">
                                                <TbDiamond size={19} />
                                            </div>
                                        )}
                                    </div>
                                    <h4 className="user-age">{userProfile.user.age} Year Old {userProfile.user.gender === 'male' ? 'Man' : 'Woman'}</h4>
                                    {userProfile.user.isPremium && (
                                        <div className="premium-label">Premium Member</div>
                                    )}
                                    {userProfile.matchIsTowardsMe && userProfile.matchStatus === 'pending' ? (
                                        <h5 className="user-like-label">{userProfile.user.gender === 'male' ? 'He' : 'She'} Likes You</h5>
                                    ) : null}

                                    <div className="online-status-location-container">
                                        <div className="online-lamp-section">
                                            <div className={`online-lamp ${userProfile.user.lastActiveAt && isUserOnline(userProfile.user.lastActiveAt, userProfile.user.hideOnlineStatus) ? 'online' : 'offline'}`}></div>
                                            <div className="online-status-label">{userProfile.user.lastActiveAt && isUserOnline(userProfile.user.lastActiveAt, userProfile.user.hideOnlineStatus) ? 'Online' : 'Offline'}</div>
                                        </div>
                                        <div className="location-section">
                                            <MapMarkerIcon />
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

                                        {userProfile.user.id !== currentUser.id && (
                                            <ButtonsContainer containerName={'buttons-container'} />
                                        )}
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
                                        {userProfile.user.publicPhotos?.map((photo: UserPhoto, idx: number) => (
                                            <a key={idx} onClick={(e) => onPhotoView(e, idx)} href="">
                                                <UserPhotoDisplay
                                                    imageUrl={photo.path}
                                                    alt={`${userProfile.user.displayName}'s photo ${idx + 1}`}
                                                    width={96}
                                                    height={96}
                                                    shape="square"
                                                    croppedImageData={photo.croppedImageData}
                                                    gender={userProfile.user.gender}
                                                />
                                            </a>
                                        ))}
                                        {!userProfile.user.publicPhotos?.length &&
                                            <div className="no-photos-caption"><InfoCircleIcon size={'lg'} /> No photos available, or they are awaiting approval.</div>}
                                    </div>
                                </div>

                                <div className="information-container">
                                    <div className="section-title">
                                        <UserCircleIcon />
                                        <div className="title">Biography</div>
                                    </div>
                                    <div className="bio">
                                        {_.truncate(userProfile.user.bio || 'No biography available yet.', { length: 450 })}
                                        {showReadMoreBio ? <button onClick={(e) => onReadMoreBio(e)} className={'read-more'}>Read More</button> : null}
                                    </div>

                                    {userProfile.interestLabels?.length > 0 && (
                                        <>
                                            <div className="section-title">
                                                <StarIcon />
                                                <div className="title">Interests</div>
                                            </div>
                                            <div className="interests">
                                                {userProfile.interestLabels.map((interest: any, idx: number) => (
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

                            {userProfile.user.id !== currentUser.id && (
                                <ButtonsContainer containerName={'buttons-container mobile'} />
                            )}
                        </div>
                    )}
                </div>

                {showImageViewer && userProfile.user.publicPhotos && userProfile.user.publicPhotos.length > 0 && (
                    <div className="image-viewer-overlay" ref={imageViewerRef}>
                        <div className="image-viewer-content">
                            <div className="image-viewer-nav image-viewer-prev"
                                onClick={(e) => navigateImage('prev', e)}>
                                <AngleLeftIcon />
                            </div>
                            <div className="image-viewer-image-wrapper">
                                <div className="image-viewer-image-container">
                                    <img
                                        src={userProfile.user.publicPhotos[currentImageIndex].path}
                                        alt={`${userProfile.user.displayName}'s photo ${currentImageIndex + 1}`}
                                        className="image-viewer-image"
                                    />
                                </div>
                                {userProfile.user.publicPhotos[currentImageIndex].caption && (
                                    <div className="image-viewer-caption">
                                        {_.truncate(userProfile.user.publicPhotos[currentImageIndex].caption, { length: 180 })}
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

                <ReportUserDialog
                    isOpen={showReportDialog}
                    onClose={() => setShowReportDialog(false)}
                    userId={Number(userProfile.user.id)}
                    userName={userProfile.user.displayName}
                    onSuccess={() => profileDataFetchTrigger$.next()}
                />

                {showBioModal && (
                    <div className="bio-modal-overlay" onClick={() => setShowBioModal(false)}>
                        <div className="bio-modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="bio-modal-header">
                                <h3>{userProfile.user.displayName}&apos;s Biography</h3>
                                <button
                                    className="bio-modal-close"
                                    onClick={() => setShowBioModal(false)}
                                >
                                    <TimesIcon />
                                </button>
                            </div>
                            <div className="bio-modal-body">
                                <p>{userProfile.user.bio || 'No biography available yet.'}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <Dialog
                open={showUnmatchDialog}
                onClose={() => setShowUnmatchDialog(false)}
                aria-labelledby="unmatch-dialog-title"
            >
                <DialogTitle id="unmatch-dialog-title">
                    Unmatch Confirmation
                </DialogTitle>
                <DialogContent>
                    Are you sure you want to unmatch with {userProfile.user.displayName}? This action cannot be undone.
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowUnmatchDialog(false)} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={handleUnmatch} color="error" variant="contained" disabled={isUpdatingMatch}>
                        {isUpdatingMatch ? <CircularProgress size={20} sx={{ color: "primary.contrastText" }} /> : 'Unmatch'}
                    </Button>
                </DialogActions>
            </Dialog>
        </CurrentUserProvider>
    );
}
