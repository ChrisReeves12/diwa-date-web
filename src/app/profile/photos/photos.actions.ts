'use server';

import { appendMediaRootToImageUrl, getCurrentUser } from '@/server-side-helpers/user.helpers';
import { cookies } from 'next/headers';
import { UserPhoto } from '@/types/user-photo.type';

/**
 * Get user photos with presigned URLs for viewing
 */
export async function getUserPhotos() {
  try {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
      throw new Error('User not found');
    }

    const photos = (currentUser.photos as unknown as UserPhoto[]) || [];

    // Generate URLs for each photo
    const photosWithUrls = await Promise.all(
      photos
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(async (photo) => {
          try {
            let url: string | null = null;

            // Check if this is a fake/random image or a real user upload
            if (photo.path.startsWith('random')) {
              // Use the existing media root URL for fake images
              url = appendMediaRootToImageUrl(photo.path) || null;
            } else {
              // Use direct CDN URL for real user uploads (now public-read)
              url = `${process.env.MEDIA_IMAGE_ROOT_URL}/${photo.path}`;
            }

            return {
              ...photo,
              url: url || null
            };
          } catch (error) {
            console.error(`Failed to generate URL for photo ${photo.path}:`, error);
            return {
              ...photo,
              url: null
            };
          }
        })
    );

    return {
      photos: photosWithUrls,
      mainPhoto: currentUser.mainPhoto,
      totalPhotos: currentUser.numOfPhotos || 0
    };
  } catch (error) {
    console.error('Get user photos error:', error);
    throw new Error('Failed to get user photos');
  }
}
