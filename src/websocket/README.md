# WebSocket Implementation with RabbitMQ

This directory contains the WebSocket implementation for real-time features using Socket.IO and RabbitMQ.

## Architecture Overview

- **Socket.IO**: Handles WebSocket connections and real-time events
- **RabbitMQ**: Enables message distribution across multiple server instances
- **Custom Next.js Server**: Integrates Socket.IO with the Next.js application

## Key Components

### 1. RabbitMQ Service (`services/rabbitmq.service.ts`)
- Manages RabbitMQ connections and channels
- Handles message publishing and consuming
- Implements automatic reconnection logic
- Sets up exchanges and queues for different message types

### 2. Socket.IO Service (`services/socketio.service.ts`)
- Manages WebSocket connections
- Authenticates users via session cookies
- Handles room management (user rooms, conversation rooms)
- Integrates with RabbitMQ for cross-server communication

### 3. WebSocket Events (`types/websocket-events.types.ts`)
- Type-safe event definitions for client-server communication
- Includes events for notifications, messages, presence, and matches

## Usage

### Starting the Server

```bash
# Development
npm run dev

# Production
npm run build
npm run start
```

### Client-Side Usage

```typescript
import { useWebSocket } from '@/hooks/use-websocket';

function MyComponent() {
  const { isConnected, on, emit, sendMessage } = useWebSocket();

  useEffect(() => {
    // Listen for new messages
    on('message:new', (data) => {
      console.log('New message:', data);
    });

    // Listen for user online status
    on('user:online', (data) => {
      console.log('User came online:', data.userId);
    });

    return () => {
      // Cleanup listeners
      off('message:new');
      off('user:online');
    };
  }, [on, off]);

  // Send a message
  const handleSendMessage = async () => {
    const result = await sendMessage('conversation123', 'Hello!');
    if (result.success) {
      console.log('Message sent:', result.messageId);
    }
  };
}
```

### Server-Side Usage (API Routes)

```typescript
import { emitToUser, emitToRoom } from '@/websocket/services/websocket-helper';

// In an API route or server action
export async function sendNotification(userId: string) {
  await emitToUser(userId, 'notification:new', {
    id: 'notif123',
    type: 'match',
    title: 'New Match!',
    message: 'You have a new match',
    userId,
    timestamp: new Date()
  });
}
```

## RabbitMQ Configuration

The system uses three exchange types:

1. **Direct Exchange (`user.direct`)**: For user-specific messages
2. **Topic Exchange (`events.topic`)**: For flexible routing patterns
3. **Fanout Exchange (`presence.fanout`)**: For broadcasting presence updates

## Environment Variables

```env
# RabbitMQ Configuration
RABBITMQ_HOST=127.0.0.1
RABBITMQ_PORT=5672
RABBITMQ_USERNAME=guest
RABBITMQ_PASSWORD=guest

# WebSocket Configuration
WEBSOCKET_PORT=3001  # Optional, defaults to same as Next.js port
```

## Features

- **Real-time Notifications**: Push notifications to users instantly
- **Message Delivery**: Real-time chat messages with typing indicators
- **Online/Offline Status**: Track user presence across the platform
- **Match Notifications**: Instant notifications when users match
- **Scalable Architecture**: Support for multiple server instances via RabbitMQ

## Message Flow

1. Client emits event → Socket.IO Server
2. Server processes event and saves to database
3. Server publishes to RabbitMQ exchange
4. RabbitMQ routes to appropriate queues
5. All server instances consume messages
6. Servers emit to connected clients in relevant rooms

## Security

- Session-based authentication via cookies
- User isolation (users can only receive their own messages)
- Room-based access control for conversations
- Input validation on all events 