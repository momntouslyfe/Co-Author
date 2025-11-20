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

import {z} from 'genkit';

import { getUserGenkitInstance } from '@/lib/genkit-user';
import { retryWithBackoff, AI_GENERATION_RETRY_CONFIG } from '@/lib/retry-utils';

const WriteChapterSectionInputSchema = z.object({
  userId: z.string().describe('The user ID for API key retrieval.'),
  idToken: z.string().describe('Firebase ID token for authentication verification.'),
  bookTitle: z.string().describe('The main title of the book.'),
  fullOutline: z.string().describe('The entire book outline for context.'),
  chapterTitle: z.string().describe('The title of the chapter this section belongs to.'),
  sectionTitle: z.string().describe('The specific title of the section to be written.'),
  language: z.string().describe('The language the section should be written in.'),
  previousContent: z.string().optional().describe('The content of the chapter written so far, for context.'),
  storytellingFramework: z.string().optional().describe('The storytelling framework for the book.'),
  researchProfile: z.string().optional().describe('An AI research profile with audience context.'),
  styleProfile: z.string().optional().describe('An AI style profile to guide the tone and voice.'),
  model: z.string().optional().describe('The generative AI model to use.'),
});
export type WriteChapterSectionInput = z.infer<typeof WriteChapterSectionInputSchema>;

const WriteChapterSectionOutputSchema = z.object({
  sectionContent: z.string().describe('The fully generated content for the specified section, consisting of multiple paragraphs.'),
});
export type WriteChapterSectionOutput = z.infer<typeof WriteChapterSectionOutputSchema>;

export async function writeChapterSection(input: WriteChapterSectionInput): Promise<WriteChapterSectionOutput> {
  const context = `Section: "${input.sectionTitle}" in Chapter: "${input.chapterTitle}"`;
  
  return retryWithBackoff(
    async () => {
      const { ai, model } = await getUserGenkitInstance(input.userId, input.idToken);
      
      let chosenPrompt;
  
  if (input.sectionTitle === "Your Action Step") {
    chosenPrompt = ai.definePrompt({
      name: 'writeActionStepPrompt',
      input: { schema: WriteChapterSectionInputSchema },
      output: { schema: WriteChapterSectionOutputSchema },
      prompt: `You are an expert ghostwriter. Your task is to write the "Your Action Step" section for a book chapter in {{{language}}}.

**CONTEXT:**
- You MUST use the "Previous Chapter Content" to understand what the chapter was about.
  ---
  {{{previousContent}}}
  ---

**YOUR TASK:**
Write the content for the section titled: **"{{{sectionTitle}}}"**.

**CRITICAL INSTRUCTIONS (Read Carefully):**

1.  **LANGUAGE:** You MUST write in **{{{language}}}**.
2.  **ACTION STEP FORMAT (NON-NEGOTIABLE):** You are writing the "Action Step" section. You MUST follow this format precisely:
    1.  Start with a single, concise paragraph that summarizes the core lesson or takeaway of the entire chapter based on the provided content.
    2.  After the summary paragraph, create a bulleted or numbered list containing 5 to 7 single-sentence action items that the reader can implement. These action items must be direct, clear, and derived from the chapter's main points. Use standard Markdown for the list (e.g., '-' for bullets, '1.' for numbers). Do NOT use HTML tags.
3.  **HUMAN-LIKE PARAGRAPHING (NON-NEGOTIABLE):** Ensure there are clear gaps (a double newline) between the summary paragraph and the list.
4.  **RETURN ONLY THE CONTENT:** Your output must ONLY be the summary paragraph followed by the list. Do not add the section title.

Proceed to write the "Your Action Step" section now.
`,
    });
  } else if (input.sectionTitle === "Coming Up Next") {
    chosenPrompt = ai.definePrompt({
      name: 'writeComingUpNextPrompt',
      input: { schema: WriteChapterSectionInputSchema },
      output: { schema: WriteChapterSectionOutputSchema },
      prompt: `You are an expert ghostwriter. Your task is to write the "Coming Up Next" section for a book chapter in {{{language}}}.

**CONTEXT:**
- You MUST use the "Full Book Outline" to understand what the next chapter is about.
  ---
  {{{fullOutline}}}
  ---
- You are currently finishing the chapter titled: **{{{chapterTitle}}}**

**YOUR TASK:**
Write the content for the section titled: **"{{{sectionTitle}}}"**.

**CRITICAL INSTRUCTIONS (Read Carefully):**

1.  **LANGUAGE:** You MUST write in **{{{language}}}**.
2.  **"COMING UP NEXT" FORMAT (NON-NEGOTIABLE):** You are writing the "Coming Up Next" section. You MUST write one or two short paragraphs that act as a summary or teaser for the *next* chapter in the outline. Keep it brief and intriguing. Do not write more than two paragraphs.
3.  **HUMAN-LIKE PARAGRAPHING (NON-NEGOTIABLE):** Use short, readable paragraphs and ensure a double newline (a blank line) exists between them if you write more than one.
4.  **RETURN ONLY THE CONTENT:** Your output must ONLY be the teaser paragraphs. Do not add the section title.

Proceed to write the "Coming Up Next" section now.
`,
    });
  } else {
    chosenPrompt = ai.definePrompt({
      name: 'writeStandardSectionPrompt',
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
- **ADHERE TO WRITING STYLE (NON-NEGOTIABLE):** You MUST adopt the following writing style. This includes matching the tone, voice, vocabulary, sentence structure, and especially any code-mixing (use of multiple languages, e.g., 'আপনার 'ফ্রিল্যান্সিং' 'ক্যারিয়ারের'-এর জন্য এটা খুব ইম্পরট্যান্ট') described.
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

**CRITICAL INSTRUCTIONS (Read Carefully):**

1.  **FOCUSED CONTENT:** All content must be directly related to the provided section title.

2.  **HUMAN-LIKE PARAGRAPHING (NON-NEGOTIABLE):** Use short, readable paragraphs (3-5 sentences), but VARY their length for good rhythm. Ensure a double newline (a blank line) exists between paragraphs.

3.  **RETURN ONLY THE CONTENT:** Your output must ONLY be the text for the new section. Do not add the section title or any other formatting; return only the paragraphs.

4.  **SUBSTANTIAL CONTENT (STRICT REQUIREMENT):** You MUST write at least 400 words for this section. This is a non-negotiable instruction. Generate multiple, well-developed, and insightful paragraphs to meet this word count.

Proceed to write the section content now.
`,
    });
  }
  
      try {
        const { output } = await chosenPrompt(input, { ...(input.model && { model: input.model }) });

        if (!output || !output.sectionContent) {
          throw new Error("AI failed to generate the section content.");
        }
        
        return {
          sectionContent: output.sectionContent,
        };
      } catch (error: any) {
        console.error('Error generating section content:', error);
        
        // Re-throw the original error to preserve retry detection
        // The retry utility will handle these errors based on their original message
        throw error;
      }
    },
    AI_GENERATION_RETRY_CONFIG,
    context
  );
}
