import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken, verifyAdminToken } from '@/lib/admin-auth';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const authResult = verifyAdminToken(token);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const approvalStatus = searchParams.get('approvalStatus');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Query Firestore for payments
    const admin = getFirebaseAdmin();
    let query: any = admin.firestore().collection('payments');

    // Apply filters if provided
    if (status) {
      query = query.where('status', '==', status);
    }

    if (approvalStatus) {
      query = query.where('approvalStatus', '==', approvalStatus);
    }

    // Add ordering and limit
    query = query.orderBy('createdAt', 'desc').limit(limit);

    const snapshot = await query.get();

    const payments = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
      completedAt: doc.data().completedAt?.toDate?.()?.toISOString() || null,
      approvedAt: doc.data().approvedAt?.toDate?.()?.toISOString() || null,
    }));

    return NextResponse.json({ payments });
  } catch (error) {
    console.error('List payments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
