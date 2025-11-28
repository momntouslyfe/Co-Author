import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { trackOfferCreation } from '@/lib/credit-tracker';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    const { draftId, draftTitle, projectId } = await request.json();
    
    if (!draftId || !draftTitle || !projectId) {
      return NextResponse.json(
        { error: 'Draft ID, title, and project ID are required' },
        { status: 400 }
      );
    }
    
    initializeFirebaseAdmin();
    const db = admin.firestore();
    const draftDoc = await db
      .collection('users')
      .doc(userId)
      .collection('projects')
      .doc(projectId)
      .collection('offerDrafts')
      .doc(draftId)
      .get();
    
    if (!draftDoc.exists) {
      return NextResponse.json(
        { error: 'Offer draft not found or access denied' },
        { status: 404 }
      );
    }
    
    await trackOfferCreation(userId, draftId, draftTitle);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Track offer creation error:', error);
    
    if (error.message.includes('Not authenticated')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
