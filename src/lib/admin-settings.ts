import * as admin from 'firebase-admin';
import { initializeFirebaseAdmin } from './firebase-admin';
import { encrypt, decrypt } from './encryption';
import type { AdminSettings, AdminAPIKey, AIRouting, AIProvider, AIFunction } from './definitions';

export async function getAdminSettings(): Promise<AdminSettings | null> {
  initializeFirebaseAdmin();
  const db = admin.firestore();
  const settingsRef = db.collection('adminSettings').doc('global');
  const doc = await settingsRef.get();
  
  if (!doc.exists) {
    return {
      id: 'global',
      useAdminKeys: false,
      allowUserKeys: true,
      aiRouting: [],
      updatedAt: new Date().toISOString(),
    };
  }
  
  return doc.data() as AdminSettings;
}

export async function updateAdminSettings(settings: Partial<AdminSettings>): Promise<void> {
  initializeFirebaseAdmin();
  const db = admin.firestore();
  const settingsRef = db.collection('adminSettings').doc('global');
  
  await settingsRef.set({
    ...settings,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function getAdminAPIKeys(): Promise<AdminAPIKey[]> {
  initializeFirebaseAdmin();
  const db = admin.firestore();
  const keysSnapshot = await db.collection('adminAPIKeys').get();
  
  return keysSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      provider: data.provider,
      apiKey: decrypt(data.encryptedApiKey),
      model: data.model,
      isActive: data.isActive,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    };
  });
}

export async function getAdminAPIKey(provider: AIProvider): Promise<string | null> {
  initializeFirebaseAdmin();
  const db = admin.firestore();
  
  const keySnapshot = await db.collection('adminAPIKeys')
    .where('provider', '==', provider)
    .where('isActive', '==', true)
    .limit(1)
    .get();
  
  if (keySnapshot.empty) {
    return null;
  }
  
  const data = keySnapshot.docs[0].data();
  return decrypt(data.encryptedApiKey);
}

export async function saveAdminAPIKey(
  provider: AIProvider,
  apiKey: string,
  model?: string
): Promise<void> {
  initializeFirebaseAdmin();
  const db = admin.firestore();
  const encryptedKey = encrypt(apiKey);
  
  const existingKeySnapshot = await db.collection('adminAPIKeys')
    .where('provider', '==', provider)
    .limit(1)
    .get();
  
  if (!existingKeySnapshot.empty) {
    const docRef = existingKeySnapshot.docs[0].ref;
    await docRef.update({
      encryptedApiKey: encryptedKey,
      model: model || null,
      isActive: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    await db.collection('adminAPIKeys').add({
      provider,
      encryptedApiKey: encryptedKey,
      model: model || null,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

export async function deleteAdminAPIKey(keyId: string): Promise<void> {
  initializeFirebaseAdmin();
  const db = admin.firestore();
  await db.collection('adminAPIKeys').doc(keyId).delete();
}

export async function toggleAdminAPIKey(keyId: string, isActive: boolean): Promise<void> {
  initializeFirebaseAdmin();
  const db = admin.firestore();
  await db.collection('adminAPIKeys').doc(keyId).update({
    isActive,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export async function getAIRouting(functionName: AIFunction): Promise<{ provider: AIProvider; model?: string } | null> {
  const settings = await getAdminSettings();
  
  if (!settings || !settings.aiRouting) {
    return null;
  }
  
  const routing = settings.aiRouting.find(r => r.functionName === functionName);
  
  if (!routing) {
    return null;
  }
  
  return {
    provider: routing.provider,
    model: routing.model,
  };
}

export async function updateAIRouting(routing: AIRouting[]): Promise<void> {
  await updateAdminSettings({ aiRouting: routing });
}
