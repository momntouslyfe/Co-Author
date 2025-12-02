import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/server-auth';
import { checkBookCreationCredit, trackBookCreation } from '@/lib/credit-tracker';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    const body = await request.json();
    const { title, authorProfileId } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Project title is required' },
        { status: 400 }
      );
    }

    await checkBookCreationCredit(userId);

    const admin = getFirebaseAdmin();
    const db = admin.firestore();
    const projectRef = db.collection('users').doc(userId).collection('projects').doc();
    
    const projectData: any = {
      userId,
      title: title.trim(),
      status: 'Draft',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      imageUrl: `https://picsum.photos/seed/${Math.random()}/600/800`,
      imageHint: 'book cover'
    };

    if (authorProfileId && authorProfileId !== 'none') {
      projectData.authorProfileId = authorProfileId;
    }

    await projectRef.set(projectData);

    await trackBookCreation(userId, projectRef.id, title.trim());

    return NextResponse.json({
      success: true,
      projectId: projectRef.id,
      message: 'Project created successfully'
    });

  } catch (error: any) {
    console.error('Create book project error:', error);
    
    if (error.message?.includes('Not authenticated')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (error.name === 'SubscriptionRequiredError' || error.message?.includes('Insufficient')) {
      return NextResponse.json(
        { error: error.message || 'Insufficient credits' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to create project' },
      { status: 500 }
    );
  }
}
