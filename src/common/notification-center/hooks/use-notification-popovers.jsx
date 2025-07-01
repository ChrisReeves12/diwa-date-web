"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useNotificationPopovers = useNotificationPopovers;
const react_1 = require("react");
function useNotificationPopovers() {
    // Profile User State
    const [profileUserEl, setProfileUserEl] = (0, react_1.useState)(null);
    const [isProfileUserPopoverOpen, setIsProfileUserPopoverOpen] = (0, react_1.useState)(false);
    // Likes State
    const [likesEl, setLikesEl] = (0, react_1.useState)(null);
    const [isLikesPopoverOpen, setIsLikesPopoverOpen] = (0, react_1.useState)(false);
    // Messages State
    const [messagesEl, setMessagesEl] = (0, react_1.useState)(null);
    const [isMessagesPopoverOpen, setIsMessagesPopoverOpen] = (0, react_1.useState)(false);
    // Notifications State
    const [notificationsEl, setNotificationsEl] = (0, react_1.useState)(null);
    const [isNotificationsPopoverOpen, setIsNotificationsPopoverOpen] = (0, react_1.useState)(false);
    return {
        profileUser: {
            element: profileUserEl,
            isOpen: isProfileUserPopoverOpen,
            handleClick: (e) => {
                setProfileUserEl(e.currentTarget);
                setIsProfileUserPopoverOpen(true);
            },
            handleClose: () => setIsProfileUserPopoverOpen(false)
        },
        likes: {
            element: likesEl,
            isOpen: isLikesPopoverOpen,
            handleClick: (e) => {
                setLikesEl(e.currentTarget);
                setIsLikesPopoverOpen(true);
            },
            handleClose: () => setIsLikesPopoverOpen(false)
        },
        messages: {
            element: messagesEl,
            isOpen: isMessagesPopoverOpen,
            handleClick: (e) => {
                setMessagesEl(e.currentTarget);
                setIsMessagesPopoverOpen(true);
            },
            handleClose: () => setIsMessagesPopoverOpen(false)
        },
        notifications: {
            element: notificationsEl,
            isOpen: isNotificationsPopoverOpen,
            handleClick: (e) => {
                setNotificationsEl(e.currentTarget);
                setIsNotificationsPopoverOpen(true);
            },
            handleClose: () => setIsNotificationsPopoverOpen(false)
        }
    };
}
//# sourceMappingURL=use-notification-popovers.jsx.map