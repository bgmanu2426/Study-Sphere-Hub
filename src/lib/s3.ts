
'use server';

import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

function getPublicUrl(bucket: string, key: string) {
    return `https://${bucket}.s3.amazonaws.com/${key}`;
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
  
  const validPath = path.filter(segment => segment && segment.length > 0);
  const key = [...validPath, fileName].join('/');
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  try {
    await s3Client.send(command);
    return getPublicUrl(BUCKET_NAME, key);
  } catch (error: any) {
    console.error(`Error uploading file "${fileName}" to S3. AWS-SDK-S3 Error:`, error.message);
    console.error('Full Error Object:', JSON.stringify(error, null, 2));
    // Throw a new, simple Error object with just the message string.
    throw new Error(`File upload to AWS S3 failed. Reason: ${error.message}`);
  }
}

/**
 * Lists files from a specified folder path in AWS S3.
 * @param path The folder path as a single string, e.g., "VTU Assistant/2022/cse/3/22CS32".
 * @returns An array of file objects with name and url.
 */
export async function getFilesFromS3(path: string) {
  if (!BUCKET_NAME) {
    throw new Error('S3 bucket name is not configured.');
  }

  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: path.endsWith('/') ? path : path + '/',
  });

  try {
    const { Contents } = await s3Client.send(command);
    if (!Contents) {
      return [];
    }

    return Contents.map(file => {
        const fileName = file.Key!.split('/').pop()!;
        const url = getPublicUrl(BUCKET_NAME, file.Key!);
        return {
            name: fileName,
            url: url,
            summary: undefined
        };
    }).filter(file => !!file.name); // Filter out folder objects
  } catch (error) {
    console.error(`Error listing files from S3 path "${path}":`, error);
    return [];
  }
}
