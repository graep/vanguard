# Production Deployment Security Guide

## Firebase Configuration Security

This guide explains how to securely deploy the Vanguard application to production without exposing Firebase configuration in your source code.

## Current Security Issues Fixed

✅ **Firebase API keys removed from source code**
✅ **Environment files updated to not contain sensitive data**
✅ **ConfigService created to handle secure configuration loading**
✅ **Gitignore updated to prevent accidental commits of sensitive files**

## Production Deployment Steps

### 1. Environment Variables Setup

For production deployment, you need to set up environment variables. The exact method depends on your hosting platform:

#### Firebase Hosting
```bash
# Set environment variables in Firebase Hosting
firebase functions:config:set firebase.api_key="your_api_key"
firebase functions:config:set firebase.auth_domain="your_project.firebaseapp.com"
firebase functions:config:set firebase.project_id="your_project_id"
firebase functions:config:set firebase.storage_bucket="your_project.firebasestorage.app"
firebase functions:config:set firebase.messaging_sender_id="your_sender_id"
firebase functions:config:set firebase.app_id="your_app_id"
firebase functions:config:set firebase.measurement_id="your_measurement_id"
```

#### Vercel
```bash
# Set environment variables in Vercel dashboard or CLI
vercel env add FIREBASE_API_KEY
vercel env add FIREBASE_AUTH_DOMAIN
vercel env add FIREBASE_PROJECT_ID
vercel env add FIREBASE_STORAGE_BUCKET
vercel env add FIREBASE_MESSAGING_SENDER_ID
vercel env add FIREBASE_APP_ID
vercel env add FIREBASE_MEASUREMENT_ID
```

#### Netlify
```bash
# Set environment variables in Netlify dashboard or netlify.toml
[build.environment]
  FIREBASE_API_KEY = "your_api_key"
  FIREBASE_AUTH_DOMAIN = "your_project.firebaseapp.com"
  FIREBASE_PROJECT_ID = "your_project_id"
  FIREBASE_STORAGE_BUCKET = "your_project.firebasestorage.app"
  FIREBASE_MESSAGING_SENDER_ID = "your_sender_id"
  FIREBASE_APP_ID = "your_app_id"
  FIREBASE_MEASUREMENT_ID = "your_measurement_id"
```

### 2. Update ConfigService for Production

The ConfigService needs to be updated to read from environment variables in production. Update the `getEnvVar` method:

```typescript
private getEnvVar(key: string): string {
  // For production builds, environment variables are injected at build time
  const value = (window as any).__ENV__?.[key] || process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
}
```

### 3. Build Process Update

Update your build process to inject environment variables:

#### Angular Build with Environment Variables
```bash
# Build with environment variables
ng build --configuration production --env=production
```

#### Custom Build Script
Create a build script that injects environment variables:

```javascript
// scripts/build-with-env.js
const fs = require('fs');
const path = require('path');

// Read environment variables
const envVars = {
  FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
  FIREBASE_MEASUREMENT_ID: process.env.FIREBASE_MEASUREMENT_ID,
};

// Inject into the built application
const indexPath = path.join(__dirname, '../www/index.html');
let indexContent = fs.readFileSync(indexPath, 'utf8');

const envScript = `
<script>
  window.__ENV__ = ${JSON.stringify(envVars)};
</script>
`;

indexContent = indexContent.replace('<head>', `<head>${envScript}`);
fs.writeFileSync(indexPath, indexContent);
```

### 4. Firebase App Check (Recommended)

Implement Firebase App Check for additional security:

1. Enable App Check in Firebase Console
2. Add reCAPTCHA site key to environment variables
3. Update ConfigService to include App Check configuration

### 5. Security Checklist

Before deploying to production:

- [ ] Environment variables are set in your hosting platform
- [ ] No Firebase configuration is hardcoded in source code
- [ ] `.env` files are gitignored
- [ ] Firebase App Check is enabled
- [ ] Firebase Security Rules are properly configured
- [ ] CORS is configured for your production domain
- [ ] HTTPS is enforced
- [ ] Error handling doesn't expose sensitive information

### 6. Testing

Test your production deployment:

1. Verify Firebase connection works
2. Test authentication flow
3. Verify file uploads work
4. Check that no sensitive data is exposed in browser dev tools
5. Test error handling

## Development Setup

For local development, create a local configuration file:

1. Copy `src/environments/firebase-config.local.example.ts` to `src/environments/firebase-config.local.ts`
2. Update the values with your Firebase configuration
3. This file will be gitignored and not committed

## Security Notes

- **Never commit Firebase configuration to version control**
- **Use environment variables for all sensitive configuration**
- **Enable Firebase App Check for additional security**
- **Regularly rotate API keys if compromised**
- **Monitor Firebase usage for unusual activity**

## Support

If you encounter issues with the secure configuration setup, check:

1. Environment variables are properly set
2. Build process is injecting variables correctly
3. ConfigService is reading from the right source
4. Firebase project permissions are correct
