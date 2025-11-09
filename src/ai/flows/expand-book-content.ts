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
  content: z.string().describe('The paragraph of book content to use as a starting point for expansion.'),
  style: z.string().describe('The desired writing style for the content.'),
});
export type ExpandBookContentInput = z.infer<typeof ExpandBookContentInputSchema>;

const ExpandBookContentOutputSchema = z.object({
  expandedContent: z.string().describe('One or more new paragraphs of expanded content.'),
});
export type ExpandBookContentOutput = z.infer<typeof ExpandBookContentOutputSchema>;

export async function expandBookContent(input: ExpandBookContentInput): Promise<ExpandBookContentOutput> {
  return expandBookContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'expandBookContentPrompt',
  input: {schema: ExpandBookContentInputSchema},
  output: {schema: ExpandBookContentOutputSchema},
  prompt: `You are an AI co-author. Your task is to take a given paragraph and significantly expand upon its ideas, generating one or more new paragraphs of content that naturally follow it.

**CRITICAL INSTRUCTIONS:**
1.  Use the "Starting Paragraph" below as the context and starting point.
2.  Generate AT LEAST ONE, and preferably two to three, new paragraphs that elaborate on, provide examples for, or delve deeper into the topic of the starting paragraph.
3.  The new paragraphs must follow these human-like writing rules:
    *   **Paragraphs:** Use short paragraphs, typically 3-5 sentences long. Vary paragraph length for rhythm.
    *   **Clarity:** Ensure there are clear gaps (a double newline) between every paragraph.
4.  Maintain the writing style specified.
5.  Return ONLY the new paragraphs. Do not include the original paragraph in your response.

**Starting Paragraph:**
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
