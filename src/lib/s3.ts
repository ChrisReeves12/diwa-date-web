import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, PutObjectAclCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { businessConfig } from '@/config/business';

// Function to create S3 clients for all regions
function createS3Clients(): { client: S3Client; bucketName: string }[] {
  return businessConfig.s3Buckets.map(bucket => ({
    client: new S3Client({
      region: bucket.region,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
      endpoint: bucket.endpoint,
      forcePathStyle: false,
    }),
    bucketName: bucket.bucketName
  }));
}

/**
 * Generate a presigned URL for uploading a file to S3 (uses primary region)
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const primaryBucket = businessConfig.s3Buckets[0];
  const client = new S3Client({
    region: primaryBucket.region,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
    endpoint: primaryBucket.endpoint,
    forcePathStyle: false,
  });
  
  const command = new PutObjectCommand({
    Bucket: primaryBucket.bucketName,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(client, command, { expiresIn });
}

/**
 * Generate a presigned URL for downloading/viewing a file from S3 (uses primary region)
 */
export async function generatePresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> {
  const primaryBucket = businessConfig.s3Buckets[0];
  const client = new S3Client({
    region: primaryBucket.region,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
    endpoint: primaryBucket.endpoint,
    forcePathStyle: false,
  });

  const command = new GetObjectCommand({
    Bucket: primaryBucket.bucketName,
    Key: key,
  });

  return await getSignedUrl(client, command, { expiresIn });
}

/**
 * Delete a file from S3 (deletes from all regions)
 */
export async function deleteFileFromS3(key: string): Promise<void> {
  const s3Configs = createS3Clients();
  const promises = s3Configs.map(({ client, bucketName }) => {
    const command = new DeleteObjectCommand({ Bucket: bucketName, Key: key });
    return client.send(command);
  });
  await Promise.all(promises);
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
 * Update ACL of existing S3 object to make it public-read (updates all regions)
 */
export async function makeObjectPublic(key: string): Promise<void> {
  const s3Configs = createS3Clients();
  const promises = s3Configs.map(({ client, bucketName }) => {
    const command = new PutObjectAclCommand({ 
      Bucket: bucketName, 
      Key: key, 
      ACL: 'public-read' 
    });
    return client.send(command);
  });
  await Promise.all(promises);
}
