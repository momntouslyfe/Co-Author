
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
  chapterContent: z.string().describe('The fully generated content of the book chapter, following the specific layout and formatting rules.'),
});
export type GenerateChapterContentOutput = z.infer<typeof GenerateChapterContentOutputSchema>;

export async function generateChapterContent(input: GenerateChapterContentInput): Promise<GenerateChapterContentOutput> {
  return generateChapterContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateChapterContentPrompt',
  input: {schema: GenerateChapterContentInputSchema},
  output: {schema: GenerateChapterContentOutputSchema},
  prompt: `You are an expert ghostwriter tasked with writing a single, comprehensive, high-quality book chapter in {{{bookLanguage}}}.

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

**CRITICAL MANDATES: YOU MUST FOLLOW THESE RULES**

1.  **HUMAN-LIKE WRITING:**
    *   **Paragraphs:** Use short paragraphs, typically 3-5 sentences long. You MUST vary paragraph length for rhythm and readability.
    *   **Clarity:** Ensure there are clear gaps (a double newline) between every paragraph.
    *   **No AI Filler:** Avoid generic phrases, repetition, and overly complex sentences. Write with clarity and impact.

2.  **LAYOUT STRUCTURE:** You MUST follow this exact layout. Do NOT deviate.
    *   **Chapter Title:** Start with the chapter title, enclosed in double dollar signs (e.g., \`$$Chapter Title$$\`).
    *   **Introduction:** Write a short, engaging introduction (2-3 sentences).
    *   **Sub-Topics:** For each sub-topic, first write the sub-topic title enclosed in double dollar signs (e.g., \`$$Sub-Topic Title$$\`). Then, write the full text for that sub-topic, following all the human-like writing rules.
    *   **Action Step:** After all sub-topics, add a summary section starting with the exact heading: \`Your Action Step:\` (This heading must NOT have $$).
    *   **Teaser:** End with a teaser for the next chapter, starting with the exact heading: \`Coming Up Next:\` (This heading must NOT have $$).

**EXAMPLE OF THE REQUIRED OUTPUT FORMAT:**

$$The Hero's First Test$$

This is where the adventure truly begins. The hero must now face a challenge that will push them beyond their limits, a first taste of the real dangers that lie ahead.

$$Confronting the Guardian$$

The path was blocked by an ancient golem, its stone eyes glowing with an eerie light. It was a creature of legend, said to be unbeatable. The hero, remembering the mentor's words about courage, took a deep breath and drew their weapon. The air crackled with anticipation.

The first clash of steel on stone sent sparks flying. The golem was slow but immensely powerful, each blow shaking the very ground. The hero had to be nimble, dodging and weaving, looking for a weakness in the ancient armor.

$$Discovering a Hidden Strength$$

It was during a desperate parry that the hero's locket, a simple keepsake from their mother, began to glow. A wave of warmth and forgotten energy flowed through them. They hadn't just inherited a trinket; they had inherited a legacy of power.

Your Action Step:
Reflect on a time you faced a seemingly insurmountable obstacle. What hidden strength or forgotten piece of advice did you rely on to overcome it? Acknowledge that you often have more resources at your disposal than you realize.

Coming Up Next:
Victory is sweet, but it attracts unwanted attention. In the next chapter, we'll see how the hero's newfound power puts them on the radar of a much more sinister foe.

---

Now, write the full and complete chapter for '{{{chapterTitle}}}' following all instructions precisely and without fail.`,
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
