import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, PutObjectAclCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// S3 client configuration
const s3Client = new S3Client({
  region: process.env.S3_DEFAULT_REGION!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: process.env.S3_USE_PATH_STYLE_ENDPOINT === 'true',
});

const BUCKET_NAME = process.env.S3_BUCKET!;

/**
 * Generate a presigned URL for uploading a file to S3
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generate a presigned URL for downloading/viewing a file from S3
 */
export async function generatePresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Delete a file from S3
 */
export async function deleteFileFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Generate S3 key for user photo
 */
export function generateUserPhotoKey(userId: number, fileId: string, extension: string): string {
  return `user-images/${userId}/${fileId}.${extension}`;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Validate file type for image uploads
 */
export function isValidImageType(contentType: string): boolean {
  const validTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  return validTypes.includes(contentType.toLowerCase());
}

/**
 * Validate file size (15MB max)
 */
export function isValidFileSize(size: number): boolean {
  const maxSize = 15 * 1024 * 1024; // 15MB in bytes
  return size <= maxSize;
}

/**
 * Update ACL of existing S3 object to make it public-read
 */
export async function makeObjectPublic(key: string): Promise<void> {
  const command = new PutObjectAclCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ACL: 'public-read',
  });

  await s3Client.send(command);
}
