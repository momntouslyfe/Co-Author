import { headers } from 'next/headers';
import * as admin from 'firebase-admin';
import { initializeFirebaseAdmin } from './firebase-admin';

export async function getAuthenticatedUserId(): Promise<string> {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Not authenticated: No authorization token found');
  }

  const idToken = authHeader.split('Bearer ')[1];
  
  try {
    initializeFirebaseAdmin();
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken.uid;
  } catch (error: any) {
    throw new Error(`Not authenticated: ${error.message || 'Invalid token'}`);
  }
}

export async function verifyUserId(providedUserId: string): Promise<void> {
  let authenticatedUserId;
  
  try {
    authenticatedUserId = await getAuthenticatedUserId();
  } catch (error) {
    throw new Error(
      'Authentication required: You must be logged in to use AI features. ' +
      'Please refresh the page and try again.'
    );
  }
  
  if (authenticatedUserId !== providedUserId) {
    throw new Error(
      'Security violation: Provided userId does not match authenticated user. ' +
      'You cannot use another user\'s API keys.'
    );
  }
}
