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
  mainTitle: z.string().describe('The main title (3-7 words, catchy, reflects core concept, hooks attention).'),
  subtitle: z.string().describe('The subtitle (5-8 words, punchy, adds intrigue or promise).'),
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

### 2. CURIOSITY (Create Intrigue - MOST IMPORTANT)
- Leave something UNSAID - don't explain everything
- Create an open loop that MUST be closed by reading the book
- Use mystery, secrets, hidden knowledge, unexpected twists
- Make them NEED to know more
- Questions > Answers in titles

### 3. HOOK (Emotional Pull - Stop the Scroll)
- Challenge conventional wisdom
- Use provocative or counterintuitive statements
- Create urgency or stakes
- Make them feel something IMMEDIATELY (curiosity, shock, hope, determination)

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

## TITLE STRUCTURE (MANDATORY - FOLLOW EXACTLY)

**MAIN TITLE (3-7 words):**
- MUST reflect the book's CORE IDEA or CONCEPT
- Catchy and memorable - should stick in the mind
- Creates curiosity while communicating the book's essence
- Uses power words that hook emotions
- Easy to say, share, and remember
- Examples of GOOD main titles that reflect core concept:
  - "The 7 Habits of Highly Effective People" (core: habits for effectiveness)
  - "Think and Grow Rich" (core: mindset for wealth)
  - "The Subtle Art of Not Giving a F*ck" (core: selective caring)
  - "Atomic Habits" (core: small habits, big change)
  - "The Psychology of Money" (core: money mindset)

**SUBTITLE (5-8 words - STRICT LIMIT):**
- SHORT and PUNCHY - no long explanations
- Adds promise, intrigue, or clarifies the benefit
- Hints at the transformation or secret
- Examples of GOOD short subtitles:
  - "Timeless Lessons on Wealth and Happiness"
  - "Small Changes, Remarkable Results"
  - "The Secret Millionaires Won't Share"
  - "What They Never Taught You"
  - "Your Hidden Path to Mastery"

❌ BAD: Main title that doesn't reflect content (too vague like "Success Secrets")
✅ GOOD: Main title that captures core concept ("The Compound Effect of Daily Habits")

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
1. Pass all THREE GATEWAYS (Positioning, Curiosity, Hook)
2. Use different formulas for variety
3. Main title: 3-7 words, CATCHY, REFLECTS THE BOOK'S CORE CONCEPT
4. Subtitle: 5-8 words (STRICT LIMIT), punchy, adds promise or intrigue
5. Main title should communicate WHAT THE BOOK IS ABOUT at a glance
6. Every title should make someone STOP SCROLLING and NEED to know more
7. Use power words that trigger emotions
8. Are in {{{language}}}
9. Follow code-mixing patterns from style profile (if provided)
10. Are NOT generic, boring, or too vague

**BALANCE: Catchy + Core Concept. The reader should understand what the book offers AND feel curious.**

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
