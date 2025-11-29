'use server';

import { z } from 'genkit';
import { getGenkitInstanceForFunction } from '@/lib/genkit-admin';
import { trackAIUsage, preflightCheckWordCredits } from '@/lib/credit-tracker';

const WriteMarketingContentInputSchema = z.object({
  userId: z.string().describe('The user ID for API key retrieval.'),
  idToken: z.string().describe('Firebase ID token for authentication verification.'),
  bookTitle: z.string().describe('The title of the book project.'),
  bookOutline: z.string().describe('The master blueprint/outline of the book.'),
  contentTitle: z.string().describe('The title of the content to write.'),
  contentDescription: z.string().optional().describe('Description of what the content should cover.'),
  language: z.string().describe('The language for the content.'),
  targetWordCount: z.number().describe('Target word count for the content.'),
  customInstructions: z.string().optional().describe('Custom instructions for the AI to follow.'),
  contentFramework: z.string().optional().describe('Content framework to follow.'),
  storytellingFramework: z.string().optional().describe('Storytelling framework to use.'),
  researchProfile: z.string().optional().describe('Optional research profile for context.'),
  styleProfile: z.string().optional().describe('Optional style profile for writing style.'),
  authorProfile: z.string().optional().describe('Optional author profile for voice/tone.'),
  model: z.string().optional().describe('The generative AI model to use.'),
});

export type WriteMarketingContentInput = z.infer<typeof WriteMarketingContentInputSchema>;

const WriteMarketingContentOutputSchema = z.object({
  content: z.string().describe('The generated marketing content.'),
  wordCount: z.number().describe('The actual word count of the generated content.'),
});

export type WriteMarketingContentOutput = z.infer<typeof WriteMarketingContentOutputSchema>;

export async function writeMarketingContent(
  input: WriteMarketingContentInput
): Promise<WriteMarketingContentOutput> {
  const estimatedWords = Math.max(input.targetWordCount, 500);
  await preflightCheckWordCredits(input.userId, estimatedWords);

  const { ai, model: routedModel } = await getGenkitInstanceForFunction('chapter', input.userId, input.idToken);

  try {
    const prompt = ai.definePrompt({
      name: 'writeMarketingContent',
      input: { schema: WriteMarketingContentInputSchema },
      output: { schema: WriteMarketingContentOutputSchema },
      prompt: `You are an expert content writer and book marketing specialist. Your task is to write compelling marketing content that helps promote and sell a book.

**Book Context:**
- Book Title: {{{bookTitle}}}
- Language: {{{language}}}

**Book Blueprint/Outline:**
{{{bookOutline}}}

{{#if researchProfile}}
**Research Profile (Target Audience & Pain Points):**
{{{researchProfile}}}
{{/if}}

{{#if styleProfile}}
**Style Profile (Writing Style to Match - CRITICAL):**
{{{styleProfile}}}

**CODE-MIXING REQUIREMENT:** If the style profile demonstrates code-mixing (mixing words/phrases from multiple languages like English mixed with Bengali, Hindi, or other languages), you MUST replicate that exact code-mixing pattern in your writing. Match the frequency and style of language mixing shown in the profile.
{{/if}}

{{#if authorProfile}}
**Author Profile:**
{{{authorProfile}}}
{{/if}}

{{#if storytellingFramework}}
**Storytelling Framework:** {{{storytellingFramework}}}
{{/if}}

{{#if contentFramework}}
**Content Framework:** {{{contentFramework}}}
{{/if}}

---

**CONTENT TO WRITE:**
- Title: {{{contentTitle}}}
{{#if contentDescription}}
- Description: {{{contentDescription}}}
{{/if}}
- Target Word Count: {{{targetWordCount}}} words

{{#if customInstructions}}
**CUSTOM INSTRUCTIONS (IMPORTANT - Follow these closely):**
{{{customInstructions}}}
{{/if}}

---

**YOUR TASK:**
Write the complete content piece based on the title and context provided above.

**REQUIREMENTS:**
1. Write approximately {{{targetWordCount}}} words (within 10% margin).
2. The content should be compelling, engaging, and designed to attract potential book buyers.
3. Showcase the author's expertise and the book's value proposition naturally.
4. Write in {{{language}}}.
5. If a style profile is provided, match that writing style EXACTLY - including any code-mixing patterns (mixing of languages), vocabulary choices, sentence structures, and tone.
6. If a storytelling framework is provided, incorporate those storytelling elements.
7. If a content framework is provided, structure the content according to that framework.
8. Make the content valuable standalone while also encouraging readers to get the book.
9. CRITICAL: If the style profile shows code-mixing (e.g., English with Bengali/Hindi words), you MUST incorporate the same language mixing pattern throughout your writing.

**CONTENT PURPOSE:**
This content will be used for book marketing - it should:
- Build authority and trust
- Demonstrate expertise
- Address pain points the book solves
- Create desire for the book's full content
- Include subtle calls-to-action when appropriate

Write the complete content now. Do not include the title in the output - start directly with the content.`,
    });

    const { output } = await prompt(input, { model: input.model || routedModel });

    if (!output || !output.content) {
      throw new Error('Failed to generate marketing content. Please try again.');
    }

    await trackAIUsage(
      input.userId,
      output.content,
      'writeMarketingContent',
      { bookTitle: input.bookTitle, contentTitle: input.contentTitle }
    );

    return output;
  } catch (error: any) {
    console.error('Error writing marketing content:', error);

    if (error.message?.includes('503') || error.message?.includes('overloaded')) {
      throw new Error('The AI service is currently overloaded. Please wait a moment and try again.');
    }

    if (error.message?.includes('401') || error.message?.includes('Unauthorized') || error.message?.includes('API key')) {
      throw new Error('Your API key appears to be invalid or expired. Please check your API key in Settings.');
    }

    if (error.message?.includes('429') || error.message?.includes('quota')) {
      throw new Error('You have exceeded your API quota. Please check your usage limits or try again later.');
    }

    throw new Error(error.message || 'An unexpected error occurred while writing content. Please try again.');
  }
}
