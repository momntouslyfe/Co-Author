import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  addDoc,
  limit,
  Firestore,
  runTransaction,
  increment,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
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

let db: Firestore;
function getDb(): Firestore {
  if (!db) {
    const { firestore } = initializeFirebase();
    db = firestore;
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
  const docRef = doc(getDb(), COLLECTIONS.SUBSCRIPTION_PLANS, planId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return { id: docSnap.id, ...docSnap.data() } as SubscriptionPlan;
}

export async function getAllSubscriptionPlans(activeOnly = false): Promise<SubscriptionPlan[]> {
  const plansRef = collection(getDb(), COLLECTIONS.SUBSCRIPTION_PLANS);
  const q = activeOnly 
    ? query(plansRef, where('isActive', '==', true), orderBy('price', 'asc'))
    : query(plansRef, orderBy('createdAt', 'desc'));
    
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubscriptionPlan));
}

export async function createSubscriptionPlan(input: CreateSubscriptionPlanInput): Promise<string> {
  const now = Timestamp.now();
  const docRef = doc(collection(getDb(), COLLECTIONS.SUBSCRIPTION_PLANS));
  
  await setDoc(docRef, {
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
  const docRef = doc(getDb(), COLLECTIONS.SUBSCRIPTION_PLANS, planId);
  await updateDoc(docRef, {
    ...input,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteSubscriptionPlan(planId: string): Promise<void> {
  const docRef = doc(getDb(), COLLECTIONS.SUBSCRIPTION_PLANS, planId);
  await deleteDoc(docRef);
}

export async function getAllAddonCreditPlans(
  type?: 'words' | 'books',
  activeOnly = false
): Promise<AddonCreditPlan[]> {
  const plansRef = collection(getDb(), COLLECTIONS.ADDON_CREDIT_PLANS);
  
  let q = query(plansRef);
  
  if (type && activeOnly) {
    q = query(plansRef, where('type', '==', type), where('isActive', '==', true), orderBy('price', 'asc'));
  } else if (type) {
    q = query(plansRef, where('type', '==', type), orderBy('price', 'asc'));
  } else if (activeOnly) {
    q = query(plansRef, where('isActive', '==', true), orderBy('createdAt', 'desc'));
  } else {
    q = query(plansRef, orderBy('createdAt', 'desc'));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AddonCreditPlan));
}

export async function createAddonCreditPlan(input: CreateAddonCreditPlanInput): Promise<string> {
  const now = Timestamp.now();
  const docRef = doc(collection(getDb(), COLLECTIONS.ADDON_CREDIT_PLANS));
  
  await setDoc(docRef, {
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
  const docRef = doc(getDb(), COLLECTIONS.ADDON_CREDIT_PLANS, planId);
  await updateDoc(docRef, {
    ...input,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteAddonCreditPlan(planId: string): Promise<void> {
  const docRef = doc(getDb(), COLLECTIONS.ADDON_CREDIT_PLANS, planId);
  await deleteDoc(docRef);
}

export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  const docRef = doc(getDb(), COLLECTIONS.USER_SUBSCRIPTIONS, userId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return { userId: docSnap.id, ...docSnap.data() } as UserSubscription;
}

export async function initializeUserSubscription(
  userId: string,
  subscriptionPlanId: string | null = null
): Promise<void> {
  const now = Timestamp.now();
  const nowDate = now.toDate();
  
  const billingCycleStart = now;
  const billingCycleEnd = Timestamp.fromDate(
    new Date(
      nowDate.getFullYear(),
      nowDate.getMonth() + 1,
      nowDate.getDate(),
      23, 59, 59, 999
    )
  );
  
  const planEffectiveStart = now;
  const planEffectiveEnd = billingCycleEnd;
  
  const docRef = doc(getDb(), COLLECTIONS.USER_SUBSCRIPTIONS, userId);
  await setDoc(docRef, {
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
    createdAt: now,
    updatedAt: now,
  });
}

export async function getUserCreditSummary(userId: string): Promise<CreditSummary> {
  const userSub = await getUserSubscription(userId);
  
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
    userSub.bookCreditsUsedThisCycle = updatedUserSub.bookCreditsUsedThisCycle;
    userSub.wordCreditsUsedThisCycle = updatedUserSub.wordCreditsUsedThisCycle;
    userSub.billingCycleStart = updatedUserSub.billingCycleStart;
    userSub.billingCycleEnd = updatedUserSub.billingCycleEnd;
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
  
  const bookCreditsTotal = bookCreditsFromPlanAvailable + userSub.remainingBookCreditsFromAddons + userSub.remainingBookCreditsFromAdmin;
  const wordCreditsTotal = wordCreditsFromPlanAvailable + userSub.remainingWordCreditsFromAddons + userSub.remainingWordCreditsFromAdmin;
  
  return {
    bookCreditsAvailable: bookCreditsTotal,
    bookCreditsUsed: userSub.bookCreditsUsedThisCycle,
    bookCreditsTotal: bookCreditsFromPlan + userSub.remainingBookCreditsFromAddons + userSub.remainingBookCreditsFromAdmin,
    wordCreditsAvailable: wordCreditsTotal,
    wordCreditsUsed: userSub.wordCreditsUsedThisCycle,
    wordCreditsTotal: wordCreditsFromPlan + userSub.remainingWordCreditsFromAddons + userSub.remainingWordCreditsFromAdmin,
    currentPeriodStart: userSub.billingCycleStart.toDate(),
    currentPeriodEnd: userSub.billingCycleEnd.toDate(),
    subscriptionPlan: plan,
  };
}

async function resetBillingCycle(userId: string): Promise<void> {
  const now = Timestamp.now();
  const nowDate = now.toDate();
  
  const cycleStart = now;
  const cycleEnd = Timestamp.fromDate(
    new Date(
      nowDate.getFullYear(),
      nowDate.getMonth() + 1,
      nowDate.getDate(),
      23, 59, 59, 999
    )
  );
  
  const docRef = doc(getDb(), COLLECTIONS.USER_SUBSCRIPTIONS, userId);
  await updateDoc(docRef, {
    bookCreditsUsedThisCycle: 0,
    wordCreditsUsedThisCycle: 0,
    billingCycleStart: cycleStart,
    billingCycleEnd: cycleEnd,
    updatedAt: now,
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
  const userSubRef = doc(getDb(), COLLECTIONS.USER_SUBSCRIPTIONS, userId);
  
  await runTransaction(getDb(), async (transaction) => {
    const userSubDoc = await transaction.get(userSubRef);
    
    if (!userSubDoc.exists()) {
      throw new Error('User subscription not found');
    }
    
    let userSub = userSubDoc.data() as UserSubscription;
    
    const now = new Date();
    const cycleEnd = userSub.billingCycleEnd.toDate();
    
    if (now > cycleEnd) {
      const effectiveStart = userSub.planEffectiveStart.toDate();
      const nowTimestamp = Timestamp.fromDate(now);
      
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
      
      const newCycleStartTimestamp = Timestamp.fromDate(newCycleStart);
      const newCycleEndTimestamp = Timestamp.fromDate(newCycleEnd);
      
      transaction.update(userSubRef, {
        bookCreditsUsedThisCycle: 0,
        wordCreditsUsedThisCycle: 0,
        billingCycleStart: newCycleStartTimestamp,
        billingCycleEnd: newCycleEndTimestamp,
        updatedAt: nowTimestamp,
      });
      
      userSub.bookCreditsUsedThisCycle = 0;
      userSub.wordCreditsUsedThisCycle = 0;
      userSub.billingCycleStart = newCycleStartTimestamp;
      userSub.billingCycleEnd = newCycleEndTimestamp;
    }
    
    const plan = userSub.subscriptionPlanId 
      ? await getSubscriptionPlan(userSub.subscriptionPlanId)
      : null;
      
    const summary = calculateCreditSummary(userSub, plan);
    
    const updateData: any = { updatedAt: Timestamp.now() };
    let remainingToDeduct = amount;
    
    if (creditType === 'words') {
      if (summary.wordCreditsAvailable < amount) {
        throw new Error(`Insufficient word credits. Available: ${summary.wordCreditsAvailable}, Needed: ${amount}`);
      }
      
      if (userSub.remainingWordCreditsFromAddons > 0 && remainingToDeduct > 0) {
        const addonDeduction = Math.min(remainingToDeduct, userSub.remainingWordCreditsFromAddons);
        updateData.remainingWordCreditsFromAddons = increment(-addonDeduction);
        remainingToDeduct -= addonDeduction;
      }
      
      if (userSub.remainingWordCreditsFromAdmin > 0 && remainingToDeduct > 0) {
        const adminDeduction = Math.min(remainingToDeduct, userSub.remainingWordCreditsFromAdmin);
        updateData.remainingWordCreditsFromAdmin = increment(-adminDeduction);
        remainingToDeduct -= adminDeduction;
      }
      
      if (remainingToDeduct > 0) {
        updateData.wordCreditsUsedThisCycle = increment(remainingToDeduct);
      }
    } else if (creditType === 'books') {
      if (summary.bookCreditsAvailable < amount) {
        throw new Error(`Insufficient book credits. Available: ${summary.bookCreditsAvailable}, Needed: ${amount}`);
      }
      
      if (userSub.remainingBookCreditsFromAddons > 0 && remainingToDeduct > 0) {
        const addonDeduction = Math.min(remainingToDeduct, userSub.remainingBookCreditsFromAddons);
        updateData.remainingBookCreditsFromAddons = increment(-addonDeduction);
        remainingToDeduct -= addonDeduction;
      }
      
      if (userSub.remainingBookCreditsFromAdmin > 0 && remainingToDeduct > 0) {
        const adminDeduction = Math.min(remainingToDeduct, userSub.remainingBookCreditsFromAdmin);
        updateData.remainingBookCreditsFromAdmin = increment(-adminDeduction);
        remainingToDeduct -= adminDeduction;
      }
      
      if (remainingToDeduct > 0) {
        updateData.bookCreditsUsedThisCycle = increment(remainingToDeduct);
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
  
  const userSubRef = doc(getDb(), COLLECTIONS.USER_SUBSCRIPTIONS, userId);
  const isAddonPurchase = transactionType === 'word_purchase' || transactionType === 'book_purchase';
  
  await runTransaction(getDb(), async (transaction) => {
    const userSubDoc = await transaction.get(userSubRef);
    
    if (!userSubDoc.exists()) {
      throw new Error('User subscription not found');
    }
    
    const updateData: any = { updatedAt: Timestamp.now() };
    
    if (creditType === 'words') {
      if (isAddonPurchase) {
        updateData.remainingWordCreditsFromAddons = increment(amount);
      } else {
        updateData.remainingWordCreditsFromAdmin = increment(amount);
      }
    } else {
      if (isAddonPurchase) {
        updateData.remainingBookCreditsFromAddons = increment(amount);
      } else {
        updateData.remainingBookCreditsFromAdmin = increment(amount);
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
  const docRef = collection(getDb(), COLLECTIONS.CREDIT_TRANSACTIONS);
  await addDoc(docRef, {
    userId,
    type,
    amount,
    creditType,
    description,
    metadata: metadata || {},
    createdAt: Timestamp.now(),
  });
}

export async function getCreditTransactions(
  userId: string,
  limitCount = 50
): Promise<CreditTransaction[]> {
  const transactionsRef = collection(getDb(), COLLECTIONS.CREDIT_TRANSACTIONS);
  const q = query(
    transactionsRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
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
  const docRef = doc(getDb(), COLLECTIONS.USER_SUBSCRIPTIONS, userId);
  await updateDoc(docRef, {
    subscriptionPlanId,
    updatedAt: Timestamp.now(),
  });
}

export async function refundBookCredit(
  userId: string,
  projectId: string,
  description: string = 'Book project deleted - credit refunded'
): Promise<void> {
  const userSubRef = doc(getDb(), COLLECTIONS.USER_SUBSCRIPTIONS, userId);
  
  await runTransaction(getDb(), async (transaction) => {
    const userSubDoc = await transaction.get(userSubRef);
    
    if (!userSubDoc.exists()) {
      throw new Error('User subscription not found');
    }
    
    const userSub = userSubDoc.data() as UserSubscription;
    const updateData: any = { updatedAt: Timestamp.now() };
    
    if (userSub.bookCreditsUsedThisCycle > 0) {
      updateData.bookCreditsUsedThisCycle = increment(-1);
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
