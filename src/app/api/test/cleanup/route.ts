import { NextRequest, NextResponse } from 'next/server';
import { prismaWrite } from '@/lib/prisma';

export async function DELETE(request: NextRequest) {
    // Only allow in development/test environments
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        if (!email) {
            return NextResponse.json({ error: 'Email required' }, { status: 400 });
        }

        // Delete user by email
        await prismaWrite.users.deleteMany({
            where: {
                email: email
            }
        });

        return NextResponse.json({ success: true, message: `User with email ${email} deleted` });
    } catch (error) {
        console.error('Test cleanup error:', error);
        return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
    }
} 