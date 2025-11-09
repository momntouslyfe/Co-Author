'use server';

/**
 * @fileOverview This file defines a Genkit flow for expanding book content chapter by chapter.
 *
 * The flow uses an AI model to extend the provided content while ensuring high quality and adherence to the user's selected style.
 *
 * @exported expandBookContent - A function that expands the provided book content using AI.
 * @exported ExpandBookContentInput - The input type for the expandBookContent function.
 * @exported ExpandBookContentOutput - The return type for the expandBookContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExpandBookContentInputSchema = z.object({
  content: z.string().describe('The book content to be expanded.'),
  style: z.string().describe('The desired writing style for the content.'),
});
export type ExpandBookContentInput = z.infer<typeof ExpandBookContentInputSchema>;

const ExpandBookContentOutputSchema = z.object({
  expandedContent: z.string().describe('The expanded book content.'),
});
export type ExpandBookContentOutput = z.infer<typeof ExpandBookContentOutputSchema>;

export async function expandBookContent(input: ExpandBookContentInput): Promise<ExpandBookContentOutput> {
  return expandBookContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'expandBookContentPrompt',
  input: {schema: ExpandBookContentInputSchema},
  output: {schema: ExpandBookContentOutputSchema},
  prompt: `You are an AI co-author assisting a writer in expanding their book content.\n\n  The writer has provided the following content:\n  {{{content}}}\n\n  The writer wants the content to be expanded while maintaining the following writing style:\n  {{{style}}}\n\n  Expand the content, ensuring high quality and adherence to the specified style. Return only the expanded content.\n  Do not include any introductory or concluding remarks, just the expanded content.`,
});

const expandBookContentFlow = ai.defineFlow(
  {
    name: 'expandBookContentFlow',
    inputSchema: ExpandBookContentInputSchema,
    outputSchema: ExpandBookContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
