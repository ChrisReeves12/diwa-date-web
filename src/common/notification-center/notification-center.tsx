import './notification-center.scss';
import Image from 'next/image';
import UserPhotoDisplay from "@/common/user-photo-display/user-photo-display";
import { Popover } from '@mui/material';
import UserProfileAccountMenu from './user-profile-account-menu/user-profile-account-menu';
import * as React from 'react';
import { useState, useEffect } from 'react';
import { useCurrentUser } from '../context/current-user-context';
import { authAPIRequest, humanizeTimeDiff, userProfileLink } from "@/util";
import { NotificationResponse } from "@/types/notification-response.interface";
import NotificationMenu from "@/common/notification-center/notification-menu/notification-menu";
import _ from 'lodash';

export default function NotificationCenter() {
    const [profileUserEl, setProfileUserEl] = useState<HTMLElement | null>(null);
    const [likesEl, setLikesEl] = useState<HTMLElement | null>(null);
    const [messagesEl, setMessagesEl] = useState<HTMLElement | null>(null);
    const [notificationsEl, setNotificationsEl] = useState<HTMLElement | null>(null);
    const [isProfileUserPopoverOpen, setIsProfileUserPopoverOpen] = useState<boolean>(false);
    const [isLikesPopoverOpen, setIsLikesPopoverOpen] = useState<boolean>(false);
    const [isMessagesPopoverOpen, setIsMessagesPopoverOpen] = useState<boolean>(false);
    const [isNotificationsPopoverOpen, setIsNotificationsPopoverOpen] = useState<boolean>(false);
    const [notifications, setNotifications] = useState<NotificationResponse | null>(null);

    const currentUser = useCurrentUser();

    // Load initial data
    useEffect(() => {
        loadPendingMatches().then();
    }, []);

    if (!currentUser) {
        return null;
    }

    const handleProfileAccountMenuClick = (e: React.MouseEvent<HTMLElement>) => {
        setProfileUserEl(e.currentTarget);
        setIsProfileUserPopoverOpen(true);
    }

    const handleLikesClick = (e: React.MouseEvent<HTMLElement>) => {
        setLikesEl(e.currentTarget);
        setIsLikesPopoverOpen(true);
    }

    const handleMessagesClick = (e: React.MouseEvent<HTMLElement>) => {
        setMessagesEl(e.currentTarget);
        setIsMessagesPopoverOpen(true);
    }

    const handleNotificationsClick = (e: React.MouseEvent<HTMLElement>) => {
        setNotificationsEl(e.currentTarget);
        setIsNotificationsPopoverOpen(true);
    }

    const loadPendingMatches = async () => {
        const response =
            await authAPIRequest<NotificationResponse>('GET', '/api/user/notifications', window);

        if (response?.success && response.body) {
            setNotifications(response.body);
        }
    }

    return (
        <>
            <div className="notification-center-container">
                <div className="notification-container">
                    <div className="notification-icon-container">
                        <button onClick={handleLikesClick}>
                            <span className="light-dark">
                                <span className="light">
                                    <Image width={45} height={45} title="Matches" alt="Matches" src="/images/heart.svg" />
                                </span>
                                <span className="dark">
                                    <Image width={45} height={45} title="Matches" alt="Matches" src="/images/heart-dark.svg" />
                                </span>
                            </span>
                            {notifications?.pendingMatchesCount && notifications.pendingMatchesCount > 0 &&
                                <div className='notification-count-bubble'>{notifications.pendingMatchesCount > 99 ? '99+' : notifications.pendingMatchesCount}</div>}
                        </button>
                    </div>
                    <div className="notification-icon-container">
                        <button onClick={handleMessagesClick}>
                            <span className="light-dark">
                                <span className="light">
                                    <Image width={45} height={45} title="Messages" alt="Messages" src="/images/messages.svg" />
                                </span>
                                <span className="dark">
                                    <Image width={45} height={45} title="Messages" alt="Messages" src="/images/messages-dark.svg" />
                                </span>
                            </span>
                            {notifications?.receivedMessagesCount && notifications.receivedMessagesCount > 0 &&
                                <div className="notification-count-bubble">{notifications.receivedMessagesCount > 99 ? '99+' : notifications.receivedMessagesCount}</div>}
                        </button>
                    </div>
                    <div className="notification-icon-container">
                        <button onClick={handleNotificationsClick}>
                            <span className="light-dark">
                                <span className="light">
                                    <Image width={45} height={45} title="Notifications" alt="Notifications" src="/images/bell.svg" />
                                </span>
                                <span className="dark">
                                    <Image width={45} height={45} title="Notifications" alt="Notifications" src="/images/bell-dark.svg" />
                                </span>
                            </span>
                            {notifications?.notificationCount && notifications.notificationCount > 0 &&
                                <div className="notification-count-bubble">
                                    {notifications.notificationCount > 99 ? '99+' : notifications.notificationCount}
                                </div>}
                        </button>
                    </div>
                </div>
                <div className="profile-user">
                    <button onClick={handleProfileAccountMenuClick} className="profile-container">
                        <UserPhotoDisplay gender={currentUser.gender}
                            croppedImageData={currentUser.main_photo_cropped_image_data}
                            imageUrl={currentUser.public_main_photo} />
                        <div className="profile-name-container">
                            <h5>{currentUser.display_name}</h5>
                            <h6>My Account</h6>
                        </div>
                    </button>
                </div>
            </div>
            <Popover anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                id="profile-user-account-popover"
                anchorEl={profileUserEl}
                onClose={() => setIsProfileUserPopoverOpen(false)}
                open={isProfileUserPopoverOpen}>
                <UserProfileAccountMenu onSelectionMade={() => setIsProfileUserPopoverOpen(false)} />
            </Popover>
            <Popover anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                id="likes-popover"
                anchorEl={likesEl}
                onClose={() => setIsLikesPopoverOpen(false)}
                open={isLikesPopoverOpen}>
                <NotificationMenu
                    titleIcon="/images/blue-heart.svg"
                    titleIconDark="/images/white-heart.svg"
                    title="Likes"
                    listItems={(notifications?.pendingMatches || []).map(pendingMatch => ({
                        id: pendingMatch.id,
                        content: pendingMatch.sender.location_name,
                        senderUser: pendingMatch.sender,
                        receivedAtMessage: `Received ${humanizeTimeDiff(new Date(pendingMatch.created_at))}`,
                        infoSectionUrl: userProfileLink(pendingMatch.sender),
                        userPhotoUrl: userProfileLink(pendingMatch.sender),
                        onLike: () => { },
                        onPass: () => { },
                        type: "likes"
                    }))} />
            </Popover>
            <Popover anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                id="messages-popover"
                anchorEl={messagesEl}
                onClose={() => setIsMessagesPopoverOpen(false)}
                open={isMessagesPopoverOpen}>
                <NotificationMenu
                    titleIcon="/images/blue-messages.svg"
                    titleIconDark="/images/white-messages.svg"
                    title="Messages"
                    listItems={(notifications?.receivedMessages || []).map(receivedMessage => ({
                        id: receivedMessage.id,
                        content: _.truncate(receivedMessage.content),
                        senderUser: {
                            display_name: receivedMessage.display_name,
                            gender: receivedMessage.user_gender,
                            public_main_photo: receivedMessage.public_main_photo,
                            main_photo_cropped_image_data: receivedMessage.main_photo_cropped_image_data,
                            age: receivedMessage.age
                        },
                        receivedAtMessage: `Sent ${humanizeTimeDiff(new Date(receivedMessage.created_at))}`,
                        infoSectionUrl: `/user/messages/${receivedMessage.user_id}`,
                        userPhotoUrl: userProfileLink({ id: receivedMessage.user_id }),
                        numberOfMessages: receivedMessage.msg_count,
                        type: 'messages'
                    }))}
                />
            </Popover>
            <Popover anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                id="notifications-popover"
                anchorEl={notificationsEl}
                onClose={() => setIsNotificationsPopoverOpen(false)}
                open={isNotificationsPopoverOpen}>
                <NotificationMenu
                    titleIcon="/images/blue-bell.svg"
                    titleIconDark="/images/white-bell.svg"
                    title="Notifications"
                    listItems={(notifications?.receivedNotifications || []).map(notification => ({
                        id: notification.id,
                        content: "",
                        senderUser: notification.sender,
                        receivedAtMessage: "",
                        infoSectionUrl: "",
                        userPhotoUrl: "",
                        type: "notifications"
                }))}/>
            </Popover>
        </>
    );
}
