import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, invoiceId } = body;

    if (!orderId && !invoiceId) {
      return NextResponse.json(
        { error: 'Order ID or Invoice ID is required' },
        { status: 400 }
      );
    }

    const admin = getFirebaseAdmin();
    let paymentDoc;

    if (orderId) {
      const paymentRef = admin.firestore().collection('payments').doc(orderId);
      paymentDoc = await paymentRef.get();
    } else if (invoiceId) {
      const querySnapshot = await admin.firestore()
        .collection('payments')
        .where('invoiceId', '==', invoiceId)
        .limit(1)
        .get();
      
      if (!querySnapshot.empty) {
        paymentDoc = querySnapshot.docs[0];
      }
    }

    if (!paymentDoc || !paymentDoc.exists) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    const paymentData = paymentDoc.data();
    const paymentStatus = paymentData?.status;
    const approvalStatus = paymentData?.approvalStatus;

    // Handle rejected or failed payments
    if (paymentStatus === 'failed' || approvalStatus === 'rejected') {
      return NextResponse.json({
        success: false,
        error: paymentData?.rejectionReason || 'Payment was rejected or failed',
        payment: {
          orderId: paymentDoc.id,
          status: paymentStatus,
          approvalStatus: approvalStatus,
          rejectionReason: paymentData?.rejectionReason,
        },
      });
    }

    // Handle cancelled payments
    if (paymentStatus === 'cancelled') {
      return NextResponse.json({
        success: false,
        error: 'Payment was cancelled',
        payment: {
          orderId: paymentDoc.id,
          status: paymentStatus,
        },
      });
    }

    return NextResponse.json({
      success: true,
      payment: {
        orderId: paymentDoc.id,
        status: paymentStatus,
        approvalStatus: approvalStatus,
        amount: paymentData?.chargedAmount || paymentData?.amount,
        createdAt: paymentData?.createdAt?.toDate?.()?.toISOString(),
        completedAt: paymentData?.completedAt?.toDate?.()?.toISOString(),
        message: paymentStatus === 'completed' 
          ? 'Payment approved! Your credits have been added to your account.'
          : paymentStatus === 'processing'
          ? 'Payment is being processed and awaiting admin approval.'
          : 'Payment is pending verification.',
      },
    });
  } catch (error) {
    console.error('Payment status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
