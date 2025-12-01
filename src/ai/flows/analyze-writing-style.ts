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
        prompt: `You are an expert writing analyst. Extract text from the file and analyze its WRITING STYLE.

File: {{media url=fileDataUri}}

Generate a COMPLETE style analysis (1200-1500 words minimum) covering ALL 8 sections below.

---

## SECTION 1: Tone & Mood (150-200 words)
Describe the emotional quality and atmosphere. Include 2-3 specific quotes from the text that exemplify the tone. Explain why these quotes create this particular mood.

---

## SECTION 2: Voice (150-200 words)
Describe the narrator's personality and point of view. Include 2-3 phrases demonstrating the author's voice (first-person pronouns, direct address, etc.). For non-English text, provide original and translation.

---

## SECTION 3: Sentence Structure & Rhythm (150-200 words)
Examine sentence patterns and flow. Provide 2-3 example sentences showing typical structure. Note: short vs. long sentences, simple vs. complex constructions, rhythmic qualities.

---

## SECTION 4: Vocabulary & Diction (150-200 words)
Assess word choice with concrete examples. Quote specific words, phrases, colloquialisms, or specialized terms. Categorize vocabulary level and explain what makes it distinctive.

---

## SECTION 5: Pacing (100-150 words)
Describe information delivery style. Reference specific passages showing pacing. Quote phrases demonstrating whether writing moves quickly or deliberately.

---

## SECTION 6: Code-Mixing Analysis (100-150 words)
Include ONLY if text contains multiple languages. List examples with translations and explain purpose of each code-mixed element. If single language only, write: "Not applicable - single language text."

---

## SECTION 7: Distinctive Stylistic Elements (150-200 words)
Note unique characteristics with examples. Quote rhetorical questions, repeated phrases, metaphors, or other distinctive techniques from the text.

---

## SECTION 8: Overall Summary (100-150 words)
Summarize the author's unique writing identity. Reference key stylistic elements identified above with brief examples.

---

Use Markdown: ## for section headings, **bold** for key terms, bullet points for lists, > for quoted text.

Generate ALL 8 sections completely. Do not stop mid-analysis.`,
      });
      
      const {output} = await prompt(
        { fileDataUri: input.fileDataUri, userId: input.userId, idToken: input.idToken },
        { model: input.model || routedModel }
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
