import { NextRequest, NextResponse } from 'next/server';
import { verifyPayment } from '@/lib/uddoktapay';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

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

    // Update payment record with verification details (now validated)
    await paymentRef.update({
      invoiceId: result.invoice_id,
      paymentMethod: result.payment_method || '',
      senderNumber: result.sender_number || '',
      transactionId: result.transaction_id || '',
      fee: result.fee || '0',
      chargedAmount: result.charged_amount || result.amount || '0',
      status: 'processing',
      updatedAt: new Date(),
      metadata: result.metadata || {},
    });

    return NextResponse.json({
      success: true,
      payment: {
        orderId,
        invoiceId: result.invoice_id,
        amount: result.amount,
        status: 'processing',
        message: 'Payment verified. Awaiting admin approval.',
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
