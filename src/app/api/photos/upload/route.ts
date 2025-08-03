import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/server-side-helpers/user.helpers';
import { cookies } from 'next/headers';
import { generateUserPhotoKey, getFileExtension, isValidImageType, isValidFileSize } from '@/lib/s3';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { prismaWrite } from '@/lib/prisma';
import { UserPhoto } from '@/types/user-photo.type';
import { businessConfig } from "@/config/business";

const BUCKET_NAME = process.env.S3_BUCKET!;

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const caption = formData.get('caption') as string || '';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
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
    const currentPhotoCount = currentPhotos.length;

    if (currentPhotoCount >= 10) {
      return NextResponse.json({
        error: 'Photo limit reached. You can upload a maximum of 10 photos.'
      }, { status: 400 });
    }

    // Generate unique file ID and S3 key
    const fileId = uuidv4();
    const extension = getFileExtension(file.name);
    const s3Key = generateUserPhotoKey(currentUser.id, fileId, extension);

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to S3
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

      // Upload to S3 with public-read ACL for CDN access
      const uploadCommand = new PutObjectCommand({
        Bucket: s3Bucket.bucketName,
        Key: s3Key,
        Body: buffer,
        ContentType: file.type,
        ACL: 'public-read',
      });

      promises.push(s3Client.send(uploadCommand));
    }

    await Promise.all(promises);

    // Create new photo object
    const newPhoto: UserPhoto = {
      path: `${currentUser.id}/${fileId}.${extension}`,
      caption,
      isHidden: false,
      sortOrder: currentPhotoCount + 1,
      uploadedAt: new Date().toISOString(),
    };

    // Add to photos array
    const updatedPhotos = [...currentPhotos, newPhoto];

    // Determine if this should be the main photo (first photo uploaded)
    const isMainPhoto = currentPhotoCount === 0;
    const mainPhotoPath = isMainPhoto ? newPhoto.path : currentUser.mainPhoto;

    // Update user's photos in database
    await prismaWrite.users.update({
      where: { id: currentUser.id },
      data: {
        photos: updatedPhotos as any,
        numOfPhotos: currentPhotoCount + 1,
        mainPhoto: mainPhotoPath
      }
    });

    // Generate the public URL for the uploaded image
    const imageUrl = `${process.env.MEDIA_IMAGE_ROOT_URL}/${newPhoto.path}`;

    return NextResponse.json({
      success: true,
      photo: {
        path: newPhoto.path,
        caption: newPhoto.caption,
        isHidden: newPhoto.isHidden,
        sortOrder: newPhoto.sortOrder,
        uploadedAt: newPhoto.uploadedAt,
        imageUrl,
        isMainPhoto
      }
    });

  } catch (error) {
    console.error('Photo upload error:', error);
    return NextResponse.json({
      error: 'Failed to upload photo'
    }, { status: 500 });
  }
}
