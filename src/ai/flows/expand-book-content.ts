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

import {z} from 'genkit';
import { ModelReference } from 'genkit/ai';
import { getUserGenkitInstance } from '@/lib/genkit-user';

const ExpandBookContentInputSchema = z.object({
  userId: z.string().describe('The user ID for API key retrieval.'),
  bookTitle: z.string().describe("The main title of the book."),
  fullOutline: z.string().describe("The entire book outline for context."),
  chapterTitle: z.string().describe("The title of the current chapter."),
  contentToExpand: z.string().describe('The paragraph of book content to use as a starting point for expansion.'),
  instruction: z.string().optional().describe('A specific instruction from the user on how to expand the content.'),
  styleProfile: z.string().optional().describe('The desired writing style for the content.'),
  researchProfile: z.string().optional().describe('An AI research profile with audience context.'),
  storytellingFramework: z.string().optional().describe('The storytelling framework for the book.'),
  model: z.custom<ModelReference<any>>().optional().describe('The generative AI model to use.'),
});
export type ExpandBookContentInput = z.infer<typeof ExpandBookContentInputSchema>;

const ExpandBookContentOutputSchema = z.object({
  expandedContent: z.string().describe('One or more new paragraphs of expanded content, formatted with varied paragraph length.'),
});
export type ExpandBookContentOutput = z.infer<typeof ExpandBookContentOutputSchema>;

export async function expandBookContent(input: ExpandBookContentInput): Promise<ExpandBookContentOutput> {
  const { ai, model } = await getUserGenkitInstance(input.userId);
  
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
4.  **HUMAN-LIKE PARAGRAPHING (NON-NEGOTIABLE):** Use short, readable paragraphs (3-5 sentences), but you MUST VARY their length for good rhythm. Ensure a double newline (a blank line) exists between every paragraph.
{{#if styleProfile}}
5.  **ADHERE TO WRITING STYLE (NON-NEGOTIABLE):** You MUST adopt the following writing style. This includes matching the tone, voice, vocabulary, sentence structure, and especially any code-mixing (use of multiple languages, e.g., 'আপনার 'ফ্রিল্যান্সিং' 'ক্যারিয়ারের'-এর জন্য এটা খুব ইম্পরট্যান্ট') described.
    ---
    **Writing Style Profile:**
    {{{styleProfile}}}
    ---
{{/if}}
6.  Return ONLY the new paragraphs. Do not repeat the original paragraph in your response.

**User's Instruction:**
{{#if instruction}}
{{{instruction}}}
{{else}}
Just write more. Expand on the ideas presented in the starting paragraph.
{{/if}}

**Starting Paragraph:**
{{{contentToExpand}}}
`,
  });
  
  const {output} = await prompt(input, { ...(input.model && { model: input.model }) });
  return output!;
}
