'use server';

import { z } from 'genkit';
import { getGenkitInstanceForFunction } from '@/lib/genkit-admin';
import { trackAIUsage, preflightCheckWordCredits } from '@/lib/credit-tracker';
import { withAIErrorHandling } from '@/lib/ai-error-handler';

const GenerateOfferIdeasInputSchema = z.object({
  userId: z.string().describe('The user ID for API key retrieval.'),
  idToken: z.string().describe('Firebase ID token for authentication verification.'),
  bookTitle: z.string().describe('The title of the book project.'),
  bookOutline: z.string().describe('The master blueprint/outline of the book.'),
  language: z.string().describe('The language for the offer ideas.'),
  category: z.string().describe('The offer category to generate ideas for, or "all" for all categories.'),
  researchProfile: z.string().optional().describe('Optional research profile for context.'),
  styleProfile: z.string().optional().describe('Optional style profile for writing style.'),
  storytellingFramework: z.string().optional().describe('Optional storytelling framework.'),
  authorProfile: z.string().optional().describe('Optional author profile for context.'),
  model: z.string().optional().describe('The generative AI model to use.'),
});

export type GenerateOfferIdeasInput = z.infer<typeof GenerateOfferIdeasInputSchema>;

const OfferIdeaSchema = z.object({
  title: z.string().describe('A catchy, compelling title for the bonus material.'),
  description: z.string().describe('A 2-3 sentence description explaining what this bonus material offers and why readers would want it.'),
});

const GenerateOfferIdeasOutputSchema = z.object({
  ideas: z.array(OfferIdeaSchema).describe('Array of offer/bonus material ideas.'),
  category: z.string().describe('The category these ideas belong to.'),
});

export type GenerateOfferIdeasOutput = z.infer<typeof GenerateOfferIdeasOutputSchema>;

const CATEGORY_PROMPTS: Record<string, string> = {
  'complementary-skill-guide': `Generate ideas for a COMPLEMENTARY SKILL GUIDE - a guide that teaches a skill that complements the main book's topic. For example, if the book is about writing, the bonus could be about formatting or marketing. The skill should be different but highly relevant to the reader's success.`,
  
  'workbook': `Generate ideas for a WORKBOOK / ACTIONBOOK - a practical guide with questions, exercises, and space for readers to write their answers. It should help readers apply the concepts from the main book through guided self-reflection and action steps.`,
  
  '30-day-challenge': `Generate ideas for a 30 DAY CHALLENGE - a step-by-step guide showing exactly what to do each day for a month to achieve a specific result related to the book's topic. Each day should have a clear, actionable task.`,
  
  'quick-start-guide': `Generate ideas for a QUICK START GUIDE - a 10-minute guide that helps readers get their first result immediately. It should distill the most essential actionable steps for instant wins.`,
  
  'cheat-sheet': `Generate ideas for a CHEAT SHEET - a 1-3 page summary of the entire system or methodology from the book. It should be a quick reference that readers can print and use daily.`,
  
  'small-ebook': `Generate ideas for a SMALL EBOOK - a short complementary book (20-40 pages) that dives deeper into a related skill or topic that would benefit readers of the main book.`,
  
  'template': `Generate ideas for TEMPLATES - fill-in-the-blank files, worksheets, or pre-made resources that readers can use immediately. These should save readers time and help them implement the book's teachings.`,
  
  'frameworks': `Generate ideas for FRAMEWORKS - step-by-step frameworks or methodologies curated from the book's blueprint and research. These should provide clear, repeatable processes readers can follow.`,
  
  'resource-list': `Generate ideas for a RESOURCE LIST - a curated list of tools, software, books, websites, or other resources that readers need to implement the book's teachings effectively.`,
  
  'advanced-chapter': `Generate ideas for an ADVANCED CHAPTER - a "missing chapter" that was too advanced for the main book but valuable for high achievers. This should be structured like the book's chapters with a title and 7-10 detailed sub-topics covering advanced techniques or strategies.`,
  
  'self-assessment-quiz': `Generate ideas for a SELF ASSESSMENT QUIZ - 15-30 multiple choice questions to test readers' knowledge of the book's content, along with an answer key. It should help readers identify areas for improvement.`,
  
  'troubleshooting-guide': `Generate ideas for a TROUBLESHOOTING GUIDE - a comprehensive guide covering what to do when things go wrong. It should address common problems, mistakes, and challenges readers might face when implementing the book's teachings.`,
};

const ALL_CATEGORIES = Object.keys(CATEGORY_PROMPTS);

export async function generateOfferIdeas(
  input: GenerateOfferIdeasInput
): Promise<GenerateOfferIdeasOutput[]> {
  return withAIErrorHandling(async () => {
    const estimatedWords = input.category === 'all' ? 2000 : 500;
    await preflightCheckWordCredits(input.userId, estimatedWords);

    const { ai, model: routedModel } = await getGenkitInstanceForFunction('blueprint', input.userId, input.idToken);

  const categoriesToGenerate = input.category === 'all' ? ALL_CATEGORIES : [input.category];
  const ideasPerCategory = input.category === 'all' ? 3 : 5;

  const results: GenerateOfferIdeasOutput[] = [];

  for (const category of categoriesToGenerate) {
    const categoryPrompt = CATEGORY_PROMPTS[category];
    if (!categoryPrompt) continue;

    try {
      const prompt = ai.definePrompt({
        name: `generateOfferIdeas_${category.replace(/-/g, '_')}`,
        input: { schema: GenerateOfferIdeasInputSchema },
        output: { schema: GenerateOfferIdeasOutputSchema },
        prompt: `You are an expert marketing strategist and book launch specialist. Your task is to generate compelling bonus material ideas that will make a book offer irresistible and high-converting.

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

{{#if authorProfile}}
**Author Profile:** {{{authorProfile}}}
{{/if}}

**YOUR TASK:**
${categoryPrompt}

**REQUIREMENTS:**
1. Generate exactly ${ideasPerCategory} unique and compelling bonus material ideas for this category.
2. Each idea must be directly relevant to the book's topic and valuable to its target audience.
3. Ideas should be actionable and help readers achieve better results with the book's teachings.
4. Write everything in ${input.language}.
5. Make titles catchy and benefit-focused.
6. Descriptions should clearly communicate the value proposition.

**IMPORTANT:**
- These are IDEAS for bonus materials, not the actual content.
- Focus on what would make readers excited to get this bonus.
- Consider what problems the bonus solves that the book might not fully address.

Return the ideas in the specified format with the category set to "${category}".`,
      });

      const { output } = await prompt(
        { ...input, category },
        { model: input.model || routedModel }
      );

      if (output && output.ideas.length > 0) {
        results.push({
          ideas: output.ideas,
          category,
        });

        await trackAIUsage(
          input.userId,
          output.ideas.map((i: { title: string; description: string }) => `${i.title}: ${i.description}`).join('\n'),
          'generateOfferIdeas',
          { bookTitle: input.bookTitle, category }
        );
      }
    } catch (error: any) {
      console.error(`Error generating ideas for category ${category}:`, error);
    }
  }

    if (results.length === 0) {
      throw new Error('Failed to generate any offer ideas. Please try again.');
    }

    return results;
  }, 'offer ideas generation');
}
