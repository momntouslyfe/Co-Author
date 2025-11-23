import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken, verifyAdminToken } from '@/lib/admin-auth';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { addCredits } from '@/lib/credits';
import { verifyPayment } from '@/lib/uddoktapay';

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
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
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

    // Check if payment is in a state that can be approved
    if (paymentData?.status !== 'processing' && paymentData?.status !== 'pending') {
      return NextResponse.json(
        { error: 'Payment must be in pending or processing status to approve' },
        { status: 400 }
      );
    }

    if (paymentData?.approvalStatus === 'approved') {
      return NextResponse.json(
        { error: 'Payment is already approved' },
        { status: 400 }
      );
    }

    // SECURITY: Verify payment with Uddoktapay to get authoritative charged amount
    // This prevents tampering with stored chargedAmount via fake webhooks or database manipulation
    if (!paymentData?.invoiceId) {
      return NextResponse.json(
        { error: 'Payment invoice ID not found. Cannot verify payment with gateway.' },
        { status: 400 }
      );
    }

    const verificationResult = await verifyPayment(paymentData.invoiceId);
    
    if (!verificationResult.status) {
      console.error(`Failed to verify payment with Uddoktapay for order ${orderId}:`, verificationResult.message);
      return NextResponse.json(
        { error: `Payment verification with gateway failed: ${verificationResult.message || 'Unknown error'}` },
        { status: 400 }
      );
    }

    // Use the AUTHORITATIVE charged amount from Uddoktapay, not the stored value
    const authoritativeChargedAmount = parseFloat(verificationResult.charged_amount || verificationResult.amount || '0');

    // SECURITY: Validate payment amount before granting credits
    if (paymentData?.addonId) {
      try {
        // Get addon plan details
        const addonPlanRef = admin.firestore().collection('addonCreditPlans').doc(paymentData.addonId);
        const addonPlanDoc = await addonPlanRef.get();

        if (!addonPlanDoc.exists) {
          console.error(`Addon plan ${paymentData.addonId} not found`);
          return NextResponse.json(
            { error: 'Referenced addon plan not found. Cannot approve payment.' },
            { status: 400 }
          );
        }

        const addonPlan = addonPlanDoc.data();
        const expectedPrice = addonPlan?.price || 0;

        // SECURITY: Validate that AUTHORITATIVE charged amount from Uddoktapay matches expected price
        // We use the verified amount from Uddoktapay API, not the stored chargedAmount
        if (Math.abs(authoritativeChargedAmount - expectedPrice) > 0.01) {
          // Allow 1 cent tolerance for floating point issues
          console.error(
            `SECURITY ALERT - Payment amount mismatch! ` +
            `Expected: ${expectedPrice}, ` +
            `Charged (verified with Uddoktapay): ${authoritativeChargedAmount}, ` +
            `Order: ${orderId}, ` +
            `Invoice: ${paymentData.invoiceId}`
          );
          return NextResponse.json(
            { 
              error: `Payment amount mismatch detected. Expected ${expectedPrice} ${paymentData.currency || 'BDT'}, but Uddoktapay verified amount is ${authoritativeChargedAmount} ${paymentData.currency || 'BDT'}. This payment may be fraudulent and cannot be approved.` 
            },
            { status: 400 }
          );
        }

        const creditType = addonPlan?.type || 'words';
        const creditAmount = addonPlan?.creditAmount || 0;

        if (creditAmount > 0) {
          const transactionType = creditType === 'words' ? 'word_purchase' : 'book_purchase';

          await addCredits(
            paymentData.userId,
            creditType,
            creditAmount,
            transactionType,
            `Purchased ${creditAmount} ${creditType} credits - Order: ${orderId}`,
            {
              orderId,
              addonId: paymentData.addonId,
              invoiceId: paymentData.invoiceId,
              approvedBy: authResult.email,
              expectedPrice,
              verifiedChargedAmount: authoritativeChargedAmount,
            }
          );
        }
      } catch (creditError) {
        console.error('Error granting credits:', creditError);
        return NextResponse.json(
          { error: creditError instanceof Error ? creditError.message : 'Failed to grant credits' },
          { status: 500 }
        );
      }
    }

    // Update payment status to approved and completed
    // Also update with verified charged amount from Uddoktapay
    await paymentRef.update({
      status: 'completed',
      approvalStatus: 'approved',
      approvedBy: authResult.email,
      approvedAt: new Date(),
      completedAt: new Date(),
      updatedAt: new Date(),
      verifiedChargedAmount: authoritativeChargedAmount.toString(), // Store the verified amount
    });

    return NextResponse.json({
      success: true,
      message: 'Payment approved and credits granted successfully',
    });
  } catch (error) {
    console.error('Approve payment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
