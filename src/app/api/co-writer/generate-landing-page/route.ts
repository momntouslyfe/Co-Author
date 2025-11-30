import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
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
    const auth = getAuth(admin);
    const decodedToken = await auth.verifyIdToken(idToken);

    const body = await request.json();
    
    const {
      bookTitle,
      bookSubtitle,
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
      bookSubtitle,
      bookOutline,
      bookDescription,
      language: language || 'English',
      targetWordCount: targetWordCount || 2000,
      offers: offers || undefined,
      customInstructions: customInstructions || undefined,
      researchProfile: researchProfile || undefined,
      styleProfile: styleProfile || undefined,
      authorProfile: authorProfile || undefined,
      storytellingFramework: storytellingFramework || undefined,
    });

    return NextResponse.json(result);
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
