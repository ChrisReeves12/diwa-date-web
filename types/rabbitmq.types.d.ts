export declare enum ExchangeType {
    DIRECT = "direct",
    TOPIC = "topic",
    FANOUT = "fanout",
    HEADERS = "headers"
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
export declare const EXCHANGES: {
    readonly USER_DIRECT: {
        readonly name: "user.direct";
        readonly type: ExchangeType.DIRECT;
        readonly durable: true;
    };
    readonly EVENTS_TOPIC: {
        readonly name: "events.topic";
        readonly type: ExchangeType.TOPIC;
        readonly durable: true;
    };
    readonly PRESENCE_FANOUT: {
        readonly name: "presence.fanout";
        readonly type: ExchangeType.FANOUT;
        readonly durable: false;
    };
};
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
export declare const ROUTING_PATTERNS: {
    readonly USER_SPECIFIC: "user.{userId}";
    readonly NOTIFICATION: "notification.{userId}";
    readonly MESSAGE: "message.{conversationId}";
    readonly MATCH: "match.{userId}";
    readonly PRESENCE: "presence.{action}";
    readonly ROOM: "room.{roomId}.{event}";
};
export interface QueueBinding {
    exchange: string;
    routingPattern: string;
}
export interface RabbitMQConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    vhost?: string;
    heartbeat?: number;
    connectionTimeout?: number;
}
