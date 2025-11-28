import { deductCredits, getUserCreditSummary, getUserSubscription } from './credits';
import type { CreditTypeCategory } from '@/types/subscription';

export class SubscriptionRequiredError extends Error {
  public readonly code: string;
  public readonly userMessage: string;
  
  constructor(message: string, code: string) {
    super(message);
    this.name = 'SubscriptionRequiredError';
    this.code = code;
    this.userMessage = message;
    Object.setPrototypeOf(this, SubscriptionRequiredError.prototype);
  }
}

export function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

async function checkActiveSubscription(userId: string): Promise<void> {
  const userSubscription = await getUserSubscription(userId);
  
  if (!userSubscription || !userSubscription.subscriptionPlanId) {
    throw new SubscriptionRequiredError(
      'You need an active subscription to use AI features. Please subscribe to a plan from the Billing section in Settings to unlock AI-powered writing tools.',
      'NO_ACTIVE_SUBSCRIPTION'
    );
  }

  const now = new Date();
  let planEffectiveEnd: Date;
  
  if (typeof userSubscription.planEffectiveEnd === 'object' && userSubscription.planEffectiveEnd !== null) {
    if ('toDate' in userSubscription.planEffectiveEnd && typeof userSubscription.planEffectiveEnd.toDate === 'function') {
      planEffectiveEnd = userSubscription.planEffectiveEnd.toDate();
    } else if (userSubscription.planEffectiveEnd instanceof Date) {
      planEffectiveEnd = userSubscription.planEffectiveEnd;
    } else if ('seconds' in userSubscription.planEffectiveEnd) {
      planEffectiveEnd = new Date((userSubscription.planEffectiveEnd as any).seconds * 1000);
    } else {
      planEffectiveEnd = new Date(userSubscription.planEffectiveEnd as any);
    }
  } else {
    planEffectiveEnd = new Date(userSubscription.planEffectiveEnd);
  }
  
  if (now > planEffectiveEnd) {
    throw new SubscriptionRequiredError(
      'Your subscription has expired. Please renew your subscription from the Billing section in Settings to continue using AI features.',
      'SUBSCRIPTION_EXPIRED'
    );
  }
}

export async function preflightCheckWordCredits(
  userId: string,
  estimatedWords: number
): Promise<void> {
  await checkActiveSubscription(userId);
  
  const creditSummary = await getUserCreditSummary(userId);
  
  if (creditSummary.wordCreditsAvailable < estimatedWords) {
    throw new Error(
      `Insufficient word credits. You have ${creditSummary.wordCreditsAvailable} credits remaining, ` +
      `but this operation requires approximately ${estimatedWords} words. ` +
      'Please purchase more credits to continue.'
    );
  }
}

export async function trackAIUsage(
  userId: string,
  generatedContent: string,
  flowName: string,
  metadata?: Record<string, any>
): Promise<void> {
  const wordCount = countWords(generatedContent);
  
  if (wordCount === 0) {
    return;
  }

  try {
    await deductCredits(
      userId,
      'words',
      wordCount,
      'word_usage',
      `AI generation via ${flowName}: ${wordCount} words`,
      { flowName, wordCount, ...metadata }
    );
  } catch (error: any) {
    console.error('Credit tracking error:', error);
    throw new Error(
      `Failed to deduct credits: ${error.message}. You may have insufficient word credits.`
    );
  }
}

export async function checkBookCreationCredit(userId: string): Promise<void> {
  await checkActiveSubscription(userId);
  
  const creditSummary = await getUserCreditSummary(userId);
  
  if (creditSummary.bookCreditsAvailable < 1) {
    throw new Error(
      `Insufficient book creation credits. You have ${creditSummary.bookCreditsAvailable} credits remaining. ` +
      'Please purchase more credits or upgrade your plan to continue.'
    );
  }
}

export async function trackBookCreation(
  userId: string,
  projectId: string,
  projectTitle: string
): Promise<void> {
  try {
    await deductCredits(
      userId,
      'books',
      1,
      'book_creation',
      `Created new book project: ${projectTitle}`,
      { projectId }
    );
  } catch (error: any) {
    console.error('Book creation credit tracking error:', error);
    throw new Error(
      `Failed to deduct book creation credit: ${error.message}`
    );
  }
}

export async function refundBookCreationCredit(
  userId: string,
  projectId: string,
  projectTitle: string
): Promise<void> {
  try {
    await deductCredits(
      userId,
      'books',
      -1,
      'book_deletion',
      `Refunded book creation credit for deleted project: ${projectTitle}`,
      { projectId }
    );
  } catch (error: any) {
    console.error('Book deletion credit refund error:', error);
  }
}

export async function checkWordCredits(userId: string, estimatedWords: number): Promise<void> {
  const creditSummary = await getUserCreditSummary(userId);
  
  if (creditSummary.wordCreditsAvailable < estimatedWords) {
    throw new Error(
      `Insufficient word credits. You have ${creditSummary.wordCreditsAvailable} credits remaining, ` +
      `but this operation requires approximately ${estimatedWords} words. ` +
      'Please purchase more credits to continue.'
    );
  }
}

export async function checkOfferCreationCredit(userId: string): Promise<void> {
  await checkActiveSubscription(userId);
  
  const creditSummary = await getUserCreditSummary(userId);
  
  if (creditSummary.offerCreditsAvailable < 1) {
    throw new Error(
      `Insufficient offer creation credits. You have ${creditSummary.offerCreditsAvailable} credits remaining. ` +
      'Please purchase more credits or upgrade your plan to continue.'
    );
  }
}

export async function trackOfferCreation(
  userId: string,
  offerProjectId: string,
  offerTitle: string
): Promise<void> {
  try {
    await deductCredits(
      userId,
      'offers',
      1,
      'offer_creation',
      `Created new offer project: ${offerTitle}`,
      { offerProjectId }
    );
  } catch (error: any) {
    console.error('Offer creation credit tracking error:', error);
    throw new Error(
      `Failed to deduct offer creation credit: ${error.message}`
    );
  }
}

export async function refundOfferCreationCredit(
  userId: string,
  offerProjectId: string,
  offerTitle: string
): Promise<void> {
  try {
    await deductCredits(
      userId,
      'offers',
      -1,
      'offer_deletion',
      `Refunded offer creation credit for deleted project: ${offerTitle}`,
      { offerProjectId }
    );
  } catch (error: any) {
    console.error('Offer deletion credit refund error:', error);
  }
}
