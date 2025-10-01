'use server';

/**
 * @fileOverview An AI flow to handle resource uploads to Google Drive and summarize them.
 *
 * - uploadResource - Handles the file upload, summarization, and Drive storage.
 * - UploadResourceInput - The input type for the uploadResource function.
 * - UploadResourceOutput - The return type for the uploadResource function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { uploadFileToDrive } from '@/lib/drive';
import { summarizeResource } from './resource-summarization';
import * as pdfParse from 'pdf-parse';

export const UploadResourceInputSchema = z.object({
  scheme: z.string().describe('The academic scheme (e.g., 2022).'),
  branch: z.string().describe('The engineering branch (e.g., cse).'),
  semester: z.string().describe('The semester (e.g., 3).'),
  subject: z.string().describe('The subject code (e.g., 22CS32).'),
  fileName: z.string().describe('The name of the file being uploaded.'),
  fileDataUri: z
    .string()
    .describe(
      "The file content as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  resourceType: z.enum(['Notes', 'Question Paper']).describe('The type of resource being uploaded.'),
  module: z.string().optional().describe('The module number for notes (e.g., module1).'),
});

export type UploadResourceInput = z.infer<typeof UploadResourceInputSchema>;

export const UploadResourceOutputSchema = z.object({
  fileId: z.string().describe('The ID of the file created in Google Drive.'),
  summary: z.string().optional().describe('A summary of the file content if it was a PDF.'),
  webViewLink: z.string().describe('A link to view the file in the browser.'),
});

export type UploadResourceOutput = z.infer<typeof UploadResourceOutputSchema>;


export async function uploadResource(input: UploadResourceInput): Promise<UploadResourceOutput> {
  return uploadResourceFlow(input);
}


const uploadResourceFlow = ai.defineFlow(
  {
    name: 'uploadResourceFlow',
    inputSchema: UploadResourceInputSchema,
    outputSchema: UploadResourceOutputSchema,
  },
  async (input) => {
    const { fileDataUri, scheme, branch, semester, subject, fileName, resourceType, module } = input;
    
    // Determine the folder path in Google Drive
    const path = ['VTU Assistant', scheme, branch, semester, subject];
    
    // For 'Notes', add a 'notes' subfolder and the specific module subfolder
    if (resourceType === 'Notes' && module) {
      path.push('notes', module);
    } else if (resourceType === 'Question Paper') {
      path.push('question-papers');
    }

    // Decode the file content from the data URI
    const fileBuffer = Buffer.from(fileDataUri.substring(fileDataUri.indexOf(',') + 1), 'base64');
    const mimeType = fileDataUri.substring(fileDataUri.indexOf(':') + 1, fileDataUri.indexOf(';'));

    // Upload the file to Google Drive
    const driveResponse = await uploadFileToDrive(fileBuffer, fileName, mimeType, path);
    if (!driveResponse) {
      throw new Error('Failed to upload file to Google Drive.');
    }

    let summary: string | undefined;

    // If it's a PDF, try to generate a summary
    if (mimeType === 'application/pdf') {
      try {
        const pdfData = await pdfParse(fileBuffer);
        if (pdfData.text) {
          const summaryResponse = await summarizeResource({ resourceText: pdfData.text.substring(0, 8000) });
          summary = summaryResponse.summary;
        }
      } catch (e) {
        console.error("Failed to parse PDF or generate summary:", e);
        // We don't throw an error here, just proceed without a summary
      }
    }

    return {
      fileId: driveResponse.id,
      summary: summary,
      webViewLink: driveResponse.webViewLink,
    };
  }
);
