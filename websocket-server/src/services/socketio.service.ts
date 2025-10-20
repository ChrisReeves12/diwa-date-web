import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import {
    ServerToClientEvents,
    ClientToServerEvents,
    InterServerEvents,
    WebSocketMessage
} from '../types/websocket-events.types';
import { RabbitMQService } from './rabbitmq.service';
import { AuthService } from './auth.service';
import { ServerConfig } from '../config/server.config';

export class SocketIOService {
    private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents>;
    private rabbitMQ: RabbitMQService;
    private authService: AuthService;
    private connectedUsers: Map<string, Set<string>> = new Map();
    private socketToUser: Map<string, string> = new Map();

    constructor(httpServer: HttpServer, rabbitMQ: RabbitMQService, authService: AuthService, config: ServerConfig) {
        this.rabbitMQ = rabbitMQ;
        this.authService = authService;

        this.io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents>(httpServer, {
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

            socket.on('disconnect', async () => {
                this.removeConnectedUser(userId, socket.id);
            });
        });
    }

    private setupRabbitMQConsumer(): void {
        this.rabbitMQ.startConsuming(async (message: WebSocketMessage) => {
            const { userId, category } = message;

            try {
                const eventName = category === 'notification' ? 'event:notification' : `${category}:notification`;
                this.emitToUser(userId, eventName as keyof ServerToClientEvents, message);
            } catch (error) {
                console.error(`Error processing RabbitMQ message: ${error}`);
            }
        });
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

    public emitToUser(userId: string, event: keyof ServerToClientEvents, data: WebSocketMessage) {
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
