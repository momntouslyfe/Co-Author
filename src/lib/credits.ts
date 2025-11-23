import * as admin from 'firebase-admin';
import { initializeFirebaseAdmin } from './firebase-admin';
import type {
  SubscriptionPlan,
  AddonCreditPlan,
  UserSubscription,
  CreditTransaction,
  CreditSummary,
  CreateSubscriptionPlanInput,
  UpdateSubscriptionPlanInput,
  CreateAddonCreditPlanInput,
  UpdateAddonCreditPlanInput,
  AllocateCreditsInput,
  CreditTypeCategory,
  CreditTransactionType,
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
  SUBSCRIPTION_PLANS: 'subscriptionPlans',
  ADDON_CREDIT_PLANS: 'addonCreditPlans',
  USER_SUBSCRIPTIONS: 'userSubscriptions',
  CREDIT_TRANSACTIONS: 'creditTransactions',
};

export async function getSubscriptionPlan(planId: string): Promise<SubscriptionPlan | null> {
  const docRef = getDb().collection(COLLECTIONS.SUBSCRIPTION_PLANS).doc(planId);
  const docSnap = await docRef.get();
  
  if (!docSnap.exists) {
    return null;
  }
  
  return { id: docSnap.id, ...docSnap.data() } as SubscriptionPlan;
}

export async function getAllSubscriptionPlans(activeOnly = false): Promise<SubscriptionPlan[]> {
  const plansRef = getDb().collection(COLLECTIONS.SUBSCRIPTION_PLANS);
  const q = activeOnly 
    ? plansRef.where('isActive', '==', true).orderBy('price', 'asc')
    : plansRef.orderBy('createdAt', 'desc');
    
  const snapshot = await q.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionPlan));
}

export async function createSubscriptionPlan(input: CreateSubscriptionPlanInput): Promise<string> {
  const now = admin.firestore.Timestamp.now();
  const docRef = getDb().collection(COLLECTIONS.SUBSCRIPTION_PLANS).doc();
  
  await docRef.set({
    ...input,
    createdAt: now,
    updatedAt: now,
  });
  
  return docRef.id;
}

export async function updateSubscriptionPlan(
  planId: string,
  input: UpdateSubscriptionPlanInput
): Promise<void> {
  const docRef = getDb().collection(COLLECTIONS.SUBSCRIPTION_PLANS).doc(planId);
  await docRef.update({
    ...input,
    updatedAt: admin.firestore.Timestamp.now(),
  });
}

export async function deleteSubscriptionPlan(planId: string): Promise<void> {
  const docRef = getDb().collection(COLLECTIONS.SUBSCRIPTION_PLANS).doc(planId);
  await docRef.delete();
}

export async function getAllAddonCreditPlans(
  type?: 'words' | 'books',
  activeOnly = false
): Promise<AddonCreditPlan[]> {
  const plansRef = getDb().collection(COLLECTIONS.ADDON_CREDIT_PLANS);
  
  let q: admin.firestore.Query = plansRef;
  
  if (type && activeOnly) {
    q = plansRef.where('type', '==', type).where('isActive', '==', true).orderBy('price', 'asc');
  } else if (type) {
    q = plansRef.where('type', '==', type).orderBy('createdAt', 'desc');
  } else if (activeOnly) {
    q = plansRef.where('isActive', '==', true).orderBy('price', 'asc');
  } else {
    q = plansRef.orderBy('createdAt', 'desc');
  }
  
  const snapshot = await q.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AddonCreditPlan));
}

export async function createAddonCreditPlan(input: CreateAddonCreditPlanInput): Promise<string> {
  const now = admin.firestore.Timestamp.now();
  const docRef = getDb().collection(COLLECTIONS.ADDON_CREDIT_PLANS).doc();
  
  await docRef.set({
    ...input,
    createdAt: now,
    updatedAt: now,
  });
  
  return docRef.id;
}

export async function updateAddonCreditPlan(
  planId: string,
  input: UpdateAddonCreditPlanInput
): Promise<void> {
  const docRef = getDb().collection(COLLECTIONS.ADDON_CREDIT_PLANS).doc(planId);
  await docRef.update({
    ...input,
    updatedAt: admin.firestore.Timestamp.now(),
  });
}

