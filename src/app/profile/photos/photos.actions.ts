'use server';

import { appendMediaRootToImageUrl, getCurrentUser } from '@/server-side-helpers/user.helpers';
import { cookies } from 'next/headers';
import { UserPhoto } from '@/types/user-photo.type';
import { prismaWrite } from '@/lib/prisma';
import sharp from 'sharp';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { PhotoWithUrl } from "@/types/upload-progress.interface";
import { S3Helper } from "../../../server-side-helpers/s3.helper";
import { reviewPhotos } from "@/server-side-helpers/compliance.helper";

// Helper function to remove media root from URL if present
function cleanImagePath(imagePath?: string): string | undefined {
  if (!imagePath) return imagePath;

  const mediaRoot = process.env.MEDIA_IMAGE_ROOT_URL;
  if (mediaRoot && imagePath.startsWith(mediaRoot + '/')) {
    return imagePath.substring(mediaRoot.length + 1);
  }

  return imagePath;
}

// Helper function to clean photo paths before database storage
function cleanPhotoForStorage(photo: PhotoWithUrl): UserPhoto {
  let photoCopy = { ...photo };
  delete photoCopy.url;

  return {
    ...photoCopy,
    path: cleanImagePath(photo.path) || '',
    croppedImageData: photo.croppedImageData ? {
      ...photo.croppedImageData,
      croppedImagePath: cleanImagePath(photo.croppedImageData.croppedImagePath) || ''
    } : photo.croppedImageData
  };
}

export interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
}


export async function updatePhotoSortOrder(photos: PhotoWithUrl[]) {
  const currentUser = await getCurrentUser(await cookies(), false);
  if (!currentUser) {
    throw new Error('User not found');
  }

  for (let i = 0; i < photos.length; i++) {
    photos[i].sortOrder = i;
  }

  // Set the main photo to the first non-rejected photo
  const firstNonRejected = photos.find(p => !p.isRejected);
  const mainPhoto = firstNonRejected?.path ? cleanImagePath(firstNonRejected.path) : undefined;

  await prismaWrite.$executeRaw`
    UPDATE users 
    SET "photos" = ${JSON.stringify(photos.map(cleanPhotoForStorage))}::jsonb,
        "mainPhoto" = ${mainPhoto},
        "updatedAt" = ${new Date()}
    WHERE id = ${currentUser.id}
  `;

  return { success: true };
}

/**
 * Get user photos with presigned URLs for viewing
 */
