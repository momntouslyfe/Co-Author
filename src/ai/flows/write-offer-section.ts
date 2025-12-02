'use server';

import { z } from 'genkit';
import { getGenkitInstanceForFunction } from '@/lib/genkit-admin';
import { retryWithBackoff, AI_GENERATION_RETRY_CONFIG } from '@/lib/retry-utils';
import { trackAIUsage, preflightCheckWordCredits } from '@/lib/credit-tracker';
import { withAIErrorHandling, type AIResult } from '@/lib/ai-error-handler';
import { OFFER_CATEGORY_LABELS } from '@/lib/definitions';
import type { OfferCategory } from '@/lib/definitions';

const WriteOfferSectionInputSchema = z.object({
  userId: z.string().describe('The user ID for API key retrieval.'),
  idToken: z.string().describe('Firebase ID token for authentication verification.'),
  offerTitle: z.string().describe('The title of the offer.'),
  offerCategory: z.string().describe('The category of the offer.'),
  blueprintSummary: z.string().describe('Summary of the selected blueprint.'),
  partTitle: z.string().describe('The title of the current part.'),
  moduleTitle: z.string().describe('The title of the module/section to write.'),
  allParts: z.string().describe('Full structure of all parts and modules for context.'),
  language: z.string().describe('The language for the content.'),
  targetWordCount: z.number().describe('Target word count for this section (500-700).'),
  previousContent: z.string().optional().describe('Previously written content for context.'),
  bookContext: z.string().optional().describe('Source book title and outline for reference.'),
  researchProfile: z.string().optional().describe('Research profile for audience context.'),
  styleProfile: z.string().optional().describe('Style profile for writing guidance.'),
  storytellingFramework: z.string().optional().describe('Storytelling framework to use (e.g., Hero\'s Journey, Three-Act Structure).'),
  customInstructions: z.string().optional().describe('Additional instructions from user.'),
  model: z.string().optional().describe('The generative AI model to use.'),
});

export type WriteOfferSectionInput = z.infer<typeof WriteOfferSectionInputSchema>;

const WriteOfferSectionOutputSchema = z.object({
  sectionContent: z.string().describe('The generated content for the section.'),
});

export type WriteOfferSectionOutput = z.infer<typeof WriteOfferSectionOutputSchema>;

