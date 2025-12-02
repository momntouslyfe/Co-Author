'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating the content for a single section of a book chapter.
 *
 * This flow is designed to be called interactively from the editor. It takes all the necessary
 * context for the book and chapter, and focuses on generating a substantial, high-quality
 * piece of content for a single title (e.g., a sub-topic, an introduction, or an action step).
 *
 * @exported writeChapterSection - The function that generates the section content.
 * @exported WriteChapterSectionInput - The input type for the function.
 * @exported WriteChapterSectionOutput - The return type for the function.
 */

import {z} from 'genkit';

import { getGenkitInstanceForFunction } from '@/lib/genkit-admin';
import { retryWithBackoff, AI_GENERATION_RETRY_CONFIG } from '@/lib/retry-utils';
import { trackAIUsage, preflightCheckWordCredits } from '@/lib/credit-tracker';
import { withAIErrorHandling, type AIResult } from '@/lib/ai-error-handler';

const WriteChapterSectionInputSchema = z.object({
  userId: z.string().describe('The user ID for API key retrieval.'),
  idToken: z.string().describe('Firebase ID token for authentication verification.'),
  bookTitle: z.string().describe('The main title of the book.'),
  fullOutline: z.string().describe('The entire book outline for context.'),
  chapterTitle: z.string().describe('The title of the chapter this section belongs to.'),
  sectionTitle: z.string().describe('The specific title of the section to be written.'),
  language: z.string().describe('The language the section should be written in.'),
  previousContent: z.string().optional().describe('The content of the chapter written so far, for context.'),
  storytellingFramework: z.string().optional().describe('The storytelling framework for the book.'),
  researchProfile: z.string().optional().describe('An AI research profile with audience context.'),
  styleProfile: z.string().optional().describe('An AI style profile to guide the tone and voice.'),
  model: z.string().optional().describe('The generative AI model to use.'),
});
export type WriteChapterSectionInput = z.infer<typeof WriteChapterSectionInputSchema>;

const WriteChapterSectionOutputSchema = z.object({
  sectionContent: z.string().describe('The fully generated content for the specified section, consisting of multiple paragraphs.'),
});
export type WriteChapterSectionOutput = z.infer<typeof WriteChapterSectionOutputSchema>;