export async function deleteAddonCreditPlan(planId: string): Promise<void> {
  const docRef = getDb().collection(COLLECTIONS.ADDON_CREDIT_PLANS).doc(planId);
  await docRef.delete();
}

export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  const docRef = getDb().collection(COLLECTIONS.USER_SUBSCRIPTIONS).doc(userId);
  const docSnap = await docRef.get();
  
  if (!docSnap.exists) {
    return null;
  }
  
  return { userId: docSnap.id, ...docSnap.data() } as UserSubscription;
}

export async function initializeUserSubscription(
  userId: string,
  subscriptionPlanId: string | null = null
): Promise<void> {
  const now = admin.firestore.Timestamp.now();
  const nowDate = now.toDate();
  
  const billingCycleStart = now;
  const billingCycleEnd = admin.firestore.Timestamp.fromDate(
    new Date(
      nowDate.getFullYear(),
      nowDate.getMonth() + 1,
      nowDate.getDate(),
      23, 59, 59, 999
    )
  );
  
  const planEffectiveStart = now;
  const planEffectiveEnd = billingCycleEnd;
  
  const docRef = getDb().collection(COLLECTIONS.USER_SUBSCRIPTIONS).doc(userId);
  await docRef.set({
    userId,
    subscriptionPlanId,
    planEffectiveStart,
    planEffectiveEnd,
    billingCycleStart,
    billingCycleEnd,
    bookCreditsUsedThisCycle: 0,
    wordCreditsUsedThisCycle: 0,
    remainingBookCreditsFromAddons: 0,
    remainingWordCreditsFromAddons: 0,
    remainingBookCreditsFromAdmin: 0,
    remainingWordCreditsFromAdmin: 0,
    totalBookCreditsFromAddonsThisCycle: 0,
    totalWordCreditsFromAddonsThisCycle: 0,
    totalBookCreditsFromAdminThisCycle: 0,
    totalWordCreditsFromAdminThisCycle: 0,
    createdAt: now,
    updatedAt: now,
  });
}

