'use server';

/**
 * @fileOverview This file defines a Genkit flow for rewriting a single section of a book chapter.
 *
 * @exported rewriteSection - A function that rewrites the provided text content.
 * @exported RewriteSectionInput - The input type for the rewriteSection function.
 * @exported RewriteSectionOutput - The return type for the rewriteSection function.
 */

import {z} from 'genkit';

import { getGenkitInstanceForFunction } from '@/lib/genkit-admin';
import { trackAIUsage, preflightCheckWordCredits } from '@/lib/credit-tracker';
import { withAIErrorHandling } from '@/lib/ai-error-handler';

const RewriteSectionInputSchema = z.object({
  userId: z.string().describe('The user ID for API key retrieval.'),
  idToken: z.string().describe('Firebase ID token for authentication verification.'),
  sectionContent: z.string().describe('The content of the chapter section to be rewritten.'),
  chapterContent: z.string().optional().describe('The full content of the chapter for context, used when rewriting summary sections like Action Steps.'),
  styleProfile: z.string().optional().describe('An optional, pre-existing writing style profile to guide the tone and voice.'),
  researchProfile: z.string().optional().describe('An optional, pre-existing AI research profile providing context on the target audience and their pain points.'),
  storytellingFramework: z.string().optional().describe('The storytelling framework for the book (e.g., The Hero\'s Journey).'),
  language: z.string().describe('The language the chapter should be rewritten in.'),
  instruction: z.string().optional().describe('A specific instruction from the user on how to rewrite the content.'),
  model: z.string().optional().describe('The generative AI model to use.'),
});
export type RewriteSectionInput = z.infer<typeof RewriteSectionInputSchema>;

const RewriteSectionOutputSchema = z.object({
  rewrittenSection: z.string().describe('The completely rewritten section content, following all original and new instructions.'),
});
export type RewriteSectionOutput = z.infer<typeof RewriteSectionOutputSchema>;

export async function rewriteSection(input: RewriteSectionInput): Promise<RewriteSectionOutput> {
  return withAIErrorHandling(async () => {
    await preflightCheckWordCredits(input.userId, 400);
    
    const { ai, model: routedModel } = await getGenkitInstanceForFunction('rewrite', input.userId, input.idToken);
    
    const rewriteSectionPrompt = ai.definePrompt({
    name: 'rewriteSectionPrompt',
    input: { schema: RewriteSectionInputSchema },
    output: { schema: RewriteSectionOutputSchema },
    prompt: `You are an expert editor and ghostwriter. Your task is to rewrite the provided text section in the specified language, using the provided context and instructions.

**CONTEXT:**
{{#if storytellingFramework}}- Storytelling Framework: {{{storytellingFramework}}}{{/if}}
{{#if researchProfile}}
- **RESEARCH PROFILE (Optional Enhancement):** Use this research to enhance credibility when relevant. If the research contains data, studies, or insights that strengthen specific points in the rewritten content, incorporate them naturally. Don't force research citations if they don't fit the rewrite context or if the research lacks relevant data.
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

2.  **LANGUAGE & CODE-MIXING (CRITICAL - FOLLOW EXACTLY):** Write primarily in **{{{language}}}**. If the style profile includes code-mixing patterns, you MUST replicate those patterns EXACTLY.
    
    **ABSOLUTELY FORBIDDEN - NEVER DO THIS:**
    - NEVER add English translations in parentheses after any word
    - NEVER write English words in English script - always transliterate them
    - WRONG: "ম্যানিপুলেশনের (manipulation)" - DO NOT add translations
    - WRONG: "এই ছোট ছোট Violation গুলোকে" - DO NOT use English script
    
    **CORRECT CODE-MIXING PATTERNS (DO THIS):**
    - Transliterate ALL English-origin words into the target language script
    - CORRECT: "এটা একটা টক্সিক সাইকেলের মতো" (not "Toxic Cycle")
    - CORRECT: "এই ছোট ছোট ভায়োলেশন গুলোকে" (not "Violation")
    - CORRECT: "গ্র্যাজুয়াল প্রসেস" (not "Gradual process")
    
    **REMEMBER:** Code-mixing means naturally blending transliterated words, NOT using English script or providing translations.

3.  **REWRITE, DON'T JUST EDIT (NON-NEGOTIABLE):** You are not an editor making minor changes. Your task is to **completely rewrite** the text from scratch. Do not simply copy or slightly rephrase sentences. You MUST produce a new version of the text that conveys the same core ideas but with entirely new sentence structures, vocabulary, and flow. Preserving the original meaning is key, but preserving the original text is a failure.

4.  **HUMAN-LIKE PARAGRAPHING (NON-NEGOTIABLE):** Use short, readable paragraphs (3-5 sentences), but you MUST VARY their length for good rhythm. Ensure a double newline (a blank line) exists between every paragraph.

{{#if styleProfile}}
5.  **WRITING STYLE GUIDE (CRITICAL - MUST FOLLOW):** Below is a detailed analysis of the author's unique writing style, including concrete examples that demonstrate each characteristic. Your task is to MIMIC these stylistic patterns while rewriting the content.
    
    **HOW TO USE THIS STYLE GUIDE:**
    - **Study the examples** - Each example shows a specific stylistic pattern (tone, voice, sentence structure, vocabulary, code-mixing, etc.)
    - **Apply the PATTERNS** - Replicate the STYLE demonstrated by these examples
    - **Match ALL characteristics** - Pay close attention to tone, voice, sentence structure, vocabulary level, code-mixing patterns (if applicable), and distinctive techniques
    
    **STYLE PROFILE WITH EXAMPLES:**
    ---
    {{{styleProfile}}}
    ---
    
    **REMEMBER:** The examples show HOW to write. Copy the STYLE and PATTERNS, not the specific content or topics.
{{/if}}

6.  **RETURN ONLY THE REWRITTEN CONTENT:** Your output should be only the rewritten section text. Do not add any titles or extra formatting like \`$$...$$\`.

**Original Section Content to Rewrite:**
\`\`\`
{{{sectionContent}}}
\`\`\`
`,
  });
  
  const { output } = await rewriteSectionPrompt(input, { model: input.model || routedModel });
  if (!output) {
    throw new Error("AI failed to rewrite the section.");
  }
  
    await trackAIUsage(
      input.userId,
      output.rewrittenSection,
      'rewriteSection',
      {}
    );
    
    return output;
  }, 'section rewriting');
}
