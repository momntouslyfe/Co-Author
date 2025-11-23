import * as admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../lib/firebase-admin';
import { getUserCreditSummary } from '../lib/credits';
import { getAdminSettings, getAdminAPIKey, getAIRouting } from '../lib/admin-settings';

async function verifySystem() {
  initializeFirebaseAdmin();
  const db = admin.firestore();
  
  console.log('=== AI System Verification ===\n');
  
  // 1. Check admin settings
  console.log('1. Checking admin settings...');
  const settings = await getAdminSettings();
  if (!settings) {
    console.log('   ❌ No admin settings found');
    return;
  }
  console.log(`   ✓ Use admin keys: ${settings.useAdminKeys}`);
  console.log(`   ✓ Allow user keys: ${settings.allowUserKeys}`);
  console.log(`   ✓ AI routing configured: ${settings.aiRouting?.length || 0} functions`);
  
  // 2. Check API keys
  console.log('\n2. Checking API keys...');
  const geminiKey = await getAdminAPIKey('gemini');
  if (!geminiKey) {
    console.log('   ❌ No Gemini API key found');
    return;
  }
  console.log(`   ✓ Gemini API key exists (length: ${geminiKey.length})`);
  
  // 3. Check AI routing for a sample function
  console.log('\n3. Checking AI routing...');
  const researchRouting = await getAIRouting('research');
  if (!researchRouting) {
    console.log('   ⚠ No routing found for "research" function');
  } else {
    console.log(`   ✓ Research function routed to: ${researchRouting.provider}/${researchRouting.model || 'default'}`);
  }
  
  // 4. Check user credits (get first user)
  console.log('\n4. Checking user credit system...');
  const usersSnapshot = await db.collection('users').limit(1).get();
  if (usersSnapshot.empty) {
    console.log('   ⚠ No users found in database');
  } else {
    const userId = usersSnapshot.docs[0].id;
    const userData = usersSnapshot.docs[0].data();
    console.log(`   Testing with user: ${userData.email || userId}`);
    
    const creditSummary = await getUserCreditSummary(userId);
    console.log(`   ✓ Word credits available: ${creditSummary.wordCreditsAvailable}`);
    console.log(`   ✓ Book credits available: ${creditSummary.bookCreditsAvailable}`);
  }
  
  console.log('\n=== Verification Complete ===');
  console.log('✓ All systems operational - AI functions should work correctly');
}

verifySystem()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  });
