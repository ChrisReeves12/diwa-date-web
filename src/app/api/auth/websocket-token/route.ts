import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionData, getSessionId } from '@/server-side-helpers/session.helpers';

export async function GET(request: NextRequest) {
    try {
        // Get the session ID from cookies
        const cookieStore = await cookies();
        const sessionId = await getSessionId(cookieStore);

        if (!sessionId) {
            return NextResponse.json(
                { error: 'Session not found' },
                { status: 401 }
            );
        }

        // Validate the session and get session data
        const sessionData = await getSessionData(sessionId);
        
        if (!sessionData || !sessionData.userId) {
            return NextResponse.json(
                { error: 'Invalid session' },
                { status: 401 }
            );
        }

        // Return the session token that can be used for WebSocket authentication
        // This is the same token that's in the HTTP-only cookie
        return NextResponse.json({
            token: sessionId,
            userId: sessionData.userId
        });
    } catch (error) {
        console.error('Error generating WebSocket token:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}