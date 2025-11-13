import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/server-side-helpers/user.helpers';
import { cookies } from 'next/headers';
import { generatePresignedUploadUrl, generateUserPhotoKey, getFileExtension, isValidImageType, isValidFileSize } from '@/lib/s3';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(await cookies());
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileName, fileSize, contentType } = await request.json();

    // Validate input
    if (!fileName || !fileSize || !contentType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate file type
    if (!isValidImageType(contentType)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.' 
      }, { status: 400 });
    }

    // Validate file size
    if (!isValidFileSize(fileSize)) {
      return NextResponse.json({ 
        error: 'File size too large. Maximum size is 15MB.' 
      }, { status: 400 });
    }

    // Check photo limit (10 photos max)
    const currentPhotoCount = currentUser.numOfPhotos || 0;
    if (currentPhotoCount >= 10) {
      return NextResponse.json({ 
        error: 'Photo limit reached. You can upload a maximum of 10 photos.' 
      }, { status: 400 });
    }

    // Generate unique file ID and S3 key
    const fileId = uuidv4();
    const extension = getFileExtension(fileName);
    const s3Key = generateUserPhotoKey(currentUser.id, fileId, extension);

    // Generate presigned URL
    const uploadUrl = await generatePresignedUploadUrl(s3Key, contentType);

    return NextResponse.json({
      uploadUrl,
      fileId,
      s3Key,
      success: true
    });

  } catch (error) {
    console.error('Upload URL generation error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate upload URL' 
    }, { status: 500 });
  }
}
