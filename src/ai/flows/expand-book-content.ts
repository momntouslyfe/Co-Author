'use server';

/**
 * @fileOverview This file defines a Genkit flow for expanding book content chapter by chapter.
 *
 * The flow now accepts more context (book title, outline, etc.) and an optional
 * user-provided instruction to generate more relevant and well-structured content.
 *
 * @exported expandBookContent - A function that expands the provided book content using AI.
 * @exported ExpandBookContentInput - The input type for the expandBookContent function.
 * @exported ExpandBookContentOutput - The return type for the expandBookContent function.
 */

import {z} from 'genkit';

import { getGenkitInstanceForFunction } from '@/lib/genkit-admin';
import { trackAIUsage, preflightCheckWordCredits } from '@/lib/credit-tracker';

const ExpandBookContentInputSchema = z.object({
  userId: z.string().describe('The user ID for API key retrieval.'),
  idToken: z.string().describe('Firebase ID token for authentication verification.'),
  bookTitle: z.string().describe("The main title of the book."),
  fullOutline: z.string().describe("The entire book outline for context."),
  chapterTitle: z.string().describe("The title of the current chapter."),
  contentToExpand: z.string().describe('The paragraph of book content to use as a starting point for expansion.'),
  instruction: z.string().optional().describe('A specific instruction from the user on how to expand the content.'),
  styleProfile: z.string().optional().describe('The desired writing style for the content.'),
  researchProfile: z.string().optional().describe('An AI research profile with audience context.'),
  storytellingFramework: z.string().optional().describe('The storytelling framework for the book.'),
  model: z.string().optional().describe('The generative AI model to use.'),
});
export type ExpandBookContentInput = z.infer<typeof ExpandBookContentInputSchema>;

const ExpandBookContentOutputSchema = z.object({
  expandedContent: z.string().describe('One or more new paragraphs of expanded content, formatted with varied paragraph length.'),
});
export type ExpandBookContentOutput = z.infer<typeof ExpandBookContentOutputSchema>;

export async function expandBookContent(input: ExpandBookContentInput): Promise<ExpandBookContentOutput> {
  await preflightCheckWordCredits(input.userId, 300);
  
  const { ai, model: routedModel } = await getGenkitInstanceForFunction('expand', input.userId, input.idToken);
  
  const prompt = ai.definePrompt({
    name: 'expandBookContentPrompt',
    input: {schema: ExpandBookContentInputSchema},
    output: {schema: ExpandBookContentOutputSchema},
    prompt: `You are an AI co-author. Your task is to take a given paragraph and generate one or more new paragraphs of content that naturally follow it, based on the user's instruction.

**CONTEXT:**
- Book Title: {{{bookTitle}}}
- Chapter: {{{chapterTitle}}}
- Full Outline: {{{fullOutline}}}
{{#if storytellingFramework}}- Storytelling Framework: {{{storytellingFramework}}}{{/if}}
{{#if researchProfile}}
- **RESEARCH PROFILE (Optional Enhancement):** Use this research to enhance your expanded content when relevant. If the research contains data, studies, or insights that support the points you're expanding on, incorporate them naturally. Only use information explicitly present in the research.
  ---
  {{{researchProfile}}}
  ---
{{/if}}

**CRITICAL INSTRUCTIONS:**
1.  **LANGUAGE & CODE-MIXING (CRITICAL - FOLLOW EXACTLY):** Match the language and style of the starting paragraph. If the style profile includes code-mixing patterns, you MUST replicate those patterns EXACTLY.
    
    **ABSOLUTELY FORBIDDEN - NEVER DO THIS:**
    - NEVER add English translations in parentheses after any word
    - WRONG: "ম্যানিপুলেশনের (manipulation)" - DO NOT write like this
    - WRONG: "সামাজিক সম্পর্কের (social relationships)" - DO NOT write like this
    - WRONG: "আত্মবিশ্বাস (self-confidence)" - DO NOT write like this
    
    **CORRECT CODE-MIXING PATTERNS (DO THIS):**
    - Use English words naturally without any translation: "এটা একটা টক্সিক সাইকেলের মতো"
    - Mix English words in English script naturally: "এই ছোট ছোট Violation গুলোকে"
    - Use English phrases naturally: "ম্যানিপুলেশন প্রায়শই খুব Gradual process এ ঘটে"
    
    **REMEMBER:** Code-mixing means naturally blending languages, NOT providing translations.
2.  Use the "Starting Paragraph" below as the primary context.
3.  Follow the "User's Instruction" to guide what you write next. If no instruction is provided, your default task is to simply expand upon the ideas in the starting paragraph.
4.  Generate AT LEAST ONE, and preferably two to three, new paragraphs.
5.  **HUMAN-LIKE PARAGRAPHING (NON-NEGOTIABLE):** Use short, readable paragraphs (3-5 sentences), but you MUST VARY their length for good rhythm. Ensure a double newline (a blank line) exists between every paragraph.
{{#if styleProfile}}
6.  **WRITING STYLE GUIDE (CRITICAL - MUST FOLLOW):** Below is a detailed analysis of the author's unique writing style, including concrete examples that demonstrate each characteristic. Your task is to MIMIC these stylistic patterns while expanding the content.
    
    **HOW TO USE THIS STYLE GUIDE:**
    - **Study the examples** - Each example shows a specific stylistic pattern (tone, voice, sentence structure, vocabulary, code-mixing, etc.)
    - **Apply the PATTERNS** - Replicate the STYLE demonstrated by these examples
    - **Match ALL characteristics** - Pay close attention to tone, voice, sentence structure, vocabulary level, code-mixing patterns (if applicable), and distinctive techniques
    
    **STYLE PROFILE WITH EXAMPLES:**
    ---
    {{{styleProfile}}}
    ---
    
    **REMEMBER:** The examples show HOW to write. Copy the STYLE and PATTERNS, not the specific content or topics.
{{/if}}
7.  Return ONLY the new paragraphs. Do not repeat the original paragraph in your response.

**User's Instruction:**
{{#if instruction}}
{{{instruction}}}
{{else}}
Just write more. Expand on the ideas presented in the starting paragraph.
{{/if}}

**Starting Paragraph:**
{{{contentToExpand}}}
`,
  });
  
  const {output} = await prompt(input, { model: input.model || routedModel });
  
  if (output) {
    await trackAIUsage(
      input.userId,
      output.expandedContent,
      'expandBookContent',
      {
        chapterTitle: input.chapterTitle,
      }
    );
  }
  
  return output!;
}
