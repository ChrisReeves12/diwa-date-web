import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/server-side-helpers/user.helpers';
import { cookies } from 'next/headers';
import { generateUserPhotoKey, getFileExtension, isValidImageType, isValidFileSize } from '@/lib/s3';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { prismaWrite } from '@/lib/prisma';
import { UserPhoto } from '@/types/user-photo.type';
import { businessConfig } from '@/config/business';


export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const originalPhotoPath = formData.get('originalPhotoPath') as string;
    const caption = formData.get('caption') as string || '';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!originalPhotoPath) {
      return NextResponse.json({ error: 'Original photo path is required' }, { status: 400 });
    }

    // Validate file type
    if (!isValidImageType(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.' 
      }, { status: 400 });
    }

    // Validate file size
    if (!isValidFileSize(file.size)) {
      return NextResponse.json({ 
        error: 'File size too large. Maximum size is 15MB.' 
      }, { status: 400 });
    }

    // Get current photos from user
    const currentPhotos = (currentUser.photos as unknown as UserPhoto[]) || [];
    
    // Find the photo to replace
    const photoIndex = currentPhotos.findIndex(photo => photo.path === originalPhotoPath);
    if (photoIndex === -1) {
      return NextResponse.json({ 
        error: 'Photo not found or you do not have permission to replace it' 
      }, { status: 404 });
    }

    const originalPhoto = currentPhotos[photoIndex];

    // Generate new file ID and S3 key for the replacement
    const fileId = uuidv4();
    const extension = getFileExtension(file.name);
    const newS3Key = generateUserPhotoKey(currentUser.id, fileId, extension);
    const newPhotoPath = `${currentUser.id}/${fileId}.${extension}`;

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload new image to S3 (dual-region)
    const promises = [];
    for (const s3Bucket of businessConfig.s3Buckets) {
      const s3Client = new S3Client({
        region: s3Bucket.region,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID!,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
        },
        endpoint: s3Bucket.endpoint,
        forcePathStyle: false,
      });

      const uploadCommand = new PutObjectCommand({
        Bucket: s3Bucket.bucketName,
        Key: newS3Key,
        Body: buffer,
        ContentType: file.type,
        ACL: 'public-read',
      });

      promises.push(s3Client.send(uploadCommand));
    }
    await Promise.all(promises);

    // Delete the old image from S3 (if it's not a random/fake image)
    if (!originalPhotoPath.startsWith('random')) {
      try {
        const oldS3Key = originalPhotoPath;
        const deletePromises = [];
        for (const s3Bucket of businessConfig.s3Buckets) {
          const s3Client = new S3Client({
            region: s3Bucket.region,
            credentials: {
              accessKeyId: process.env.S3_ACCESS_KEY_ID!,
              secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
            },
            endpoint: s3Bucket.endpoint,
            forcePathStyle: false,
          });

          const deleteCommand = new DeleteObjectCommand({
            Bucket: s3Bucket.bucketName,
            Key: oldS3Key,
          });
          deletePromises.push(s3Client.send(deleteCommand));
        }
        await Promise.all(deletePromises);
      } catch (deleteError) {
        console.warn('Failed to delete old image from S3:', deleteError);
        // Continue with the replacement even if deletion fails
      }
    }

    // Create updated photo object, preserving original metadata
    const updatedPhoto: UserPhoto = {
      ...originalPhoto,
      path: newPhotoPath,
      caption: caption || originalPhoto.caption || '',
      // Keep original sortOrder, uploadedAt, isHidden, etc.
    };

    // Update the photos array
    const updatedPhotos = [...currentPhotos];
    updatedPhotos[photoIndex] = updatedPhoto;

    // Update main photo path if this was the main photo
    const isMainPhoto = currentUser.mainPhoto === originalPhotoPath;
    const newMainPhoto = isMainPhoto ? newPhotoPath : currentUser.mainPhoto;

    // Update user's photos in database
    await prismaWrite.users.update({
      where: { id: currentUser.id },
      data: { 
        photos: updatedPhotos as any,
        mainPhoto: newMainPhoto
      }
    });

    // Generate the public URL for the new image
    const imageUrl = `${process.env.MEDIA_IMAGE_ROOT_URL}/${newPhotoPath}`;

    return NextResponse.json({
      success: true,
      photo: {
        path: updatedPhoto.path,
        caption: updatedPhoto.caption,
        isHidden: updatedPhoto.isHidden,
        sortOrder: updatedPhoto.sortOrder,
        uploadedAt: updatedPhoto.uploadedAt,
        imageUrl,
        isMainPhoto
      }
    });

  } catch (error) {
    console.error('Photo replacement error:', error);
    return NextResponse.json({ 
      error: 'Failed to replace photo' 
    }, { status: 500 });
  }
}
