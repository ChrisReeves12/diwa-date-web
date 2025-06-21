'use client';

import './notification-center.scss';
import UserPhotoDisplay from "@/common/user-photo-display/user-photo-display";
import { Popover } from '@mui/material';
import UserProfileAccountMenu from './user-profile-account-menu/user-profile-account-menu';
import * as React from 'react';
import { useState, useEffect } from 'react';
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
import { useRouter } from 'next/navigation';

export default function NotificationCenter() {
    const currentUser = useCurrentUser();
    const [notificationsData, setNotificationsData] = useState<NotificationCenterData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const popovers = useNotificationPopovers();
    const router = useRouter();

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
            <div>Please wait...</div>
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
                />
                <div className="profile-user">
                    <button onClick={popovers.profileUser.handleClick} className="profile-container">
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
                anchorEl={popovers.profileUser.element}
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
                    onLike: () => {
                        sendUserMatch(pendingMatch.sender.id).then(() => {
                            return loadNotificationCenterData(currentUser);
                        }).then((aData) => setNotificationsData(aData));
                    },
                    onPass: () => {
                        muteUser(pendingMatch.sender.id).then(() => {
                            return loadNotificationCenterData(currentUser);
                        }).then((aData) => setNotificationsData(aData));
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
                    content: _.truncate(receivedMessage.content),
                    senderUser: {
                        displayName: receivedMessage.displayName,
                        gender: receivedMessage.userGender,
                        publicMainPhoto: receivedMessage.publicMainPhoto,
                        mainPhotoCroppedImageData: receivedMessage.mainPhotoCroppedImageData,
                        age: receivedMessage.age
                    },
                    receivedAtMessage: `Sent ${receivedMessage.sentAtHumanized}`,
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
