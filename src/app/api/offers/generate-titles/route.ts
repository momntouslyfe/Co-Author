import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
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
});

const TitleGenerationOutputSchema = z.object({
  title1: z.string().describe('First title option'),
  title2: z.string().describe('Second title option'),
  title3: z.string().describe('Third title option'),
  title4: z.string().describe('Fourth title option'),
  title5: z.string().describe('Fifth title option'),
});

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];

    const admin = getFirebaseAdmin();
    const auth = getAuth(admin);
    const decodedToken = await auth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const body = await request.json();
    const {
      offerTitle,
      offerDescription,
      offerCategory,
      masterBlueprint,
      language,
      storytellingFramework,
    } = body;

    if (!masterBlueprint || !language) {
      return NextResponse.json(
        { error: 'Missing required fields: masterBlueprint, language' },
        { status: 400 }
      );
    }

    await preflightCheckWordCredits(userId, 200);

    const { ai, model } = await getGenkitInstanceForFunction('title', userId, idToken);

    const categoryLabel = OFFER_CATEGORY_LABELS[offerCategory as OfferCategory] || offerCategory;

    const prompt = ai.definePrompt({
      name: 'generateOfferTitlesPrompt',
      input: { schema: TitleGenerationInputSchema },
      output: { schema: TitleGenerationOutputSchema },
      prompt: `You are an expert copywriter specializing in creating compelling titles for bonus materials and digital products.

**OFFER CONTEXT:**
- Original Idea: ${offerTitle}
- Description: ${offerDescription || 'Not provided'}
- Category: ${categoryLabel}
- Language: ${language}
${storytellingFramework ? `- Storytelling Framework: ${storytellingFramework}` : ''}

**MASTER BLUEPRINT:**
${masterBlueprint}

**YOUR TASK:**
Generate 5 unique, compelling title options for this ${categoryLabel}. Each title should:

1. Be written in ${language}
2. Clearly communicate the value and benefit
3. Be attention-grabbing and memorable
4. Match the tone of the offer category (${categoryLabel})
5. Appeal to the target audience

**TITLE STYLES TO INCLUDE:**
- title1: A benefit-focused title (emphasizes what readers will gain)
- title2: A curiosity-driven title (creates intrigue)
- title3: A results-oriented title (focuses on outcomes)
- title4: A simple, direct title (clear and to the point)
- title5: A creative/unique title (stands out from the crowd)

Generate 5 diverse, high-quality titles now.`,
    });

    const { output } = await prompt(
      {
        offerTitle,
        offerDescription: offerDescription || '',
        offerCategory,
        masterBlueprint,
        language,
        storytellingFramework: storytellingFramework || '',
      },
      { model }
    );

    if (!output) {
      throw new Error('Failed to generate titles');
    }

    const titles = [
      output.title1,
      output.title2,
      output.title3,
      output.title4,
      output.title5,
    ].filter(Boolean);

    await trackAIUsage(
      userId,
      titles.join('\n'),
      'generateOfferTitles',
      { offerTitle, category: offerCategory }
    );

    return NextResponse.json({ titles });
  } catch (error: any) {
    console.error('Error generating offer titles:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate titles' },
      { status: 500 }
    );
  }
}
