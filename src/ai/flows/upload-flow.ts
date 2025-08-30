
'use server';
/**
 * @fileOverview This flow is deprecated and no longer used. Uploads are now handled on the client.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DeprecatedInputSchema = z.object({
  fileName: z.string(),
  fileContent: z.string(),
  contentType: z.string(),
});

const DeprecatedOutputSchema = z.object({
    success: z.boolean(),
    error: z.string().optional(),
    message: z.string().optional(),
});


// @deprecated This flow is no longer used.
ai.defineFlow(
  {
    name: 'uploadFileFlow',
    inputSchema: DeprecatedInputSchema,
    outputSchema: DeprecatedOutputSchema,
  },
  async () => {
    return {
        success: false,
        error: 'This flow is deprecated and should not be used.',
        message: 'Please use the client-side upload implementation.'
    }
  }
);
