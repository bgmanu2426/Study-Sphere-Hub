'use server';

import { Client, Storage, ID, Query } from 'node-appwrite';

// Server-side Appwrite client for storage operations
const client = new Client();

client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const storage = new Storage(client);

const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID!;

/**
 * Generates a file ID based on the path to ensure consistent naming.
 * This allows us to organize files by their logical path.
 */
function generateFileId(path: string[]): string {
  // Create a sanitized ID from the path
  return path.join('_').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 36);
}

/**
 * Gets the public view URL for a file in Appwrite storage.
 */
function getFileViewUrl(fileId: string): string {
  return `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`;
}

/**
 * Uploads a file to Appwrite storage.
 * Files are tagged with metadata to allow path-based querying.
 * @param fileBuffer The file content as a Buffer.
 * @param fileName The desired name of the file.
 * @param mimeType The MIME type of the file.
 * @param path The nested folder path as an array of strings.
 * @returns The public URL of the uploaded file.
 */
export async function uploadFileToStorage(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  path: string[]
): Promise<{ url: string; fileId: string }> {
  if (!BUCKET_ID) {
    throw new Error('Appwrite bucket ID is not configured.');
  }

  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Create a unique file ID
  const fileId = ID.unique();

  // Convert Buffer to Uint8Array for proper type compatibility with File constructor
  const uint8Array = new Uint8Array(fileBuffer);
  const file = new File([uint8Array], sanitizedFileName, { type: mimeType });

  try {
    // Upload the file
    const result = await storage.createFile(
      BUCKET_ID,
      fileId,
      file
    );

    const url = getFileViewUrl(result.$id);
    
    return { url, fileId: result.$id };
  } catch (error: any) {
    console.error(`Error uploading file "${fileName}" to Appwrite:`, error);
    throw new Error(`File upload to Appwrite failed: ${error.message}`);
  }
}

/**
 * Deletes a file from Appwrite storage.
 * @param fileId The ID of the file to delete.
 */
export async function deleteFileFromStorage(fileId: string): Promise<{ success: boolean }> {
  if (!BUCKET_ID) {
    throw new Error('Appwrite bucket ID is not configured.');
  }

  try {
    await storage.deleteFile(BUCKET_ID, fileId);
    return { success: true };
  } catch (error: any) {
    console.error(`Error deleting file with ID "${fileId}" from Appwrite:`, error);
    throw new Error(`File deletion from Appwrite failed: ${error.message}`);
  }
}

/**
 * Lists all files from Appwrite storage.
 * Since Appwrite doesn't have folder structure, we filter by file name prefix.
 * @param pathPrefix The path prefix to filter files (optional - if not provided, returns all files).
 * @param allFiles Optional pre-fetched list of all files to filter from (avoids repeated API calls).
 * @returns An array of file objects with name, url, and fileId.
 */
export async function getFilesFromStorage(
  pathPrefix?: string,
  allFiles?: Array<{ name: string; id: string }>
): Promise<Array<{
  name: string;
  url: string;
  fileId: string;
  summary?: string;
}>> {
  if (!BUCKET_ID) {
    throw new Error('Appwrite bucket ID is not configured.');
  }

  try {
    // Use provided files or fetch from storage
    let files = allFiles;
    
    if (!files) {
      const result = await storage.listFiles(BUCKET_ID, [
        Query.limit(100)
      ]);
      files = result.files.map(f => ({ name: f.name, id: f.$id }));
    }

    // If no prefix, return all files
    if (!pathPrefix) {
      return files.map(file => ({
        name: file.name,
        url: getFileViewUrl(file.id),
        fileId: file.id,
        summary: undefined
      }));
    }

    // Filter files that match the path prefix (stored in the file name)
    const sanitizedPrefix = pathPrefix.replace(/\//g, '_').replace(/[^a-zA-Z0-9_-]/g, '_');
    
    const matchingFiles = files.filter(file => {
      // Check if the file name starts with the sanitized prefix
      return file.name.startsWith(sanitizedPrefix) || file.id.startsWith(sanitizedPrefix);
    });

    return matchingFiles.map(file => ({
      name: file.name,
      url: getFileViewUrl(file.id),
      fileId: file.id,
      summary: undefined
    }));
  } catch (error: any) {
    console.error(`Error listing files from Appwrite:`, error);
    return [];
  }
}

/**
 * Fetches all files from storage in a single API call.
 * Use this to pre-fetch files and then filter locally.
 */
export async function getAllFilesFromStorage(): Promise<Array<{ name: string; id: string }>> {
  if (!BUCKET_ID) {
    throw new Error('Appwrite bucket ID is not configured.');
  }

  try {
    const result = await storage.listFiles(BUCKET_ID, [
      Query.limit(100)
    ]);
    return result.files.map(f => ({ name: f.name, id: f.$id }));
  } catch (error: any) {
    console.error(`Error listing all files from Appwrite:`, error);
    return [];
  }
}

/**
 * Checks for existing files with a given path prefix.
 * @param path The nested folder path as an array of strings.
 * @returns The file ID of the first file found, or null if no files exist.
 */
export async function checkForExistingFile(path: string[]): Promise<string | null> {
  if (!BUCKET_ID) {
    throw new Error('Appwrite bucket ID is not configured.');
  }

  const pathPrefix = path.join('/');
  
  try {
    const files = await getFilesFromStorage(pathPrefix);
    if (files.length > 0) {
      return files[0].fileId;
    }
    return null;
  } catch (error: any) {
    console.error(`Error checking for existing file:`, error);
    return null;
  }
}

/**
 * Fetches file content from a URL and returns it as base64.
 * Used for sending PDF files to AI for processing.
 * @param fileUrl The URL of the file to fetch.
 * @returns Object containing base64 content and mime type.
 */
export async function getFileContentAsBase64(fileUrl: string): Promise<{ base64: string; mimeType: string }> {
  try {
    const response = await fetch(fileUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type') || 'application/pdf';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    
    return {
      base64,
      mimeType: contentType
    };
  } catch (error: any) {
    console.error(`Error fetching file content:`, error);
    throw new Error(`Failed to fetch file content: ${error.message}`);
  }
}
