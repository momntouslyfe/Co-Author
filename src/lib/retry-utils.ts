/**
 * @fileOverview Retry utilities for handling transient failures in AI operations
 * 
 * Provides exponential backoff retry logic to handle:
 * - API rate limits
 * - Temporary network issues
 * - Server overload
 * - Timeout errors
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    'timeout',
    'ETIMEDOUT',
    'ECONNRESET',
    'ECONNREFUSED',
    'rate limit',
    'quota exceeded',
    '429',
    '500',
    '502',
    '503',
    '504',
    'network',
    'fetch failed',
    'could not establish connection',
    'Schema validation failed',
    'must be object',
    'AI failed to generate',
  ],
};

/**
 * Delays execution for specified milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Checks if an error is retryable based on error message
 */
function isRetryableError(error: any, retryableErrors: string[]): boolean {
  if (!error) return false;
  
  const errorMessage = (error.message || error.toString()).toLowerCase();
  
  return retryableErrors.some(retryablePattern => 
    errorMessage.includes(retryablePattern.toLowerCase())
  );
}

/**
 * Executes a function with retry logic and exponential backoff
 * 
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @param context - Optional context for logging (e.g., "Section: Introduction")
 * @returns The result of the function execution
 * @throws The last error if all retries fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
  context?: string
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  let lastError: any;
  let currentDelay = config.initialDelayMs;

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      const result = await fn();
      
      // Success on retry - log it
      if (attempt > 1 && context) {
        console.log(`${context} - Success on attempt ${attempt}`);
      }
      
      return result;
    } catch (error: any) {
      lastError = error;
      
      // If this is the last attempt, throw the error
      if (attempt > config.maxRetries) {
        if (context) {
          console.error(`${context} - All ${config.maxRetries} retries failed. Last error:`, error);
        }
        throw error;
      }
      
      // Check if error is retryable
      if (!isRetryableError(error, config.retryableErrors)) {
        if (context) {
          console.error(`${context} - Non-retryable error encountered:`, error);
        }
        throw error;
      }
      
      // Log retry attempt
      if (context) {
        console.warn(
          `${context} - Attempt ${attempt} failed. Retrying in ${currentDelay}ms... Error: ${error.message || error}`
        );
      }
      
      // Wait before retrying
      await delay(currentDelay);
      
      // Increase delay for next retry with exponential backoff
      currentDelay = Math.min(
        currentDelay * config.backoffMultiplier,
        config.maxDelayMs
      );
    }
  }
  
  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Retry configuration optimized for AI generation tasks
 * Uses longer delays and more retries since AI generation can take time
 */
export const AI_GENERATION_RETRY_CONFIG: RetryOptions = {
  maxRetries: 4,
  initialDelayMs: 2000,
  maxDelayMs: 60000,
  backoffMultiplier: 2.5,
};

/**
 * Retry configuration for quick API calls
 */
export const QUICK_API_RETRY_CONFIG: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 500,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};
