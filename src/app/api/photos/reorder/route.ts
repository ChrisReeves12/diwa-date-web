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

    const { photoOrder } = await request.json();

    // Validate input
    if (!Array.isArray(photoOrder)) {
      return NextResponse.json({ error: 'Photo order must be an array' }, { status: 400 });
    }

    // Get current user photos
    const user = await prismaRead.users.findUnique({
      where: { id: currentUser.id },
      select: { photos: true, mainPhoto: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse existing photos
    const existingPhotos = (user.photos as unknown as UserPhoto[]) || [];
    
    // Validate that all photo paths in the order exist
    const existingPaths = existingPhotos.map(photo => photo.path);
    const invalidPaths = photoOrder.filter(path => !existingPaths.includes(path));
    
    if (invalidPaths.length > 0) {
      return NextResponse.json({ 
        error: 'Invalid photo paths in order' 
      }, { status: 400 });
    }

    // Create a map of existing photos for easy lookup
    const photoMap = new Map(existingPhotos.map(photo => [photo.path, photo]));
    
    // Reorder photos based on the provided order
    const reorderedPhotos = photoOrder.map((path, index) => {
      const photo = photoMap.get(path)!;
      return {
        ...photo,
        sortOrder: index
      };
    });

    // The first photo in the new order becomes the main photo
    const newMainPhoto = reorderedPhotos.length > 0 ? reorderedPhotos[0].path : null;

    // Update user in database
    await prismaWrite.users.update({
      where: { id: currentUser.id },
      data: {
        photos: reorderedPhotos as unknown as any,
        mainPhoto: newMainPhoto,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      photos: reorderedPhotos,
      mainPhoto: newMainPhoto
    });

  } catch (error) {
    console.error('Reorder photos error:', error);
    return NextResponse.json({ 
      error: 'Failed to reorder photos' 
    }, { status: 500 });
  }
}
