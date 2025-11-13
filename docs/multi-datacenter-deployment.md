# Multi-Datacenter Deployment Guide

This guide explains how to deploy the Diwa Date application across multiple datacenters with a centralized WebSocket/RabbitMQ server.

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Datacenter 1  │     │   Datacenter 2  │     │   Datacenter 3  │
│                 │     │                 │     │                 │
│  NextJS App 1   │     │  NextJS App 2   │     │  NextJS App 3   │
│                 │     │                 │     │                 │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┴───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Central Location      │
                    │                         │
                    │  WebSocket Server       │
                    │        +                │
                    │    RabbitMQ Server     │
                    │        +                │
                    │     Redis Server       │
                    │                         │
                    └─────────────────────────┘
```

## Deployment Steps

### 1. Deploy Redis Server

First, deploy Redis in your central location for session storage:

```bash
# Using Docker
docker run -d --name redis \
  -p 6379:6379 \
  -e REDIS_PASSWORD=your-secure-redis-password \
  redis:7-alpine redis-server --requirepass your-secure-redis-password
```

### 2. Deploy RabbitMQ Server

Next, deploy RabbitMQ in your central location:

```bash
# Using Docker
docker run -d --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=admin \
  -e RABBITMQ_DEFAULT_PASS=your-secure-password \
  rabbitmq:3-management
```

### 3. Deploy WebSocket Server

Deploy the standalone WebSocket server in the same central location:

```bash
cd websocket-server
npm install
npm run build

# Set environment variables
export WEBSOCKET_PORT=3001
export ALLOWED_ORIGINS=https://app1.diwa-date.com,https://app2.diwa-date.com,https://app3.diwa-date.com
export SESSION_COOKIE_NAME=session_id
export REDIS_HOST=localhost
export REDIS_PORT=6379
export REDIS_PASSWORD=your-secure-redis-password
export REDIS_KEY_PREFIX=diwa_date
export REDIS_TLS=false
export RABBITMQ_HOST=localhost
export RABBITMQ_USERNAME=admin
export RABBITMQ_PASSWORD=your-secure-password

# Start the server
npm start
```

### 4. Configure NextJS Applications

For each NextJS application instance in different datacenters:

#### Update Environment Variables

```bash
# .env.production
NEXT_PUBLIC_WEBSOCKET_URL=https://ws.diwa-date.com
SESSION_COOKIE_NAME=session_id
```

#### Deploy NextJS App

```bash
npm run build
npm start
```

### 5. Configure Load Balancer

Set up your load balancer to:
- Route WebSocket traffic to the central WebSocket server
- Route HTTP/HTTPS traffic to the nearest NextJS instance
- Enable sticky sessions for WebSocket connections

Example Nginx configuration:

```nginx
# WebSocket server upstream
upstream websocket {
    server ws.diwa-date.com:3001;
}

# NextJS app upstreams
upstream nextjs_dc1 {
    server dc1.diwa-date.com:3000;
}

upstream nextjs_dc2 {
    server dc2.diwa-date.com:3000;
}

# WebSocket proxy
server {
    listen 443 ssl;
    server_name ws.diwa-date.com;

    location / {
        proxy_pass http://websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 6. Security Considerations

1. **SSL/TLS**: Always use HTTPS for production deployments
2. **Firewall**: Restrict RabbitMQ and Redis ports to only allow connections from the WebSocket server
3. **Redis Security**: Use strong passwords and consider Redis AUTH and TLS
4. **CORS**: Configure CORS to only allow your application domains

### 7. Monitoring

Monitor the following metrics:
- WebSocket connection count
- RabbitMQ queue sizes
- Redis connection status and memory usage
- Message delivery rates
- Server health endpoints

Access the health check endpoint:
```
GET https://ws.diwa-date.com/health
```

### 8. Scaling Considerations

- **WebSocket Server**: Can be horizontally scaled with a load balancer and shared RabbitMQ/Redis
- **RabbitMQ**: Consider clustering for high availability
- **Redis**: Use Redis Cluster or Redis Sentinel for high availability and scaling
- **NextJS Apps**: Scale independently in each datacenter based on regional traffic

## Testing the Setup

1. Connect from different datacenters:
```javascript
// Test from each NextJS instance
const socket = io('https://ws.diwa-date.com', {
    withCredentials: true
});

socket.on('connect', () => {
    console.log('Connected from datacenter X');
});
```

2. Test cross-datacenter messaging:
- Send a message from a user in DC1
- Verify it's received by a user in DC2

3. Test failover scenarios:
- Stop one NextJS instance
- Verify users can still connect through other instances