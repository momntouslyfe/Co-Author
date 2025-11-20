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

import { getUserGenkitInstance } from '@/lib/genkit-user';

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

export async function analyzeWritingStyle(input: AnalyzeWritingStyleInput): Promise<AnalyzeWritingStyleOutput> {
  const { ai, model } = await getUserGenkitInstance(input.userId, input.idToken);
  
  try {
    const prompt = ai.definePrompt({
      name: 'analyzeWritingStylePrompt',
      input: {schema: AnalyzeWritingStyleInputSchema},
      output: {schema: AnalyzeWritingStyleOutputSchema},
      prompt: `You are an expert writing analyst. Your task is to first extract the text from the following file, and then perform a deep analysis of the WRITING STYLE ONLY.

  File: {{media url=fileDataUri}}

  **CRITICAL INSTRUCTION - READ CAREFULLY:**
  You are analyzing STYLE ONLY, not content. This style profile will be used to guide future writing on COMPLETELY DIFFERENT topics. Therefore:
  
  ❌ FORBIDDEN - DO NOT include any example sentences or quotes from the sample text
  ❌ FORBIDDEN - DO NOT reference the specific topics, subjects, or themes in the sample
  ❌ FORBIDDEN - DO NOT mention what the sample is about (e.g., "The author writes about freelancing/business/relationships...")
  ❌ FORBIDDEN - DO NOT say things like "uses metaphors related to X topic" or "draws examples from Y domain"
  
  ✅ CORRECT - Describe stylistic characteristics in completely abstract, transferable terms
  ✅ CORRECT - Focus exclusively on HOW the author writes, never on WHAT they write about
  ✅ CORRECT - Provide guidance that applies equally to ANY topic (cooking, science, history, fiction, etc.)
  
  **Examples of WRONG analysis (content-contaminated):**
  ❌ "The author uses business terminology and frequently references workplace scenarios"
  ❌ "Writing style employs metaphors from everyday office life"
  ❌ "Discusses freelancing in a conversational tone"
  
  **Examples of CORRECT analysis (pure style):**
  ✅ "Uses predominantly conversational tone with occasional formal phrases for emphasis"
  ✅ "Employs concrete metaphors drawn from everyday life to clarify abstract concepts"
  ✅ "Structures arguments using numbered points followed by explanatory paragraphs"
  
  **FORMATTING RULES:**
  - For each point in the listicle, provide a clear heading and explanation.
  - Ensure there is a blank line (a double newline) between each numbered list item to add space and improve readability.
  - Keep paragraphs within each section concise. If a point requires a longer explanation, break it into smaller paragraphs with a blank line between them.
  - Describe patterns and characteristics, not specific content examples.

  **Analyze the following stylistic dimensions:**

  1.  **Tone & Mood:** Describe the overall emotional quality and atmosphere (e.g., Formal, Informal, Humorous, Serious, Optimistic, Conversational, Professional). Focus on the feeling the writing creates, not what it's about.

  2.  **Voice & Perspective:** Describe the narrator's personality and point of view (e.g., First-person personal, Third-person authoritative, Second-person instructional, Friendly advisor, Expert teacher). How does the author position themselves relative to the reader?

  3.  **Sentence Structure & Rhythm:** Examine the sentence patterns and flow (e.g., Predominantly short and punchy, Mix of short and long sentences, Complex with multiple clauses, Rhythmic and repetitive patterns). Describe the structural patterns without quoting examples.

  4.  **Vocabulary & Diction:** Assess the word choice patterns (e.g., Simple and accessible, Advanced and sophisticated, Technical and specialized, Metaphorical and figurative, Colloquial and casual). What level of language complexity is typical?

  5.  **Pacing:** Describe how information is delivered (e.g., Fast-paced with quick transitions, Slow and deliberate with detailed explanations, Builds gradually, Varies between quick and detailed). How does the author control the flow of ideas?

  6.  **Code-Mixing & Language Patterns:** If applicable, identify patterns of mixed-language usage or linguistic features (e.g., "Frequently mixes English technical terms into native language sentences", "Uses bilingual phrases for emphasis", "Alternates between languages for different purposes"). Describe the PATTERN of code-mixing, not specific examples. Note the languages involved and typical purposes (emphasis, technical precision, cultural connection, etc.).

  7.  **Distinctive Stylistic Elements:** Note any unique characteristics (e.g., "Frequently uses rhetorical questions to engage readers", "Employs numbered lists for clarity", "Uses metaphors from everyday life", "Includes direct address to the reader", "Repeats key phrases for emphasis"). Describe the techniques, not the content they're applied to.

  8.  **Overall Stylistic Signature:** Summarize the author's unique writing identity in abstract terms that can be applied to any subject matter. Focus on the transferable essence of their style.

  **REMEMBER:** This analysis will guide writing on completely different topics. Describe HOW the author writes, not WHAT they write about. The style should be portable to any content.

  Return only the detailed analysis, following all formatting rules.`,
    });
    
    const {output} = await prompt(
      { fileDataUri: input.fileDataUri, userId: input.userId, idToken: input.idToken, ...(input.model && { model: input.model }) },
    );
    
    if (!output || !output.styleAnalysis) {
      throw new Error('The AI did not return any style analysis. Please try again.');
    }
    
    return output;
  } catch (error: any) {
    console.error('Error in analyzeWritingStyle:', error);
    
    if (error.message?.includes('503') || error.message?.includes('overloaded')) {
      throw new Error(
        'The AI service is currently overloaded. Please wait a moment and try again.'
      );
    }
    
    if (error.message?.includes('401') || error.message?.includes('Unauthorized') || error.message?.includes('API key')) {
      throw new Error(
        'Your API key appears to be invalid or expired. Please check your API key in Settings.'
      );
    }
    
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      throw new Error(
        'You have exceeded your API quota. Please check your usage limits or try again later.'
      );
    }
    
    throw new Error(error.message || 'An unexpected error occurred while analyzing writing style. Please try again.');
  }
}
