import { emitToUser } from '@/websocket/services/websocket-helper';

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

/**
 * Emit a new match notification to a specific user
 */
export async function emitNewMatchNotification(userId: string, matchData: MatchNotificationData): Promise<void> {
    console.log(`Emitting new match notification to user ${userId}`, matchData);
    await emitToUser(userId, 'match:new', matchData);
}

/**
 * Emit a new message notification to a specific user
 */
export async function emitNewMessageNotification(userId: string, messageData: MessageNotificationData): Promise<void> {
    console.log(`Emitting new message notification to user ${userId}`, messageData);
    await emitToUser(userId, 'message:new', messageData);
}

/**
 * Emit a general notification to a specific user
 */
export async function emitNewNotification(userId: string, notificationData: NotificationData): Promise<void> {
    console.log(`Emitting new notification to user ${userId}`, notificationData);
    await emitToUser(userId, 'notification:new', notificationData);
}

/**
 * Emit notification read event
 */
export async function emitNotificationRead(userId: string, notificationId: number): Promise<void> {
    console.log(`Emitting notification read event to user ${userId} for notification ${notificationId}`);
    await emitToUser(userId, 'notification:read', { notificationId });
}

/**
 * Emit message read event
 */
export async function emitMessageRead(userId: string, data: { messageId: string; conversationId: string; readBy: string; timestamp: Date }): Promise<void> {
    console.log(`Emitting message read event to user ${userId}`, data);
    await emitToUser(userId, 'message:read', data);
}

/**
 * Emit match cancelled/removed notification to a specific user
 */
export async function emitMatchCancelled(userId: string, matchData: { matchId: number; cancelledBy: number }): Promise<void> {
    console.log(`Emitting match cancelled notification to user ${userId}`, matchData);
    await emitToUser(userId, 'match:cancelled', matchData);
}

/**
 * Emit user blocked notification to a specific user
 */
export async function emitUserBlocked(userId: string, blockData: { blockedUserId: number; blockedBy: number; timestamp: Date }): Promise<void> {
    console.log(`Emitting user blocked notification to user ${userId}`, blockData);
    await emitToUser(userId, 'user:blocked', blockData);
}

/**
 * Emit user unblocked notification to a specific user
 */
export async function emitUserUnblocked(userId: string, unblockData: { unblockedUserId: number; unblockedBy: number; timestamp: Date }): Promise<void> {
    console.log(`Emitting user unblocked notification to user ${userId}`, unblockData);
    await emitToUser(userId, 'user:unblocked', unblockData);
}
