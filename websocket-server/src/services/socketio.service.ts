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

                this.emitDirectlyToUser(otherUserId, 'message:typing', typingData);
            });

            socket.on('message:typing:stop', async ({ otherUserId }) => {
                const typingData = {
                    userId,
                    isTyping: false
                };

                this.emitDirectlyToUser(otherUserId, 'message:typing', typingData);
            });

            socket.on('disconnect', async () => {
                this.removeConnectedUser(userId, socket.id);
            });
        });
    }

    private setupRabbitMQConsumer(): void {
        this.rabbitMQ.startConsuming(async (queue: string, message: any) => {
            try {
                switch (queue) {
                    case 'notifications':
                        this.handleNotificationPayloads(message);
                        break;
                    case 'messages':
                        this.handleMessagePayloads(message);
                        break;
                    case 'matches':
                        this.handleMatchPayloads(message);
                        break;
                    default:
                        console.warn(`Received message from unknown queue: ${queue}`);
                        break;
                }
            } catch (error) {
                console.error(`Error processing RabbitMQ message: ${error}`);
            }
        });
    }

    private handleNotificationPayloads(message: any): void {
        const { userId, type, payload } = message;

        if (type === 'account') {
            this.emitDirectlyToUser(userId, 'account:notice', payload);
        } else if (type === 'block') {
            this.emitDirectlyToUser(userId, 'user:blocked', payload);
        } else {
            this.emitDirectlyToUser(userId, 'notification:new', payload);
        }
    }

    private handleMessagePayloads(message: any): void {
        const { userId, payload } = message;
        this.emitDirectlyToUser(userId, 'message:new', payload);
    }

    private handleMatchPayloads(message: any): void {
        const { userId, payload } = message;
        this.emitDirectlyToUser(userId, 'match:new', payload);
    }

    private addConnectedUser(userId: string, socketId: string): void {
        if (!this.connectedUsers.has(userId)) {
            this.connectedUsers.set(userId, new Set());
        }

        this.connectedUsers.get(userId)!.add(socketId);
        this.socketToUser.set(socketId, userId);
        console.log(`Added socket ID: ${socketId} for user: ${userId}`);
    }

    private removeConnectedUser(userId: string, socketId: string): void {
        const userSockets = this.connectedUsers.get(userId);
        if (userSockets) {
            userSockets.delete(socketId);
            if (userSockets.size === 0) {
                this.connectedUsers.delete(userId);
                console.log(`Removed user: ${userId} from connected users.`);
            }
        }

        this.socketToUser.delete(socketId);
    }

    public emitDirectlyToUser(userId: string, event: keyof ServerToClientEvents, data: any) {
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

    public getIO(): Server {
        return this.io;
    }

    public getConnectedUsers(): string[] {
        return Array.from(this.connectedUsers.keys());
    }
}
