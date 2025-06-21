import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { RabbitMQService } from './src/websocket/services/rabbitmq.service';
import { SocketIOService } from './src/websocket/services/socketio.service';
import { getRabbitMQConfig } from './src/websocket/config/websocket.config';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Global instances
let rabbitMQService: RabbitMQService;
let socketIOService: SocketIOService;

async function startServer() {
    try {
        // Prepare Next.js
        await app.prepare();

        // Create HTTP server
        const server = createServer(async (req, res) => {
            try {
                const parsedUrl = parse(req.url!, true);
                await handle(req, res, parsedUrl);
            } catch (err) {
                console.error('Error occurred handling', req.url, err);
                res.statusCode = 500;
                res.end('internal server error');
            }
        });

        // Initialize RabbitMQ
        console.log('Initializing RabbitMQ connection...');
        const rabbitMQConfig = getRabbitMQConfig();
        rabbitMQService = RabbitMQService.getInstance(rabbitMQConfig);
        await rabbitMQService.connect();
        console.log('RabbitMQ connected successfully');

        // Initialize Socket.IO
        console.log('Initializing Socket.IO server...');
        socketIOService = new SocketIOService(server, rabbitMQService);
        console.log('Socket.IO server initialized');

        // Make services available globally
        (global as any).websocketServices = {
            rabbitMQ: rabbitMQService,
            socketIO: socketIOService
        };

        // Start listening
        server.listen(port, () => {
            console.log(`> Ready on http://${hostname}:${port}`);
            console.log(`> WebSocket server listening on port ${port}`);
        });

        // Graceful shutdown
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

async function shutdown() {
    console.log('Shutting down gracefully...');

    try {
        // Disconnect from RabbitMQ
        if (rabbitMQService) {
            await rabbitMQService.disconnect();
            console.log('RabbitMQ disconnected');
        }

        // Close Socket.IO connections
        if (socketIOService) {
            const io = socketIOService.getIO();
            io.close(() => {
                console.log('Socket.IO server closed');
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
}

// Start the server
startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
}); 