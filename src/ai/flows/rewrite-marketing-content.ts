'use server';

import { z } from 'genkit';
import { getGenkitInstanceForFunction } from '@/lib/genkit-admin';
import { trackAIUsage, preflightCheckWordCredits } from '@/lib/credit-tracker';

const RewriteMarketingContentInputSchema = z.object({
  userId: z.string().describe('The user ID for API key retrieval.'),
  idToken: z.string().describe('Firebase ID token for authentication verification.'),
  content: z.string().describe('The content to rewrite.'),
  language: z.string().describe('The language for the content.'),
  bookTitle: z.string().optional().describe('The title of the book for context.'),
  styleProfile: z.string().optional().describe('Optional style profile for writing style.'),
  customInstructions: z.string().optional().describe('Custom instructions for the rewrite.'),
  model: z.string().optional().describe('The generative AI model to use.'),
});

export type RewriteMarketingContentInput = z.infer<typeof RewriteMarketingContentInputSchema>;

const RewriteMarketingContentOutputSchema = z.object({
  content: z.string().describe('The rewritten marketing content.'),
  wordCount: z.number().describe('The word count of the rewritten content.'),
});

export type RewriteMarketingContentOutput = z.infer<typeof RewriteMarketingContentOutputSchema>;

export async function rewriteMarketingContent(
  input: RewriteMarketingContentInput
): Promise<RewriteMarketingContentOutput> {
  const estimatedWords = input.content.split(/\s+/).length;
  await preflightCheckWordCredits(input.userId, estimatedWords);

  const { ai, model: routedModel } = await getGenkitInstanceForFunction('rewrite', input.userId, input.idToken);

  try {
    const prompt = ai.definePrompt({
      name: 'rewriteMarketingContent',
      input: { schema: RewriteMarketingContentInputSchema },
      output: { schema: RewriteMarketingContentOutputSchema },
      prompt: `You are an expert content editor and marketing specialist. Your task is to rewrite and improve marketing content while maintaining its core message and purpose.

{{#if bookTitle}}
**Book Context:** {{{bookTitle}}}
{{/if}}

**Language:** {{{language}}}

{{#if styleProfile}}
**Writing Style Analysis (MIMIC THE PATTERN ONLY - DO NOT COPY CONTENT):**

CRITICAL: You must ONLY mimic the WRITING PATTERNS described below (tone, voice, sentence structure, vocabulary, pacing). DO NOT copy any content, examples, or phrases from this analysis.

{{{styleProfile}}}

**HOW TO USE THIS STYLE ANALYSIS:**
- Study the Tone & Mood → Write with the same emotional approach
- Study the Voice → Match the narrative perspective and personality
- Study Sentence Structure → Use similar sentence lengths and patterns
- Study Vocabulary & Diction → Use the same level of formality
- Study Code-Mixing patterns (if any) → Replicate the same language blending approach

**CODE-MIXING INTEGRITY (IF APPLICABLE):**
If the style analysis shows code-mixing (mixing languages):
1. Use mixed-language words NATURALLY without explanation
2. NEVER add parenthetical translations like "প্রমোশন (promotion)" - just write "প্রমোশন"
3. NEVER add brackets or English explanations after non-English words
4. Blend languages seamlessly as a native speaker would
5. Match the exact frequency and pattern of language mixing

WRONG: "আপনার বিজনেস (business) এর জন্য মার্কেটিং (marketing) স্ট্রাটেজি (strategy)"
CORRECT: "আপনার বিজনেস এর জন্য মার্কেটিং স্ট্রাটেজি"
{{/if}}

{{#if customInstructions}}
**CUSTOM INSTRUCTIONS (IMPORTANT - Follow these closely):**
{{{customInstructions}}}
{{/if}}

---

**CONTENT TO REWRITE:**
{{{content}}}

---

**YOUR TASK:**
Rewrite the above content to improve its quality, clarity, and marketing effectiveness.

**REQUIREMENTS:**
1. Maintain the same approximate length (within 15% of original).
2. Keep the core message and key points intact.
3. Improve readability, flow, and engagement.
4. Enhance marketing appeal and persuasiveness.
5. Write in {{{language}}}.
6. If a style profile is provided, match that writing style EXACTLY - including any code-mixing patterns (mixing of languages), vocabulary choices, sentence structures, and tone.
7. If custom instructions are provided, follow them closely.
8. CRITICAL: If the style profile shows code-mixing (e.g., English with Bengali/Hindi words), you MUST incorporate the same language mixing pattern throughout your rewritten content.

**IMPROVEMENTS TO MAKE:**
- Better hook and opening
- Clearer structure and transitions
- More engaging language
- Stronger calls-to-action (if applicable)
- More compelling value propositions
- Better rhythm and pacing

**CRITICAL STRUCTURE REQUIREMENTS:**
You MUST format the output with proper structure:
1. Use multiple paragraphs - NEVER return a single long paragraph.
2. Each paragraph should be 2-5 sentences maximum (varied lengths for rhythm).
3. Separate paragraphs with blank lines (double newlines).
4. Use markdown headings (## or ###) to organize sections if the content is substantial.
5. Use bullet points or numbered lists where appropriate for clarity.
6. Vary paragraph lengths - mix short punchy paragraphs with medium ones for better flow.
7. Start with a compelling hook paragraph (1-2 sentences max).
8. End with a strong closing paragraph.

**OUTPUT FORMAT:**
Return the final content using markdown formatting with blank lines between paragraphs. Do NOT collapse everything into a single block of text.

Provide the complete rewritten content.`,
    });

    const { output } = await prompt(input, { model: input.model || routedModel });

    if (!output || !output.content) {
      throw new Error('Failed to rewrite content. Please try again.');
    }

    await trackAIUsage(
      input.userId,
      output.content,
      'rewriteMarketingContent',
      { bookTitle: input.bookTitle || 'Unknown' }
    );

    return output;
  } catch (error: any) {
    console.error('Error rewriting marketing content:', error);

    if (error.message?.includes('503') || error.message?.includes('overloaded')) {
      throw new Error('The AI service is currently overloaded. Please wait a moment and try again.');
    }

    if (error.message?.includes('401') || error.message?.includes('Unauthorized') || error.message?.includes('API key')) {
      throw new Error('Your API key appears to be invalid or expired. Please check your API key in Settings.');
    }

    if (error.message?.includes('429') || error.message?.includes('quota')) {
      throw new Error('You have exceeded your API quota. Please check your usage limits or try again later.');
    }

    throw new Error(error.message || 'An unexpected error occurred while rewriting content. Please try again.');
  }
}
