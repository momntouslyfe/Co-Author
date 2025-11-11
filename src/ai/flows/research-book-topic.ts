
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
  prompt: `You are a world-class research analyst. Your task is to produce a "Comprehensive Topic Library" and a "Topic Market Analysis" that is exceptionally deep, comprehensive, and well-sourced.

  **Topic:** {{{topic}}}
  **Language:** {{{language}}}
  {{#if targetMarket}}**Target Market:** {{{targetMarket}}}{{/if}}

  ---

  ### Part 1: Comprehensive Topic Library

  **CRITICAL INSTRUCTIONS:**
  1.  **Go Deep:** Your research must be exhaustive. Cover the topic's history, key concepts, current state, primary actors or contributors, major debates, and future trends. Do not provide a surface-level overview.
  2.  **Structure and Formatting:** Present the information in a highly structured, readable format using Markdown. Use clear headings, subheadings, bullet points, and bold text to organize the data. This is not a single essay; it is a structured library of information.
  3.  **Source Integration (NON-NEGOTIABLE):** You MUST synthesize information from a wide array of sources, including academic papers, reputable news articles, industry reports, market data, and expert opinions. For every key fact, statistic, or significant claim, you MUST provide an inline citation, like this: [Source: link or publication name]. The quality and quantity of your sources are paramount. Aim for dozens, if not hundreds, of unique sources.
  4.  **Content Requirements:**
      *   **Key Data & Statistics:** Include relevant numbers, figures, and statistics with sources.
      *   **Expert Opinions:** Quote or paraphrase insights from leading experts in the field, citing them appropriately.
      *   **Case Studies/Examples:** Provide real-world examples or case studies to illustrate concepts.
      *   **Different Perspectives:** If there are debates or different schools of thought on the topic, present them fairly.

  ---

  ### Part 2: Topic Market Analysis

  **CRITICAL INSTRUCTIONS:**
  1.  **Pain Point Analysis:** Based on your deep research, identify and analyze the most significant pain points, challenges, and unanswered questions that people in the {{{targetMarket_or_default}}} have about this topic. What problems are they desperately trying to solve?
  2.  **Target Audience Suggestion:** Based on the pain points, create a detailed persona for the ideal target reader. Go beyond simple demographics. Include their goals, frustrations, and the "job" they would be "hiring" this book to do for them.

  ---

  You must provide the entire response in the specified **{{{language}}}**. Proceed with generating the two parts now.`,
});

const researchBookTopicFlow = ai.defineFlow(
  {
    name: 'researchBookTopicFlow',
    inputSchema: ResearchBookTopicInputSchema,
    outputSchema: ResearchBookTopicOutputSchema,
  },
  async input => {
    const {output} = await prompt(input, { ...(input.model && { model: input.model }) });
    return output!;
  }
);

