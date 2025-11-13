import axios from 'axios';
import { prismaRead, prismaWrite } from '@/lib/prisma';
import { logError } from '@/server-side-helpers/logging.helpers';
import { createSession } from '@/server-side-helpers/session.helpers';
import { User } from '@/types';

export interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  refresh_token?: string;
  token_type: string;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  given_name: string;
  family_name: string;
  picture?: string;
  email_verified: boolean;
}

export interface GoogleOAuthResult {
  success: boolean;
  userId?: number;
  email?: string;
  name?: string;
  picture?: string;
  googleId?: string;
  error?: string;
}

/**
 * Generate Google OAuth authorization URL
 */
export function generateGoogleAuthUrl(isSignup: boolean = false): string {
  const clientId = process.env.NEXT_GOOGLE_OAUTH_CLIENT_ID;
  const redirectUri = process.env.NEXT_GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error('Google OAuth environment variables are not configured');
  }

  const scope = 'openid profile email';
  const state = Buffer.from(JSON.stringify({ isSignup, timestamp: Date.now() })).toString('base64');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scope,
    state: state,
    access_type: 'offline',
    prompt: isSignup ? 'consent' : 'login'
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange Google authorization code for tokens
 */
export async function exchangeGoogleCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  try {
    const clientId = process.env.NEXT_GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const redirectUri = process.env.NEXT_GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Google OAuth environment variables are not configured');
    }

    const response = await axios.post<GoogleTokenResponse>(
      'https://oauth2.googleapis.com/token',
      {
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error: any) {
    logError(error, 'Failed to exchange Google code for tokens');
    throw new Error('Failed to exchange authorization code');
  }
}

/**
 * Get user information from Google using access token
 */
export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  try {
    const response = await axios.get<GoogleUserInfo>(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    return response.data;
  } catch (error: any) {
    logError(error, 'Failed to get Google user info');
    throw new Error('Failed to retrieve user information from Google');
  }
}

/**
 * Find or create user from Google OAuth
 */
export async function findOrCreateUserFromGoogle(
  googleUserInfo: GoogleUserInfo,
  isSignup: boolean = false
): Promise<GoogleOAuthResult> {
  try {
    const email = googleUserInfo.email.toLowerCase();

    // Check if user already exists
    const existingUser = await prismaRead.users.findUnique({
      where: { email },
      select: { id: true, email: true, displayName: true }
    });

    if (existingUser) {
      // User exists - return success for login
      // Update googleId if not already set (for backwards compatibility)
      const userRecord = await prismaRead.users.findUnique({
        where: { email },
        select: { id: true, googleId: true }
      });

      if (userRecord && !userRecord.googleId) {
        // Update googleId if it's not set
        await prismaWrite.users.update({
          where: { id: userRecord.id },
          data: { googleId: googleUserInfo.id, require2fa: false }
        });
      }

      return {
        success: true,
        userId: existingUser.id,
        email: existingUser.email,
        name: existingUser.displayName,
        googleId: googleUserInfo.id
      };
    }

    // User doesn't exist
    if (!isSignup) {
      // For login, user not found - redirect to signup with Google data pre-filled
      return {
        success: false,
        email: googleUserInfo.email,
        name: googleUserInfo.name,
        picture: googleUserInfo.picture,
        googleId: googleUserInfo.id,
        error: 'User not found. Please sign up first.'
      };
    }

    // For signup, create new user
    // Note: We'll need to ask for additional info in the registration flow
    // For now, we return the Google user info so the registration form can be pre-filled
    return {
      success: true,
      email: googleUserInfo.email,
      name: googleUserInfo.name,
      picture: googleUserInfo.picture,
      googleId: googleUserInfo.id
    };
  } catch (error: any) {
    logError(error, 'Failed to find or create user from Google');
    return {
      success: false,
      error: 'An error occurred during authentication'
    };
  }
}

/**
 * Complete Google OAuth login - creates session and sets cookie
 */
export async function completeGoogleLogin(
  userId: number,
  cookieConsentDeclined: boolean = false
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  try {
    // Fetch the full user object
    const user = await prismaRead.users.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Create session for the user
    const sessionId = await createSession(user as unknown as User, undefined, undefined, cookieConsentDeclined);

    if (!sessionId) {
      throw new Error('Failed to create session');
    }

    return {
      success: true,
      sessionId: sessionId
    };
  } catch (error: any) {
    logError(error, 'Failed to complete Google login');
    return {
      success: false,
      error: 'Failed to create session'
    };
  }
}
