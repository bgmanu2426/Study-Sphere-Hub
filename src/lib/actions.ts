
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

const UploadResourceOutputSchema = z.object({
  fileUrl: z.string().describe('The public URL of the file stored in AWS S3.'),
  error: z.string().optional(),
});

type UploadResourceOutput = z.infer<typeof UploadResourceOutputSchema>;

/**
 * Handles the file upload to AWS S3. This is a server action.
 */
export async function uploadResource(formData: FormData): Promise<UploadResourceOutput> {
  const scheme = formData.get('scheme') as string;
  const branch = formData.get('branch') as string;
  const semester = formData.get('semester') as string;
  const subject = formData.get('subject') as string;
  const resourceType = formData.get('resourceType') as 'Notes' | 'Question Paper';
  const module = formData.get('module') as string | undefined;
  const file = formData.get('file') as File;

  if (!file || file.size === 0) {
    return { error: "File is required." };
  }

  // Determine the folder path in S3
  const path = ['VTU Assistant', scheme, branch, semester, subject];
  
  if (resourceType === 'Notes' && module) {
    path.push('notes', module);
  } else if (resourceType === 'Question Paper') {
    path.push('question-papers');
  }

  try {
    // Get file content as Buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Upload the file to S3
    const publicUrl = await uploadFileToS3(fileBuffer, file.name, file.type, path);

    // Return the URL
    return {
      fileUrl: publicUrl,
    };
  } catch (error: any) {
    console.error("Upload failed:", error);
    return { error: error.message || "An unknown error occurred during upload." };
  }
}
