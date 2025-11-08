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
  styleProfile: z.string().optional().describe('An optional, pre-existing writing style profile providing context on the desired writing style.'),
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
  prompt: `You are an expert book outline generator. Your task is to create a detailed and distinct book outline in the format of a proper book outline, based on the user's core idea, chosen language, storytelling framework, and any provided contextual profiles.

**Contextual Information:**
Core Idea: {{{topic}}}
Language: {{{language}}}
Storytelling Framework: {{{storytellingFramework}}}

{{#if researchProfile}}
**AI Research Profile Context:**
This research provides market analysis, audience pain points, and deep topic insights. Use it to ensure the outline is relevant and valuable.
{{{researchProfile}}}
{{/if}}

{{#if styleProfile}}
**AI Writing Style Profile Context:**
This style profile defines the tone, voice, and stylistic elements the final book should have. The outline's chapter titles and descriptions should reflect this style.
{{{styleProfile}}}
{{/if}}


Based on all the provided information, generate a comprehensive book outline.

**CRITICAL INSTRUCTIONS:**
1.  **Adhere to the Storytelling Framework:** The outline's structure MUST strictly follow the principles of the selected "{{{storytellingFramework}}}".
2.  **Integrate All Context:** You must synthesize the Core Idea with the Research Profile and the Style Profile to create a cohesive and targeted outline.
3.  **Formatting Rules:**
    *   The outline must be well-structured and logical.
    *   Use indentation and bullet points (like hyphens or asterisks) to create a clear hierarchy for Parts, Chapters, and sub-points.
    *   **Do NOT number the subtopics.** For example, use "Part 1: The Beginning" and then indented bullet points, not "1.1, 1.2, etc."
    *   Ensure the output is only the generated outline.

**Example Structure (for The Hero's Journey):**

Part 1: The Call to Adventure
  - Chapter 1: The Ordinary World
    - Introduction to the hero and their daily life.
    - Foreshadowing of the conflict, reflecting the tone from the style guide.
  - Chapter 2: The Inciting Incident
    - The event that disrupts the hero's life, framed by the pain points from the research.

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
