"use strict";
// RabbitMQ Types and Configurations
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROUTING_PATTERNS = exports.EXCHANGES = exports.ExchangeType = void 0;
var ExchangeType;
(function (ExchangeType) {
    ExchangeType["DIRECT"] = "direct";
    ExchangeType["TOPIC"] = "topic";
    ExchangeType["FANOUT"] = "fanout";
    ExchangeType["HEADERS"] = "headers";
})(ExchangeType || (exports.ExchangeType = ExchangeType = {}));
// Exchange configurations
exports.EXCHANGES = {
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
};
// Routing key patterns
exports.ROUTING_PATTERNS = {
    USER_SPECIFIC: 'user.{userId}',
    NOTIFICATION: 'notification.{userId}',
    MESSAGE: 'message.{conversationId}',
    MATCH: 'match.{userId}',
    PRESENCE: 'presence.{action}',
    ROOM: 'room.{roomId}.{event}'
};
//# sourceMappingURL=rabbitmq.types.js.map