# Security Guide

## Overview

This comprehensive security guide covers Firebase configuration security, security rules, vulnerability assessment, and production deployment security.

---

## Part 1: Production Deployment Security

### Firebase Configuration Security

This guide explains how to securely deploy the Vanguard application to production without exposing Firebase configuration in your source code.

### Current Security Issues Fixed

✅ **Firebase API keys removed from source code**  
✅ **Environment files updated to not contain sensitive data**  
✅ **ConfigService created to handle secure configuration loading**  
✅ **Gitignore updated to prevent accidental commits of sensitive files**

### Production Deployment Steps

#### 1. Environment Variables Setup

For production deployment, you need to set up environment variables. The exact method depends on your hosting platform:

**Firebase Hosting:**
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

**Vercel:**
```bash
# Set environment variables in Vercel dashboard or CLI
vercel env add FIREBASE_API_KEY
vercel env add FIREBASE_AUTH_DOMAIN
# ... add all required variables
```

**Netlify:**
```bash
# Set environment variables in Netlify dashboard or netlify.toml
[build.environment]
  FIREBASE_API_KEY = "your_api_key"
  FIREBASE_AUTH_DOMAIN = "your_project.firebaseapp.com"
  # ... add all required variables
```

#### 2. Update ConfigService for Production

The ConfigService needs to be updated to read from environment variables in production:

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

#### 3. Build Process Update

Update your build process to inject environment variables:

```bash
# Build with environment variables
ng build --configuration production --env=production
```

#### 4. Firebase App Check (Recommended)

Implement Firebase App Check for additional security:

1. Enable App Check in Firebase Console
2. Add reCAPTCHA site key to environment variables
3. Update ConfigService to include App Check configuration

#### 5. Security Checklist

Before deploying to production:

- [ ] Environment variables are set in your hosting platform
- [ ] No Firebase configuration is hardcoded in source code
- [ ] `.env` files are gitignored
- [ ] Firebase App Check is enabled
- [ ] Firebase Security Rules are properly configured
- [ ] CORS is configured for your production domain
- [ ] HTTPS is enforced
- [ ] Error handling doesn't expose sensitive information

#### 6. Testing

Test your production deployment:

1. Verify Firebase connection works
2. Test authentication flow
3. Verify file uploads work
4. Check that no sensitive data is exposed in browser dev tools
5. Test error handling

### Development Setup

For local development, create a local configuration file:

1. Copy `src/environments/firebase-config.local.example.ts` to `src/environments/firebase-config.local.ts`
2. Update the values with your Firebase configuration
3. This file will be gitignored and not committed

### Security Notes

- **Never commit Firebase configuration to version control**
- **Use environment variables for all sensitive configuration**
- **Enable Firebase App Check for additional security**
- **Regularly rotate API keys if compromised**
- **Monitor Firebase usage for unusual activity**

---

## Part 2: Firebase Security Rules

### Enhanced Security Rules Overview

The Firebase Security Rules have been significantly enhanced with comprehensive validation and stricter access controls.

### Firestore Security Rules Enhancements

#### New Security Features:

1. **Data Validation Functions**
   - `isValidEmail()` - Email format validation
   - `isValidVanType()` - Van type validation (EDV, CDV, Rental)
   - `isValidStatus()` - Inspection status validation
   - `isValidRole()` - User role validation
   - `isValidSeverity()` - Issue severity validation

2. **Enhanced User Collection Security**
   - Required field validation on create
   - Email format validation
   - Display name length limits (1-100 characters)
   - Role validation (minimum driver role required)
   - Admin-only role changes
   - Admin-only user deactivation

3. **Enhanced Van Collection Security**
   - VIN validation (exactly 17 characters)
   - Van type validation
   - Van number validation (1-9999)
   - Required field validation

4. **Enhanced Inspection Collection Security**
   - Required field validation
   - Van type and number validation
   - Report validation with limits
   - Issue count limits (max 50 issues)
   - Field size limits (name: 100 chars, details: 1000 chars)

5. **New Collections**
   - `audit_logs` - Admin-only audit trail
   - `system_settings` - Admin-only system configuration

### Storage Security Rules Enhancements

#### New Security Features:

1. **File Type Validation**
   - Strict image type validation (JPEG, PNG, WebP only)
   - File extension validation
   - Content-Type validation

2. **File Size Limits**
   - 8MB limit for images
   - 1MB limit for audit logs

3. **Path Structure Validation**
   - Van type validation in paths
   - Van number validation (numeric only)
   - File name validation (alphanumeric + underscore/hyphen)

