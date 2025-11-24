import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { convertAmount } from '@/lib/currency';
import type { Coupon, ValidateCouponResponse, SupportedCurrency } from '@/types/subscription';

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
    let planCurrency: string;
    if (subscriptionPlanId) {
      const planDoc = await db.collection('subscriptionPlans').doc(subscriptionPlanId).get();
      if (!planDoc.exists) {
        return NextResponse.json({
          valid: false,
          error: 'Subscription plan not found',
        });
      }
      actualAmount = planDoc.data()?.price;
      planCurrency = planDoc.data()?.currency || 'USD';
    } else if (addonPlanId) {
      const addonDoc = await db.collection('addonCreditPlans').doc(addonPlanId).get();
      if (!addonDoc.exists) {
        return NextResponse.json({
          valid: false,
          error: 'Addon plan not found',
        });
      }
      actualAmount = addonDoc.data()?.price;
      planCurrency = addonDoc.data()?.currency || 'USD';
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
    const codeUpperCase = code.toUpperCase();
    
    console.log(`Validating coupon code: "${codeUpperCase}" for user: ${userId}`);
    
    const couponSnapshot = await couponsRef.where('code', '==', codeUpperCase).limit(1).get();

    if (couponSnapshot.empty) {
      console.warn(`Coupon not found: "${codeUpperCase}"`);
      
      // Debug: Check if there are any coupons at all
      const allCouponsSnapshot = await couponsRef.limit(5).get();
      console.log(`Total coupons in database (sample): ${allCouponsSnapshot.size}`);
      if (!allCouponsSnapshot.empty) {
        console.log('Sample coupon codes:', allCouponsSnapshot.docs.map((d: any) => d.data().code).join(', '));
      }
      
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

    // Check validity period (only if dates are provided)
    if (coupon.validFrom || coupon.validUntil) {
      const now = admin.firestore.Timestamp.now();
      
      // Helper function to safely convert various date formats to milliseconds
      const getMilliseconds = (dateField: any): number | null => {
        if (!dateField) return null;
        
        // Firestore Timestamp object with toMillis method
        if (typeof dateField.toMillis === 'function') {
          return dateField.toMillis();
        }
        
        // Firestore Timestamp with toDate method
        if (typeof dateField.toDate === 'function') {
          return dateField.toDate().getTime();
        }
        
        // JavaScript Date object
        if (dateField instanceof Date) {
          return dateField.getTime();
        }
        
        // Plain object with seconds property (JSON serialized Firestore Timestamp)
        // Format: {seconds: number, nanoseconds: number} or {_seconds: number, _nanoseconds: number}
        if (typeof dateField === 'object') {
          const seconds = dateField.seconds ?? dateField._seconds;
          if (typeof seconds === 'number') {
            return seconds * 1000; // Convert seconds to milliseconds
          }
        }
        
        // String date (fallback)
        if (typeof dateField === 'string') {
          const parsedDate = new Date(dateField);
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate.getTime();
          }
        }
        
        // Could not convert - log error and fail validation
        console.error('Invalid coupon date field format:', typeof dateField, JSON.stringify(dateField));
        return null;
      };
      
      // Check validFrom if it exists
      if (coupon.validFrom) {
        const validFromMillis = getMilliseconds(coupon.validFrom);
        if (validFromMillis && now.toMillis() < validFromMillis) {
          return NextResponse.json({
            valid: false,
            error: 'This coupon is not yet valid',
          });
        }
      }
      
      // Check validUntil if it exists
      if (coupon.validUntil) {
        const validUntilMillis = getMilliseconds(coupon.validUntil);
        if (validUntilMillis && now.toMillis() > validUntilMillis) {
          return NextResponse.json({
            valid: false,
            error: 'This coupon has expired',
          });
        }
      }
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
      // For fixed discounts, convert currency if needed
      let fixedDiscount = coupon.discountValue;
      const couponCurrency = coupon.currency || 'USD';
      
      if (couponCurrency !== planCurrency) {
        // Check if both currencies are supported
        if ((couponCurrency !== 'USD' && couponCurrency !== 'BDT') || 
            (planCurrency !== 'USD' && planCurrency !== 'BDT')) {
          console.error(`Unsupported currency for coupon validation: coupon=${couponCurrency}, plan=${planCurrency}`);
          return NextResponse.json({
            valid: false,
            error: `This coupon or plan uses an unsupported currency. Please contact admin to update the currency settings.`,
          });
        }
        
        try {
          fixedDiscount = await convertAmount(
            coupon.discountValue,
            couponCurrency as SupportedCurrency,
            planCurrency as SupportedCurrency
          );
          console.log(`Coupon currency conversion: ${coupon.discountValue} ${couponCurrency} = ${fixedDiscount} ${planCurrency}`);
        } catch (error: any) {
          console.error('Coupon currency conversion error:', error);
          return NextResponse.json({
            valid: false,
            error: 'Currency conversion failed for coupon discount. Please contact admin to set up conversion rates.',
          });
        }
      }
      
      discountAmount = fixedDiscount;
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
