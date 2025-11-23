import { NextRequest, NextResponse } from 'next/server';
import { createPayment } from '@/lib/uddoktapay';
import { getFirebaseAdmin, initializeFirebaseAdmin } from '@/lib/firebase-admin';
import * as firebaseAdmin from 'firebase-admin';
import type { UddoktapayCheckoutRequest } from '@/types/uddoktapay';

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
    const { planId, addonId } = body;

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
    
    await paymentRef.set({
      userId,
      userEmail,
      userName,
      orderId,
      planId: planId || null,
      addonId: addonId || null,
      amount: authoritativeAmount.toString(),
      expectedAmount: authoritativeAmount.toString(), // For validation during approval
      fee: '0',
      chargedAmount: authoritativeAmount.toString(),
      currency: authoritativeCurrency,
      invoiceId: '', // Will be updated after payment
      status: 'pending',
      approvalStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create payment session with Uddoktapay using SERVER-VALIDATED amount
    const checkoutData: UddoktapayCheckoutRequest = {
      full_name: userName,
      email: userEmail,
      amount: authoritativeAmount.toString(),
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