export async function writeOfferSection(
  input: WriteOfferSectionInput
): Promise<AIResult<WriteOfferSectionOutput>> {
  return withAIErrorHandling(async () => {
    const context = `Module: "${input.moduleTitle}" in Part: "${input.partTitle}"`;

    await preflightCheckWordCredits(input.userId, input.targetWordCount);

    const category = input.offerCategory as Exclude<OfferCategory, 'all'>;
    const categoryLabel = OFFER_CATEGORY_LABELS[category] || input.offerCategory;

    const result = await retryWithBackoff(
    async () => {
      const { ai, model: routedModel } = await getGenkitInstanceForFunction('chapter', input.userId, input.idToken);

      const prompt = ai.definePrompt({
        name: 'writeOfferSectionPrompt',
        input: { schema: WriteOfferSectionInputSchema },
        output: { schema: WriteOfferSectionOutputSchema },
        prompt: `You are an expert content writer specializing in creating valuable bonus materials for book authors. Your task is to write content for a specific module/section of a ${categoryLabel}.

**OFFER CONTEXT:**
- Offer Title: {{{offerTitle}}}
- Category: ${categoryLabel}
- Blueprint Summary: {{{blueprintSummary}}}

**CURRENT SECTION:**
- Part: {{{partTitle}}}
- Module to Write: {{{moduleTitle}}}

**FULL OFFER STRUCTURE:**
{{{allParts}}}

{{#if bookContext}}
**SOURCE BOOK CONTEXT:**
{{{bookContext}}}
{{/if}}

{{#if previousContent}}
**PREVIOUSLY WRITTEN CONTENT (for continuity):**
{{{previousContent}}}
{{/if}}

{{#if researchProfile}}
**RESEARCH PROFILE (Target Audience & Pain Points):**
{{{researchProfile}}}
{{/if}}

{{#if styleProfile}}
**STYLE PROFILE (Writing Style Guidance):**
Apply this writing style (tone, voice, sentence patterns) while writing the content:
{{{styleProfile}}}
{{/if}}

{{#if storytellingFramework}}
**STORYTELLING FRAMEWORK:**
Structure your content using the "{{{storytellingFramework}}}" framework to create an engaging narrative arc.
{{/if}}

{{#if customInstructions}}
**CUSTOM INSTRUCTIONS:**
{{{customInstructions}}}
{{/if}}

**CRITICAL REQUIREMENTS:**

1. **LANGUAGE & CODE-MIXING (CRITICAL - FOLLOW EXACTLY):** Write ALL content in {{{language}}}. If the style profile includes code-mixing patterns, you MUST replicate those patterns EXACTLY.
    
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

2. **WORD COUNT:** Write approximately {{{targetWordCount}}} words for this section.

3. **CONTENT FOCUS:** Write ONLY the content for the module "{{{moduleTitle}}}". Stay focused on this specific topic.

4. **SECTION-SPECIFIC RULES:**
   - **If moduleTitle is "Introduction":** Write an engaging opening that sets context for what readers will learn in this part. Preview the key topics but don't dive into details.
   - **If moduleTitle is "Your Action Steps":** Provide 3-5 specific, actionable steps readers can take immediately to apply what they learned. Use numbered list format.
   - **If moduleTitle is "Coming Up Next":** Write ONLY 2-3 sentences that briefly preview what the VERY NEXT part covers. Keep it short and enticing - just a teaser, not a full summary.
   - **For all other modules:** Provide substantive, valuable content that teaches the topic thoroughly.

5. **FORMATTING:**
   - Use clear paragraphs with proper spacing
   - Use subheadings (## Subheading) ONLY for long sections that need subdivision - not for short sections
   - Use bullet points or numbered lists where appropriate
   - Keep paragraphs readable (3-5 sentences each)
   - Start directly with content - no preamble or meta-commentary

6. **CATEGORY-SPECIFIC GUIDANCE for ${categoryLabel}:**
${getCategoryWritingGuidance(category)}

7. **DO NOT:**
   - Include the module title as a heading (it will be added automatically)
   - Write generic filler content
   - Repeat content from previous sections
   - Add meta-commentary about what you're writing
   - Start with "In this section..." or similar phrases

Write the section content now.`,
      });

      try {
        const { output } = await prompt(input, { model: input.model || routedModel });

        if (!output || !output.sectionContent) {
          throw new Error('AI failed to generate the section content.');
        }

        return {
          sectionContent: output.sectionContent,
        };
      } catch (error: any) {
        console.error('Error generating offer section content:', error);
        throw error;
      }
    },
    AI_GENERATION_RETRY_CONFIG,
    context
  );

  await trackAIUsage(
    input.userId,
    result.sectionContent,
    'writeOfferSection',
    {
      offerTitle: input.offerTitle,
        partTitle: input.partTitle,
        moduleTitle: input.moduleTitle,
      }
    );

    return result;
  }, 'offer section writing');
}

function getCategoryWritingGuidance(category: Exclude<OfferCategory, 'all'>): string {
  const guidance: Record<Exclude<OfferCategory, 'all'>, string> = {
    'complementary-skill-guide': `- Teach concepts clearly and progressively
- Include practical examples and applications
- Provide actionable techniques readers can implement immediately`,

    'workbook': `- Include interactive elements (fill-in prompts, reflection questions)
- Guide readers through self-discovery and goal-setting
- Create space for readers to write and engage`,

    '30-day-challenge': `- Be specific about daily actions and time requirements
- Include encouragement and motivation
- Build momentum progressively through the days`,

    'quick-start-guide': `- Be extremely concise and action-focused
- Focus on quick wins and immediate results
- Eliminate any unnecessary explanation`,

    'cheat-sheet': `- Use short, scannable formats
- Focus on reference-style content
- Prioritize clarity over detailed explanation`,

    'small-ebook': `- Write engaging, story-driven content
- Balance depth with readability
- Include insights that complement the main book`,

    'template': `- Explain how to use and customize
- Include clear examples
- Focus on practical application`,

    'frameworks': `- Present step-by-step processes clearly
- Include visual or conceptual structure
- Show how frameworks apply to real situations`,

    'resource-list': `- Provide brief but helpful descriptions
- Organize logically for easy navigation
- Include actionable recommendations`,

    'advanced-chapter': `- Assume reader has foundation knowledge
- Go deep on complex concepts
- Include expert-level insights and strategies`,

    'self-assessment-quiz': `- Write clear, unambiguous questions
- Provide thoughtful answer analysis
- Connect results to actionable next steps`,

    'troubleshooting-guide': `- Be solution-focused and practical
- Address specific problems clearly
- Provide step-by-step resolution paths`,
  };

  return guidance[category] || '- Write clear, valuable content';
}
