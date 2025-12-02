'use server';

import { z } from 'genkit';
import { getGenkitInstanceForFunction } from '@/lib/genkit-admin';
import { trackAIUsage, preflightCheckWordCredits } from '@/lib/credit-tracker';
import { withAIErrorHandling, type AIResult } from '@/lib/ai-error-handler';

const GenerateFunnelIdeasInputSchema = z.object({
  userId: z.string().describe('The user ID for API key retrieval.'),
  idToken: z.string().describe('Firebase ID token for authentication verification.'),
  bookTitle: z.string().describe('The title of the main book project.'),
  bookOutline: z.string().describe('The master blueprint/outline of the main book.'),
  language: z.string().describe('The language for the book ideas.'),
  funnelStep: z.number().describe('The current funnel step (1-7).'),
  previousStepIdeas: z.string().optional().describe('Titles and descriptions of selected ideas from previous steps.'),
  researchProfile: z.string().optional().describe('Optional research profile for context.'),
  styleProfile: z.string().optional().describe('Optional style profile for writing style.'),
  storytellingFramework: z.string().optional().describe('Optional storytelling framework with concept.'),
  contentFramework: z.string().optional().describe('Optional content/marketing framework with concept.'),
  authorProfile: z.string().optional().describe('Optional author profile for context.'),
  model: z.string().optional().describe('The generative AI model to use.'),
});

export type GenerateFunnelIdeasInput = z.infer<typeof GenerateFunnelIdeasInputSchema>;

const BookIdeaSchema = z.object({
  title: z.string().describe('A compelling title for the follow-up book.'),
  subtitle: z.string().optional().describe('An optional subtitle that clarifies the book focus.'),
  description: z.string().describe('A 2-3 sentence description of what this book covers.'),
  targetProblem: z.string().describe('The specific problem or challenge this book solves that arises after readers complete the previous step.'),
});

const GenerateFunnelIdeasOutputSchema = z.object({
  ideas: z.array(BookIdeaSchema).describe('Array of 5-7 book ideas for this funnel step.'),
  stepContext: z.string().describe('A brief explanation of what readers have learned and what new challenges they face at this step.'),
});

export type GenerateFunnelIdeasOutput = z.infer<typeof GenerateFunnelIdeasOutputSchema>;

const STEP_DESCRIPTIONS: Record<number, string> = {
  1: 'Readers have just finished your main book. They have the foundational knowledge but now face their FIRST IMMEDIATE CHALLENGE when trying to apply what they learned. What specific struggle do they encounter right after finishing? What do they need NEXT to overcome this initial hurdle?',
  2: 'Readers have now overcome their first challenge. They are making progress but hit a NEW OBSTACLE. What intermediate skill or knowledge gap do they discover? What book would help them level up from beginner to intermediate?',
  3: 'Readers are now intermediate practitioners. They want to go DEEPER and achieve better results. What advanced techniques or strategies are they missing? What would help them become truly proficient?',
  4: 'Readers are becoming proficient. They want to OPTIMIZE and SCALE their results. What efficiency or scaling challenges do they face? What would help them get more results with less effort?',
  5: 'Readers are highly skilled now. They may want to TEACH OTHERS or BUILD SYSTEMS around their expertise. What challenges come with sharing knowledge or creating repeatable processes?',
  6: 'Readers are experts and may want to MONETIZE or BUILD A BUSINESS around their skills. What entrepreneurial or professional challenges do they face? What would help them turn expertise into income?',
  7: 'Readers are at the TOP of their journey. They seek MASTERY, LEGACY, or NEW FRONTIERS. What advanced or philosophical challenges remain? What would help them achieve ultimate mastery or explore new directions?',
};

