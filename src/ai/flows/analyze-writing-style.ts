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
import { withAIErrorHandling } from '@/lib/ai-error-handler';

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
  return withAIErrorHandling(async () => {
    await preflightCheckWordCredits(input.userId, 1000);
    
    const context = 'Writing Style Analysis';
    
    const result = await retryWithBackoff(
    async () => {
      const { ai, model: routedModel } = await getGenkitInstanceForFunction('style_analysis', input.userId, input.idToken);
      
      const prompt = ai.definePrompt({
        name: 'analyzeWritingStylePrompt',
        input: {schema: AnalyzeWritingStyleInputSchema},
        output: {schema: AnalyzeWritingStyleOutputSchema},
        config: {
          maxOutputTokens: 8000,
          temperature: 0.7,
        },
        prompt: `You are an expert writing analyst. Extract text from the file and analyze its WRITING STYLE.

File: {{media url=fileDataUri}}

Generate a comprehensive style analysis (1000-1200 words) following this EXACT format:

Start with 2-3 sentences summarizing the overall writing style, tone, and approach.

**1. Tone & Mood:**
Describe the emotional quality and atmosphere. Then provide:
*   **Illustrative Phrases:**
    *   "quote from text" (translation if non-English) - Explain what this phrase conveys.
    *   "another quote" (translation) - Explain its effect on mood.

**2. Voice:**
Describe the narrator's personality and point of view. Then provide:
*   **Illustrative Phrases:**
    *   "quote from text" (translation) - Explain how it shows the author's voice.
    *   "another quote" (translation) - Explain its significance.

**3. Sentence Structure & Rhythm:**
Describe sentence patterns and flow. Then provide:
*   **Illustrative Sentences:**
    *   "example sentence" (translation) - Explain the structure.
    *   "another sentence" (translation) - Note the rhythm.

**4. Vocabulary & Diction:**
Describe word choice patterns. Then provide:
*   **Illustrative Examples:**
    *   List specific words/phrases with translations showing vocabulary level.
    *   Note any technical terms, colloquialisms, or distinctive word choices.

**5. Pacing:**
Describe how information is delivered. Then provide:
*   **Illustrative Passages:**
    *   Reference specific passages showing pacing style.

**6. Code-Mixing Analysis:**
If multiple languages are present, analyze with examples. If single language, write "The text is written in a single language without code-mixing."
*   **Concrete Examples:** (if applicable)
    *   "mixed phrase" (translation) - Explain purpose.

**7. Distinctive Stylistic Elements:**
Note unique characteristics with examples:
*   **Rhetorical Questions:** Quote examples if present.
*   **Metaphors/Analogies:** Quote examples if present.
*   **Other Techniques:** Note any other distinctive elements.

Complete ALL 7 sections with specific examples from the text.`,
      });
      
      const {output} = await prompt(
        { fileDataUri: input.fileDataUri, userId: input.userId, idToken: input.idToken },
        { model: input.model || routedModel }
      );
      
      if (!output || !output.styleAnalysis) {
        throw new Error('AI failed to generate style analysis.');
      }
      
      const analysis = output.styleAnalysis;
      
      const requiredSections = [
        /\*\*1\.\s*Tone\s*&?\s*Mood/i,
        /\*\*2\.\s*Voice/i,
        /\*\*3\.\s*Sentence\s*Structure/i,
        /\*\*4\.\s*Vocabulary/i,
        /\*\*5\.\s*Pacing/i,
        /\*\*6\.\s*Code[-\s]?Mixing/i,
        /\*\*7\.\s*Distinctive/i,
      ];
      
      const missingSections = requiredSections.filter(regex => !regex.test(analysis));
      
      if (missingSections.length > 0) {
        throw new Error(`AI failed to generate complete style analysis. Missing ${missingSections.length} section(s). Retrying...`);
      }
      
      if (analysis.length < 800) {
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
  }, 'writing style analysis');
}
