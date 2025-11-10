// set-admin-claim.js
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({
  credential: applicationDefault(),
  projectId: 'vanguard-f8b90', // 🔹 Change to your Firebase project ID
});

const auth = getAuth();
const db = getFirestore();

// 🔹 Replace with the UID of the user you want to make admin
// To find your UID, log in to the app and check the browser console or Firebase Console
const ADMIN_UID = 'QN8COzpUOCXc0TT5Dj4vvvTMoiI3';

(async () => {
  try {
    // Step 1: Set Firebase Auth custom claims (for Firestore security rules)
    await auth.setCustomUserClaims(ADMIN_UID, { admin: true });
    console.log(`✅ Firebase Auth custom claim set for user ${ADMIN_UID}`);
    
    // Step 2: Get the user's email to ensure we have the profile
    const userRecord = await auth.getUser(ADMIN_UID);
    console.log(`📧 User email: ${userRecord.email}`);
    
    // Step 3: Update Firestore user profile with admin role
    const userRef = db.collection('users').doc(ADMIN_UID);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      // Update existing profile
      const currentData = userDoc.data();
      const currentRoles = currentData.roles || [];
      
      // Add 'admin' if not already present
      if (!currentRoles.includes('admin')) {
        const updatedRoles = [...currentRoles, 'admin'];
        await userRef.update({
          roles: updatedRoles
        });
        console.log(`✅ Updated Firestore profile: added 'admin' role. Current roles: ${updatedRoles.join(', ')}`);
      } else {
        console.log(`ℹ️  User already has 'admin' role in Firestore profile. Current roles: ${currentRoles.join(', ')}`);
      }
    } else {
      // Create new profile with admin role
      const newProfile = {
        uid: ADMIN_UID,
        email: userRecord.email || '',
        displayName: userRecord.displayName || 'Admin User',
        roles: ['admin', 'driver'], // Admin should also be a driver
        createdAt: new Date(),
        isActive: true,
      };
      await userRef.set(newProfile);
      console.log(`✅ Created new Firestore profile with admin role`);
    }
    
    console.log(`\n🎉 Success! User ${ADMIN_UID} is now an admin.`);
    console.log(`\n⚠️  IMPORTANT: You may need to sign out and sign back in for the changes to take effect.`);
  } catch (err) {
    console.error('❌ Error setting admin privileges:', err);
    process.exit(1);
  }
})();
