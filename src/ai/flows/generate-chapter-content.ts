
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating the content of a book chapter.
 *
 * The flow takes a chapter title, a list of sub-topics, and an optional writing style profile
 * to generate a well-structured and coherent chapter.
 *
 * @exported generateChapterContent - A function that generates the chapter content.
 * @exported GenerateChapterContentInput - The input type for the function.
 * @exported GenerateChapterContentOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateChapterContentInputSchema = z.object({
  bookTitle: z.string().describe("The main title of the book."),
  bookTopic: z.string().describe("The core topic or idea of the book."),
  bookLanguage: z.string().describe("The language the chapter should be written in."),
  fullOutline: z.string().describe("The entire book outline to provide context for the current chapter."),
  chapterTitle: z.string().describe('The title of the chapter to be written.'),
  subTopics: z.array(z.string()).describe('A list of key points or sub-topics to be covered in the chapter.'),
  researchProfile: z.string().optional().describe('An optional, pre-existing AI research profile providing context on the target audience and their pain points.'),
  styleProfile: z.string().optional().describe('An optional, pre-existing writing style profile to guide the tone and voice.'),
});
export type GenerateChapterContentInput = z.infer<typeof GenerateChapterContentInputSchema>;

const GenerateChapterContentOutputSchema = z.object({
  chapterContent: z.string().describe('The fully generated content of the book chapter.'),
});
export type GenerateChapterContentOutput = z.infer<typeof GenerateChapterContentOutputSchema>;

export async function generateChapterContent(input: GenerateChapterContentInput): Promise<GenerateChapterContentOutput> {
  return generateChapterContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateChapterContentPrompt',
  input: {schema: GenerateChapterContentInputSchema},
  output: {schema: GenerateChapterContentOutputSchema},
  prompt: `You are an expert ghostwriter tasked with writing a single book chapter in {{{bookLanguage}}}.

**OVERALL BOOK CONTEXT:**
- Book Title: {{{bookTitle}}}
- Core Idea: {{{bookTopic}}}
- Full Outline:
{{{fullOutline}}}

{{#if researchProfile}}
**AUDIENCE & RESEARCH CONTEXT:**
You MUST use this research to inform your writing. Tailor the content to the audience's pain points and interests.
---
{{{researchProfile}}}
---
{{/if}}

{{#if styleProfile}}
**CRITICAL: WRITING STYLE GUIDELINES**
You MUST adhere strictly to the following writing style. Adopt its tone, voice, sentence structure, and vocabulary.
---
{{{styleProfile}}}
---
{{/if}}

**YOUR CURRENT TASK: WRITE THIS CHAPTER**
- Chapter Title: {{{chapterTitle}}}
- Key Talking Points to Cover:
{{#each subTopics}}
  - {{{this}}}
{{/each}}

**INSTRUCTIONS:**
1.  **Write the Full Chapter:** Write a complete, engaging, and well-structured book chapter based on the title and talking points provided.
2.  **Stay in Context:** Ensure this chapter logically follows the previous chapters and sets up for the next ones, based on the full outline.
3.  **Be Comprehensive:** Start with a strong introduction that grabs the reader's attention. Elaborate on each sub-topic in a smooth and logical flow. Conclude the chapter effectively, summarizing key takeaways or creating a hook for the next chapter.
4.  **Raw Content Only:** Do NOT include the chapter title (e.g., "### Chapter 1: ...") in your output. Return only the raw, ready-to-use chapter content itself, with no introductory or concluding remarks from you, the AI.
`,
});

const generateChapterContentFlow = ai.defineFlow(
  {
    name: 'generateChapterContentFlow',
    inputSchema: GenerateChapterContentInputSchema,
    outputSchema: GenerateChapterContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
