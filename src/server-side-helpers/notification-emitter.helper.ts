import { Rabbitmq } from "@/lib/rabbitmq";

export interface MatchNotificationData {
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

type MessageType = 'notification' | 'message' | 'match' | 'presence';

/**
 * Emit a new match notification to a specific user
 */
export async function emitNewMatchNotification(userId: number, matchData: MatchNotificationData): Promise<void> {
    console.log(`Emitting new match notification to user ${userId}`, matchData);
    await emitToUser(userId, 'match', matchData);
}

/**
 * Emit a new message notification to a specific user
 */
export async function emitNewMessageNotification(userId: number, messageData: MessageNotificationData): Promise<void> {
    console.log(`Emitting new message notification to user ${userId}`, messageData);
    await emitToUser(userId, 'message', messageData);
}

/**
 * Emit a general notification to a specific user
 */
export async function emitNewNotification(userId: number, notificationData: NotificationData): Promise<void> {
    console.log(`Emitting new notification to user ${userId}`, notificationData);
    await emitToUser(userId, 'notification', notificationData);
}

/**
 * Emit notification read event
 */
export async function emitNotificationRead(userId: number, notificationId: number): Promise<void> {
    console.log(`Emitting notification read event to user ${userId} for notification ${notificationId}`);
    await emitToUser(userId, 'notification', { notificationId });
}

/**
 * Emit message read event
 */
export async function emitMessageRead(userId: number, data: { messageId: string; conversationId: string; readBy: string; timestamp: Date }): Promise<void> {
    console.log(`Emitting message read event to user ${userId}`, data);
    await emitToUser(userId, 'message', data);
}

/**
 * Emit match cancelled/removed notification to a specific user
 */
export async function emitMatchCancelled(userId: number, matchData: { matchId: number; cancelledBy: number }): Promise<void> {
    console.log(`Emitting match cancelled notification to user ${userId}`, matchData);
    await emitToUser(userId, 'match', matchData);
}

/**
 * Emit user blocked notification to a specific user
 */
export async function emitUserBlocked(userId: number, blockData: { blockedUserId: number; blockedBy: number; timestamp: Date }): Promise<void> {
    console.log(`Emitting user blocked notification to user ${userId}`, blockData);
    await emitToUser(userId, 'presence', blockData);
}

/**
 * Emit user unblocked notification to a specific user
 */
export async function emitUserUnblocked(userId: number, unblockData: { unblockedUserId: number; unblockedBy: number; timestamp: Date }): Promise<void> {
    console.log(`Emitting user unblocked notification to user ${userId}`, unblockData);
    await emitToUser(userId, 'presence', unblockData);
}

/**
 * Emit a user message to the message queue.
 * @param userId
 * @param messageType
 * @param data
 */
export async function emitToUser(userId: number, messageType: MessageType, data: any) {
    const rabbitMQ = Rabbitmq.getInstance();
    await rabbitMQ.connect();

    await rabbitMQ.publishToUser(userId, {
        type: messageType,
        payload: data
    });
}
