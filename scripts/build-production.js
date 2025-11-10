// scripts/build-production.js
const fs = require('fs');
const path = require('path');

/**
 * Production Build Script
 * This script builds the Angular application for production and injects environment variables
 */

console.log('🚀 Starting production build...');

// Read environment variables
const envVars = {
  FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
  FIREBASE_MEASUREMENT_ID: process.env.FIREBASE_MEASUREMENT_ID,
  APP_NAME: process.env.APP_NAME || 'Vanguard Fleet Inspection',
  APP_VERSION: process.env.APP_VERSION || '1.0.0'
};

// Validate required environment variables
const requiredVars = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
];

console.log('📋 Checking environment variables...');
let missingVars = [];
requiredVars.forEach(varName => {
  if (!envVars[varName]) {
    missingVars.push(varName);
  } else {
    console.log(`✅ ${varName}: ${envVars[varName].substring(0, 10)}...`);
  }
});

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\nPlease set these environment variables before building for production.');
  process.exit(1);
}

// Build the application
console.log('\n🔨 Building Angular application...');
const { execSync } = require('child_process');

try {
  execSync('npx ng build --configuration production', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
  console.log('✅ Angular build completed successfully');
} catch (error) {
  console.error('❌ Angular build failed:', error.message);
  process.exit(1);
}

// Inject environment variables into the built application
console.log('\n💉 Injecting environment variables...');
const indexPath = path.join(__dirname, '../www/index.html');

if (!fs.existsSync(indexPath)) {
  console.error('❌ Built index.html not found. Build may have failed.');
  process.exit(1);
}

try {
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // Create environment script
  const envScript = `
<script>
  // Production environment variables
  window.__ENV__ = ${JSON.stringify(envVars)};
  
  // Additional production configuration
  window.__PRODUCTION_CONFIG__ = {
    production: true,
    appName: '${envVars.APP_NAME}',
    version: '${envVars.APP_VERSION}',
    buildTime: '${new Date().toISOString()}',
    environment: 'production'
  };
</script>`;

  // Inject before closing head tag
  indexContent = indexContent.replace('</head>', `${envScript}\n</head>`);
  
  // Write back to file
  fs.writeFileSync(indexPath, indexContent);
  
  console.log('✅ Environment variables injected successfully');
} catch (error) {
  console.error('❌ Failed to inject environment variables:', error.message);
  process.exit(1);
}

// Create production build info (separate from PWA manifest)
console.log('\n📄 Creating production build info...');
const buildInfo = {
  buildTime: new Date().toISOString(),
  version: envVars.APP_VERSION,
  environment: 'production',
  firebase: {
    projectId: envVars.FIREBASE_PROJECT_ID,
    authDomain: envVars.FIREBASE_AUTH_DOMAIN
  },
  buildInfo: {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch
  }
};

const buildInfoPath = path.join(__dirname, '../www/build-info.json');
fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));
console.log('✅ Production build info created');

// Validate the build
console.log('\n🔍 Validating production build...');
const wwwPath = path.join(__dirname, '../www');

if (!fs.existsSync(wwwPath)) {
  console.error('❌ Build output directory not found');
  process.exit(1);
}

const requiredFiles = ['index.html'];
const optionalFiles = ['main-*.js', 'styles-*.css'];

// Check required files
requiredFiles.forEach(file => {
  const filePath = path.join(wwwPath, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Required file not found: ${file}`);
    process.exit(1);
  }
});

// Check optional files exist (with glob patterns)
const glob = require('glob');
optionalFiles.forEach(pattern => {
  const files = glob.sync(pattern, { cwd: wwwPath });
  if (files.length === 0) {
    console.error(`❌ No files found matching pattern: ${pattern}`);
    process.exit(1);
  }
});

console.log('✅ Production build validation completed');

// Final summary
console.log('\n🎉 Production build completed successfully!');
console.log('📁 Build output: ./www/');
console.log('🌐 Ready for deployment to Firebase Hosting');
console.log('\n📋 Next steps:');
console.log('1. Test the build locally: npx http-server www');
console.log('2. Deploy to Firebase: firebase deploy --only hosting');
console.log('3. Verify environment variables are loaded correctly');
console.log('4. Test all functionality in production environment');
