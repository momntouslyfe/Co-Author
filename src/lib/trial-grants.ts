import * as admin from 'firebase-admin';
import { initializeFirebaseAdmin } from './firebase-admin';
import { getAdminSettings } from './admin-settings';
import type { 
  UserFeatureGrant, 
  CreateFeatureGrantInput, 
  FeatureGrantType,
  TrialSettings,
  FeatureAccessResult 
} from '@/types/subscription';

let db: admin.firestore.Firestore;
function getDb(): admin.firestore.Firestore {
  if (!db) {
    initializeFirebaseAdmin();
    db = admin.firestore();
  }
  return db;
}

const COLLECTIONS = {
  USER_FEATURE_GRANTS: 'userFeatureGrants',
  USER_SUBSCRIPTIONS: 'userSubscriptions',
};

export async function getTrialSettings(): Promise<TrialSettings> {
  const settings = await getAdminSettings();
  return settings?.trialSettings || {
    enabled: false,
    durationDays: 7,
    offerCreditsAmount: 0,
    enableCoMarketer: false,
    enableCoWriter: false,
  };
}

export async function getUserTrialStatus(userId: string): Promise<{
  hasUsedTrial: boolean;
  isTrialActive: boolean;
  trialExpiresAt?: Date;
  trialOfferCreditsRemaining: number;
}> {
  const userSubRef = getDb().collection(COLLECTIONS.USER_SUBSCRIPTIONS).doc(userId);
  const userSubDoc = await userSubRef.get();
  
  if (!userSubDoc.exists) {
    return {
      hasUsedTrial: false,
      isTrialActive: false,
      trialOfferCreditsRemaining: 0,
    };
  }
  
  const data = userSubDoc.data();
  const hasUsedTrial = data?.hasUsedTrial || false;
  const trialExpiresAt = data?.trialExpiresAt?.toDate();
  const now = new Date();
  const isTrialActive = hasUsedTrial && trialExpiresAt && trialExpiresAt > now;
  
  const trialCreditsGiven = data?.trialOfferCreditsGiven || 0;
  const trialCreditsUsed = data?.trialOfferCreditsUsed || 0;
  const trialOfferCreditsRemaining = isTrialActive 
    ? Math.max(0, trialCreditsGiven - trialCreditsUsed) 
    : 0;
  
  return {
    hasUsedTrial,
    isTrialActive: isTrialActive || false,
    trialExpiresAt,
    trialOfferCreditsRemaining,
  };
}

export async function canStartTrial(userId: string): Promise<{
  canStart: boolean;
  reason?: string;
}> {
  const trialSettings = await getTrialSettings();
  
  if (!trialSettings.enabled) {
    return { canStart: false, reason: 'Trial is not currently available.' };
  }
  
  const trialStatus = await getUserTrialStatus(userId);
  
  if (trialStatus.hasUsedTrial) {
    return { canStart: false, reason: 'You have already used your trial.' };
  }
  
  return { canStart: true };
}

export async function startTrial(userId: string): Promise<{
  success: boolean;
  error?: string;
  trialExpiresAt?: Date;
  offerCreditsGiven?: number;
}> {
  const canStart = await canStartTrial(userId);
  
  if (!canStart.canStart) {
    return { success: false, error: canStart.reason };
  }
  
  const trialSettings = await getTrialSettings();
  const now = admin.firestore.Timestamp.now();
  const nowDate = now.toDate();
  
  const trialExpiresAt = admin.firestore.Timestamp.fromDate(
    new Date(nowDate.getTime() + (trialSettings.durationDays * 24 * 60 * 60 * 1000))
  );
  
  const userSubRef = getDb().collection(COLLECTIONS.USER_SUBSCRIPTIONS).doc(userId);
  
  await userSubRef.set({
    hasUsedTrial: true,
    trialStartedAt: now,
    trialExpiresAt: trialExpiresAt,
    trialOfferCreditsGiven: trialSettings.offerCreditsAmount,
    trialOfferCreditsUsed: 0,
    remainingOfferCreditsFromTrial: trialSettings.offerCreditsAmount,
    updatedAt: now,
  }, { merge: true });
  
  return {
    success: true,
    trialExpiresAt: trialExpiresAt.toDate(),
    offerCreditsGiven: trialSettings.offerCreditsAmount,
  };
}

export async function expireTrialCredits(userId: string): Promise<void> {
  const userSubRef = getDb().collection(COLLECTIONS.USER_SUBSCRIPTIONS).doc(userId);
  
  await userSubRef.update({
    remainingOfferCreditsFromTrial: 0,
    updatedAt: admin.firestore.Timestamp.now(),
  });
}

export async function getUserFeatureGrants(userId: string): Promise<UserFeatureGrant[]> {
  const grantsSnapshot = await getDb()
    .collection(COLLECTIONS.USER_FEATURE_GRANTS)
    .where('userId', '==', userId)
    .get();
  
  return grantsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as UserFeatureGrant));
}

