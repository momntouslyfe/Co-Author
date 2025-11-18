import { firebaseConfig } from '@/firebase/config';

let adminApp: any = null;
let adminModule: any = null;

function getAdmin() {
  if (!adminModule) {
    adminModule = require('firebase-admin');
  }
  return adminModule;
}

export function initializeFirebaseAdmin(): any {
  const admin = getAdmin();
  
  if (admin.apps.length > 0) {
    adminApp = admin.app();
    return adminApp;
  }

  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;

    if (!privateKey || !clientEmail) {
      throw new Error(
        'Firebase Admin credentials are not configured. ' +
        'Please ensure FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL are set in your environment.'
      );
    }

    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

    adminApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: formattedPrivateKey,
      }),
    });

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
