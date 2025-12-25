// This is a server-side file!
'use server';

/**
 * @fileOverview A chatbot flow that answers questions about VTU courses and syllabus.
 *
 * - vtuChatbot - A function that handles the chatbot interaction.
 * - VtuChatbotInput - The input type for the vtuChatbot function.
 * - VtuChatbotOutput - The return type for the vtuChatbot function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VtuChatbotInputSchema = z.object({
  query: z.string().describe('The user query about VTU courses or syllabus.'),
  resources: z.string().describe('Relevant VTU syllabus and course information to answer the query.'),
  pdfBase64: z.string().optional().describe('Base64 encoded PDF content to use as context for answering questions.'),
  pdfMimeType: z.string().optional().describe('MIME type of the PDF file.'),
  pdfName: z.string().optional().describe('Name of the PDF file for reference.'),
});
export type VtuChatbotInput = z.infer<typeof VtuChatbotInputSchema>;

const VtuChatbotOutputSchema = z.object({
  answer: z.string().describe('The answer to the user query based on the provided resources.'),
});
export type VtuChatbotOutput = z.infer<typeof VtuChatbotOutputSchema>;

export async function vtuChatbot(input: VtuChatbotInput): Promise<VtuChatbotOutput> {
  return vtuChatbotFlow(input);
}

const vtuChatbotFlow = ai.defineFlow(
  {
    name: 'vtuChatbotFlow',
    inputSchema: VtuChatbotInputSchema,
    outputSchema: VtuChatbotOutputSchema,
  },
  async input => {
    // Build the prompt parts
    const promptParts: any[] = [];
    
    // If PDF is provided, include it as a document for context
    if (input.pdfBase64 && input.pdfMimeType) {
      promptParts.push({
        media: {
          url: `data:${input.pdfMimeType};base64,${input.pdfBase64}`,
        }
      });
      
      promptParts.push({
        text: `You are a chatbot assistant specialized in answering questions about VTU courses and syllabus. Your name is "Study Sphere Hub".

You have been provided with a PDF document${input.pdfName ? ` named "${input.pdfName}"` : ''}. Use the content of this PDF document to answer the user's question accurately.

If the answer can be found in the PDF document, use that information to provide a detailed response.
If the answer is not found in the PDF or the provided resources, respond politely that you cannot find the answer in the available materials.
Do not make up answers.

Additional Resources:
${input.resources}

Question: ${input.query}

Please provide a helpful and accurate answer based on the PDF document and resources provided.`
      });
    } else {
      // No PDF, use text-only prompt
      promptParts.push({
        text: `You are a chatbot assistant specialized in answering questions about related to the VTU courses and syllabus and your name is "Study Sphere Hub".

Use the provided resources to answer the user's question. If the answer is not found in the resources, respond politely that you cannot answer the question. Do not make up answers.

Resources:
${input.resources}

Question: ${input.query}`
      });
    }
    
    const {output} = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      output: { schema: VtuChatbotOutputSchema },
      prompt: promptParts,
    });
    
    return output!;
  }
);
