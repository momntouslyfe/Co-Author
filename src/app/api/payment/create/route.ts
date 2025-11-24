import { NextRequest, NextResponse } from 'next/server';
import { createPayment } from '@/lib/uddoktapay';
import { getFirebaseAdmin, initializeFirebaseAdmin } from '@/lib/firebase-admin';
import * as firebaseAdmin from 'firebase-admin';
import type { UddoktapayCheckoutRequest } from '@/types/uddoktapay';
import { convertAmount } from '@/lib/currency';
import type { SupportedCurrency } from '@/types/subscription';

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Verify user authentication first
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    let userId: string;
    let userEmail: string;
    let userName: string;
    
    try {
      initializeFirebaseAdmin();
      const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
      userId = decodedToken.uid;
      userEmail = decodedToken.email || '';
      userName = decodedToken.name || decodedToken.email?.split('@')[0] || 'User';
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { planId, addonId, couponCode } = body;

    if (!planId && !addonId) {
      return NextResponse.json(
        { error: 'Either planId or addonId is required' },
        { status: 400 }
      );
    }

    // SECURITY: Load plan/addon from server to get authoritative price
    const admin = getFirebaseAdmin();
    let authoritativeAmount: number;
    let authoritativeCurrency: string = 'BDT';
    let planDetails: any = null;

    if (addonId) {
      const addonRef = admin.firestore().collection('addonCreditPlans').doc(addonId);
      const addonDoc = await addonRef.get();
      
      if (!addonDoc.exists) {
        return NextResponse.json(
          { error: 'Addon plan not found' },
          { status: 404 }
        );
      }

      planDetails = addonDoc.data();
      authoritativeAmount = planDetails?.price || 0;
      authoritativeCurrency = planDetails?.currency || 'BDT';
    } else if (planId) {
      const planRef = admin.firestore().collection('subscriptionPlans').doc(planId);
      const planDoc = await planRef.get();
      
      if (!planDoc.exists) {
        return NextResponse.json(
          { error: 'Subscription plan not found' },
          { status: 404 }
        );
      }

      planDetails = planDoc.data();
      authoritativeAmount = planDetails?.price || 0;
      authoritativeCurrency = planDetails?.currency || 'BDT';
    } else {
      return NextResponse.json(
        { error: 'Invalid plan configuration' },
        { status: 400 }
      );
    }

    // Validate amount is positive
    if (authoritativeAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid plan price configuration' },
        { status: 400 }
      );
    }

    // Apply coupon discount if provided
    let originalAmount = authoritativeAmount;
    let discountAmount = 0;
    let finalAmount = authoritativeAmount;
    let validatedCoupon: any = null;

    if (couponCode) {
      // Validate coupon server-side
      const couponsRef = admin.firestore().collection('coupons');
      const couponSnapshot = await couponsRef.where('code', '==', couponCode.toUpperCase()).limit(1).get();

      if (!couponSnapshot.empty) {
        const couponDoc = couponSnapshot.docs[0];
        const coupon = { id: couponDoc.id, ...couponDoc.data() };

        // Validate coupon
        const now = firebaseAdmin.firestore.Timestamp.now();
        let couponValid = true;
        let couponError = '';

        if (!coupon.isActive) {
          couponValid = false;
          couponError = 'Coupon is not active';
        } else if (now.toMillis() < coupon.validFrom.toMillis()) {
          couponValid = false;
          couponError = 'Coupon is not yet valid';
        } else if (now.toMillis() > coupon.validUntil.toMillis()) {
          couponValid = false;
          couponError = 'Coupon has expired';
        } else if (coupon.specificUserId && coupon.specificUserId !== userId) {
          couponValid = false;
          couponError = 'Coupon not valid for this user';
        } else {
          // Check usage limit
          const usageRef = admin.firestore().collection('couponUsage');
          const usageSnapshot = await usageRef
            .where('userId', '==', userId)
            .where('couponId', '==', coupon.id)
            .get();

          if (usageSnapshot.size >= coupon.maxUsesPerUser) {
            couponValid = false;
            couponError = 'Coupon usage limit exceeded';
          }
        }

        if (couponValid) {
          // Calculate discount
          if (coupon.discountType === 'percentage') {
            discountAmount = (authoritativeAmount * coupon.discountValue) / 100;
          } else {
            discountAmount = coupon.discountValue;
          }

          discountAmount = Math.min(discountAmount, authoritativeAmount);
          finalAmount = Math.max(0, authoritativeAmount - discountAmount);
          validatedCoupon = coupon;
        } else {
          console.warn(`Coupon validation failed for user ${userId}: ${couponError}`);
          // Don't fail the payment, just ignore invalid coupon
          // Users already saw validation on the payment overview page
        }
      }
    }

    // Handle zero-amount payments (e.g., 100% discount coupons)
    if (finalAmount === 0) {
      // Even for free orders, calculate conversion rate to maintain invariants for downstream validation
      let freeOrderConversionRate = 1.0;
      let originalAmountInBDT = originalAmount;
      
      if (authoritativeCurrency !== 'BDT') {
        try {
          originalAmountInBDT = await convertAmount(
            originalAmount,
            authoritativeCurrency as SupportedCurrency,
            'BDT'
          );
          freeOrderConversionRate = originalAmountInBDT / originalAmount;
          console.log(`Free order conversion: ${originalAmount} ${authoritativeCurrency} = ${originalAmountInBDT} BDT (rate: ${freeOrderConversionRate})`);
        } catch (error: any) {
          console.error('Free order conversion error:', error);
          // Fallback to rate=1 if conversion fails (non-fatal for free orders)
          freeOrderConversionRate = 1.0;
          console.warn('Using fallback conversion rate of 1.0 for free order');
        }
      }
      
      // For free orders, bypass payment gateway and grant credits immediately
      // Maintain payment invariants: numeric conversionRate, post-discount BDT totals (0)
      const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const paymentRef = admin.firestore().collection('payments').doc(orderId);
      
      const paymentData: any = {
        userId,
        userEmail,
        userName,
        orderId,
        planId: planId || null,
        addonId: addonId || null,
        originalAmount: originalAmount.toString(), // Original price in source currency
        discountAmount: discountAmount.toString(), // Discount applied (equals originalAmount)
        amount: '0', // Final amount in source currency (post-discount)
        expectedAmount: '0', // Expected BDT amount (post-discount is 0)
        fee: '0',
        chargedAmount: '0', // Charged BDT amount (post-discount is 0)
        currency: authoritativeCurrency, // Source currency (USD, BDT, etc.)
        paymentCurrency: 'BDT', // Always BDT for Uddoktapay integration
        conversionRate: freeOrderConversionRate.toString(), // Valid numeric rate for analytics
        amountInBDT: '0', // Final BDT amount (post-discount is 0)
        freeOrderOriginalAmountBDT: originalAmountInBDT.toString(), // Pre-discount BDT for analytics
        isFreeOrder: true, // Explicit flag for downstream validation branching
        invoiceId: 'FREE_ORDER', // Special marker for identification
        status: 'completed',
        approvalStatus: 'approved',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      if (validatedCoupon) {
        paymentData.couponId = validatedCoupon.id;
        paymentData.couponCode = validatedCoupon.code;
        
        // Record coupon usage for analytics and tracking
        await admin.firestore().collection('couponUsage').add({
          userId,
          couponId: validatedCoupon.id,
          couponCode: validatedCoupon.code,
          orderId,
          originalAmount: originalAmount.toString(),
          discountAmount: discountAmount.toString(),
          finalAmount: '0',
          usedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      
      await paymentRef.set(paymentData);
      
      // Process the free order immediately (grant credits/activate subscription)
      const { processSuccessfulPayment } = await import('@/lib/payment-processor');
      await processSuccessfulPayment(orderId, 'FREE_ORDER');
      
      // Return success URL instead of payment gateway URL
      return NextResponse.json({
        success: true,
        orderId,
        paymentUrl: `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/payment/success?invoice_id=FREE_ORDER&order_id=${orderId}`,
      });
    }

    // Convert amount to BDT for Uddoktapay if needed
    // Uddoktapay only accepts BDT for local payment methods (bKash, Nagad, Rocket)
    let amountInBDT = finalAmount;
    let conversionRate = 1.0;
    
    if (authoritativeCurrency !== 'BDT') {
      try {
        amountInBDT = await convertAmount(
          finalAmount,
          authoritativeCurrency as SupportedCurrency,
          'BDT'
        );
        conversionRate = amountInBDT / finalAmount;
        console.log(`Currency conversion: ${finalAmount} ${authoritativeCurrency} = ${amountInBDT} BDT (rate: ${conversionRate})`);
      } catch (error: any) {
        console.error('Currency conversion error:', error);
        return NextResponse.json(
          { error: 'Currency conversion failed. Please contact admin to set up conversion rates.' },
          { status: 500 }
        );
      }
    }

    // Generate unique order ID
    const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Get base URL for callbacks
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

    // Prepare payment metadata
    const metadata: UddoktapayCheckoutRequest['metadata'] = {
      user_id: userId,
      order_id: orderId,
    };

    if (planId) {
      metadata.plan_id = planId;
    }

    if (addonId) {
      metadata.addon_id = addonId;
    }

    // Create payment record in Firestore with SERVER-VALIDATED amounts
    const paymentRef = admin.firestore().collection('payments').doc(orderId);
    
    const paymentData: any = {
      userId,
      userEmail,
      userName,
      orderId,
      planId: planId || null,
      addonId: addonId || null,
      originalAmount: originalAmount.toString(),
      discountAmount: discountAmount.toString(),
      amount: finalAmount.toString(),
      expectedAmount: amountInBDT.toString(), // For validation during approval (in BDT)
      fee: '0',
      chargedAmount: amountInBDT.toString(),
      currency: authoritativeCurrency,
      paymentCurrency: 'BDT', // Currency sent to payment gateway
      conversionRate: conversionRate.toString(),
      amountInBDT: amountInBDT.toString(),
      invoiceId: '', // Will be updated after payment
      status: 'pending',
      approvalStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (validatedCoupon) {
      paymentData.couponId = validatedCoupon.id;
      paymentData.couponCode = validatedCoupon.code;
    }

    await paymentRef.set(paymentData);

    // Create payment session with Uddoktapay using amount in BDT (after discount and conversion)
    const checkoutData: UddoktapayCheckoutRequest = {
      full_name: userName,
      email: userEmail,
      amount: amountInBDT.toString(),
      metadata,
      redirect_url: `${baseUrl}/payment/success`,
      return_type: 'GET',
      cancel_url: `${baseUrl}/payment/cancel`,
      webhook_url: `${baseUrl}/api/payment/webhook`,
    };

    const result = await createPayment(checkoutData);

    if (!result.status || !result.payment_url) {
      // Update payment status to failed
      await paymentRef.update({
        status: 'failed',
        updatedAt: new Date(),
      });

      return NextResponse.json(
        { error: result.message || 'Failed to create payment session' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId,
      paymentUrl: result.payment_url,
    });
  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
