// reset-daily-plans.js
const admin = require('firebase-admin');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin
initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'vanguard-f8b90',
});

const db = getFirestore();

async function resetPlans() {
  try {
    console.log('Deleting all daily plans...');
    
    const plansSnapshot = await db.collection('dailyPlans').get();
    
    for (const doc of plansSnapshot.docs) {
      await doc.ref.delete();
      console.log(`✅ Deleted plan: ${doc.id}`);
    }
    
    console.log('\n✅ All daily plans deleted. The app will recreate them with EDV first when you load the planning page.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

resetPlans();