export async function getUserPhotos() {
  try {
    const currentUser = await getCurrentUser(await cookies(), false);
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
          croppedImageUrl: appendMediaRootToImageUrl(photo.croppedImageData?.croppedImagePath),
          url: appendMediaRootToImageUrl(photo.path)
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

/**
 * Save crop data for a photo and process the image server-side
 */
export async function saveCropData(photoPath: string, cropData: CropData, caption?: string) {
  try {
    const currentUser = await getCurrentUser(await cookies(), false);
    if (!currentUser) {
      throw new Error('User not found');
    }

    // Crop the original photo
    const s3Helper = new S3Helper();
    const originalImageBuffer = await s3Helper.downloadImage(photoPath);
    const croppedImageBuffer = await sharp(originalImageBuffer)
      .extract({
        left: cropData.x,
        top: cropData.y,
        width: cropData.width,
        height: cropData.height,
      })
      .jpeg({ quality: 90 })
      .toBuffer();

    // Generate cropped image path
    const pathParts = photoPath.split('/');
    const fileName = pathParts.pop();
    const userDir = pathParts.join('/');
    const fileNameWithoutExt = path.parse(fileName!).name;
    const fileExt = path.parse(fileName!).ext;

    const croppedImagePath = `${userDir}/cropped/${fileNameWithoutExt}_cropped${fileExt}`;
    const s3CroppedImagePath = `user-images/${croppedImagePath}`;

    // Upload the cropped image to all S3 buckets
    await s3Helper.uploadToAllBuckets(s3CroppedImagePath, croppedImageBuffer, 'image/jpeg');

    // Update the user's photos in the database
    const currentPhotos = (currentUser.photos as unknown as UserPhoto[]) || [];
    const updatedPhotos = currentPhotos.map(photo => {
      if (photo.path === photoPath || cleanImagePath(photo.path) === cleanImagePath(photoPath)) {
        const updatedPhoto = {
          ...photo,
          caption: caption || photo.caption,
          croppedImageData: {
            x: cropData.x,
            y: cropData.y,
            width: cropData.width,
            height: cropData.height,
            croppedImagePath: croppedImagePath, // Store clean path without media root
          },
        };
        return cleanPhotoForStorage(updatedPhoto);
      }
      return cleanPhotoForStorage(photo);
    });

    // Update the user record with the new photos data
    await prismaWrite.$executeRaw`
      UPDATE users 
      SET "photos" = ${JSON.stringify(updatedPhotos)}::jsonb,
          "updatedAt" = ${new Date()}
      WHERE id = ${currentUser.id}
    `;

    return {
      success: true,
      message: 'Photo cropped successfully',
      croppedImageUrl: appendMediaRootToImageUrl(croppedImagePath),
      cropData,
    };
  } catch (error) {
    console.error('Save crop data error:', error);
    throw new Error(`Failed to save crop data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload a new photo for the current user
 */
export async function uploadPhoto(formData: FormData) {
  try {
    const currentUser = await getCurrentUser(await cookies(), false);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const file = formData.get('file') as File;
    if (!file) {
      throw new Error('No file provided');
    }

    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please use JPG, PNG, or WebP.');
    }

    if (file.size > maxSize) {
      throw new Error('File too large. Maximum size is 10MB.');
    }

    // Generate unique filename
    const fileExtension = path.extname(file.name);
    const fileName = `${uuidv4()}${fileExtension}`;
    const filePath = `${currentUser.id}/${fileName}`;
    const s3FilePath = `user-images/${filePath}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Process image with Sharp with error recovery
    let processedImage: Buffer;
    try {
      processedImage = await sharp(imageBuffer, {
        failOnError: false, // Don't fail on minor errors
        limitInputPixels: false // Remove pixel limit
      })
        .rotate() // Auto-rotate based on EXIF
        .resize(2000, 2000, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({
          quality: 90,
          progressive: true,
          mozjpeg: true // Use mozjpeg encoder for better compatibility
        })
        .toBuffer();
    } catch (sharpError) {
      console.warn('Sharp processing failed, trying fallback method:', sharpError);

      // Fallback: try to process as PNG first, then convert to JPEG
      try {
        processedImage = await sharp(imageBuffer, { failOnError: false })
          .png() // Convert to PNG first to clean up any corruption
          .jpeg({
            quality: 90,
            progressive: true
          })
          .toBuffer();
      } catch (fallbackError) {
        console.error('Both Sharp methods failed:', fallbackError);
        throw new Error('Unable to process image. The image file may be corrupted.');
      }
    }

    // Upload to all S3 buckets
    const s3Helper = new S3Helper();
    await s3Helper.uploadToAllBuckets(s3FilePath, processedImage, 'image/jpeg');

    // Create photo object
    const newPhoto: UserPhoto = {
      path: filePath,
      sortOrder: (currentUser.photos as any[])?.length || 0,
      caption: undefined,
      croppedImageData: undefined,
      isHidden: false,
      uploadedAt: new Date().toISOString(),
    };

    // Update user's photos in database - clean all existing photos first
    const currentPhotos = (currentUser.photos as unknown as UserPhoto[]) || [];
    const cleanedCurrentPhotos = currentPhotos.map(photo => cleanPhotoForStorage(photo));
    const updatedPhotos = [...cleanedCurrentPhotos, newPhoto];

    await prismaWrite.$executeRaw`
      UPDATE users 
      SET "photos" = ${JSON.stringify(updatedPhotos)}::jsonb,
          "numOfPhotos" = ${updatedPhotos.filter(p => !p.isRejected).length},
          "updatedAt" = ${new Date()}
      WHERE id = ${currentUser.id}`;

    return {
      success: true,
      message: 'Photo uploaded successfully',
      photo: {
        ...newPhoto,
        url: appendMediaRootToImageUrl(newPhoto.path),
        croppedImageUrl: null,
      },
    };
  } catch (error) {
    console.error('Upload photo error:', error);
    throw new Error(`Failed to upload photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete a photo for the current user
 */
export async function deletePhoto(photoPath: string) {
  try {
    const currentUser = await getCurrentUser(await cookies(), false);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const currentPhotos = (currentUser.photos as unknown as UserPhoto[]) || [];
    const photoToDelete = currentPhotos.find(photo => photo.path === photoPath);

    if (!photoToDelete) {
      throw new Error('Photo not found');
    }

    // Delete original image from S3
    const s3Helper = new S3Helper();
    const originalS3Path = `user-images/${photoPath}`;
    await s3Helper.deleteFromAllBuckets(originalS3Path);

    // Delete cropped image from S3 if it exists
    if (photoToDelete.croppedImageData?.croppedImagePath) {
      const croppedS3Path = `user-images/${photoToDelete.croppedImageData.croppedImagePath}`;
      await s3Helper.deleteFromAllBuckets(croppedS3Path);
    }

    // Remove photo from user's photos array
    const updatedPhotos = currentPhotos.filter(photo => photo.path !== photoPath);

    // Update sort orders to maintain consecutive numbering and clean all photo paths
    let reorderedPhotos = updatedPhotos.map((photo, index) =>
      cleanPhotoForStorage({
        ...photo,
        sortOrder: index
      })
    );

    // Check if the deleted photo was the main photo, and reassign if needed
    let newMainPhoto = currentUser.mainPhoto;
    const deletedPhotoCleanPath = cleanImagePath(photoPath) || photoPath;
    const currentMainPhotoCleanPath = cleanImagePath(currentUser.mainPhoto) || currentUser.mainPhoto;

    if (currentMainPhotoCleanPath === deletedPhotoCleanPath) {
      const firstNonRejectedIdx = reorderedPhotos.findIndex(p => !p.isRejected);
      if (firstNonRejectedIdx > 0) {
        reorderedPhotos[firstNonRejectedIdx].sortOrder = 0;
        reorderedPhotos[0].sortOrder = firstNonRejectedIdx;

        reorderedPhotos.sort((a, b) => a.sortOrder - b.sortOrder);
      }

      // The main photo was deleted, set the new first non-rejected photo as main photo
      newMainPhoto = reorderedPhotos.length > 0 && !reorderedPhotos[0].isRejected ?
        cleanImagePath(reorderedPhotos[0].path) || reorderedPhotos[0].path : undefined;
    }

    // Update database
    await prismaWrite.$executeRaw`
      UPDATE users 
      SET "photos" = ${JSON.stringify(reorderedPhotos)}::jsonb,
          "numOfPhotos" = ${reorderedPhotos.filter(p => !p.isRejected).length},
          "mainPhoto" = ${newMainPhoto},
          "updatedAt" = ${new Date()}
      WHERE id = ${currentUser.id}`;

    return {
      success: true,
      message: 'Photo deleted successfully',
    };
  } catch (error) {
    console.error('Delete photo error:', error);
    throw new Error(`Failed to delete photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
