'use server';

/**
 * @fileOverview This file defines a Genkit flow for analyzing a user's writing style from a text file or PDF.
 *
 * The flow takes a file, extracts the text, analyzes its stylistic elements (tone, voice, vocabulary, etc.),
 * and returns a detailed analysis.
 *
 * @exported analyzeWritingStyle - A function that analyzes a given writing sample file.
 * @exported AnalyzeWritingStyleInput - The input type for the analyzeWritingStyle function.
 * @exported AnalyzeWritingStyleOutput - The return type for the analyzeWritingStyle function.
 */

import {z} from 'genkit';

import { getGenkitInstanceForFunction } from '@/lib/genkit-admin';
import { trackAIUsage, preflightCheckWordCredits } from '@/lib/credit-tracker';
import { retryWithBackoff } from '@/lib/retry-utils';

const AnalyzeWritingStyleInputSchema = z.object({
    userId: z.string().describe('The user ID for API key retrieval.'),
    idToken: z.string().describe('Firebase ID token for authentication verification.'),
    fileDataUri: z.string().describe("A writing sample as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'. Supported file types are .txt and .pdf."),
    model: z.string().optional().describe('The generative AI model to use.'),
});
export type AnalyzeWritingStyleInput = z.infer<typeof AnalyzeWritingStyleInputSchema>;

const AnalyzeWritingStyleOutputSchema = z.object({
  styleAnalysis: z.string().describe('A detailed analysis of the writing style, including tone, voice, sentence structure, vocabulary, rhythm, code-mixing, and other stylistic elements.'),
});
export type AnalyzeWritingStyleOutput = z.infer<typeof AnalyzeWritingStyleOutputSchema>;

const STYLE_ANALYSIS_RETRY_CONFIG = {
  maxRetries: 4,
  initialDelayMs: 3000,
  maxDelayMs: 90000,
  backoffMultiplier: 2.5,
};

export async function analyzeWritingStyle(input: AnalyzeWritingStyleInput): Promise<AnalyzeWritingStyleOutput> {
  await preflightCheckWordCredits(input.userId, 1000);
  
  const context = 'Writing Style Analysis';
  
  const result = await retryWithBackoff(
    async () => {
      const { ai, model: routedModel } = await getGenkitInstanceForFunction('style_analysis', input.userId, input.idToken);
      
      const prompt = ai.definePrompt({
        name: 'analyzeWritingStylePrompt',
        input: {schema: AnalyzeWritingStyleInputSchema},
        output: {schema: AnalyzeWritingStyleOutputSchema},
        prompt: `You are an expert writing analyst. Your task is to first extract the text from the following file, and then perform a deep analysis of the WRITING STYLE ONLY.

  File: {{media url=fileDataUri}}

  **CRITICAL - COMPLETE OUTPUT REQUIRED:**
  - You MUST generate a COMPLETE, FULL style analysis covering ALL 8 dimensions below
  - NEVER stop mid-section or mid-analysis
  - NEVER generate partial content - this is considered a FAILURE
  - Each dimension must be thoroughly analyzed with multiple examples
  - Minimum 1200-1500 words for the entire analysis
  - If you feel like stopping early, you MUST continue until ALL sections are complete

  **CRITICAL INSTRUCTION - READ CAREFULLY:**
  You are analyzing the WRITING STYLE and providing concrete examples from the original text to demonstrate each stylistic element. This analysis will help users understand their unique writing patterns.
  
  ✅ REQUIRED - Include specific quotes and phrases from the sample text as examples
  ✅ REQUIRED - Show concrete examples that demonstrate each stylistic characteristic
  ✅ REQUIRED - For non-English text, provide the original phrase and its translation in parentheses
  ✅ REQUIRED - Explain HOW these examples demonstrate the particular stylistic element
  
  **FORMATTING RULES:**
  - For each point in the listicle, provide a clear heading and detailed explanation
  - Include 2-4 concrete examples from the original text to support each stylistic observation
  - For non-English examples, format as: "original phrase" (translation)
  - Ensure there is a blank line (a double newline) between each numbered list item to add space and improve readability
  - Keep paragraphs within each section concise. If a point requires a longer explanation, break it into smaller paragraphs with a blank line between them
  - Use bullet points with specific examples when demonstrating patterns

  **Analyze ALL of the following stylistic dimensions (ALL 8 ARE REQUIRED):**

  1.  **Tone & Mood:** Describe the overall emotional quality and atmosphere. Include specific sentences or phrases from the text that exemplify this tone. Quote exact words and explain why they create this particular mood.

  2.  **Voice:** Describe the narrator's personality and point of view. Include specific phrases that demonstrate the author's voice, particularly any distinctive language patterns (e.g., first-person pronouns, direct address, etc.). For non-English text, provide both the original and translation.

  3.  **Sentence Structure & Rhythm:** Examine the sentence patterns and flow. Provide 2-3 example sentences from the text that demonstrate the typical structure. Note patterns like short vs. long sentences, simple vs. complex constructions, and any rhythmic qualities.

  4.  **Vocabulary & Diction:** Assess the word choice patterns with concrete examples. Quote specific words, phrases, colloquialisms, or specialized terms used. For non-English text, provide translations. Categorize the vocabulary level and explain what makes it distinctive.

  5.  **Pacing:** Describe how information is delivered. Reference specific passages that show the pacing style. Quote phrases that demonstrate whether the writing moves quickly or deliberately.

  6.  **Code-Mixing Analysis:** (Include this section ONLY if the text contains multiple languages)
     Provide a detailed analysis with specific examples:
     - **List concrete examples** of code-mixed phrases with translations
     - **Explain the purpose** of each code-mixed element (e.g., "emphasizes X concept", "adds authenticity", "technical precision")
     - **Identify patterns** in when and why code-mixing occurs
     - **Format examples as:** "original phrase in Language A" (translation) - purpose/effect
     Example format:
     • **Several Gaps & Modern Conduct:** English terms like "X" or "Y" are used for [specific purpose]
     • **Emphasis & Directness:** Certain phrases integrate English such as "specific example" - [explanation of effect]

  7.  **Distinctive Stylistic Elements:** Note any unique characteristics with specific examples. Quote rhetorical questions, repeated phrases, metaphors, or other distinctive techniques actually used in the text.

  8.  **Overall Summary:** Summarize the author's unique writing identity based on the concrete patterns observed. Reference the key stylistic elements identified above with brief examples.

  **FINAL CHECK BEFORE RESPONDING:** Ensure your analysis covers ALL 8 dimensions above with detailed examples from the text. Partial or truncated analysis is unacceptable.

  Return only the detailed analysis, following all formatting rules.`,
      });
      
      const {output} = await prompt(
        { fileDataUri: input.fileDataUri, userId: input.userId, idToken: input.idToken },
        { model: input.model || routedModel, config: { maxOutputTokens: 8000 } }
      );
      
      if (!output || !output.styleAnalysis) {
        throw new Error('AI failed to generate style analysis.');
      }
      
      if (output.styleAnalysis.length < 1200) {
        throw new Error('AI failed to generate complete style analysis. Output was too short.');
      }
      
      return output;
    },
    STYLE_ANALYSIS_RETRY_CONFIG,
    context
  );
  
  await trackAIUsage(
    input.userId,
    result.styleAnalysis,
    'analyzeWritingStyle',
    {}
  );
  
  return result;
}
