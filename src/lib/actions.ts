
'use server';

import { uploadFileToStorage, deleteFileFromStorage, checkForExistingFile, getFileContentAsBase64 } from '@/lib/storage';
import { z } from 'zod';
import { vtuChatbot } from '@/ai/flows/vtu-chatbot';
import { revalidatePath } from 'next/cache';


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
  query: string,
  pdfContext?: { url: string; name: string }
): Promise<{ answer?: string; error?: string }> {
  try {
    let pdfBase64: string | undefined;
    let pdfMimeType: string | undefined;
    
    // If PDF context is provided, fetch the PDF content
    if (pdfContext?.url) {
      try {
        const pdfData = await getFileContentAsBase64(pdfContext.url);
        pdfBase64 = pdfData.base64;
        pdfMimeType = pdfData.mimeType;
      } catch (error) {
        console.error('Failed to fetch PDF content:', error);
        // Continue without PDF context if fetch fails
      }
    }
    
    const response = await vtuChatbot({
      query: query,
      resources: VTU_RESOURCES_TEXT,
      pdfBase64,
      pdfMimeType,
      pdfName: pdfContext?.name
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
  fileUrl: z.string().optional(),
  error: z.string().optional(),
  conflict: z.boolean().optional(),
  existingFileId: z.string().optional(),
});

type UploadResourceOutput = z.infer<typeof UploadResourceOutputSchema>;

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Handles the file upload to Appwrite Storage. This is a server action.
 */
export async function uploadResource(formData: FormData): Promise<UploadResourceOutput> {
  try {
    const scheme = formData.get('scheme') as string;
    const branch = formData.get('branch') as string;
    const semester = formData.get('semester') as string;
    const subject = formData.get('subject') as string;
    const resourceType = formData.get('resourceType') as 'Notes' | 'Question Paper';
    const module = formData.get('module') as string | null;
    const file = formData.get('file') as File;
    const overwrite = formData.get('overwrite') === 'true';
    const existingFileId = formData.get('existingFileId') as string | null;
    
    if (!scheme || !branch || !semester || !subject || !resourceType || !file || file.size === 0) {
      return { error: 'Missing or invalid required form fields.' };
    }
    
    // Check file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return { error: 'File should be less than 10MB' };
    }
    
    if (resourceType === 'Notes' && !module) {
        return { error: 'Module is required for Notes.'};
    }

    const path = ['Study Sphere Hub', scheme, branch, semester, subject];
    if (resourceType === 'Notes' && module) {
      path.push('notes', module); 
    } else if (resourceType === 'Question Paper') {
      path.push('question-papers');
    }

    if (!overwrite) {
        const conflictingFileId = await checkForExistingFile(path);
        if (conflictingFileId) {
            return {
                conflict: true,
                existingFileId: conflictingFileId
            };
        }
    }
    
    // If we are overwriting, we need to delete the old file first.
    // For question papers, we don't implement overwrite logic to allow multiple files, so we just upload.
    if (overwrite && existingFileId && resourceType === 'Notes') {
        await deleteFileFromStorage(existingFileId);
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    // For question papers, append a timestamp to the filename to ensure uniqueness
    // Include path in filename for organization
    const pathPrefix = path.join('_').replace(/[^a-zA-Z0-9_-]/g, '_');
    const finalFileName = resourceType === 'Question Paper' 
      ? `${pathPrefix}_${Date.now()}_${file.name}`
      : `${pathPrefix}_${file.name}`;
      
    const result = await uploadFileToStorage(fileBuffer, finalFileName, file.type, path);
    
    // Revalidate the API route to ensure fresh data is fetched on next load
    revalidatePath('/api/resources');

    return {
      fileUrl: result.url,
    };
  } catch (error: any) {
    console.error("Upload failed:", error);
    // Ensure the returned error message is a simple string.
    const errorMessage = typeof error.message === 'string' ? error.message : "An unknown error occurred during upload.";
    return { error: errorMessage };
  }
}

export async function deleteResource(fileId: string): Promise<{ success?: boolean; error?: string }> {
    try {
        if (!fileId) {
            return { error: 'File ID is required for deletion.' };
        }
        await deleteFileFromStorage(fileId);
        // Revalidate the API route that fetches these resources
        revalidatePath('/api/resources');
        return { success: true };
    } catch (error: any) {
        console.error("Deletion failed:", error);
        const errorMessage = typeof error.message === 'string' ? error.message : "An unknown error occurred during deletion.";
        return { error: errorMessage };
    }
}
