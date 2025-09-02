
'use server';

import { vtuChatbot } from '@/ai/flows/vtu-chatbot';
import { summarizeResource } from '@/ai/flows/resource-summarization';
import { getFileAsBuffer } from './firebase';
import { updateFileContext } from './cloudinary';
import { ResourceFile } from './data';

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

export type ResourceMetadata = {
  scheme: string;
  branch: string;
  semester: string;
  subject: string;
  resourceType: 'notes' | 'questionPaper';
  module?: string;
  file: Omit<ResourceFile, 'summary'> & { publicId: string };
};

export async function saveResourceMetadata(metadata: ResourceMetadata) {
  // This function is no longer needed as context is saved directly during upload.
  // It's kept for compatibility in case it's used elsewhere, but can be removed.
  return { success: true };
}


export async function summarizeAndStore(publicId: string): Promise<{ success: boolean, error?: string }> {
  // This feature is temporarily disabled.
  return { success: true };
}

    