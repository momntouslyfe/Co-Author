import { Timestamp } from 'firebase/firestore';

export type SupportedCurrency = 'USD' | 'BDT';

export interface CurrencySettings {
  id: string;
  code: SupportedCurrency;
  symbol: string;
  name: string;
  isEnabled: boolean;
  isDefault: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CurrencyConversionRate {
  id: string;
  fromCurrency: SupportedCurrency;
  toCurrency: SupportedCurrency;
  rate: number;
  updatedAt: Timestamp;
  updatedBy?: string;
}

export interface CreateCurrencySettingsInput {
  code: SupportedCurrency;
  symbol: string;
  name: string;
  isEnabled: boolean;
  isDefault: boolean;
}

export interface UpdateCurrencySettingsInput {
  isEnabled?: boolean;
  isDefault?: boolean;
}

export interface UpdateConversionRateInput {
  fromCurrency: SupportedCurrency;
  toCurrency: SupportedCurrency;
  rate: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  bookCreditsPerMonth: number;
  wordCreditsPerMonth: number;
  offerCreditsPerMonth: number;
  price: number;
  currency: string;
  isActive: boolean;
  allowCreditRollover: boolean;
  enableCoMarketer: boolean;
  enableCoWriter: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type AddonCreditType = 'words' | 'books' | 'offers';

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
  offerCreditsUsedThisCycle: number;
  remainingBookCreditsFromAddons: number;
  remainingWordCreditsFromAddons: number;
  remainingOfferCreditsFromAddons: number;
  remainingBookCreditsFromAdmin: number;
  remainingWordCreditsFromAdmin: number;
  remainingOfferCreditsFromAdmin: number;
  totalBookCreditsFromAddonsThisCycle?: number;
  totalWordCreditsFromAddonsThisCycle?: number;
  totalOfferCreditsFromAddonsThisCycle?: number;
  totalBookCreditsFromAdminThisCycle?: number;
  totalWordCreditsFromAdminThisCycle?: number;
  totalOfferCreditsFromAdminThisCycle?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CreditTransactionType = 
  | 'word_usage' 
  | 'book_creation' 
  | 'offer_creation'
  | 'word_purchase' 
  | 'book_purchase' 
  | 'offer_purchase'
  | 'admin_allocation'
  | 'book_deletion'
  | 'offer_deletion';

export type CreditTypeCategory = 'words' | 'books' | 'offers';

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
  offerCreditsAvailable: number;
  offerCreditsUsed: number;
  offerCreditsTotal: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  subscriptionPlan: SubscriptionPlan | null;
}

export interface CreateSubscriptionPlanInput {
  name: string;
  description?: string;
  bookCreditsPerMonth: number;
  wordCreditsPerMonth: number;
  offerCreditsPerMonth: number;
  price: number;
  currency: string;
  isActive: boolean;
}

export interface UpdateSubscriptionPlanInput {
  name?: string;
  description?: string;
  bookCreditsPerMonth?: number;
  wordCreditsPerMonth?: number;
  offerCreditsPerMonth?: number;
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

export type CouponCategory = 'promotional' | 'affiliate';
export type CouponDiscountType = 'percentage' | 'fixed';

export interface Coupon {
  id: string;
  code: string;
  category: CouponCategory;
  discountType: CouponDiscountType;
  discountValue: number;
  currency?: string;
  maxUsesPerUser: number;
  validFrom: Timestamp;
  validUntil: Timestamp;
  specificUserId?: string;
  affiliateId?: string;
  isActive: boolean;
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CouponUsage {
  id: string;
  userId: string;
  couponId: string;
  couponCode: string;
  usedAt: Timestamp;
  discountAmount: number;
  originalAmount: number;
  finalAmount: number;
  subscriptionPlanId?: string;
  addonPlanId?: string;
}

export interface CreateCouponInput {
  code: string;
  category: CouponCategory;
  discountType: CouponDiscountType;
  discountValue: number;
  currency?: string;
  maxUsesPerUser: number;
  validFrom: Date;
  validUntil: Date;
  specificUserId?: string;
  affiliateId?: string;
  isActive: boolean;
  description?: string;
}

export interface UpdateCouponInput {
  code?: string;
  category?: CouponCategory;
  discountType?: CouponDiscountType;
  discountValue?: number;
  currency?: string;
  maxUsesPerUser?: number;
  validFrom?: Date;
  validUntil?: Date;
  specificUserId?: string;
  affiliateId?: string;
  isActive?: boolean;
  description?: string;
}

export interface ValidateCouponInput {
  code: string;
  userId: string;
  subscriptionPlanId?: string;
  addonPlanId?: string;
}

export interface ValidateCouponResponse {
  valid: boolean;
  error?: string;
  coupon?: Coupon;
  discountAmount?: number;
  finalAmount?: number;
}

// Trial Settings (Global admin configuration)
export interface TrialSettings {
  enabled: boolean;
  durationDays: number;
  offerCreditsAmount: number;
  enableCoMarketer: boolean;
  enableCoWriter: boolean;
}

// User Trial Status (stored per user in userSubscriptions)
export interface UserTrialStatus {
  hasUsedTrial: boolean;
  trialStartedAt?: Timestamp;
  trialExpiresAt?: Timestamp;
  trialOfferCreditsGiven: number;
  trialOfferCreditsUsed: number;
}

// Admin Feature Grant (stored in userFeatureGrants collection)
export type FeatureGrantType = 'coMarketer' | 'coWriter';

export interface UserFeatureGrant {
  id: string;
  userId: string;
  feature: FeatureGrantType;
  expiresAt: Timestamp;
  grantedBy: string;
  grantedAt: Timestamp;
  notes?: string;
}

export interface CreateFeatureGrantInput {
  userId: string;
  feature: FeatureGrantType;
  durationDays?: number;
  expiresAt?: Date;
  notes?: string;
}

export interface UpdateFeatureGrantInput {
  expiresAt?: Date;
  notes?: string;
}

// Extended User Subscription with trial fields
export interface UserSubscriptionWithTrial extends UserSubscription {
  // Trial fields
  hasUsedTrial?: boolean;
  trialStartedAt?: Timestamp;
  trialExpiresAt?: Timestamp;
  trialOfferCreditsGiven?: number;
  trialOfferCreditsUsed?: number;
  remainingOfferCreditsFromTrial?: number;
}

// Feature Access Result (for checking access with details)
export interface FeatureAccessResult {
  hasAccess: boolean;
  source: 'subscription' | 'trial' | 'adminGrant' | 'credits' | 'none';
  expiresAt?: Date;
  isTrial?: boolean;
}
