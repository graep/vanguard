// src/app/services/error-handler.service.ts
import { Injectable, ErrorHandler, Injector } from '@angular/core';
import { LoggingService } from './logging.service';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GlobalErrorHandlerService implements ErrorHandler {

  constructor(private injector: Injector) {}

  handleError(error: any): void {
    // Get services safely to avoid circular dependency
    const loggingService = this.injector.get(LoggingService);
    const router = this.injector.get(Router);

    // Extract error information
    const errorInfo = this.extractErrorInfo(error);
    
    // Log the error
    loggingService.error(
      `Unhandled error: ${errorInfo.message}`,
      'GLOBAL_ERROR_HANDLER',
      errorInfo
    );

    // Handle specific error types
    this.handleSpecificErrors(error, router);

    // In development, re-throw the error to see it in console
    if (!environment.production) {
      console.error('Global error handler caught:', error);
    }
  }

  private extractErrorInfo(error: any): any {
    let message = 'Unknown error occurred';
    let stack = '';
    let code = '';
    let context = '';

    if (error instanceof Error) {
      message = error.message;
      stack = error.stack || '';
      context = error.name;
    } else if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object') {
      message = error.message || error.error?.message || 'Unknown error';
      stack = error.stack || error.error?.stack || '';
      code = error.code || error.error?.code || '';
      context = error.context || error.error?.context || '';
    }

    return {
      message,
      stack,
      code,
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      originalError: error
    };
  }

  private handleSpecificErrors(error: any, router: Router): void {
    // Handle Firebase authentication errors
    if (error?.code?.startsWith('auth/')) {
      this.handleAuthError(error, router);
      return;
    }

    // Handle Firebase Firestore errors
    if (error?.code?.startsWith('firestore/')) {
      this.handleFirestoreError(error);
      return;
    }

    // Handle Firebase Storage errors
    if (error?.code?.startsWith('storage/')) {
      this.handleStorageError(error);
      return;
    }

    // Handle network errors
    if (error?.name === 'NetworkError' || error?.message?.includes('network')) {
      this.handleNetworkError(error);
      return;
    }

    // Handle navigation errors
    if (error?.message?.includes('Cannot match any routes')) {
      this.handleNavigationError(error, router);
      return;
    }

    // Handle generic errors
    this.handleGenericError(error);
  }

  private handleAuthError(error: any, router: Router): void {
    const loggingService = this.injector.get(LoggingService);
    
    loggingService.logSecurityEvent('Authentication error', {
      code: error.code,
      message: error.message
    });

    // Redirect to login for certain auth errors
    const criticalAuthErrors = [
      'auth/user-not-found',
      'auth/wrong-password',
      'auth/user-disabled',
      'auth/invalid-credential'
    ];

    if (criticalAuthErrors.includes(error.code)) {
      router.navigate(['/login'], { replaceUrl: true });
    }
  }

  private handleFirestoreError(error: any): void {
    const loggingService = this.injector.get(LoggingService);
    
    loggingService.error('Firestore error', 'FIRESTORE', {
      code: error.code,
      message: error.message
    });
  }

  private handleStorageError(error: any): void {
    const loggingService = this.injector.get(LoggingService);
    
    loggingService.error('Storage error', 'STORAGE', {
      code: error.code,
      message: error.message
    });
  }

  private handleNetworkError(error: any): void {
    const loggingService = this.injector.get(LoggingService);
    
    loggingService.error('Network error', 'NETWORK', {
      message: error.message,
      type: error.type
    });
  }

  private handleNavigationError(error: any, router: Router): void {
    const loggingService = this.injector.get(LoggingService);
    
    loggingService.warn('Navigation error', 'NAVIGATION', {
      message: error.message,
      url: window.location.href
    });

    // Redirect to a safe page
    router.navigate(['/van-selection'], { replaceUrl: true });
  }

  private handleGenericError(error: any): void {
    const loggingService = this.injector.get(LoggingService);
    
    loggingService.error('Generic error', 'GENERIC', {
      message: error.message,
      type: typeof error,
      stack: error.stack
    });
  }
}
