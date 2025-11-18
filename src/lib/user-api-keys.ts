'use server';

import { encrypt, decrypt } from './encryption';

function initializeFirebaseAdmin() {
  const admin = require('firebase-admin');
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }
  return admin.initializeApp();
}

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
  const admin = require('firebase-admin');
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
  const admin = require('firebase-admin');
  initializeFirebaseAdmin();
  const db = admin.firestore();
  const userKeyRef = db.collection('userApiKeys').doc(userId);
  const docSnap = await userKeyRef.get();
  
  if (!docSnap.exists) {
    return null;
  }
  
  const data = docSnap.data() as UserApiKeyData;
  const decryptedKey = decrypt(data.encryptedApiKey);
  
  return {
    apiKey: decryptedKey,
    model: data.preferredModel || 'googleai/gemini-2.5-flash',
  };
}

export async function hasUserApiKey(userId: string): Promise<boolean> {
  const admin = require('firebase-admin');
  initializeFirebaseAdmin();
  const db = admin.firestore();
  const userKeyRef = db.collection('userApiKeys').doc(userId);
  const docSnap = await userKeyRef.get();
  
  return docSnap.exists;
}

export async function getUserPreferredModel(userId: string): Promise<string | null> {
  const admin = require('firebase-admin');
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
