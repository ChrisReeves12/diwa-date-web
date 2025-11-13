'use server';

import { generateGoogleAuthUrl } from '@/server-side-helpers/google-oauth.helpers';
import { logError } from '@/server-side-helpers/logging.helpers';

export async function getGoogleSignUpUrl(): Promise<string> {
  try {
    const url = generateGoogleAuthUrl(true); // true = signup flow
    if (!url) {
      throw new Error('Failed to generate authentication URL');
    }
    return url;
  } catch (error: any) {
    logError(error, 'Failed to generate Google sign up URL');
    throw error;
  }
}
