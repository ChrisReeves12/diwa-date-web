'use server';

import { appendMediaRootToImageUrl, getCurrentUser } from '@/server-side-helpers/user.helpers';
import { cookies } from 'next/headers';
import { UserPhoto } from '@/types/user-photo.type';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { businessConfig } from '@/config/business';
import { prismaWrite } from '@/lib/prisma';
import sharp from 'sharp';
import path from 'path';

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
      if (photo.path === photoPath) {
        return {
          ...photo,
          caption: caption || photo.caption,
          croppedImageData: {
            x: cropData.x,
            y: cropData.y,
            width: cropData.width,
            height: cropData.height,
            croppedImagePath: croppedImagePath,
          },
        };
      }
      return photo;
    });

    // Update the user record with the new photos data
    await prismaWrite.users.update({
      where: { id: currentUser.id },
      data: {
        photos: updatedPhotos as any,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Photo cropped successfully',
      croppedImagePath,
      cropData,
    };
  } catch (error) {
    console.error('Save crop data error:', error);
    throw new Error(`Failed to save crop data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
