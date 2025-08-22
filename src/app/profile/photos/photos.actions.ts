'use server';

import { appendMediaRootToImageUrl, getCurrentUser } from '@/server-side-helpers/user.helpers';
import { cookies } from 'next/headers';
import { UserPhoto } from '@/types/user-photo.type';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { businessConfig } from '@/config/business';
import { prismaWrite } from '@/lib/prisma';
import sharp from 'sharp';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { PhotoWithUrl } from "@/types/upload-progress.interface";

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
function cleanPhotoForStorage(photo: UserPhoto): UserPhoto {
  return {
    ...photo,
    path: cleanImagePath(photo.path) || photo.path,
    croppedImageData: photo.croppedImageData ? {
      ...photo.croppedImageData,
      croppedImagePath: cleanImagePath(photo.croppedImageData.croppedImagePath) || photo.croppedImageData.croppedImagePath
    } : photo.croppedImageData
  };
}

export interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
}

// S3 client configuration for DigitalOcean Spaces
const createS3Client = (bucketConfig: { endpoint: string; region: string }) => {
  return new S3Client({
    endpoint: bucketConfig.endpoint,
    region: bucketConfig.region,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: false, // DigitalOcean Spaces uses virtual-hosted-style URLs
  });
};

// Download image from S3
async function downloadImageFromS3(imagePath: string): Promise<Buffer> {
  // Use the first bucket as the source for downloading
  const sourceBucket = {
    endpoint: process.env.S3_ENDPOINT as string,
    bucketName: process.env.S3_BUCKET as string,
    region: process.env.S3_DEFAULT_REGION as string
  };
  const s3Client = createS3Client(sourceBucket);

  const s3Key = `user-images/${imagePath}`;

  const command = new GetObjectCommand({
    Bucket: sourceBucket.bucketName,
    Key: s3Key,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error('Failed to download image from S3');
  }

  // Convert the response body to Buffer
  const chunks: Uint8Array[] = [];

  // Handle both Node.js readable stream and web stream
  if (response.Body instanceof Uint8Array) {
    return Buffer.from(response.Body);
  }

  // For readable streams
  const stream = response.Body as any;

  if (typeof stream.transformToByteArray === 'function') {
    const byteArray = await stream.transformToByteArray();
    return Buffer.from(byteArray);
  }

  // Fallback for other stream types
  if (stream.getReader) {
    const reader = stream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    return Buffer.concat(chunks);
  }

  throw new Error('Unsupported stream type from S3 response');
}

// Upload cropped image to all S3 buckets
async function uploadToAllBuckets(imagePath: string, imageBuffer: Buffer, contentType: string): Promise<void> {
  const uploadPromises = businessConfig.s3Buckets.map(async (bucketConfig) => {
    const s3Client = createS3Client(bucketConfig);

    const command = new PutObjectCommand({
      Bucket: bucketConfig.bucketName,
      Key: imagePath,
      Body: imageBuffer,
      ContentType: contentType,
      ACL: 'public-read',
    });

    return s3Client.send(command);
  });

  await Promise.all(uploadPromises);
}

// Delete image from all S3 buckets
async function deleteFromAllBuckets(imagePath: string): Promise<void> {
  const deletePromises = businessConfig.s3Buckets.map(async (bucketConfig) => {
    const s3Client = createS3Client(bucketConfig);

    const command = new DeleteObjectCommand({
      Bucket: bucketConfig.bucketName,
      Key: imagePath,
    });

    try {
      await s3Client.send(command);
      console.log(`Deleted ${imagePath} from ${bucketConfig.bucketName}`);
    } catch (error) {
      console.warn(`Failed to delete ${imagePath} from ${bucketConfig.bucketName}:`, error);
      // Don't throw - continue with other buckets
    }
  });

  await Promise.all(deletePromises);
}

export async function updatePhotoSortOrder(photos: PhotoWithUrl[]) {
  const currentUser = await getCurrentUser(await cookies());
  if (!currentUser) {
    throw new Error('User not found');
  }

  for (let i = 0; i < photos.length; i++) {
    photos[i].sortOrder = i;
  }

  // Set the first photo as the main photo
  const mainPhoto = photos.length > 0 ? cleanImagePath(photos[0].path) || photos[0].path : undefined;

  await prismaWrite.$executeRaw`
    UPDATE users 
    SET "photos" = ${JSON.stringify(photos.map(cleanPhotoForStorage))}::jsonb,
        "mainPhoto" = ${mainPhoto},
        "updatedAt" = ${new Date()}
    WHERE id = ${currentUser.id}
  `;

  return {success: true};
}

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
    const originalImageBuffer = await downloadImageFromS3(photoPath);
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
    await uploadToAllBuckets(s3CroppedImagePath, croppedImageBuffer, 'image/jpeg');

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
    const currentUser = await getCurrentUser(await cookies());
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
    await uploadToAllBuckets(s3FilePath, processedImage, 'image/jpeg');

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

    // Set as main photo if this is the first photo or no main photo exists
    const shouldSetAsMainPhoto = currentPhotos.length === 0 || !currentUser.mainPhoto;
    const mainPhoto = shouldSetAsMainPhoto ? cleanImagePath(newPhoto.path) || newPhoto.path : currentUser.mainPhoto;

    await prismaWrite.$executeRaw`
      UPDATE users 
      SET "photos" = ${JSON.stringify(updatedPhotos)}::jsonb,
          "numOfPhotos" = ${updatedPhotos.length},
          "mainPhoto" = ${mainPhoto},
          "updatedAt" = ${new Date()}
      WHERE id = ${currentUser.id}
    `;

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
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
      throw new Error('User not found');
    }

    const currentPhotos = (currentUser.photos as unknown as UserPhoto[]) || [];
    const photoToDelete = currentPhotos.find(photo => photo.path === photoPath);

    if (!photoToDelete) {
      throw new Error('Photo not found');
    }

    // Delete original image from S3
    const originalS3Path = `user-images/${photoPath}`;
    await deleteFromAllBuckets(originalS3Path);

    // Delete cropped image from S3 if it exists
    if (photoToDelete.croppedImageData?.croppedImagePath) {
      const croppedS3Path = `user-images/${photoToDelete.croppedImageData.croppedImagePath}`;
      await deleteFromAllBuckets(croppedS3Path);
    }

    // Remove photo from user's photos array
    const updatedPhotos = currentPhotos.filter(photo => photo.path !== photoPath);

    // Update sort orders to maintain consecutive numbering and clean all photo paths
    const reorderedPhotos = updatedPhotos.map((photo, index) =>
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
      // The main photo was deleted, set the new first photo as main photo
      newMainPhoto = reorderedPhotos.length > 0 ? cleanImagePath(reorderedPhotos[0].path) || reorderedPhotos[0].path : undefined;
    }

    // Update database
    await prismaWrite.$executeRaw`
      UPDATE users 
      SET "photos" = ${JSON.stringify(reorderedPhotos)}::jsonb,
          "numOfPhotos" = ${reorderedPhotos.length},
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
