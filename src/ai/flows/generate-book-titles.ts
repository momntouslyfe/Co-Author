'use server';

/**
 * @fileOverview Book title generator AI agent.
 *
 * - generateBookTitles - A function that handles the book title generation process.
 * - GenerateBookTitlesInput - The input type for the generateBookTitles function.
 * - GenerateBookTitlesOutput - The return type for the generateBookTitles function.
 */

import {z} from 'genkit';

import { getUserGenkitInstance } from '@/lib/genkit-user';

const GenerateBookTitlesInputSchema = z.object({
  userId: z.string().describe('The user ID for API key retrieval.'),
  idToken: z.string().describe('Firebase ID token for authentication verification.'),
  outline: z.string().describe('The complete and finalized book outline (Master Blueprint).'),
  language: z.string().describe('The language for the titles.'),
  storytellingFramework: z.string().optional().describe('The storytelling framework used for the book (e.g., The Hero\'s Journey).'),
  model: z.string().optional().describe('The generative AI model to use.'),
});
export type GenerateBookTitlesInput = z.infer<
  typeof GenerateBookTitlesInputSchema
>;

const GenerateBookTitlesOutputSchema = z.object({
  titles: z.array(z.string()).describe('An array of 10-15 catchy, conversion-focused book titles.'),
});
export type GenerateBookTitlesOutput = z.infer<
  typeof GenerateBookTitlesOutputSchema
>;

export async function generateBookTitles(
  input: GenerateBookTitlesInput
): Promise<GenerateBookTitlesOutput> {
  const { ai, model } = await getUserGenkitInstance(input.userId, input.idToken);
  
  try {
    const prompt = ai.definePrompt({
      name: 'generateBookTitlesPrompt',
      input: {schema: GenerateBookTitlesInputSchema},
      output: {schema: GenerateBookTitlesOutputSchema},
      prompt: `You are an expert copywriter specializing in crafting compelling, money-making book titles. Your task is to generate 10-15 catchy and conversion-focused titles based on the provided book outline. The titles should be in the specified language.

**CONTEXT:**
-   Language for the book: {{{language}}}
{{#if storytellingFramework}}-   Storytelling Framework: {{{storytellingFramework}}}{{/if}}

**CRITICAL INSTRUCTIONS:**
-   Analyze the entire outline to understand the book's core themes, target audience, and unique selling points.
-   Create titles that are memorable, intriguing, and clearly communicate the book's value.
{{#if storytellingFramework}}-   Consider the storytelling framework ({{{storytellingFramework}}}) when crafting titles that resonate with the book's structure.{{/if}}
-   Ensure the titles are in the requested language: {{{language}}}.
-   Do not add any labels, numbers, or prefixes to the titles. Return only a clean array of title strings.

**Book Outline:**
{{{outline}}}
`,
    });
    
    const {output} = await prompt(input, { ...(input.model && { model: input.model }) });
    
    if (!output || !output.titles || output.titles.length === 0) {
      throw new Error('The AI did not return any title suggestions. Please try again.');
    }
    
    return output;
  } catch (error: any) {
    console.error('Error in generateBookTitles:', error);
    
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
    
    throw new Error(error.message || 'An unexpected error occurred while generating titles. Please try again.');
  }
}
