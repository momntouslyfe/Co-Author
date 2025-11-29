'use server';

/**
 * @fileOverview Book title generator AI agent - High-Converting Titles.
 *
 * - generateBookTitles - A function that handles the book title generation process.
 * - GenerateBookTitlesInput - The input type for the generateBookTitles function.
 * - GenerateBookTitlesOutput - The return type for the generateBookTitles function.
 */

import {z} from 'genkit';

import { getGenkitInstanceForFunction } from '@/lib/genkit-admin';
import { trackAIUsage, preflightCheckWordCredits } from '@/lib/credit-tracker';

const GenerateBookTitlesInputSchema = z.object({
  userId: z.string().describe('The user ID for API key retrieval.'),
  idToken: z.string().describe('Firebase ID token for authentication verification.'),
  outline: z.string().describe('The complete and finalized book outline (Master Blueprint).'),
  language: z.string().describe('The language for the titles.'),
  researchProfile: z.string().optional().describe('Research profile with target audience pain points and desires.'),
  styleProfile: z.string().optional().describe('Style profile for tone and code-mixing patterns.'),
  storytellingFramework: z.string().optional().describe('The storytelling framework used for the book (e.g., The Hero\'s Journey).'),
  model: z.string().optional().describe('The generative AI model to use.'),
});
export type GenerateBookTitlesInput = z.infer<
  typeof GenerateBookTitlesInputSchema
>;

const BookTitleSchema = z.object({
  mainTitle: z.string().describe('The main title (3-5 words, emotional, memorable, attention-grabbing).'),
  subtitle: z.string().describe('The subtitle (clear promise, specific benefit, target audience).'),
  formula: z.string().describe('Which formula was used (e.g., Warrior/Hero, Number+Promise, Question Hook, etc.).'),
});

const GenerateBookTitlesOutputSchema = z.object({
  titles: z.array(BookTitleSchema).describe('An array of 10-12 high-converting book titles with subtitles.'),
});
export type GenerateBookTitlesOutput = z.infer<
  typeof GenerateBookTitlesOutputSchema
>;

