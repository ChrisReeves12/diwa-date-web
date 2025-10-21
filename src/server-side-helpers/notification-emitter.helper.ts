import { Rabbitmq } from "@/lib/rabbitmq";
import { MessageCategory } from "../../types/websocket-events.types";

export interface MatchNotificationData {
    id: number;
    status?: string;
    sender: {
        id: number;
        locationName: string;
        gender: string;
        displayName: string;
        mainPhotoCroppedImageData?: any;
        publicMainPhoto?: string;
        age: number;
    };
}

export interface MessageNotificationData {
    id: string;
    matchId: string;
    content: string;
    userId: string;
    displayName: string;
    userGender: string;
    publicMainPhoto?: string;
    mainPhotoCroppedImageData?: any;
    age: number;
    timestamp: number;
    createdAt: Date;
}

export interface NotificationData {
    id: number;
    sender: {
        id: number;
        locationName: string;
        gender: string;
        displayName: string;
        mainPhotoCroppedImageData?: any;
        publicMainPhoto?: string;
        age: number;
    };
}


/**
 * Emit a new match notification to a specific user
 */
export async function emitNewMatchNotification(userId: number, matchData: MatchNotificationData): Promise<void> {
    await emitToUser(userId, 'match', 'match:new', matchData);
}

/**
 * Emit a new message notification to a specific user
 */
export async function emitNewMessageNotification(userId: number, messageData: MessageNotificationData): Promise<void> {
    await emitToUser(userId, 'message', 'message:new', messageData);
}

/**
 * Emit a general notification to a specific user
 */
export async function emitNewNotification(userId: number, notificationData: NotificationData): Promise<void> {
    await emitToUser(userId, 'notification', 'notification:new', notificationData);
}

/**
 * Emit message read event
 */
export async function emitMessageRead(userId: number, data: { messageId: string; conversationId: string; readBy: string; timestamp: Date }): Promise<void> {
    await emitToUser(userId, 'message', 'message:read', data);
}

/**
 * Emit message typing indicator
 */
export async function emitMessageTyping(userId: number, data: { typingBy: string; timestamp: Date }): Promise<void> {
    await emitToUser(userId, 'message', 'message:typing', data);
}

/**
 * Emit match canceled/removed notification to a specific user
 */
export async function emitMatchCanceled(userId: number, matchData: { id: number; canceledBy: number }): Promise<void> {
    await emitToUser(userId, 'match', 'match:cancel', matchData);
}

/**
 * Emit user blocked notification to a specific user
 */
export async function emitUserBlocked(userId: number, blockData: { blockedUserId: number; blockedBy: number; timestamp: Date }): Promise<void> {
    await emitToUser(userId, 'account', 'account:blocked', blockData);
}

/**
 * Emit user unblocked notification to a specific user
 */
export async function emitUserUnblocked(userId: number, unblockData: { unblockedUserId: number; unblockedBy: number; timestamp: Date }): Promise<void> {
    await emitToUser(userId, 'account', 'account:unblocked', unblockData);
}

/**
 * Emit an account message to a specific user
 */
export async function emitAccountMessage(userId: number, accountMessageData: { noticeType: string, message: string, data?: any }) {
    await emitToUser(userId, 'account', 'account:message', accountMessageData);
}

/**
 * Emit a user message to the message queue.
 * @param userId
 * @param category
 * @param eventLabel
 * @param data
 */
export async function emitToUser(userId: number, category: MessageCategory, eventLabel: string, data: any) {
    const rabbitMQ = Rabbitmq.getInstance();
    await rabbitMQ.connect();

    await rabbitMQ.publishToUser(userId, {
        eventLabel,
        category: category,
        payload: data
    });
}
