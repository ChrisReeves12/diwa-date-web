import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { businessConfig } from '@/config/business';

export class S3Helper {
  private s3Client: S3Client;
  private sourceBucket: { endpoint: string; bucketName: string; region: string };

  constructor() {
    // Use the first bucket as the source for downloading
    this.sourceBucket = {
      endpoint: process.env.S3_ENDPOINT as string,
      bucketName: process.env.S3_BUCKET as string,
      region: process.env.S3_DEFAULT_REGION as string
    };

    this.s3Client = this.createS3Client(this.sourceBucket);
  }

  private createS3Client(bucketConfig: { endpoint: string; region: string }) {
    return new S3Client({
      endpoint: bucketConfig.endpoint,
      region: bucketConfig.region,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: false, // DigitalOcean Spaces uses virtual-hosted-style URLs
    });
  }

  /**
   * Download image from S3
   */
  async downloadImage(imagePath: string): Promise<Buffer> {
    const s3Key = `user-images/${imagePath}`;

    const command = new GetObjectCommand({
      Bucket: this.sourceBucket.bucketName,
      Key: s3Key,
    });

    const response = await this.s3Client.send(command);

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

  /**
   * Upload image to all S3 buckets
   */
  async uploadToAllBuckets(imagePath: string, imageBuffer: Buffer, contentType: string): Promise<void> {
    const uploadPromises = businessConfig.s3Buckets.map(async (bucketConfig) => {
      const s3Client = this.createS3Client(bucketConfig);

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
   * Delete image from all S3 buckets
   */
  async deleteFromAllBuckets(imagePath: string): Promise<void> {
    const deletePromises = businessConfig.s3Buckets.map(async (bucketConfig) => {
      const s3Client = this.createS3Client(bucketConfig);

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
}