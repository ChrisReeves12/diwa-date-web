import Redis from 'ioredis';

let redis: Redis | null = null;

/**
 * Get or create the Redis instance
 */
export function getRedisClient(): Redis {
  if (!redis) {
    const redisConfig = {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      keyPrefix: process.env.REDIS_KEY_PREFIX ? `${process.env.REDIS_KEY_PREFIX}:` : '',

      // TLS configuration
      ...(process.env.REDIS_TLS === 'true' && {
        tls: {
          rejectUnauthorized: false
        }
      }),

      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        console.log(`[Redis] Retrying connection... Attempt ${times}, delay: ${delay}ms`);
        return delay;
      },

      maxRetriesPerRequest: 3,
      enableOfflineQueue: true,
      connectTimeout: 10000,
      enableReadyCheck: false,
      showFriendlyErrorStack: process.env.NODE_ENV !== 'production'
    };

    redis = new Redis(redisConfig);

    redis.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });

    redis.on('ready', () => {
      console.log('[Redis] Ready to accept commands');
    });

    redis.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
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

const redisProxy = new Proxy({} as Redis, {
  get(_, prop) {
    const client = getRedisClient();
    return Reflect.get(client, prop, client);
  }
});

export default redisProxy;
