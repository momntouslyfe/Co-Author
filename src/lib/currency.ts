import { getFirebaseAdmin, initializeFirebaseAdmin } from './firebase-admin';
import * as admin from 'firebase-admin';
import type { 
  CurrencySettings, 
  CurrencyConversionRate, 
  CreateCurrencySettingsInput,
  UpdateCurrencySettingsInput,
  UpdateConversionRateInput,
  SupportedCurrency
} from '@/types/subscription';

export async function getAllCurrencies(): Promise<CurrencySettings[]> {
  initializeFirebaseAdmin();
  const db = admin.firestore();
  
  const snapshot = await db.collection('currencies')
    .orderBy('code', 'asc')
    .get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as CurrencySettings[];
}

export async function getEnabledCurrencies(): Promise<CurrencySettings[]> {
  initializeFirebaseAdmin();
  const db = admin.firestore();
  
  const snapshot = await db.collection('currencies')
    .where('isEnabled', '==', true)
    .orderBy('code', 'asc')
    .get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as CurrencySettings[];
}

export async function getDefaultCurrency(): Promise<CurrencySettings | null> {
  initializeFirebaseAdmin();
  const db = admin.firestore();
  
  const snapshot = await db.collection('currencies')
    .where('isDefault', '==', true)
    .where('isEnabled', '==', true)
    .limit(1)
    .get();
  
  if (snapshot.empty) {
    return null;
  }
  
  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data()
  } as CurrencySettings;
}

export async function getCurrencyByCode(code: SupportedCurrency): Promise<CurrencySettings | null> {
  initializeFirebaseAdmin();
  const db = admin.firestore();
  
  const snapshot = await db.collection('currencies')
    .where('code', '==', code)
    .limit(1)
    .get();
  
  if (snapshot.empty) {
    return null;
  }
  
  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data()
  } as CurrencySettings;
}

export async function createCurrency(input: CreateCurrencySettingsInput): Promise<string> {
  initializeFirebaseAdmin();
  const db = admin.firestore();
  
  const existing = await getCurrencyByCode(input.code);
  if (existing) {
    throw new Error(`Currency ${input.code} already exists`);
  }
  
  if (input.isDefault) {
    await clearDefaultCurrency();
  }
  
  const docRef = await db.collection('currencies').add({
    ...input,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  return docRef.id;
}

export async function updateCurrency(
  currencyId: string, 
  input: UpdateCurrencySettingsInput
): Promise<void> {
  initializeFirebaseAdmin();
  const db = admin.firestore();
  
  const docRef = db.collection('currencies').doc(currencyId);
  const doc = await docRef.get();
  
  if (!doc.exists) {
    throw new Error('Currency not found');
  }
  
  if (input.isDefault === true) {
    await clearDefaultCurrency();
  }
  
  await docRef.update({
    ...input,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function clearDefaultCurrency(): Promise<void> {
  initializeFirebaseAdmin();
  const db = admin.firestore();
  
  const snapshot = await db.collection('currencies')
    .where('isDefault', '==', true)
    .get();
  
  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, { 
      isDefault: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });
  
  await batch.commit();
}

export async function getConversionRate(
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return 1.0;
  }
  
  initializeFirebaseAdmin();
  const db = admin.firestore();
  
  const snapshot = await db.collection('currencyConversions')
    .where('fromCurrency', '==', fromCurrency)
    .where('toCurrency', '==', toCurrency)
    .limit(1)
    .get();
  
  if (snapshot.empty) {
    throw new Error(`No conversion rate found for ${fromCurrency} to ${toCurrency}`);
  }
  
  const data = snapshot.docs[0].data();
  return data.rate;
}

export async function getAllConversionRates(): Promise<CurrencyConversionRate[]> {
  initializeFirebaseAdmin();
  const db = admin.firestore();
  
  const snapshot = await db.collection('currencyConversions').get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as CurrencyConversionRate[];
}

export async function setConversionRate(input: UpdateConversionRateInput): Promise<string> {
  initializeFirebaseAdmin();
  const db = admin.firestore();
  
  if (input.fromCurrency === input.toCurrency) {
    throw new Error('Cannot set conversion rate for same currency');
  }
  
  if (input.rate <= 0) {
    throw new Error('Conversion rate must be greater than 0');
  }
  
  const snapshot = await db.collection('currencyConversions')
    .where('fromCurrency', '==', input.fromCurrency)
    .where('toCurrency', '==', input.toCurrency)
    .limit(1)
    .get();
  
  if (!snapshot.empty) {
    const docRef = snapshot.docs[0].ref;
    await docRef.update({
      rate: input.rate,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return docRef.id;
  }
  
  const docRef = await db.collection('currencyConversions').add({
    fromCurrency: input.fromCurrency,
    toCurrency: input.toCurrency,
    rate: input.rate,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  return docRef.id;
}

export async function convertAmount(
  amount: number,
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }
  
  const rate = await getConversionRate(fromCurrency, toCurrency);
  return Math.round(amount * rate * 100) / 100;
}

export function getCurrencySymbol(currency: SupportedCurrency): string {
  const symbols: Record<SupportedCurrency, string> = {
    'USD': '$',
    'BDT': '৳'
  };
  return symbols[currency] || currency;
}

export function formatCurrency(amount: number, currency: SupportedCurrency): string {
  const symbol = getCurrencySymbol(currency);
  const formattedAmount = amount.toFixed(2);
  
  if (currency === 'BDT') {
    return `${symbol}${formattedAmount}`;
  }
  
  return `${symbol}${formattedAmount}`;
}

export async function initializeDefaultCurrencies(): Promise<void> {
  initializeFirebaseAdmin();
  const db = admin.firestore();
  
  const existingCurrencies = await getAllCurrencies();
  
  if (existingCurrencies.length === 0) {
    const batch = db.batch();
    
    const usdRef = db.collection('currencies').doc();
    batch.set(usdRef, {
      code: 'USD',
      symbol: '$',
      name: 'US Dollar',
      isEnabled: true,
      isDefault: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    const bdtRef = db.collection('currencies').doc();
    batch.set(bdtRef, {
      code: 'BDT',
      symbol: '৳',
      name: 'Bangladeshi Taka',
      isEnabled: false,
      isDefault: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    const conversionRef = db.collection('currencyConversions').doc();
    batch.set(conversionRef, {
      fromCurrency: 'USD',
      toCurrency: 'BDT',
      rate: 125.0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    await batch.commit();
  }
}
