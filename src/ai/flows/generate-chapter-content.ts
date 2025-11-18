
'use server';

/**
 * @fileOverview This file is now a placeholder. The chapter generation logic has been moved
 * to a more robust, interactive, section-by-section generation process handled on the client-side
 * in `[chapterId]/page.tsx` and the new `write-chapter-section.ts` flow.
 * This file is kept to avoid breaking imports but should be considered deprecated.
 */

import {z} from 'genkit';

const GenerateChapterContentInputSchema = z.object({
  bookTitle: z.string(),
});
export type GenerateChapterContentInput = z.infer<typeof GenerateChapterContentInputSchema>;

const GenerateChapterContentOutputSchema = z.object({
  chapterContent: z.string(),
});
export type GenerateChapterContentOutput = z.infer<typeof GenerateChapterContentOutputSchema>;

export async function generateChapterContent(input: GenerateChapterContentInput): Promise<GenerateChapterContentOutput> {
  // This function is deprecated and should not be used.
  // The new interactive flow is handled by `write-chapter-section`.
  console.warn("DEPRECATED: generateChapterContent is no longer the primary method for chapter generation.");
  return { chapterContent: "This flow is deprecated. Please use the interactive editor." };
}
