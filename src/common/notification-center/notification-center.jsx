"use strict";
'use client';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = NotificationCenter;
require("./notification-center.scss");
const user_photo_display_1 = __importDefault(require("@/common/user-photo-display/user-photo-display"));
const material_1 = require("@mui/material");
const user_profile_account_menu_1 = __importDefault(require("./user-profile-account-menu/user-profile-account-menu"));
const React = __importStar(require("react"));
const react_1 = require("react");
const current_user_context_1 = require("../context/current-user-context");
const util_1 = require("@/util");
const lodash_1 = __importDefault(require("lodash"));
const notifications_actions_1 = require("@/common/server-actions/notifications.actions");
const use_notification_popovers_1 = require("./hooks/use-notification-popovers");
const notification_icons_container_1 = __importDefault(require("./notification-icons-container/notification-icons-container"));
const notification_popover_1 = __importDefault(require("./notification-popover/notification-popover"));
const user_profile_actions_1 = require("../server-actions/user-profile.actions");
const navigation_1 = require("next/navigation");
const use_websocket_1 = require("@/hooks/use-websocket");
function NotificationCenter() {
    const currentUser = (0, current_user_context_1.useCurrentUser)();
    const [notificationsData, setNotificationsData] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [newNotificationAnimations, setNewNotificationAnimations] = (0, react_1.useState)({});
    const popovers = (0, use_notification_popovers_1.useNotificationPopovers)();
    const router = (0, navigation_1.useRouter)();
    const pathname = (0, navigation_1.usePathname)();
    const { on, off, isConnected } = (0, use_websocket_1.useWebSocket)();
    const notificationTimeoutRefs = (0, react_1.useRef)(new Map());
    const profileButtonRef = (0, react_1.useRef)(null);
    // Compute which categories have new notifications
    const hasNewMatch = (0, react_1.useMemo)(() => {
        return Object.keys(newNotificationAnimations).some(key => key.startsWith('match-'));
    }, [newNotificationAnimations]);
    const hasNewMessage = (0, react_1.useMemo)(() => {
        return Object.keys(newNotificationAnimations).some(key => key.startsWith('message-'));
    }, [newNotificationAnimations]);
    const hasNewNotification = (0, react_1.useMemo)(() => {
        return Object.keys(newNotificationAnimations).some(key => key.startsWith('notification-'));
    }, [newNotificationAnimations]);
    // Handle new notification with animation
    const addNotificationAnimation = (0, react_1.useCallback)((notificationId, type) => {
        // Set animation state
        setNewNotificationAnimations(prev => (Object.assign(Object.assign({}, prev), { [`${type}-${notificationId}`]: true })));
        // Remove animation after delay
        const timeoutId = setTimeout(() => {
            setNewNotificationAnimations(prev => {
                const newState = Object.assign({}, prev);
                delete newState[`${type}-${notificationId}`];
                return newState;
            });
            notificationTimeoutRefs.current.delete(`${type}-${notificationId}`);
        }, 3000); // Animation duration
        notificationTimeoutRefs.current.set(`${type}-${notificationId}`, timeoutId);
    }, []);
    // Refetch notification data from server
    const refetchNotificationData = (0, react_1.useCallback)(async () => {
        if (!currentUser)
            return;
        try {
            const data = await (0, notifications_actions_1.loadNotificationCenterData)(currentUser);
            setNotificationsData(data);
        }
        catch (err) {
            console.error('Error refetching notification data:', err);
        }
    }, [currentUser]);
    // Trigger refetch with animation
    const triggerRefetch = (0, react_1.useCallback)((eventType) => {
        console.log(`Triggering refetch for event type: ${eventType}`);
        // Trigger animation immediately for visual feedback
        addNotificationAnimation(String(Date.now()), eventType);
        // Refetch data from server
        refetchNotificationData();
    }, [addNotificationAnimation, refetchNotificationData]);
    // Real-time notification handlers (simplified)
    (0, react_1.useEffect)(() => {
        if (!isConnected || !currentUser)
            return;
        // Handle new match notification - simplified to refetch trigger
        const handleNewMatch = () => {
            console.log('New match signal received - triggering refetch');
            triggerRefetch('match');
        };
        // Handle new message notification
        const handleNewMessage = (data) => {
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
    (0, react_1.useEffect)(() => {
        const handleMessagesRead = () => {
            console.log('messages-read event received, refetching notification data.');
            refetchNotificationData();
        };
        window.addEventListener('messages-read', handleMessagesRead);
        return () => {
            window.removeEventListener('messages-read', handleMessagesRead);
        };
    }, [refetchNotificationData]);
    (0, react_1.useEffect)(() => {
        if (!currentUser) {
            setIsLoading(false);
            return;
        }
        const loadData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const data = await (0, notifications_actions_1.loadNotificationCenterData)(currentUser);
                setNotificationsData(data);
            }
            catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load notifications');
                console.error('Error loading notification center data:', err);
            }
            finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [currentUser]);
    const handleMessagesClick = (e) => {
        var _a;
        if (((_a = notificationsData === null || notificationsData === void 0 ? void 0 : notificationsData.receivedMessages) === null || _a === void 0 ? void 0 : _a.length) === 0) {
            router.push('/messages');
        }
        else {
            popovers.messages.handleClick(e);
        }
    };
    const handleLikesClick = (e) => {
        var _a;
        if (((_a = notificationsData === null || notificationsData === void 0 ? void 0 : notificationsData.pendingMatches) === null || _a === void 0 ? void 0 : _a.length) === 0) {
            router.push('/likes');
        }
        else {
            popovers.likes.handleClick(e);
        }
    };
    if (!currentUser) {
        return null;
    }
    if (isLoading) {
        return (<div>Please wait...</div>);
    }
    if (error) {
        return (<div className="notification-center-error">
                An error occurred while loading notification center. Please try again later.
            </div>);
    }
    if (!notificationsData) {
        return null;
    }
    return (<>
            <div className="notification-center-container">
                <notification_icons_container_1.default notificationsData={notificationsData} onLikesClick={handleLikesClick} onMessagesClick={handleMessagesClick} onNotificationsClick={(e) => {
            popovers.notifications.handleClick(e);
            (0, notifications_actions_1.markMatchNotificationsAsRead)(currentUser, notificationsData === null || notificationsData === void 0 ? void 0 : notificationsData.receivedNotifications)
                .then((newNotificationCount) => setNotificationsData(Object.assign(Object.assign({}, notificationsData), {
                notificationCount: newNotificationCount
            })));
        }} hasNewMatch={hasNewMatch} hasNewMessage={hasNewMessage} hasNewNotification={hasNewNotification}/>
                <div className="profile-user">
                    <button ref={profileButtonRef} onClick={(e) => {
            // Use the ref instead of the event target to ensure stable anchor reference
            if (profileButtonRef.current) {
                popovers.profileUser.handleClick(Object.assign(Object.assign({}, e), { currentTarget: profileButtonRef.current }));
            }
        }} className="profile-container">
                        <user_photo_display_1.default gender={currentUser.gender} croppedImageData={currentUser.mainPhotoCroppedImageData} imageUrl={currentUser.publicMainPhoto}/>
                        <div className="profile-name-container">
                            <h5>{currentUser.displayName}</h5>
                            <h6>My Account</h6>
                        </div>
                    </button>
                </div>
            </div>
            <material_1.Popover anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} id="profile-user-account-popover" anchorEl={profileButtonRef.current} onClose={popovers.profileUser.handleClose} open={popovers.profileUser.isOpen}>
                <user_profile_account_menu_1.default onSelectionMade={popovers.profileUser.handleClose}/>
            </material_1.Popover>

            <notification_popover_1.default id="likes-popover" anchorEl={popovers.likes.element} open={popovers.likes.isOpen} onClose={popovers.likes.handleClose} titleIcon="/images/blue-heart.svg" titleIconDark="/images/white-heart.svg" title="Likes" listItems={((notificationsData === null || notificationsData === void 0 ? void 0 : notificationsData.pendingMatches) || []).map(pendingMatch => ({
            id: pendingMatch.id,
            content: pendingMatch.sender.locationName,
            senderUser: pendingMatch.sender,
            receivedAtMessage: `Received ${pendingMatch.receivedAtHumanized}`,
            infoSectionUrl: (0, util_1.userProfileLink)(pendingMatch.sender),
            userPhotoUrl: (0, util_1.userProfileLink)(pendingMatch.sender),
            onLike: () => {
                (0, user_profile_actions_1.sendUserMatch)(pendingMatch.sender.id).then(() => {
                    return (0, notifications_actions_1.loadNotificationCenterData)(currentUser);
                }).then((aData) => setNotificationsData(aData));
            },
            onPass: () => {
                (0, user_profile_actions_1.muteUser)(pendingMatch.sender.id).then(() => {
                    return (0, notifications_actions_1.loadNotificationCenterData)(currentUser);
                }).then((aData) => setNotificationsData(aData));
            },
            type: "likes"
        }))}/>

            <notification_popover_1.default id="messages-popover" anchorEl={popovers.messages.element} open={popovers.messages.isOpen} onClose={popovers.messages.handleClose} titleIcon="/images/blue-messages.svg" titleIconDark="/images/white-messages.svg" title="Messages" listItems={((notificationsData === null || notificationsData === void 0 ? void 0 : notificationsData.receivedMessages) || []).map(receivedMessage => ({
            id: receivedMessage.id,
            content: lodash_1.default.truncate(receivedMessage.content),
            senderUser: {
                displayName: receivedMessage.displayName,
                gender: receivedMessage.userGender,
                publicMainPhoto: receivedMessage.publicMainPhoto,
                mainPhotoCroppedImageData: receivedMessage.mainPhotoCroppedImageData,
                age: receivedMessage.age
            },
            receivedAtMessage: `Sent ${receivedMessage.sentAtHumanized}`,
            infoSectionUrl: `/messages/${receivedMessage.matchId}`,
            userPhotoUrl: (0, util_1.userProfileLink)({ id: receivedMessage.userId }),
            numberOfMessages: receivedMessage.msgCount,
            type: 'messages'
        }))}/>

            <notification_popover_1.default id="notifications-popover" anchorEl={popovers.notifications.element} open={popovers.notifications.isOpen} onClose={popovers.notifications.handleClose} titleIcon="/images/blue-bell.svg" titleIconDark="/images/white-bell.svg" title="Notifications" listItems={((notificationsData === null || notificationsData === void 0 ? void 0 : notificationsData.receivedNotifications) || []).map(notification => ({
            id: notification.id,
            content: "",
            senderUser: notification.sender,
            receivedAtMessage: "",
            infoSectionUrl: "",
            userPhotoUrl: "",
            type: "notifications"
        }))}/>
        </>);
}
//# sourceMappingURL=notification-center.jsx.map