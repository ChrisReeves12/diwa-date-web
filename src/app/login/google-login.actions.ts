'use server';

import { generateGoogleAuthUrl } from '@/server-side-helpers/google-oauth.helpers';
import { logError } from '@/server-side-helpers/logging.helpers';

export async function getGoogleSignInUrl(): Promise<string> {
  try {
    const url = generateGoogleAuthUrl(false); // false = login flow
    if (!url) {
      throw new Error('Failed to generate authentication URL');
    }
    return url;
  } catch (error: any) {
    logError(error, 'Failed to generate Google sign in URL');
    throw error;
  }
}
