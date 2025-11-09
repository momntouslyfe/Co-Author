
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
  chapterTitle: z.string().describe('The title of the chapter.'),
  subTopics: z.array(z.string()).describe('A list of key points or sub-topics to be covered in the chapter.'),
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
  prompt: `You are an expert ghostwriter tasked with writing a book chapter.

**Chapter Title:** {{{chapterTitle}}}

**Key Talking Points to Cover:**
{{#each subTopics}}
- {{{this}}}
{{/each}}

{{#if styleProfile}}
**CRITICAL: Writing Style Guidelines**
You MUST adhere strictly to the following writing style. Analyze it and adopt its tone, voice, sentence structure, and vocabulary.
---
{{{styleProfile}}}
---
{{/if}}

**Your Task:**
Write a complete, engaging, and well-structured book chapter based on the title and talking points.
-   Start with a strong introduction that grabs the reader's attention.
-   Elaborate on each sub-topic, ensuring a smooth and logical flow between them.
-   Conclude the chapter effectively, summarizing the key takeaways or setting up the next chapter.
-   Do NOT include the chapter title in the body of the content.
-   Return only the raw chapter content, with no introductory or concluding remarks from you, the AI.
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
