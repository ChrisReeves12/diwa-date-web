import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import redis from '@/lib/redis';
import { User, SessionData } from '../types';
import { getRedisKey } from './cache.helpers';
import crypto from "crypto";

// Session constants
const SESSION_ROTATION_TIME = parseInt(process.env.SESSION_ROTATION_TIME_MIN || '2') * 60;
const SESSION_EXPIRY = parseInt(process.env.SESSION_EXPIRY_MIN || '1440') * 60;
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'session_id';

/**
 * Create a new session for a user
 * @param user The user object to store in the session
 * @param response Optional NextResponse to set the cookie on
 * @returns The session ID
 */
export async function createSession(
  user: User,
  response?: NextResponse
): Promise<string> {
  const sessionId = crypto.randomBytes(40).toString('hex');

  // Store user data in Redis with the session ID as the key
  await redis.set(
    getRedisKey(`session:${sessionId}`),
    JSON.stringify({
      userId: user.id.toString(),
      email: user.email,
      createdAt: Date.now()
    }),
    'EX',
    SESSION_EXPIRY
  );

  // Set the session cookie if a response object is provided
  if (response) {
    response.cookies.set({
      name: process.env.SESSION_COOKIE_NAME as string,
      value: sessionId,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_EXPIRY,
      path: '/'
    });
  }

  return sessionId;
}

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

/**
 * Rotate the session ID to prevent session hijacking
 * @param currentSessionId The current session ID
 * @param response NextResponse to set the new cookie on
 * @returns The new session ID
 */
export async function rotateSession(
  currentSessionId: string,
  response: NextResponse
): Promise<string | null> {
  // Get current session data
  const sessionData = await getSessionData(currentSessionId);

  if (!sessionData) {
    return null;
  }

  // Check if rotation is needed (session older than SESSION_ROTATION_TIME)
  const sessionAge = (Date.now() - sessionData.createdAt) / 1000;
  if (sessionAge < SESSION_ROTATION_TIME) {
    return currentSessionId; // No need to rotate yet
  }

  // Create new session with updated timestamp
  const newSessionId = uuidv4();

  // Store updated session data with new ID
  await redis.set(
    getRedisKey(`session:${newSessionId}`),
    JSON.stringify({
      ...sessionData,
      createdAt: Date.now()
    }),
    'EX',
    SESSION_EXPIRY
  );

  // Set the new session cookie
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: newSessionId,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_EXPIRY,
    path: '/'
  });

  // Delete the old session after a short delay to ensure the new one is being used
  // This prevents logout if there's any delay in cookie processing
  setTimeout(async () => {
    await redis.del(getRedisKey(`session:${currentSessionId}`));
  }, 5000);

  return newSessionId;
}

/**
 * Get the session ID from cookies or request
 * @param request Optional NextRequest object
 * @returns The session ID or undefined if not found
 */
export async function getSessionId(request?: NextRequest): Promise<string | undefined> {
  if (request) {
    return request.cookies.get(SESSION_COOKIE_NAME)?.value;
  }

  const cookieStore = await cookies();

  return cookieStore.get?.(SESSION_COOKIE_NAME)?.value;
}

/**
 * Delete a session (logout)
 * @param sessionId The session ID to delete
 * @param response Optional NextResponse to clear the cookie
 */
export async function deleteSession(
  sessionId: string,
  response?: NextResponse
): Promise<void> {
  // Delete session from Redis
  await redis.del(getRedisKey(`session:${sessionId}`));

  // Clear the cookie if response is provided
  if (response) {
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });
  }
}
