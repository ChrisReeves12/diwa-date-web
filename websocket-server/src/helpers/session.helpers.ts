import redis from '../lib/redis';
import { getRedisKey } from './cache.helpers';

/**
 * Type for session data stored in Redis
 */
export type SessionData = {
  userId: string;
  email: string;
  createdAt: number;
};

/**
 * Get the current session data from Redis
 * @param sessionId The session ID
 * @returns The session data or null if not found
 */
export async function getSessionData(sessionId: string): Promise<SessionData | null> {
  const data = await redis.get(getRedisKey(`session:${sessionId}`));

  if (!data) {
    return null;
  }

  return JSON.parse(data);
}