# Firebase Security Rules Testing Guide

## Enhanced Security Rules Overview

The Firebase Security Rules have been significantly enhanced with comprehensive validation and stricter access controls.

## Firestore Security Rules Enhancements

### **New Security Features:**

1. **Data Validation Functions**
   - `isValidEmail()` - Email format validation
   - `isValidVanType()` - Van type validation (EDV, CDV, LMR)
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

## Storage Security Rules Enhancements

### **New Security Features:**

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

## Testing the Enhanced Rules

### **1. Firestore Rules Testing**

#### **Test User Creation**
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

#### **Test Van Creation**
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

#### **Test Inspection Creation**
```javascript
// Valid inspection creation
const validInspection = {
  vanType: 'EDV',
  vanNumber: '123',
  photos: { front: 'url1', back: 'url2' },
  createdAt: new Date(),
  status: 'pending',
  seen: false,
  createdBy: 'user123'
};

// Invalid inspection creation (should fail)
const invalidInspection = {
  vanType: 'INVALID', // Invalid van type
  vanNumber: '', // Empty van number
  photos: {}, // Empty photos
  createdAt: new Date(),
  status: 'invalid', // Invalid status
  seen: false,
  createdBy: 'user123'
};
```

### **2. Storage Rules Testing**

#### **Test Image Upload**
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

## Security Testing Checklist

### **Authentication Tests**
- [ ] Unauthenticated users cannot access any data
- [ ] Users can only access their own data
- [ ] Admins can access all data
- [ ] Role changes require admin privileges

### **Data Validation Tests**
- [ ] Email format validation works
- [ ] Van type validation works
- [ ] File type validation works
- [ ] File size limits enforced
- [ ] Field length limits enforced

### **Path Security Tests**
- [ ] Users cannot access other users' data
- [ ] Users cannot upload to unauthorized paths
- [ ] Admin-only paths are protected
- [ ] Temporary uploads are user-specific

### **Metadata Validation Tests**
- [ ] Required metadata fields enforced
- [ ] Owner UID validation works
- [ ] Upload timestamp validation works
- [ ] Side validation for photos works

## Common Security Issues Fixed

### **Before (Issues)**
1. ❌ No data validation on create/update
2. ❌ No file type restrictions
3. ❌ No metadata validation
4. ❌ No field length limits
5. ❌ No role change restrictions
6. ❌ No audit trail

### **After (Fixed)**
1. ✅ Comprehensive data validation
2. ✅ Strict file type restrictions
3. ✅ Required metadata validation
4. ✅ Field length limits enforced
5. ✅ Admin-only role changes
6. ✅ Audit trail collection

## Production Deployment

### **Deploy Rules**
```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage

# Deploy both
firebase deploy --only firestore:rules,storage
```

### **Test in Production**
1. Test user registration with invalid data
2. Test van creation with invalid data
3. Test image upload with invalid files
4. Test role changes without admin privileges
5. Verify audit logs are created

## Monitoring and Maintenance

### **Rule Performance**
- Monitor rule evaluation time
- Check for complex rule patterns
- Optimize frequently used rules

### **Security Monitoring**
- Monitor failed rule evaluations
- Check for suspicious access patterns
- Review audit logs regularly

### **Rule Updates**
- Test rules in staging environment
- Deploy during low-traffic periods
- Monitor for errors after deployment

## Troubleshooting

### **Common Rule Errors**
1. **Permission Denied**: Check authentication and role requirements
2. **Validation Failed**: Check data format and field requirements
3. **Path Not Found**: Check path structure and permissions
4. **Metadata Missing**: Check required metadata fields

### **Debug Rules**
```javascript
// Enable debug logging
firebase.firestore().settings({
  debug: true
});

// Check rule evaluation
console.log('Rule evaluation:', request.auth);
```

## Security Best Practices

1. **Principle of Least Privilege**: Users get minimum required access
2. **Data Validation**: Validate all input data
3. **Audit Trail**: Log all administrative actions
4. **Regular Reviews**: Review rules quarterly
5. **Testing**: Test rules thoroughly before deployment
6. **Monitoring**: Monitor rule performance and security
