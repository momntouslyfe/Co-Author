'use client';

import { User } from 'firebase/auth';

/**
 * Client-side utility to get the current user's Firebase ID token.
 * This token is required for all AI operations to verify server-side authentication.
 * 
 * @param user - The authenticated Firebase user from useAuthUser()
 * @returns The user's current ID token
 * @throws Error if user is not authenticated or token cannot be retrieved
 */
export async function getIdToken(user: User | null): Promise<string> {
  if (!user) {
    throw new Error('User is not authenticated. Please log in to use AI features.');
  }

  try {
    const idToken = await user.getIdToken();
    return idToken;
  } catch (error: any) {
    throw new Error(`Failed to get authentication token: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Safely get ID token with error handling.
 * Returns null instead of throwing if token cannot be retrieved.
 * Useful for non-critical paths.
 */
export async function tryGetIdToken(user: User | null): Promise<string | null> {
  try {
    return await getIdToken(user);
  } catch {
    return null;
  }
}
