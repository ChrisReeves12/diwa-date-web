import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/server-side-helpers/user.helpers';
import { prismaWrite } from '@/lib/prisma';
import { appendMediaRootToImageUrl } from '@/server-side-helpers/user.helpers';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const filePath = String(body?.filePath || '').trim();
        const contentType = String(body?.contentType || '').trim();

        if (!filePath) {
            return NextResponse.json({ error: 'filePath is required' }, { status: 400 });
        }

        const cookieStore = await cookies();
        const currentUser = await getCurrentUser(cookieStore, false);
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const currentPhotos = (currentUser.photos as any[]) || [];
        const newPhoto = {
            path: filePath,
            sortOrder: currentPhotos.length || 0,
            caption: undefined as string | undefined,
            croppedImageData: undefined as any,
            isHidden: false,
            isRejected: false,
            messages: [] as string[],
            uploadedAt: new Date().toISOString(),
        };

        const updatedPhotos = [...currentPhotos, newPhoto];

        await prismaWrite.$executeRaw`
      UPDATE users
      SET "photos" = ${JSON.stringify(updatedPhotos)}::jsonb,
          "numOfPhotos" = ${updatedPhotos.filter((p: any) => !p.isRejected).length},
          "updatedAt" = ${new Date()}
      WHERE id = ${currentUser.id}
    `;

        return NextResponse.json({
            success: true,
            photo: {
                ...newPhoto,
                url: appendMediaRootToImageUrl(newPhoto.path),
                croppedImageUrl: null,
            }
        });
    } catch (error) {
        console.error('Register photo error:', error);
        return NextResponse.json({ error: 'Failed to register photo' }, { status: 500 });
    }
}


