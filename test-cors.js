// Test script to verify CORS configuration
// This script tests CORS headers and Firebase configuration

const testCORS = async () => {
  console.log('🧪 Testing CORS Configuration...\n');
  
  // Test URLs
  const testUrls = [
    'http://localhost:4200',
    'http://localhost:8100',
    'http://127.0.0.1:4200',
    'http://127.0.0.1:8100'
  ];
  
  // Test Firebase URLs (these will fail locally but should show proper CORS headers)
  const firebaseUrls = [
    'https://vanguard-fleet-inspection.web.app',
    'https://vanguard-fleet-inspection.firebaseapp.com'
  ];
  
  console.log('📋 Testing Local Development URLs:');
  for (const url of testUrls) {
    try {
      const response = await fetch(url, {
        method: 'OPTIONS',
        headers: {
          'Origin': url,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
      });
      
      const corsHeaders = {
        'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
        'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
        'Access-Control-Max-Age': response.headers.get('Access-Control-Max-Age')
      };
      
      console.log(`✅ ${url}:`, corsHeaders);
    } catch (error) {
      console.log(`❌ ${url}:`, error.message);
    }
  }
  
  console.log('\n📋 Testing Firebase URLs (Expected to fail locally):');
  for (const url of firebaseUrls) {
    try {
      const response = await fetch(url, {
        method: 'OPTIONS',
        headers: {
          'Origin': url,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
      });
      
      const corsHeaders = {
        'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
        'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
      };
      
      console.log(`✅ ${url}:`, corsHeaders);
    } catch (error) {
      console.log(`❌ ${url}:`, error.message);
    }
  }
};

// Test Firebase configuration
const testFirebaseConfig = () => {
  console.log('\n🔥 Testing Firebase Configuration...\n');
  
  // Check if Firebase config is loaded
  const configService = window.__ENV__ || {};
  
  const requiredKeys = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN', 
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID'
  ];
  
  console.log('📋 Environment Variables Check:');
  requiredKeys.forEach(key => {
    const value = configService[key];
    if (value) {
      console.log(`✅ ${key}: ${value.substring(0, 10)}...`);
    } else {
      console.log(`❌ ${key}: Not set`);
    }
  });
  
  // Check Firebase app initialization
  if (window.firebase && window.firebase.apps && window.firebase.apps.length > 0) {
    console.log('✅ Firebase app initialized');
  } else {
    console.log('❌ Firebase app not initialized');
  }
};

// Test security headers
const testSecurityHeaders = async () => {
  console.log('\n🛡️ Testing Security Headers...\n');
  
  const testUrl = 'http://localhost:4200';
  
  try {
    const response = await fetch(testUrl);
    
    const securityHeaders = {
      'X-Content-Type-Options': response.headers.get('X-Content-Type-Options'),
      'X-Frame-Options': response.headers.get('X-Frame-Options'),
      'X-XSS-Protection': response.headers.get('X-XSS-Protection'),
      'Referrer-Policy': response.headers.get('Referrer-Policy'),
      'Permissions-Policy': response.headers.get('Permissions-Policy'),
      'Cache-Control': response.headers.get('Cache-Control')
    };
    
    console.log('📋 Security Headers Check:');
    Object.entries(securityHeaders).forEach(([key, value]) => {
      if (value) {
        console.log(`✅ ${key}: ${value}`);
      } else {
        console.log(`❌ ${key}: Not set`);
      }
    });
  } catch (error) {
    console.log(`❌ Security headers test failed:`, error.message);
  }
};

// Run all tests
const runAllTests = async () => {
  console.log('🚀 Starting CORS and Configuration Tests...\n');
  
  await testCORS();
  testFirebaseConfig();
  await testSecurityHeaders();
  
  console.log('\n✨ Test completed!');
  console.log('\n📝 Notes:');
  console.log('- Local CORS tests may fail if dev server is not running');
  console.log('- Firebase URLs will fail locally (expected)');
  console.log('- Security headers are applied by Firebase Hosting in production');
  console.log('- Environment variables are loaded by ConfigService');
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testCORS = runAllTests;
  console.log('🧪 CORS test functions loaded. Run testCORS() in browser console.');
}

// Run tests if in Node.js environment
if (typeof window === 'undefined') {
  runAllTests().catch(console.error);
}
