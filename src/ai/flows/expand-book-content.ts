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
  content: z.string().describe('The paragraph of book content to be rewritten and expanded.'),
  style: z.string().describe('The desired writing style for the content.'),
});
export type ExpandBookContentInput = z.infer<typeof ExpandBookContentInputSchema>;

const ExpandBookContentOutputSchema = z.object({
  expandedContent: z.string().describe('The rewritten and expanded paragraph.'),
});
export type ExpandBookContentOutput = z.infer<typeof ExpandBookContentOutputSchema>;

export async function expandBookContent(input: ExpandBookContentInput): Promise<ExpandBookContentOutput> {
  return expandBookContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'expandBookContentPrompt',
  input: {schema: ExpandBookContentInputSchema},
  output: {schema: ExpandBookContentOutputSchema},
  prompt: `You are an AI co-author. Your task is to rewrite and expand a given paragraph, weaving new information naturally into the existing text.

**CRITICAL INSTRUCTIONS:**
1.  Take the original paragraph and enrich it by adding more detail, examples, or depth.
2.  Do NOT simply add a new paragraph. You must integrate the new content into the original paragraph.
3.  The final output must be a single, cohesive, rewritten paragraph.
4.  Maintain the writing style specified.
5.  Return ONLY the rewritten paragraph. Do not include any introductory or concluding remarks.

**Original Paragraph:**
{{{content}}}

**Writing Style:**
{{{style}}}
`,
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