4. **Metadata Validation**
   - Required metadata fields
   - Owner UID validation
   - Upload timestamp validation
   - Side validation for inspection photos

5. **New Storage Paths**
   - `/users/{uid}/profile/` - User profile images
   - `/vans/{vanId}/docs/` - Van documentation (admin only)
   - `/system/` - System assets (admin only)
   - `/temp/{uid}/` - Temporary uploads
   - `/audit/` - Audit logs (admin only)

### Testing the Enhanced Rules

#### Firestore Rules Testing

**Test User Creation:**
```javascript
// Valid user creation
const validUser = {
  uid: 'user123',
  email: 'user@example.com',
  displayName: 'John Doe',
  roles: ['driver'],
  createdAt: new Date(),
  isActive: true
};

// Invalid user creation (should fail)
const invalidUser = {
  uid: 'user123',
  email: 'invalid-email', // Invalid email format
  displayName: '', // Empty display name
  roles: ['invalid-role'], // Invalid role
  createdAt: new Date(),
  isActive: true
};
```

**Test Van Creation:**
```javascript
// Valid van creation (admin only)
const validVan = {
  VIN: '1HGBH41JXMN109186',
  type: 'EDV',
  number: 123,
  isGrounded: false
};

// Invalid van creation (should fail)
const invalidVan = {
  VIN: '123', // Invalid VIN length
  type: 'INVALID', // Invalid van type
  number: -1, // Invalid number
  isGrounded: false
};
```

#### Storage Rules Testing

**Test Image Upload:**
```javascript
// Valid image upload
const validUpload = {
  path: 'inspections/EDV/123/front_1234567890.jpg',
  contentType: 'image/jpeg',
  size: 1024 * 1024, // 1MB
  metadata: {
    ownerUid: 'user123',
    uploadedAt: new Date().toISOString(),
    vanType: 'EDV',
    vanNumber: '123',
    side: 'front'
  }
};

// Invalid image upload (should fail)
const invalidUpload = {
  path: 'inspections/INVALID/123/image.jpg', // Invalid van type
  contentType: 'text/plain', // Invalid content type
  size: 10 * 1024 * 1024, // Too large (10MB)
  metadata: {
    ownerUid: 'user123',
    uploadedAt: new Date().toISOString(),
    vanType: 'INVALID',
    vanNumber: '123',
    side: 'front'
  }
};
```

### Security Testing Checklist

#### Authentication Tests
- [ ] Unauthenticated users cannot access any data
- [ ] Users can only access their own data
- [ ] Admins can access all data
- [ ] Role changes require admin privileges

#### Data Validation Tests
- [ ] Email format validation works
- [ ] Van type validation works
- [ ] File type validation works
- [ ] File size limits enforced
- [ ] Field length limits enforced

#### Path Security Tests
- [ ] Users cannot access other users' data
- [ ] Users cannot upload to unauthorized paths
- [ ] Admin-only paths are protected
- [ ] Temporary uploads are user-specific

#### Metadata Validation Tests
- [ ] Required metadata fields enforced
- [ ] Owner UID validation works
- [ ] Upload timestamp validation works
- [ ] Side validation for photos works

### Common Security Issues Fixed

#### Before (Issues)
1. ❌ No data validation on create/update
2. ❌ No file type restrictions
3. ❌ No metadata validation
4. ❌ No field length limits
5. ❌ No role change restrictions
6. ❌ No audit trail

#### After (Fixed)
1. ✅ Comprehensive data validation
2. ✅ Strict file type restrictions
3. ✅ Required metadata validation
4. ✅ Field length limits enforced
5. ✅ Admin-only role changes
6. ✅ Audit trail collection

### Production Deployment

#### Deploy Rules
```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage

# Deploy both
firebase deploy --only firestore:rules,storage
```

#### Test in Production
1. Test user registration with invalid data
2. Test van creation with invalid data
3. Test image upload with invalid files
4. Test role changes without admin privileges
5. Verify audit logs are created

### Monitoring and Maintenance

#### Rule Performance
- Monitor rule evaluation time
- Check for complex rule patterns
- Optimize frequently used rules

#### Security Monitoring
- Monitor failed rule evaluations
- Check for suspicious access patterns
- Review audit logs regularly

#### Rule Updates
- Test rules in staging environment
- Deploy during low-traffic periods
- Monitor for errors after deployment

### Troubleshooting

#### Common Rule Errors
1. **Permission Denied**: Check authentication and role requirements
2. **Validation Failed**: Check data format and field requirements
3. **Path Not Found**: Check path structure and permissions
4. **Metadata Missing**: Check required metadata fields

