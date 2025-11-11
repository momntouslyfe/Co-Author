
'use server';

/**
 * @fileOverview This file defines a Genkit flow for analyzing a user's writing style from a text file or PDF.
 *
 * The flow takes a file, extracts the text, analyzes its stylistic elements (tone, voice, vocabulary, etc.),
 * and returns a detailed analysis.
 *
 * @exported analyzeWritingStyle - A function that analyzes a given writing sample file.
 * @exported AnalyzeWritingStyleInput - The input type for the analyzeWritingStyle function.
 * @exported AnalyzeWritingStyleOutput - The return type for the analyzeWritingStyle function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { ModelReference } from 'genkit/ai';

const AnalyzeWritingStyleInputSchema = z.object({
    fileDataUri: z.string().describe("A writing sample as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'. Supported file types are .txt and .pdf."),
    apiKey: z.string().optional().describe('The API key for the generative AI model.'),
    model: z.custom<ModelReference<any>>().optional().describe('The generative AI model to use.'),
});
export type AnalyzeWritingStyleInput = z.infer<typeof AnalyzeWritingStyleInputSchema>;

const AnalyzeWritingStyleOutputSchema = z.object({
  styleAnalysis: z.string().describe('A detailed analysis of the writing style, including tone, voice, sentence structure, vocabulary, rhythm, code-mixing, and other stylistic elements.'),
});
export type AnalyzeWritingStyleOutput = z.infer<typeof AnalyzeWritingStyleOutputSchema>;

export async function analyzeWritingStyle(input: AnalyzeWritingStyleInput): Promise<AnalyzeWritingStyleOutput> {
  return analyzeWritingStyleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeWritingStylePrompt',
  input: {schema: AnalyzeWritingStyleInputSchema},
  output: {schema: AnalyzeWritingStyleOutputSchema},
  prompt: `You are an expert writing analyst. Your task is to first extract the text from the following file, and then perform a deep analysis of the extracted writing sample.

  File: {{media url=fileDataUri}}

  After extracting the text, analyze the writing style and provide a detailed analysis in a well-structured listicle format.
  
  **IMPORTANT FORMATTING RULES:**
  - For each point in the listicle, provide a clear heading and explanation.
  - Ensure there is a blank line (a double newline) between each numbered list item to add space and improve readability.
  - Keep paragraphs within each section concise. If a point requires a longer explanation, break it into smaller paragraphs with a blank line between them.

  Here are the specifications for your analysis:

  1.  **Tone & Mood:** Analyze the overall feeling (e.g., Formal, Informal, Humorous, Serious, Optimistic).

  2.  **Voice:** Describe the narrator's personality and perspective (e.g., First-person, Third-person omniscient).

  3.  **Sentence Structure & Rhythm:** Examine the sentence complexity and flow (e.g., Short and punchy, Long and flowing).

  4.  **Vocabulary & Diction:** Assess the word choice (e.g., Simple, Advanced, Technical, Figurative).

  5.  **Pacing:** Describe the flow of information (e.g., Fast, Slow, Deliberate).

  6.  **Code-Mixing Analysis:** Identify and analyze the use of mixed-language phrases (e.g., 'আপনার 'ফ্রিল্যান্সিং' 'ক্যারিয়ারের'-এর জন্য এটা খুব ইম্পরট্যান্ট'). Comment on its frequency, purpose, and the specific languages being mixed. This is a critical component of the author's voice.

  7.  **Overall Summary:** Conclude with a brief summary of the author's unique stylistic signature, placing special emphasis on how all the above elements, including code-mixing, create a cohesive voice.

  Return only the detailed analysis, following all formatting rules.`,
});

const analyzeWritingStyleFlow = ai.defineFlow(
  {
    name: 'analyzeWritingStyleFlow',
    inputSchema: AnalyzeWritingStyleInputSchema,
    outputSchema: AnalyzeWritingStyleOutputSchema,
  },
  async ({ fileDataUri, apiKey, model }) => {
    const {output} = await prompt(
        { fileDataUri },
        { apiKey, ...(model && { model }) }
    );
    return output!;
  }
);
