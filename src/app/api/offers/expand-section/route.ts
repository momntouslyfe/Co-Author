import { NextResponse } from 'next/server';
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
    const decodedToken = await admin.auth().verifyIdToken(idToken);
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
      console.error('Expand section missing required fields:', { 
        hasOriginalContent: !!originalContent, 
        originalContentLength: originalContent?.length,
        hasModuleTitle: !!moduleTitle,
        moduleTitle 
      });
      return NextResponse.json(
        { error: `Missing required fields: originalContent=${!!originalContent}, moduleTitle=${!!moduleTitle}` },
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

    if (!result.success) {
      const status = result.code === 'NO_ACTIVE_SUBSCRIPTION' ? 402 : 
                     result.code === 'INSUFFICIENT_CREDITS' ? 402 : 500;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(result.data);
  } catch (error: any) {
    console.error('Error expanding offer section:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to expand section' },
      { status: 500 }
    );
  }
}
