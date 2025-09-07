'use client';

import './notification-center.scss';
import UserPhotoDisplay from "@/common/user-photo-display/user-photo-display";
import { CircularProgress, Popover } from '@mui/material';
import UserProfileAccountMenu from './user-profile-account-menu/user-profile-account-menu';
import * as React from 'react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useCurrentUser } from '../context/current-user-context';
import { userProfileLink, showAlert } from '@/util';
import _ from 'lodash';
import { Subject, Subscription, fromEvent } from 'rxjs';
import { debounceTime, filter, tap } from 'rxjs/operators';
import { NotificationCenterData } from '@/types/notification-center-data.interface';
import {
    loadNotificationCenterData,
    markMatchNotificationsAsRead,
    deleteNotification
} from '@/common/server-actions/notifications.actions';
import { useNotificationPopovers } from './hooks/use-notification-popovers';
import NotificationIconsContainer from './notification-icons-container/notification-icons-container';
import NotificationPopover from './notification-popover/notification-popover';
import { muteUser, sendUserMatch, fetchCurrentUserMainPhotoUrl } from '../server-actions/user-profile.actions';
import { useRouter, usePathname } from 'next/navigation';
import { useWebSocket } from '@/hooks/use-websocket';
import { WebSocketMessage } from "../../../types/websocket-events.types";

interface NewNotificationAnimation {
    [key: string]: boolean;
}

