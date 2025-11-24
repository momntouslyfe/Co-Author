import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import type { Coupon, ValidateCouponResponse } from '@/types/subscription';

export async function POST(request: NextRequest) {
  try {
    const admin = getFirebaseAdmin();
    const db = admin.firestore();

    // Verify Firebase ID token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { valid: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const body = await request.json();
    const { code, subscriptionPlanId, addonPlanId } = body;

    if (!code) {
      return NextResponse.json({
        valid: false,
        error: 'Coupon code is required',
      });
    }

    // Require either subscriptionPlanId or addonPlanId to verify pricing
    if (!subscriptionPlanId && !addonPlanId) {
      return NextResponse.json({
        valid: false,
        error: 'Plan ID is required to validate coupon',
      });
    }

    // Look up the actual price from the plan
    let actualAmount: number;
    if (subscriptionPlanId) {
      const planDoc = await db.collection('subscriptionPlans').doc(subscriptionPlanId).get();
      if (!planDoc.exists) {
        return NextResponse.json({
          valid: false,
          error: 'Subscription plan not found',
        });
      }
      actualAmount = planDoc.data()?.price;
    } else if (addonPlanId) {
      const addonDoc = await db.collection('addonCreditPlans').doc(addonPlanId).get();
      if (!addonDoc.exists) {
        return NextResponse.json({
          valid: false,
          error: 'Addon plan not found',
        });
      }
      actualAmount = addonDoc.data()?.price;
    } else {
      return NextResponse.json({
        valid: false,
        error: 'Invalid plan reference',
      });
    }

    if (!actualAmount || actualAmount <= 0) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid plan pricing',
      });
    }

    // Find coupon by code
    const couponsRef = db.collection('coupons');
    const couponSnapshot = await couponsRef.where('code', '==', code.toUpperCase()).limit(1).get();

    if (couponSnapshot.empty) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid coupon code',
      });
    }

    const couponDoc = couponSnapshot.docs[0];
    const coupon = { id: couponDoc.id, ...couponDoc.data() } as Coupon;

    // Check if coupon is active
    if (!coupon.isActive) {
      return NextResponse.json({
        valid: false,
        error: 'This coupon is no longer active',
      });
    }

    // Check validity period
    const now = admin.firestore.Timestamp.now();
    if (now.toMillis() < coupon.validFrom.toMillis()) {
      return NextResponse.json({
        valid: false,
        error: 'This coupon is not yet valid',
      });
    }
    if (now.toMillis() > coupon.validUntil.toMillis()) {
      return NextResponse.json({
        valid: false,
        error: 'This coupon has expired',
      });
    }

    // Check if user-specific
    if (coupon.specificUserId && coupon.specificUserId !== userId) {
      return NextResponse.json({
        valid: false,
        error: 'This coupon is not available for your account',
      });
    }

    // Check usage limit per user
    const usageRef = db.collection('couponUsage');
    const usageSnapshot = await usageRef
      .where('userId', '==', userId)
      .where('couponId', '==', coupon.id)
      .get();

    const usageCount = usageSnapshot.size;
    if (usageCount >= coupon.maxUsesPerUser) {
      return NextResponse.json({
        valid: false,
        error: 'You have reached the maximum usage limit for this coupon',
      });
    }

    // Calculate discount based on actual price from database
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (actualAmount * coupon.discountValue) / 100;
    } else {
      discountAmount = coupon.discountValue;
    }

    // Ensure discount doesn't exceed the actual amount
    discountAmount = Math.min(discountAmount, actualAmount);

    const finalAmount = Math.max(0, actualAmount - discountAmount);

    // Log suspicious activity if someone tried to manipulate the amount
    const clientAmount = body.amount;
    if (clientAmount && clientAmount !== actualAmount) {
      console.warn(
        `SECURITY WARNING: User ${userId} attempted coupon validation with mismatched amount. ` +
        `Client provided: ${clientAmount}, Actual price: ${actualAmount}, ` +
        `Plan: ${subscriptionPlanId || addonPlanId}`
      );
    }

    const response: ValidateCouponResponse = {
      valid: true,
      coupon,
      discountAmount,
      finalAmount,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error validating coupon:', error);
    return NextResponse.json(
      {
        valid: false,
        error: 'Failed to validate coupon',
      },
      { status: 500 }
    );
  }
}
