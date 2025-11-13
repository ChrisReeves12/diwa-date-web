import NotificationIcon from '../notification-icon/notification-icon';
import { NotificationCenterData } from '@/types/notification-center-data.interface';

interface NotificationIconsContainerProps {
    notificationsData?: NotificationCenterData | null;
    onLikesClick?: (e: React.MouseEvent<HTMLElement>) => void;
    onMessagesClick?: (e: React.MouseEvent<HTMLElement>) => void;
    onNotificationsClick?: (e: React.MouseEvent<HTMLElement>) => void;
    disabled?: boolean;
    error?: string | null;
    hasNewMatch?: boolean;
    hasNewMessage?: boolean;
    hasNewNotification?: boolean;
}

export default function NotificationIconsContainer({
    notificationsData,
    onLikesClick,
    onMessagesClick,
    onNotificationsClick,
    disabled = false,
    error = null,
    hasNewMatch = false,
    hasNewMessage = false,
    hasNewNotification = false
}: NotificationIconsContainerProps) {
    return (
        <div className="notification-container">
            <NotificationIcon
                lightIcon="/images/heart.svg"
                darkIcon="/images/heart-dark.svg"
                title="Matches"
                alt="Matches"
                onClick={onLikesClick}
                count={notificationsData?.pendingMatchesCount}
                disabled={disabled}
                errorMessage={error ? `Error loading notifications: ${error}` : undefined}
                hasNewNotification={hasNewMatch}
            />
            <NotificationIcon
                lightIcon="/images/messages.svg"
                darkIcon="/images/messages-dark.svg"
                title="Messages"
                alt="Messages"
                onClick={onMessagesClick}
                count={notificationsData?.receivedMessagesCount}
                disabled={disabled}
                errorMessage={error ? `Error loading notifications: ${error}` : undefined}
                hasNewNotification={hasNewMessage}
            />
            <NotificationIcon
                lightIcon="/images/bell.svg"
                darkIcon="/images/bell-dark.svg"
                title="Notifications"
                alt="Notifications"
                onClick={onNotificationsClick}
                count={notificationsData?.notificationCount}
                disabled={disabled}
                errorMessage={error ? `Error loading notifications: ${error}` : undefined}
                hasNewNotification={hasNewNotification}
            />
        </div>
    );
} 