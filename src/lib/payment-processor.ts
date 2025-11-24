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

    // Handle FREE_ORDER: skip gateway verification and force charged amount to 0
    const isFreeOrder = paymentData?.isFreeOrder === true || invoiceId === 'FREE_ORDER';
    let authoritativeChargedAmount = 0;

    if (isFreeOrder) {
      // For free orders, no payment gateway verification needed
      // Charged amount is always 0
      authoritativeChargedAmount = 0;
      console.log(`Processing FREE_ORDER: ${orderId} (no gateway verification needed)`);
    } else {
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

      // Use the AUTHORITATIVE charged amount from Uddoktapay (in BDT)
      authoritativeChargedAmount = parseFloat(verificationResult.charged_amount || verificationResult.amount || '0');
      
      console.log(`Payment verification - Charged amount from Uddoktapay: ${authoritativeChargedAmount} BDT`);
    }

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
        
        // Skip amount validation for FREE_ORDER (charged amount is always 0)
        if (!isFreeOrder) {
          // Calculate expected price in BDT for validation
          // Priority: 1. expectedAmount (BDT sent to gateway) 2. Compute from conversion metadata 3. Plan price if BDT
          let expectedPrice: number;
          
          if (paymentData.expectedAmount) {
            // Use the amount in BDT that was sent to payment gateway
            expectedPrice = parseFloat(paymentData.expectedAmount);
          } else if (paymentData.amountInBDT) {
            // Fallback: use stored BDT conversion
            expectedPrice = parseFloat(paymentData.amountInBDT);
          } else if (paymentData.paymentCurrency === 'BDT') {
            // If payment currency is BDT, use plan price directly
            expectedPrice = planPrice;
          } else if (paymentData.conversionRate && paymentData.amount) {
            // Try to recompute BDT amount from stored conversion rate
            const originalAmount = parseFloat(paymentData.amount);
            const conversionRate = parseFloat(paymentData.conversionRate);
            expectedPrice = originalAmount * conversionRate;
            console.log(
              `Recomputed BDT amount from conversion metadata: ` +
              `${originalAmount} × ${conversionRate} = ${expectedPrice} BDT`
            );
          } else {
            // Cannot validate - missing required BDT amount information
            console.error(
              `CRITICAL VALIDATION ERROR - Cannot determine expected BDT amount for order ${orderId}. ` +
              `Missing expectedAmount, amountInBDT, and conversion metadata. ` +
              `This payment requires manual admin review.`
            );
            return {
              success: false,
              error: 'Cannot verify payment amount - missing currency conversion data. Please contact support.',
            };
          }

          console.log(
            `Payment amount validation: ` +
            `Expected: ${expectedPrice} BDT, ` +
            `Charged: ${authoritativeChargedAmount} BDT, ` +
            `Order: ${orderId}, ` +
            `Currency: ${paymentData.currency || 'unknown'} → BDT`
          );

          // Validate that charged amount matches expected price
          // Tolerance: 1.00 BDT to account for rounding in currency conversion
          if (Math.abs(authoritativeChargedAmount - expectedPrice) > 1.00) {
            console.error(
              `SECURITY ALERT - Payment amount mismatch! ` +
              `Expected: ${expectedPrice} BDT, ` +
              `Charged: ${authoritativeChargedAmount} BDT, ` +
              `Order: ${orderId}, ` +
              `Difference: ${Math.abs(authoritativeChargedAmount - expectedPrice)} BDT`
            );
            return {
              success: false,
              error: `Payment amount mismatch. Expected ${expectedPrice}, got ${authoritativeChargedAmount}`,
            };
          }
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
        
        // Calculate expected price in BDT for validation (needed for both tracking and validation)
        let expectedPrice: number;
        
        if (paymentData.expectedAmount) {
          // Use the amount in BDT that was sent to payment gateway
          expectedPrice = parseFloat(paymentData.expectedAmount);
        } else if (paymentData.amountInBDT) {
          // Fallback: use stored BDT conversion
          expectedPrice = parseFloat(paymentData.amountInBDT);
        } else if (paymentData.paymentCurrency === 'BDT') {
          // If payment currency is BDT, use addon price directly
          expectedPrice = addonPrice;
        } else if (paymentData.conversionRate && paymentData.amount) {
          // Try to recompute BDT amount from stored conversion rate
          const originalAmount = parseFloat(paymentData.amount);
          const conversionRate = parseFloat(paymentData.conversionRate);
          expectedPrice = originalAmount * conversionRate;
          console.log(
            `Recomputed BDT amount from conversion metadata: ` +
            `${originalAmount} × ${conversionRate} = ${expectedPrice} BDT`
          );
        } else {
          // Cannot validate - missing required BDT amount information
          console.error(
            `CRITICAL VALIDATION ERROR - Cannot determine expected BDT amount for order ${orderId}. ` +
            `Missing expectedAmount, amountInBDT, and conversion metadata. ` +
            `This payment requires manual admin review.`
          );
          return {
            success: false,
            error: 'Cannot verify payment amount - missing currency conversion data. Please contact support.',
          };
        }
        
        // Skip amount validation for FREE_ORDER (charged amount is always 0)
        if (!isFreeOrder) {
          console.log(
            `Payment amount validation (addon): ` +
            `Expected: ${expectedPrice} BDT, ` +
            `Charged: ${authoritativeChargedAmount} BDT, ` +
            `Order: ${orderId}, ` +
            `Currency: ${paymentData.currency || 'unknown'} → BDT`
          );

          // Validate that charged amount matches expected price
          // Tolerance: 1.00 BDT to account for rounding in currency conversion
          if (Math.abs(authoritativeChargedAmount - expectedPrice) > 1.00) {
            console.error(
              `SECURITY ALERT - Payment amount mismatch! ` +
              `Expected: ${expectedPrice} BDT, ` +
              `Charged: ${authoritativeChargedAmount} BDT, ` +
              `Order: ${orderId}, ` +
              `Difference: ${Math.abs(authoritativeChargedAmount - expectedPrice)} BDT`
            );
            return {
              success: false,
              error: `Payment amount mismatch. Expected ${expectedPrice}, got ${authoritativeChargedAmount}`,
            };
          }
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
