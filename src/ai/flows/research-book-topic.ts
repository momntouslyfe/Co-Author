
'use server';

/**
 * @fileOverview AI topic research assistant to perform deep topic research, pain point analysis, and get target audience suggestions, tailored to a specific language and market.
 *
 * - researchBookTopic - A function that handles the book topic research process.
 * - ResearchBookTopicInput - The input type for the researchBookTopic function.
 * - ResearchBookTopicOutput - The return type for the researchBooktopic function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { ModelReference } from 'genkit/ai';

const ResearchBookTopicInputSchema = z.object({
  topic: z.string().describe('The topic to research.'),
  language: z.string().describe('The language for the research results (e.g., "English", "Bangla").'),
  targetMarket: z.string().optional().describe('The specific target market for the research (e.g., "USA", "Global Tech Industry").'),
  apiKey: z.string().optional().describe('The API key for the generative AI model.'),
  model: z.custom<ModelReference<any>>().optional().describe('The generative AI model to use.'),
});
export type ResearchBookTopicInput = z.infer<typeof ResearchBookTopicInputSchema>;

const ResearchBookTopicOutputSchema = z.object({
  deepTopicResearch: z.string().describe('Comprehensive research on the topic, including data, information, and insights. This will be used as a knowledge base for writing.'),
  painPointAnalysis: z.string().describe('Analysis of the pain points, challenges, and problems readers face related to the topic.'),
  targetAudienceSuggestion: z.string().describe('Suggestions for the ideal target audience, considering demographics, interests, and needs.'),
});
export type ResearchBookTopicOutput = z.infer<typeof ResearchBookTopicOutputSchema>;

export async function researchBookTopic(input: ResearchBookTopicInput): Promise<ResearchBookTopicOutput> {
  return researchBookTopicFlow(input);
}

const prompt = ai.definePrompt({
  name: 'researchBookTopicPrompt',
  input: {schema: ResearchBookTopicInputSchema},
  output: {schema: ResearchBookTopicOutputSchema},
  prompt: `You are an expert book research assistant. Your goal is to provide a "Comprehensive Topic Library" and a "Topic Market Analysis" for a given topic, tailored for a specific language and market.

  Topic: {{{topic}}}
  Language: {{{language}}}
  {{#if targetMarket}}Target Market: {{{targetMarket}}}{{/if}}

  Provide the following information in {{{language}}}:

  1.  **Deep Topic Research (for the "Comprehensive Topic Library"):**
      *   Conduct thorough research on the topic.
      *   Gather comprehensive data, key facts, relevant information, and cite potential research sources or papers.
      *   This information should be detailed enough to serve as a knowledge base for writing an entire book.

  2.  **Pain Point & Audience Analysis (for the "Topic Market Analysis"):**
      *   **Pain Point Analysis:** Identify and analyze the main pain points, challenges, and problems that readers in the target market face related to this topic. What are they trying to solve?
      *   **Target Audience Suggestion:** Based on the pain points, suggest the ideal target audience. Be specific (e.g., "University students struggling with time management," not just "students").

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
    const {output} = await prompt(input, { apiKey: input.apiKey, ...(input.model && { model: input.model }) });
    return output!;
  }
);
