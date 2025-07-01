"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebSocketConfig = exports.getRabbitMQConfig = void 0;
const getRabbitMQConfig = () => {
    return {
        host: process.env.RABBITMQ_HOST || '127.0.0.1',
        port: parseInt(process.env.RABBITMQ_PORT || '5672', 10),
        username: process.env.RABBITMQ_USERNAME || 'guest',
        password: process.env.RABBITMQ_PASSWORD || 'guest',
        vhost: process.env.RABBITMQ_VHOST || '/',
        heartbeat: 30,
        connectionTimeout: 10000
    };
};
exports.getRabbitMQConfig = getRabbitMQConfig;
const getWebSocketConfig = () => {
    return {
        port: parseInt(process.env.WEBSOCKET_PORT || '3001', 10),
        cors: {
            origin: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ['websocket', 'polling']
    };
};
exports.getWebSocketConfig = getWebSocketConfig;
//# sourceMappingURL=websocket.config.js.map