export async function activateSubscriptionPlan(
  userId: string,
  subscriptionPlanId: string
): Promise<void> {
  const plan = await getSubscriptionPlan(subscriptionPlanId);
  if (!plan) {
    throw new Error(`Subscription plan ${subscriptionPlanId} not found`);
  }
  
  const now = admin.firestore.Timestamp.now();
  const nowDate = now.toDate();
  
  const billingCycleStart = now;
  const billingCycleEnd = admin.firestore.Timestamp.fromDate(
    new Date(
      nowDate.getFullYear(),
      nowDate.getMonth() + 1,
      nowDate.getDate(),
      23, 59, 59, 999
    )
  );
  
  const planEffectiveStart = now;
  const planEffectiveEnd = billingCycleEnd;
  
  const userSubRef = getDb().collection(COLLECTIONS.USER_SUBSCRIPTIONS).doc(userId);
  
  await getDb().runTransaction(async (transaction: admin.firestore.Transaction) => {
    const userSubDoc = await transaction.get(userSubRef);
    
    if (!userSubDoc.exists) {
      transaction.set(userSubRef, {
        userId,
        subscriptionPlanId,
        planEffectiveStart,
        planEffectiveEnd,
        billingCycleStart,
        billingCycleEnd,
        bookCreditsUsedThisCycle: 0,
        wordCreditsUsedThisCycle: 0,
        remainingBookCreditsFromAddons: 0,
        remainingWordCreditsFromAddons: 0,
        remainingBookCreditsFromAdmin: 0,
        remainingWordCreditsFromAdmin: 0,
        totalBookCreditsFromAddonsThisCycle: 0,
        totalWordCreditsFromAddonsThisCycle: 0,
        totalBookCreditsFromAdminThisCycle: 0,
        totalWordCreditsFromAdminThisCycle: 0,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      const userSub = userSubDoc.data() as UserSubscription;
      
      transaction.update(userSubRef, {
        subscriptionPlanId,
        planEffectiveStart,
        planEffectiveEnd,
        billingCycleStart,
        billingCycleEnd,
        bookCreditsUsedThisCycle: 0,
        wordCreditsUsedThisCycle: 0,
        totalBookCreditsFromAddonsThisCycle: userSub.remainingBookCreditsFromAddons || 0,
        totalWordCreditsFromAddonsThisCycle: userSub.remainingWordCreditsFromAddons || 0,
        totalBookCreditsFromAdminThisCycle: userSub.remainingBookCreditsFromAdmin || 0,
        totalWordCreditsFromAdminThisCycle: userSub.remainingWordCreditsFromAdmin || 0,
        updatedAt: now,
      });
    }
  });
}

export async function getUserCreditSummary(userId: string): Promise<CreditSummary> {
  let userSub = await getUserSubscription(userId);
  
  if (!userSub) {
    await initializeUserSubscription(userId);
    const newUserSub = await getUserSubscription(userId);
    if (!newUserSub) {
      throw new Error('Failed to initialize user subscription');
    }
    return calculateCreditSummary(newUserSub, null);
  }
  
  const now = new Date();
  const cycleEnd = userSub.billingCycleEnd.toDate();
  
  if (now > cycleEnd) {
    await resetBillingCycle(userId);
    const updatedUserSub = await getUserSubscription(userId);
    if (!updatedUserSub) {
      throw new Error('Failed to get updated subscription');
    }
    userSub = updatedUserSub;
  }
  
  const plan = userSub.subscriptionPlanId 
    ? await getSubscriptionPlan(userSub.subscriptionPlanId)
    : null;
    
  return calculateCreditSummary(userSub, plan);
}

function calculateCreditSummary(
  userSub: UserSubscription,
  plan: SubscriptionPlan | null
): CreditSummary {
  const bookCreditsFromPlan = plan?.bookCreditsPerMonth || 0;
  const wordCreditsFromPlan = plan?.wordCreditsPerMonth || 0;
  
  const bookCreditsFromPlanAvailable = Math.max(0, bookCreditsFromPlan - userSub.bookCreditsUsedThisCycle);
  const wordCreditsFromPlanAvailable = Math.max(0, wordCreditsFromPlan - userSub.wordCreditsUsedThisCycle);
  
  const bookCreditsAvailable = bookCreditsFromPlanAvailable + userSub.remainingBookCreditsFromAddons + userSub.remainingBookCreditsFromAdmin;
  const wordCreditsAvailable = wordCreditsFromPlanAvailable + userSub.remainingWordCreditsFromAddons + userSub.remainingWordCreditsFromAdmin;
  
  const totalBookCreditsFromAddons = userSub.totalBookCreditsFromAddonsThisCycle ?? userSub.remainingBookCreditsFromAddons;
  const totalWordCreditsFromAddons = userSub.totalWordCreditsFromAddonsThisCycle ?? userSub.remainingWordCreditsFromAddons;
  const totalBookCreditsFromAdmin = userSub.totalBookCreditsFromAdminThisCycle ?? userSub.remainingBookCreditsFromAdmin;
  const totalWordCreditsFromAdmin = userSub.totalWordCreditsFromAdminThisCycle ?? userSub.remainingWordCreditsFromAdmin;
  
  const bookCreditsTotal = bookCreditsFromPlan + totalBookCreditsFromAddons + totalBookCreditsFromAdmin;
  const wordCreditsTotal = wordCreditsFromPlan + totalWordCreditsFromAddons + totalWordCreditsFromAdmin;
  
  const totalBookCreditsUsed = bookCreditsTotal - bookCreditsAvailable;
  const totalWordCreditsUsed = wordCreditsTotal - wordCreditsAvailable;
  
  return {
    bookCreditsAvailable,
    bookCreditsUsed: totalBookCreditsUsed,
    bookCreditsTotal,
    wordCreditsAvailable,
    wordCreditsUsed: totalWordCreditsUsed,
    wordCreditsTotal,
    currentPeriodStart: userSub.billingCycleStart.toDate(),
    currentPeriodEnd: userSub.billingCycleEnd.toDate(),
    subscriptionPlan: plan,
  };
}

async function resetBillingCycle(userId: string): Promise<void> {
  const now = admin.firestore.Timestamp.now();
  const nowDate = now.toDate();
  
  const cycleStart = now;
  const cycleEnd = admin.firestore.Timestamp.fromDate(
    new Date(
      nowDate.getFullYear(),
      nowDate.getMonth() + 1,
      nowDate.getDate(),
      23, 59, 59, 999
    )
  );
  
  const userSubRef = getDb().collection(COLLECTIONS.USER_SUBSCRIPTIONS).doc(userId);
  
  await getDb().runTransaction(async (transaction: admin.firestore.Transaction) => {
    const userSubDoc = await transaction.get(userSubRef);
    
    if (!userSubDoc.exists) {
      throw new Error('User subscription not found');
    }
    
    const userSub = userSubDoc.data() as UserSubscription;
    
    transaction.update(userSubRef, {
      bookCreditsUsedThisCycle: 0,
      wordCreditsUsedThisCycle: 0,
      totalBookCreditsFromAddonsThisCycle: userSub.remainingBookCreditsFromAddons,
      totalWordCreditsFromAddonsThisCycle: userSub.remainingWordCreditsFromAddons,
      totalBookCreditsFromAdminThisCycle: userSub.remainingBookCreditsFromAdmin,
      totalWordCreditsFromAdminThisCycle: userSub.remainingWordCreditsFromAdmin,
      billingCycleStart: cycleStart,
      billingCycleEnd: cycleEnd,
      updatedAt: now,
    });
  });
}

export async function deductCredits(
  userId: string,
  creditType: CreditTypeCategory,
  amount: number,
  transactionType: CreditTransactionType,
  description: string,
  metadata?: Record<string, any>
): Promise<void> {
  const userSubRef = getDb().collection(COLLECTIONS.USER_SUBSCRIPTIONS).doc(userId);
  
  await getDb().runTransaction(async (transaction: admin.firestore.Transaction) => {
    const userSubDoc = await transaction.get(userSubRef);
    
    if (!userSubDoc.exists) {
      throw new Error('User subscription not found');
    }
    
    let userSub = userSubDoc.data() as UserSubscription;
    
    const now = new Date();
    const cycleEnd = userSub.billingCycleEnd.toDate();
    
    if (now > cycleEnd) {
      const effectiveStart = userSub.planEffectiveStart.toDate();
      const nowTimestamp = admin.firestore.Timestamp.fromDate(now);
      
      const dayOfMonth = effectiveStart.getDate();
      let newCycleStart = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
      if (newCycleStart <= now) {
        newCycleStart = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
      }
      
      const newCycleEnd = new Date(
        newCycleStart.getFullYear(),
        newCycleStart.getMonth() + 1,
        dayOfMonth - 1,
        23, 59, 59, 999
      );
      
      const newCycleStartTimestamp = admin.firestore.Timestamp.fromDate(newCycleStart);
      const newCycleEndTimestamp = admin.firestore.Timestamp.fromDate(newCycleEnd);
      
      transaction.update(userSubRef, {
        bookCreditsUsedThisCycle: 0,
        wordCreditsUsedThisCycle: 0,
        totalBookCreditsFromAddonsThisCycle: userSub.remainingBookCreditsFromAddons,
        totalWordCreditsFromAddonsThisCycle: userSub.remainingWordCreditsFromAddons,
        totalBookCreditsFromAdminThisCycle: userSub.remainingBookCreditsFromAdmin,
        totalWordCreditsFromAdminThisCycle: userSub.remainingWordCreditsFromAdmin,
        billingCycleStart: newCycleStartTimestamp,
        billingCycleEnd: newCycleEndTimestamp,
        updatedAt: nowTimestamp,
      });
      
      userSub.bookCreditsUsedThisCycle = 0;
      userSub.wordCreditsUsedThisCycle = 0;
      userSub.totalBookCreditsFromAddonsThisCycle = userSub.remainingBookCreditsFromAddons;
      userSub.totalWordCreditsFromAddonsThisCycle = userSub.remainingWordCreditsFromAddons;
      userSub.totalBookCreditsFromAdminThisCycle = userSub.remainingBookCreditsFromAdmin;
      userSub.totalWordCreditsFromAdminThisCycle = userSub.remainingWordCreditsFromAdmin;
      userSub.billingCycleStart = newCycleStartTimestamp as any;
      userSub.billingCycleEnd = newCycleEndTimestamp as any;
    }
    
    const plan = userSub.subscriptionPlanId 
      ? await getSubscriptionPlan(userSub.subscriptionPlanId)
      : null;
      
    const summary = calculateCreditSummary(userSub, plan);
    
    const updateData: any = { updatedAt: admin.firestore.Timestamp.now() };
    let remainingToDeduct = amount;
    
    if (creditType === 'words') {
      if (summary.wordCreditsAvailable < amount) {
        throw new Error(`Insufficient word credits. Available: ${summary.wordCreditsAvailable}, Needed: ${amount}`);
      }
      
      if (userSub.remainingWordCreditsFromAddons > 0 && remainingToDeduct > 0) {
        const addonDeduction = Math.min(remainingToDeduct, userSub.remainingWordCreditsFromAddons);
        updateData.remainingWordCreditsFromAddons = admin.firestore.FieldValue.increment(-addonDeduction);
        remainingToDeduct -= addonDeduction;
      }
      
      if (userSub.remainingWordCreditsFromAdmin > 0 && remainingToDeduct > 0) {
        const adminDeduction = Math.min(remainingToDeduct, userSub.remainingWordCreditsFromAdmin);
        updateData.remainingWordCreditsFromAdmin = admin.firestore.FieldValue.increment(-adminDeduction);
        remainingToDeduct -= adminDeduction;
      }
      
      if (remainingToDeduct > 0) {
        updateData.wordCreditsUsedThisCycle = admin.firestore.FieldValue.increment(remainingToDeduct);
      }
    } else if (creditType === 'books') {
      if (summary.bookCreditsAvailable < amount) {
        throw new Error(`Insufficient book credits. Available: ${summary.bookCreditsAvailable}, Needed: ${amount}`);
      }
      
      if (userSub.remainingBookCreditsFromAddons > 0 && remainingToDeduct > 0) {
        const addonDeduction = Math.min(remainingToDeduct, userSub.remainingBookCreditsFromAddons);
        updateData.remainingBookCreditsFromAddons = admin.firestore.FieldValue.increment(-addonDeduction);
        remainingToDeduct -= addonDeduction;
      }
      
      if (userSub.remainingBookCreditsFromAdmin > 0 && remainingToDeduct > 0) {
        const adminDeduction = Math.min(remainingToDeduct, userSub.remainingBookCreditsFromAdmin);
        updateData.remainingBookCreditsFromAdmin = admin.firestore.FieldValue.increment(-adminDeduction);
        remainingToDeduct -= adminDeduction;
      }
      
      if (remainingToDeduct > 0) {
        updateData.bookCreditsUsedThisCycle = admin.firestore.FieldValue.increment(remainingToDeduct);
      }
    }
    
    transaction.update(userSubRef, updateData);
  });
  
  await logCreditTransaction(
    userId,
    transactionType,
    -amount,
    creditType,
    description,
    metadata
  );
}

export async function addCredits(
  userId: string,
  creditType: CreditTypeCategory,
  amount: number,
  transactionType: CreditTransactionType,
  description: string,
  metadata?: Record<string, any>
): Promise<void> {
  const userSub = await getUserSubscription(userId);
  if (!userSub) {
    await initializeUserSubscription(userId);
  }
  
  const userSubRef = getDb().collection(COLLECTIONS.USER_SUBSCRIPTIONS).doc(userId);
  const isAddonPurchase = transactionType === 'word_purchase' || transactionType === 'book_purchase';
  
  await getDb().runTransaction(async (transaction: admin.firestore.Transaction) => {
    const userSubDoc = await transaction.get(userSubRef);
    
    if (!userSubDoc.exists) {
      throw new Error('User subscription not found');
    }
    
    const updateData: any = { updatedAt: admin.firestore.Timestamp.now() };
    
    if (creditType === 'words') {
      if (isAddonPurchase) {
        updateData.remainingWordCreditsFromAddons = admin.firestore.FieldValue.increment(amount);
        updateData.totalWordCreditsFromAddonsThisCycle = admin.firestore.FieldValue.increment(amount);
      } else {
        updateData.remainingWordCreditsFromAdmin = admin.firestore.FieldValue.increment(amount);
        updateData.totalWordCreditsFromAdminThisCycle = admin.firestore.FieldValue.increment(amount);
      }
    } else {
      if (isAddonPurchase) {
        updateData.remainingBookCreditsFromAddons = admin.firestore.FieldValue.increment(amount);
        updateData.totalBookCreditsFromAddonsThisCycle = admin.firestore.FieldValue.increment(amount);
      } else {
        updateData.remainingBookCreditsFromAdmin = admin.firestore.FieldValue.increment(amount);
        updateData.totalBookCreditsFromAdminThisCycle = admin.firestore.FieldValue.increment(amount);
      }
    }
    
    transaction.update(userSubRef, updateData);
  });
  
  await logCreditTransaction(
    userId,
    transactionType,
    amount,
    creditType,
    description,
    metadata
  );
}

async function logCreditTransaction(
  userId: string,
  type: CreditTransactionType,
  amount: number,
  creditType: CreditTypeCategory,
  description: string,
  metadata?: Record<string, any>
): Promise<void> {
  const collectionRef = getDb().collection(COLLECTIONS.CREDIT_TRANSACTIONS);
  await collectionRef.add({
    userId,
    type,
    amount,
    creditType,
    description,
    metadata: metadata || {},
    createdAt: admin.firestore.Timestamp.now(),
  });
}

export async function getCreditTransactions(
  userId: string,
  limitCount = 50
): Promise<CreditTransaction[]> {
  const transactionsRef = getDb().collection(COLLECTIONS.CREDIT_TRANSACTIONS);
  const q = transactionsRef
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limitCount);
  
  const snapshot = await q.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CreditTransaction));
}

