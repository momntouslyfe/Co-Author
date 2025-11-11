
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a complete book chapter in a single operation.
 *
 * This flow is designed for generating a full first draft quickly, ensuring a substantial word count
 * by commanding the AI to write each section to a specific length.
 *
 * @exported generateFullChapter - A function that generates a complete chapter.
 * @exported GenerateFullChapterInput - The input type for the function.
 * @exported GenerateFullChapterOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { ModelReference } from 'genkit';

const GenerateFullChapterInputSchema = z.object({
  bookTitle: z.string().describe('The main title of the book.'),
  fullOutline: z.string().describe('The entire book outline for context.'),
  chapterTitle: z.string().describe('The title of the chapter this section belongs to.'),
  sectionTitles: z.array(z.string()).describe('A complete array of all section titles for the chapter, including Introduction, sub-topics, Action Step, etc.'),
  language: z.string().describe('The language the chapter should be written in.'),
  storytellingFramework: z.string().optional().describe('The storytelling framework for the book.'),
  researchProfile: z.string().optional().describe('An AI research profile with audience context.'),
  styleProfile: z.string().optional().describe('An AI style profile to guide the tone and voice.'),
  apiKey: z.string().optional().describe('The API key for the generative AI model.'),
  model: z.custom<ModelReference<any>>().optional().describe('The generative AI model to use.'),
});
export type GenerateFullChapterInput = z.infer<typeof GenerateFullChapterInputSchema>;

const GenerateFullChapterOutputSchema = z.object({
  chapterContent: z.string().describe('The fully generated content for the entire chapter, formatted with section delimiters.'),
});
export type GenerateFullChapterOutput = z.infer<typeof GenerateFullChapterOutputSchema>;

export async function generateFullChapter(input: GenerateFullChapterInput): Promise<GenerateFullChapterOutput> {
  return generateFullChapterFlow(input);
}

const generateChapterPrompt = ai.definePrompt({
    name: 'generateFullChapterPrompt',
    input: { schema: GenerateFullChapterInputSchema },
    output: { schema: GenerateFullChapterOutputSchema },
    prompt: `You are an expert ghostwriter commanded to write a complete, high-quality book chapter in {{{language}}}.

**CONTEXT:**
- Book Title: {{{bookTitle}}}
- Chapter to Write: {{{chapterTitle}}}
- Full Book Outline: {{{fullOutline}}}
{{#if storytellingFramework}}- Storytelling Framework: {{{storytellingFramework}}}{{/if}}
{{#if styleProfile}}
- **ADHERE TO WRITING STYLE (NON-NEGOTIABLE):** You MUST adopt the following writing style. This includes matching the tone, voice, vocabulary, sentence structure, and any code-mixing described.
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

**CRITICAL TASK: WRITE THE FULL CHAPTER NOW**

You are commanded to write the entire chapter from start to finish. You MUST follow these structural and content rules precisely.

**NON-NEGOTIABLE STRUCTURE & WORD COUNT:**
1.  **TOTAL WORD COUNT:** The final, complete chapter MUST be **at least 2250 words**.
2.  **SECTION FORMATTING:** You MUST wrap every section title in double dollar signs (e.g., \`$$Section Title$$\`). This is a critical formatting requirement. You MUST include ALL of the section titles provided.
3.  **PARAGRAPHING:** Use short, readable paragraphs (3-5 sentences), and you MUST vary their length for good rhythm. Ensure a double newline (a blank line) exists between every paragraph.

**CHAPTER SECTIONS TO WRITE (ALL ARE REQUIRED):**

{{#each sectionTitles}}
*   **Write the section for: \`$$ {{{this}}} $$\`**
    *   This section MUST be **at least 350-450 words**.
    *   Ensure the content is detailed, insightful, and directly addresses the section title.
{{/each}}


**FINAL INSTRUCTION:**
Return ONLY the complete, fully-formatted chapter content. Do not add any commentary or extra text. You must write a section for every single title provided in the list above. Begin with the first section and end after the last one.
`,
});

const generateFullChapterFlow = ai.defineFlow(
  {
    name: 'generateFullChapterFlow',
    inputSchema: GenerateFullChapterInputSchema,
    outputSchema: GenerateFullChapterOutputSchema,
  },
  async (input) => {
    const { output } = await generateChapterPrompt(input, { apiKey: input.apiKey, model: input.model });

    if (!output || !output.chapterContent) {
        throw new Error("AI failed to generate the full chapter content.");
    }
    
    return {
      chapterContent: output.chapterContent,
    };
  }
);
