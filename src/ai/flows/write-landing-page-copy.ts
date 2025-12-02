'use server';

import { z } from 'genkit';
import { getGenkitInstanceForFunction } from '@/lib/genkit-admin';
import { trackAIUsage, preflightCheckWordCredits } from '@/lib/credit-tracker';
import { withAIErrorHandling } from '@/lib/ai-error-handler';

const OfferContextSchema = z.object({
  title: z.string().describe('The offer title.'),
  subtitle: z.string().optional().describe('The offer subtitle.'),
  description: z.string().optional().describe('Description of the offer.'),
  category: z.string().describe('Category of the offer (e.g., checklist, workbook, template).'),
  blueprint: z.string().optional().describe('The offer blueprint/structure.'),
});

const WriteLandingPageCopyInputSchema = z.object({
  userId: z.string().describe('The user ID for API key retrieval.'),
  idToken: z.string().describe('Firebase ID token for authentication verification.'),
  bookTitle: z.string().describe('The title of the book.'),
  bookOutline: z.string().describe('The master blueprint/outline of the book.'),
  bookDescription: z.string().optional().describe('Description of the book.'),
  language: z.string().describe('The language for the content.'),
  targetWordCount: z.number().describe('Target word count for the landing page copy (500-2500 words).'),
  offers: z.array(OfferContextSchema).optional().describe('Up to 3 offers to include as bonuses.'),
  customInstructions: z.string().optional().describe('Custom instructions for the AI.'),
  researchProfile: z.string().optional().describe('Research profile for audience context.'),
  styleProfile: z.string().optional().describe('Style profile for writing style.'),
  authorProfile: z.string().optional().describe('Author profile for credentials and bio.'),
  storytellingFramework: z.string().optional().describe('Storytelling framework to use.'),
  contentFramework: z.string().optional().describe('Content/marketing framework to use (e.g., AIDA, PAS).'),
  model: z.string().optional().describe('The generative AI model to use.'),
});

export type WriteLandingPageCopyInput = z.infer<typeof WriteLandingPageCopyInputSchema>;

const WriteLandingPageCopyOutputSchema = z.object({
  content: z.string().describe('The generated landing page copy.'),
  wordCount: z.number().describe('The actual word count of the generated content.'),
  sections: z.object({
    headline: z.string().describe('The main headline.'),
    subheadline: z.string().describe('The supporting subheadline.'),
    problemSection: z.string().describe('The problem/pain point section.'),
    solutionSection: z.string().describe('The solution/benefits section.'),
    authorSection: z.string().describe('About the author section.'),
    offerStack: z.string().describe('The offer stack with bonuses.'),
    testimonialPlaceholder: z.string().describe('Placeholder for testimonials.'),
    guarantee: z.string().describe('The guarantee section.'),
    urgencyScarcity: z.string().describe('Urgency and scarcity elements.'),
    callToAction: z.string().describe('The final call to action.'),
  }).describe('Individual sections of the landing page.'),
});

export type WriteLandingPageCopyOutput = z.infer<typeof WriteLandingPageCopyOutputSchema>;

