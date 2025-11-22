import { deductCredits, getUserCreditSummary } from './credits';
import type { CreditTypeCategory } from '@/types/subscription';

export function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

export async function preflightCheckWordCredits(
  userId: string,
  estimatedWords: number
): Promise<void> {
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
