// RabbitMQ Types and Configurations

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
