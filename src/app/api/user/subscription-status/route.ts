import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { getUserSubscription, getSubscriptionPlan } from '@/lib/credits';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    let uid: string;
    try {
      initializeFirebaseAdmin();
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      uid = decodedToken.uid;
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    const userSubscription = await getUserSubscription(uid);
    
    if (!userSubscription || !userSubscription.subscriptionPlanId) {
      return NextResponse.json({
        hasActiveSubscription: false,
        subscription: null,
        plan: null,
      });
    }

    const plan = await getSubscriptionPlan(userSubscription.subscriptionPlanId);
    const now = new Date();
    
    // Helper function to convert various timestamp formats to Date
    const toDate = (timestamp: any): Date => {
      if (!timestamp) return new Date();
      if (timestamp instanceof Date) return timestamp;
      if (typeof timestamp === 'object' && timestamp !== null) {
        if ('toDate' in timestamp && typeof timestamp.toDate === 'function') {
          return timestamp.toDate();
        }
        if ('seconds' in timestamp) {
          return new Date(timestamp.seconds * 1000);
        }
      }
      return new Date(timestamp);
    };
    
    const planEffectiveEnd = toDate(userSubscription.planEffectiveEnd);
    const isExpired = now > planEffectiveEnd;

    return NextResponse.json({
      hasActiveSubscription: !isExpired,
      subscription: {
        planEffectiveStart: toDate(userSubscription.planEffectiveStart),
        planEffectiveEnd: toDate(userSubscription.planEffectiveEnd),
        billingCycleStart: toDate(userSubscription.billingCycleStart),
        billingCycleEnd: toDate(userSubscription.billingCycleEnd),
        isExpired,
      },
      plan,
    });
  } catch (error: any) {
    console.error('Get subscription status error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
