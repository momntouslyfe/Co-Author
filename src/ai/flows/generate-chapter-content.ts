
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating the content of a book chapter.
 *
 * This flow now uses a single, robust prompt to generate the entire chapter content
 * in one API call. This approach is more efficient and avoids rate-limiting issues
 * by instructing the AI to handle the full structure internally.
 *
 * @exported generateChapterContent - A function that generates the chapter content.
 * @exported GenerateChapterContentInput - The input type for the function.
 * @exported GenerateChapterContentOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateChapterContentInputSchema = z.object({
  bookTitle: z.string().describe('The main title of the book.'),
  bookTopic: z.string().describe('The core topic or idea of the book.'),
  bookLanguage: z.string().describe('The language the chapter should be written in.'),
  fullOutline: z.string().describe('The entire book outline to provide context for the current chapter.'),
  chapterTitle: z.string().describe('The title of the chapter to be written.'),
  subTopics: z.array(z.string()).describe('A list of key points or sub-topics to be covered in the chapter.'),
  storytellingFramework: z.string().optional().describe('The storytelling framework for the book (e.g., The Hero\'s Journey).'),
  researchProfile: z.string().optional().describe('An optional, pre-existing AI research profile providing context on the target audience and their pain points.'),
  styleProfile: z.string().optional().describe('An optional, pre-existing writing style profile to guide the tone and voice.'),
});
export type GenerateChapterContentInput = z.infer<typeof GenerateChapterContentInputSchema>;

const GenerateChapterContentOutputSchema = z.object({
  chapterContent: z.string().describe('The fully generated content of the book chapter, following the specific layout and formatting rules.'),
});
export type GenerateChapterContentOutput = z.infer<typeof GenerateChapterContentOutputSchema>;


const generateFullChapterPrompt = ai.definePrompt({
    name: 'generateFullChapterPrompt',
    input: { schema: GenerateChapterContentInputSchema },
    output: { schema: GenerateChapterContentOutputSchema },
    prompt: `You are an expert ghostwriter tasked with writing a complete book chapter in {{{bookLanguage}}}.

**CONTEXT:**
- Book Title: {{{bookTitle}}}
- Book Topic: {{{bookTopic}}}
- Full Book Outline: {{{fullOutline}}}
- Chapter to Write: {{{chapterTitle}}}
{{#if storytellingFramework}}- Storytelling Framework: {{{storytellingFramework}}}{{/if}}
{{#if styleProfile}}
- **Writing Style Profile (CRITICAL):** You MUST strictly adhere to the following writing style. This includes matching the tone, voice, vocabulary, sentence structure, and especially any code-mixing (use of multiple languages) described. For example, a Bangla-English mix like 'আপনার 'ফ্রিল্যান্সিং' 'ক্যারিয়ারের'-এর জন্য এটা খুব ইম্পরট্যান্ট' should be replicated if the style profile indicates it.
  ---
  {{{styleProfile}}}
  ---
{{/if}}
{{#if researchProfile}}
- **Audience Research Profile (CRITICAL):**
  ---
  {{{researchProfile}}}
  ---
{{/if}}

**YOUR TASK:**
Write the **ENTIRE chapter content from start to finish as a single, complete block of text**. You MUST follow all instructions below precisely. Any deviation or incomplete response is a failure.

**CRITICAL STRUCTURE & FORMATTING RULES:**
1.  **WORD COUNT (NON-NEGOTIABLE):** The total word count for the entire chapter MUST be **AT LEAST 2250 words**. To achieve this, you MUST write a comprehensive section for each sub-topic. Failure to meet this word count is a failure of the entire task.
2.  **SINGLE OUTPUT:** You MUST generate the entire chapter in one single response. Do not stop. Do not output anything other than the chapter content.
3.  **Chapter Title:** Start with the chapter title, enclosed in double dollar signs. Example: \`$$My Chapter Title$$\`
4.  **Introduction:** After the title, write a short, engaging introduction (2-3 sentences) for the chapter.
5.  **Sub-Topic Sections:**
    *   For EACH sub-topic in the list below, you MUST create a section.
    *   Start each section with the sub-topic title enclosed in double dollar signs. Example: \`$$My Sub-Topic Title$$\`
    *   Write a substantial and comprehensive amount of content for each sub-topic to ensure the total chapter length reaches at least 2250 words.
6.  **Action Step:** After all sub-topic sections, create a section titled \`$$Your Action Step$$\`. Write a single, practical action step (2-3 sentences) for the reader based on the chapter's content.
7.  **Teaser:** After the action step, create a section titled \`$$Coming Up Next$$\`. Based on the "Full Book Outline", identify the chapter immediately following "{{{chapterTitle}}}" and write a compelling 1-2 sentence teaser that creates anticipation for that specific next chapter's content.
8.  **Paragraphs & Spacing:**
    *   Use short, human-like paragraphs (3-5 sentences), but VARY their length for rhythm.
    *   Crucially, there MUST be a double newline (a blank line) between every paragraph and between every \`$$...$$\` section.
    *   After each \`$$...$$\` title (including Action Step and Coming Up Next), you MUST write the corresponding content on a new line after a double newline.


**SUB-TOPICS TO COVER:**
{{#each subTopics}}
- {{{this}}}
{{/each}}

Proceed to write the full chapter now. You must not stop until all sections are complete and the word count of at least 2250 words is met.
`,
});


export async function generateChapterContent(input: GenerateChapterContentInput): Promise<GenerateChapterContentOutput> {
  return generateChapterContentFlow(input);
}


const generateChapterContentFlow = ai.defineFlow(
  {
    name: 'generateChapterContentFlow',
    inputSchema: GenerateChapterContentInputSchema,
    outputSchema: GenerateChapterContentOutputSchema,
  },
  async (input) => {
    // Call the single, powerful prompt to generate everything at once.
    const { output } = await generateFullChapterPrompt(input);

    if (!output || !output.chapterContent) {
        throw new Error("AI failed to generate the full chapter content.");
    }

    return {
      chapterContent: output.chapterContent,
    };
  }
);

    