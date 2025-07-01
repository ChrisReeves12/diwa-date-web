import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/server-side-helpers/user.helpers';
import { cookies } from 'next/headers';
import { makeObjectPublic } from '@/lib/s3';
import { UserPhoto } from '@/types/user-photo.type';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current photos from user
    const currentPhotos = (currentUser.photos as unknown as UserPhoto[]) || [];
    
    // Filter out fake/random photos and only process real user uploads
    const realPhotos = currentPhotos.filter(photo => !photo.path.startsWith('random'));
    
    if (realPhotos.length === 0) {
      return NextResponse.json({ 
        message: 'No user-uploaded photos found to fix',
        fixedCount: 0 
      });
    }

    let fixedCount = 0;
    const errors: string[] = [];

    // Fix permissions for each real photo
    for (const photo of realPhotos) {
      try {
        const s3Key = `user-images/${photo.path}`;
        await makeObjectPublic(s3Key);
        fixedCount++;
        console.log(`Fixed permissions for photo: ${s3Key}`);
      } catch (error) {
        console.error(`Failed to fix permissions for photo ${photo.path}:`, error);
        errors.push(`Failed to fix ${photo.path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed permissions for ${fixedCount} out of ${realPhotos.length} photos`,
      fixedCount,
      totalPhotos: realPhotos.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Fix photo permissions error:', error);
    return NextResponse.json({ 
      error: 'Failed to fix photo permissions' 
    }, { status: 500 });
  }
}
