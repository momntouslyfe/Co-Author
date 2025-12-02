/**
 * AI Error Handler
 * 
 * This module provides error handling utilities for AI flows.
 * It ensures that subscription and credit errors are properly serialized
 * and can be displayed to users with meaningful messages.
 * 
 * IMPORTANT: In Next.js production builds, thrown errors from server components/actions
 * are sanitized and the original message is hidden. To preserve user-friendly messages,
 * we return result objects with { success, data, error } instead of throwing.
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
 * Result type for AI operations that preserves error messages in production
 */
export type AIResult<T> = 
  | { success: true; data: T; error?: undefined }
  | { success: false; data?: undefined; error: string; code?: string };

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
 * Converts an error to a user-friendly message
 */
function getErrorMessage(error: any, context: string): { message: string; code?: string } {
  // Handle SubscriptionRequiredError
  if (error instanceof SubscriptionRequiredError || error.name === 'SubscriptionRequiredError') {
    return {
      message: error.message || error.userMessage || 
        'You need an active subscription to use AI features. Please subscribe to a plan from the Billing section in Settings to unlock AI-powered writing tools.',
      code: AI_ERROR_CODES.NO_SUBSCRIPTION
    };
  }

  // Handle insufficient credits errors
  if (error.message?.includes('Insufficient')) {
    return { message: error.message, code: AI_ERROR_CODES.INSUFFICIENT_CREDITS };
  }

  // Handle authentication errors
  if (error.message?.includes('Not authenticated') || error.message?.includes('Unauthorized')) {
    return { message: 'Please sign in to use AI features.', code: AI_ERROR_CODES.AUTHENTICATION_REQUIRED };
  }

  // Handle AI generation failures
  if (error.message?.includes('AI failed')) {
    return { message: error.message, code: AI_ERROR_CODES.AI_GENERATION_FAILED };
  }

  // Handle quota/rate limit errors
  if (error.message?.includes('429') || error.message?.includes('quota')) {
    return { message: 'You have exceeded your API quota. Please check your usage limits or try again later.' };
  }

  // Handle service overload errors
  if (error.message?.includes('503') || error.message?.includes('overloaded')) {
    return { message: 'The AI service is currently overloaded. Please wait a moment and try again.' };
  }

  // For other errors, provide a generic but informative message
  return { 
    message: error.message || `An error occurred during ${context}. Please try again.` 
  };
}

/**
 * Wraps an async AI operation and returns a result object instead of throwing.
 * This ensures error messages are preserved in Next.js production builds.
 * 
 * @param operation - The async operation to execute
 * @param context - Context string for logging (e.g., "research", "chapter writing")
 * @returns AIResult with success/data or error message
 */
export async function withAIErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<AIResult<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error: any) {
    console.error(`AI operation error in ${context}:`, error);
    const { message, code } = getErrorMessage(error, context);
    return { success: false, error: message, code };
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
