import { NextRequest, NextResponse } from 'next/server';
import { logoutUser } from '@/server-side-helpers/user.helpers';
import { logError } from '@/server-side-helpers/logging.helpers';
import { LogoutResponse } from '@/types/logout-reponse.interface';

/**
 * Handles user logout API requests
 */
export async function POST(request: NextRequest): Promise<NextResponse<LogoutResponse>> {
    try {
        // Create a response object to clear cookies
        const response = NextResponse.json<LogoutResponse>(
            { status: 'success', message: 'Logged out successfully' },
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        );

        // Call logout function that will delete the session from Redis
        // and clear the session cookie
        await logoutUser(request, response);

        return response;
    } catch (error: any) {
        logError(error, 'Logout failed');
        return NextResponse.json<LogoutResponse>(
            { status: 'error', message: 'An error occurred during logout' },
            { status: 500 }
        );
    }
} 