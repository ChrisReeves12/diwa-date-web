"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = NotificationIconsContainer;
const notification_icon_1 = __importDefault(require("../notification-icon/notification-icon"));
function NotificationIconsContainer({ notificationsData, onLikesClick, onMessagesClick, onNotificationsClick, disabled = false, error = null, hasNewMatch = false, hasNewMessage = false, hasNewNotification = false }) {
    return (<div className="notification-container">
            <notification_icon_1.default lightIcon="/images/heart.svg" darkIcon="/images/heart-dark.svg" title="Matches" alt="Matches" onClick={onLikesClick} count={notificationsData === null || notificationsData === void 0 ? void 0 : notificationsData.pendingMatchesCount} disabled={disabled} errorMessage={error ? `Error loading notifications: ${error}` : undefined} hasNewNotification={hasNewMatch}/>
            <notification_icon_1.default lightIcon="/images/messages.svg" darkIcon="/images/messages-dark.svg" title="Messages" alt="Messages" onClick={onMessagesClick} count={notificationsData === null || notificationsData === void 0 ? void 0 : notificationsData.receivedMessagesCount} disabled={disabled} errorMessage={error ? `Error loading notifications: ${error}` : undefined} hasNewNotification={hasNewMessage}/>
            <notification_icon_1.default lightIcon="/images/bell.svg" darkIcon="/images/bell-dark.svg" title="Notifications" alt="Notifications" onClick={onNotificationsClick} count={notificationsData === null || notificationsData === void 0 ? void 0 : notificationsData.notificationCount} disabled={disabled} errorMessage={error ? `Error loading notifications: ${error}` : undefined} hasNewNotification={hasNewNotification}/>
        </div>);
}
//# sourceMappingURL=notification-icons-container.jsx.map