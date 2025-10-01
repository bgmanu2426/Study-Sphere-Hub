'use server';

import { google } from 'googleapis';
import { Readable } from 'stream';

/**
 * Creates an authenticated Google Drive service instance.
 */
async function getDriveService() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/drive'],
    // This will use the service account credentials from the environment
  });

  const authClient = await auth.getClient();
  const drive = google.drive({ version: 'v3', auth: authClient });
  return drive;
}

/**
 * Finds a folder by name within a specific parent folder.
 * @param drive Authenticated Google Drive service instance.
 * @param name The name of the folder to find.
 * @param parentId The ID of the parent folder.
 * @returns The ID of the found folder, or null.
 */
async function findFolder(drive: any, name: string, parentId: string): Promise<string | null> {
  try {
    const res = await drive.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and name='${name}' and '${parentId}' in parents and trashed=false`,
      fields: 'files(id)',
      spaces: 'drive',
    });
    if (res.data.files.length > 0) {
      return res.data.files[0].id;
    }
    return null;
  } catch (error) {
    console.error(`Error finding folder "${name}":`, error);
    return null;
  }
}

/**
 * Creates a folder with a given name inside a parent folder.
 * @param drive Authenticated Google Drive service instance.
 * @param name The name of the folder to create.
 * @param parentId The ID of the parent folder.
 * @returns The ID of the created folder.
 */
async function createFolder(drive: any, name: string, parentId: string): Promise<string> {
  const fileMetadata = {
    name: name,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentId],
  };
  try {
    const file = await drive.files.create({
      resource: fileMetadata,
      fields: 'id',
    });
    return file.data.id;
  } catch (error) {
    console.error(`Error creating folder "${name}":`, error);
    throw new Error(`Failed to create folder: ${name}`);
  }
}


/**
 * Finds or creates a nested folder structure and returns the ID of the leaf folder.
 * @param drive Authenticated Google Drive service instance.
 * @param path An array of folder names representing the path.
 * @returns The ID of the leaf folder.
 */
async function findOrCreateNestedFolder(drive: any, path: string[]): Promise<string> {
  let currentParentId = 'root'; // Start from the root of Google Drive

  for (const folderName of path) {
    let folderId = await findFolder(drive, folderName, currentParentId);
    if (!folderId) {
      folderId = await createFolder(drive, folderName, currentParentId);
    }
    currentParentId = folderId;
  }
  return currentParentId;
}

/**
 * Uploads a file to a specified path in Google Drive, creating folders as needed.
 * @param fileBuffer The file content as a Buffer.
 * @param fileName The desired name of the file in Google Drive.
 * @param mimeType The MIME type of the file.
 * @param path The nested folder path as an array of strings.
 * @returns The ID of the uploaded file.
 */
export async function uploadFileToDrive(fileBuffer: Buffer, fileName: string, mimeType: string, path: string[]) {
  const drive = await getDriveService();
  const folderId = await findOrCreateNestedFolder(drive, path);

  const media = {
    mimeType: mimeType,
    body: Readable.from(fileBuffer),
  };

  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };

  try {
    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
    });

    // Make the file publicly readable
    await drive.permissions.create({
        fileId: file.data.id,
        requestBody: {
            role: 'reader',
            type: 'anyone'
        }
    });

    return file.data;
  } catch (error) {
    console.error(`Error uploading file "${fileName}":`, error);
    throw new Error('File upload to Google Drive failed.');
  }
}

/**
 * Lists files from a specified folder path in Google Drive.
 * @param path The folder path as a single string, e.g., "VTU Assistant/2022/cse/3/22CS32".
 * @returns An array of file objects.
 */
export async function getFilesFromDrive(path: string) {
    const drive = await getDriveService();
    const pathParts = path.split('/');
    
    let currentParentId = 'root';
    let folderFound = true;

    for (const folderName of pathParts) {
        const folderId = await findFolder(drive, folderName, currentParentId);
        if (!folderId) {
            folderFound = false;
            break;
        }
        currentParentId = folderId;
    }

    if (!folderFound) {
        return []; // If any part of the path doesn't exist, return no files.
    }

    try {
        const res = await drive.files.list({
            q: `'${currentParentId}' in parents and trashed=false`,
            fields: 'files(id, name, webViewLink)',
            spaces: 'drive',
        });
        return res.data.files || [];
    } catch (error) {
        console.error(`Error listing files from folder ID "${currentParentId}":`, error);
        return [];
    }
}
