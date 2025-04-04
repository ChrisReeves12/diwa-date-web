import Redis from 'ioredis';

// Initialize Redis client with credentials from .env
const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,

  retryStrategy: (times) => {
    return Math.min(times * 50, 2000);
  }
});

// Handle connection events
redis.on('connect', () => {

});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

export default redis;
