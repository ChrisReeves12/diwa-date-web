// const amqplib = require('amqplib');
import amqplib from 'amqplib';
import { v4 as uuidv4 } from 'uuid';

// RabbitMQ Types and Configurations

export enum ExchangeType {
    DIRECT = 'direct',
    TOPIC = 'topic',
    FANOUT = 'fanout',
    HEADERS = 'headers'
}

export interface ExchangeConfig {
    name: string;
    type: ExchangeType;
    durable: boolean;
    autoDelete?: boolean;
}

export interface QueueConfig {
    name: string;
    durable: boolean;
    exclusive?: boolean;
    autoDelete?: boolean;
    messageTtl?: number;
    maxLength?: number;
}

// Exchange configurations
export const EXCHANGES = {
    USER_DIRECT: {
        name: 'user.direct',
        type: ExchangeType.DIRECT,
        durable: true
    },
    EVENTS_TOPIC: {
        name: 'events.topic',
        type: ExchangeType.TOPIC,
        durable: true
    },
    PRESENCE_FANOUT: {
        name: 'presence.fanout',
        type: ExchangeType.FANOUT,
        durable: false
    }
} as const;

// Message types that will be sent through RabbitMQ
export interface BaseMessage {
    id: string;
    timestamp: Date;
    serverId: string;
}

export interface UserMessage extends BaseMessage {
    userId: string;
    type: 'notification' | 'message' | 'match' | 'presence';
    payload: any;
}

export interface BroadcastMessage extends BaseMessage {
    type: 'presence_update' | 'server_announcement';
    payload: any;
}

export interface RoomMessage extends BaseMessage {
    roomId: string;
    type: 'room_event';
    payload: any;
}

export type RabbitMQMessage = UserMessage | BroadcastMessage | RoomMessage;

// Routing key patterns
export const ROUTING_PATTERNS = {
    USER_SPECIFIC: 'user.{userId}',
    NOTIFICATION: 'notification.{userId}',
    MESSAGE: 'message.{conversationId}',
    MATCH: 'match.{userId}',
    PRESENCE: 'presence.{action}',
    ROOM: 'room.{roomId}.{event}'
} as const;

// Queue binding configurations
export interface QueueBinding {
    exchange: string;
    routingPattern: string;
}

// Connection configuration
export interface RabbitMQConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    vhost?: string;
    heartbeat?: number;
    connectionTimeout?: number;
}

export class Rabbitmq {
    private static instance: Rabbitmq;
    private connection: any = null;
    private channel: any = null;
    private config: RabbitMQConfig;
    private serverId: string;
    private serverQueue: string;
    private consumerTag: string | null = null;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private isReconnecting: boolean = false;

    private constructor(config?: RabbitMQConfig) {
        this.config = config || {
            host: process.env.RABBITMQ_HOST as string,
            port: Number(process.env.RABBITMQ_PORT),
            username: process.env.RABBITMQ_USERNAME as string,
            password: process.env.RABBITMQ_PASSWORD as string
        };

        this.serverId = `ws-server-${uuidv4()}`;
        this.serverQueue = `websocket.server.${this.serverId}`;
    }

    public static getInstance(config?: RabbitMQConfig): Rabbitmq {
        if (!Rabbitmq.instance) {
            Rabbitmq.instance = new Rabbitmq(config);
        }

        return Rabbitmq.instance;
    }

    public async connect(): Promise<void> {
        try {
            if (this.connection) {
                return;
            }

            const url = `amqp://${this.config.username}:${this.config.password}@${this.config.host}:${this.config.port}`;

            this.connection = await amqplib.connect(url, {
                heartbeat: this.config.heartbeat || 30,
                timeout: this.config.connectionTimeout || 10000,
            });

            this.connection.on('error', (err: Error) => {
                console.log(`[ERROR] RabbitMQ connection error: ${err.message}`);
                this.handleConnectionError();
            });

            this.connection.on('close', () => {
                console.log('[WARN] RabbitMQ connection closed');
                this.handleConnectionError();
            });

            this.channel = await this.connection.createChannel();

            // Set up error handling for channel
            this.channel.on('error', (err: Error) => {
                console.log(`[ERROR] RabbitMQ channel error: ${err.message}`);
            });

            await this.setupExchanges();
            await this.setupServerQueue();

            console.log(`[INFO] RabbitMQ connected successfully. Server ID: ${this.serverId}`);
        } catch (error) {
            console.log(`[ERROR] Failed to connect to RabbitMQ: ${error}`);
            throw error;
        }
    }

    private async setupExchanges(): Promise<void> {
        if (!this.channel) throw new Error('Channel not initialized');

        // Set up all exchanges
        for (const exchange of Object.values(EXCHANGES)) {
            await this.channel.assertExchange(
                exchange.name,
                exchange.type,
                { durable: exchange.durable }
            );
            console.log(`[INFO] Exchange ${exchange.name} created/verified`);
        }
    }

    private async setupServerQueue(): Promise<void> {
        if (!this.channel) throw new Error('Channel not initialized');

        // Create server-specific queue
        await this.channel.assertQueue(this.serverQueue, {
            durable: false,
            exclusive: true,
            autoDelete: true
        });

        // Bind to presence fanout exchange
        await this.channel.bindQueue(
            this.serverQueue,
            EXCHANGES.PRESENCE_FANOUT.name,
            ''
        );

        console.log(`[INFO] Server queue ${this.serverQueue} created and bound`);
    }