export async function generateBookTitles(
  input: GenerateBookTitlesInput
): Promise<GenerateBookTitlesOutput> {
  await preflightCheckWordCredits(input.userId, 300);
  
  const { ai, model: routedModel } = await getGenkitInstanceForFunction('title', input.userId, input.idToken);
  
  try {
    const prompt = ai.definePrompt({
      name: 'generateBookTitlesPrompt',
      input: {schema: GenerateBookTitlesInputSchema},
      output: {schema: GenerateBookTitlesOutputSchema},
      prompt: `You are an elite book title strategist who has studied thousands of bestselling books. Your titles convert 5-7x better than generic titles. Your task is to generate 10-12 HIGH-CONVERTING book titles that grab attention, create emotional impact, and drive sales.

**Language:** {{{language}}}

{{#if storytellingFramework}}
**Storytelling Framework:** {{{storytellingFramework}}}
{{/if}}

{{#if researchProfile}}
**TARGET AUDIENCE & PAIN POINTS (CRITICAL - Use their language):**
{{{researchProfile}}}
{{/if}}

{{#if styleProfile}}
**STYLE PROFILE (Match tone and code-mixing):**
{{{styleProfile}}}

**CODE-MIXING INTEGRITY:** If the style profile shows code-mixing (e.g., Bengali with English words), use that SAME pattern in titles. Use mixed words NATURALLY without parenthetical translations.
WRONG: "সাকসেস (Success) ম্যানুয়াল"
CORRECT: "সাকসেস ম্যানুয়াল"
{{/if}}

**BOOK BLUEPRINT:**
{{{outline}}}

---

## THE THREE GATEWAYS FRAMEWORK (MANDATORY)

Every title MUST pass through these three gateways:

### 1. POSITIONING (Establish Unique Angle)
- What makes this book different from 100 others on the same topic?
- Create a unique identity/character (Warrior, Maverick, Insider, etc.)
- Position the reader as someone special who deserves this knowledge

### 2. PROMISE (Clear, Specific Benefit)
- What EXACTLY will the reader achieve?
- Be specific with numbers, timeframes, or outcomes
- Promise should feel achievable yet exciting
- Address the #1 pain point from the research profile

### 3. PERCEPTION SHIFT (Provoke Emotion)
- Challenge conventional wisdom
- Create urgency or stakes
- Make them feel something (curiosity, fear of missing out, hope, determination)
- Use provocative or counterintuitive elements

---

## PSYCHOLOGICAL POWER WORDS (Use Strategically)

| Category | Words to Use |
|----------|--------------|
| **Curiosity** | Secret, Hidden, Forbidden, Untold, Unspoken, Insider |
| **Urgency** | Now, Fast, Before It's Too Late, Finally, Ultimate |
| **Transformation** | Revolutionary, Life-Changing, Breakthrough, Unleash |
| **Exclusivity** | Elite, What They Don't Tell You, The Real, Insider's |
| **Desire** | Effortless, Simple, Magic, Powerful, Proven, Guaranteed |
| **Identity** | Warrior, Master, Maverick, Champion, Genius, Legend |

---

## HIGH-CONVERTING TITLE FORMULAS (Use a Mix)

1. **Warrior/Hero Formula**
   [Identity Role]: [Bold Promise with Stakes]
   Example: "Time Warrior: Reclaim 3 Hours of Your Day or Die Trying"

2. **Number + Promise Formula**
   The [#] [Method/Secret/Step] to [Specific Result]
   Example: "The 7-Day Blueprint to Doubling Your Income"

3. **Question Hook Formula**
   What If You Could [Dream Outcome]?
   Example: "What If You Could Read 100 Books a Year?"

4. **Counterintuitive Formula**
   The [Opposite of Expected] Approach to [Topic]
   Example: "The Lazy Genius Way to Productivity"

5. **Secret/Hidden Formula**
   The [Hidden/Secret/Untold] [Topic] That [Result]
   Example: "The Hidden Psychology of Millionaire Minds"

6. **Ultimatum Formula**
   [Action] or [Consequence]
   Example: "Scale Your Business or Stay Stuck Forever"

7. **Made-Up Word Formula**
   [New Concept]: [Clear Explanation]
   Example: "Solopreneur Secrets: Build a 7-Figure Business Alone"

8. **Transformation Story Formula**
   From [Pain State] to [Dream State]
   Example: "From Broke to Blessed: The Mindset Shift That Changes Everything"

---

## TITLE STRUCTURE (MANDATORY)

**MAIN TITLE (3-5 words):**
- Emotional and memorable
- Uses power words
- Creates instant curiosity
- Easy to say and remember

**SUBTITLE (8-15 words):**
- Clarifies the promise
- Includes specific benefit
- Addresses target audience
- Can include numbers or timeframes

---

## ANTI-GENERIC RULES (CRITICAL)

❌ REJECT these generic patterns:
- "[Topic] for [Audience]" (e.g., "Time Management for Professionals")
- "The Complete Guide to [Topic]"
- "How to [Basic Action]"
- "A Guide to [Topic]"
- "[Topic] 101"
- "The Basics of [Topic]"

✅ TRANSFORM them into high-converting versions:
- GENERIC: "Time Management for Professionals"
- HIGH-CONVERTING: "Time Warrior: Reclaim 3 Hours of Your Day or Die Trying"

- GENERIC: "How to Start a Business"
- HIGH-CONVERTING: "The $100K Blueprint: From Side Hustle to Empire in 90 Days"

- GENERIC: "Healthy Eating Guide"
- HIGH-CONVERTING: "Eat Like a Warrior: The 21-Day Transformation Protocol"

---

## YOUR TASK

Generate 10-12 HIGH-CONVERTING titles that:
1. Pass all THREE GATEWAYS (Positioning, Promise, Perception Shift)
2. Use different formulas for variety
3. Include emotional power words
4. Have compelling main title + clarifying subtitle
5. Address the target audience's deepest pain points
6. Are in {{{language}}}
7. Follow code-mixing patterns from style profile (if provided)
8. Are NOT generic or boring - every title should make someone stop scrolling

For each title, identify which formula you used.`,
    });
    
    const {output} = await prompt(input, { model: input.model || routedModel });
    
    if (!output || !output.titles || output.titles.length === 0) {
      throw new Error('The AI did not return any title suggestions. Please try again.');
    }
    
    await trackAIUsage(
      input.userId,
      output.titles.map((t: { mainTitle: string; subtitle: string }) => `${t.mainTitle}: ${t.subtitle}`).join('\n'),
      'generateBookTitles',
      { titleCount: output.titles.length }
    );
    
    return output;
  } catch (error: any) {
    console.error('Error in generateBookTitles:', error);
    
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
    
    throw new Error(error.message || 'An unexpected error occurred while generating titles. Please try again.');
  }
}
