"use strict";
/**
 * Helper functions for Redis cache operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisKey = getRedisKey;
/**
 * Generate a Redis key with the application prefix
 * Note: The prefix is now handled by the Redis client configuration
 * @param key The key to use
 * @returns The key (prefix is handled by Redis client)
 */
function getRedisKey(key) {
    // The prefix is now handled by the Redis client configuration
    // This function is kept for backward compatibility
    return key;
}
//# sourceMappingURL=cache.helpers.js.map