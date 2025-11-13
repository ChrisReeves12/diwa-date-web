import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/server-side-helpers/user.helpers';
import { cookies } from 'next/headers';
import { reviewPhotos } from '@/server-side-helpers/compliance.helper';

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(await cookies());
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const files = formData.getAll('files') as File[];
        const s3PathsRaw = formData.getAll('s3Paths');
        const s3Paths = s3PathsRaw.map(v => String(v));

        if (!files || files.length === 0) {
            return NextResponse.json({ error: 'No files provided' }, { status: 400 });
        }

        if (files.length !== s3Paths.length) {
            return NextResponse.json({ error: 'Files and s3Paths length mismatch' }, { status: 400 });
        }

        const imageFiles = files.map((imageFile, idx) => ({ imageFile, s3Path: s3Paths[idx] }));

        const result = await reviewPhotos(imageFiles, currentUser.id);

        if (!result.success) {
            return NextResponse.json({ error: result.error || 'Photo review failed' }, { status: 400 });
        }

        const photos = (result.photos || []).map((p: any) => ({
            s3Path: p.s3Path,
            isRejected: p.isRejected,
            messages: p.messages || []
        }));

        return NextResponse.json({ success: true, photos });
    } catch (error) {
        console.error('Photo review API error:', error);
        return NextResponse.json({ error: 'Failed to review photos' }, { status: 500 });
    }
}


