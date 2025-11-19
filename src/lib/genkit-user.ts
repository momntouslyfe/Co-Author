'use server';

/**
 * SECURITY: This module provides per-user Genkit instances using user-provided API keys.
 * 
 * Server-side authentication verification is MANDATORY via Firebase ID tokens.
 * All callers must fetch and pass the user's ID token for verification.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { getUserApiKey } from './user-api-keys';
import * as admin from 'firebase-admin';
import { initializeFirebaseAdmin } from './firebase-admin';

async function verifyUserIdWithToken(userId: string, idToken: string): Promise<void> {
  if (!idToken || idToken.trim() === '') {
    throw new Error(
      'Authentication required: ID token is required for all AI operations. ' +
      'Please refresh the page and try again.'
    );
  }

  try {
    initializeFirebaseAdmin();
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    if (decodedToken.uid !== userId) {
      throw new Error(
        'Security violation: Provided userId does not match authenticated user. ' +
        'You cannot use another user\'s API keys.'
      );
    }
  } catch (error: any) {
    if (error.message.includes('Security violation') || error.message.includes('Authentication required')) {
      throw error;
    }
    throw new Error(`Authentication failed: ${error.message || 'Invalid or expired token'}`);
  }
}

export async function getUserGenkitInstance(userId: string, idToken: string) {
  await verifyUserIdWithToken(userId, idToken);
  
  let userKeyData;
  
  try {
    userKeyData = await getUserApiKey(userId);
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error';
    
    if (errorMessage.includes('could not be decrypted')) {
      throw new Error(
        'Your saved API key is no longer valid. This can happen after system updates. ' +
        'Please go to Settings and re-enter your Google AI API key to continue using AI features.'
      );
    }
    
    throw new Error(`Failed to retrieve API key: ${errorMessage}`);
  }
  
  if (!userKeyData) {
    throw new Error('API key not configured. Please add your Google AI API key in Settings to use AI features.');
  }

  const googleAIPlugin = googleAI({
    apiKey: userKeyData.apiKey,
  });

  const userAi = genkit({
    plugins: [googleAIPlugin],
    model: userKeyData.model,
  });

  return { ai: userAi, model: userKeyData.model };
}
