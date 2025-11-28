import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { expandOfferSection } from '@/ai/flows/expand-offer-section';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

export async function POST(request: Request) {
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
      originalContent,
      targetWordCount,
      moduleTitle,
      language = 'English',
      expansionFocus,
      styleProfile,
    } = body;

    if (!originalContent || !moduleTitle) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await expandOfferSection({
      userId,
      idToken,
      originalContent,
      targetWordCount: targetWordCount || 700,
      moduleTitle,
      language,
      expansionFocus: expansionFocus || undefined,
      styleProfile: styleProfile || undefined,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error expanding offer section:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to expand section' },
      { status: 500 }
    );
  }
}