export async function allocateCreditsToUser(input: AllocateCreditsInput): Promise<void> {
  await addCredits(
    input.userId,
    input.creditType,
    input.amount,
    'admin_allocation',
    input.description,
    { allocatedBy: 'admin' }
  );
}

export async function updateUserSubscriptionPlan(
  userId: string,
  subscriptionPlanId: string | null
): Promise<void> {
  const docRef = getDb().collection(COLLECTIONS.USER_SUBSCRIPTIONS).doc(userId);
  await docRef.update({
    subscriptionPlanId,
    updatedAt: admin.firestore.Timestamp.now(),
  });
}

export async function refundBookCredit(
  userId: string,
  projectId: string,
  description: string = 'Book project deleted - credit refunded'
): Promise<void> {
  const userSubRef = getDb().collection(COLLECTIONS.USER_SUBSCRIPTIONS).doc(userId);
  
  await getDb().runTransaction(async (transaction: admin.firestore.Transaction) => {
    const userSubDoc = await transaction.get(userSubRef);
    
    if (!userSubDoc.exists) {
      throw new Error('User subscription not found');
    }
    
    const userSub = userSubDoc.data() as UserSubscription;
    const updateData: any = { updatedAt: admin.firestore.Timestamp.now() };
    
    if (userSub.bookCreditsUsedThisCycle > 0) {
      updateData.bookCreditsUsedThisCycle = admin.firestore.FieldValue.increment(-1);
    }
    
    transaction.update(userSubRef, updateData);
  });
  
  await logCreditTransaction(
    userId,
    'book_deletion',
    1,
    'books',
    description,
    { projectId }
  );
}

export async function checkWordCredits(userId: string, wordsNeeded: number): Promise<boolean> {
  const summary = await getUserCreditSummary(userId);
  return summary.wordCreditsAvailable >= wordsNeeded;
}

export async function checkBookCredits(userId: string): Promise<boolean> {
  const summary = await getUserCreditSummary(userId);
  return summary.bookCreditsAvailable >= 1;
}
