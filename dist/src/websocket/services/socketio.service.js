"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketIOService = void 0;
const socket_io_1 = require("socket.io");
const logging_helpers_1 = require("../../server-side-helpers/logging.helpers");
const session_helpers_1 = require("../../server-side-helpers/session.helpers");
class SocketIOService {
    constructor(httpServer, rabbitMQ) {
        this.connectedUsers = new Map(); // userId -> Set of socketIds
        this.socketToUser = new Map(); // socketId -> userId
        this.rabbitMQ = rabbitMQ;
        this.io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
                credentials: true
            },
            transports: ['websocket', 'polling'],
            pingTimeout: 60000,
            pingInterval: 25000
        });
        this.setupMiddleware();
        this.setupEventHandlers();
        this.setupRabbitMQConsumer();
    }
    setupMiddleware() {
        // Authentication middleware
        this.io.use(async (socket, next) => {
            try {
                // Parse cookies from header
                const cookieHeader = socket.handshake.headers.cookie || '';
                const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
                    const [key, value] = cookie.trim().split('=');
                    if (key && value) {
                        acc[key] = decodeURIComponent(value);
                    }
                    return acc;
                }, {});
                // Get the session cookie name from environment or use default
                const sessionCookieName = process.env.SESSION_COOKIE_NAME || 'session_id';
                const sessionToken = cookies[sessionCookieName];
                if (!sessionToken) {
                    console.log('Available cookies:', Object.keys(cookies));
                    console.log(`Looking for cookie: ${sessionCookieName}`);
                    return next(new Error('Authentication required'));
                }
                const sessionData = await (0, session_helpers_1.getSessionData)(sessionToken);
                if (!sessionData || !sessionData.userId) {
                    return next(new Error('Invalid session'));
                }
                // Store user data in socket
                socket.data.userId = sessionData.userId;
                socket.data.sessionId = sessionToken;
                socket.data.joinedRooms = new Set();
                next();
            }
            catch (error) {
                (0, logging_helpers_1.log)(`Socket authentication error: ${error}`, 'error');
                next(new Error('Authentication failed'));
            }
        });
    }
    setupEventHandlers() {
        this.io.on('connection', async (socket) => {
            const userId = socket.data.userId;
            (0, logging_helpers_1.log)(`User ${userId} connected via socket ${socket.id}`, 'info');
            // Track connected user
            this.addConnectedUser(userId, socket.id);
            // Join user's personal room
            socket.join(`user:${userId}`);
            // Bind RabbitMQ queue for this user
            await this.rabbitMQ.bindUserQueue(userId);
            // Send connection success
            socket.emit('connection:success', {
                userId,
                sessionId: socket.data.sessionId
            });
            // Broadcast user online status
            await this.broadcastUserStatus(userId, true);
            // Set up event handlers
            this.setupSocketEventHandlers(socket);
            // Handle disconnect
            socket.on('disconnect', async () => {
                (0, logging_helpers_1.log)(`User ${userId} disconnected from socket ${socket.id}`, 'info');
                this.removeConnectedUser(userId, socket.id);
                // Check if user has no more connections
                if (!this.connectedUsers.has(userId)) {
                    // Unbind RabbitMQ queue
                    await this.rabbitMQ.unbindUserQueue(userId);
                    // Broadcast user offline status
                    await this.broadcastUserStatus(userId, false);
                }
            });
        });
    }
    setupSocketEventHandlers(socket) {
        const userId = socket.data.userId;
        // Authentication verification
        socket.on('auth:verify', (callback) => {
            callback({ success: true });
        });
        // Presence management
        socket.on('presence:get', async (callback) => {
            const onlineUsers = Array.from(this.connectedUsers.keys());
            callback(onlineUsers);
        });
        // Room management
        socket.on('room:join', async ({ roomId }) => {
            socket.join(roomId);
            socket.data.joinedRooms.add(roomId);
            // Bind RabbitMQ queue for room if it's a conversation
            if (roomId.startsWith('conversation:')) {
                await this.rabbitMQ.bindRoomQueue(roomId);
            }
        });
        socket.on('room:leave', async ({ roomId }) => {
            socket.leave(roomId);
            socket.data.joinedRooms.delete(roomId);
            // Check if any other sockets are in this room
            const room = this.io.sockets.adapter.rooms.get(roomId);
            if (!room || room.size === 0) {
                if (roomId.startsWith('conversation:')) {
                    await this.rabbitMQ.unbindRoomQueue(roomId);
                }
            }
        });
        // Message handling
        socket.on('message:send', async ({ conversationId, content }, callback) => {
            try {
                // Here you would normally save the message to database
                // For now, we'll just broadcast it
                const messageId = `msg_${Date.now()}`;
                const messageData = {
                    id: messageId,
                    conversationId,
                    senderId: userId,
                    content,
                    timestamp: new Date()
                };
                // Publish to RabbitMQ for other servers
                await this.rabbitMQ.publishToRoom(conversationId, 'message', messageData);
                // Emit to local sockets in the room
                this.io.to(`conversation:${conversationId}`).emit('message:new', messageData);
                callback({ success: true, messageId });
            }
            catch (error) {
                (0, logging_helpers_1.log)(`Error sending message: ${error}`, 'error');
                callback({ success: false, error: 'Failed to send message' });
            }
        });
        socket.on('message:typing:start', async ({ conversationId }) => {
            const typingData = {
                userId,
                conversationId,
                isTyping: true
            };
            // Publish to RabbitMQ
            await this.rabbitMQ.publishToRoom(conversationId, 'typing', typingData);
            // Emit to local sockets
            socket.to(`conversation:${conversationId}`).emit('message:typing', typingData);
        });
        socket.on('message:typing:stop', async ({ conversationId }) => {
            const typingData = {
                userId,
                conversationId,
                isTyping: false
            };
            // Publish to RabbitMQ
            await this.rabbitMQ.publishToRoom(conversationId, 'typing', typingData);
            // Emit to local sockets
            socket.to(`conversation:${conversationId}`).emit('message:typing', typingData);
        });
        // Notification handling
        socket.on('notification:markRead', async ({ notificationId }) => {
            // Here you would update the database
            // Then emit the update
            socket.emit('notification:read', { notificationId });
        });
    }
    setupRabbitMQConsumer() {
        this.rabbitMQ.startConsuming(async (message) => {
            try {
                if ('userId' in message) {
                    // User-specific message
                    const userMessage = message;
                    this.handleUserMessage(userMessage);
                }
                else if ('roomId' in message) {
                    // Room message
                    const roomMessage = message;
                    this.handleRoomMessage(roomMessage);
                }
                else {
                    // Broadcast message
                    const broadcastMessage = message;
                    this.handleBroadcastMessage(broadcastMessage);
                }
            }
            catch (error) {
                (0, logging_helpers_1.log)(`Error processing RabbitMQ message: ${error}`, 'error');
            }
        });
    }
    handleUserMessage(message) {
        const { userId, type, payload } = message;
        switch (type) {
            case 'notification':
                this.io.to(`user:${userId}`).emit('notification:new', payload);
                break;
            case 'message':
                this.io.to(`user:${userId}`).emit('message:new', payload);
                break;
            case 'match':
                this.io.to(`user:${userId}`).emit('match:new', payload);
                break;
        }
    }
    handleRoomMessage(message) {
        const { roomId, payload } = message;
        // Emit to all sockets in the room
        if (payload.type === 'message') {
            this.io.to(roomId).emit('message:new', payload.data);
        }
        else if (payload.type === 'typing') {
            this.io.to(roomId).emit('message:typing', payload.data);
        }
    }
    handleBroadcastMessage(message) {
        const { type, payload } = message;
        if (type === 'presence_update') {
            // Update local presence tracking if needed
            if (payload.action === 'online') {
                this.io.emit('user:online', {
                    userId: payload.userId,
                    timestamp: new Date()
                });
            }
            else if (payload.action === 'offline') {
                this.io.emit('user:offline', {
                    userId: payload.userId,
                    timestamp: new Date()
                });
            }
        }
    }
    addConnectedUser(userId, socketId) {
        if (!this.connectedUsers.has(userId)) {
            this.connectedUsers.set(userId, new Set());
        }
        this.connectedUsers.get(userId).add(socketId);
        this.socketToUser.set(socketId, userId);
    }
    removeConnectedUser(userId, socketId) {
        const userSockets = this.connectedUsers.get(userId);
        if (userSockets) {
            userSockets.delete(socketId);
            if (userSockets.size === 0) {
                this.connectedUsers.delete(userId);
            }
        }
        this.socketToUser.delete(socketId);
    }
    async broadcastUserStatus(userId, isOnline) {
        // Broadcast via RabbitMQ to other servers
        await this.rabbitMQ.broadcastPresence({
            action: isOnline ? 'online' : 'offline',
            userId,
            timestamp: new Date()
        });
        // Emit to local sockets
        const event = isOnline ? 'user:online' : 'user:offline';
        this.io.emit(event, {
            userId,
            timestamp: new Date()
        });
    }
    async emitToUser(userId, event, data) {
        // Emit to local sockets
        this.io.to(`user:${userId}`).emit(event, data);
        // Also publish to RabbitMQ for other servers
        await this.rabbitMQ.publishToUser(userId, {
            type: this.getMessageTypeFromEvent(event),
            payload: data
        });
    }
    async emitToRoom(roomId, event, data) {
        // Emit to local sockets
        this.io.to(roomId).emit(event, data);
        // Also publish to RabbitMQ for other servers
        await this.rabbitMQ.publishToRoom(roomId, event, data);
    }
    getMessageTypeFromEvent(event) {
        if (event.startsWith('notification:'))
            return 'notification';
        if (event.startsWith('message:'))
            return 'message';
        if (event.startsWith('match:'))
            return 'match';
        return 'presence';
    }
    getIO() {
        return this.io;
    }
    getConnectedUsers() {
        return Array.from(this.connectedUsers.keys());
    }
    isUserConnected(userId) {
        return this.connectedUsers.has(userId);
    }
}
exports.SocketIOService = SocketIOService;
//# sourceMappingURL=socketio.service.js.map