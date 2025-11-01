
'use server';

import { vtuChatbot } from '@/ai/flows/vtu-chatbot';
import { uploadFileToS3 } from '@/lib/s3';
import { z } from 'zod';

const VTU_RESOURCES_TEXT = `
Visvesvaraya Technological University (VTU) is one of the largest technological universities in India.
Established in 1998, it has authority over engineering education throughout the state of Karnataka.
The university offers a variety of undergraduate and postgraduate courses.

Syllabus and Schemes:
VTU updates its syllabus and curriculum through different schemes, such as the 2018 scheme, 2021 scheme, and 2022 scheme.
Each scheme defines the subjects, credits, and examination patterns for all branches of engineering for all 8 semesters.

Branches of Engineering:
Popular branches include Computer Science (CSE), Information Science (ISE), Electronics and Communication (ECE), Mechanical (ME), and Civil (CV).
Each branch has a detailed syllabus for each branch for each semester under a specific scheme.

Examinations:
VTU conducts examinations at the end of each semester.
Results are typically announced a few weeks after the exams conclude.
Students can check their results on the official VTU website.
`;

export async function getChatbotResponse(
  chatHistory: { role: 'user' | 'bot', content: string }[],
  query: string
): Promise<{ answer?: string; error?: string }> {
  try {
    const response = await vtuChatbot({
      query: query,
      resources: VTU_RESOURCES_TEXT
    });
    if (response && response.answer) {
      return { answer: response.answer };
    }
    return { error: 'Failed to get a response from the AI.' };
  } catch (error) {
    console.error('Chatbot action error:', error);
    return { error: 'An unexpected error occurred. Please try again.' };
  }
}

// Schema and types for uploadResource
const UploadResourceInputSchema = z.object({
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

type UploadResourceInput = z.infer<typeof UploadResourceInputSchema>;

const UploadResourceOutputSchema = z.object({
  fileUrl: z.string().describe('The public URL of the file stored in AWS S3.'),
  summary: z.string().optional().describe('A summary of the file content if it was a PDF.'),
});

type UploadResourceOutput = z.infer<typeof UploadResourceOutputSchema>;


/**
 * Handles the file upload to AWS S3.
 */
export async function uploadResource(input: UploadResourceInput): Promise<UploadResourceOutput> {
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
