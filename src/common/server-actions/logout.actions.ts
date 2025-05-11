'use server';

import { cookies } from 'next/headers';
import { logoutUser } from '../../server-side-helpers/user.helpers';
import { logError } from '../../server-side-helpers/logging.helpers';

interface LogoutResult {
  success: boolean;
  message?: string;
}

/**
 * Server action to handle user logout
 * Deletes the session from Redis and clears the session cookie
 */
export async function logoutAction(): Promise<LogoutResult> {
  try {
    // Call the logout function that will delete the session from Redis
    await logoutUser(await cookies());

    // Clear the session cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: process.env.SESSION_COOKIE_NAME as string,
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    });

    return {
      success: true,
      message: 'Logged out successfully'
    };
  } catch (error: any) {
    logError(error, 'Logout failed');
    return {
      success: false,
      message: 'An error occurred during logout'
    };
  }
}
