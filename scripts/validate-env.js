// scripts/validate-env.js
const fs = require('fs');
const path = require('path');

/**
 * Environment Variable Validation Script
 * Validates that all required environment variables are set before deployment
 */

console.log('🔍 Validating environment variables...');

// Required environment variables for production
const requiredVars = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN', 
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
];

// Optional but recommended variables
const optionalVars = [
  'FIREBASE_MEASUREMENT_ID',
  'APP_NAME',
  'APP_VERSION',
  'ENABLE_APP_CHECK',
  'APP_CHECK_SITE_KEY'
];

let missingRequired = [];
let missingOptional = [];

// Check required variables
requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    missingRequired.push(varName);
  } else {
    console.log(`✅ ${varName}: Set`);
  }
});

// Check optional variables
optionalVars.forEach(varName => {
  if (!process.env[varName]) {
    missingOptional.push(varName);
  } else {
    console.log(`✅ ${varName}: Set`);
  }
});

// Report results
if (missingRequired.length > 0) {
  console.error('\n❌ Missing required environment variables:');
  missingRequired.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\nPlease set these variables before deploying to production.');
  process.exit(1);
}

if (missingOptional.length > 0) {
  console.warn('\n⚠️  Missing optional environment variables:');
  missingOptional.forEach(varName => {
    console.warn(`   - ${varName}`);
  });
  console.warn('These are recommended for full production functionality.');
}

// Validate Firebase configuration format
console.log('\n🔍 Validating Firebase configuration...');

try {
  const apiKey = process.env.FIREBASE_API_KEY;
  const authDomain = process.env.FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  
  // Basic format validation
  if (apiKey && !apiKey.startsWith('AIza')) {
    console.warn('⚠️  Firebase API key format may be incorrect (should start with "AIza")');
  }
  
  if (authDomain && !authDomain.includes('.firebaseapp.com')) {
    console.warn('⚠️  Firebase auth domain format may be incorrect (should end with ".firebaseapp.com")');
  }
  
  if (projectId && projectId.includes(' ')) {
    console.error('❌ Firebase project ID cannot contain spaces');
    process.exit(1);
  }
  
  console.log('✅ Firebase configuration format validation passed');
  
} catch (error) {
  console.error('❌ Error validating Firebase configuration:', error.message);
  process.exit(1);
}

// Check for common security issues
console.log('\n🔍 Checking for security issues...');

const sensitivePatterns = [
  /password/i,
  /secret/i,
  /private/i,
  /key.*=.*[a-zA-Z0-9]{20,}/i
];

let securityIssues = [];

// Check if any environment variables contain sensitive patterns
Object.keys(process.env).forEach(key => {
  sensitivePatterns.forEach(pattern => {
    if (pattern.test(key) && process.env[key] && process.env[key].length > 10) {
      securityIssues.push(`Potential sensitive data in ${key}`);
    }
  });
});

if (securityIssues.length > 0) {
  console.warn('⚠️  Potential security issues detected:');
  securityIssues.forEach(issue => {
    console.warn(`   - ${issue}`);
  });
}

console.log('\n✅ Environment validation completed successfully!');
console.log('🚀 Ready for production deployment');
