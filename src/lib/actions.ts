
'use server';

import { vtuChatbot } from '@/ai/flows/vtu-chatbot';
import { summarizeResource } from '@/ai/flows/resource-summarization';
import { getFileAsBuffer, updateFileSummary } from './firebase';

const VTU_RESOURCES_TEXT = `
Visvesvaraya Technological University (VTU) is one of the largest technological universities in India.
Established in 1998, it has authority over engineering education throughout the state of Karnataka.
The university offers a variety of undergraduate and postgraduate courses.

Syllabus and Schemes:
VTU updates its syllabus and curriculum through different schemes, such as the 2018 scheme, 2021 scheme, and 2022 scheme.
Each scheme defines the subjects, credits, and examination patterns for all branches of engineering for all 8 semesters.

Branches of Engineering:
Popular branches include Computer Science (CSE), Information Science (ISE), Electronics and Communication (ECE), Mechanical (ME), and Civil (CV).
Each branch has a detailed syllabus for each semester under a specific scheme.

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

export async function summarizeAndStore(filePath: string): Promise<{ success: boolean, error?: string }> {
  try {
    const fileBuffer = await getFileAsBuffer(filePath);
    // Dynamically import pdf-parse only when needed.
    const pdfParser = (await import('pdf-parse')).default;
    const data = await pdfParser(fileBuffer);

    if (!data.text) {
      // Don't treat this as a hard error for the upload, just skip summarization.
      console.warn(`Could not extract text from PDF at ${filePath}. Skipping summarization.`);
      return { success: true };
    }

    const { summary } = await summarizeResource({ resourceText: data.text });
    
    if (!summary) {
       // Also not a hard error.
       console.warn(`AI failed to generate a summary for ${filePath}.`);
       return { success: true };
    }

    await updateFileSummary(filePath, summary);

    return { success: true };

  } catch (error) {
    console.error(`Summarization error for ${filePath}:`, error);
    // We don't propagate the error to the client as the primary action (upload) was successful.
    return { success: false, error: "An unexpected error occurred during summarization." };
  }
}
