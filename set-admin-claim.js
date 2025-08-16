// set-admin-claim.js
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

initializeApp({
  credential: applicationDefault(),
  projectId: 'vanguard-f8b90', // 🔹 Change to your Firebase project ID
});

// 🔹 Replace with the UID of the user you want to make admin
const ADMIN_UID = 'QN8COzpUOCXc0TT5Dj4vvvTMoiI3';

(async () => {
  try {
    await getAuth().setCustomUserClaims(ADMIN_UID, { admin: true });
    console.log(`✅ User ${ADMIN_UID} is now an admin`);
  } catch (err) {
    console.error('Error setting admin claim:', err);
  }
})();
