# Production Deployment Guide

## Overview

This guide covers the complete process of deploying the Vanguard Fleet Inspection application to production with proper environment configuration and security.

## Pre-Deployment Checklist

### ✅ **Environment Variables Setup**

Before deploying, ensure you have the following environment variables configured:

```bash
# Required Firebase Configuration
FIREBASE_API_KEY=your_api_key_here
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_MEASUREMENT_ID=your_measurement_id

# Optional App Configuration
APP_NAME=Vanguard Fleet Inspection
APP_VERSION=1.0.0
```

### ✅ **Security Configuration**

1. **Firebase Security Rules** - Deploy enhanced rules
2. **CORS Configuration** - Update for production domains
3. **Environment Variables** - No hardcoded secrets
4. **App Identity** - Proper app ID and name

## Deployment Methods

### **Method 1: Automated Production Build**

Use the custom production build script that handles environment variable injection:

```bash
# Set environment variables
export FIREBASE_API_KEY="your_api_key"
export FIREBASE_AUTH_DOMAIN="your_project.firebaseapp.com"
export FIREBASE_PROJECT_ID="your_project_id"
export FIREBASE_STORAGE_BUCKET="your_project.firebasestorage.app"
export FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
export FIREBASE_APP_ID="your_app_id"
export FIREBASE_MEASUREMENT_ID="your_measurement_id"

# Build for production
npm run build:prod

# Deploy to Firebase
npm run deploy
```

### **Method 2: Manual Build Process**

If you prefer manual control:

```bash
# Build Angular application
npx ng build --configuration production

# Manually inject environment variables into www/index.html
# Add the following script before </head>:
# <script>window.__ENV__ = {FIREBASE_API_KEY: "your_key", ...};</script>

# Deploy to Firebase
firebase deploy --only hosting
```

### **Method 3: CI/CD Pipeline**

For automated deployments, use this in your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build for production
        run: npm run build:prod
        env:
          FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
          FIREBASE_AUTH_DOMAIN: ${{ secrets.FIREBASE_AUTH_DOMAIN }}
          FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
          FIREBASE_STORAGE_BUCKET: ${{ secrets.FIREBASE_STORAGE_BUCKET }}
          FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.FIREBASE_MESSAGING_SENDER_ID }}
          FIREBASE_APP_ID: ${{ secrets.FIREBASE_APP_ID }}
          FIREBASE_MEASUREMENT_ID: ${{ secrets.FIREBASE_MEASUREMENT_ID }}
          
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: your-project-id
```

## Platform-Specific Deployment

### **Firebase Hosting**

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project (if not already done)
firebase init hosting

# Deploy
firebase deploy --only hosting
```

### **Vercel**

```bash
# Install Vercel CLI
npm install -g vercel

# Set environment variables
vercel env add FIREBASE_API_KEY
vercel env add FIREBASE_AUTH_DOMAIN
# ... add all required variables

# Deploy
vercel --prod
```

### **Netlify**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Set environment variables in Netlify dashboard or netlify.toml
[build.environment]
  FIREBASE_API_KEY = "your_api_key"
  FIREBASE_AUTH_DOMAIN = "your_project.firebaseapp.com"
  # ... add all required variables

# Deploy
netlify deploy --prod
```

## Post-Deployment Testing

### **1. Environment Variables Test**

```javascript
// Test in browser console
console.log('Environment variables:', window.__ENV__);
console.log('Production config:', window.__PRODUCTION_CONFIG__);
```

### **2. Firebase Connection Test**

```javascript
// Test Firebase initialization
import { getApps } from 'firebase/app';
console.log('Firebase apps:', getApps());
```

### **3. Authentication Test**

```javascript
// Test authentication
import { getAuth } from 'firebase/auth';
const auth = getAuth();
console.log('Auth instance:', auth);
```

### **4. CORS Test**

```bash
# Test CORS with curl
curl -H "Origin: https://your-domain.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://your-firebase-project.web.app/
```

### **5. Security Headers Test**

```bash
# Test security headers
curl -I https://your-firebase-project.web.app/
```

## Monitoring and Maintenance

### **Performance Monitoring**

1. **Firebase Performance Monitoring**
   - Enable in Firebase Console
   - Monitor app performance metrics
   - Track user experience

2. **Error Monitoring**
   - Firebase Crashlytics
   - Monitor JavaScript errors
   - Track user crashes

### **Security Monitoring**

1. **Firebase Security Rules**
   - Monitor rule evaluation metrics
   - Check for denied requests
   - Review audit logs

2. **Authentication Monitoring**
   - Monitor login attempts
   - Track failed authentications
   - Review user activity

### **Regular Maintenance**

1. **Weekly Tasks**
   - Review error logs
   - Check performance metrics
   - Monitor security alerts

2. **Monthly Tasks**
   - Review Firebase usage
   - Update dependencies
   - Security audit

3. **Quarterly Tasks**
   - Review security rules
   - Update environment variables
   - Performance optimization

## Troubleshooting

### **Common Issues**

1. **Environment Variables Not Loading**
   ```bash
   # Check if variables are set
   echo $FIREBASE_API_KEY
   
   # Verify build script execution
   npm run build:prod
   ```

2. **Firebase Connection Failed**
   ```javascript
   // Check Firebase configuration
   console.log('Firebase config:', window.__ENV__);
   
   // Verify project ID
   console.log('Project ID:', window.__ENV__.FIREBASE_PROJECT_ID);
   ```

3. **CORS Errors**
   ```bash
   # Check CORS configuration
   cat cors.json
   
   # Verify domain is in allowed origins
   ```

4. **Security Rules Denied**
   ```bash
   # Check Firestore rules
   firebase firestore:rules:get
   
   # Check Storage rules
   firebase storage:rules:get
   ```

### **Debug Mode**

Enable debug mode for troubleshooting:

```javascript
// In browser console
localStorage.setItem('debug', 'true');
location.reload();
```

## Rollback Procedure

If deployment fails or issues are discovered:

1. **Immediate Rollback**
   ```bash
   # Deploy previous version
   firebase deploy --only hosting --project your-project-id
   ```

2. **Environment Variable Rollback**
   ```bash
   # Revert to previous environment variables
   export FIREBASE_API_KEY="previous_key"
   npm run build:prod
   firebase deploy --only hosting
   ```

3. **Security Rules Rollback**
   ```bash
   # Revert security rules
   git checkout HEAD~1 firestore.rules storage.rules
   firebase deploy --only firestore:rules,storage
   ```

## Security Checklist

- [ ] Environment variables are not hardcoded
- [ ] Firebase Security Rules are deployed
- [ ] CORS is configured for production domains
- [ ] Security headers are applied
- [ ] HTTPS is enforced
- [ ] Authentication is working
- [ ] File uploads are restricted
- [ ] Audit logging is enabled

## Performance Checklist

- [ ] Bundle size is optimized
- [ ] Images are compressed
- [ ] Caching is configured
- [ ] CDN is enabled
- [ ] Lazy loading is implemented
- [ ] Service worker is configured

## Success Criteria

✅ **Deployment is successful when:**
1. Application loads without errors
2. Authentication works correctly
3. File uploads function properly
4. All API calls succeed
5. Security headers are present
6. Performance metrics are acceptable
7. No console errors
8. All features work as expected
