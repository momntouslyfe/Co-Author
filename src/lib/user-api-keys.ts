'use server';

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { encrypt, decrypt } from './encryption';
import { getSdks } from '@/firebase';

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
  const { firestore } = getSdks(require('@/firebase').getApp());
  const encryptedKey = encrypt(apiKey);
  
  const userKeyRef = doc(firestore, 'userApiKeys', userId);
  
  await setDoc(userKeyRef, {
    encryptedApiKey: encryptedKey,
    preferredModel: preferredModel,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  }, { merge: true });
}

export async function getUserApiKey(userId: string): Promise<{ apiKey: string; model: string } | null> {
  const { firestore } = getSdks(require('@/firebase').getApp());
  const userKeyRef = doc(firestore, 'userApiKeys', userId);
  const docSnap = await getDoc(userKeyRef);
  
  if (!docSnap.exists()) {
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
  const { firestore } = getSdks(require('@/firebase').getApp());
  const userKeyRef = doc(firestore, 'userApiKeys', userId);
  const docSnap = await getDoc(userKeyRef);
  
  return docSnap.exists();
}

export async function getUserPreferredModel(userId: string): Promise<string | null> {
  const { firestore } = getSdks(require('@/firebase').getApp());
  const userKeyRef = doc(firestore, 'userApiKeys', userId);
  const docSnap = await getDoc(userKeyRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  const data = docSnap.data() as UserApiKeyData;
  return data.preferredModel || 'googleai/gemini-2.5-flash';
}
