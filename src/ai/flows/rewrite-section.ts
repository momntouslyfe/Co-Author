
'use server';

/**
 * @fileOverview This file defines a Genkit flow for rewriting a single section of a book chapter.
 *
 * @exported rewriteSection - A function that rewrites the provided text content.
 * @exported RewriteSectionInput - The input type for the rewriteSection function.
 * @exported RewriteSectionOutput - The return type for the rewriteSection function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RewriteSectionInputSchema = z.object({
  sectionContent: z.string().describe('The content of the chapter section to be rewritten.'),
  chapterContent: z.string().optional().describe('The full content of the chapter for context, used when rewriting summary sections like Action Steps.'),
  styleProfile: z.string().optional().describe('An optional, pre-existing writing style profile to guide the tone and voice.'),
  researchProfile: z.string().optional().describe('An optional, pre-existing AI research profile providing context on the target audience and their pain points.'),
  storytellingFramework: z.string().optional().describe('The storytelling framework for the book (e.g., The Hero\'s Journey).'),
  language: z.string().describe('The language the chapter should be rewritten in.'),
  instruction: z.string().optional().describe('A specific instruction from the user on how to rewrite the content.'),
});
export type RewriteSectionInput = z.infer<typeof RewriteSectionInputSchema>;

const RewriteSectionOutputSchema = z.object({
  rewrittenSection: z.string().describe('The completely rewritten section content, following all original and new instructions.'),
});
export type RewriteSectionOutput = z.infer<typeof RewriteSectionOutputSchema>;


export const rewriteSectionPrompt = ai.definePrompt({
    name: 'rewriteSectionPrompt',
    input: { schema: RewriteSectionInputSchema },
    output: { schema: RewriteSectionOutputSchema },
    prompt: `You are an expert editor and ghostwriter. Your task is to rewrite the provided text section in the specified language, using the provided context and instructions.

**CONTEXT:**
{{#if storytellingFramework}}- Storytelling Framework: {{{storytellingFramework}}}{{/if}}
{{#if researchProfile}}
- Research Profile: Tailor the content to the audience's pain points and interests based on this research:
  ---
  {{{researchProfile}}}
  ---
{{/if}}

{{#if chapterContent}}
- **Full Chapter Content for Context:** When rewriting a summary section (like an action step or "coming up next"), you MUST use the full chapter content below to inform your response. Your goal is to accurately summarize or tease the content of the provided chapter.
  ---
  {{{chapterContent}}}
  ---
{{/if}}

**CRITICAL INSTRUCTIONS:**

1.  **USER'S INSTRUCTION:** Your primary goal is to follow the user's instruction.
    {{#if instruction}}
    {{{instruction}}}
    {{else}}
    Your instruction is to rewrite the section to improve clarity, flow, and impact.
    {{/if}}

2.  **LANGUAGE:** You MUST write the entire response in **{{{language}}}**.

3.  **REWRITE, DON'T JUST EDIT:** Do not simply make minor edits. Substantially rewrite sentences, rephrase ideas, and improve the flow and impact of the entire section while preserving the original meaning and core concepts.

4.  **HUMAN-LIKE PARAGRAPHING:**
    *   Use short paragraphs, typically 3-5 sentences long.
    *   You MUST vary paragraph length for rhythm and readability.
    *   Ensure there are clear gaps (a double newline) between every paragraph.

{{#if styleProfile}}
5.  **ADHERE TO WRITING STYLE:** You MUST adopt the following writing style:
    ---
    **Writing Style Profile:**
    {{{styleProfile}}}
    ---
{{/if}}

6.  **RETURN ONLY THE REWRITTEN CONTENT:** Your output should be only the rewritten section text. Do not add any titles or extra formatting like \`$$...$$\`.

**Original Section Content to Rewrite:**
\`\`\`
{{{sectionContent}}}
\`\`\`
`,
});

export async function rewriteSection(input: RewriteSectionInput): Promise<RewriteSectionOutput> {
  return rewriteSectionFlow(input);
}


const rewriteSectionFlow = ai.defineFlow(
  {
    name: 'rewriteSectionFlow',
    inputSchema: RewriteSectionInputSchema,
    outputSchema: RewriteSectionOutputSchema,
  },
  async (input) => {
    const { output } = await rewriteSectionPrompt(input);
    if (!output) {
        throw new Error("AI failed to rewrite the section.");
    }
    return output;
  }
);



    