    public async bindUserQueue(userId: string): Promise<void> {
        if (!this.channel) throw new Error('Channel not initialized');

        const userRoutingKey = `user.${userId}`;

        // Bind server queue to receive user-specific messages
        await this.channel.bindQueue(
            this.serverQueue,
            EXCHANGES.USER_DIRECT.name,
            userRoutingKey
        );

        // Also bind for event topics related to this user
        const eventPatterns = [
            `notification.${userId}`,
            `match.${userId}`
        ];

        for (const pattern of eventPatterns) {
            await this.channel.bindQueue(
                this.serverQueue,
                EXCHANGES.EVENTS_TOPIC.name,
                pattern
            );
        }
    }

    public async unbindUserQueue(userId: string): Promise<void> {
        if (!this.channel) throw new Error('Channel not initialized');

        const userRoutingKey = `user.${userId}`;

        await this.channel.unbindQueue(
            this.serverQueue,
            EXCHANGES.USER_DIRECT.name,
            userRoutingKey
        );

        const eventPatterns = [
            `notification.${userId}`,
            `match.${userId}`
        ];

        for (const pattern of eventPatterns) {
            await this.channel.unbindQueue(
                this.serverQueue,
                EXCHANGES.EVENTS_TOPIC.name,
                pattern
            );
        }
    }

    public async bindRoomQueue(roomId: string): Promise<void> {
        if (!this.channel) throw new Error('Channel not initialized');

        const roomPattern = `room.${roomId}.*`;

        await this.channel.bindQueue(
            this.serverQueue,
            EXCHANGES.EVENTS_TOPIC.name,
            roomPattern
        );
    }

    public async unbindRoomQueue(roomId: string): Promise<void> {
        if (!this.channel) throw new Error('Channel not initialized');

        const roomPattern = `room.${roomId}.*`;

        await this.channel.unbindQueue(
            this.serverQueue,
            EXCHANGES.EVENTS_TOPIC.name,
            roomPattern
        );
    }

    public async publishToUser(userId: number, message: any): Promise<void> {
        const userMessage: UserMessage = {
            id: uuidv4(),
            timestamp: new Date(),
            serverId: this.serverId,
            userId: userId.toString(),
            type: message.type,
            payload: message.payload
        };

        await this.publish(
            EXCHANGES.USER_DIRECT.name,
            `user.${userId}`,
            userMessage
        );
    }

    public async publishToRoom(roomId: string, event: string, payload: any): Promise<void> {
        const roomMessage: RoomMessage = {
            id: uuidv4(),
            timestamp: new Date(),
            serverId: this.serverId,
            roomId,
            type: 'room_event',
            payload
        };

        await this.publish(
            EXCHANGES.EVENTS_TOPIC.name,
            `room.${roomId}.${event}`,
            roomMessage
        );
    }

    public async broadcastPresence(payload: any): Promise<void> {
        const broadcastMessage: BroadcastMessage = {
            id: uuidv4(),
            timestamp: new Date(),
            serverId: this.serverId,
            type: 'presence_update',
            payload
        };

        await this.publish(
            EXCHANGES.PRESENCE_FANOUT.name,
            '',
            broadcastMessage
        );
    }

    private async publish(exchange: string, routingKey: string, message: RabbitMQMessage): Promise<void> {
        if (!this.channel) throw new Error('Channel not initialized');

        const messageBuffer = Buffer.from(JSON.stringify(message));

        try {
            this.channel.publish(
                exchange,
                routingKey,
                messageBuffer,
                {
                    persistent: true,
                    contentType: 'application/json',
                    timestamp: Date.now()
                }
            );
        } catch (error) {
            console.log(`[ERROR] Failed to publish message: ${error}`);
            throw error;
        }
    }

    public async startConsuming(
        messageHandler: (message: RabbitMQMessage) => Promise<void>
    ): Promise<void> {
        if (!this.channel) throw new Error('Channel not initialized');

        const result = await this.channel.consume(
            this.serverQueue,
            async (msg: any) => {
                if (!msg) return;

                try {
                    const message = JSON.parse(msg.content.toString()) as RabbitMQMessage;

                    // Skip messages from this server
                    if (message.serverId === this.serverId) {
                        this.channel.ack(msg);
                        return;
                    }

                    await messageHandler(message);
                    this.channel.ack(msg);
                } catch (error) {
                    console.log(`[ERROR] Error processing message: ${error}`);
                    // Reject and don't requeue on processing errors
                    this.channel.nack(msg, false, false);
                }
            },
            { noAck: false }
        );

        this.consumerTag = result.consumerTag;
        console.log('[INFO] Started consuming messages');
    }

    public async stopConsuming(): Promise<void> {
        if (this.channel && this.consumerTag) {
            await this.channel.cancel(this.consumerTag);
            this.consumerTag = null;
            console.log('[INFO] Stopped consuming messages');
        }
    }

    private handleConnectionError(): void {
        if (this.isReconnecting) return;

        this.isReconnecting = true;
        this.connection = null;
        this.channel = null;

        // Clear any existing reconnect timeout
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        // Attempt to reconnect after 5 seconds
        this.reconnectTimeout = setTimeout(async () => {
            try {
                console.log('[INFO] Attempting to reconnect to RabbitMQ...');
                await this.connect();
                this.isReconnecting = false;
            } catch (error) {
                console.log(`[ERROR] Reconnection failed: ${error}`);
                // Try again
                this.handleConnectionError();
            }
        }, 5000);
    }

    public async disconnect(): Promise<void> {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.consumerTag && this.channel) {
            await this.channel.cancel(this.consumerTag);
        }

        if (this.channel) {
            await this.channel.close();
            this.channel = null;
        }

        if (this.connection) {
            await this.connection.close();
            this.connection = null;
        }

        console.log('[INFO] Disconnected from RabbitMQ');
    }

    public getServerId(): string {
        return this.serverId;
    }

    public isConnected(): boolean {
        return !!(this.connection && this.channel);
    }
}