#### Debug Rules
```javascript
// Enable debug logging
firebase.firestore().settings({
  debug: true
});

// Check rule evaluation
console.log('Rule evaluation:', request.auth);
```

### Security Best Practices

1. **Principle of Least Privilege**: Users get minimum required access
2. **Data Validation**: Validate all input data
3. **Audit Trail**: Log all administrative actions
4. **Regular Reviews**: Review rules quarterly
5. **Testing**: Test rules thoroughly before deployment
6. **Monitoring**: Monitor rule performance and security

---

## Part 3: Security Vulnerabilities Assessment

### Current Security Status

#### Vulnerabilities Summary
- **Total Vulnerabilities**: 3 low severity
- **Affected Package**: Vite (via Angular build dependencies)
- **Risk Level**: LOW
- **Impact**: Development build process only

### Vulnerability Details

#### GHSA-g4jq-h2w9-997c
- **Package**: vite@6.0.0 - 6.3.5
- **Issue**: Middleware may serve files starting with the same name with the public directory
- **Severity**: Low
- **Impact**: Development server only

#### GHSA-jqfw-vq24-v9c3
- **Package**: vite@6.0.0 - 6.3.5
- **Issue**: `server.fs` settings were not applied to HTML files
- **Severity**: Low
- **Impact**: Development server only

### Risk Assessment

#### Production Impact: NONE
- ✅ Vulnerabilities only affect development build process
- ✅ Production builds are not affected
- ✅ No runtime security issues
- ✅ No data exposure risks

#### Development Impact: MINIMAL
- ⚠️ Potential file serving issues in development
- ⚠️ Development server configuration issues
- ✅ No impact on application functionality
- ✅ No impact on user data

### Mitigation Strategies

#### Strategy 1: Acceptable Risk (Recommended)
Since these are low-severity vulnerabilities affecting only the development environment:

1. **Document the risk** as acceptable
2. **Monitor for updates** to Angular build tools
3. **Use production builds** for deployment
4. **Implement development security** best practices

#### Strategy 2: Force Update (High Risk)
Force update Angular to version 20 (not recommended):

```bash
# This would require updating Angular to v20
npm install @angular/core@^20.0.0 @angular-devkit/build-angular@latest --force
```

**Risks:**
- Breaking changes in Angular 20
- Potential compatibility issues
- Extensive testing required
- May introduce new bugs

### Recommended Actions

#### Immediate Actions
1. ✅ **Document vulnerabilities** as acceptable risk
2. ✅ **Update other dependencies** (completed)
3. ✅ **Implement security monitoring**
4. ✅ **Use production builds** for deployment

#### Ongoing Monitoring
1. **Watch for Angular updates** that fix Vite vulnerabilities
2. **Monitor npm audit** for new vulnerabilities
3. **Review security advisories** regularly
4. **Update dependencies** when safe updates are available

#### Development Security
1. **Use HTTPS** in development
2. **Restrict file access** in development server
3. **Use production builds** for testing
4. **Implement proper CORS** configuration

### Security Best Practices Implemented

#### ✅ Production Security
- Firebase Security Rules hardened
- CORS configuration secured
- Environment variables protected
- Security headers implemented

#### ✅ Development Security
- No hardcoded secrets
- Secure configuration loading
- Proper error handling
- Security monitoring

#### ✅ Dependency Security
- Regular dependency updates
- Security audit monitoring
- Vulnerability tracking
- Risk assessment documentation

### Monitoring Plan

#### Weekly Tasks
- Run `npm audit` to check for new vulnerabilities
- Review security advisories
- Monitor Angular release notes

#### Monthly Tasks
- Update dependencies when safe
- Review security configuration
- Test production builds

#### Quarterly Tasks
- Comprehensive security review
- Dependency audit
- Security policy updates

### Conclusion

The current vulnerabilities are **acceptable** for the following reasons:

1. **Low severity** - Minimal impact
2. **Development only** - No production risk
3. **Well-documented** - Risk is understood
4. **Mitigated** - Security best practices implemented
5. **Monitored** - Ongoing security monitoring

The application is **secure for production use** with proper security measures in place.

### Next Steps

1. **Continue monitoring** for Angular updates
2. **Maintain security practices** implemented
3. **Update dependencies** when safe updates are available
4. **Consider Angular 20 upgrade** in future planning

---

## Related Files
- `firestore.rules` - Firestore security rules
- `storage.rules` - Storage security rules
- `cors.json` - CORS configuration
- `firebase.json` - Security headers
- `src/app/services/config.service.ts` - Secure configuration loading
- `src/app/services/error-handler.service.ts` - Error handling






















