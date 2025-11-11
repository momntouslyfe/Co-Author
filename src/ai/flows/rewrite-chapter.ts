
'use server';

/**
 * @fileOverview This file defines a Genkit flow for rewriting an entire book chapter.
 *
 * This flow now uses a robust, single-call approach. It passes the entire chapter
 * content to the AI at once and instructs it to rewrite the whole text while preserving
 * the structural $$...$$ markers. This is more reliable and efficient.
 *
 * @exported rewriteChapter - A function that rewrites the provided chapter content using AI.
 * @exported RewriteChapterInput - The input type for the rewriteChapter function.
 * @exported RewriteChapterOutput - The return type for the rewriteChapter function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { ModelReference } from 'genkit/ai';

const RewriteChapterInputSchema = z.object({
  chapterContent: z.string().describe('The full content of the chapter to be rewritten.'),
  styleProfile: z.string().optional().describe('An optional, pre-existing writing style profile to guide the tone and voice.'),
  researchProfile: z.string().optional().describe('An optional, pre-existing AI research profile providing context on the target audience and their pain points.'),
  storytellingFramework: z.string().optional().describe('The storytelling framework for the book (e.g., The Hero\'s Journey).'),
  language: z.string().describe('The language the chapter should be rewritten in.'),
  instruction: z.string().optional().describe('A specific instruction from the user on how to rewrite the chapter.'),
  apiKey: z.string().optional().describe('The API key for the generative AI model.'),
  model: z.custom<ModelReference<any>>().optional().describe('The generative AI model to use.'),
});
export type RewriteChapterInput = z.infer<typeof RewriteChapterInputSchema>;

const RewriteChapterOutputSchema = z.object({
  rewrittenContent: z.string().describe('The completely rewritten chapter content, following all original and new instructions.'),
});
export type RewriteChapterOutput = z.infer<typeof RewriteChapterOutputSchema>;


const rewriteChapterPrompt = ai.definePrompt({
    name: 'rewriteChapterPrompt',
    input: { schema: RewriteChapterInputSchema },
    output: { schema: RewriteChapterOutputSchema },
    prompt: `You are an expert editor and ghostwriter. Your task is to rewrite the provided book chapter in its entirety, in the specified language, using the provided context and instructions. You MUST return the complete, rewritten chapter in a single response.

**CONTEXT:**
{{#if storytellingFramework}}- Storytelling Framework: {{{storytellingFramework}}}{{/if}}
{{#if researchProfile}}
- Research Profile: Tailor the content to the audience's pain points and interests based on this research:
  ---
  {{{researchProfile}}}
  ---
{{/if}}

**CRITICAL INSTRUCTIONS:**

1.  **USER'S INSTRUCTION:** Your primary goal is to follow this instruction.
    {{#if instruction}}
    {{{instruction}}}
    {{else}}
    Your instruction is to rewrite the chapter to improve clarity, flow, and impact.
    {{/if}}

2.  **SINGLE, COMPLETE OUTPUT:** You MUST rewrite and return the entire chapter in one single operation. Do not stop prematurely. Partial responses are a failure.

3.  **LANGUAGE:** You MUST write the entire response in **{{{language}}}**.

4.  **PRESERVE STRUCTURE:** The chapter is divided into sections with titles like \`$$Section Title$$\`. You MUST preserve these section titles and their surrounding double dollar signs exactly as they are. Rewrite the content *within* each section, but do not alter the titles or remove the \`$$\` markers.

5.  **REWRITE, DON'T JUST EDIT:** Do not simply make minor edits. Substantially rewrite sentences, rephrase ideas, and improve the flow and impact of the entire chapter while preserving the original meaning and core concepts.

6.  **HUMAN-LIKE PARAGRAPHING (NON-NEGOTIABLE):** Use short, readable paragraphs (3-5 sentences), but you MUST VARY their length for good rhythm. Ensure a double newline (a blank line) exists between every paragraph and section.

{{#if styleProfile}}
7.  **ADHERE TO WRITING STYLE (NON-NEGOTIABLE):** You MUST adopt the following writing style. This includes matching the tone, voice, vocabulary, sentence structure, and especially any code-mixing (use of multiple languages, e.g., 'আপনার 'ফ্রিল্যান্সিং' 'ক্যারিয়ারের'-এর জন্য এটা খুব ইম্পরট্যান্ট') described.
    ---
    **Writing Style Profile:**
    {{{styleProfile}}}
    ---
{{/if}}

8.  **RETURN ONLY THE REWRITTEN CONTENT:** Your output should be only the rewritten chapter text. Do not add any extra commentary or apologies.

**Original Chapter Content to Rewrite:**
\`\`\`
{{{chapterContent}}}
\`\`\`

Proceed to rewrite the entire chapter now. You must not stop until all sections are complete.
`,
});

export async function rewriteChapter(input: RewriteChapterInput): Promise<RewriteChapterOutput> {
  return rewriteChapterFlow(input);
}


const rewriteChapterFlow = ai.defineFlow(
  {
    name: 'rewriteChapterFlow',
    inputSchema: RewriteChapterInputSchema,
    outputSchema: RewriteChapterOutputSchema,
  },
  async (input) => {
    // Call the single, powerful prompt to rewrite the entire chapter at once.
    const { output } = await rewriteChapterPrompt(input, { apiKey: input.apiKey, ...(input.model && { model: input.model }) });

    if (!output || !output.rewrittenContent) {
        throw new Error("AI failed to rewrite the chapter content.");
    }
    
    return {
        rewrittenContent: output.rewrittenContent,
    };
  }
);
