// WebSocket Event Types
export interface ServerToClientEvents {
    'connection:success': (data: { userId: string; sessionId: string }) => void;
    'event:notification': (data: WebSocketMessage) => void;
    'match:notification': (data: WebSocketMessage) => void;
    'account:notification': (data: WebSocketMessage) => void;
    'message:notification': (data: WebSocketMessage) => void;
}

export interface ClientToServerEvents {
    // Authentication
    'auth:verify': (callback: (response: { success: boolean; error?: string }) => void) => void;
}

export interface InterServerEvents {
    // Events for communication between Socket.IO servers via RabbitMQ
    ping: () => void;
}

export type MessageCategory = 'account' | 'message' | 'notification' | 'match';

export interface WebSocketMessage {
    id: string;
    eventLabel: string;
    userId: string;
    timestamp: Date;
    category: MessageCategory;
    payload: any
}
