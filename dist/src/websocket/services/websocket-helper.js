"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebSocketServices = getWebSocketServices;
exports.emitToUser = emitToUser;
exports.emitToRoom = emitToRoom;
exports.isUserConnected = isUserConnected;
exports.getConnectedUsers = getConnectedUsers;
/**
 * Get WebSocket services from the global context
 * This is used in API routes and server actions to emit events
 */
function getWebSocketServices() {
    const services = global.websocketServices;
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
async function emitToUser(userId, event, data) {
    const { socketIO } = getWebSocketServices();
    if (!socketIO) {
        console.error('Socket.IO service not available');
        return;
    }
    await socketIO.emitToUser(userId, event, data);
}
/**
 * Emit an event to a room/conversation
 */
async function emitToRoom(roomId, event, data) {
    const { socketIO } = getWebSocketServices();
    if (!socketIO) {
        console.error('Socket.IO service not available');
        return;
    }
    await socketIO.emitToRoom(roomId, event, data);
}
/**
 * Check if a user is currently connected
 */
function isUserConnected(userId) {
    const { socketIO } = getWebSocketServices();
    if (!socketIO) {
        return false;
    }
    return socketIO.isUserConnected(userId);
}
/**
 * Get list of all connected users
 */
function getConnectedUsers() {
    const { socketIO } = getWebSocketServices();
    if (!socketIO) {
        return [];
    }
    return socketIO.getConnectedUsers();
}
//# sourceMappingURL=websocket-helper.js.map