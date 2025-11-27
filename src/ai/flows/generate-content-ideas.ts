'use server';

import { z } from 'genkit';
import { getGenkitInstanceForFunction } from '@/lib/genkit-admin';
import { trackAIUsage, preflightCheckWordCredits } from '@/lib/credit-tracker';

const GenerateContentIdeasInputSchema = z.object({
  userId: z.string().describe('The user ID for API key retrieval.'),
  idToken: z.string().describe('Firebase ID token for authentication verification.'),
  bookTitle: z.string().describe('The title of the book project.'),
  bookOutline: z.string().describe('The master blueprint/outline of the book.'),
  language: z.string().describe('The language for the content ideas.'),
  category: z.string().describe('The content category to generate ideas for (user-provided).'),
  researchProfile: z.string().optional().describe('Optional research profile for context.'),
  styleProfile: z.string().optional().describe('Optional style profile for writing style.'),
  storytellingFramework: z.string().optional().describe('Optional storytelling framework.'),
  model: z.string().optional().describe('The generative AI model to use.'),
});

export type GenerateContentIdeasInput = z.infer<typeof GenerateContentIdeasInputSchema>;

const ContentIdeaSchema = z.object({
  title: z.string().describe('A catchy, compelling title for the content piece.'),
  description: z.string().describe('A 2-3 sentence description explaining what this content covers and how it helps sell the book.'),
});

const GenerateContentIdeasOutputSchema = z.object({
  ideas: z.array(ContentIdeaSchema).describe('Array of content ideas for book promotion.'),
  category: z.string().describe('The category these ideas belong to.'),
});

export type GenerateContentIdeasOutput = z.infer<typeof GenerateContentIdeasOutputSchema>;

export async function generateContentIdeas(
  input: GenerateContentIdeasInput
): Promise<GenerateContentIdeasOutput> {
  await preflightCheckWordCredits(input.userId, 500);

  const { ai, model: routedModel } = await getGenkitInstanceForFunction('blueprint', input.userId, input.idToken);

  try {
    const prompt = ai.definePrompt({
      name: 'generateContentIdeas',
      input: { schema: GenerateContentIdeasInputSchema },
      output: { schema: GenerateContentIdeasOutputSchema },
      prompt: `You are an expert content strategist and book marketing specialist. Your task is to generate compelling content ideas that will help promote and sell a book.

**Book Context:**
- Book Title: {{{bookTitle}}}
- Language: {{{language}}}

**Book Blueprint/Outline:**
{{{bookOutline}}}

{{#if researchProfile}}
**Research Profile (Target Audience & Pain Points):**
{{{researchProfile}}}
{{/if}}

{{#if storytellingFramework}}
**Storytelling Framework:** {{{storytellingFramework}}}
{{/if}}

{{#if styleProfile}}
**Style Profile:** {{{styleProfile}}}
{{/if}}

**Content Category:** {{{category}}}

**YOUR TASK:**
Generate 5 unique and compelling content ideas for the "{{{category}}}" category that will help promote and sell this book.

**REQUIREMENTS:**
1. Each content idea should be directly relevant to the book's topic and valuable to its target audience.
2. Ideas should be designed to attract potential readers and convert them into buyers.
3. Content should showcase the author's expertise and the book's value proposition.
4. Write everything in {{{language}}}.
5. Make titles catchy, benefit-focused, and attention-grabbing.
6. Descriptions should clearly communicate the value and purpose of each content piece.

**CONTENT PURPOSE:**
These content pieces will be used for:
- Social media marketing
- Email marketing
- Blog posts
- Lead magnets
- Authority building
- Audience engagement

**IMPORTANT:**
- These are IDEAS for content, not the actual content itself.
- Focus on topics that would make potential readers want to learn more about the book.
- Consider what would resonate with the target audience based on their pain points.

Return the ideas in the specified format with the category set to "{{{category}}}".`,
    });

    const { output } = await prompt(input, { model: input.model || routedModel });

    if (!output || output.ideas.length === 0) {
      throw new Error('Failed to generate content ideas. Please try again.');
    }

    await trackAIUsage(
      input.userId,
      output.ideas.map((i: { title: string; description: string }) => `${i.title}: ${i.description}`).join('\n'),
      'generateContentIdeas',
      { bookTitle: input.bookTitle, category: input.category }
    );

    return {
      ideas: output.ideas,
      category: input.category,
    };
  } catch (error: any) {
    console.error('Error generating content ideas:', error);

    if (error.message?.includes('503') || error.message?.includes('overloaded')) {
      throw new Error('The AI service is currently overloaded. Please wait a moment and try again.');
    }

    if (error.message?.includes('401') || error.message?.includes('Unauthorized') || error.message?.includes('API key')) {
      throw new Error('Your API key appears to be invalid or expired. Please check your API key in Settings.');
    }

    if (error.message?.includes('429') || error.message?.includes('quota')) {
      throw new Error('You have exceeded your API quota. Please check your usage limits or try again later.');
    }

    throw new Error(error.message || 'An unexpected error occurred while generating content ideas. Please try again.');
  }
}
