
'use server';

/**
 * @fileOverview DEPRECATED: This file is no longer used.
 * 
 * The chapter generation logic has been moved to write-chapter-section.ts.
 * This function throws an error to prevent accidental use.
 * 
 * Use writeChapterSection from @/ai/flows/write-chapter-section instead.
 */

import {z} from 'genkit';

const GenerateChapterContentInputSchema = z.object({
  userId: z.string().describe('The user ID for API key retrieval.'),
  idToken: z.string().describe('Firebase ID token for authentication verification.'),
  bookTitle: z.string(),
});
export type GenerateChapterContentInput = z.infer<typeof GenerateChapterContentInputSchema>;

const GenerateChapterContentOutputSchema = z.object({
  chapterContent: z.string(),
});
export type GenerateChapterContentOutput = z.infer<typeof GenerateChapterContentOutputSchema>;

export async function generateChapterContent(input: GenerateChapterContentInput): Promise<GenerateChapterContentOutput> {
  throw new Error(
    'DEPRECATED: generateChapterContent is no longer available. ' +
    'Use writeChapterSection from @/ai/flows/write-chapter-section instead.'
  );
}
