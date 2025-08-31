// WebSocket Event Types
export interface ServerToClientEvents {
    'connection:success': (data: { userId: string; sessionId: string }) => void;
    'event:notification': (data: { eventLabel: string, payload: any }) => void;
    'match:notification': (data: { eventLabel: string, payload: any }) => void;
    'account:notification': (data: { eventLabel: string, payload: any }) => void;
    'message:notification': (data: { eventLabel: string, payload: any }) => void;
    'error': (data: { message: string; code?: string }) => void;
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
