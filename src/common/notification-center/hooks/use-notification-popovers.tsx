import { useState } from 'react';

interface PopoverState {
    element: HTMLElement | null;
    isOpen: boolean;
}

interface PopoverHandlers {
    handleClick: (e: React.MouseEvent<HTMLElement>) => void;
    handleClose: () => void;
}

interface UseNotificationPopoversReturn {
    profileUser: PopoverState & PopoverHandlers;
    likes: PopoverState & PopoverHandlers;
    messages: PopoverState & PopoverHandlers;
    notifications: PopoverState & PopoverHandlers;
}

export function useNotificationPopovers(): UseNotificationPopoversReturn {
    // Profile User State
    const [profileUserEl, setProfileUserEl] = useState<HTMLElement | null>(null);
    const [isProfileUserPopoverOpen, setIsProfileUserPopoverOpen] = useState<boolean>(false);

    // Likes State
    const [likesEl, setLikesEl] = useState<HTMLElement | null>(null);
    const [isLikesPopoverOpen, setIsLikesPopoverOpen] = useState<boolean>(false);

    // Messages State
    const [messagesEl, setMessagesEl] = useState<HTMLElement | null>(null);
    const [isMessagesPopoverOpen, setIsMessagesPopoverOpen] = useState<boolean>(false);

    // Notifications State
    const [notificationsEl, setNotificationsEl] = useState<HTMLElement | null>(null);
    const [isNotificationsPopoverOpen, setIsNotificationsPopoverOpen] = useState<boolean>(false);

    return {
        profileUser: {
            element: profileUserEl,
            isOpen: isProfileUserPopoverOpen,
            handleClick: (e: React.MouseEvent<HTMLElement>) => {
                setProfileUserEl(e.currentTarget);
                setIsProfileUserPopoverOpen(true);
            },
            handleClose: () => setIsProfileUserPopoverOpen(false)
        },
        likes: {
            element: likesEl,
            isOpen: isLikesPopoverOpen,
            handleClick: (e: React.MouseEvent<HTMLElement>) => {
                setLikesEl(e.currentTarget);
                setIsLikesPopoverOpen(true);
            },
            handleClose: () => setIsLikesPopoverOpen(false)
        },
        messages: {
            element: messagesEl,
            isOpen: isMessagesPopoverOpen,
            handleClick: (e: React.MouseEvent<HTMLElement>) => {
                setMessagesEl(e.currentTarget);
                setIsMessagesPopoverOpen(true);
            },
            handleClose: () => setIsMessagesPopoverOpen(false)
        },
        notifications: {
            element: notificationsEl,
            isOpen: isNotificationsPopoverOpen,
            handleClick: (e: React.MouseEvent<HTMLElement>) => {
                setNotificationsEl(e.currentTarget);
                setIsNotificationsPopoverOpen(true);
            },
            handleClose: () => setIsNotificationsPopoverOpen(false)
        }
    };
} 