export async function generateFunnelIdeas(
  input: GenerateFunnelIdeasInput
): Promise<AIResult<GenerateFunnelIdeasOutput>> {
  return withAIErrorHandling(async () => {
    await preflightCheckWordCredits(input.userId, 800);

    const { ai, model: routedModel } = await getGenkitInstanceForFunction('blueprint', input.userId, input.idToken);

    const stepDescription = STEP_DESCRIPTIONS[input.funnelStep] || STEP_DESCRIPTIONS[1];

    try {
    const prompt = ai.definePrompt({
      name: `generateFunnelIdeas_step${input.funnelStep}`,
      input: { schema: GenerateFunnelIdeasInputSchema },
      output: { schema: GenerateFunnelIdeasOutputSchema },
      prompt: `You are a "Customer Journey Architect" - an expert at understanding how solving one problem creates new problems, and designing book funnels that guide readers through their complete learning journey.

**VALUE LADDER PRINCIPLE:**
The fundamental concept is that when someone solves one problem, a NEW problem emerges. Your job is to identify what that next problem is and create book ideas that solve it.

**MAIN BOOK CONTEXT:**
- Book Title: {{{bookTitle}}}
- Language: {{{language}}}

**Main Book Blueprint/Outline:**
{{{bookOutline}}}

{{#if researchProfile}}
**Research Profile (Target Audience & Pain Points):**
{{{researchProfile}}}
{{/if}}

{{#if storytellingFramework}}
**Storytelling Framework:**
{{{storytellingFramework}}}
{{/if}}

{{#if contentFramework}}
**Content Framework:**
{{{contentFramework}}}
{{/if}}

{{#if styleProfile}}
**Style Profile:** {{{styleProfile}}}
{{/if}}

{{#if authorProfile}}
**Author Profile:** {{{authorProfile}}}
{{/if}}

**FUNNEL STEP: ${input.funnelStep} of 7**

${stepDescription}

{{#if previousStepIdeas}}
**CONTEXT FROM PREVIOUS STEPS:**
The reader has already progressed through the main book and the following journey:
{{{previousStepIdeas}}}

Now think about what NEW challenge emerges after they've completed all of the above.
{{/if}}

**YOUR TASK:**
Generate 5-7 compelling book ideas for Step ${input.funnelStep} of the funnel.

**REQUIREMENTS:**
1. Each book idea must solve a SPECIFIC problem that arises at this stage of the journey.
2. Ideas should logically follow from the main book${input.previousStepIdeas ? ' and previous steps' : ''}.
3. The "targetProblem" field should clearly articulate the new challenge readers face.
4. Titles should be compelling and benefit-focused.
5. Write everything in {{{language}}}.
6. Also provide a "stepContext" that explains where readers are in their journey and what challenges they face.

**IMPORTANT:**
- Think about what happens AFTER success, not just the path to success.
- Each step should represent genuine progression, not just variations of the same topic.
- Consider both skill-based and mindset-based challenges readers might face.

Return the ideas in the specified format.`,
    });

    const { output } = await prompt(input, { model: input.model || routedModel });

    if (!output || output.ideas.length === 0) {
      throw new Error('The AI did not return any book ideas. Please try again.');
    }

    await trackAIUsage(
      input.userId,
      output.ideas.map((i: { title: string; description: string; targetProblem: string }) => 
        `${i.title}: ${i.description} (Problem: ${i.targetProblem})`
      ).join('\n'),
      'generateFunnelIdeas',
      { bookTitle: input.bookTitle, step: input.funnelStep }
    );

    return output;
  } catch (error: any) {
    console.error('Error in generateFunnelIdeas:', error);

    if (error.message?.includes('503') || error.message?.includes('overloaded')) {
      throw new Error('The AI service is currently overloaded. Please wait a moment and try again.');
    }

    if (error.message?.includes('401') || error.message?.includes('Unauthorized') || error.message?.includes('API key')) {
      throw new Error('Your API key appears to be invalid or expired. Please check your API key in Settings.');
    }

    if (error.message?.includes('429') || error.message?.includes('quota')) {
      throw new Error('You have exceeded your API quota. Please check your usage limits or try again later.');
    }

    throw new Error(error.message || 'An unexpected error occurred while generating funnel ideas. Please try again.');
    }
  }, 'funnel ideas generation');
}
