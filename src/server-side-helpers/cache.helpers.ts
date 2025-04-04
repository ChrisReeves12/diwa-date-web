/**
 * Helper functions for Redis cache operations
 */

/**
 * Generate a Redis key with the application prefix
 * @param key The base key to prefix
 * @returns The prefixed key
 */
export function getRedisKey(key: string): string {
  const prefix = process.env.REDIS_KEY_PREFIX || 'app';
  return `${prefix}:${key}`;
}
