import Redis from 'ioredis';

let redis: Redis | null = null;

/**
 * Get or create Redis instance
 * This ensures environment variables are loaded before connecting
 */
export function getRedisClient(): Redis {
  if (!redis) {
    // Redis configuration
    const redisConfig = {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      keyPrefix: process.env.REDIS_KEY_PREFIX ? `${process.env.REDIS_KEY_PREFIX}:` : '',

      // TLS configuration
      ...(process.env.REDIS_TLS === 'true' && {
        tls: {
          rejectUnauthorized: false // For development, in production you might want this to be true
        }
      }),

      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        console.log(`[Redis] Retrying connection... Attempt ${times}, delay: ${delay}ms`);
        return delay;
      },

      // Connection options
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true,
      connectTimeout: 10000,

      // Disable ready check to speed up connection
      enableReadyCheck: false,

      // Show friendly error messages
      showFriendlyErrorStack: process.env.NODE_ENV !== 'production'
    };

    // Initialize Redis client
    redis = new Redis(redisConfig);

    redis.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);

      // Log more details in development
      if (process.env.NODE_ENV !== 'production') {
        console.error('[Redis] Full error:', err);
      }
    });

    redis.on('close', () => {
      console.log('[Redis] Connection closed');
    });

    redis.on('reconnecting', (delay: number) => {
      console.log(`[Redis] Reconnecting in ${delay}ms...`);
    });
  }

  return redis;
}

// Export a proxy that lazily initializes Redis
const redisProxy = new Proxy({} as Redis, {
  get(target, prop, receiver) {
    const client = getRedisClient();
    return Reflect.get(client, prop, client);
  }
});

export default redisProxy;
