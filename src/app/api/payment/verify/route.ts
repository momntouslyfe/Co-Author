import { NextRequest, NextResponse } from 'next/server';
import { verifyPayment } from '@/lib/uddoktapay';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { processSuccessfulPayment } from '@/lib/payment-processor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceId } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Handle FREE_ORDER invoices (zero-amount payments from 100% coupons)
    if (invoiceId === 'FREE_ORDER') {
      const admin = getFirebaseAdmin();
      const { orderId } = body;
      
      if (!orderId) {
        return NextResponse.json(
          { error: 'Order ID required for FREE_ORDER verification' },
          { status: 400 }
        );
      }
      
      const paymentRef = admin.firestore().collection('payments').doc(orderId);
      const paymentDoc = await paymentRef.get();
      
      if (!paymentDoc.exists) {
        return NextResponse.json(
          { error: 'Payment record not found' },
          { status: 404 }
        );
      }
      
      const paymentData = paymentDoc.data();
      
      // Return success for already completed free orders
      if (paymentData?.status === 'completed' && paymentData?.approvalStatus === 'approved') {
        return NextResponse.json({
          success: true,
          payment: {
            orderId,
            status: 'completed',
            approvalStatus: 'approved',
            message: 'Free order successfully processed. Your credits have been added to your account.',
          },
        });
      }
      
      // If not already processed, this is an error state
      return NextResponse.json(
        { error: 'Free order processing error. Please contact support.' },
        { status: 500 }
      );
    }

    // Verify payment with Uddoktapay
    const result = await verifyPayment(invoiceId);

    if (!result.status) {
      return NextResponse.json(
        { error: result.message || 'Payment verification failed' },
        { status: 400 }
      );
    }

    // Get payment record from Firestore
    const admin = getFirebaseAdmin();
    const orderId = result.metadata?.order_id;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID not found in payment metadata' },
        { status: 400 }
      );
    }

    const paymentRef = admin.firestore().collection('payments').doc(orderId);
    const paymentDoc = await paymentRef.get();

    if (!paymentDoc.exists) {
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      );
    }

    const existingInvoiceId = paymentDoc.data()?.invoiceId;

    // SECURITY: Check if this invoice is already assigned to a different order ID
    if (existingInvoiceId && existingInvoiceId !== invoiceId) {
      console.error(
        `SECURITY ALERT - Attempt to change invoice ID! ` +
        `Order ${orderId} already has invoice ${existingInvoiceId}, ` +
        `verify request tried to set ${invoiceId}`
      );
      return NextResponse.json(
        { error: 'Invoice ID cannot be changed' },
        { status: 400 }
      );
    }

    // SECURITY: Check if invoice is already used by another order
    const invoiceQuery = await admin.firestore()
      .collection('payments')
      .where('invoiceId', '==', invoiceId)
      .get();
    
    if (!invoiceQuery.empty) {
      const existingOrder = invoiceQuery.docs[0];
      if (existingOrder.id !== orderId) {
        console.error(
          `SECURITY ALERT - Invoice reuse attempt! ` +
          `Invoice ${invoiceId} already used by order ${existingOrder.id}, ` +
          `cannot use for order ${orderId}`
        );
        return NextResponse.json(
          { error: 'Invoice already used by another order' },
          { status: 400 }
        );
      }
    }

    const currentStatus = paymentDoc.data()?.status;
    const currentApprovalStatus = paymentDoc.data()?.approvalStatus;

    // Update basic payment info first
    const updateData: any = {
      invoiceId: result.invoice_id,
      paymentMethod: result.payment_method || '',
      senderNumber: result.sender_number || '',
      transactionId: result.transaction_id || '',
      fee: result.fee || '0',
      chargedAmount: result.charged_amount || result.amount || '0',
      updatedAt: new Date(),
      metadata: result.metadata || {},
    };

    await paymentRef.update(updateData);

    // Auto-process successful payment (verify amount, grant credits, approve)
    const processResult = await processSuccessfulPayment(orderId, invoiceId);
    
    if (!processResult.success) {
      console.error('Auto-approval failed:', processResult.error);
      // If auto-approval fails due to verification or security issues, mark as failed
      // This prevents users from being stuck in pending state
      await paymentRef.update({
        status: 'failed',
        approvalStatus: 'rejected',
        rejectionReason: `Auto-approval failed: ${processResult.error}`,
        updatedAt: new Date(),
      });
    }

    // Get the final updated document to return current status
    const updatedDoc = await paymentRef.get();
    const updatedData = updatedDoc.data();

    const paymentStatus = updatedData?.status;
    const approvalStatus = updatedData?.approvalStatus;

    // Handle rejected or failed payments
    if (paymentStatus === 'failed' || approvalStatus === 'rejected') {
      return NextResponse.json({
        success: false,
        error: updatedData?.rejectionReason || 'Payment was rejected or failed',
        payment: {
          orderId,
          status: paymentStatus,
          approvalStatus: approvalStatus,
          rejectionReason: updatedData?.rejectionReason,
        },
      });
    }

    // Handle cancelled payments
    if (paymentStatus === 'cancelled') {
      return NextResponse.json({
        success: false,
        error: 'Payment was cancelled',
        payment: {
          orderId,
          status: paymentStatus,
        },
      });
    }

    return NextResponse.json({
      success: true,
      payment: {
        orderId,
        invoiceId: result.invoice_id,
        amount: result.amount,
        status: paymentStatus || 'processing',
        approvalStatus: approvalStatus || 'pending',
        message: paymentStatus === 'completed' 
          ? 'Payment approved! Your credits have been added to your account.'
          : 'Payment verified. Awaiting admin approval.',
      },
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
