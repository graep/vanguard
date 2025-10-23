// Development Environment Configuration
// WARNING: This file should NOT contain sensitive information in production
// For production, use environment variables or a secure config service

export const environment = {
  production: false,
  // Firebase configuration will be loaded dynamically from ConfigService
  // to avoid exposing sensitive information in source code
  firebase: null, // Will be loaded from ConfigService
  appName: 'Vanguard Fleet',
  version: '1.0.0'
};
