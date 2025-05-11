import {
    Notification,
    NotificationPendingMatch,
    NotificationReceivedMessage
} from "@/types/notification-response.interface";

export interface NotificationCenterData {
    pendingMatches: NotificationPendingMatch[];
    receivedMessages: NotificationReceivedMessage[];
    pendingMatchesCount: number;
    receivedMessagesCount: number;
    receivedNotifications: Notification[];
    notificationCount: number;
}
