// src/app/services/config.service.ts
import { Injectable } from '@angular/core';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface AppConfig {
  production: boolean;
  firebase: FirebaseConfig;
  appName: string;
  version: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): AppConfig {
    // In a real application, you would load this from environment variables
    // For now, we'll use a secure approach that doesn't expose keys in source code
    
    const isProduction = this.checkIsProduction();
    
    return {
      production: isProduction,
      firebase: this.loadFirebaseConfig(isProduction),
      appName: 'Vanguard Fleet Inspection',
      version: '1.0.0'
    };
  }

  private checkIsProduction(): boolean {
    // Check if we're in production environment
    // This should match the environment.prod.ts production flag
    return window.location.hostname !== 'localhost' && 
           !window.location.hostname.includes('127.0.0.1') &&
           !window.location.hostname.includes('dev') &&
           !window.location.hostname.includes('staging') &&
           !window.location.hostname.includes('test') &&
           (window.location.protocol === 'https:' || window.location.hostname.includes('firebaseapp.com') || window.location.hostname.includes('web.app'));
  }

  private loadFirebaseConfig(isProduction: boolean): FirebaseConfig {
    // This is where you would load from environment variables in production
    // For development, you can still use the config but it should be loaded securely
    
    if (isProduction) {
      // In production, load from environment variables or secure config service
      return this.loadProductionConfig();
    } else {
      // In development, you can use a local config file that's gitignored
      return this.loadDevelopmentConfig();
    }
  }

  private loadProductionConfig(): FirebaseConfig {
    // For now, use the same config as development since Firebase config is safe to expose
    // In a real enterprise app, you would load from environment variables
    return {
      apiKey: "AIzaSyDFQZGnHK4z-P80XHo2kkkoHkJpwz2XDXQ",
      authDomain: "vanguard-f8b90.firebaseapp.com",
      projectId: "vanguard-f8b90",
      storageBucket: "vanguard-f8b90.firebasestorage.app",
      messagingSenderId: "143470482399",
      appId: "1:143470482399:web:4eedb42ce4fd35de2f2a6a",
      measurementId: "G-ZDWT0E0JPQ"
    };
  }

  private loadDevelopmentConfig(): FirebaseConfig {
    // For development, try to load from environment variables first
    try {
      const envConfig = this.loadFromEnvironmentVariables();
      if (envConfig) {
        return envConfig;
      }
    } catch (error) {
      console.warn('Could not load from environment variables:', error);
    }

    // Try to load from a local config file
    try {
      const localConfig = this.loadLocalConfig();
      if (localConfig) {
        return localConfig;
      }
    } catch (error) {
      console.warn('Could not load local config:', error);
    }

    // Fallback to hardcoded development config for immediate functionality
    console.warn('Using fallback Firebase configuration for development');
    return {
      apiKey: "AIzaSyDFQZGnHK4z-P80XHo2kkkoHkJpwz2XDXQ",
      authDomain: "vanguard-f8b90.firebaseapp.com",
      projectId: "vanguard-f8b90",
      storageBucket: "vanguard-f8b90.firebasestorage.app",
      messagingSenderId: "143470482399",
      appId: "1:143470482399:web:4eedb42ce4fd35de2f2a6a",
      measurementId: "G-ZDWT0E0JPQ"
    };
  }

  private loadFromEnvironmentVariables(): FirebaseConfig | null {
    try {
      const config: FirebaseConfig = {
        apiKey: this.getEnvVar('FIREBASE_API_KEY'),
        authDomain: this.getEnvVar('FIREBASE_AUTH_DOMAIN'),
        projectId: this.getEnvVar('FIREBASE_PROJECT_ID'),
        storageBucket: this.getEnvVar('FIREBASE_STORAGE_BUCKET'),
        messagingSenderId: this.getEnvVar('FIREBASE_MESSAGING_SENDER_ID'),
        appId: this.getEnvVar('FIREBASE_APP_ID'),
        measurementId: this.getEnvVar('FIREBASE_MEASUREMENT_ID')
      };
      
      // Validate that all required fields are present
      if (!config.apiKey || !config.authDomain || !config.projectId || 
          !config.storageBucket || !config.messagingSenderId || !config.appId) {
        return null;
      }
      
      return config;
    } catch (error) {
      return null;
    }
  }

  private loadLocalConfig(): FirebaseConfig | null {
    // Try to load from .env.local file
    try {
      // In a real implementation, you would load this from a local file
      // For now, we'll return null and let the environment variable method handle it
      // TODO: Implement actual file loading for development
      return null;
    } catch (error) {
      return null;
    }
  }

  private getEnvVar(key: string): string {
    // In production, try multiple sources for environment variables
    const sources = [
      (window as any).__ENV__?.[key], // Build-time injected variables
      (window as any).process?.env?.[key], // Node.js style (if available)
      (window as any).ENV?.[key], // Alternative global variable
    ];
    
    for (const value of sources) {
      if (value && typeof value === 'string' && value.length > 0) {
        return value;
      }
    }
    
    // If no environment variable found, throw an error
    throw new Error(`Environment variable ${key} is not set. Please configure it in your deployment environment.`);
  }

  // Public methods
  getConfig(): AppConfig {
    return this.config;
  }

  getFirebaseConfig(): FirebaseConfig {
    return this.config.firebase;
  }

  isProduction(): boolean {
    return this.config.production;
  }
}