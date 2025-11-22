import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { trackBookCreation } from '@/lib/credit-tracker';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    const { projectId, projectTitle } = await request.json();
    
    if (!projectId || !projectTitle) {
      return NextResponse.json(
        { error: 'Project ID and title are required' },
        { status: 400 }
      );
    }
    
    initializeFirebaseAdmin();
    const db = admin.firestore();
    const projectDoc = await db
      .collection('users')
      .doc(userId)
      .collection('projects')
      .doc(projectId)
      .get();
    
    if (!projectDoc.exists) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }
    
    await trackBookCreation(userId, projectId, projectTitle);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Track book creation error:', error);
    
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
