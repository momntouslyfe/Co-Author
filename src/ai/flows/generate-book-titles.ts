
'use server';

/**
 * @fileOverview Book title generator AI agent.
 *
 * - generateBookTitles - A function that handles the book title generation process.
 * - GenerateBookTitlesInput - The input type for the generateBookTitles function.
 * - GenerateBookTitlesOutput - The return type for the generateBookTitles function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { ModelReference } from 'genkit/ai';

const GenerateBookTitlesInputSchema = z.object({
  outline: z.string().describe('The complete and finalized book outline (Master Blueprint).'),
  language: z.string().describe('The language for the titles.'),
  model: z.custom<ModelReference<any>>().optional().describe('The generative AI model to use.'),
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
  return generateBookTitlesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateBookTitlesPrompt',
  input: {schema: GenerateBookTitlesInputSchema},
  output: {schema: GenerateBookTitlesOutputSchema},
  prompt: `You are an expert copywriter specializing in crafting compelling, money-making book titles. Your task is to generate 10-15 catchy and conversion-focused titles based on the provided book outline. The titles should be in the specified language.

**CRITICAL INSTRUCTIONS:**
-   Analyze the entire outline to understand the book's core themes, target audience, and unique selling points.
-   Create titles that are memorable, intriguing, and clearly communicate the book's value.
-   Ensure the titles are in the requested language: {{{language}}}.
-   Do not add any labels, numbers, or prefixes to the titles. Return only a clean array of title strings.

**Book Outline:**
{{{outline}}}
`,
});

const generateBookTitlesFlow = ai.defineFlow(
  {
    name: 'generateBookTitlesFlow',
    inputSchema: GenerateBookTitlesInputSchema,
    outputSchema: GenerateBookTitlesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input, { ...(input.model && { model: input.model }) });
    return output!;
  }
);
