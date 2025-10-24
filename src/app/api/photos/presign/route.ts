import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/server-side-helpers/user.helpers';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const contentType = String(body?.contentType || '').trim();
        const fileName = String(body?.fileName || '').trim();

        if (!contentType) {
            return NextResponse.json({ error: 'contentType is required' }, { status: 400 });
        }

        const cookieStore = await cookies();
        const currentUser = await getCurrentUser(cookieStore, false);
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const inferredExt = fileName ? path.extname(fileName) : `.${(contentType.split('/')[1] || 'jpg')}`;
        const finalExt = inferredExt || '.jpg';

        const finalFileName = `${uuidv4()}${finalExt}`;
        const filePath = `${currentUser.id}/${finalFileName}`; // stored path (without user-images/)
        const s3Key = `user-images/${filePath}`;

        const s3Client = new S3Client({
            endpoint: process.env.S3_ENDPOINT as string,
            region: process.env.S3_DEFAULT_REGION as string,
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY_ID!,
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
            },
            forcePathStyle: false,
        });

        const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET as string,
            Key: s3Key,
            ContentType: contentType,
            ACL: 'public-read',
        });

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

        return NextResponse.json({ success: true, uploadUrl, filePath });
    } catch (error) {
        console.error('Presign error:', error);
        return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });
    }
}


