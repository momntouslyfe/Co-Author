'use server';

/**
 * @fileOverview Book blueprint generator AI agent.
 *
 * - generateBookBlueprint - A function that handles the book blueprint generation process.
 * - GenerateBookBlueprintInput - The input type for the generateBookBlueprint function.
 * - GenerateBookBlueprintOutput - The return type for the generateBookBlueprint function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateBookBlueprintInputSchema = z.object({
  topic: z.string().describe('The core idea or topic of the book.'),
  language: z.string().describe('The language the book will be written in.'),
  storytellingFramework: z.string().describe('The storytelling framework to structure the book (e.g., The Hero\'s Journey).'),
  researchProfile: z.string().optional().describe('An optional, pre-existing AI research profile providing context.'),
});
export type GenerateBookBlueprintInput = z.infer<
  typeof GenerateBookBlueprintInputSchema
>;

const GenerateBookBlueprintOutputSchema = z.object({
  outline: z.string().describe('The detailed outline of the book.'),
});
export type GenerateBookBlueprintOutput = z.infer<
  typeof GenerateBookBlueprintOutputSchema
>;

export async function generateBookBlueprint(
  input: GenerateBookBlueprintInput
): Promise<GenerateBookBlueprintOutput> {
  return generateBookBlueprintFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateBookBlueprintPrompt',
  input: {schema: GenerateBookBlueprintInputSchema},
  output: {schema: GenerateBookBlueprintOutputSchema},
  prompt: `You are an expert book outline generator. Your task is to create a detailed and distinct book outline in the format of a proper book outline, based on the user's core idea, chosen language, and storytelling framework.

Core Idea: {{{topic}}}
Language: {{{language}}}
Storytelling Framework: {{{storytellingFramework}}}

{{#if researchProfile}}
AI Research Profile Context:
{{{researchProfile}}}
{{/if}}

Based on all the provided information, generate a comprehensive book outline.

**IMPORTANT FORMATTING RULES:**
- The outline must be well-structured and logical, following the principles of the selected storytelling framework.
- Use indentation and bullet points (like hyphens or asterisks) to create a clear hierarchy.
- **Do NOT number the subtopics.** For example, use "Part 1: The Beginning" and then indented bullet points for chapters or sections within that part, not "1.1, 1.2, etc."
- Ensure the output is only the generated outline.

**Example Structure:**

Part 1: The Call to Adventure
  - Chapter 1: The Ordinary World
    - Introduction to the hero and their daily life.
    - Foreshadowing of the conflict.
  - Chapter 2: The Inciting Incident
    - The event that disrupts the hero's life.

Part 2: The Road of Trials
  - Chapter 3: Crossing the Threshold
    - The hero commits to the journey.
  - Chapter 4: Tests, Allies, and Enemies
    - The hero faces initial challenges and meets key characters.

Return only the formatted outline.`, 
});

const generateBookBlueprintFlow = ai.defineFlow(
  {
    name: 'generateBookBlueprintFlow',
    inputSchema: GenerateBookBlueprintInputSchema,
    outputSchema: GenerateBookBlueprintOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
