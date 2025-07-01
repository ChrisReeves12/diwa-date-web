"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RabbitMQService = void 0;
// const amqplib = require('amqplib');
const amqplib_1 = __importDefault(require("amqplib"));
const uuid_1 = require("uuid");
const rabbitmq_types_1 = require("../types/rabbitmq.types");
class RabbitMQService {
    constructor(config) {
        this.connection = null;
        this.channel = null;
        this.consumerTag = null;
        this.reconnectTimeout = null;
        this.isReconnecting = false;
        this.config = config;
        this.serverId = `ws-server-${(0, uuid_1.v4)()}`;
        this.serverQueue = `websocket.server.${this.serverId}`;
    }
    static getInstance(config) {
        if (!RabbitMQService.instance) {
            if (!config) {
                throw new Error('RabbitMQ configuration is required for initialization');
            }
            RabbitMQService.instance = new RabbitMQService(config);
        }
        return RabbitMQService.instance;
    }
    async connect() {
        try {
            const url = `amqp://${this.config.username}:${this.config.password}@${this.config.host}:${this.config.port}`;
            this.connection = await amqplib_1.default.connect(url, {
                heartbeat: this.config.heartbeat || 30,
                timeout: this.config.connectionTimeout || 10000,
            });
            this.connection.on('error', (err) => {
                console.log(`[ERROR] RabbitMQ connection error: ${err.message}`);
                this.handleConnectionError();
            });
            this.connection.on('close', () => {
                console.log('[WARN] RabbitMQ connection closed');
                this.handleConnectionError();
            });
            this.channel = await this.connection.createChannel();
            // Set up error handling for channel
            this.channel.on('error', (err) => {
                console.log(`[ERROR] RabbitMQ channel error: ${err.message}`);
            });
            await this.setupExchanges();
            await this.setupServerQueue();
            console.log(`[INFO] RabbitMQ connected successfully. Server ID: ${this.serverId}`);
        }
        catch (error) {
            console.log(`[ERROR] Failed to connect to RabbitMQ: ${error}`);
            throw error;
        }
    }
    async setupExchanges() {
        if (!this.channel)
            throw new Error('Channel not initialized');
        // Set up all exchanges
        for (const exchange of Object.values(rabbitmq_types_1.EXCHANGES)) {
            await this.channel.assertExchange(exchange.name, exchange.type, { durable: exchange.durable });
            console.log(`[INFO] Exchange ${exchange.name} created/verified`);
        }
    }
    async setupServerQueue() {
        if (!this.channel)
            throw new Error('Channel not initialized');
        // Create server-specific queue
        await this.channel.assertQueue(this.serverQueue, {
            durable: false,
            exclusive: true,
            autoDelete: true
        });
        // Bind to presence fanout exchange
        await this.channel.bindQueue(this.serverQueue, rabbitmq_types_1.EXCHANGES.PRESENCE_FANOUT.name, '');
        console.log(`[INFO] Server queue ${this.serverQueue} created and bound`);
    }
    async bindUserQueue(userId) {
        if (!this.channel)
            throw new Error('Channel not initialized');
        const userRoutingKey = `user.${userId}`;
        // Bind server queue to receive user-specific messages
        await this.channel.bindQueue(this.serverQueue, rabbitmq_types_1.EXCHANGES.USER_DIRECT.name, userRoutingKey);
        // Also bind for event topics related to this user
        const eventPatterns = [
            `notification.${userId}`,
            `match.${userId}`
        ];
        for (const pattern of eventPatterns) {
            await this.channel.bindQueue(this.serverQueue, rabbitmq_types_1.EXCHANGES.EVENTS_TOPIC.name, pattern);
        }
    }
    async unbindUserQueue(userId) {
        if (!this.channel)
            throw new Error('Channel not initialized');
        const userRoutingKey = `user.${userId}`;
        await this.channel.unbindQueue(this.serverQueue, rabbitmq_types_1.EXCHANGES.USER_DIRECT.name, userRoutingKey);
        const eventPatterns = [
            `notification.${userId}`,
            `match.${userId}`
        ];
        for (const pattern of eventPatterns) {
            await this.channel.unbindQueue(this.serverQueue, rabbitmq_types_1.EXCHANGES.EVENTS_TOPIC.name, pattern);
        }
    }
    async bindRoomQueue(roomId) {
        if (!this.channel)
            throw new Error('Channel not initialized');
        const roomPattern = `room.${roomId}.*`;
        await this.channel.bindQueue(this.serverQueue, rabbitmq_types_1.EXCHANGES.EVENTS_TOPIC.name, roomPattern);
    }
    async unbindRoomQueue(roomId) {
        if (!this.channel)
            throw new Error('Channel not initialized');
        const roomPattern = `room.${roomId}.*`;
        await this.channel.unbindQueue(this.serverQueue, rabbitmq_types_1.EXCHANGES.EVENTS_TOPIC.name, roomPattern);
    }
    async publishToUser(userId, message) {
        const userMessage = {
            id: (0, uuid_1.v4)(),
            timestamp: new Date(),
            serverId: this.serverId,
            userId,
            type: message.type,
            payload: message.payload
        };
        await this.publish(rabbitmq_types_1.EXCHANGES.USER_DIRECT.name, `user.${userId}`, userMessage);
    }
    async publishToRoom(roomId, event, payload) {
        const roomMessage = {
            id: (0, uuid_1.v4)(),
            timestamp: new Date(),
            serverId: this.serverId,
            roomId,
            type: 'room_event',
            payload
        };
        await this.publish(rabbitmq_types_1.EXCHANGES.EVENTS_TOPIC.name, `room.${roomId}.${event}`, roomMessage);
    }
    async broadcastPresence(payload) {
        const broadcastMessage = {
            id: (0, uuid_1.v4)(),
            timestamp: new Date(),
            serverId: this.serverId,
            type: 'presence_update',
            payload
        };
        await this.publish(rabbitmq_types_1.EXCHANGES.PRESENCE_FANOUT.name, '', broadcastMessage);
    }
    async publish(exchange, routingKey, message) {
        if (!this.channel)
            throw new Error('Channel not initialized');
        const messageBuffer = Buffer.from(JSON.stringify(message));
        try {
            this.channel.publish(exchange, routingKey, messageBuffer, {
                persistent: true,
                contentType: 'application/json',
                timestamp: Date.now()
            });
        }
        catch (error) {
            console.log(`[ERROR] Failed to publish message: ${error}`);
            throw error;
        }
    }
    async startConsuming(messageHandler) {
        if (!this.channel)
            throw new Error('Channel not initialized');
        const result = await this.channel.consume(this.serverQueue, async (msg) => {
            if (!msg)
                return;
            try {
                const message = JSON.parse(msg.content.toString());
                // Skip messages from this server
                if (message.serverId === this.serverId) {
                    this.channel.ack(msg);
                    return;
                }
                await messageHandler(message);
                this.channel.ack(msg);
            }
            catch (error) {
                console.log(`[ERROR] Error processing message: ${error}`);
                // Reject and don't requeue on processing errors
                this.channel.nack(msg, false, false);
            }
        }, { noAck: false });
        this.consumerTag = result.consumerTag;
        console.log('[INFO] Started consuming messages');
    }
    async stopConsuming() {
        if (this.channel && this.consumerTag) {
            await this.channel.cancel(this.consumerTag);
            this.consumerTag = null;
            console.log('[INFO] Stopped consuming messages');
        }
    }
    handleConnectionError() {
        if (this.isReconnecting)
            return;
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
            }
            catch (error) {
                console.log(`[ERROR] Reconnection failed: ${error}`);
                // Try again
                this.handleConnectionError();
            }
        }, 5000);
    }
    async disconnect() {
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
    getServerId() {
        return this.serverId;
    }
    isConnected() {
        return !!(this.connection && this.channel);
    }
}
exports.RabbitMQService = RabbitMQService;
//# sourceMappingURL=rabbitmq.service.js.map