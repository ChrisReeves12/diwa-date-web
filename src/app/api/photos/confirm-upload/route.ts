import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/server-side-helpers/user.helpers';
import { cookies } from 'next/headers';
import { prismaRead, prismaWrite } from '@/lib/prisma';
import { UserPhoto } from '@/types/user-photo.type';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { s3Key, fileId, originalFileName } = await request.json();

    // Validate input
    if (!s3Key || !fileId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get current user photos
    const user = await prismaRead.users.findUnique({
      where: { id: currentUser.id },
      select: { photos: true, numOfPhotos: true, mainPhoto: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse existing photos
    const existingPhotos = (user.photos as unknown as UserPhoto[]) || [];
    
    // Check photo limit again (safety check)
    if (existingPhotos.length >= 10) {
      return NextResponse.json({ 
        error: 'Photo limit reached' 
      }, { status: 400 });
    }

    // Create new photo object
    const newPhoto: UserPhoto = {
      path: s3Key,
      caption: '',
      isHidden: false,
      sortOrder: existingPhotos.length, // Add to end
      uploadedAt: new Date().toISOString(),
    };

    // Add new photo to array
    const updatedPhotos = [...existingPhotos, newPhoto];
    
    // Determine if this should be the main photo (first photo)
    const shouldBeMainPhoto = existingPhotos.length === 0;
    const mainPhoto = shouldBeMainPhoto ? s3Key : user.mainPhoto;

    // Update user in database
    await prismaWrite.users.update({
      where: { id: currentUser.id },
      data: {
        photos: updatedPhotos as unknown as any,
        numOfPhotos: updatedPhotos.length,
        mainPhoto: mainPhoto,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      photo: newPhoto,
      isMainPhoto: shouldBeMainPhoto,
      totalPhotos: updatedPhotos.length
    });

  } catch (error) {
    console.error('Confirm upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to confirm upload' 
    }, { status: 500 });
  }
}
