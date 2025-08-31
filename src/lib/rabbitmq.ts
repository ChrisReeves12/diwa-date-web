// const amqplib = require('amqplib');
import amqplib from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import { MessageCategory } from "../../types/websocket-events.types";

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

    private constructor(config?: RabbitMQConfig) {
        this.config = config || {
            host: process.env.RABBITMQ_HOST as string,
            port: Number(process.env.RABBITMQ_PORT),
            username: process.env.RABBITMQ_USERNAME as string,
            password: process.env.RABBITMQ_PASSWORD as string
        };
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
                console.error(`[ERROR] RabbitMQ connection error: ${err.message}`);
            });

            this.connection.on('close', () => {
                console.log('[WARN] RabbitMQ connection closed');
            });

            this.channel = await this.connection.createChannel();

            // Set up error handling for channel
            this.channel.on('error', (err: Error) => {
                console.log(`[ERROR] RabbitMQ channel error: ${err.message}`);
            });
        } catch (error) {
            console.log(`[ERROR] Failed to connect to RabbitMQ: ${error}`);
            throw error;
        }
    }

    public async publishToUser(userId: number, message: {category: MessageCategory, eventLabel: string, payload: any}): Promise<void> {
        if (!this.channel) throw new Error('Channel not initialized');

        const messageBuffer = Buffer.from(JSON.stringify({
            id: uuidv4(),
            timestamp: new Date(),
            userId: userId.toString(),
            category: message.category,
            eventLabel: message.eventLabel,
            payload: message.payload
        }));

        try {
            this.channel.publish(
                'app.topic',
                `user.${message.category}`,
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
}
