# Diwa Date WebSocket Server

Standalone WebSocket and RabbitMQ server for handling real-time communications across multiple NextJS application instances.

## Architecture

This server provides:
- WebSocket connections via Socket.IO
- RabbitMQ message brokering for multi-server communication
- Session-based authentication via Redis
- Health check endpoint

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the environment configuration:
   ```bash
   cp .env.example .env
   ```

3. Update the `.env` file with your configuration

## Running the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

## Environment Variables

- `WEBSOCKET_PORT`: Port for the WebSocket server (default: 3001)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins
- `SESSION_COOKIE_NAME`: Name of the session cookie
- `REDIS_HOST`: Redis server host
- `REDIS_PORT`: Redis server port
- `REDIS_PASSWORD`: Redis password
- `REDIS_KEY_PREFIX`: Redis key prefix
- `REDIS_TLS`: Enable Redis TLS connection
- `RABBITMQ_HOST`: RabbitMQ server host
- `RABBITMQ_PORT`: RabbitMQ server port
- `RABBITMQ_USERNAME`: RabbitMQ username
- `RABBITMQ_PASSWORD`: RabbitMQ password

## Health Check

The server provides a health check endpoint at:
```
GET http://localhost:3001/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-20T12:00:00.000Z",
  "connections": 42,
  "rabbitMQ": true
}
```

## Multi-Datacenter Deployment

1. Deploy the WebSocket server to a central location
2. Configure all NextJS app instances to connect to this server
3. Ensure RabbitMQ is accessible from the WebSocket server
4. Update CORS origins to include all NextJS app domains