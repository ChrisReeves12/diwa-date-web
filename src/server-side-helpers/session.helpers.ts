import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import redis from '@/lib/redis';
import { User, SessionData, SessionRequestData, SessionInsertData } from '../types';
import { getRedisKey } from './cache.helpers';
import crypto from "crypto";
import { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { createSessionRecord } from './session-db.helpers';

// Session constants
const SESSION_ROTATION_TIME = parseInt(process.env.SESSION_ROTATION_TIME_MIN || '2') * 60;
const SESSION_EXPIRY = parseInt(process.env.SESSION_EXPIRY_MIN || '1440') * 60;
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'session_id';

/**
 * Create a randomized cookie string.
 */
function createSessionCookieString() {
  return crypto.randomBytes(40).toString('hex');
}

/**
 * Create a new session for a user
 * @param user The user object to store in the session
 * @param response Optional NextResponse to set the cookie on
 * @param requestData Optional request data for session tracking
 * @param cookieConsentDeclined Whether the user has declined cookie consent
 * @returns The session ID
 */
export async function createSession(
  user: User,
  response?: NextResponse,
  requestData?: SessionRequestData,
  cookieConsentDeclined: boolean = false
): Promise<string> {
  const sessionId = createSessionCookieString();
  const now = Date.now();

  const sessionData = {
    userId: user.id.toString(),
    email: user.email,
    createdAt: now
  };

  // Store user data in Redis with the session ID as the key
  await redis.set(
    getRedisKey(`session:${sessionId}`),
    JSON.stringify(sessionData),
    'EX',
    SESSION_EXPIRY
  );

  // Insert session record into database (non-blocking)
  if (requestData) {
    const sessionInsertData: SessionInsertData = {
      id: sessionId,
      userId: user.id,
      payload: JSON.stringify(sessionData),
      lastActivity: Math.floor(now / 1000), // Convert to seconds for database
      ...requestData
    };

    // Fire and forget - don't block session creation if DB insert fails
    createSessionRecord(sessionInsertData).catch(error => {
      console.error('Failed to log session to database:', error);
    });
  }

  // Set the session cookie if a response object is provided
  if (response) {
    const cookieOptions: any = {
      name: process.env.SESSION_COOKIE_NAME as string,
      value: sessionId,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    };

    // If user declined cookies, make it session-only (expires when browser closes)
    // Otherwise, set maxAge for persistent storage
    if (!cookieConsentDeclined) {
      cookieOptions.maxAge = SESSION_EXPIRY;
    }

    response.cookies.set(cookieOptions);
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
 * @param currentSessionId
 * @param cookieStore
 * @returns The new session ID
 */
export async function rotateSession(
  currentSessionId: string,
  cookieStore: ReadonlyRequestCookies
): Promise<string | null> {
  const sessionData = await getSessionData(currentSessionId);

  if (!sessionData) {
    return null;
  }

  // Check if rotation is needed
  const sessionAge = (Date.now() - sessionData.createdAt) / 1000;
  if (sessionAge < SESSION_ROTATION_TIME) {
    return currentSessionId;
  }

  const newSessionId = createSessionCookieString();

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

  setTimeout(async () => {
    await redis.del(getRedisKey(`session:${currentSessionId}`));
  }, 5000);

  return newSessionId;
}

/**
 * Get the session ID from cookies or request
 * @param cookieStore
 * @returns The session ID or undefined if not found
 */
export async function getSessionId(cookieStore: ReadonlyRequestCookies): Promise<string | undefined> {
  return cookieStore.get?.(SESSION_COOKIE_NAME)?.value;
}

/**
 * Delete a session (logout)
 * @param sessionId The session ID to delete
 */
export async function deleteSession(
  sessionId: string
): Promise<void> {
  await redis.del(getRedisKey(`session:${sessionId}`));
}
