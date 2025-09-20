
'use server';
/**
 * @fileOverview A Genkit flow for uploading files to Google Drive.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { google } from 'googleapis';
import { adminAuth } from '@/lib/firebase-admin';
import { PassThrough } from 'stream';

const UploadFileToDriveInputSchema = z.object({
  fileName: z.string().describe('The name of the file to upload.'),
  fileContent: z.string().describe('The base64 encoded content of the file.'),
  mimeType: z.string().describe('The MIME type of the file.'),
  idToken: z.string().describe("The user's Firebase ID token for authentication."),
  folderPath: z.string().describe('The path in Google Drive to upload the file to, e.g., "VTU Assistant/Notes".'),
  metadata: z.record(z.string()).describe('Additional metadata for the file.'),
});

const UploadFileToDriveOutputSchema = z.object({
    success: z.boolean(),
    fileId: z.string().optional(),
    error: z.string().optional(),
});

export const uploadFileToDrive = ai.defineFlow(
  {
    name: 'uploadFileToDrive',
    inputSchema: UploadFileToDriveInputSchema,
    outputSchema: UploadFileToDriveOutputSchema,
  },
  async (input) => {
    try {
        // 1. Authenticate the user with the ID token
        const decodedToken = await adminAuth.verifyIdToken(input.idToken);
        
        // At this point, the user is authenticated.
        // We'll use Application Default Credentials for the service account
        // to interact with Google Drive API. For user-specific actions,
        // we would need to set up OAuth2 with user consent.
        // For this app, we assume a single service account owns the files.
        const auth = new google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        });

        const drive = google.drive({ version: 'v3', auth });
        
        // 2. Find or create the folder structure
        let parentFolderId = 'root';
        const folders = input.folderPath.split('/');

        for (const folderName of folders) {
            const folderQuery = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentFolderId}' in parents and trashed=false`;
            const { data: { files } } = await drive.files.list({ q: folderQuery, fields: 'files(id)' });
            
            if (files && files.length > 0 && files[0].id) {
                parentFolderId = files[0].id;
            } else {
                const folderMetadata = {
                    name: folderName,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [parentFolderId]
                };
                const { data: newFolder } = await drive.files.create({
                    resource: folderMetadata,
                    fields: 'id'
                });
                if (!newFolder.id) throw new Error("Could not create folder in Drive.");
                parentFolderId = newFolder.id;
            }
        }
        
        // 3. Prepare the file for upload
        const fileMetadata = {
            name: input.fileName,
            parents: [parentFolderId],
            appProperties: input.metadata,
        };

        const buffer = Buffer.from(input.fileContent, 'base64');
        const stream = new PassThrough();
        stream.end(buffer);

        const media = {
            mimeType: input.mimeType,
            body: stream,
        };

        // 4. Upload the file
        const { data: uploadedFile } = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id',
        });
        
        if (!uploadedFile.id) {
            throw new Error("File upload failed, no ID returned.");
        }

        return {
            success: true,
            fileId: uploadedFile.id,
        };
    } catch (error: any) {
      console.error("Google Drive Upload Error:", error);
      return {
        success: false,
        error: error.message || 'An unknown error occurred while uploading to Google Drive.',
      };
    }
  }
);
