import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken, verifyAdminToken } from '@/lib/admin-auth';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { orderId, reason } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    if (!reason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    // Get payment record
    const admin = getFirebaseAdmin();
    const paymentRef = admin.firestore().collection('payments').doc(orderId);
    const paymentDoc = await paymentRef.get();

    if (!paymentDoc.exists) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    const paymentData = paymentDoc.data();

    // Check if payment can be rejected
    if (paymentData?.approvalStatus === 'approved') {
      return NextResponse.json(
        { error: 'Cannot reject an already approved payment' },
        { status: 400 }
      );
    }

    // Update payment status to rejected and failed
    await paymentRef.update({
      status: 'failed',
      approvalStatus: 'rejected',
      rejectionReason: reason,
      approvedBy: authResult.email,
      approvedAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Payment rejected successfully',
    });
  } catch (error) {
    console.error('Reject payment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
