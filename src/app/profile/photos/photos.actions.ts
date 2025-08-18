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
    const photosWithUrls = photos
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((photo) => {
            return {
              ...photo,
              url: appendMediaRootToImageUrl(photo.path) || null
            };
        });

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
