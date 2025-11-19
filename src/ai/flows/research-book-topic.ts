'use server';

/**
 * @fileOverview AI topic research assistant to perform deep topic research, pain point analysis, and get target audience suggestions, tailored to a specific language and market.
 *
 * - researchBookTopic - A function that handles the book topic research process.
 * - ResearchBookTopicInput - The input type for the researchBookTopic function.
 * - ResearchBookTopicOutput - The return type for the researchBooktopic function.
 */

import {z} from 'genkit';

import { getUserGenkitInstance } from '@/lib/genkit-user';

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

export async function researchBookTopic(input: ResearchBookTopicInput): Promise<ResearchBookTopicOutput> {
  const { ai, model } = await getUserGenkitInstance(input.userId, input.idToken);
  
  try {
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
  1.  **Go Deep:** Your research must be thorough. Cover the topic's history, key concepts, current state, and future trends. Include relevant data, statistics, and insights from leading experts.
  2.  **Structure and Formatting (NON-NEGOTIABLE):** Present all information in a highly structured, readable format using Markdown. Use clear headings, subheadings, bullet points, and bold text. This is a structured library, not an essay.
  3.  **References (NON-NEGOTIABLE):** At the end of this section, you MUST include a "References" heading followed by a bulleted list of all the source URLs you used for your research.

  ---

  ### Part 2: Topic Market Analysis

  **CRITICAL INSTRUCTIONS:**
  1.  **Pain Point Analysis:** Based on your research, identify and analyze the most significant pain points, challenges, and frustrations people in the target market have regarding this topic. Format this as a well-structured Markdown document.
  2.  **Target Audience Suggestions:** Based on the pain points, identify **5 to 7 distinct audience groups** who would benefit from a book on this topic. For each group, do not create a persona with a name. Instead, provide a clear description of the audience group, followed by a bulleted list of their specific **Goals** and **Frustrations** related to the topic. Format this as a well-structured Markdown document with clear headings for each audience group.

  ---

  You must provide the entire response in the specified **{{{language}}}**, organized into the three requested output fields: \`deepTopicResearch\`, \`painPointAnalysis\`, and \`targetAudienceSuggestion\`. Proceed with generating the two parts now.`,
    });
    
    const {output} = await prompt(input, { ...(input.model && { model: input.model }) });
    
    if (!output) {
      throw new Error('The AI did not return any research data. Please try again.');
    }
    
    return output;
  } catch (error: any) {
    console.error('Error in researchBookTopic:', error);
    
    if (error.message?.includes('503') || error.message?.includes('overloaded')) {
      throw new Error(
        'The AI service is currently overloaded. Please wait a moment and try again.'
      );
    }
    
    if (error.message?.includes('401') || error.message?.includes('Unauthorized') || error.message?.includes('API key')) {
      throw new Error(
        'Your API key appears to be invalid or expired. Please check your API key in Settings.'
      );
    }
    
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      throw new Error(
        'You have exceeded your API quota. Please check your usage limits or try again later.'
      );
    }
    
    throw new Error(error.message || 'An unexpected error occurred while researching the topic. Please try again.');
  }
}
