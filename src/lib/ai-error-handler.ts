/**
 * AI Error Handler
 * 
 * This module provides error handling utilities for AI flows.
 * It ensures that subscription and credit errors are properly serialized
 * and can be displayed to users with meaningful messages.
 */

import { SubscriptionRequiredError } from './credit-tracker';

/**
 * Error codes for AI operations
 */
export const AI_ERROR_CODES = {
  NO_SUBSCRIPTION: 'NO_ACTIVE_SUBSCRIPTION',
  SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  AI_GENERATION_FAILED: 'AI_GENERATION_FAILED',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
} as const;

/**
 * Serializable AI Error that can be sent across network boundaries
 */
export class AIOperationError extends Error {
  public readonly code: string;
  public readonly isUserFacing: boolean;

  constructor(message: string, code: string, isUserFacing: boolean = true) {
    super(message);
    this.name = 'AIOperationError';
    this.code = code;
    this.isUserFacing = isUserFacing;
  }
}

/**
 * Wraps an async AI operation and ensures errors are properly formatted
 * for serialization across the network boundary.
 * 
 * @param operation - The async operation to execute
 * @param context - Context string for logging (e.g., "research", "chapter writing")
 * @returns The result of the operation
 * @throws AIOperationError with user-friendly messages
 */
export async function withAIErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    console.error(`AI operation error in ${context}:`, error);

    // Handle SubscriptionRequiredError
    if (error instanceof SubscriptionRequiredError || error.name === 'SubscriptionRequiredError') {
      throw new Error(error.message || error.userMessage || 
        'You need an active subscription to use AI features. Please subscribe from the Billing section in Settings.');
    }

    // Handle insufficient credits errors
    if (error.message?.includes('Insufficient')) {
      throw new Error(error.message);
    }

    // Handle authentication errors
    if (error.message?.includes('Not authenticated') || error.message?.includes('Unauthorized')) {
      throw new Error('Please sign in to use AI features.');
    }

    // Handle AI generation failures
    if (error.message?.includes('AI failed')) {
      throw new Error(error.message);
    }

    // For other errors, provide a generic but informative message
    throw new Error(
      error.message || `An error occurred during ${context}. Please try again.`
    );
  }
}

/**
 * Checks if an error is a subscription-related error
 */
export function isSubscriptionError(error: any): boolean {
  if (!error) return false;
  
  const message = error.message?.toLowerCase() || '';
  return (
    error instanceof SubscriptionRequiredError ||
    error.name === 'SubscriptionRequiredError' ||
    error.code === AI_ERROR_CODES.NO_SUBSCRIPTION ||
    error.code === AI_ERROR_CODES.SUBSCRIPTION_EXPIRED ||
    message.includes('subscription') ||
    message.includes('subscribe')
  );
}

/**
 * Checks if an error is a credit-related error
 */
export function isCreditError(error: any): boolean {
  if (!error) return false;
  
  const message = error.message?.toLowerCase() || '';
  return (
    error.code === AI_ERROR_CODES.INSUFFICIENT_CREDITS ||
    message.includes('insufficient') ||
    message.includes('credits')
  );
}
