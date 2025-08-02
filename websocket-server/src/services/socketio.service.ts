import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import {
    ServerToClientEvents,
    ClientToServerEvents,
    InterServerEvents,
    SocketData
} from '../types/websocket-events.types';
import { RabbitMQService } from './rabbitmq.service';
import { AuthService } from './auth.service';
import { RabbitMQMessage, UserMessage, BroadcastMessage, RoomMessage } from '../types/rabbitmq.types';
import { ServerConfig } from '../config/server.config';

export class SocketIOService {
    private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
    private rabbitMQ: RabbitMQService;
    private authService: AuthService;
    private connectedUsers: Map<string, Set<string>> = new Map();
    private socketToUser: Map<string, string> = new Map();

    constructor(httpServer: HttpServer, rabbitMQ: RabbitMQService, authService: AuthService, config: ServerConfig) {
        this.rabbitMQ = rabbitMQ;
        this.authService = authService;

        this.io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
            cors: config.cors,
            transports: ['websocket', 'polling'],
            pingTimeout: 60000,
            pingInterval: 25000
        });

        this.setupMiddleware(config);
        this.setupEventHandlers();
        this.setupRabbitMQConsumer();
    }

    private setupMiddleware(config: ServerConfig): void {
        this.io.use(async (socket, next) => {
            try {
                let sessionToken: string | undefined;

                // First, try to get token from auth object (Socket.IO auth)
                if (socket.handshake.auth && socket.handshake.auth.token) {
                    sessionToken = socket.handshake.auth.token;
                } else {
                    // Fallback to cookies if available
                    const cookieHeader = socket.handshake.headers.cookie || '';
                    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
                        const [key, value] = cookie.trim().split('=');
                        if (key && value) {
                            acc[key] = decodeURIComponent(value);
                        }
                        return acc;
                    }, {} as Record<string, string>);

                    sessionToken = cookies[config.auth.sessionCookieName];
                    if (sessionToken) {
                        console.log('Using session token from cookies');
                    }
                }

                if (!sessionToken) {
                    console.log('No session token found in auth or cookies');
                    return next(new Error('Authentication required'));
                }

                const sessionData = await this.authService.validateSession(sessionToken);
                if (!sessionData || !sessionData.userId) {
                    return next(new Error('Invalid session'));
                }

                socket.data.userId = sessionData.userId;
                socket.data.sessionId = sessionToken;
                socket.data.joinedRooms = new Set();

                next();
            } catch (error) {
                console.error(`Socket authentication error: ${error}`);
                next(new Error('Authentication failed'));
            }
        });
    }

    private setupEventHandlers(): void {
        this.io.on('connection', async (socket) => {
            const userId = socket.data.userId;
            console.log(`User ${userId} connected via socket ${socket.id}`);

            this.addConnectedUser(userId, socket.id);
            socket.join(`user:${userId}`);
            await this.rabbitMQ.bindUserQueue(userId);

            socket.emit('connection:success', {
                userId,
                sessionId: socket.data.sessionId
            });

            await this.broadcastUserStatus(userId, true);

            this.setupSocketEventHandlers(socket);

            socket.on('disconnect', async () => {
                console.log(`User ${userId} disconnected from socket ${socket.id}`);

                this.removeConnectedUser(userId, socket.id);

                if (!this.connectedUsers.has(userId)) {
                    await this.rabbitMQ.unbindUserQueue(userId);
                    await this.broadcastUserStatus(userId, false);
                }
            });
        });
    }

    private setupSocketEventHandlers(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>): void {
        const userId = socket.data.userId;

        socket.on('auth:verify', (callback) => {
            callback({ success: true });
        });

        socket.on('presence:get', async (callback) => {
            const onlineUsers = Array.from(this.connectedUsers.keys());
            callback(onlineUsers);
        });

        socket.on('room:join', async ({ roomId }) => {
            socket.join(roomId);
            socket.data.joinedRooms.add(roomId);

            if (roomId.startsWith('conversation:')) {
                await this.rabbitMQ.bindRoomQueue(roomId);
            }
        });

        socket.on('room:leave', async ({ roomId }) => {
            socket.leave(roomId);
            socket.data.joinedRooms.delete(roomId);

            const room = this.io.sockets.adapter.rooms.get(roomId);
            if (!room || room.size === 0) {
                if (roomId.startsWith('conversation:')) {
                    await this.rabbitMQ.unbindRoomQueue(roomId);
                }
            }
        });

        socket.on('message:send', async ({ conversationId, content }, callback) => {
            try {
                const messageId = `msg_${Date.now()}`;

                const messageData = {
                    id: messageId,
                    conversationId,
                    senderId: userId,
                    content,
                    timestamp: new Date()
                };

                await this.rabbitMQ.publishToRoom(conversationId, 'message', messageData);
                this.io.to(`conversation:${conversationId}`).emit('message:new', messageData);

                callback({ success: true, messageId });
            } catch (error) {
                console.error(`Error sending message: ${error}`);
                callback({ success: false, error: 'Failed to send message' });
            }
        });

        socket.on('message:typing:start', async ({ conversationId }) => {
            const typingData = {
                userId,
                conversationId,
                isTyping: true
            };

            await this.rabbitMQ.publishToRoom(conversationId, 'typing', typingData);
            socket.to(`conversation:${conversationId}`).emit('message:typing', typingData);
        });

        socket.on('message:typing:stop', async ({ conversationId }) => {
            const typingData = {
                userId,
                conversationId,
                isTyping: false
            };

            await this.rabbitMQ.publishToRoom(conversationId, 'typing', typingData);
            socket.to(`conversation:${conversationId}`).emit('message:typing', typingData);
        });

        socket.on('notification:markRead', async ({ notificationId }) => {
            socket.emit('notification:read', { notificationId });
        });
    }

    private setupRabbitMQConsumer(): void {
        this.rabbitMQ.startConsuming(async (message: RabbitMQMessage) => {
            try {
                if ('userId' in message) {
                    const userMessage = message as UserMessage;
                    this.handleUserMessage(userMessage);
                } else if ('roomId' in message) {
                    const roomMessage = message as RoomMessage;
                    this.handleRoomMessage(roomMessage);
                } else {
                    const broadcastMessage = message as BroadcastMessage;
                    this.handleBroadcastMessage(broadcastMessage);
                }
            } catch (error) {
                console.error(`Error processing RabbitMQ message: ${error}`);
            }
        });
    }

    private handleUserMessage(message: UserMessage): void {
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

    private handleRoomMessage(message: RoomMessage): void {
        const { roomId, payload } = message;

        if (payload.type === 'message') {
            this.io.to(roomId).emit('message:new', payload.data);
        } else if (payload.type === 'typing') {
            this.io.to(roomId).emit('message:typing', payload.data);
        }
    }

    private handleBroadcastMessage(message: BroadcastMessage): void {
        const { type, payload } = message;

        if (type === 'presence_update') {
            if (payload.action === 'online') {
                this.io.emit('user:online', {
                    userId: payload.userId,
                    timestamp: new Date()
                });
            } else if (payload.action === 'offline') {
                this.io.emit('user:offline', {
                    userId: payload.userId,
                    timestamp: new Date()
                });
            }
        }
    }

    private addConnectedUser(userId: string, socketId: string): void {
        if (!this.connectedUsers.has(userId)) {
            this.connectedUsers.set(userId, new Set());
        }
        this.connectedUsers.get(userId)!.add(socketId);
        this.socketToUser.set(socketId, userId);
    }

    private removeConnectedUser(userId: string, socketId: string): void {
        const userSockets = this.connectedUsers.get(userId);
        if (userSockets) {
            userSockets.delete(socketId);
            if (userSockets.size === 0) {
                this.connectedUsers.delete(userId);
            }
        }
        this.socketToUser.delete(socketId);
    }

    private async broadcastUserStatus(userId: string, isOnline: boolean): Promise<void> {
        await this.rabbitMQ.broadcastPresence({
            action: isOnline ? 'online' : 'offline',
            userId,
            timestamp: new Date()
        });

        const event = isOnline ? 'user:online' : 'user:offline';
        this.io.emit(event, {
            userId,
            timestamp: new Date()
        });
    }

    public async emitToUser(userId: string, event: keyof ServerToClientEvents, data: any): Promise<void> {
        this.io.to(`user:${userId}`).emit(event, data);

        await this.rabbitMQ.publishToUser(userId, {
            type: this.getMessageTypeFromEvent(event),
            payload: data
        });
    }

    public async emitToRoom(roomId: string, event: keyof ServerToClientEvents, data: any): Promise<void> {
        this.io.to(roomId).emit(event, data);
        await this.rabbitMQ.publishToRoom(roomId, event, data);
    }

    private getMessageTypeFromEvent(event: keyof ServerToClientEvents): 'notification' | 'message' | 'match' | 'presence' {
        if (event.startsWith('notification:')) return 'notification';
        if (event.startsWith('message:')) return 'message';
        if (event.startsWith('match:')) return 'match';
        return 'presence';
    }

    public getIO(): Server {
        return this.io;
    }

    public getConnectedUsers(): string[] {
        return Array.from(this.connectedUsers.keys());
    }

    public isUserConnected(userId: string): boolean {
        return this.connectedUsers.has(userId);
    }
}
