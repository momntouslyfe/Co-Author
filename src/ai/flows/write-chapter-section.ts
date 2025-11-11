
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating the content for a single section of a book chapter.
 *
 * This flow is designed to be called interactively from the editor. It takes all the necessary
 * context for the book and chapter, and focuses on generating a substantial, high-quality
 * piece of content for a single title (e.g., a sub-topic, an introduction, or an action step).
 *
 * @exported writeChapterSection - The function that generates the section content.
 * @exported WriteChapterSectionInput - The input type for the function.
 * @exported WriteChapterSectionOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { ModelReference } from 'genkit/ai';

const WriteChapterSectionInputSchema = z.object({
  bookTitle: z.string().describe('The main title of the book.'),
  fullOutline: z.string().describe('The entire book outline for context.'),
  chapterTitle: z.string().describe('The title of the chapter this section belongs to.'),
  sectionTitle: z.string().describe('The specific title of the section to be written.'),
  language: z.string().describe('The language the section should be written in.'),
  previousContent: z.string().optional().describe('The content of the chapter written so far, for context.'),
  storytellingFramework: z.string().optional().describe('The storytelling framework for the book.'),
  researchProfile: z.string().optional().describe('An AI research profile with audience context.'),
  styleProfile: z.string().optional().describe('An AI style profile to guide the tone and voice.'),
  apiKey: z.string().optional().describe('The API key for the generative AI model.'),
  model: z.custom<ModelReference<any>>().optional().describe('The generative AI model to use.'),
});
export type WriteChapterSectionInput = z.infer<typeof WriteChapterSectionInputSchema>;

const WriteChapterSectionOutputSchema = z.object({
  sectionContent: z.string().describe('The fully generated content for the specified section, consisting of multiple paragraphs.'),
});
export type WriteChapterSectionOutput = z.infer<typeof WriteChapterSectionOutputSchema>;

const writeSectionPrompt = ai.definePrompt({
    name: 'writeSectionPrompt',
    input: { schema: WriteChapterSectionInputSchema },
    output: { schema: WriteChapterSectionOutputSchema },
    prompt: `You are an expert ghostwriter. Your task is to write a complete, high-quality section for a book chapter in {{{language}}}.

**CONTEXT:**
- Book Title: {{{bookTitle}}}
- Chapter: {{{chapterTitle}}}
- Full Book Outline: {{{fullOutline}}}
{{#if storytellingFramework}}- Storytelling Framework: {{{storytellingFramework}}}{{/if}}
{{#if previousContent}}
- **Previous Chapter Content (for context):** Use the following text to ensure your new section connects seamlessly and logically with what has come before. Do not repeat this content.
  ---
  {{{previousContent}}}
  ---
{{/if}}
{{#if styleProfile}}
- **ADHERE TO WRITING STYLE (NON-NEGOTIABLE):** You MUST adopt the following writing style. This includes matching the tone, voice, vocabulary, sentence structure, and especially any code-mixing (use of multiple languages, e.g., 'আপনার 'ফ্রিল্যান্সিং' 'ক্যারিয়ারের'-এর জন্য এটা খুব ইম্পরট্যান্ট') described.
  ---
  **Writing Style Profile:**
  {{{styleProfile}}}
  ---
{{/if}}
{{#if researchProfile}}
- **Audience Research Profile (CRITICAL):** You MUST use this research to inform your writing.
  ---
  {{{researchProfile}}}
  ---
{{/if}}

**YOUR TASK:**
Write the content for the section titled: **"{{{sectionTitle}}}"**.

**CRITICAL INSTRUCTIONS:**
1.  **FOCUSED CONTENT:** All content must be directly related to the provided section title.
2.  **SUBSTANTIAL CONTENT (STRICT REQUIREMENT):** You MUST write at least 400 words for this section. This is a non-negotiable instruction. Generate multiple, well-developed, and insightful paragraphs to meet this word count.
3.  **HUMAN-LIKE PARAGRAPHING:** Use short, readable paragraphs (3-5 sentences), but VARY their length for good rhythm. Ensure a double newline (a blank line) exists between paragraphs.
4.  **RETURN ONLY THE CONTENT:** Your output must ONLY be the text for the new section. Do not add the section title or any other formatting; return only the paragraphs.

Proceed to write the section content now.
`,
});

export async function writeChapterSection(input: WriteChapterSectionInput): Promise<WriteChapterSectionOutput> {
  return writeChapterSectionFlow(input);
}


const writeChapterSectionFlow = ai.defineFlow(
  {
    name: 'writeChapterSectionFlow',
    inputSchema: WriteChapterSectionInputSchema,
    outputSchema: WriteChapterSectionOutputSchema,
  },
  async (input) => {
    const { output } = await writeSectionPrompt(input, { apiKey: input.apiKey, model: input.model });

    if (!output || !output.sectionContent) {
        throw new Error("AI failed to generate the section content.");
    }
    
    return {
      sectionContent: output.sectionContent,
    };
  }
);