export async function getActiveFeatureGrant(
  userId: string, 
  feature: FeatureGrantType
): Promise<UserFeatureGrant | null> {
  const now = admin.firestore.Timestamp.now();
  
  const grantsSnapshot = await getDb()
    .collection(COLLECTIONS.USER_FEATURE_GRANTS)
    .where('userId', '==', userId)
    .where('feature', '==', feature)
    .where('expiresAt', '>', now)
    .limit(1)
    .get();
  
  if (grantsSnapshot.empty) {
    return null;
  }
  
  const doc = grantsSnapshot.docs[0];
  return { id: doc.id, ...doc.data() } as UserFeatureGrant;
}

export async function createFeatureGrant(
  input: CreateFeatureGrantInput,
  grantedBy: string
): Promise<string> {
  const now = admin.firestore.Timestamp.now();
  
  let expiresAt: admin.firestore.Timestamp;
  if (input.expiresAt) {
    expiresAt = admin.firestore.Timestamp.fromDate(input.expiresAt);
  } else if (input.durationDays) {
    const expiryDate = new Date(now.toDate().getTime() + (input.durationDays * 24 * 60 * 60 * 1000));
    expiresAt = admin.firestore.Timestamp.fromDate(expiryDate);
  } else {
    const defaultDays = 30;
    const expiryDate = new Date(now.toDate().getTime() + (defaultDays * 24 * 60 * 60 * 1000));
    expiresAt = admin.firestore.Timestamp.fromDate(expiryDate);
  }
  
  const existingGrant = await getActiveFeatureGrant(input.userId, input.feature);
  
  if (existingGrant) {
    await getDb().collection(COLLECTIONS.USER_FEATURE_GRANTS).doc(existingGrant.id).update({
      expiresAt,
      grantedBy,
      grantedAt: now,
      notes: input.notes || null,
    });
    return existingGrant.id;
  }
  
  const docRef = getDb().collection(COLLECTIONS.USER_FEATURE_GRANTS).doc();
  await docRef.set({
    userId: input.userId,
    feature: input.feature,
    expiresAt,
    grantedBy,
    grantedAt: now,
    notes: input.notes || null,
  });
  
  return docRef.id;
}

export async function revokeFeatureGrant(grantId: string): Promise<void> {
  await getDb().collection(COLLECTIONS.USER_FEATURE_GRANTS).doc(grantId).delete();
}

export async function revokeAllFeatureGrants(userId: string): Promise<void> {
  const grants = await getUserFeatureGrants(userId);
  const batch = getDb().batch();
  
  for (const grant of grants) {
    batch.delete(getDb().collection(COLLECTIONS.USER_FEATURE_GRANTS).doc(grant.id));
  }
  
  await batch.commit();
}

export async function checkFeatureAccess(
  userId: string,
  feature: FeatureGrantType,
  planEnablesFeature: boolean,
  offerCreditsAvailable: number = 0
): Promise<FeatureAccessResult> {
  if (planEnablesFeature) {
    return { hasAccess: true, source: 'subscription' };
  }
  
  if (feature === 'coMarketer' && offerCreditsAvailable > 0) {
    return { hasAccess: true, source: 'credits' };
  }
  
  const adminGrant = await getActiveFeatureGrant(userId, feature);
  if (adminGrant) {
    return {
      hasAccess: true,
      source: 'adminGrant',
      expiresAt: adminGrant.expiresAt.toDate(),
    };
  }
  
  const trialSettings = await getTrialSettings();
  const trialStatus = await getUserTrialStatus(userId);
  
  if (trialStatus.isTrialActive && trialSettings.enabled) {
    const trialEnablesFeature = feature === 'coMarketer' 
      ? trialSettings.enableCoMarketer 
      : trialSettings.enableCoWriter;
    
    if (trialEnablesFeature) {
      return {
        hasAccess: true,
        source: 'trial',
        expiresAt: trialStatus.trialExpiresAt,
        isTrial: true,
      };
    }
  }
  
  return { hasAccess: false, source: 'none' };
}

export async function getAllFeatureGrants(
  limit: number = 50,
  offset: number = 0
): Promise<{ grants: UserFeatureGrant[]; total: number }> {
  const countSnapshot = await getDb().collection(COLLECTIONS.USER_FEATURE_GRANTS).count().get();
  const total = countSnapshot.data().count;
  
  const grantsSnapshot = await getDb()
    .collection(COLLECTIONS.USER_FEATURE_GRANTS)
    .orderBy('grantedAt', 'desc')
    .offset(offset)
    .limit(limit)
    .get();
  
  const grants = grantsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as UserFeatureGrant));
  
  return { grants, total };
}
