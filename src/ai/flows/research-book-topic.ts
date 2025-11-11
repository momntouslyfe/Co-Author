
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
  deepTopicResearch: z.string().describe('Comprehensive research on the topic, presented in well-structured Markdown format.'),
  painPointAnalysis: z.string().describe('Analysis of the pain points, challenges, and problems readers face, presented in well-structured Markdown.'),
  targetAudienceSuggestion: z.string().describe('Suggestions for the ideal target audience, presented in well-structured Markdown.'),
});
export type ResearchBookTopicOutput = z.infer<typeof ResearchBookTopicOutputSchema>;

export async function researchBookTopic(input: ResearchBookTopicInput): Promise<ResearchBookTopicOutput> {
  return researchBookTopicFlow(input);
}

const prompt = ai.definePrompt({
  name: 'researchBookTopicPrompt',
  input: {schema: ResearchBookTopicInputSchema},
  output: {schema: ResearchBookTopicOutputSchema},
  prompt: `You are a world-class research analyst. Your task is to produce a "Comprehensive Topic Library" and a "Topic Market Analysis" that is deep, comprehensive, and well-structured.

  **Topic:** {{{topic}}}
  **Language:** {{{language}}}
  {{#if targetMarket}}**Target Market:** {{{targetMarket}}}{{/if}}

  ---

  ### Part 1: Comprehensive Topic Library

  **CRITICAL INSTRUCTIONS:**
  1.  **Go Deep:** Your research must be thorough. Cover the topic's history, key concepts, current state, and future trends.
  2.  **Structure and Formatting (NON-NEGOTIABLE):** Present all information in a highly structured, readable format using Markdown. Use clear headings, subheadings, bullet points, and bold text to organize the data. This is not a single essay; it is a structured library of information.
  3.  **Content Requirements:**
      *   Include relevant key data and statistics.
      *   Paraphrase insights from leading experts in the field.
      *   Provide real-world examples or case studies to illustrate concepts.

  ---

  ### Part 2: Topic Market Analysis

  **CRITICAL INSTRUCTIONS:**
  1.  **Pain Point Analysis:** Based on your research, identify and analyze the most significant pain points and challenges people in the target market have regarding this topic. Format this as a well-structured Markdown document.
  2.  **Target Audience Suggestion:** Based on the pain points, create a detailed persona for the ideal target reader. Go beyond simple demographics. Include their goals, frustrations, and what they hope to achieve by reading a book on this topic. Format this as a well-structured Markdown document.

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
