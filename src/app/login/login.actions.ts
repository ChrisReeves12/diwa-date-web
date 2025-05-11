'use server';

import { cookies } from 'next/headers';
import { authenticateUser } from '@/server-side-helpers/user.helpers';
import { logError } from '@/server-side-helpers/logging.helpers';
import { AuthResponse } from '@/types/auth-response.interface';
import { redirect } from 'next/navigation';

interface LoginResult {
  success: boolean;
  message?: string;
}

export async function loginAction(formData: FormData): Promise<LoginResult> {
  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // Validate input
    if (!email || !password) {
      return {
        success: false,
        message: 'Email and password are required'
      };
    }

    // Authenticate user
    const result = await authenticateUser(email, password);

    if (!result.success) {
      return {
        success: false,
        message: result.message || 'An error occurred during authentication.'
      };
    }

    // If authentication was successful, set the session cookie
    if (result.sessionId) {
      const cookieStore = await cookies();
      cookieStore.set({
        name: process.env.SESSION_COOKIE_NAME as string,
        value: result.sessionId,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: parseInt(process.env.SESSION_EXPIRY_MIN || '1440') * 60,
        path: '/'
      });
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
