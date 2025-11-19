'use server';

import { encrypt, decrypt } from './encryption';
import { initializeFirebaseAdmin } from './firebase-admin';
import * as admin from 'firebase-admin';

export interface UserApiKeyData {
  encryptedApiKey: string;
  preferredModel: string;
  createdAt: any;
  updatedAt: any;
}

export async function saveUserApiKey(
  userId: string,
  apiKey: string,
  preferredModel: string
): Promise<void> {
  initializeFirebaseAdmin();
  const db = admin.firestore();
  const encryptedKey = encrypt(apiKey);
  
  const userKeyRef = db.collection('userApiKeys').doc(userId);
  
  await userKeyRef.set({
    encryptedApiKey: encryptedKey,
    preferredModel: preferredModel,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function getUserApiKey(userId: string): Promise<{ apiKey: string; model: string } | null> {
  initializeFirebaseAdmin();
  const db = admin.firestore();
  const userKeyRef = db.collection('userApiKeys').doc(userId);
  const docSnap = await userKeyRef.get();
  
  if (!docSnap.exists) {
    return null;
  }
  
  const data = docSnap.data() as UserApiKeyData;
  
  try {
    const decryptedKey = decrypt(data.encryptedApiKey);
    
    return {
      apiKey: decryptedKey,
      model: data.preferredModel || 'googleai/gemini-2.5-flash',
    };
  } catch (error: any) {
    console.error('Failed to decrypt API key for user:', userId, error.message);
    
    await userKeyRef.delete();
    
    throw new Error(
      'Your saved API key could not be decrypted. This can happen after encryption key changes. ' +
      'Please go to Settings and re-enter your Google AI API key.'
    );
  }
}

export async function hasUserApiKey(userId: string): Promise<boolean> {
  initializeFirebaseAdmin();
  const db = admin.firestore();
  const userKeyRef = db.collection('userApiKeys').doc(userId);
  const docSnap = await userKeyRef.get();
  
  if (!docSnap.exists) {
    return false;
  }
  
  const data = docSnap.data() as UserApiKeyData;
  
  try {
    decrypt(data.encryptedApiKey);
    return true;
  } catch (error) {
    console.error('Invalid encrypted data found for user:', userId);
    await userKeyRef.delete();
    return false;
  }
}

export async function deleteUserApiKey(userId: string): Promise<void> {
  initializeFirebaseAdmin();
  const db = admin.firestore();
  const userKeyRef = db.collection('userApiKeys').doc(userId);
  await userKeyRef.delete();
}

export async function getUserPreferredModel(userId: string): Promise<string | null> {
  initializeFirebaseAdmin();
  const db = admin.firestore();
  const userKeyRef = db.collection('userApiKeys').doc(userId);
  const docSnap = await userKeyRef.get();
  
  if (!docSnap.exists) {
    return null;
  }
  
  const data = docSnap.data() as UserApiKeyData;
  return data.preferredModel || 'googleai/gemini-2.5-flash';
}