export async function writeChapterSection(input: WriteChapterSectionInput): Promise<AIResult<WriteChapterSectionOutput>> {
  return withAIErrorHandling(async () => {
    const context = `Section: "${input.sectionTitle}" in Chapter: "${input.chapterTitle}"`;
    
    await preflightCheckWordCredits(input.userId, 500);
    
    const result = await retryWithBackoff(
    async () => {
      const { ai, model: routedModel } = await getGenkitInstanceForFunction('chapter', input.userId, input.idToken);
      
      let chosenPrompt;
  
  if (input.sectionTitle === "Your Action Step") {
    chosenPrompt = ai.definePrompt({
      name: 'writeActionStepPrompt',
      input: { schema: WriteChapterSectionInputSchema },
      output: { schema: WriteChapterSectionOutputSchema },
      prompt: `You are an expert ghostwriter. Your task is to write the "Your Action Step" section for a book chapter in {{{language}}}.

**CONTEXT:**
- You MUST use the "Previous Chapter Content" to understand what the chapter was about.
  ---
  {{{previousContent}}}
  ---
{{#if styleProfile}}
- **WRITING STYLE GUIDE (CRITICAL - MUST FOLLOW):** Below is a detailed analysis of the author's unique writing style, including concrete examples that demonstrate each characteristic. Your task is to MIMIC these stylistic patterns while writing the action step summary.
  
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

**YOUR TASK:**
Write the content for the section titled: **"{{{sectionTitle}}}"**.

**CRITICAL INSTRUCTIONS (Read Carefully):**

1.  **LANGUAGE & CODE-MIXING (CRITICAL - FOLLOW EXACTLY):** Write primarily in **{{{language}}}**. If the style profile includes code-mixing patterns, you MUST replicate those patterns EXACTLY as shown.
    
    **ABSOLUTELY FORBIDDEN - NEVER DO THIS:**
    - NEVER add English translations in parentheses after any word
    - NEVER write English words in English script - always transliterate them
    - WRONG: "ম্যানিপুলেশনের (manipulation)" - DO NOT add translations
    - WRONG: "এই ছোট ছোট Violation গুলোকে" - DO NOT use English script
    - WRONG: "Gradual process" - DO NOT keep English words in English script
    
    **CORRECT CODE-MIXING PATTERNS (DO THIS):**
    - Transliterate ALL English-origin words into the target language script
    - CORRECT: "এটা একটা টক্সিক সাইকেলের মতো" (not "Toxic Cycle")
    - CORRECT: "এই ছোট ছোট ভায়োলেশন গুলোকে" (not "Violation")
    - CORRECT: "গ্র্যাজুয়াল প্রসেস" (not "Gradual process")
    - CORRECT: "ইমোশনাল কম্পাস ডিরেকশন হারায়" (not "Direction")
    
    **REMEMBER:** Code-mixing means naturally blending transliterated words, NOT using English script or providing translations.
2.  **ACTION STEP FORMAT (NON-NEGOTIABLE):** You are writing the "Action Step" section. You MUST follow this format precisely:
    1.  Start with a single, concise paragraph that summarizes the core lesson or takeaway of the entire chapter based on the provided content.
    2.  After the summary paragraph, create a bulleted or numbered list containing 5 to 7 single-sentence action items that the reader can implement. These action items must be direct, clear, and derived from the chapter's main points. Use standard Markdown for the list (e.g., '-' for bullets, '1.' for numbers). Do NOT use HTML tags.
3.  **HUMAN-LIKE PARAGRAPHING (NON-NEGOTIABLE):** Ensure there are clear gaps (a double newline) between the summary paragraph and the list.
4.  **RETURN ONLY THE CONTENT:** Your output must ONLY be the summary paragraph followed by the list. Do not add the section title.

Proceed to write the "Your Action Step" section now.
`,
    });
  } else if (input.sectionTitle === "Coming Up Next") {
    chosenPrompt = ai.definePrompt({
      name: 'writeComingUpNextPrompt',
      input: { schema: WriteChapterSectionInputSchema },
      output: { schema: WriteChapterSectionOutputSchema },
      prompt: `You are an expert ghostwriter. Your task is to write the "Coming Up Next" section for a book chapter in {{{language}}}.

**CONTEXT:**
- You MUST use the "Full Book Outline" to understand what the next chapter is about.
  ---
  {{{fullOutline}}}
  ---
- You are currently finishing the chapter titled: **{{{chapterTitle}}}**

**YOUR TASK:**
Write the content for the section titled: **"{{{sectionTitle}}}"**.

**CRITICAL INSTRUCTIONS (Read Carefully):**

1.  **LANGUAGE & CODE-MIXING (CRITICAL - FOLLOW EXACTLY):** Write primarily in **{{{language}}}**. If the style profile includes code-mixing patterns, you MUST replicate those patterns EXACTLY as shown.
    
    **ABSOLUTELY FORBIDDEN - NEVER DO THIS:**
    - NEVER add English translations in parentheses after any word
    - NEVER write English words in English script - always transliterate them
    - WRONG: "ম্যানিপুলেশনের (manipulation)" - DO NOT add translations
    - WRONG: "এই ছোট ছোট Violation গুলোকে" - DO NOT use English script
    
    **CORRECT CODE-MIXING PATTERNS (DO THIS):**
    - Transliterate ALL English-origin words into the target language script
    - CORRECT: "এটা একটা টক্সিক সাইকেলের মতো" (not "Toxic Cycle")
    - CORRECT: "এই ছোট ছোট ভায়োলেশন গুলোকে" (not "Violation")
    
    **REMEMBER:** Code-mixing means naturally blending transliterated words, NOT using English script or providing translations.
2.  **"COMING UP NEXT" FORMAT (NON-NEGOTIABLE):** You are writing the "Coming Up Next" section. You MUST write one or two short paragraphs that act as a summary or teaser for the *next* chapter in the outline. Keep it brief and intriguing. Do not write more than two paragraphs.
3.  **HUMAN-LIKE PARAGRAPHING (NON-NEGOTIABLE):** Use short, readable paragraphs and ensure a double newline (a blank line) exists between them if you write more than one.
4.  **RETURN ONLY THE CONTENT:** Your output must ONLY be the teaser paragraphs. Do not add the section title.

Proceed to write the "Coming Up Next" section now.
`,
    });
  } else {
    chosenPrompt = ai.definePrompt({
      name: 'writeStandardSectionPrompt',
      input: { schema: WriteChapterSectionInputSchema },
      output: { schema: WriteChapterSectionOutputSchema },
      prompt: `You are an expert ghostwriter. Your task is to write a complete, high-quality section for a book chapter in {{{language}}}.

**CONTEXT:**
- Book Title: {{{bookTitle}}}
- Chapter: {{{chapterTitle}}}
- Full Book Outline: {{{fullOutline}}}
{{#if storytellingFramework}}- Storytelling Framework: {{{storytellingFramework}}}{{/if}}
{{#if previousContent}}
- **Previous Chapter Content (for context):** The following is content already written in this chapter. Use it ONLY to understand context and avoid repetition.
  ---
  {{{previousContent}}}
  ---
  
  **CRITICAL - LEARNING REFERENCES POLICY:**
  - DO NOT explicitly reference previous sections in every section (e.g., "আগের অংশে আমরা দেখেছি...", "যেমনটা আগে বলেছিলাম...")
  - Readers just read the previous section - they don't need constant reminders
  - ONLY reference previous content when there's a GENUINE logical dependency that would confuse readers otherwise
  - Most sections should stand INDEPENDENTLY without backward references
  - At most 1-2 backward references per entire chapter, not per section
  - Maintain conceptual continuity through natural narrative flow, NOT through explicit "as I mentioned earlier" phrases
  - Let each section feel fresh while naturally building on previous ideas
{{/if}}
{{#if styleProfile}}
- **WRITING STYLE GUIDE (CRITICAL - MUST FOLLOW):** Below is a detailed analysis of the author's unique writing style, including concrete examples that demonstrate each characteristic. Your task is to MIMIC these stylistic patterns while writing about the current book topic.
  
  **HOW TO USE THIS STYLE GUIDE:**
  1. **Study the examples** - Each example shows a specific stylistic pattern (tone, voice, sentence structure, vocabulary, code-mixing, etc.)
  2. **Apply the PATTERNS** - Replicate the STYLE demonstrated by these examples (e.g., if examples show conversational tone with rhetorical questions, use that style)
  3. **Adapt to NEW content** - Apply these patterns to the current book topic, NOT to the topics mentioned in the examples
  4. **Match ALL characteristics** - Pay close attention to:
     - Tone and emotional quality
     - Voice and perspective (first-person, second-person, etc.)
     - Sentence structure and rhythm patterns
     - Vocabulary level and word choice style
     - Code-mixing patterns (if applicable - mix languages in the same way as shown)
     - Distinctive techniques (rhetorical questions, metaphors, direct address, etc.)
  
  **STYLE PROFILE WITH EXAMPLES:**
  ---
  {{{styleProfile}}}
  ---
  
  **REMEMBER:** The examples show HOW to write. Copy the STYLE and PATTERNS, not the specific content or topics.
{{/if}}
{{#if researchProfile}}
- **RESEARCH PROFILE (Use When Relevant):** Below is research containing insights, data, case studies, and expert perspectives about the topic. Use this research intelligently to enhance your writing's credibility and impact.
  
  **HOW TO USE THIS RESEARCH:**
  - **When the research contains specific data/statistics:** Incorporate relevant numbers and percentages to support your points
  - **When the research mentions studies/findings:** Reference them naturally (e.g., "Research indicates...", "Studies have shown...")
  - **When the research includes case studies:** Weave in relevant examples to illustrate concepts
  - **When the research has expert insights:** Include perspectives that add authority to your points
  - **When the research mentions trends:** Reference current developments to demonstrate relevance
  
  **IMPORTANT GUIDELINES:**
  - Only use data/statistics that are explicitly present in the research - never fabricate numbers
  - If the research lacks specific data for a point you're making, write from general knowledge without inventing citations
  - Weave research insights naturally into your narrative rather than forcing them into every paragraph
  - The goal is credibility and insight, not mandatory citation - write naturally while being evidence-aware
  
  **RESEARCH PROFILE:**
  ---
  {{{researchProfile}}}
  ---
{{/if}}

**YOUR TASK:**
Write the content for the section titled: **"{{{sectionTitle}}}"**.

**CRITICAL INSTRUCTIONS (Read Carefully):**

1.  **LANGUAGE & CODE-MIXING (CRITICAL - FOLLOW EXACTLY):** Write primarily in **{{{language}}}**. If the style profile includes code-mixing patterns, you MUST replicate those patterns EXACTLY as shown.
    
    **ABSOLUTELY FORBIDDEN - NEVER DO THIS:**
    - NEVER add English translations in parentheses after any word
    - NEVER write English words in English script - always transliterate them
    - WRONG: "ম্যানিপুলেশনের (manipulation)" - DO NOT add translations
    - WRONG: "এই ছোট ছোট Violation গুলোকে" - DO NOT use English script
    - WRONG: "Gradual process" - DO NOT keep English words in English script
    - WRONG: "Direction" - DO NOT use English script for any word
    
    **CORRECT CODE-MIXING PATTERNS (DO THIS):**
    - Transliterate ALL English-origin words into the target language script
    - CORRECT: "এটা একটা টক্সিক সাইকেলের মতো" (not "Toxic Cycle")
    - CORRECT: "এই ছোট ছোট ভায়োলেশন গুলোকে" (not "Violation")
    - CORRECT: "গ্র্যাজুয়াল প্রসেস" (not "Gradual process")
    - CORRECT: "ইমোশনাল কম্পাস ডিরেকশন হারায়" (not "Direction")
    - CORRECT: "প্রফেশনাল স্পেস" (not "Professional space")
    
    **REMEMBER:** Code-mixing means naturally blending transliterated words, NOT using English script or providing translations.

2.  **FOCUSED CONTENT:** All content must be directly related to the provided section title.

3.  **HUMAN-LIKE PARAGRAPHING (NON-NEGOTIABLE):** Use short, readable paragraphs (3-5 sentences), but VARY their length for good rhythm. Ensure a double newline (a blank line) exists between paragraphs.

4.  **RETURN ONLY THE CONTENT:** Your output must ONLY be the text for the new section. Do not add the section title or any other formatting; return only the paragraphs.

5.  **COMPLETE SECTION (CRITICAL - NON-NEGOTIABLE):**
    - You MUST write a COMPLETE, FULL section with at least 500-650 words
    - NEVER stop mid-paragraph or mid-thought
    - NEVER generate partial content - this is considered a FAILURE
    - Generate multiple well-developed paragraphs (typically 5-7 paragraphs minimum)
    - Each paragraph should be complete with a clear beginning, middle, and conclusion
    - If you feel like stopping early, you MUST continue writing until the section feels complete
    - A proper section explores the topic thoroughly with examples, explanations, and insights

6.  **VARIED WRITING RHYTHM (NON-NEGOTIABLE):**
    - VARY paragraph lengths: mix short punchy paragraphs (2-3 sentences) with longer detailed ones (5-6 sentences)
    - VARY sentence lengths: alternate between short impactful sentences and longer flowing ones
    - Avoid monotonous patterns - don't make all paragraphs or sentences the same length
    - Use short sentences for emphasis and impact
    - Use longer sentences for explanations and flowing narrative
    - This variation creates natural reading rhythm and keeps readers engaged

**FINAL CHECK BEFORE RESPONDING:** Ensure your response is a COMPLETE section with multiple full paragraphs. Partial or truncated output is unacceptable.

Proceed to write the COMPLETE section content now.
`,
    });
  }
  
      try {
        const { output } = await chosenPrompt(input, { model: input.model || routedModel });

        if (!output || !output.sectionContent) {
          throw new Error("AI failed to generate the section content.");
        }
        
        return {
          sectionContent: output.sectionContent,
        };
      } catch (error: any) {
        console.error('Error generating section content:', error);
        
        // Re-throw the original error to preserve retry detection
        // The retry utility will handle these errors based on their original message
        throw error;
      }
    },
    AI_GENERATION_RETRY_CONFIG,
    context
  );
  
    await trackAIUsage(
      input.userId,
      result.sectionContent,
      'writeChapterSection',
      {
        chapterTitle: input.chapterTitle,
        sectionTitle: input.sectionTitle,
      }
    );
    
    return result;
  }, 'chapter section writing');
}
