'use server';

import { cookies, headers } from 'next/headers';
import { authenticateUser, completeTwoFactorAuth } from '@/server-side-helpers/user.helpers';
import { generateAndSendTwoFactorCode } from '@/server-side-helpers/two-factor.helpers';
import { logError } from '@/server-side-helpers/logging.helpers';
import { getIPGeolocation } from '@/server-side-helpers/session-db.helpers';
import { prismaRead, prismaWrite } from '@/lib/prisma';

interface LoginResult {
  success: boolean;
  message?: string;
  requiresTwoFactor?: boolean;
  userId?: number;
  twoFactorMessage?: string;
}

/**
 * Store or update browser tracking data
 */
async function storeBrowserData(
  userId: number,
  formData: FormData,
  cookieConsentDeclined: boolean
): Promise<void> {
  const existingBrowser = await prismaRead.userBrowsers.findFirst({
    where: {
      userId: userId,
      fingerprintId: formData.get('browserFingerprint') as string
    }
  });

  if (existingBrowser) {
    await prismaWrite.userBrowsers.update({
      where: {
        id: existingBrowser.id
      },
      data: {
        count: existingBrowser.count + 1,
        userAgent: formData.get('browserUserAgent') as string,
        cookies: !cookieConsentDeclined ? formData.get('browserCookies') as string : null,
        updatedAt: new Date()
      }
    });
  } else {
    await prismaWrite.userBrowsers.create({
      data: {
        userId: userId,
        fingerprintId: formData.get('browserFingerprint') as string,
        count: 1,
        userAgent: formData.get('browserUserAgent') as string,
        cookies: !cookieConsentDeclined ? formData.get('browserCookies') as string : null,
      }
    });
  }
}

export async function loginAction(formData: FormData): Promise<LoginResult> {
  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const cookieConsent = formData.get('cookieConsent') as string;

    // Check if user has declined cookie consent
    const cookieConsentDeclined = cookieConsent === 'declined';

    // Validate input
    if (!email || !password) {
      return {
        success: false,
        message: 'Email and password are required'
      };
    }

    const headersList = await headers();

    const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0].trim() ||
      headersList.get('x-real-ip') ||
      headersList.get('cf-connecting-ip') ||
      null;

    const userAgent = headersList.get('user-agent') || '';

    // Get IP geolocation
    let ipGeoCountry: string | undefined;
    let ipGeoCity: string | undefined;

    if (ipAddress) {
      try {
        const geoData = await getIPGeolocation(ipAddress);
        ipGeoCountry = geoData.country;
        ipGeoCity = geoData.city;
      } catch (error) {
        console.warn('Failed to get IP geolocation:', error);
      }
    }

    const requestData = {
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
      ipGeoCountry,
      ipGeoCity
    };

    // Authenticate user with request data
    const result = await authenticateUser(email, password, undefined, requestData);

    if (!result.success) {
      // Check if 2FA is required
      if (result.requiresTwoFactor) {
        return {
          success: false,
          message: result.message || 'Two-factor authentication required',
          requiresTwoFactor: true,
          userId: result.userId,
          twoFactorMessage: result.twoFactorMessage
        };
      }

      return {
        success: false,
        message: result.message || 'An error occurred during authentication.'
      };
    }

    // If authentication was successful, set the session cookie
    if (result.sessionId) {
      const cookieStore = await cookies();
      const cookieOptions: any = {
        name: process.env.SESSION_COOKIE_NAME as string,
        value: result.sessionId,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
      };

      // If user declined cookies, make it session-only (expires when browser closes)
      // Otherwise, set maxAge for persistent storage
      if (!cookieConsentDeclined) {
        cookieOptions.maxAge = parseInt(process.env.SESSION_EXPIRY_MIN || '1440') * 60;
      }

      cookieStore.set(cookieOptions);

      if (result.userId) {
        await storeBrowserData(result.userId, formData, cookieConsentDeclined);
      }
    }

    return {
      success: true
    };
  } catch (error: any) {
    logError(error, 'Login failed');
    return {
      success: false,
      message: 'An error occurred during login'
    };
  }
}

/**
 * Verify two-factor authentication code and complete login
 */
export async function verifyTwoFactorCodeAction(formData: FormData): Promise<LoginResult> {
  try {
    const userId = parseInt(formData.get('userId') as string);
    const code = formData.get('code') as string;
    const cookieConsent = formData.get('cookieConsent') as string;

    // Check if user has declined cookie consent
    const cookieConsentDeclined = cookieConsent === 'declined';

    // Validate input
    if (!userId || !code) {
      return {
        success: false,
        message: 'User ID and verification code are required'
      };
    }

    // Remove any dashes from the code before validation
    const cleanedCode = code.replace(/-/g, '');

    if (cleanedCode.length !== 6 || !/^\d{6}$/.test(cleanedCode)) {
      return {
        success: false,
        message: 'Please enter a valid 6-digit verification code'
      };
    }

    const headersList = await headers();

    const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0].trim() ||
      headersList.get('x-real-ip') ||
      headersList.get('cf-connecting-ip') ||
      null;

    const userAgent = headersList.get('user-agent') || '';

    // Get IP geolocation
    let ipGeoCountry: string | undefined;
    let ipGeoCity: string | undefined;

    if (ipAddress) {
      try {
        const geoData = await getIPGeolocation(ipAddress);
        ipGeoCountry = geoData.country;
        ipGeoCity = geoData.city;
      } catch (error) {
        console.warn('Failed to get IP geolocation:', error);
      }
    }

    const requestData = {
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
      ipGeoCountry,
      ipGeoCity
    };

    // Complete 2FA authentication
    const result = await completeTwoFactorAuth(userId, cleanedCode, undefined, requestData, cookieConsentDeclined);

    if (!result.success) {
      return {
        success: false,
        message: result.message || 'Invalid verification code'
      };
    }

    // If authentication was successful, set the session cookie
    if (result.sessionId) {
      const cookieStore = await cookies();
      const cookieOptions: any = {
        name: process.env.SESSION_COOKIE_NAME as string,
        value: result.sessionId,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
      };

      // If user declined cookies, make it session-only (expires when browser closes)
      // Otherwise, set maxAge for persistent storage
      if (!cookieConsentDeclined) {
        cookieOptions.maxAge = parseInt(process.env.SESSION_EXPIRY_MIN || '1440') * 60;
      }

      cookieStore.set(cookieOptions);

      if (result.userId) {
        await storeBrowserData(result.userId, formData, cookieConsentDeclined);
      }
    }

    return {
      success: true
    };
  } catch (error: any) {
    logError(error, '2FA verification failed');
    return {
      success: false,
      message: 'An error occurred during verification'
    };
  }
}

/**
 * Resend two-factor authentication code
 */
export async function resendTwoFactorCodeAction(formData: FormData): Promise<{ success: boolean; message: string }> {
  try {
    const userId = parseInt(formData.get('userId') as string);

    if (!userId) {
      return {
        success: false,
        message: 'User ID is required'
      };
    }

    // Generate and send new 2FA code
    const result = await generateAndSendTwoFactorCode(userId);

    if (!result.success) {
      return {
        success: false,
        message: result.error || 'Failed to send verification code'
      };
    }

    return {
      success: true,
      message: 'A new verification code has been sent to your email'
    };
  } catch (error: any) {
    logError(error, 'Resend 2FA code failed');
    return {
      success: false,
      message: 'An error occurred while sending the code'
    };
  }
}
