import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/server-side-helpers/user.helpers';
import { cookies } from 'next/headers';
import { prismaRead, prismaWrite } from '@/lib/prisma';
import { UserPhoto } from '@/types/user-photo.type';
import { deleteFileFromS3 } from '@/lib/s3';

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { photoPath } = await request.json();

    // Validate input
    if (!photoPath) {
      return NextResponse.json({ error: 'Photo path is required' }, { status: 400 });
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
    
    // Find the photo to delete
    const photoIndex = existingPhotos.findIndex(photo => photo.path === photoPath);
    if (photoIndex === -1) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Remove photo from array
    const updatedPhotos = existingPhotos.filter(photo => photo.path !== photoPath);
    
    // Reorder remaining photos
    updatedPhotos.forEach((photo, index) => {
      photo.sortOrder = index;
    });

    // Determine new main photo if the deleted photo was the main photo
    let newMainPhoto = user.mainPhoto;
    if (user.mainPhoto === photoPath) {
      newMainPhoto = updatedPhotos.length > 0 ? updatedPhotos[0].path : null;
    }

    // Update user in database
    await prismaWrite.users.update({
      where: { id: currentUser.id },
      data: {
        photos: updatedPhotos as unknown as any,
        numOfPhotos: updatedPhotos.length,
        mainPhoto: newMainPhoto,
        updatedAt: new Date()
      }
    });

    // Delete file from S3
    try {
      await deleteFileFromS3(photoPath);
    } catch (s3Error) {
      console.error('S3 deletion error:', s3Error);
      // Continue even if S3 deletion fails - database is already updated
    }

    return NextResponse.json({
      success: true,
      deletedPhotoPath: photoPath,
      newMainPhoto: newMainPhoto,
      totalPhotos: updatedPhotos.length
    });

  } catch (error) {
    console.error('Delete photo error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete photo' 
    }, { status: 500 });
  }
}
