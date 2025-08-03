'use client';

import './notification-center.scss';
import UserPhotoDisplay from "@/common/user-photo-display/user-photo-display";
import { CircularProgress, Popover } from '@mui/material';
import UserProfileAccountMenu from './user-profile-account-menu/user-profile-account-menu';
import * as React from 'react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useCurrentUser } from '../context/current-user-context';
import { userProfileLink } from '@/util';
import _ from 'lodash';
import { NotificationCenterData } from '@/types/notification-center-data.interface';
import {
    loadNotificationCenterData,
    markMatchNotificationsAsRead
} from '@/common/server-actions/notifications.actions';
import { useNotificationPopovers } from './hooks/use-notification-popovers';
import NotificationIconsContainer from './notification-icons-container/notification-icons-container';
import NotificationPopover from './notification-popover/notification-popover';
import { muteUser, sendUserMatch } from '../server-actions/user-profile.actions';
import { useRouter, usePathname } from 'next/navigation';
import { useWebSocket } from '@/hooks/use-websocket';

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
    const popovers = useNotificationPopovers();
    const router = useRouter();
    const pathname = usePathname();
    const { on, off, isConnected } = useWebSocket();
    const notificationTimeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
    const profileButtonRef = useRef<HTMLButtonElement>(null);

    // Compute which categories have new notifications
    const hasNewMatch = useMemo(() => {
        return Object.keys(newNotificationAnimations).some(key => key.startsWith('match-'));
    }, [newNotificationAnimations]);

    const hasNewMessage = useMemo(() => {
        return Object.keys(newNotificationAnimations).some(key => key.startsWith('message-'));
    }, [newNotificationAnimations]);

    const hasNewNotification = useMemo(() => {
        return Object.keys(newNotificationAnimations).some(key => key.startsWith('notification-'));
    }, [newNotificationAnimations]);

    // Handle new notification with animation
    const addNotificationAnimation = useCallback((notificationId: string, type: 'match' | 'message' | 'notification') => {
        // Set animation state
        setNewNotificationAnimations(prev => ({ ...prev, [`${type}-${notificationId}`]: true }));

        // Remove animation after delay
        const timeoutId = setTimeout(() => {
            setNewNotificationAnimations(prev => {
                const newState = { ...prev };
                delete newState[`${type}-${notificationId}`];
                return newState;
            });
            notificationTimeoutRefs.current.delete(`${type}-${notificationId}`);
        }, 3000); // Animation duration

        notificationTimeoutRefs.current.set(`${type}-${notificationId}`, timeoutId);
    }, []);

    // Refetch notification data from server
    const refetchNotificationData = useCallback(async () => {
        if (!currentUser) return;

        try {
            const data = await loadNotificationCenterData(currentUser);
            setNotificationsData(data);
        } catch (err) {
            console.error('Error refetching notification data:', err);
        }
    }, [currentUser]);

    // Trigger refetch with animation
    const triggerRefetch = useCallback((eventType: 'match' | 'message' | 'notification') => {
        console.log(`Triggering refetch for event type: ${eventType}`);

        // Trigger animation immediately for visual feedback
        addNotificationAnimation(String(Date.now()), eventType);

        // Refetch data from server
        refetchNotificationData();
    }, [addNotificationAnimation, refetchNotificationData]);

    // Real-time notification handlers (simplified)
    useEffect(() => {
        if (!isConnected || !currentUser) return;

        // Handle new match notification - simplified to refetch trigger
        const handleNewMatch = () => {
            console.log('New match signal received - triggering refetch');
            triggerRefetch('match');
        };

        // Handle new message notification
        const handleNewMessage = (data: any) => {
            const messageMatchId = data.conversationId || data.matchId;

            // Check if we are in the chat view for this message
            const isViewingChat = pathname.includes(`/messages/${messageMatchId}`);

            if (isViewingChat) {
                console.log(`New message for currently viewed match (${messageMatchId}) - suppressing notification.`);
                return; // Don't show notification if user is in the chat
            }

            console.log('New message signal received - triggering refetch');
            triggerRefetch('message');
        };

        // Handle general notification - simplified to refetch trigger
        const handleNewNotification = () => {
            console.log('New notification signal received - triggering refetch');
            triggerRefetch('notification');
        };

        // Handle notification read event - simplified to refetch trigger
        const handleNotificationRead = () => {
            console.log('Notification read signal received - triggering refetch');
            refetchNotificationData(); // No animation needed for read events
        };

        // Handle match cancelled event - simplified to refetch trigger
        const handleMatchCancelled = () => {
            console.log('Match cancelled signal received - triggering refetch');
            refetchNotificationData(); // No animation needed for cancellations
        };

        // Subscribe to events
        on('match:new', handleNewMatch);
        on('message:new', handleNewMessage);
        on('notification:new', handleNewNotification);
        on('notification:read', handleNotificationRead);
        on('match:cancelled', handleMatchCancelled);

        // Cleanup
        return () => {
            off('match:new', handleNewMatch);
            off('message:new', handleNewMessage);
            off('notification:new', handleNewNotification);
            off('notification:read', handleNotificationRead);
            off('match:cancelled', handleMatchCancelled);

            // Clear all animation timeouts
            notificationTimeoutRefs.current.forEach(timeout => clearTimeout(timeout));
            notificationTimeoutRefs.current.clear();
        };
    }, [isConnected, currentUser, on, off, triggerRefetch, refetchNotificationData, pathname]);

    useEffect(() => {
        const handleNotificationCenterRefresh = () => {
            console.log('notification-center-refresh event received, refetching notification data.');
            refetchNotificationData();
        };

        window.addEventListener('notification-center-refresh', handleNotificationCenterRefresh);

        return () => {
            window.removeEventListener('notification-center-refresh', handleNotificationCenterRefresh);
        };
    }, [refetchNotificationData]);

    useEffect(() => {
        if (!currentUser) {
            setIsLoading(false);
            return;
        }

        const loadData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const data = await loadNotificationCenterData(currentUser);
                setNotificationsData(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load notifications');
                console.error('Error loading notification center data:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
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
                    hasNewMatch={hasNewMatch}
                    hasNewMessage={hasNewMessage}
                    hasNewNotification={hasNewNotification}
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
                            croppedImageData={currentUser.mainPhotoCroppedImageData}
                            imageUrl={currentUser.publicMainPhoto} />
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
                                await sendUserMatch(pendingMatch.sender.id);
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
                    content: "",
                    senderUser: notification.sender,
                    receivedAtMessage: "",
                    infoSectionUrl: "",
                    userPhotoUrl: "",
                    type: "notifications"
                }))}
            />
        </>
    );
}
