import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
    try {
        // Get the session from the HTTP-only cookie
        const session = await getServerSession(authOptions);
        
        if (!session || !session.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get the session cookie value
        const cookieStore = cookies();
        const sessionCookie = cookieStore.get(process.env.SESSION_COOKIE_NAME || 'diwa_date_session');

        if (!sessionCookie) {
            return NextResponse.json(
                { error: 'Session not found' },
                { status: 401 }
            );
        }

        // Return the session token that can be used for WebSocket authentication
        // This is the same token that's in the HTTP-only cookie
        return NextResponse.json({
            token: sessionCookie.value,
            userId: session.user.id
        });
    } catch (error) {
        console.error('Error generating WebSocket token:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}