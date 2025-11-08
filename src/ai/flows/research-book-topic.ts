'use server';

/**
 * @fileOverview AI topic research assistant to perform deep topic research, pain point analysis, and get target audience suggestions, tailored to a specific language and market.
 *
 * - researchBookTopic - A function that handles the book topic research process.
 * - ResearchBookTopicInput - The input type for the researchBookTopic function.
 * - ResearchBookTopicOutput - The return type for the researchBookTopic function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ResearchBookTopicInputSchema = z.object({
  topic: z.string().describe('The topic to research.'),
  language: z.string().describe('The language for the research results (e.g., "English", "Bangla").'),
  targetMarket: z.string().optional().describe('The specific target market for the research (e.g., "USA", "Bangladesh").'),
});
export type ResearchBookTopicInput = z.infer<typeof ResearchBookTopicInputSchema>;

const ResearchBookTopicOutputSchema = z.object({
  deepTopicResearch: z.string().describe('In-depth research on the topic.'),
  painPointAnalysis: z.string().describe('Analysis of the pain points related to the topic.'),
  targetAudienceSuggestion: z.string().describe('Suggestions for the target audience.'),
});
export type ResearchBookTopicOutput = z.infer<typeof ResearchBookTopicOutputSchema>;

export async function researchBookTopic(input: ResearchBookTopicInput): Promise<ResearchBookTopicOutput> {
  return researchBookTopicFlow(input);
}

const prompt = ai.definePrompt({
  name: 'researchBookTopicPrompt',
  input: {schema: ResearchBookTopicInputSchema},
  output: {schema: ResearchBookTopicOutputSchema},
  prompt: `You are an expert book research assistant. Your goal is to provide deep topic research, pain point analysis, and target audience suggestions for a given topic, tailored for a specific language and market.

  Topic: {{{topic}}}
  Language: {{{language}}}
  {{#if targetMarket}}Target Market: {{{targetMarket}}}{{/if}}

  Provide the following information in {{{language}}}:

  - Deep Topic Research: Conduct thorough research on the topic, covering various aspects and providing relevant insights.
  - Pain Point Analysis: Identify and analyze the pain points related to the topic for the specified target market, understanding the challenges and problems they face.
  - Target Audience Suggestion: Suggest the ideal target audience for a book on this topic within the given market, considering demographics, interests, and needs.

  Format the output as a JSON object with the specified keys.
  `,
});

const researchBookTopicFlow = ai.defineFlow(
  {
    name: 'researchBookTopicFlow',
    inputSchema: ResearchBookTopicInputSchema,
    outputSchema: ResearchBookTopicOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
