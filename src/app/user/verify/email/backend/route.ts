import { getCurrentUser, verifyUserEmail } from "@/server-side-helpers/user.helpers";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const { token } = await request.json();
    const currentUser = await getCurrentUser(await cookies());

    if (!currentUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await verifyUserEmail(token, currentUser.id);

    if (result.status === 200) {
        return NextResponse.json({}, { status: 200 });
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: result.status });
}