export default function NotificationCenter() {
    const currentUser = useCurrentUser();
    const [notificationsData, setNotificationsData] = useState<NotificationCenterData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newNotificationAnimations, setNewNotificationAnimations] = useState<NewNotificationAnimation>({});
    const [itemLoadingStates, setItemLoadingStates] = useState<{ [key: string]: boolean }>({});
    const [userMainPhoto, setUserMainPhoto] = useState<string | undefined>(currentUser?.publicMainPhoto);
    const [userMainPhotoCroppedImageData, setUserMainPhotoCroppedImageData] = useState<any>(currentUser?.mainPhotoCroppedImageData);
    const popovers = useNotificationPopovers();
    const router = useRouter();
    const pathname = usePathname();
    const { on, isConnected } = useWebSocket();
    const notificationTimeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
    const profileButtonRef = useRef<HTMLButtonElement>(null);

    // Trigger the CSS animation that animates the count bubble with a state update
    const triggerNotificationAnimation = useCallback((type: 'match' | 'message' | 'notification') => {
        const notificationId = Date.now();
        setNewNotificationAnimations(prev => ({ ...prev, [`${type}-${notificationId}`]: true }));

        // Remove animation CSS class after delay
        const timeoutId = setTimeout(() => {
            setNewNotificationAnimations(prev => {
                const newState = { ...prev };
                delete newState[`${type}-${notificationId}`];
                return newState;
            });
            notificationTimeoutRefs.current.delete(`${type}-${notificationId}`);
        }, 3000);

        notificationTimeoutRefs.current.set(`${type}-${notificationId}`, timeoutId);
    }, []);

    const fetchNotificationCenterData = useCallback(async (showLoader = false) => {
        if (!currentUser) return;

        try {
            if (showLoader) {
                setIsLoading(true);
            }

            setError(null);
            const data = await loadNotificationCenterData(currentUser);
            setNotificationsData(data);
        } catch (err) {
            console.error('Error refetching notification data:', err);
            setError(err instanceof Error ? err.message : 'Failed to load notifications');
        } finally {
            if (showLoader) {
                setIsLoading(false);
            }
        }
    }, [currentUser, setIsLoading, setError]);

    const fetchUserMainPhoto = useCallback(async () => {
        if (!currentUser) return;

        try {
            const photoData = await fetchCurrentUserMainPhotoUrl();
            if (photoData) {
                setUserMainPhoto(photoData.publicMainPhoto);
                setUserMainPhotoCroppedImageData(photoData.mainPhotoCroppedImageData);
            }
        } catch (err) {
            console.error('Error refetching user main photo:', err);
        }
    }, [currentUser]);

    const handleMessagesClick = (e: React.MouseEvent<HTMLElement>) => {
        if (notificationsData?.receivedMessages?.length === 0) {
            router.push('/messages');
        } else {
            popovers.messages.handleClick(e);
        }
    };

    const handleLikesClick = (e: React.MouseEvent<HTMLElement>) => {
        if (notificationsData?.pendingMatches?.length === 0) {
            router.push('/likes');
        } else {
            popovers.likes.handleClick(e);
        }
    };

    const notificationDataFetchTrigger$ = useMemo(() => new Subject<{ showLoader?: boolean }>(), []);
    const notificationDataFetchSubRef = useRef<Subscription | null>(null);

    // Trigger that we will use to debounce data fetch requests
    useEffect(() => {
        if (!fetchNotificationCenterData) return;

        notificationDataFetchSubRef.current = notificationDataFetchTrigger$
            .pipe(debounceTime(500))
            .subscribe(({ showLoader }: { showLoader?: boolean }) => {
                fetchNotificationCenterData(showLoader).catch(err => {
                    console.error('Error fetching notification data:', err);
                });
            });

        return () => {
            notificationDataFetchSubRef.current?.unsubscribe();
            notificationDataFetchSubRef.current = null;
        };
    }, [fetchNotificationCenterData, notificationDataFetchTrigger$]);

    // Real-time websocket notification handlers (these are debounced to avoid flooding the UI)
    useEffect(() => {
        if (!isConnected || !currentUser) return;

        const handleRealTimeMatchEvents = (data: WebSocketMessage) => {
            if (data.eventLabel === 'match:new') {
                triggerNotificationAnimation('match');
            }

            notificationDataFetchTrigger$.next({ showLoader: false });
        }

        const handleRealTimeMessageEvents = () => {
            triggerNotificationAnimation('message');
            notificationDataFetchTrigger$.next({ showLoader: false });
        };

        const handleRealTimeNotificationEvents = () => {
            triggerNotificationAnimation('notification');
            notificationDataFetchTrigger$.next({ showLoader: false });
        };

        const handleRealTimeAccountEvents = (data: WebSocketMessage) => {
            if (data.eventLabel === 'account:message') {
                // Todo: show some alert/toast that user's been messaged by admin
                fetchUserMainPhoto();
            }

            notificationDataFetchTrigger$.next({ showLoader: false });
        };

        // Subscribe to real-time websocket events
        const debounceTimeMs = 200;
        const subscriptions = [
            on('match:notification')
                .pipe(
                    debounceTime(debounceTimeMs),
                    filter((data: WebSocketMessage) => ['match:new', 'match:cancel'].includes(data.eventLabel)
                    ))
                .subscribe(handleRealTimeMatchEvents),

            on('message:notification')
                .pipe(
                    debounceTime(debounceTimeMs),
                    filter((data: WebSocketMessage) => data.eventLabel === 'message:new'
                    ))
                .subscribe(handleRealTimeMessageEvents),

            on('event:notification')
                .pipe(
                    debounceTime(debounceTimeMs),
                    filter((data: WebSocketMessage) => data.eventLabel === 'notification:new')
                )
                .subscribe(handleRealTimeNotificationEvents),

            on('account:notification')
                .pipe(debounceTime(debounceTimeMs), filter((data: WebSocketMessage) =>
                    ['account:message', 'account:blocked', 'account:unblocked', 'account:photosApproved', 'account:photosNotApproved'].includes(data.eventLabel)))
                .subscribe(handleRealTimeAccountEvents)
        ];

        // Cleanup
        return () => {
            subscriptions.forEach(sub => sub.unsubscribe());

            // Clear all animation timeouts
            notificationTimeoutRefs.current.forEach(timeout => clearTimeout(timeout));
            notificationTimeoutRefs.current.clear();
        };
    }, [isConnected, currentUser, on, fetchNotificationCenterData, pathname]);

    useEffect(() => {
        if (!fetchNotificationCenterData || !fetchUserMainPhoto) return;

        const debounceMs = 150;

        const refreshNotificationsSubscription = fromEvent(window, 'notification-center-refresh')
            .pipe(debounceTime(debounceMs))
            .subscribe(() => {
                notificationDataFetchTrigger$.next({ showLoader: false });
            });

        const refreshPhotoSubscription = fromEvent(window, 'refresh-user-profile-main-photo')
            .pipe(debounceTime(debounceMs))
            .subscribe(() => {
                notificationDataFetchTrigger$.next({ showLoader: false });
            });

        // Cleanup
        return () => {
            refreshNotificationsSubscription.unsubscribe();
            refreshPhotoSubscription.unsubscribe();
        };
    }, [fetchNotificationCenterData, fetchUserMainPhoto]);

    // Initial data fetch
    useEffect(() => {
        if (!currentUser) {
            setIsLoading(false);
            return;
        }

        // Initialize user photo state when currentUser changes
        setUserMainPhoto(currentUser.publicMainPhoto);
        setUserMainPhotoCroppedImageData(currentUser.mainPhotoCroppedImageData);
        fetchNotificationCenterData(true);
    }, []);

    if (!currentUser) {
        return null;
    }

    if (isLoading) {
        return (
            <div className="notification-center-loading-container">
                <CircularProgress size={25} sx={{ color: "primary" }} />
                <div className="loading-label">Loading...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="notification-center-error">
                An error occurred while loading notification center. Please try again later.
            </div>
        );
    }

    if (!notificationsData) {
        return null;
    }

    return (
        <>
            <div className="notification-center-container">
                <NotificationIconsContainer
                    notificationsData={notificationsData}
                    onLikesClick={handleLikesClick}
                    onMessagesClick={handleMessagesClick}
                    onNotificationsClick={(e) => {
                        popovers.notifications.handleClick(e);
                        markMatchNotificationsAsRead(currentUser, notificationsData?.receivedNotifications)
                            .then((newNotificationCount: number) =>
                                setNotificationsData({
                                    ...notificationsData,
                                    ...{
                                        notificationCount: newNotificationCount
                                    }
                                }));
                    }}
                    hasNewMatch={_.some(_.keys(newNotificationAnimations), key => key.startsWith('match'))}
                    hasNewMessage={_.some(_.keys(newNotificationAnimations), key => key.startsWith('message'))}
                    hasNewNotification={_.some(_.keys(newNotificationAnimations), key => key.startsWith('notification'))}
                />
                <div className="profile-user">
                    <button
                        ref={profileButtonRef}
                        onClick={(e) => {
                            // Use the ref instead of the event target to ensure a stable anchor reference
                            if (profileButtonRef.current) {
                                popovers.profileUser.handleClick({
                                    ...e,
                                    currentTarget: profileButtonRef.current
                                } as React.MouseEvent<HTMLElement>);
                            }
                        }}
                        className="profile-container">
                        <UserPhotoDisplay gender={currentUser.gender}
                            croppedImageData={userMainPhotoCroppedImageData}
                            imageUrl={userMainPhoto} />
                        <div className="profile-name-container">
                            <h5>{currentUser.displayName}</h5>
                            <h6>My Account</h6>
                        </div>
                    </button>
                </div>
            </div>
            <Popover anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                id="profile-user-account-popover"
                anchorEl={profileButtonRef.current}
                onClose={popovers.profileUser.handleClose}
                open={popovers.profileUser.isOpen}>
                <UserProfileAccountMenu onSelectionMade={popovers.profileUser.handleClose} />
            </Popover>

            <NotificationPopover
                id="likes-popover"
                anchorEl={popovers.likes.element}
                open={popovers.likes.isOpen}
                onClose={popovers.likes.handleClose}
                titleIcon="/images/blue-heart.svg"
                titleIconDark="/images/white-heart.svg"
                title="Likes"
                listItems={(notificationsData?.pendingMatches || []).map(pendingMatch => ({
                    id: pendingMatch.id,
                    content: pendingMatch.sender.locationName,
                    senderUser: pendingMatch.sender,
                    receivedAtMessage: `Received ${pendingMatch.receivedAtHumanized}`,
                    infoSectionUrl: userProfileLink(pendingMatch.sender),
                    userPhotoUrl: userProfileLink(pendingMatch.sender),
                    isLoading: itemLoadingStates[pendingMatch.id] || false,
                    onLike: () => {
                        setItemLoadingStates(prev => ({ ...prev, [pendingMatch.id]: true }));
                        setTimeout(async () => {
                            try {
                                const result = await sendUserMatch(pendingMatch.sender.id);
                                if (typeof result === 'object' && result && 'error' in result) {
                                    showAlert(result.error);
                                    return;
                                }
                                const aData = await loadNotificationCenterData(currentUser);
                                setNotificationsData(aData);
                                if (aData.pendingMatches?.length === 0) {
                                    popovers.likes.handleClose();
                                }
                            } finally {
                                setItemLoadingStates(prev => ({ ...prev, [pendingMatch.id]: false }));
                            }
                        }, 500);
                    },
                    onPass: () => {
                        setItemLoadingStates(prev => ({ ...prev, [pendingMatch.id]: true }));
                        setTimeout(async () => {
                            try {
                                await muteUser(pendingMatch.sender.id);
                                const aData = await loadNotificationCenterData(currentUser);
                                setNotificationsData(aData);
                                if (aData.pendingMatches?.length === 0) {
                                    popovers.likes.handleClose();
                                }
                            } finally {
                                setItemLoadingStates(prev => ({ ...prev, [pendingMatch.id]: false }));
                            }
                        }, 500);
                    },
                    type: "likes"
                }))}
            />

            <NotificationPopover
                id="messages-popover"
                anchorEl={popovers.messages.element}
                open={popovers.messages.isOpen}
                onClose={popovers.messages.handleClose}
                titleIcon="/images/blue-messages.svg"
                titleIconDark="/images/white-messages.svg"
                title="Messages"
                listItems={(notificationsData?.receivedMessages || []).map(receivedMessage => ({
                    id: receivedMessage.id,
                    content: receivedMessage.type === 'message' ? _.truncate(receivedMessage.content) : `Start the chat with ${receivedMessage.displayName}`,
                    senderUser: {
                        displayName: receivedMessage.displayName,
                        gender: receivedMessage.userGender,
                        publicMainPhoto: receivedMessage.publicMainPhoto,
                        mainPhotoCroppedImageData: receivedMessage.mainPhotoCroppedImageData,
                        age: receivedMessage.age
                    },
                    receivedAtMessage: `${receivedMessage.type === 'message' ? 'Sent' : 'Matched'} ${receivedMessage.sentAtHumanized}`,
                    infoSectionUrl: `/messages/${receivedMessage.matchId}`,
                    userPhotoUrl: userProfileLink({ id: receivedMessage.userId }),
                    numberOfMessages: receivedMessage.msgCount,
                    type: 'messages'
                }))}
            />

            <NotificationPopover
                id="notifications-popover"
                anchorEl={popovers.notifications.element}
                open={popovers.notifications.isOpen}
                onClose={popovers.notifications.handleClose}
                titleIcon="/images/blue-bell.svg"
                titleIconDark="/images/white-bell.svg"
                title="Notifications"
                listItems={(notificationsData?.receivedNotifications || []).map(notification => ({
                    id: notification.id,
                    content: notification.data.content || "",
                    senderUser: notification.sender,
                    receivedAtMessage: "",
                    infoSectionUrl: `/messages/${notification.data.matchId}`,
                    userPhotoUrl: !!notification.sender ? userProfileLink(notification.sender) : undefined,
                    type: "notifications",
                    onDelete: async (notificationId: string | number) => {
                        try {
                            await deleteNotification(currentUser, notificationId as number);
                            const updatedData = await loadNotificationCenterData(currentUser);
                            setNotificationsData(updatedData);
                        } catch (error) {
                            console.error('Error deleting notification:', error);
                        }
                    }
                }))}
            />
        </>
    );
}
