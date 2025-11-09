
'use server';

/**
 * @fileOverview This file defines a Genkit flow for rewriting an entire book chapter.
 *
 * This flow now uses a more robust, iterative approach. It breaks the chapter
 * into sections, rewrites each one individually, and then reassembles them.
 * This ensures the entire chapter is rewritten reliably, even for long content.
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
  language: z.string().describe('The language the chapter should be rewritten in.'),
});
export type RewriteChapterInput = z.infer<typeof RewriteChapterInputSchema>;

const RewriteChapterOutputSchema = z.object({
  rewrittenContent: z.string().describe('The completely rewritten chapter content, following all original and new instructions.'),
});
export type RewriteChapterOutput = z.infer<typeof RewriteChapterOutputSchema>;


const rewriteSectionPrompt = ai.definePrompt({
    name: 'rewriteSectionPrompt',
    input: {
      schema: z.object({
        sectionContent: z.string(),
        styleProfile: z.string().optional(),
        language: z.string(),
      }),
    },
    output: {
      schema: z.object({
        rewrittenSection: z.string(),
      }),
    },
    prompt: `You are an expert editor and ghostwriter. Your task is to rewrite the provided text section in the specified language.

**CRITICAL INSTRUCTIONS:**

1.  **LANGUAGE:** You MUST write the entire response in **{{{language}}}**.

2.  **REWRITE, DON'T JUST EDIT:** Do not simply make minor edits. Rewrite sentences, rephrase ideas, and improve the flow and impact of the entire section while preserving the original meaning and core concepts.

3.  **HUMAN-LIKE PARAGRAPHING:**
    *   Use short paragraphs, typically 3-5 sentences long.
    *   You MUST vary paragraph length for rhythm and readability.
    *   Ensure there are clear gaps (a double newline) between every paragraph.

{{#if styleProfile}}
4.  **ADHERE TO WRITING STYLE:** You MUST adopt the following writing style:
    ---
    **Writing Style Profile:**
    {{{styleProfile}}}
    ---
{{/if}}

5.  **RETURN ONLY THE REWRITTEN CONTENT:** Your output should be only the rewritten section text. Do not add any titles or extra formatting.

**Original Section Content to Rewrite:**
\`\`\`
{{{sectionContent}}}
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
  async ({ chapterContent, styleProfile, language }) => {
    // Split the chapter into sections based on the $$...$$ titles
    const sections = chapterContent.split(/(\$\$[^$]+\$\$)/g).filter(Boolean);
    
    const rewrittenSections = await Promise.all(
        sections.map(async (section) => {
            const trimmedSection = section.trim();
            // If the section is a title (e.g., $$...$$), keep it as is.
            if (trimmedSection.startsWith('$$') && trimmedSection.endsWith('$$')) {
                return section;
            }
            
            // If the section is actual content, rewrite it.
            if (trimmedSection.length > 0) {
                 const { output } = await rewriteSectionPrompt({
                    sectionContent: trimmedSection,
                    styleProfile: styleProfile,
                    language: language,
                });
                if (!output || !output.rewrittenSection) {
                    console.warn(`Warning: AI failed to rewrite section. Returning original.`);
                    return section; // Return original section on failure
                }
                return output.rewrittenSection;
            }
            
            // Keep empty lines/spaces between sections
            return section;
        })
    );

    return {
      rewrittenContent: rewrittenSections.join(''),
    };
  }
);
