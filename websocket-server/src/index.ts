import { createServer } from 'http';
import dotenv from 'dotenv';
import { RabbitMQService } from './services/rabbitmq.service';
import { SocketIOService } from './services/socketio.service';
import { AuthService } from './services/auth.service';
import { getServerConfig, getRabbitMQConfig } from './config/server.config';

// Load environment variables
dotenv.config();

let rabbitMQService: RabbitMQService;
let socketIOService: SocketIOService;
let authService: AuthService;

async function startServer() {
    try {
        const config = getServerConfig();
        const rabbitMQConfig = getRabbitMQConfig();

        console.log('Starting WebSocket server...');
        console.log(`Port: ${config.port}`);
        console.log(`CORS Origins: ${Array.isArray(config.cors.origin) ? config.cors.origin.join(', ') : config.cors.origin}`);

        // Create HTTP server
        const httpServer = createServer((req, res) => {
            // Basic health check endpoint
            if (req.url === '/health') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'ok',
                    timestamp: new Date().toISOString(),
                    connections: socketIOService ? socketIOService.getConnectedUsers().length : 0,
                    rabbitMQ: rabbitMQService ? rabbitMQService.isConnected() : false
                }));
            } else {
                res.writeHead(404);
                res.end();
            }
        });

        // Initialize Auth Service
        authService = new AuthService();
        console.log('Auth service initialized');

        // Initialize RabbitMQ
        console.log('Connecting to RabbitMQ...');
        rabbitMQService = RabbitMQService.getInstance(rabbitMQConfig);
        await rabbitMQService.connect();
        console.log('RabbitMQ connected successfully');

        // Initialize Socket.IO
        console.log('Initializing Socket.IO...');
        socketIOService = new SocketIOService(httpServer, rabbitMQService, authService, config);
        console.log('Socket.IO initialized');

        // Start HTTP server
        httpServer.listen(config.port, () => {
            console.log(`WebSocket server is running on port ${config.port}`);
            console.log(`Health check available at http://localhost:${config.port}/health`);
        });

        // Graceful shutdown handlers
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

async function shutdown(signal: string) {
    console.log(`\nReceived ${signal}, shutting down gracefully...`);

    try {
        // Stop accepting new connections
        if (socketIOService) {
            const io = socketIOService.getIO();
            io.close(() => {
                console.log('Socket.IO server closed');
            });
        }

        // Disconnect from RabbitMQ
        if (rabbitMQService) {
            await rabbitMQService.disconnect();
            console.log('RabbitMQ disconnected');
        }

        // Clear auth cache
        if (authService) {
            authService.clearCache();
        }

        console.log('Shutdown complete');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
});

// Start the server
startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
