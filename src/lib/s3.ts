
'use server';

import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

function getPublicUrl(bucket: string, key: string, region: string) {
    const encodedKey = key.split('/').map(encodeURIComponent).join('/');
    return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
}

/**
 * Uploads a file to a specified path in AWS S3.
 * @param fileBuffer The file content as a Buffer.
 * @param fileName The desired name of the file in S3.
 * @param mimeType The MIME type of the file.
 * @param path The nested folder path as an array of strings.
 * @returns The public URL of the uploaded file.
 */
export async function uploadFileToS3(fileBuffer: Buffer, fileName: string, mimeType: string, path: string[]) {
  if (!BUCKET_NAME) {
    throw new Error('S3 bucket name is not configured.');
  }
  
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const validPath = path.filter(segment => segment && segment.length > 0);
  const key = [...validPath, sanitizedFileName].join('/');
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
    ACL: 'public-read',
  });

  try {
    await s3Client.send(command);
    const region = await s3Client.config.region();
    if (!region) {
      throw new Error('AWS region is not configured or could not be determined.');
    }
    return getPublicUrl(BUCKET_NAME, key, region);
  } catch (error: any) {
    console.error(`Error uploading file "${fileName}" to S3. AWS-SDK-S3 Error:`, error);
    throw new Error(error.message || `File upload to AWS S3 failed.`);
  }
}

/**
 * Lists files from a specified folder path in AWS S3 and generates pre-signed URLs.
 * @param path The folder path as a single string, e.g., "VTU Assistant/2022/cse/3/22CS32".
 * @returns An array of file objects with name and a temporary, secure pre-signed url.
 */
export async function getFilesFromS3(path: string) {
  if (!BUCKET_NAME) {
    throw new Error('S3 bucket name is not configured.');
  }

  const listCommand = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: path.endsWith('/') ? path : path + '/',
  });

  try {
    const { Contents } = await s3Client.send(listCommand);
    if (!Contents) {
      return [];
    }

    const files = Contents.filter(file => file.Key && !file.Key.endsWith('/'));
    
    const signedUrls = await Promise.all(
        files.map(async (file) => {
            const getObjectCommand = new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: file.Key!,
            });
            const url = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 3600 }); // URL expires in 1 hour
            return {
                name: file.Key!.split('/').pop()!,
                url: url,
                summary: undefined
            };
        })
    );

    return signedUrls;

  } catch (error) {
    console.error(`Error listing files or signing URLs from S3 path "${path}":`, error);
    return [];
  }
}
