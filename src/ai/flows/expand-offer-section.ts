'use server';

import { z } from 'genkit';
import { getGenkitInstanceForFunction } from '@/lib/genkit-admin';
import { retryWithBackoff, AI_GENERATION_RETRY_CONFIG } from '@/lib/retry-utils';
import { trackAIUsage, preflightCheckWordCredits } from '@/lib/credit-tracker';
import { withAIErrorHandling } from '@/lib/ai-error-handler';

const ExpandOfferSectionInputSchema = z.object({
  userId: z.string().describe('The user ID for API key retrieval.'),
  idToken: z.string().describe('Firebase ID token for authentication verification.'),
  originalContent: z.string().describe('The original content to expand.'),
  moduleTitle: z.string().describe('The title of the module being expanded.'),
  language: z.string().describe('The language for the content.'),
  targetWordCount: z.number().describe('Target word count after expansion.'),
  expansionFocus: z.string().optional().describe('What aspects to focus on when expanding.'),
  styleProfile: z.string().optional().describe('Style profile for writing guidance.'),
  model: z.string().optional().describe('The generative AI model to use.'),
});

export type ExpandOfferSectionInput = z.infer<typeof ExpandOfferSectionInputSchema>;

const ExpandOfferSectionOutputSchema = z.object({
  expandedContent: z.string().describe('The expanded content.'),
});

export type ExpandOfferSectionOutput = z.infer<typeof ExpandOfferSectionOutputSchema>;

export async function expandOfferSection(
  input: ExpandOfferSectionInput
): Promise<ExpandOfferSectionOutput> {
  return withAIErrorHandling(async () => {
    const context = `Expanding module: "${input.moduleTitle}"`;
    const originalWordCount = input.originalContent.split(/\s+/).filter(w => w.length > 0).length;
    const additionalWords = Math.max(0, input.targetWordCount - originalWordCount);

    await preflightCheckWordCredits(input.userId, additionalWords);

    const result = await retryWithBackoff(
    async () => {
      const { ai, model: routedModel } = await getGenkitInstanceForFunction('expand', input.userId, input.idToken);

      const prompt = ai.definePrompt({
        name: 'expandOfferSectionPrompt',
        input: { schema: ExpandOfferSectionInputSchema },
        output: { schema: ExpandOfferSectionOutputSchema },
        prompt: `You are an expert content writer. Your task is to expand the following content to reach a target word count while adding valuable, relevant information.

**MODULE:** {{{moduleTitle}}}

**ORIGINAL CONTENT (currently ~${originalWordCount} words):**
{{{originalContent}}}

**TARGET WORD COUNT:** {{{targetWordCount}}} words (add approximately ${additionalWords} more words)

{{#if expansionFocus}}
**EXPANSION FOCUS:**
{{{expansionFocus}}}
{{/if}}

{{#if styleProfile}}
**STYLE PROFILE (Apply this writing style):**
{{{styleProfile}}}
{{/if}}

**CRITICAL REQUIREMENTS:**

1. **LANGUAGE:** Write ALL content in {{{language}}}.

2. **WORD COUNT:** Expand to approximately {{{targetWordCount}}} words.

3. **HOW TO EXPAND:**
   - Add more detailed explanations
   - Include additional examples or case studies
   - Elaborate on key points
   - Add practical tips or action items
   - Provide deeper context where helpful

4. **MAINTAIN:**
   - The original structure and flow
   - The core message and key points
   - The writing style and tone
   - All existing content (don't remove anything)

5. **DO NOT:**
   - Add irrelevant filler content
   - Repeat the same points in different words
   - Change the meaning of existing content
   - Add content that contradicts the original

6. **FORMATTING:**
   - Keep paragraphs readable (3-5 sentences)
   - Use subheadings if adding substantial new sections
   - Use bullet points for lists where appropriate

Provide the expanded content now.`,
      });

      try {
        const { output } = await prompt(input, { model: input.model || routedModel });

        if (!output || !output.expandedContent) {
          throw new Error('AI failed to expand the content.');
        }

        return {
          expandedContent: output.expandedContent,
        };
      } catch (error: any) {
        console.error('Error expanding offer section:', error);
        throw error;
      }
    },
    AI_GENERATION_RETRY_CONFIG,
    context
  );

    await trackAIUsage(
      input.userId,
      result.expandedContent,
      'expandOfferSection',
      {
        moduleTitle: input.moduleTitle,
        targetWordCount: input.targetWordCount,
      }
    );

    return result;
  }, 'offer section expansion');
}
