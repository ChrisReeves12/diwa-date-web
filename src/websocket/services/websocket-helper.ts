import { SocketIOService } from './socketio.service';
import { RabbitMQService } from './rabbitmq.service';

/**
 * Get WebSocket services from the global context
 * This is used in API routes and server actions to emit events
 */
export function getWebSocketServices(): {
    socketIO: SocketIOService | null;
    rabbitMQ: RabbitMQService | null;
} {
    const services = (global as any).websocketServices;

    if (!services) {
        console.warn('WebSocket services not initialized. Make sure you are running the custom server.');
        return {
            socketIO: null,
            rabbitMQ: null
        };
    }

    return services;
}

/**
 * Emit an event to a specific user
 */
export async function emitToUser(userId: string, event: string, data: any): Promise<void> {
    const { socketIO } = getWebSocketServices();

    if (!socketIO) {
        console.error('Socket.IO service not available');
        return;
    }

    await socketIO.emitToUser(userId, event as any, data);
}

/**
 * Emit an event to a room/conversation
 */
export async function emitToRoom(roomId: string, event: string, data: any): Promise<void> {
    const { socketIO } = getWebSocketServices();

    if (!socketIO) {
        console.error('Socket.IO service not available');
        return;
    }

    await socketIO.emitToRoom(roomId, event as any, data);
}

/**
 * Check if a user is currently connected
 */
export function isUserConnected(userId: string): boolean {
    const { socketIO } = getWebSocketServices();

    if (!socketIO) {
        return false;
    }

    return socketIO.isUserConnected(userId);
}

/**
 * Get list of all connected users
 */
export function getConnectedUsers(): string[] {
    const { socketIO } = getWebSocketServices();

    if (!socketIO) {
        return [];
    }

    return socketIO.getConnectedUsers();
} 