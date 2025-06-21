/**
 * Helper functions for Redis cache operations
 */

/**
 * Generate a Redis key with the application prefix
 * Note: The prefix is now handled by the Redis client configuration
 * @param key The key to use
 * @returns The key (prefix is handled by Redis client)
 */
export function getRedisKey(key: string): string {
  // The prefix is now handled by the Redis client configuration
  // This function is kept for backward compatibility
  return key;
}
