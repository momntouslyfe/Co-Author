import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { getUserSubscription, getSubscriptionPlan, getUserCreditSummary } from '@/lib/credits';
import { 
  getTrialSettings, 
  getUserTrialStatus, 
  getActiveFeatureGrant,
  checkFeatureAccess 
} from '@/lib/trial-grants';

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

    const [userSubscription, trialSettings, trialStatus, creditSummary] = await Promise.all([
      getUserSubscription(uid),
      getTrialSettings(),
      getUserTrialStatus(uid),
      getUserCreditSummary(uid),
    ]);
    
    const now = new Date();
    
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
    
    const plan = userSubscription?.subscriptionPlanId 
      ? await getSubscriptionPlan(userSubscription.subscriptionPlanId)
      : null;
    
    const planEnablesCoMarketer = plan?.enableCoMarketer ?? false;
    const planEnablesCoWriter = plan?.enableCoWriter ?? false;
    
    const [coMarketerAccess, coWriterAccess] = await Promise.all([
      checkFeatureAccess(uid, 'coMarketer', planEnablesCoMarketer, creditSummary.offerCreditsAvailable),
      checkFeatureAccess(uid, 'coWriter', planEnablesCoWriter, 0),
    ]);

    const hasActiveSubscription = userSubscription?.subscriptionPlanId && plan 
      ? now <= toDate(userSubscription.planEffectiveEnd)
      : false;

    return NextResponse.json({
      hasActiveSubscription,
      subscription: userSubscription ? {
        planEffectiveStart: toDate(userSubscription.planEffectiveStart),
        planEffectiveEnd: toDate(userSubscription.planEffectiveEnd),
        billingCycleStart: toDate(userSubscription.billingCycleStart),
        billingCycleEnd: toDate(userSubscription.billingCycleEnd),
        isExpired: !hasActiveSubscription,
      } : null,
      plan,
      featureAccess: {
        enableCoMarketer: coMarketerAccess.hasAccess,
        enableCoWriter: coWriterAccess.hasAccess,
        coMarketerSource: coMarketerAccess.source,
        coWriterSource: coWriterAccess.source,
        coMarketerExpiresAt: coMarketerAccess.expiresAt,
        coWriterExpiresAt: coWriterAccess.expiresAt,
      },
      trial: {
        enabled: trialSettings.enabled,
        hasUsedTrial: trialStatus.hasUsedTrial,
        isTrialActive: trialStatus.isTrialActive,
        trialExpiresAt: trialStatus.trialExpiresAt,
        trialOfferCreditsRemaining: trialStatus.trialOfferCreditsRemaining,
        canStartTrial: !trialStatus.hasUsedTrial && trialSettings.enabled,
        trialDurationDays: trialSettings.durationDays,
        trialOfferCreditsAmount: trialSettings.offerCreditsAmount,
        trialEnablesCoMarketer: trialSettings.enableCoMarketer,
        trialEnablesCoWriter: trialSettings.enableCoWriter,
      },
    });
  } catch (error: any) {
    console.error('Get subscription status error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
