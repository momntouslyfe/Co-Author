import * as admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../lib/firebase-admin';

async function migrateCreditTotals() {
  initializeFirebaseAdmin();
  const db = admin.firestore();
  
  console.log('Starting credit totals migration...');
  
  const userSubsSnapshot = await db.collection('userSubscriptions').get();
  let batch = db.batch();
  let count = 0;
  let batchCount = 0;
  
  for (const doc of userSubsSnapshot.docs) {
    const data = doc.data();
    
    const updates: any = {};
    
    if (data.totalBookCreditsFromAddonsThisCycle === undefined) {
      updates.totalBookCreditsFromAddonsThisCycle = data.remainingBookCreditsFromAddons || 0;
    }
    if (data.totalWordCreditsFromAddonsThisCycle === undefined) {
      updates.totalWordCreditsFromAddonsThisCycle = data.remainingWordCreditsFromAddons || 0;
    }
    if (data.totalBookCreditsFromAdminThisCycle === undefined) {
      updates.totalBookCreditsFromAdminThisCycle = data.remainingBookCreditsFromAdmin || 0;
    }
    if (data.totalWordCreditsFromAdminThisCycle === undefined) {
      updates.totalWordCreditsFromAdminThisCycle = data.remainingWordCreditsFromAdmin || 0;
    }
    
    if (Object.keys(updates).length > 0) {
      batch.update(doc.ref, updates);
      count++;
      batchCount++;
      console.log(`Queued update for user ${doc.id}...`);
      
      if (batchCount >= 500) {
        await batch.commit();
        console.log(`Committed batch of ${batchCount} updates (total: ${count})`);
        batch = db.batch();
        batchCount = 0;
      }
    }
  }
  
  if (batchCount > 0) {
    await batch.commit();
    console.log(`Committed final batch of ${batchCount} updates`);
  }
  
  console.log(`Migration complete! Updated ${count} user subscriptions.`);
}

migrateCreditTotals()
  .then(() => {
    console.log('Migration finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
