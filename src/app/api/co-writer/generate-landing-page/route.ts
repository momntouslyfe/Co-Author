import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { writeLandingPageCopy } from '@/ai/flows/write-landing-page-copy';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const admin = getFirebaseAdmin();
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    const body = await request.json();
    
    const {
      bookTitle,
      bookOutline,
      bookDescription,
      language,
      targetWordCount,
      offers,
      customInstructions,
      researchProfile,
      styleProfile,
      authorProfile,
      storytellingFramework,
      contentFramework,
    } = body;

    if (!bookTitle || !bookOutline) {
      return NextResponse.json(
        { error: 'Book title and outline are required' },
        { status: 400 }
      );
    }

    const result = await writeLandingPageCopy({
      userId: decodedToken.uid,
      idToken,
      bookTitle,
      bookOutline,
      bookDescription,
      language: language || 'English',
      targetWordCount: targetWordCount || 1500,
      offers: offers || undefined,
      customInstructions: customInstructions || undefined,
      researchProfile: researchProfile || undefined,
      styleProfile: styleProfile || undefined,
      authorProfile: authorProfile || undefined,
      storytellingFramework: storytellingFramework || undefined,
      contentFramework: contentFramework || undefined,
    });

    if (!result.success) {
      const status = result.code === 'NO_ACTIVE_SUBSCRIPTION' ? 402 : 
                     result.code === 'INSUFFICIENT_CREDITS' ? 402 : 500;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(result.data);
  } catch (error: any) {
    console.error('Error generating landing page copy:', error);
    
    if (error.message?.includes('Insufficient word credits')) {
      return NextResponse.json(
        { error: error.message },
        { status: 402 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to generate landing page copy' },
      { status: 500 }
    );
  }
}
