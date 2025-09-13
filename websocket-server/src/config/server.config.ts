import { RabbitMQConfig } from '../types/rabbitmq.types';

export interface ServerConfig {
    port: number;
    cors: {
        origin: string | string[];
        credentials: boolean;
    };
    auth: {
        sessionCookieName: string;
    };
}

export const getServerConfig = (): ServerConfig => {
    return {
        port: parseInt(process.env.WEBSOCKET_PORT || '3001', 10),
        cors: {
            origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
            credentials: true
        },
        auth: {
            sessionCookieName: process.env.SESSION_COOKIE_NAME || 'session_id'
        }
    };
};

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
