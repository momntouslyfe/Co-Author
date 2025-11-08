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
  prompt: `You are an expert book outline generator. Your task is to create a detailed but concise, structural book outline based on the user's inputs.

**Contextual Information:**
Core Idea: {{{topic}}}
Language: {{{language}}}
Storytelling Framework: {{{storytellingFramework}}}

{{#if researchProfile}}
**AI Research Profile Context:**
Use this research to ensure the outline's topics are relevant and valuable.
{{{researchProfile}}}
{{/if}}

{{#if styleProfile}}
**AI Writing Style Profile Context:**
Use this style profile to influence the tone of the chapter titles and descriptions.
{{{styleProfile}}}
{{/if}}

**CRITICAL INSTRUCTIONS:**
1.  **Structure Requirements:**
    *   The outline must contain **13 to 15 chapters**.
    *   Each chapter must contain **4 to 6 sub-topics**.

2.  **Be an Outliner, Not a Writer:** Your job is to create the skeleton of the book. The output must be a structural outline only.

3.  **Concise Descriptions:**
    *   Each chapter title should be followed by a very brief, one-sentence description.
    *   Each sub-topic should be a short phrase or a question, without a description.

4.  **Strict Formatting:**
    *   Use indentation and bullet points (hyphens or asterisks) to create a clear hierarchy (e.g., Parts, Chapters, sub-topics).
    *   Do NOT number the sub-topics (e.g., 1.1, 1.2).
    *   The final output should be ONLY the formatted outline and nothing else.

**Example Structure:**

Part 1: The Call to Adventure
  - Chapter 1: The Ordinary World
    - A brief, one-sentence description of the chapter's focus.
    - Sub-topic one
    - Sub-topic two
    - Sub-topic three
    - Sub-topic four

  - Chapter 2: The Inciting Incident
    - A brief, one-sentence description of the chapter's focus.
    - Sub-topic one
    - Sub-topic two
    - Sub-topic three
    - Sub-topic four
    - Sub-topic five

Return only the formatted, concise outline, following all rules precisely.`,
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
