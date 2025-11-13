import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/server-side-helpers/user.helpers';
import { cookies } from 'next/headers';
import { prismaWrite } from '@/lib/prisma';
import { UserPhoto } from '@/types/user-photo.type';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { photoPath, caption } = await request.json();

    if (!photoPath) {
      return NextResponse.json({ error: 'Photo path is required' }, { status: 400 });
    }

    // Validate caption length
    if (caption && caption.length > 200) {
      return NextResponse.json({ error: 'Caption cannot exceed 200 characters' }, { status: 400 });
    }

    // Get current photos from user
    const currentPhotos = (currentUser.photos as unknown as UserPhoto[]) || [];
    
    // Find the photo to update
    const photoIndex = currentPhotos.findIndex(photo => photo.path === photoPath);
    
    if (photoIndex === -1) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Update the caption
    const updatedPhotos = [...currentPhotos];
    updatedPhotos[photoIndex] = {
      ...updatedPhotos[photoIndex],
      caption: caption || ''
    };

    // Update user's photos in database
    await prismaWrite.users.update({
      where: { id: currentUser.id },
      data: { 
        photos: updatedPhotos as any
      }
    });

    return NextResponse.json({ 
      success: true,
      photo: updatedPhotos[photoIndex]
    });

  } catch (error) {
    console.error('Update caption error:', error);
    return NextResponse.json(
      { error: 'Failed to update caption' },
      { status: 500 }
    );
  }
}
