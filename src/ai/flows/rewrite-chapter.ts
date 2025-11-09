
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

const RewriteChapterInputSchema = z.object({
  chapterContent: z.string().describe('The full content of the chapter to be rewritten.'),
  styleProfile: z.string().optional().describe('An optional, pre-existing writing style profile to guide the tone and voice.'),
  researchProfile: z.string().optional().describe('An optional, pre-existing AI research profile providing context on the target audience and their pain points.'),
  storytellingFramework: z.string().optional().describe('The storytelling framework for the book (e.g., The Hero\'s Journey).'),
  language: z.string().describe('The language the chapter should be rewritten in.'),
  instruction: z.string().optional().describe('A specific instruction from the user on how to rewrite the chapter.'),
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
    prompt: `You are an expert editor and ghostwriter. Your task is to rewrite the provided book chapter in its entirety, in the specified language, using the provided context and instructions.

**CONTEXT:**
{{#if storytellingFramework}}- Storytelling Framework: {{{storytellingFramework}}}{{/if}}
{{#if researchProfile}}
- Research Profile: Tailor the content to the audience's pain points and interests based on this research:
  ---
  {{{researchProfile}}}
  ---
{{/if}}

**CRITICAL INSTRUCTIONS:**

1.  **USER'S INSTRUCTION:**
    {{#if instruction}}
    {{{instruction}}}
    {{else}}
    Rewrite the chapter to improve clarity, flow, and impact.
    {{/if}}

2.  **LANGUAGE:** You MUST write the entire response in **{{{language}}}**.

3.  **PRESERVE STRUCTURE:** The chapter is divided into sections with titles like \`$$Section Title$$\`. You MUST preserve these section titles and their surrounding double dollar signs exactly as they are. Rewrite the content *within* each section, but do not alter the titles or remove the \`$$\` markers.

4.  **REWRITE, DON'T JUST EDIT:** Do not simply make minor edits. Substantially rewrite sentences, rephrase ideas, and improve the flow and impact of the entire chapter while preserving the original meaning and core concepts.

5.  **HUMAN-LIKE PARAGRAPHING:**
    *   Use short paragraphs, typically 3-5 sentences long.
    *   You MUST vary paragraph length for rhythm and readability.
    *   Ensure there are clear gaps (a double newline) between every paragraph and section.

{{#if styleProfile}}
6.  **ADHERE TO WRITING STYLE:** You MUST adopt the following writing style:
    ---
    **Writing Style Profile:**
    {{{styleProfile}}}
    ---
{{/if}}

7.  **RETURN ONLY THE REWRITTEN CONTENT:** Your output should be only the rewritten chapter text. Do not add any extra commentary.

**Original Chapter Content to Rewrite:**
\`\`\`
{{{chapterContent}}}
\`\`\`
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
    const { output } = await rewriteChapterPrompt(input);

    if (!output || !output.rewrittenContent) {
        throw new Error("AI failed to rewrite the chapter content.");
    }
    
    return {
        rewrittenContent: output.rewrittenContent,
    };
  }
);
