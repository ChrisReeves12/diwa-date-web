import amqplib from 'amqplib';
import { RabbitMQConfig } from '../types/rabbitmq.types';
import { WebSocketMessage } from "../types/websocket-events.types";

export class RabbitMQService {
    private static instance: RabbitMQService;
    private connection: any = null;
    private channel: any = null;
    private config: RabbitMQConfig;
    private consumerTags?: { [queue: string]: string };
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private isReconnecting: boolean = false;

    private constructor(config: RabbitMQConfig) {
        this.config = config;
    }

    public static getInstance(config?: RabbitMQConfig): RabbitMQService {
        if (!RabbitMQService.instance) {
            if (!config) {
                throw new Error('RabbitMQ configuration is required for initialization');
            }
            RabbitMQService.instance = new RabbitMQService(config);
        }
        return RabbitMQService.instance;
    }

    public async connect(): Promise<void> {
        try {
            const url = `amqp://${this.config.username}:${this.config.password}@${this.config.host}:${this.config.port}`;

            this.connection = await amqplib.connect(url, {
                heartbeat: this.config.heartbeat || 30,
                timeout: this.config.connectionTimeout || 10000,
            });

            this.connection.on('error', (err: Error) => {
                console.error(`[ERROR] RabbitMQ connection error: ${err.message}`);
                this.handleConnectionError();
            });

            this.connection.on('close', () => {
                console.log('[WARN] RabbitMQ connection closed');
                this.handleConnectionError();
            });

            this.channel = await this.connection.createChannel();

            // Set up error handling for the channel
            this.channel.on('error', (err: Error) => {
                console.error(`[ERROR] RabbitMQ channel error: ${err.message}`);
            });

            await this.setupExchanges();
            await this.setupQueues();
        } catch (error) {
            console.error(`[ERROR] Failed to connect to RabbitMQ: ${error}`);
            throw error;
        }
    }

    private async setupExchanges(): Promise<void> {
        if (!this.channel) throw new Error('Channel not initialized');

        await this.channel.assertExchange('app.topic', 'topic', {durable: true});
        console.log(`[INFO] Exchange app.topic created/verified`);
    }

    private async setupQueues(): Promise<void> {
        // Set up notifications, messages, and matches queues
        if (!this.channel) throw new Error('Channel not initialized');

        await this.channel.assertQueue('notifications', {durable: true});
        await this.channel.assertQueue('messages', {durable: true});
        await this.channel.assertQueue('matches', {durable: true});

        // Bind queues to their respective exchanges
        await this.channel.bindQueue('notifications', 'app.topic', 'user.notification');
        await this.channel.bindQueue('notifications', 'app.topic', 'user.account');

        await this.channel.bindQueue('messages', 'app.topic', 'user.message');

        await this.channel.bindQueue('matches', 'app.topic', 'user.match');
    }

    public async startConsuming(
        messageHandler: (message: WebSocketMessage) => Promise<void>
    ): Promise<void> {
        if (!this.channel) throw new Error('Channel not initialized');

        for (const queue of ['notifications', 'messages', 'matches']) {
            const consumeResult = await this.channel.consume(
                queue,
                async (msg: any) => {
                    if (msg !== null) {
                        try {
                            const content = msg.content.toString();
                            const message = JSON.parse(content);
                            await messageHandler(message);
                            this.channel.ack(msg);
                        } catch (error) {
                            console.log(`[ERROR] Failed to process message from ${queue}: ${error}`);
                            this.channel.nack(msg, false, false); // Discard the message
                        }
                    }
                },
                {noAck: false}
            );

            if (!this.consumerTags) this.consumerTags = {};
            this.consumerTags[queue] = consumeResult.consumerTag;

            console.log(`[INFO] Started consuming from ${queue} queue`);
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

        for (const tag of Object.values(this.consumerTags || {})) {
            if (this.channel) {
                await this.channel.cancel(tag);
            }
        }

        this.consumerTags = undefined;

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

    public isConnected(): boolean {
        return !!(this.connection && this.channel);
    }
}
