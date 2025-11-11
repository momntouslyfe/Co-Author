
'use server';

/**
 * @fileOverview This file defines a Genkit flow for expanding book content chapter by chapter.
 *
 * The flow now accepts more context (book title, outline, etc.) and an optional
 * user-provided instruction to generate more relevant and well-structured content.
 *
 * @exported expandBookContent - A function that expands the provided book content using AI.
 * @exported ExpandBookContentInput - The input type for the expandBookContent function.
 * @exported ExpandBookContentOutput - The return type for the expandBookContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { ModelReference } from 'genkit/ai';

const ExpandBookContentInputSchema = z.object({
  bookTitle: z.string().describe("The main title of the book."),
  fullOutline: z.string().describe("The entire book outline for context."),
  chapterTitle: z.string().describe("The title of the current chapter."),
  contentToExpand: z.string().describe('The paragraph of book content to use as a starting point for expansion.'),
  instruction: z.string().optional().describe('A specific instruction from the user on how to expand the content.'),
  styleProfile: z.string().optional().describe('The desired writing style for the content.'),
  researchProfile: z.string().optional().describe('An AI research profile with audience context.'),
  storytellingFramework: z.string().optional().describe('The storytelling framework for the book.'),
  apiKey: z.string().optional().describe('The API key for the generative AI model.'),
  model: z.custom<ModelReference<any>>().optional().describe('The generative AI model to use.'),
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
  prompt: `You are an AI co-author. Your task is to take a given paragraph and generate one or more new paragraphs of content that naturally follow it, based on the user's instruction.

**CONTEXT:**
- Book Title: {{{bookTitle}}}
- Chapter: {{{chapterTitle}}}
- Full Outline: {{{fullOutline}}}
{{#if storytellingFramework}}- Storytelling Framework: {{{storytellingFramework}}}{{/if}}
{{#if researchProfile}}
- **Audience Research Profile (CRITICAL):** You MUST use this research to inform your writing.
  ---
  {{{researchProfile}}}
  ---
{{/if}}

**CRITICAL INSTRUCTIONS:**
1.  Use the "Starting Paragraph" below as the primary context.
2.  Follow the "User's Instruction" to guide what you write next. If no instruction is provided, your default task is to simply expand upon the ideas in the starting paragraph.
3.  Generate AT LEAST ONE, and preferably two to three, new paragraphs.
4.  The new paragraphs must follow these human-like writing rules:
    *   **Varied Paragraphs:** Use short paragraphs, typically 3-5 sentences long, but you MUST vary the length for rhythm and readability.
    *   **Clarity:** Ensure there are clear gaps (a double newline) between every paragraph.
5.  Maintain the writing style specified, if one is provided.
6.  Return ONLY the new paragraphs. Do not repeat the original paragraph in your response.

**User's Instruction:**
{{#if instruction}}
{{{instruction}}}
{{else}}
Just write more. Expand on the ideas presented in the starting paragraph.
{{/if}}

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
  async (input) => {
    const {output} = await prompt(input, { apiKey: input.apiKey, model: input.model });
    return output!;
  }
);
