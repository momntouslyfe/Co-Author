'use server';

import { z } from 'genkit';
import { getGenkitInstanceForFunction } from '@/lib/genkit-admin';
import { trackAIUsage, preflightCheckWordCredits } from '@/lib/credit-tracker';

const ExpandMarketingContentInputSchema = z.object({
  userId: z.string().describe('The user ID for API key retrieval.'),
  idToken: z.string().describe('Firebase ID token for authentication verification.'),
  content: z.string().describe('The content to expand.'),
  language: z.string().describe('The language for the content.'),
  targetWordCount: z.number().describe('Target word count after expansion.'),
  bookTitle: z.string().optional().describe('The title of the book for context.'),
  bookOutline: z.string().optional().describe('The book blueprint for context.'),
  styleProfile: z.string().optional().describe('Optional style profile for writing style.'),
  customInstructions: z.string().optional().describe('Custom instructions for the expansion.'),
  model: z.string().optional().describe('The generative AI model to use.'),
});

export type ExpandMarketingContentInput = z.infer<typeof ExpandMarketingContentInputSchema>;

const ExpandMarketingContentOutputSchema = z.object({
  content: z.string().describe('The expanded marketing content.'),
  wordCount: z.number().describe('The word count of the expanded content.'),
});

export type ExpandMarketingContentOutput = z.infer<typeof ExpandMarketingContentOutputSchema>;

export async function expandMarketingContent(
  input: ExpandMarketingContentInput
): Promise<ExpandMarketingContentOutput> {
  const currentWords = input.content.split(/\s+/).length;
  const additionalWords = Math.max(input.targetWordCount - currentWords, 200);
  await preflightCheckWordCredits(input.userId, additionalWords);

  const { ai, model: routedModel } = await getGenkitInstanceForFunction('expand', input.userId, input.idToken);

  try {
    const prompt = ai.definePrompt({
      name: 'expandMarketingContent',
      input: { schema: ExpandMarketingContentInputSchema },
      output: { schema: ExpandMarketingContentOutputSchema },
      prompt: `You are an expert content writer and marketing specialist. Your task is to expand marketing content with additional valuable information while maintaining quality and coherence.

{{#if bookTitle}}
**Book Context:** {{{bookTitle}}}
{{/if}}

**Language:** {{{language}}}

{{#if bookOutline}}
**Book Blueprint (for additional context):**
{{{bookOutline}}}
{{/if}}

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

**CONTENT TO EXPAND:**
{{{content}}}

---

**TARGET WORD COUNT:** {{{targetWordCount}}} words

**YOUR TASK:**
Expand the above content to approximately {{{targetWordCount}}} words by adding valuable, relevant information.

**REQUIREMENTS:**
1. Reach approximately {{{targetWordCount}}} words (within 10% margin).
2. Maintain the existing content's structure and flow.
3. Add new valuable points, examples, or explanations.
4. Keep the marketing purpose and persuasive elements.
5. Write in {{{language}}}.
6. If a style profile is provided, match that writing style EXACTLY - including any code-mixing patterns (mixing of languages), vocabulary choices, sentence structures, and tone.
7. If custom instructions are provided, follow them closely.
8. CRITICAL: If the style profile shows code-mixing (e.g., English with Bengali/Hindi words), you MUST incorporate the same language mixing pattern throughout your expanded content.

**EXPANSION STRATEGIES:**
- Add more detailed examples or case studies
- Include additional benefits or value propositions
- Elaborate on key points with supporting details
- Add relevant statistics or data points (if appropriate)
- Include more storytelling elements
- Expand on the "why" behind key statements
- Add transitional content for better flow

**IMPORTANT:**
- Do NOT pad with filler or repeat existing content
- Every addition should provide genuine value
- Maintain the same quality level throughout
- Keep the marketing effectiveness intact or improve it

**CRITICAL STRUCTURE REQUIREMENTS:**
You MUST format the output with proper structure:
1. Use multiple paragraphs - NEVER return a single long paragraph or wall of text.
2. Each paragraph should be 2-5 sentences maximum (varied lengths create rhythm).
3. Separate all paragraphs with blank lines (double newlines).
4. Use markdown headings (## or ###) to organize major sections.
5. Use bullet points or numbered lists where appropriate for clarity and scannability.
6. Vary paragraph lengths intentionally - mix short impactful paragraphs (1-2 sentences) with medium ones (3-4 sentences).
7. Break up long explanations into digestible chunks.
8. Use subheadings (###) to introduce new topics or shifts in focus.

**OUTPUT FORMAT:**
Return the final content using markdown formatting:
- Blank lines between every paragraph
- Headings for sections (## for main sections, ### for subsections)
- Lists where they improve readability
- Short, punchy paragraphs for impact
- Never collapse into a single dense block of text

Provide the complete expanded content.`,
    });

    const { output } = await prompt(input, { model: input.model || routedModel });

    if (!output || !output.content) {
      throw new Error('Failed to expand content. Please try again.');
    }

    await trackAIUsage(
      input.userId,
      output.content,
      'expandMarketingContent',
      { bookTitle: input.bookTitle || 'Unknown' }
    );

    return output;
  } catch (error: any) {
    console.error('Error expanding marketing content:', error);

    if (error.message?.includes('503') || error.message?.includes('overloaded')) {
      throw new Error('The AI service is currently overloaded. Please wait a moment and try again.');
    }

    if (error.message?.includes('401') || error.message?.includes('Unauthorized') || error.message?.includes('API key')) {
      throw new Error('Your API key appears to be invalid or expired. Please check your API key in Settings.');
    }

    if (error.message?.includes('429') || error.message?.includes('quota')) {
      throw new Error('You have exceeded your API quota. Please check your usage limits or try again later.');
    }

    throw new Error(error.message || 'An unexpected error occurred while expanding content. Please try again.');
  }
}
