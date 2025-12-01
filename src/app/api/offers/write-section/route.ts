import { NextResponse } from 'next/server';
import { writeOfferSection } from '@/ai/flows/write-offer-section';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

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
      offerTitle,
      offerCategory,
      blueprintSummary,
      partTitle,
      moduleTitle,
      allParts,
      targetWordCount,
      previousContent,
      bookContext,
      language = 'English',
      styleProfile,
      researchProfile,
      storytellingFramework,
      customInstructions,
    } = body;

    if (!offerTitle || !offerCategory || !partTitle || !moduleTitle) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await writeOfferSection({
      userId,
      idToken,
      offerTitle,
      offerCategory,
      blueprintSummary: blueprintSummary || '',
      partTitle,
      moduleTitle,
      allParts: allParts || '',
      targetWordCount: targetWordCount || 500,
      previousContent: previousContent || undefined,
      bookContext: bookContext || undefined,
      language,
      styleProfile: styleProfile || undefined,
      researchProfile: researchProfile || undefined,
      storytellingFramework: storytellingFramework || undefined,
      customInstructions: customInstructions || undefined,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error writing offer section:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to write section' },
      { status: 500 }
    );
  }
}
