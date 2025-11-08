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

const AnalyzeWritingStyleInputSchema = z.object({
    fileDataUri: z.string().describe("A writing sample as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'. Supported file types are .txt and .pdf."),
});
export type AnalyzeWritingStyleInput = z.infer<typeof AnalyzeWritingStyleInputSchema>;

const AnalyzeWritingStyleOutputSchema = z.object({
  styleAnalysis: z.string().describe('A detailed analysis of the writing style, including tone, voice, sentence structure, vocabulary, rhythm, and other stylistic elements.'),
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

  After extracting the text, analyze the following aspects of the writing style and provide a detailed, structured breakdown:
  1.  **Tone & Mood:** (e.g., Formal, Informal, Humorous, Serious, Optimistic, Pessimistic, etc.)
  2.  **Voice:** (e.g., First-person, Third-person limited, Third-person omniscient; Is the narrator reliable? What is their personality?)
  3.  **Sentence Structure & Rhythm:** (e.g., Simple, Complex, Compound; Short and punchy, Long and flowing; Varied or consistent?)
  4.  **Vocabulary & Diction:** (e.g., Simple, Advanced, Technical, Colloquial; Use of figurative language like metaphors or similes.)
  5.  **Pacing:** (e.g., Fast, Slow, Deliberate; How does the author control the flow of information?)
  6.  **Overall Summary:** A brief summary of the author's unique stylistic signature.

  Return only the detailed analysis.`,
});

const analyzeWritingStyleFlow = ai.defineFlow(
  {
    name: 'analyzeWritingStyleFlow',
    inputSchema: AnalyzeWritingStyleInputSchema,
    outputSchema: AnalyzeWritingStyleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