export async function writeLandingPageCopy(
  input: WriteLandingPageCopyInput
): Promise<WriteLandingPageCopyOutput> {
  return withAIErrorHandling(async () => {
    const estimatedWords = Math.max(input.targetWordCount, 500);
    await preflightCheckWordCredits(input.userId, estimatedWords);

    const { ai, model: routedModel } = await getGenkitInstanceForFunction('chapter', input.userId, input.idToken);

    try {
    const prompt = ai.definePrompt({
      name: 'writeLandingPageCopy',
      input: { schema: WriteLandingPageCopyInputSchema },
      output: { schema: WriteLandingPageCopyOutputSchema },
      prompt: `You are an expert direct response copywriter specializing in book sales pages and high-converting landing pages. Your task is to write a complete, high-value landing page copy for a book.

**CRITICAL WORD COUNT REQUIREMENT:**
You MUST write EXACTLY approximately {{{targetWordCount}}} words (±10%).
- If target is 500 words, write 450-550 words
- If target is 1000 words, write 900-1100 words
- If target is 1500 words, write 1350-1650 words
- If target is 2000 words, write 1800-2200 words
- If target is 2500 words, write 2250-2750 words

DO NOT write significantly more or less than the target. Adjust depth and detail to match the word count.

**THE VALUE EQUATION FRAMEWORK (MANDATORY):**
VALUE = (Dream Outcome × Perceived Likelihood of Achievement) ÷ (Time Delay × Effort & Sacrifice)

You MUST apply this framework throughout the copy:

1. **DREAM OUTCOME (Maximize):** Paint a vivid picture of the transformation the reader will achieve. Make their dreams feel tangible and big.

2. **PERCEIVED LIKELIHOOD (Maximize):** Build belief that "I can do it" through:
   - Author credentials and proof
   - Social proof and testimonials
   - Step-by-step methodology
   - Guarantees and risk reversal

3. **TIME DELAY (Minimize):** Reduce perceived time to results:
   - "Start reading today"
   - "See results in Week 1"
   - Quick wins and immediate benefits
   - Instant access promises

4. **EFFORT & SACRIFICE (Minimize):** Reduce perceived difficulty:
   - "Easy-to-follow steps"
   - "Done-for-you templates"
   - "No prior experience needed"
   - Eliminate complexity

---

**OFFER STACK FORMULA (Follow this structure):**
1. **Main Offer:** The book itself with full transformation promise
2. **Bonus 1-3:** Additional offers that enhance the main product
3. **Guarantee:** Risk reversal (money-back, satisfaction guarantee)
4. **Scarcity:** Limited availability elements
5. **Urgency:** Time-sensitive elements
6. **Value Stack:** Total value vs. discounted price

---

**BOOK CONTEXT:**
- Book Title: {{{bookTitle}}}
- Language: {{{language}}}
- Target Word Count: {{{targetWordCount}}} words (FOLLOW THIS STRICTLY)

**Book Blueprint/Outline:**
{{{bookOutline}}}

{{#if bookDescription}}
**Book Description:**
{{{bookDescription}}}
{{/if}}

{{#if researchProfile}}
**Research Profile (Target Audience & Pain Points):**
{{{researchProfile}}}
{{/if}}

{{#if styleProfile}}
**Writing Style Analysis (MIMIC THE PATTERN ONLY - DO NOT COPY CONTENT):**

CRITICAL INSTRUCTION: The following is a writing style analysis. You must:
1. ONLY analyze and mimic the WRITING PATTERNS described (tone, voice, sentence structure, vocabulary choices, pacing, etc.)
2. DO NOT copy, reference, or use ANY actual content, examples, phrases, or sentences from this analysis
3. Create 100% ORIGINAL content that FOLLOWS THE SAME WRITING STYLE

{{{styleProfile}}}

**HOW TO USE THIS STYLE ANALYSIS:**
- Study the Tone & Mood described → Write with the same emotional approach
- Study the Voice characteristics → Match the narrative perspective and personality
- Study the Sentence Structure & Rhythm → Use similar sentence lengths and patterns
- Study the Vocabulary & Diction → Use the same level of formality and word choices
- Study the Pacing → Match the flow and tempo
- Study Code-Mixing patterns (if any) → Replicate the same language blending approach

**CODE-MIXING INTEGRITY (IF APPLICABLE):**
If the style analysis shows code-mixing (mixing words/phrases from multiple languages):
1. Use mixed-language words NATURALLY without any explanation
2. NEVER add parenthetical translations like "প্রমোশন (promotion)" - just write "প্রমোশন"
3. NEVER add brackets, glosses, or English explanations after non-English words
4. Blend languages seamlessly as a native speaker would
5. Match the exact frequency and pattern of language mixing from the analysis

WRONG: "আপনার বিজনেস (business) এর জন্য মার্কেটিং (marketing) স্ট্রাটেজি (strategy)"
CORRECT: "আপনার বিজনেস এর জন্য মার্কেটিং স্ট্রাটেজি"

REMEMBER: Mimic the STYLE, not the CONTENT. All landing page content must be original and relevant to THIS book.
{{/if}}

{{#if authorProfile}}
**Author Profile (Use for credibility section):**
{{{authorProfile}}}
{{/if}}

{{#if storytellingFramework}}
**Storytelling Framework:** {{{storytellingFramework}}}
{{/if}}

{{#if contentFramework}}
**Content/Marketing Framework:** {{{contentFramework}}}
Apply this framework structure to organize and present the marketing message effectively.
{{/if}}

{{#if offers}}
**BONUS OFFERS TO INCLUDE:**
{{#each offers}}
---
**Bonus {{@index}}:**
- Title: {{this.title}}
{{#if this.subtitle}}- Subtitle: {{this.subtitle}}{{/if}}
- Category: {{this.category}}
{{#if this.description}}- Description: {{this.description}}{{/if}}
{{#if this.blueprint}}- Blueprint: {{this.blueprint}}{{/if}}
{{/each}}
---
{{/if}}

{{#if customInstructions}}
**CUSTOM INSTRUCTIONS (IMPORTANT):**
{{{customInstructions}}}
{{/if}}

---

**YOUR TASK:**
Write a complete, high-converting landing page copy for this book. You MUST write exactly approximately {{{targetWordCount}}} words (±10%).

**REQUIRED SECTIONS (in order):**

1. **HEADLINE & SUBHEADLINE:**
   - Lead with the dream outcome (transformation)
   - Be specific with numbers, timeframes, or results
   - Hook the reader immediately

2. **PROBLEM/PAIN SECTION:**
   - Call out the exact struggles your audience faces
   - Agitate the pain (make them feel understood)
   - Show you understand their current frustration
   - Use "you" language to connect personally

3. **SOLUTION/BENEFITS SECTION:**
   - Introduce the book as THE solution
   - Translate features into outcomes
   - Use bullet points for scanability
   - Apply the Value Equation (big outcome, high likelihood, fast results, low effort)

4. **WHAT'S INSIDE (Book Contents):**
   - Chapter-by-chapter value preview
   - Focus on what they'll LEARN and DO, not just topics
   - Build anticipation for the transformation

5. **ABOUT THE AUTHOR:**
   - Establish credibility and expertise
   - Share the author's journey (relatable)
   - Prove they're qualified to help

6. **OFFER STACK:**
   - Present the main book offer
   {{#if offers}}- Add the {{offers.length}} bonus offer(s) with perceived value
   - Show total value: "$XXX+ Value"{{/if}}
   - Special pricing or discount
   - Create irresistible value-to-price ratio

7. **TESTIMONIALS PLACEHOLDER:**
   - Write 2-3 sample testimonial formats
   - Include prompts like "[READER NAME], [LOCATION]"
   - Focus on specific results and transformations

8. **GUARANTEE:**
   - Strong money-back guarantee
   - Remove all risk from the buyer
   - Make it feel safe to purchase

9. **URGENCY & SCARCITY:**
   - Limited-time pricing
   - Bonus expiration
   - Limited availability (if applicable)

10. **FINAL CALL TO ACTION:**
    - Clear, compelling CTA button text options
    - Restate the main transformation
    - Make action irresistible

---

**STRUCTURE COMPLIANCE (MANDATORY - Critical for readability):**
You MUST structure your output properly for beautiful layout:
1. MINIMUM 8-12 paragraphs spread across sections
2. Use ## for main section headers, ### for subsections
3. Each paragraph should be 2-4 sentences maximum
4. Separate ALL paragraphs with blank lines
5. Mix short punchy paragraphs (1-2 sentences) with medium ones (3-4 sentences)
6. Use bullet points or numbered lists for benefits, features, and offer stacks
7. NEVER write a wall of text - always break into multiple paragraphs
8. Each section should have at least 2-3 paragraphs minimum
9. Add visual breaks with horizontal rules (---) between major sections

**WRITING GUIDELINES:**
1. Write in {{{language}}}
2. Use conversational, engaging tone
3. Short paragraphs (2-4 sentences max) - NEVER exceed 4 sentences per paragraph
4. Use power words (discover, unlock, transform, proven, secret)
5. Include specific numbers where possible
6. Match the style profile if provided, including any code-mixing patterns
7. Each section should flow naturally into the next
8. Create multiple CTA opportunities throughout

**WORD COUNT ADJUSTMENT GUIDE:**
- For 500-800 words: Be concise, focus on headline, problem, solution, CTA. Minimal testimonial placeholders.
- For 900-1200 words: Add author section and basic offer stack.
- For 1300-1800 words: Full sections with moderate detail.
- For 1900-2500 words: Comprehensive landing page with full details, multiple testimonials, detailed benefits.

**OUTPUT FORMAT:**
Provide the complete landing page copy with clear section headers (use ## for main sections, ### for subsections).

REMEMBER: Your output MUST be approximately {{{targetWordCount}}} words (±10%). Count your words and adjust accordingly.

Write the complete landing page copy now.`,
    });

    const { output } = await prompt(input, { model: input.model || routedModel });

    if (!output || !output.content) {
      throw new Error('Failed to generate landing page copy. Please try again.');
    }

    await trackAIUsage(
      input.userId,
      output.content,
      'writeLandingPageCopy',
      { bookTitle: input.bookTitle }
    );

    return output;
  } catch (error: any) {
    console.error('Error writing landing page copy:', error);

    if (error.message?.includes('503') || error.message?.includes('overloaded')) {
      throw new Error('The AI service is currently overloaded. Please wait a moment and try again.');
    }

    if (error.message?.includes('401') || error.message?.includes('Unauthorized') || error.message?.includes('API key')) {
      throw new Error('Your API key appears to be invalid or expired. Please check your API key in Settings.');
    }

    if (error.message?.includes('429') || error.message?.includes('quota')) {
      throw new Error('You have exceeded your API quota. Please check your usage limits or try again later.');
    }

    throw new Error(error.message || 'An unexpected error occurred while writing landing page copy. Please try again.');
    }
  }, 'landing page copy writing');
}
