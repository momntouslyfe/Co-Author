
'use server';

/**
 * @fileOverview This file defines a Genkit flow for expanding book content chapter by chapter.
 *
 * The flow now accepts more context (book title, outline, etc.) to generate more relevant
 * and well-structured content that naturally follows the selected paragraph.
 *
 * @exported expandBookContent - A function that expands the provided book content using AI.
 * @exported ExpandBookContentInput - The input type for the expandBookContent function.
 * @exported ExpandBookContentOutput - The return type for the expandBookContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExpandBookContentInputSchema = z.object({
  bookTitle: z.string().describe("The main title of the book."),
  fullOutline: z.string().describe("The entire book outline for context."),
  chapterTitle: z.string().describe("The title of the current chapter."),
  contentToExpand: z.string().describe('The paragraph of book content to use as a starting point for expansion.'),
  styleProfile: z.string().optional().describe('The desired writing style for the content.'),
});
export type ExpandBookContentInput = z.infer<typeof ExpandBookContentInputSchema>;

const ExpandBookContentOutputSchema = z.object({
  expandedContent: z.string().describe('One or more new paragraphs of expanded content, formatted with varied paragraph length.'),
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

**CONTEXT:**
- Book Title: {{{bookTitle}}}
- Chapter: {{{chapterTitle}}}
- Full Outline: {{{fullOutline}}}

**CRITICAL INSTRUCTIONS:**
1.  Use the "Starting Paragraph" below as the context and starting point.
2.  Generate AT LEAST ONE, and preferably two to three, new paragraphs that elaborate on, provide examples for, or delve deeper into the topic of the starting paragraph.
3.  The new paragraphs must follow these human-like writing rules:
    *   **Varied Paragraphs:** Use short paragraphs, typically 3-5 sentences long, but you MUST vary the length for rhythm and readability.
    *   **Clarity:** Ensure there are clear gaps (a double newline) between every paragraph.
4.  Maintain the writing style specified, if one is provided.
5.  Return ONLY the new paragraphs. Do not repeat the original paragraph in your response.

**Starting Paragraph:**
{{{contentToExpand}}}

{{#if styleProfile}}
**Writing Style:**
{{{styleProfile}}}
{{/if}}
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
