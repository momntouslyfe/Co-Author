import { Timestamp } from 'firebase/firestore';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  bookCreditsPerMonth: number;
  wordCreditsPerMonth: number;
  price: number;
  currency: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type AddonCreditType = 'words' | 'books';

export interface AddonCreditPlan {
  id: string;
  type: AddonCreditType;
  name: string;
  description?: string;
  creditAmount: number;
  price: number;
  currency: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserSubscription {
  userId: string;
  subscriptionPlanId: string | null;
  planEffectiveStart: Timestamp;
  planEffectiveEnd: Timestamp;
  billingCycleStart: Timestamp;
  billingCycleEnd: Timestamp;
  bookCreditsUsedThisCycle: number;
  wordCreditsUsedThisCycle: number;
  remainingBookCreditsFromAddons: number;
  remainingWordCreditsFromAddons: number;
  remainingBookCreditsFromAdmin: number;
  remainingWordCreditsFromAdmin: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CreditTransactionType = 
  | 'word_usage' 
  | 'book_creation' 
  | 'word_purchase' 
  | 'book_purchase' 
  | 'admin_allocation'
  | 'book_deletion';

export type CreditTypeCategory = 'words' | 'books';

export interface CreditTransaction {
  id: string;
  userId: string;
  type: CreditTransactionType;
  amount: number;
  creditType: CreditTypeCategory;
  description: string;
  metadata?: {
    projectId?: string;
    chapterId?: string;
    flowName?: string;
    addonPlanId?: string;
    allocatedBy?: string;
    [key: string]: any;
  };
  createdAt: Timestamp;
}

export interface CreditSummary {
  bookCreditsAvailable: number;
  bookCreditsUsed: number;
  bookCreditsTotal: number;
  wordCreditsAvailable: number;
  wordCreditsUsed: number;
  wordCreditsTotal: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  subscriptionPlan: SubscriptionPlan | null;
}

export interface CreateSubscriptionPlanInput {
  name: string;
  description?: string;
  bookCreditsPerMonth: number;
  wordCreditsPerMonth: number;
  price: number;
  currency: string;
  isActive: boolean;
}

export interface UpdateSubscriptionPlanInput {
  name?: string;
  description?: string;
  bookCreditsPerMonth?: number;
  wordCreditsPerMonth?: number;
  price?: number;
  currency?: string;
  isActive?: boolean;
}

export interface CreateAddonCreditPlanInput {
  type: AddonCreditType;
  name: string;
  description?: string;
  creditAmount: number;
  price: number;
  currency: string;
  isActive: boolean;
}

export interface UpdateAddonCreditPlanInput {
  name?: string;
  description?: string;
  creditAmount?: number;
  price?: number;
  currency?: string;
  isActive?: boolean;
}

export interface AllocateCreditsInput {
  userId: string;
  creditType: CreditTypeCategory;
  amount: number;
  description: string;
}
