import { getFirebaseAdmin } from './firebase-admin';
import { verifyPayment } from './uddoktapay';
import { addCredits, activateSubscriptionPlan } from './credits';

interface ProcessPaymentResult {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Process and auto-approve a successful payment
 * This function verifies the payment, validates amounts, and grants credits/subscription
 */
export async function processSuccessfulPayment(
  orderId: string,
  invoiceId: string
): Promise<ProcessPaymentResult> {
  try {
    const admin = getFirebaseAdmin();
    const paymentRef = admin.firestore().collection('payments').doc(orderId);
    const paymentDoc = await paymentRef.get();

    if (!paymentDoc.exists) {
      return {
        success: false,
        error: 'Payment record not found',
      };
    }

    const paymentData = paymentDoc.data();

    // Check if already completed
    if (paymentData?.status === 'completed' && paymentData?.approvalStatus === 'approved') {
      return {
        success: true,
        message: 'Payment already processed',
      };
    }

    // Verify payment with Uddoktapay to get authoritative charged amount
    const verificationResult = await verifyPayment(invoiceId);
    
    if (!verificationResult.status) {
      console.error(`Payment verification failed for order ${orderId}:`, verificationResult.message);
      return {
        success: false,
        error: `Payment verification failed: ${verificationResult.message || 'Unknown error'}`,
      };
    }

    // SECURITY: Validate that the verified invoice's order_id matches this payment record
    // This prevents invoice substitution attacks where a forged invoice that verifies
    // could be used for a different order
    if (verificationResult.metadata?.order_id !== orderId) {
      console.error(
        `SECURITY ALERT - Invoice order mismatch in auto-approval! ` +
        `Processing order ${orderId}, ` +
        `but verified invoice ${invoiceId} belongs to order ${verificationResult.metadata?.order_id}`
      );
      return {
        success: false,
        error: 'Invoice does not belong to this order',
      };
    }

    // Use the AUTHORITATIVE charged amount from Uddoktapay
    const authoritativeChargedAmount = parseFloat(verificationResult.charged_amount || verificationResult.amount || '0');

    // Process subscription payment
    if (paymentData?.planId) {
      try {
        const subscriptionPlanRef = admin.firestore().collection('subscriptionPlans').doc(paymentData.planId);
        const subscriptionPlanDoc = await subscriptionPlanRef.get();

        if (!subscriptionPlanDoc.exists) {
          console.error(`Subscription plan ${paymentData.planId} not found`);
          return {
            success: false,
            error: 'Subscription plan not found',
          };
        }

        const subscriptionPlan = subscriptionPlanDoc.data();
        const planPrice = subscriptionPlan?.price || 0;
        
        // Use discounted price if coupon was applied, otherwise use plan price
        const expectedPrice = paymentData.couponId 
          ? parseFloat(paymentData.amount || paymentData.expectedAmount || '0')
          : planPrice;

        // Validate that charged amount matches expected price
        if (Math.abs(authoritativeChargedAmount - expectedPrice) > 0.01) {
          console.error(
            `SECURITY ALERT - Payment amount mismatch! ` +
            `Expected: ${expectedPrice}, ` +
            `Charged: ${authoritativeChargedAmount}, ` +
            `Order: ${orderId}`
          );
          return {
            success: false,
            error: `Payment amount mismatch. Expected ${expectedPrice}, got ${authoritativeChargedAmount}`,
          };
        }

        await activateSubscriptionPlan(
          paymentData.userId,
          paymentData.planId
        );

        console.log(`Auto-approved: Subscription plan ${paymentData.planId} activated for user ${paymentData.userId}`);
      } catch (error) {
        console.error('Error activating subscription:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to activate subscription',
        };
      }
    }
    // Process addon credit payment
    else if (paymentData?.addonId) {
      try {
        const addonPlanRef = admin.firestore().collection('addonCreditPlans').doc(paymentData.addonId);
        const addonPlanDoc = await addonPlanRef.get();

        if (!addonPlanDoc.exists) {
          console.error(`Addon plan ${paymentData.addonId} not found`);
          return {
            success: false,
            error: 'Addon plan not found',
          };
        }

        const addonPlan = addonPlanDoc.data();
        const addonPrice = addonPlan?.price || 0;
        
        // Use discounted price if coupon was applied, otherwise use addon price
        const expectedPrice = paymentData.couponId 
          ? parseFloat(paymentData.amount || paymentData.expectedAmount || '0')
          : addonPrice;

        // Validate that charged amount matches expected price
        if (Math.abs(authoritativeChargedAmount - expectedPrice) > 0.01) {
          console.error(
            `SECURITY ALERT - Payment amount mismatch! ` +
            `Expected: ${expectedPrice}, ` +
            `Charged: ${authoritativeChargedAmount}, ` +
            `Order: ${orderId}`
          );
          return {
            success: false,
            error: `Payment amount mismatch. Expected ${expectedPrice}, got ${authoritativeChargedAmount}`,
          };
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
              invoiceId: invoiceId,
              autoApproved: true,
              expectedPrice,
              verifiedChargedAmount: authoritativeChargedAmount,
            }
          );

          console.log(`Auto-approved: ${creditAmount} ${creditType} credits granted to user ${paymentData.userId}`);
        }
      } catch (error) {
        console.error('Error granting credits:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to grant credits',
        };
      }
    }

    // Track coupon usage if a coupon was applied
    if (paymentData?.couponId && paymentData?.couponCode) {
      try {
        const couponUsageRef = admin.firestore().collection('couponUsage');
        await couponUsageRef.add({
          userId: paymentData.userId,
          couponId: paymentData.couponId,
          couponCode: paymentData.couponCode,
          usedAt: admin.firestore.FieldValue.serverTimestamp(),
          discountAmount: parseFloat(paymentData.discountAmount || '0'),
          originalAmount: parseFloat(paymentData.originalAmount || '0'),
          finalAmount: parseFloat(paymentData.amount || '0'),
          subscriptionPlanId: paymentData.planId || null,
          addonPlanId: paymentData.addonId || null,
        });
        console.log(`Coupon usage tracked: ${paymentData.couponCode} used by user ${paymentData.userId}`);
      } catch (error) {
        console.error('Error tracking coupon usage:', error);
        // Don't fail the payment if coupon tracking fails
      }
    }

    // Update payment status to approved and completed
    await paymentRef.update({
      status: 'completed',
      approvalStatus: 'approved',
      approvedBy: 'auto-approved',
      approvedAt: new Date(),
      completedAt: new Date(),
      updatedAt: new Date(),
      verifiedChargedAmount: authoritativeChargedAmount.toString(),
    });

    return {
      success: true,
      message: paymentData?.planId 
        ? 'Payment approved and subscription activated successfully'
        : 'Payment approved and credits granted successfully',
    };
  } catch (error) {
    console.error('Payment processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
  }
}
