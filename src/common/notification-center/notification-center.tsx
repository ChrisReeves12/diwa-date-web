import './notification-center.scss';
import Image from 'next/image';
import UserPhotoDisplay from "@/common/user-photo-display/user-photo-display";
import { Popover } from '@mui/material';
import UserProfileAccountMenu from './user-profile-account-menu/user-profile-account-menu';
import * as React from 'react';
import { useState, useEffect, Suspense, use } from 'react';
import { useCurrentUser } from '../context/current-user-context';
import { humanizeTimeDiff, userProfileLink } from "@/util";
import { NotificationResponse } from "@/types/notification-response.interface";
import NotificationMenu from "@/common/notification-center/notification-menu/notification-menu";
import _ from 'lodash';

interface NotificationCenterProps {
    notificationsPromise?: Promise<NotificationResponse>;
}

function NotificationCenterContent({ notificationsData }: { notificationsData: NotificationResponse }) {
    const [profileUserEl, setProfileUserEl] = useState<HTMLElement | null>(null);
    const [likesEl, setLikesEl] = useState<HTMLElement | null>(null);
    const [messagesEl, setMessagesEl] = useState<HTMLElement | null>(null);
    const [notificationsEl, setNotificationsEl] = useState<HTMLElement | null>(null);
    const [isProfileUserPopoverOpen, setIsProfileUserPopoverOpen] = useState<boolean>(false);
    const [isLikesPopoverOpen, setIsLikesPopoverOpen] = useState<boolean>(false);
    const [isMessagesPopoverOpen, setIsMessagesPopoverOpen] = useState<boolean>(false);
    const [isNotificationsPopoverOpen, setIsNotificationsPopoverOpen] = useState<boolean>(false);

    const currentUser = useCurrentUser();

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
                            {!!notificationsData?.pendingMatchesCount && notificationsData.pendingMatchesCount > 0 &&
                                <div className='notification-count-bubble'>{notificationsData.pendingMatchesCount > 99 ? '99+' : notificationsData.pendingMatchesCount}</div>}
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
                            {!!notificationsData?.receivedMessagesCount && notificationsData.receivedMessagesCount > 0 &&
                                <div className="notification-count-bubble">{notificationsData.receivedMessagesCount > 99 ? '99+' : notificationsData.receivedMessagesCount}</div>}
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
                            {!!notificationsData?.notificationCount && notificationsData.notificationCount > 0 &&
                                <div className="notification-count-bubble">
                                    {notificationsData.notificationCount > 99 ? '99+' : notificationsData.notificationCount}
                                </div>}
                        </button>
                    </div>
                </div>
                <div className="profile-user">
                    <button onClick={handleProfileAccountMenuClick} className="profile-container">
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
                    listItems={(notificationsData?.pendingMatches || []).map(pendingMatch => ({
                        id: pendingMatch.id,
                        content: pendingMatch.sender.locationName,
                        senderUser: pendingMatch.sender,
                        receivedAtMessage: `Received ${pendingMatch.receivedAtHumanized}`,
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
                        infoSectionUrl: `/user/messages/${receivedMessage.userId}`,
                        userPhotoUrl: userProfileLink({ id: receivedMessage.userId }),
                        numberOfMessages: receivedMessage.msgCount,
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
                    listItems={(notificationsData?.receivedNotifications || []).map(notification => ({
                        id: notification.id,
                        content: "",
                        senderUser: notification.sender,
                        receivedAtMessage: "",
                        infoSectionUrl: "",
                        userPhotoUrl: "",
                        type: "notifications"
                    }))} />
            </Popover>
        </>
    );
}

export default function NotificationCenter({ notificationsPromise }: NotificationCenterProps) {
    const currentUser = useCurrentUser();

    if (!currentUser) {
        return null;
    }

    if (!notificationsPromise) {
        return null;
    }

    return (
        <Suspense fallback={<div>Please wait...</div>}>
            <NotificationCenterWithData notificationsPromise={notificationsPromise} />
        </Suspense>
    );
}

function NotificationCenterWithData({ notificationsPromise }: { notificationsPromise: Promise<NotificationResponse> }) {
    const notificationsData = use(notificationsPromise);

    return <NotificationCenterContent notificationsData={notificationsData} />;
}
