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
        config: {
          maxOutputTokens: 8000,
          temperature: 0.7,
        },
        prompt: `You are a writing analyst. Extract text from the file and analyze its WRITING STYLE.

File: {{media url=fileDataUri}}

Generate a style analysis (1000-1200 words total) with ALL 8 sections below.

## SECTION 1: Tone & Mood (120-150 words)
Emotional quality and atmosphere. Include 2 quotes from the text.

## SECTION 2: Voice (120-150 words)
Narrator's personality and point of view. Include 2 example phrases.

## SECTION 3: Sentence Structure & Rhythm (120-150 words)
Sentence patterns and flow. Provide 2 example sentences.

## SECTION 4: Vocabulary & Diction (120-150 words)
Word choice patterns with examples. Quote specific words or phrases.

## SECTION 5: Pacing (80-100 words)
Information delivery style with a passage reference.

## SECTION 6: Code-Mixing (80-100 words)
If multiple languages present, list examples. If single language: "Not applicable."

## SECTION 7: Distinctive Elements (120-150 words)
Unique characteristics: rhetorical questions, metaphors, repeated phrases.

## SECTION 8: Overall Summary (80-100 words)
Author's unique writing identity summary.

Format: Use ## for headings, **bold** for terms, bullets for lists.

IMPORTANT: You MUST complete ALL 8 sections. End your response with "--- END OF ANALYSIS ---" to confirm completion.`,
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
        /##\s*(SECTION\s*1|Tone\s*&?\s*Mood)/i,
        /##\s*(SECTION\s*2|Voice)/i,
        /##\s*(SECTION\s*3|Sentence\s*Structure)/i,
        /##\s*(SECTION\s*4|Vocabulary)/i,
        /##\s*(SECTION\s*5|Pacing)/i,
        /##\s*(SECTION\s*6|Code[-\s]?Mixing)/i,
        /##\s*(SECTION\s*7|Distinctive)/i,
        /##\s*(SECTION\s*8|Overall\s*Summary|Summary)/i,
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
}
