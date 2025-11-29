
'use server';

/**
 * @fileOverview Book blueprint generator AI agent.
 *
 * - generateBookBlueprint - A function that handles the book blueprint generation process.
 * - GenerateBookBlueprintInput - The input type for the generateBookBlueprint function.
 * - GenerateBookBlueprintOutput - The return type for the generateBookBlueprint function.
 */

import {z} from 'genkit';

import { getGenkitInstanceForFunction } from '@/lib/genkit-admin';
import { trackAIUsage, preflightCheckWordCredits } from '@/lib/credit-tracker';

const GenerateBookBlueprintInputSchema = z.object({
  userId: z.string().describe('The user ID for API key retrieval.'),
  idToken: z.string().describe('Firebase ID token for authentication verification.'),
  topic: z.string().describe('The core idea or topic of the book.'),
  language: z.string().describe('The language the book will be written in.'),
  storytellingFramework: z.string().describe('The storytelling framework to structure the book (e.g., The Hero\'s Journey).'),
  researchProfile: z.string().optional().describe('An optional, pre-existing AI research profile providing context.'),
  styleProfile: z.string().optional().describe('An optional, pre-existing writing style profile providing context on the desired writing style.'),
  authorProfile: z.string().optional().describe('An optional author profile providing context about the author\'s background, credentials, and expertise.'),
  model: z.string().optional().describe('The generative AI model to use.'),
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
  await preflightCheckWordCredits(input.userId, 1500);
  
  // Log what the AI flow actually receives
  console.log('AI Flow - Blueprint Generation Input:', {
    topic: input.topic,
    topicPreview: input.topic?.substring(0, 100),
    language: input.language,
    storytellingFramework: input.storytellingFramework,
    hasResearchProfile: !!input.researchProfile,
    researchProfileLength: input.researchProfile?.length || 0,
    researchProfilePreview: input.researchProfile?.substring(0, 200),
    hasStyleProfile: !!input.styleProfile,
    styleProfileLength: input.styleProfile?.length || 0,
    styleProfilePreview: input.styleProfile?.substring(0, 200),
    hasAuthorProfile: !!input.authorProfile,
    authorProfileLength: input.authorProfile?.length || 0,
    authorProfilePreview: input.authorProfile?.substring(0, 200),
  });
  
  const { ai, model: routedModel } = await getGenkitInstanceForFunction('blueprint', input.userId, input.idToken);
  
  try {
    const prompt = ai.definePrompt({
      name: 'generateBookBlueprintPrompt',
      input: {schema: GenerateBookBlueprintInputSchema},
      output: {schema: GenerateBookBlueprintOutputSchema},
      prompt: `You are an expert book outline generator. Your task is to create THREE (3) distinct, detailed, and professional book outlines based on the user's specific inputs below. Label them "Outline A", "Outline B", and "Outline C".

**CRITICAL: You MUST base your outlines on ALL the contextual information provided below. Do NOT create generic outlines. Use the specific details from the Core Idea, Research Profile, and Style Profile to create highly relevant and personalized book structures.**

**Core Contextual Information:**
- Core Idea/Topic: {{{topic}}}
- Language for the book: {{{language}}}
- Storytelling Framework to follow: {{{storytellingFramework}}}

{{#if researchProfile}}
**Research Profile Context (MUST USE THIS DATA):**
The following research provides deep insights into the target audience, their pain points, and relevant topics. Your outlines MUST incorporate these insights and address the pain points identified:
{{{researchProfile}}}
{{/if}}

{{#if styleProfile}}
**Writing Style Guidance (STYLE ONLY - NOT CONTENT):**
The following style profile describes HOW to write, NOT WHAT to write about. Apply this writing style (tone, voice, sentence patterns, vocabulary level, etc.) to your chapter titles and descriptions. DO NOT use any topics or content mentioned in the style profile - focus solely on mimicking the stylistic characteristics:
{{{styleProfile}}}
{{/if}}

{{#if authorProfile}}
**Author Profile Context:**
The following provides context about the author's background, credentials, and expertise. Use this to tailor the book's perspective, establish credibility, and align the content with the author's unique voice and authority:
{{{authorProfile}}}
{{/if}}

**CRITICAL INSTRUCTIONS FOR EACH OUTLINE:**
1.  **LANGUAGE (NON-NEGOTIABLE):** You MUST write the ENTIRE blueprint in **{{{language}}}**. This includes:
    *   ALL Part titles
    *   ALL Chapter titles
    *   ALL Chapter descriptions
    *   ALL Sub-topics
    *   Everything except the labels "Outline A", "Outline B", and "Outline C" must be in {{{language}}}.

2.  **Strict Markdown Formatting:** You MUST use Markdown for structuring the outlines.
    *   **Introduction Chapter:** Use \`### Introduction:\` followed by a catchy title (BEFORE any Part). This is a standalone chapter, NOT inside any Part.
    *   **Parts:** Use \`##\` for Part titles (e.g., \`## Part 1: The Setup\`).
    *   **Chapters:** Use \`###\` for Chapter titles (e.g., \`### Chapter 1: The Ordinary World\`).
    *   **Chapter Description:** After the chapter title, provide a single, concise, italicized sentence describing the chapter's purpose (e.g., *This chapter introduces the protagonist's normal life before the adventure begins.*).
    *   **Sub-topics:** Use a hyphen-based unordered list (\`-\`) for the sub-topics within each chapter.
    *   **Conclusion Chapter:** Use \`### Conclusion:\` followed by a catchy title (AFTER all Parts). This is a standalone chapter, NOT inside any Part.

3.  **Structure Requirements:**
    *   Each outline MUST start with an **Introduction** chapter (standalone, before Part 1).
    *   Each outline MUST be divided into 3 to 5 "Parts".
    *   Each outline MUST contain a total of 12 to 15 "Chapters" (excluding Introduction and Conclusion).
    *   Each outline MUST end with a **Conclusion** chapter (standalone, after the last Part).
    *   Each Chapter MUST contain 4 to 6 detailed sub-topics (talking points).

4.  **Introduction Chapter Sub-topics (REQUIRED):**
    The Introduction chapter MUST include sub-topics covering:
    *   Who this book is for (target reader)
    *   What the reader will learn or gain
    *   How to get the most from this book
    *   The author's promise or unique perspective

5.  **Conclusion Chapter Sub-topics (REQUIRED):**
    The Conclusion chapter MUST include sub-topics covering:
    *   Key takeaways recap
    *   Action plan or next steps for the reader
    *   Resources for continued growth (optional)
    *   Final words of encouragement or call to action

6.  **Content Rules:**
    *   Be an outliner, not a writer. The output must be a structural outline only.
    *   Sub-topics should be short phrases or questions. DO NOT write paragraphs for sub-topics.
    *   Ensure each of the three outlines (A, B, and C) offers a genuinely different angle or structure for the book.

**Example Structure for ONE outline:**

### Introduction: Your Journey Begins Here
*This chapter welcomes readers and sets expectations for the transformative journey ahead.*
- Who this book is written for
- The promise: what you will achieve by the end
- How to read and apply this book
- A personal note from the author

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

### Conclusion: Your New Beginning
*This chapter brings closure and empowers readers to take action.*
- The key lessons from your journey
- Your personalized action plan
- Staying connected and continuing growth
- Final words of encouragement

Return ONLY the three formatted, concise outlines, following all rules precisely.
`,
    });
    
    const {output} = await prompt(input, { model: input.model || routedModel });
    
    if (!output) {
      throw new Error('The AI did not return any blueprint data. Please try again.');
    }
    
    await trackAIUsage(
      input.userId,
      output.outlineA + '\n' + output.outlineB + '\n' + output.outlineC,
      'generateBookBlueprint',
      { topic: input.topic }
    );
    
    return output;
  } catch (error: any) {
    console.error('Error in generateBookBlueprint:', error);
    
    // Handle specific error types with user-friendly messages
    if (error.message?.includes('503') || error.message?.includes('overloaded')) {
      throw new Error(
        'The AI service is currently overloaded. Please wait a moment and try again. ' +
        'This is a temporary issue with Google\'s servers.'
      );
    }
    
    if (error.message?.includes('401') || error.message?.includes('Unauthorized') || error.message?.includes('API key')) {
      throw new Error(
        'Your API key appears to be invalid or expired. Please check your API key in Settings and try again.'
      );
    }
    
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      throw new Error(
        'You have exceeded your API quota. Please check your Google AI usage limits or try again later.'
      );
    }
    
    if (error.message?.includes('Schema validation')) {
      throw new Error(
        'The AI returned an unexpected format. This could be due to API rate limits. Please try again in a moment.'
      );
    }
    
    // Re-throw with original message if we don't have a specific handler
    throw new Error(error.message || 'An unexpected error occurred while generating blueprints. Please try again.');
  }
}
