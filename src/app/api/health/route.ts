import { NextResponse } from "next/server";
import { version } from '@/config/app';

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        version,
        timestamp: new Date().toISOString()
    });
}
