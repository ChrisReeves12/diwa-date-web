import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
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

        this.setupAuthMiddleware();
        this.setupEventHandlers();
        this.setupRabbitMQConsumer();
    }

    private setupAuthMiddleware(): void {
        this.io.use(async (socket, next) => {
            try {
                const sessionToken = socket.handshake.auth.token;

                if (!sessionToken) {
                    console.error('No session token found in auth');
                    return next(new Error('Authentication required'));
                }

                const sessionData = await this.authService.validateSession(sessionToken);
                if (!sessionData || !sessionData.userId) {
                    return next(new Error('Invalid session'));
                }

                socket.data.userId = sessionData.userId;
                socket.data.sessionId = sessionToken;

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
            this.addConnectedUser(userId, socket.id);

            socket.on('message:typing:start', async ({ otherUserId }) => {
                const typingData = {
                    userId,
                    isTyping: true
                };

                await this.emitDirectlyToUser(otherUserId, 'message:typing', typingData);
            });

            socket.on('message:typing:stop', async ({ otherUserId }) => {
                const typingData = {
                    userId,
                    isTyping: false
                };

                await this.emitDirectlyToUser(otherUserId, 'message:typing', typingData);
            });

            socket.on('disconnect', async () => {
                this.removeConnectedUser(userId, socket.id);
            });
        });
    }

    private setupRabbitMQConsumer(): void {
        this.rabbitMQ.startConsuming(async (queue: string, message: RabbitMQMessage) => {
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
            case 'account':
                this.io.to(`user:${userId}`).emit('account:notice', payload);
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

    public async emitDirectlyToUser(userId: string, event: keyof ServerToClientEvents, data: any): Promise<void> {
        // Find the sockets for the user
        const userSockets = this.connectedUsers.get(userId);
        if (userSockets) {
            for (const socketId of userSockets) {
                const socket = this.io.sockets.sockets.get(socketId);
                if (socket) {
                    socket.emit(event, data);
                }
            }
        }
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
