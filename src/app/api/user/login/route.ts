import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/server-side-helpers/user.helpers';
import { logError } from '@/server-side-helpers/logging.helpers';
import { AuthResponse } from '@/types/auth-response.interface';

export async function POST(request: NextRequest): Promise<NextResponse<AuthResponse>> {
    try {
        const { email, password } = await request.json();

        // Validate input
        if (!email || !password) {
            return NextResponse.json<AuthResponse>(
                { message: 'Email and password are required' },
                { status: 422 }
            );
        }

        // Create a proper response object to set cookies
        const response = NextResponse.json<AuthResponse>(
            { message: 'ok' },
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        );

        // Authenticate user
        const result = await authenticateUser(email, password, response);

        if (!result.success) {
            return NextResponse.json<AuthResponse>(
                { message: result.message || 'An error occurred during authentication.' },
                { status: 401 }
            );
        }

        // Return the response with the session cookie
        return response;
    } catch (error: any) {
        logError(error, 'Login failed');
        return NextResponse.json<AuthResponse>(
            { message: 'An error occurred during login' },
            { status: 500 }
        );
    }
} 