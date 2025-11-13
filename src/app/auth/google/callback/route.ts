import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeGoogleCodeForTokens,
  getGoogleUserInfo,
  findOrCreateUserFromGoogle,
  completeGoogleLogin
} from '@/server-side-helpers/google-oauth.helpers';
import { logError } from '@/server-side-helpers/logging.helpers';
import { prismaRead } from '@/lib/prisma';

function getBaseUrl(request: NextRequest) { const proto = request.headers.get('x-forwarded-proto') || 'https'; const host = request.headers.get('x-forwarded-host') || request.headers.get('host'); return `${proto}://${host}`; }

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for OAuth errors
    if (error) {
      const errorDescription = searchParams.get('error_description') || 'Unknown error';
      logError(new Error(`Google OAuth error: ${error}`), `Google OAuth: ${errorDescription}`);

      // Redirect to login with error
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(errorDescription)}`, getBaseUrl(request))
      );
    }

    // Validate code and state
    if (!code || !state) {
      logError(new Error('Missing code or state'), 'Google OAuth: Missing required parameters');
      return NextResponse.redirect(
        new URL('/login?error=Invalid+request', getBaseUrl(request))
      );
    }

    // Decode state to check if this is a signup flow
    let isSignup = false;
    try {
      const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
      isSignup = decodedState.isSignup || false;
    } catch (e) {
      console.warn('Failed to decode state parameter');
    }

    // Exchange code for tokens
    const tokens = await exchangeGoogleCodeForTokens(code);

    // Get user info from Google
    const googleUserInfo = await getGoogleUserInfo(tokens.access_token);

    // Find or create user
    const userResult = await findOrCreateUserFromGoogle(googleUserInfo, isSignup);

    // If signup flow or user not found during login, redirect to registration with Google data
    if (!userResult.success || (isSignup && !userResult.userId)) {
      const registrationData = {
        email: userResult.email || '',
        firstName: userResult.name ? userResult.name.split(' ')[0] : '',
        lastName: userResult.name ? userResult.name.split(' ').slice(1).join(' ') : '',
        picture: userResult.picture || '',
        googleId: userResult.googleId || ''
      };

      const registrationUrl = new URL('/registration', getBaseUrl(request));
      registrationUrl.searchParams.set('googleData', Buffer.from(JSON.stringify(registrationData)).toString('base64'));
      registrationUrl.searchParams.set('authMethod', 'google');

      return NextResponse.redirect(registrationUrl);
    }

    // For login flow, userResult.userId should be present
    if (!userResult.userId) {
      logError(new Error('No userId returned'), 'Google OAuth: Login missing userId');
      return NextResponse.redirect(
        new URL('/login?error=Authentication+failed', getBaseUrl(request))
      );
    }

    // Complete login - create session
    const loginResult = await completeGoogleLogin(userResult.userId, false);

    if (!loginResult.success || !loginResult.sessionId) {
      logError(new Error('Session creation failed'), 'Google OAuth: Failed to create session');
      return NextResponse.redirect(
        new URL('/login?error=Session+creation+failed', getBaseUrl(request))
      );
    }

    // Create redirect response to intermediate page that will refresh and redirect to home
    const redirectResponse = NextResponse.redirect(new URL('/auth/google/callback-redirect', getBaseUrl(request)));

    // Set session cookie on the response
    const sessionCookieName = process.env.SESSION_COOKIE_NAME || 'session';
    redirectResponse.cookies.set({
      name: sessionCookieName,
      value: loginResult.sessionId,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: parseInt(process.env.SESSION_EXPIRY_MIN || '1440') * 60
    });

    return redirectResponse;
  } catch (error: any) {
    logError(error, 'Google OAuth callback error');
    return NextResponse.redirect(
      new URL('/login?error=An+error+occurred+during+authentication', getBaseUrl(request))
    );
  }
}
