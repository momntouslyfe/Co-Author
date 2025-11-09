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
  outlineA: z.string().describe('The first detailed outline of the book, labeled "Outline A".'),
  outlineB: z.string().describe('The second detailed outline of the book, labeled "Outline B".'),
  outlineC: z.string().describe('The third detailed outline of the book, labeled "Outline C".'),
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
  prompt: `You are an expert book outline generator. Your task is to create THREE (3) distinct, detailed, and professional book outlines based on the user's inputs. Label them "Outline A", "Outline B", and "Outline C".

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

**CRITICAL INSTRUCTIONS FOR EACH OUTLINE:**
1.  **Strict Markdown Formatting:** You MUST use Markdown for structuring the outlines.
    *   **Parts:** Use \`##\` for Part titles (e.g., \`## Part 1: The Setup\`).
    *   **Chapters:** Use \`###\` for Chapter titles (e.g., \`### Chapter 1: The Ordinary World\`).
    *   **Chapter Description:** After the chapter title, provide a single, concise, italicized sentence describing the chapter's purpose (e.g., *This chapter introduces the protagonist's normal life before the adventure begins.*).
    *   **Sub-topics:** Use a hyphen-based unordered list (\`-\`) for the sub-topics within each chapter.

2.  **Structure Requirements:**
    *   Each outline MUST be divided into 3 to 5 "Parts".
    *   Each outline MUST contain a total of 12 to 15 "Chapters".
    *   Each Chapter MUST contain 4 to 6 detailed sub-topics (talking points).

3.  **Content Rules:**
    *   Be an outliner, not a writer. The output must be a structural outline only.
    *   Sub-topics should be short phrases or questions. Do NOT write paragraphs for sub-topics.
    *   Ensure each of the three outlines (A, B, and C) offers a genuinely different angle or structure for the book.

**Example Structure for ONE outline:**

## Part 1: The Call to Adventure
### Chapter 1: The Ordinary World
*This chapter establishes the hero's mundane life and introduces their defining characteristics.*
- The hero's daily routine
- A glimpse of the hero's core desire or dissatisfaction
- Introduction of a key relationship (family, friend, mentor)
- Foreshadowing of the coming conflict

### Chapter 2: The Inciting Incident
*A specific event that disrupts the hero's world and sets the story in motion.*
- The arrival of a messenger or a discovery
- The hero's initial reaction: disbelief or fear
- The stakes of the conflict are revealed
- The hero is faced with a choice

Return ONLY the three formatted, concise outlines, following all rules precisely.
`,
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
