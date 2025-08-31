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
    MESSAGES: {
        name: 'messages.direct',
        type: ExchangeType.DIRECT,
        durable: true
    },
    NOTIFICATIONS: {
        name: 'notifications.direct',
        type: ExchangeType.DIRECT,
        durable: true
    }
} as const;

// Message types that will be sent through RabbitMQ
export interface BaseMessage {
    id: string;
    timestamp: Date;
    serverId: string;
}

export type UserMessageType = 'notification' | 'message' | 'match' | 'presence' | 'account';

export interface UserMessage extends BaseMessage {
    userId: string;
    type: UserMessageType;
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
