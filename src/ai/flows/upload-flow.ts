'use server';

/**
 * @fileOverview An AI flow to handle resource uploads to AWS S3.
 *
 * - uploadResource - Handles the file upload and S3 storage.
 * - UploadResourceInput - The input type for the uploadResource function.
 * - UploadResourceOutput - The return type for the uploadResource function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { uploadFileToS3 } from '@/lib/s3';

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
  fileUrl: z.string().describe('The public URL of the file stored in AWS S3.'),
  summary: z.string().optional().describe('A summary of the file content if it was a PDF.'),
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
    
    // Determine the folder path in S3
    const path = ['VTU Assistant', scheme, branch, semester, subject];
    
    if (resourceType === 'Notes' && module) {
      path.push('notes', module);
    } else if (resourceType === 'Question Paper') {
      path.push('question-papers');
    }

    // Decode the file content from the data URI
    const fileBuffer = Buffer.from(fileDataUri.substring(fileDataUri.indexOf(',') + 1), 'base64');
    const mimeType = fileDataUri.substring(fileDataUri.indexOf(':') + 1, fileDataUri.indexOf(';'));

    // Upload the file to S3
    const publicUrl = await uploadFileToS3(fileBuffer, fileName, mimeType, path);

    // Return the URL without a summary
    return {
      fileUrl: publicUrl,
      summary: undefined,
    };
  }
);
