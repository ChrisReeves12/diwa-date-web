import { RabbitMQConfig } from '../types/rabbitmq.types';

export const getRabbitMQConfig = (): RabbitMQConfig => {
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

export const getWebSocketConfig = () => {
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

export const getClientWebSocketConfig = () => {
    // Use environment variable for websocket server URL
    const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001';
    
    return {
        url: wsUrl,
        options: {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5
        }
    };
}; 