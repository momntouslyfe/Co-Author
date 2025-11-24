import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { verifyPayment } from '@/lib/uddoktapay';
import type { UddoktapayWebhookData } from '@/types/uddoktapay';

export async function POST(request: NextRequest) {
  try {
    // Verify webhook authenticity using API key in header
    const apiKey = request.headers.get('RT-UDDOKTAPAY-API-KEY');
    const expectedApiKey = process.env.UDDOKTAPAY_API_KEY;

    if (!apiKey || apiKey !== expectedApiKey) {
      console.error('Webhook authentication failed');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse webhook data
    const webhookData: UddoktapayWebhookData = await request.json();

    // Validate webhook data
    if (!webhookData.invoice_id || !webhookData.metadata?.order_id) {
      console.error('Invalid webhook data:', webhookData);
      return NextResponse.json(
        { error: 'Invalid webhook data' },
        { status: 400 }
      );
    }

    const orderId = webhookData.metadata.order_id;

    // Get payment record from Firestore
    const admin = getFirebaseAdmin();
    const paymentRef = admin.firestore().collection('payments').doc(orderId);
    const paymentDoc = await paymentRef.get();

    if (!paymentDoc.exists) {
      console.error('Payment record not found for order:', orderId);
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      );
    }

    const existingStatus = paymentDoc.data()?.status;
    const existingApprovalStatus = paymentDoc.data()?.approvalStatus;
    const existingInvoiceId = paymentDoc.data()?.invoiceId;

    // Prevent duplicate processing only if payment is fully completed and approved
    // This allows retries if auto-approval failed on earlier attempts
    if (existingStatus === 'completed' && existingApprovalStatus === 'approved') {
      console.log('Payment already fully processed and approved:', orderId);
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    // SECURITY: Verify invoice with Uddoktapay to prevent invoice substitution attacks
    // This ensures the invoice is real and matches this specific order
    const verificationResult = await verifyPayment(webhookData.invoice_id);
    
    if (!verificationResult.status) {
      console.error(`SECURITY ALERT - Webhook invoice verification failed for order ${orderId}, invoice ${webhookData.invoice_id}`);
      return NextResponse.json(
        { error: 'Invoice verification failed' },
        { status: 400 }
      );
    }

    // SECURITY: Validate that the verified invoice's order_id matches this payment record
    if (verificationResult.metadata?.order_id !== orderId) {
      console.error(
        `SECURITY ALERT - Invoice substitution attempt detected! ` +
        `Webhook claimed order ${orderId}, ` +
        `but verified invoice ${webhookData.invoice_id} belongs to order ${verificationResult.metadata?.order_id}`
      );
      return NextResponse.json(
        { error: 'Invoice does not belong to this order' },
        { status: 400 }
      );
    }

    // SECURITY: Check if this invoice is already assigned to a different order
    if (existingInvoiceId && existingInvoiceId !== webhookData.invoice_id) {
      console.error(
        `SECURITY ALERT - Attempt to change invoice ID! ` +
        `Order ${orderId} already has invoice ${existingInvoiceId}, ` +
        `webhook tried to set ${webhookData.invoice_id}`
      );
      return NextResponse.json(
        { error: 'Invoice ID cannot be changed' },
        { status: 400 }
      );
    }

    // SECURITY: Check if invoice is already used by another order
    const invoiceQuery = await admin.firestore()
      .collection('payments')
      .where('invoiceId', '==', webhookData.invoice_id)
      .get();
    
    if (!invoiceQuery.empty) {
      const existingOrder = invoiceQuery.docs[0];
      if (existingOrder.id !== orderId) {
        console.error(
          `SECURITY ALERT - Invoice reuse attempt! ` +
          `Invoice ${webhookData.invoice_id} already used by order ${existingOrder.id}, ` +
          `cannot use for order ${orderId}`
        );
        return NextResponse.json(
          { error: 'Invoice already used by another order' },
          { status: 400 }
        );
      }
    }

    // Update payment record with webhook data (now validated)
    await paymentRef.update({
      invoiceId: webhookData.invoice_id,
      paymentMethod: webhookData.payment_method,
      senderNumber: webhookData.sender_number,
      transactionId: webhookData.transaction_id,
      fee: webhookData.fee,
      chargedAmount: webhookData.charged_amount,
      updatedAt: new Date(),
      metadata: webhookData.metadata,
    });

    // Auto-process successful payment (verify amount, grant credits, approve)
    const { processSuccessfulPayment } = await import('@/lib/payment-processor');
    const processResult = await processSuccessfulPayment(orderId, webhookData.invoice_id);
    
    if (!processResult.success) {
      console.error('Webhook auto-approval failed:', processResult.error);
      // If auto-approval fails due to verification or security issues, mark as failed
      // This prevents users from being stuck in pending state
      await paymentRef.update({
        status: 'failed',
        approvalStatus: 'rejected',
        rejectionReason: `Auto-approval failed: ${processResult.error}`,
        updatedAt: new Date(),
      });
    }

    console.log('Webhook processed successfully for order:', orderId);

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
