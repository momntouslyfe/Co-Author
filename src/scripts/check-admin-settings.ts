import * as admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../lib/firebase-admin';

async function checkSettings() {
  initializeFirebaseAdmin();
  const db = admin.firestore();
  
  console.log('Checking admin settings...');
  const settingsDoc = await db.collection('adminSettings').doc('global').get();
  console.log('Settings exists:', settingsDoc.exists);
  if (settingsDoc.exists) {
    console.log('Settings data:', JSON.stringify(settingsDoc.data(), null, 2));
  }
  
  console.log('\nChecking admin API keys...');
  const keysSnapshot = await db.collection('adminAPIKeys').get();
  console.log('Number of API keys:', keysSnapshot.size);
  keysSnapshot.docs.forEach(doc => {
    const data = doc.data();
    console.log(`- Provider: ${data.provider}, Active: ${data.isActive}, Has Key: ${!!data.encryptedApiKey}`);
  });
}

checkSettings()
  .then(() => {
    console.log('\nCheck complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
