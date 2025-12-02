'use server';

import { z } from 'genkit';
import { getGenkitInstanceForFunction } from '@/lib/genkit-admin';
import { retryWithBackoff, AI_GENERATION_RETRY_CONFIG } from '@/lib/retry-utils';
import { trackAIUsage, preflightCheckWordCredits } from '@/lib/credit-tracker';
import { withAIErrorHandling, type AIResult } from '@/lib/ai-error-handler';

const RewriteOfferSectionInputSchema = z.object({
  userId: z.string().describe('The user ID for API key retrieval.'),
  idToken: z.string().describe('Firebase ID token for authentication verification.'),
  originalContent: z.string().describe('The original content to rewrite.'),
  moduleTitle: z.string().describe('The title of the module being rewritten.'),
  language: z.string().describe('The language for the content.'),
  rewriteInstructions: z.string().optional().describe('Optional specific instructions for how to rewrite.'),
  styleProfile: z.string().optional().describe('Style profile for writing guidance.'),
  storytellingFramework: z.string().optional().describe('Storytelling framework to use (e.g., Hero\'s Journey, Three-Act Structure).'),
  researchProfile: z.string().optional().describe('Research profile for audience context.'),
  model: z.string().optional().describe('The generative AI model to use.'),
});

export type RewriteOfferSectionInput = z.infer<typeof RewriteOfferSectionInputSchema>;

const RewriteOfferSectionOutputSchema = z.object({
  rewrittenContent: z.string().describe('The rewritten content.'),
});

export type RewriteOfferSectionOutput = z.infer<typeof RewriteOfferSectionOutputSchema>;

export async function rewriteOfferSection(
  input: RewriteOfferSectionInput
): Promise<AIResult<RewriteOfferSectionOutput>> {
  return withAIErrorHandling(async () => {
    const context = `Rewriting module: "${input.moduleTitle}"`;
    const originalWordCount = input.originalContent.split(/\s+/).filter(w => w.length > 0).length;

    await preflightCheckWordCredits(input.userId, originalWordCount);

    const result = await retryWithBackoff(
    async () => {
      const { ai, model: routedModel } = await getGenkitInstanceForFunction('rewrite', input.userId, input.idToken);

      const prompt = ai.definePrompt({
        name: 'rewriteOfferSectionPrompt',
        input: { schema: RewriteOfferSectionInputSchema },
        output: { schema: RewriteOfferSectionOutputSchema },
        prompt: `You are an expert content editor. Your task is to rewrite and improve the following content while maintaining its core message and length.

**MODULE:** {{{moduleTitle}}}

**ORIGINAL CONTENT TO REWRITE:**
{{{originalContent}}}

{{#if rewriteInstructions}}
**SPECIFIC REWRITE INSTRUCTIONS:**
{{{rewriteInstructions}}}
{{/if}}

{{#if styleProfile}}
**STYLE PROFILE (Apply this writing style):**
{{{styleProfile}}}
{{/if}}

{{#if storytellingFramework}}
**STORYTELLING FRAMEWORK:**
Structure your content using the "{{{storytellingFramework}}}" framework to create an engaging narrative arc.
{{/if}}

{{#if researchProfile}}
**RESEARCH PROFILE (Target Audience & Pain Points):**
{{{researchProfile}}}
{{/if}}

**CRITICAL REQUIREMENTS:**

1. **LANGUAGE:** Write ALL content in {{{language}}}.

2. **WORD COUNT:** Maintain approximately the same word count as the original (~${originalWordCount} words).

3. **IMPROVEMENTS TO MAKE:**
   - Enhance clarity and readability
   - Improve flow and transitions
   - Strengthen the opening and closing
   - Make language more engaging
   - Fix any awkward phrasing

4. **PRESERVE:**
   - The core message and key points
   - The overall structure
   - Any specific examples or data
   - The intended tone

5. **DO NOT:**
   - Drastically change the meaning
   - Add completely new information
   - Remove important content
   - Change the language

Provide the rewritten content now.`,
      });

      try {
        const { output } = await prompt(input, { model: input.model || routedModel });

        if (!output || !output.rewrittenContent) {
          throw new Error('AI failed to rewrite the content.');
        }

        return {
          rewrittenContent: output.rewrittenContent,
        };
      } catch (error: any) {
        console.error('Error rewriting offer section:', error);
        throw error;
      }
    },
    AI_GENERATION_RETRY_CONFIG,
    context
  );

    await trackAIUsage(
      input.userId,
      result.rewrittenContent,
      'rewriteOfferSection',
      {
        moduleTitle: input.moduleTitle,
      }
    );

    return result;
  }, 'offer section rewriting');
}
