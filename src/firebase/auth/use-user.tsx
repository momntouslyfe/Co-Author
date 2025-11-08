'use client';
import { useFirebase } from '../provider';
import type { UserHookResult } from '../provider';
import type { Auth } from 'firebase/auth';

/**
 * Hook specifically for accessing the authenticated user's state.
 * This provides the User object, loading status, and any auth errors.
 * @returns {UserHookResult} Object with user, isUserLoading, userError, and isAdmin status.
 */
export const useAuthUser = (): UserHookResult => {
  const { user, isUserLoading, userError, isAdmin } = useFirebase(); // Leverages the main hook
  return { user, isUserLoading, userError, isAdmin };
};

/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};
