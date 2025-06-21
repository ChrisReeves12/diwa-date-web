// WebSocket Event Types

export interface ServerToClientEvents {
    // Connection events
    'connection:success': (data: { userId: string; sessionId: string }) => void;

    // User presence events
    'user:online': (data: { userId: string; timestamp: Date }) => void;
    'user:offline': (data: { userId: string; timestamp: Date }) => void;
    'presence:update': (data: { onlineUsers: string[] }) => void;

    // Notification events
    'notification:new': (data: {
        id: string;
        type: string;
        title: string;
        message: string;
        userId: string;
        timestamp: Date;
        data?: any;
    }) => void;
    'notification:read': (data: { notificationId: string }) => void;

    // Message events
    'message:new': (data: {
        id: string;
        conversationId: string;
        senderId: string;
        content: string;
        timestamp: Date;
    }) => void;
    'message:typing': (data: {
        userId: string;
        conversationId: string;
        isTyping: boolean;
    }) => void;
    'message:read': (data: {
        messageId: string;
        conversationId: string;
        readBy: string;
        timestamp: Date;
    }) => void;

    // Match events
    'match:new': (data: {
        matchId: string;
        userId: string;
        matchedUserId: string;
        timestamp: Date;
    }) => void;
    'match:unmatch': (data: {
        matchId: string;
        userId: string;
        unmatchedUserId: string;
    }) => void;

    // Error events
    'error': (data: { message: string; code?: string }) => void;
}

export interface ClientToServerEvents {
    // Authentication
    'auth:verify': (callback: (response: { success: boolean; error?: string }) => void) => void;

    // Presence
    'presence:join': (data: { userId: string }) => void;
    'presence:leave': (data: { userId: string }) => void;
    'presence:get': (callback: (users: string[]) => void) => void;

    // Messages
    'message:send': (data: {
        conversationId: string;
        content: string;
    }, callback: (response: { success: boolean; messageId?: string; error?: string }) => void) => void;
    'message:typing:start': (data: { conversationId: string }) => void;
    'message:typing:stop': (data: { conversationId: string }) => void;
    'message:markRead': (data: { messageId: string; conversationId: string }) => void;

    // Notifications
    'notification:markRead': (data: { notificationId: string }) => void;
    'notification:markAllRead': () => void;

    // Room management
    'room:join': (data: { roomId: string }) => void;
    'room:leave': (data: { roomId: string }) => void;
}

export interface InterServerEvents {
    // Events for communication between Socket.IO servers via RabbitMQ
    ping: () => void;
}

export interface SocketData {
    userId: string;
    sessionId: string;
    joinedRooms: Set<string>;
} 