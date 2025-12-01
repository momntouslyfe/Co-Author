import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { getGenkitInstanceForFunction } from '@/lib/genkit-admin';
import { trackAIUsage, preflightCheckWordCredits } from '@/lib/credit-tracker';
import { z } from 'genkit';
import { OFFER_CATEGORY_LABELS } from '@/lib/definitions';
import type { OfferCategory } from '@/lib/definitions';

const TitleGenerationInputSchema = z.object({
  offerTitle: z.string(),
  offerDescription: z.string(),
  offerCategory: z.string(),
  masterBlueprint: z.string(),
  language: z.string(),
  storytellingFramework: z.string().optional(),
  researchProfile: z.string().optional(),
  styleProfile: z.string().optional(),
});

const OfferTitleSchema = z.object({
  mainTitle: z.string().describe('The main title (3-7 words, catchy, reflects core concept, hooks attention).'),
  subtitle: z.string().describe('The subtitle (5-8 words, punchy, adds intrigue or promise).'),
  formula: z.string().describe('Which formula was used (e.g., Warrior/Hero, Number+Promise, Question Hook, etc.).'),
});

const TitleGenerationOutputSchema = z.object({
  titles: z.array(OfferTitleSchema).describe('An array of 10-12 high-converting offer titles with subtitles.'),
});

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];

    const admin = getFirebaseAdmin();
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const body = await request.json();
    const {
      offerTitle,
      offerDescription,
      offerCategory,
      masterBlueprint,
      language,
      storytellingFramework,
      researchProfile,
      styleProfile,
    } = body;

    if (!masterBlueprint || !language) {
      return NextResponse.json(
        { error: 'Missing required fields: masterBlueprint, language' },
        { status: 400 }
      );
    }

    await preflightCheckWordCredits(userId, 300);

    const { ai, model } = await getGenkitInstanceForFunction('title', userId, idToken);

    const categoryLabel = OFFER_CATEGORY_LABELS[offerCategory as OfferCategory] || offerCategory;

    const prompt = ai.definePrompt({
      name: 'generateOfferTitlesPrompt',
      input: { schema: TitleGenerationInputSchema },
      output: { schema: TitleGenerationOutputSchema },
      prompt: `You are an elite offer title strategist who has studied thousands of bestselling digital products, bonuses, and courses. Your titles convert 5-7x better than generic titles. Your task is to generate 10-12 HIGH-CONVERTING titles for this ${categoryLabel} that grab attention, create emotional impact, and drive action.

**Language:** ${language}

**OFFER CONTEXT:**
- Original Idea: ${offerTitle}
- Description: ${offerDescription || 'Not provided'}
- Category: ${categoryLabel}
${storytellingFramework ? `- Storytelling Framework: ${storytellingFramework}` : ''}

${researchProfile ? `**TARGET AUDIENCE & PAIN POINTS (CRITICAL - Use their language):**
${researchProfile}` : ''}

${styleProfile ? `**STYLE PROFILE (Match tone and code-mixing):**
${styleProfile}

**CODE-MIXING INTEGRITY:** If the style profile shows code-mixing (e.g., Bengali with English words), use that SAME pattern in titles. Use mixed words NATURALLY without parenthetical translations.
WRONG: "সাকসেস (Success) ম্যানুয়াল"
CORRECT: "সাকসেস ম্যানুয়াল"` : ''}

**OFFER BLUEPRINT:**
${masterBlueprint}

---

## THE THREE GATEWAYS FRAMEWORK (MANDATORY)

Every title MUST pass through these three gateways:

### 1. POSITIONING (Establish Unique Angle)
- What makes this ${categoryLabel} different from 100 others on the same topic?
- Create a unique identity/character (Warrior, Maverick, Insider, etc.)
- Position the reader as someone special who deserves this knowledge

### 2. CURIOSITY (Create Intrigue - MOST IMPORTANT)
- Leave something UNSAID - don't explain everything
- Create an open loop that MUST be closed by accessing this offer
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
   Example: "Time Warrior: Reclaim 3 Hours of Your Day"

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
   Example: "From Broke to Blessed: The Mindset Shift"

---

## TITLE STRUCTURE (MANDATORY - FOLLOW EXACTLY)

**MAIN TITLE (3-7 words):**
- MUST reflect the ${categoryLabel}'s CORE IDEA or CONCEPT
- Catchy and memorable - should stick in the mind
- Creates curiosity while communicating the offer's essence
- Uses power words that hook emotions
- Easy to say, share, and remember
- Examples of GOOD main titles that reflect core concept:
  - "The 7 Habits of Highly Effective People" (core: habits for effectiveness)
  - "Think and Grow Rich" (core: mindset for wealth)
  - "The Subtle Art of Not Giving a F*ck" (core: selective caring)
  - "Atomic Habits" (core: small habits, big change)

**SUBTITLE (5-8 words - STRICT LIMIT):**
- SHORT and PUNCHY - no long explanations
- Adds promise, intrigue, or clarifies the benefit
- Hints at the transformation or secret
- Examples of GOOD short subtitles:
  - "Timeless Lessons on Wealth and Happiness"
  - "Small Changes, Remarkable Results"
  - "The Secret Millionaires Won't Share"
  - "What They Never Taught You"

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
- HIGH-CONVERTING: "Time Warrior: Reclaim 3 Hours of Your Day"

- GENERIC: "How to Start a Business"
- HIGH-CONVERTING: "The $100K Blueprint: From Side Hustle to Empire"

---

## YOUR TASK

Generate 10-12 HIGH-CONVERTING titles for this ${categoryLabel} that:
1. Pass all THREE GATEWAYS (Positioning, Curiosity, Hook)
2. Use different formulas for variety
3. Main title: 3-7 words, CATCHY, REFLECTS THE OFFER'S CORE CONCEPT
4. Subtitle: 5-8 words (STRICT LIMIT), punchy, adds promise or intrigue
5. Main title should communicate WHAT THE OFFER IS ABOUT at a glance
6. Every title should make someone STOP SCROLLING and NEED to know more
7. Use power words that trigger emotions
8. Are in ${language}
9. Follow code-mixing patterns from style profile (if provided)
10. Are NOT generic, boring, or too vague

**BALANCE: Catchy + Core Concept. The reader should understand what the offer provides AND feel curious.**

For each title, identify which formula you used.`,
    });

    const { output } = await prompt(
      {
        offerTitle,
        offerDescription: offerDescription || '',
        offerCategory,
        masterBlueprint,
        language,
        storytellingFramework: storytellingFramework || '',
        researchProfile: researchProfile || '',
        styleProfile: styleProfile || '',
      },
      { model }
    );

    if (!output || !output.titles || output.titles.length === 0) {
      throw new Error('Failed to generate titles');
    }

    await trackAIUsage(
      userId,
      output.titles.map((t: { mainTitle: string; subtitle: string }) => `${t.mainTitle}: ${t.subtitle}`).join('\n'),
      'generateOfferTitles',
      { offerTitle, category: offerCategory, titleCount: output.titles.length }
    );

    return NextResponse.json({ titles: output.titles });
  } catch (error: any) {
    console.error('Error generating offer titles:', error);
    
    if (error.message?.includes('503') || error.message?.includes('overloaded')) {
      return NextResponse.json(
        { error: 'The AI service is currently overloaded. Please wait a moment and try again.' },
        { status: 503 }
      );
    }
    
    if (error.message?.includes('401') || error.message?.includes('Unauthorized') || error.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'Your API key appears to be invalid or expired. Please check your API key in Settings.' },
        { status: 401 }
      );
    }
    
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      return NextResponse.json(
        { error: 'You have exceeded your API quota. Please check your usage limits or try again later.' },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to generate titles' },
      { status: 500 }
    );
  }
}
