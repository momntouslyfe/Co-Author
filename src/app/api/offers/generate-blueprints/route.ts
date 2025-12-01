import { NextResponse } from 'next/server';
import { generateOfferBlueprints } from '@/ai/flows/generate-offer-blueprints';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { OFFER_CATEGORY_STRUCTURE } from '@/lib/definitions';
import type { OfferCategory, OfferBlueprint, OfferBlueprintPart, OfferBlueprintModule } from '@/lib/definitions';

export async function POST(request: Request) {
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
      bookTitle,
      bookDescription,
      offerCategory,
      offerTitle,
      offerDescription,
      language = 'English',
      researchProfile: researchProfileContent,
      styleProfile: styleProfileContent,
      authorProfile: authorProfileContent,
      storytellingFramework,
    } = body;

    if (!bookTitle || !offerCategory || !offerTitle || !offerDescription) {
      return NextResponse.json(
        { error: 'Missing required fields: bookTitle, offerCategory, offerTitle, offerDescription' },
        { status: 400 }
      );
    }

    const researchProfile = researchProfileContent || '';
    const styleProfile = styleProfileContent || '';
    const authorProfile = authorProfileContent || '';

    const result = await generateOfferBlueprints({
      userId,
      idToken,
      bookTitle,
      bookOutline: bookDescription,
      offerCategory,
      offerTitle,
      offerDescription,
      language,
      researchProfile: researchProfile || undefined,
      styleProfile: styleProfile || undefined,
      authorProfile: authorProfile || undefined,
      storytellingFramework: storytellingFramework || undefined,
    });

    const category = offerCategory as Exclude<OfferCategory, 'all'>;
    const structure = OFFER_CATEGORY_STRUCTURE[category];
    if (!structure) {
      return NextResponse.json({ error: 'Invalid offer category' }, { status: 400 });
    }

    const transformedBlueprints: OfferBlueprint[] = result.blueprints.map((bp, index) => {
      const parts: OfferBlueprintPart[] = bp.parts.map((part, partIndex) => {
        const modules: OfferBlueprintModule[] = part.modules.map((moduleTitle) => ({
          title: moduleTitle,
          description: `Content for ${moduleTitle} - focuses on key aspects of ${part.title}`,
          targetWordCount: structure.wordsPerModule,
        }));
        return {
          title: part.title,
          modules,
        };
      });

      return {
        id: `blueprint-${index + 1}`,
        title: bp.title,
        subtitle: undefined,
        summary: bp.summary,
        parts,
        estimatedWordCount: bp.estimatedWordCount || (structure.parts * structure.modulesPerPart * structure.wordsPerModule),
      };
    });

    return NextResponse.json({ blueprints: transformedBlueprints });
  } catch (error: any) {
    console.error('Error generating offer blueprints:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate blueprints' },
      { status: 500 }
    );
  }
}
