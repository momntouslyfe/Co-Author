'use server';

/**
 * @fileOverview AI topic research assistant to perform deep topic research, pain point analysis, and get target audience suggestions, tailored to a specific language and market.
 *
 * - researchBookTopic - A function that handles the book topic research process.
 * - ResearchBookTopicInput - The input type for the researchBookTopic function.
 * - ResearchBookTopicOutput - The return type for the researchBooktopic function.
 */

import {z} from 'genkit';

import { getGenkitInstanceForFunction } from '@/lib/genkit-admin';
import { trackAIUsage, preflightCheckWordCredits } from '@/lib/credit-tracker';
import { retryWithBackoff } from '@/lib/retry-utils';

const ResearchBookTopicInputSchema = z.object({
  userId: z.string().describe('The user ID for API key retrieval.'),
  idToken: z.string().describe('Firebase ID token for authentication verification.'),
  topic: z.string().describe('The topic to research.'),
  language: z.string().describe('The language for the research results (e.g., "English", "Bangla").'),
  targetMarket: z.string().optional().describe('The specific target market for the research (e.g., "USA", "Global Tech Industry").'),
  model: z.string().optional().describe('The generative AI model to use.'),
});
export type ResearchBookTopicInput = z.infer<typeof ResearchBookTopicInputSchema>;

const ResearchBookTopicOutputSchema = z.object({
  deepTopicResearch: z.string().describe('Comprehensive research on the topic, including history, key concepts, trends, and a list of reference links. Formatted in Markdown.'),
  painPointAnalysis: z.string().describe('Analysis of the pain points, challenges, and problems readers face, presented in well-structured Markdown.'),
  targetAudienceSuggestion: z.string().describe('Suggestions for the ideal target audience, presented in well-structured Markdown.'),
});
export type ResearchBookTopicOutput = z.infer<typeof ResearchBookTopicOutputSchema>;

const RESEARCH_RETRY_CONFIG = {
  maxRetries: 4,
  initialDelayMs: 3000,
  maxDelayMs: 90000,
  backoffMultiplier: 2.5,
};

export async function researchBookTopic(input: ResearchBookTopicInput): Promise<ResearchBookTopicOutput> {
  await preflightCheckWordCredits(input.userId, 2000);
  
  const context = `Research Topic: "${input.topic}"`;
  
  const result = await retryWithBackoff(
    async () => {
      const { ai, model: routedModel } = await getGenkitInstanceForFunction('research', input.userId, input.idToken);
      
      const prompt = ai.definePrompt({
        name: 'researchBookTopicPrompt',
        input: {schema: ResearchBookTopicInputSchema},
        output: {schema: ResearchBookTopicOutputSchema},
        config: {
          maxOutputTokens: 8000,
          temperature: 0.7,
        },
        prompt: `You are a world-class research analyst. Your task is to produce comprehensive research for a book topic.

**Research Topic:** {{{topic}}}
**Output Language:** {{{language}}}
{{#if targetMarket}}**Target Market:** {{{targetMarket}}}{{/if}}

You must generate THREE separate outputs. Write everything in {{{language}}}.

---

## OUTPUT 1: deepTopicResearch (2000-2200 words total)

Generate a complete, comprehensive research document with ALL of these sections:

### Historical Context (200-250 words)
Key milestones, evolution, and important dates in this field.

### Current Landscape (250-300 words)
Present state, market conditions, current trends, and recent developments with statistics.

### Core Concepts & Principles (400-450 words)
Fundamental ideas, key theories, essential knowledge, and important principles. Be comprehensive and educational.

### Key Data & Statistics (350-400 words)
Important numbers, percentages, research findings, and quantitative insights. Use qualifiers like "studies suggest" if uncertain.

### Expert Perspectives (150-200 words)
Insights from thought leaders and recognized authorities.

### Trends & Future Outlook (250-300 words)
Emerging developments, predictions, and future directions.

### Success Stories & Case Studies (150-200 words)
Real examples with outcomes and lessons learned.

### References & Source Links
5-10 real, authoritative URLs formatted as: [Source Name](URL) - Brief description.

Use Markdown formatting: ## for headings, ### for subheadings, **bold** for key terms, bullet points for lists.

---

## OUTPUT 2: painPointAnalysis (150-200 words - BE CONCISE)

List 4 pain points in a simple bullet format:

- **[Pain Point 1]:** One sentence description.
- **[Pain Point 2]:** One sentence description.
- **[Pain Point 3]:** One sentence description.
- **[Pain Point 4]:** One sentence description.

Keep it brief and to the point. No lengthy explanations.

---

## OUTPUT 3: targetAudienceSuggestion (150-200 words - BE CONCISE)

List 4 target audiences in a simple format:

- **[Audience 1]:** One sentence describing who they are and why this topic matters to them.
- **[Audience 2]:** One sentence describing who they are and why this topic matters to them.
- **[Audience 3]:** One sentence describing who they are and why this topic matters to them.
- **[Audience 4]:** One sentence describing who they are and why this topic matters to them.

Keep it brief and to the point. No lengthy explanations.

---

Generate all three outputs in {{{language}}}. Focus most content on deepTopicResearch. Keep painPointAnalysis and targetAudienceSuggestion very concise.`,
      });
      
      const {output} = await prompt(input, { model: input.model || routedModel });
      
      if (!output) {
        throw new Error('AI failed to generate research data.');
      }
      
      if (!output.deepTopicResearch || output.deepTopicResearch.length < 1500) {
        throw new Error('AI failed to generate complete research. Output was too short.');
      }
      
      if (!output.painPointAnalysis || output.painPointAnalysis.length < 100) {
        throw new Error('AI failed to generate pain point analysis.');
      }
      
      if (!output.targetAudienceSuggestion || output.targetAudienceSuggestion.length < 100) {
        throw new Error('AI failed to generate audience suggestions.');
      }
      
      return output;
    },
    RESEARCH_RETRY_CONFIG,
    context
  );
  
  await trackAIUsage(
    input.userId,
    result.deepTopicResearch + '\n' + result.painPointAnalysis + '\n' + result.targetAudienceSuggestion,
    'researchBookTopic',
    { topic: input.topic }
  );
  
  return result;
}
