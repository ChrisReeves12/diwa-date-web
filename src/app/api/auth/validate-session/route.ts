import { NextRequest, NextResponse } from 'next/server';
import { getSessionData } from '@/server-side-helpers/session.helpers';

export async function POST(request: NextRequest) {
    try {
        // Only allow internal requests
        const internalHeader = request.headers.get('X-Internal-Request');
        if (internalHeader !== 'true') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { sessionToken } = body;

        if (!sessionToken) {
            return NextResponse.json({ error: 'Session token required' }, { status: 400 });
        }

        const sessionData = await getSessionData(sessionToken);
        
        if (!sessionData || !sessionData.userId) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }

        return NextResponse.json({
            userId: sessionData.userId,
            sessionId: sessionToken
        });

    } catch (error) {
        console.error('Error validating session:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}