import { cookies as nextCookies } from 'next/headers';
import { NextRequest } from 'next/server';

/**
 * Get a cookie value from either the request or the cookies API
 * @param name The name of the cookie to get
 * @param request Optional NextRequest object for API routes
 * @returns The cookie value or undefined if not found
 */
export function getCookieValue(name: string, request?: NextRequest): string | undefined {
  if (request) {
    return request.cookies.get(name)?.value;
  }

  const cookieStore = nextCookies();

  // @ts-expect-error - The type definitions are incorrect, but this works at runtime
  return cookieStore.get?.(name)?.value;
}
