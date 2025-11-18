import { firebaseConfig } from '@/firebase/config';

let adminApp: any = null;
let adminModule: any = null;

function getAdmin() {
  if (!adminModule) {
    adminModule = require('firebase-admin');
  }
  return adminModule;
}

function parseServiceAccount(): any {
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  if (serviceAccountEnv) {
    try {
      let serviceAccountJson = serviceAccountEnv;
      
      if (!serviceAccountJson.trim().startsWith('{')) {
        serviceAccountJson = Buffer.from(serviceAccountJson, 'base64').toString('utf-8');
      }
      
      const serviceAccount = JSON.parse(serviceAccountJson);
      
      if (!serviceAccount.private_key || !serviceAccount.client_email) {
        throw new Error('Service account JSON is missing required fields (private_key, client_email)');
      }
      
      if (serviceAccount.private_key.includes('\\n')) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      
      return serviceAccount;
    } catch (parseError: any) {
      throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT: ${parseError.message}`);
    }
  }
  
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;

  if (!privateKey || !clientEmail) {
    throw new Error(
      'Firebase Admin credentials are not configured. ' +
      'Please set FIREBASE_SERVICE_ACCOUNT (recommended) or FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL in your environment.'
    );
  }

  let formattedPrivateKey = privateKey;
  
  if (formattedPrivateKey.startsWith('"') && formattedPrivateKey.endsWith('"')) {
    formattedPrivateKey = formattedPrivateKey.slice(1, -1);
  }
  if (formattedPrivateKey.startsWith("'") && formattedPrivateKey.endsWith("'")) {
    formattedPrivateKey = formattedPrivateKey.slice(1, -1);
  }
  
  if (formattedPrivateKey.includes('\\n')) {
    formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n');
  }

  return {
    projectId,
    clientEmail,
    privateKey: formattedPrivateKey,
  };
}

export function initializeFirebaseAdmin(): any {
  const admin = getAdmin();
  
  if (admin.apps.length > 0) {
    adminApp = admin.app();
    return adminApp;
  }

  try {
    const serviceAccount = parseServiceAccount();

    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('Firebase Admin initialized successfully');
    return adminApp;
  } catch (error: any) {
    console.error('Failed to initialize Firebase Admin:', error);
    throw new Error(`Firebase Admin initialization failed: ${error.message}`);
  }
}

export function getFirebaseAdmin(): any {
  if (!adminApp) {
    return initializeFirebaseAdmin();
  }
  return adminApp;
}
