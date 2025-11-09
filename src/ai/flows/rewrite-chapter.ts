'use server';

/**
 * @fileOverview This file defines a Genkit flow for rewriting an entire book chapter.
 *
 * The flow uses an AI model to rewrite the provided content while ensuring high quality,
 * adherence to the user's selected style, and maintaining the original structure.
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
});
export type RewriteChapterInput = z.infer<typeof RewriteChapterInputSchema>;

const RewriteChapterOutputSchema = z.object({
  rewrittenContent: z.string().describe('The completely rewritten chapter content, following all original and new instructions.'),
});
export type RewriteChapterOutput = z.infer<typeof RewriteChapterOutputSchema>;

export async function rewriteChapter(input: RewriteChapterInput): Promise<RewriteChapterOutput> {
  return rewriteChapterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'rewriteChapterPrompt',
  input: {schema: RewriteChapterInputSchema},
  output: {schema: RewriteChapterOutputSchema},
  prompt: `You are an expert editor and ghostwriter. Your task is to completely rewrite the provided book chapter.

**CONTEXT:**
- You will be given the full text of a book chapter.
- You will be given a specific writing style to adhere to.

**CRITICAL INSTRUCTIONS: YOU MUST FOLLOW THESE RULES**

1.  **REWRITE, DON'T JUST EDIT:** Do not simply make minor edits. Rewrite sentences, rephrase ideas, and improve the flow and impact of the entire chapter while preserving the original meaning and core concepts.

2.  **MAINTAIN STRUCTURE:** The original chapter uses a specific layout with titles and sub-topics enclosed in double dollar signs (e.g., \`$$Chapter Title$$\`, \`$$Sub-Topic Title$$\`). Your rewritten version MUST preserve this exact structure and formatting. All original \`$$\` enclosed titles must be present in the output.

3.  **ADHERE TO WRITING STYLE:** You MUST adopt the provided writing style. Match its tone, voice, sentence structure, and vocabulary.
    {{#if styleProfile}}
    ---
    **Writing Style Profile:**
    {{{styleProfile}}}
    ---
    {{/if}}

4.  **HUMAN-LIKE PARAGRAPHING:**
    *   Use short paragraphs, typically 3-5 sentences long.
    *   Vary paragraph length for rhythm and readability.
    *   Ensure there are clear gaps (a double newline) between every paragraph.

5.  **RETURN ONLY THE REWRITTEN CONTENT:** Your output should be only the full, rewritten chapter text, following all formatting rules.

**Original Chapter Content to Rewrite:**
\`\`\`
{{{chapterContent}}}
\`\`\`

Now, begin the rewrite.
`,
});

const rewriteChapterFlow = ai.defineFlow(
  {
    name: 'rewriteChapterFlow',
    inputSchema: RewriteChapterInputSchema,
    outputSchema: RewriteChapterOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
