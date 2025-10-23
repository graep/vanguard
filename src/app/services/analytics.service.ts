// src/app/services/analytics.service.ts
import { Injectable } from '@angular/core';
import { LoggingService } from './logging.service';

export interface AnalyticsEvent {
  name: string;
  parameters?: { [key: string]: any };
  timestamp?: number;
}

export interface UserProperties {
  [key: string]: string | number | boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private isEnabled: boolean = false;
  private events: AnalyticsEvent[] = [];
  private userProperties: UserProperties = {};

  constructor(private loggingService: LoggingService) {
    this.initializeAnalytics();
  }

  private initializeAnalytics(): void {
    // Check if analytics is enabled
    this.isEnabled = this.checkAnalyticsEnabled();
    
    if (this.isEnabled) {
      this.loggingService.info('Analytics service initialized', 'ANALYTICS');
    } else {
      this.loggingService.debug('Analytics disabled', 'ANALYTICS');
    }
  }

  private checkAnalyticsEnabled(): boolean {
    // Check environment variable or user preference
    const envEnabled = (window as any).__ENV__?.ENABLE_ANALYTICS === 'true';
    const userConsent = localStorage.getItem('analytics_consent') === 'true';
    
    return envEnabled && userConsent;
  }

  // User consent management
  setUserConsent(consent: boolean): void {
    localStorage.setItem('analytics_consent', consent.toString());
    this.isEnabled = consent && (window as any).__ENV__?.ENABLE_ANALYTICS === 'true';
    
    this.loggingService.info(`Analytics consent ${consent ? 'granted' : 'revoked'}`, 'ANALYTICS');
  }

  getUserConsent(): boolean {
    return localStorage.getItem('analytics_consent') === 'true';
  }

  // Event tracking
  trackEvent(eventName: string, parameters?: { [key: string]: any }): void {
    if (!this.isEnabled) {
      this.loggingService.debug(`Analytics event blocked: ${eventName}`, 'ANALYTICS');
      return;
    }

    const event: AnalyticsEvent = {
      name: eventName,
      parameters: this.sanitizeParameters(parameters),
      timestamp: Date.now()
    };

    this.events.push(event);
    this.loggingService.debug(`Analytics event tracked: ${eventName}`, 'ANALYTICS', parameters);

    // Send to analytics service
    this.sendEventToService(event);
  }

  // Page view tracking
  trackPageView(pageName: string, pageTitle?: string): void {
    this.trackEvent('page_view', {
      page_name: pageName,
      page_title: pageTitle || document.title,
      page_location: window.location.href
    });
  }

  // User action tracking
  trackUserAction(action: string, category?: string, label?: string): void {
    this.trackEvent('user_action', {
      action,
      category: category || 'general',
      label
    });
  }

  // Performance tracking
  trackPerformance(metricName: string, value: number, unit: string = 'ms'): void {
    this.trackEvent('performance_metric', {
      metric_name: metricName,
      value,
      unit
    });
  }

  // Error tracking
  trackError(error: Error, context?: string): void {
    this.trackEvent('error_occurred', {
      error_message: error.message,
      error_name: error.name,
      error_stack: error.stack,
      context: context || 'unknown'
    });
  }

  // User properties
  setUserProperties(properties: UserProperties): void {
    this.userProperties = { ...this.userProperties, ...properties };
    this.loggingService.debug('User properties updated', 'ANALYTICS', properties);
  }

  setUserId(userId: string): void {
    this.setUserProperties({ user_id: userId });
  }

  // Custom dimensions
  setCustomDimension(index: number, value: string): void {
    this.trackEvent('custom_dimension', {
      [`dimension${index}`]: value
    });
  }

  // E-commerce tracking
  trackPurchase(transactionId: string, value: number, currency: string = 'USD', items?: any[]): void {
    this.trackEvent('purchase', {
      transaction_id: transactionId,
      value,
      currency,
      items: items || []
    });
  }

  // Conversion tracking
  trackConversion(conversionName: string, value?: number): void {
    this.trackEvent('conversion', {
      conversion_name: conversionName,
      value: value || 0
    });
  }

  // Private methods
  private sanitizeParameters(parameters?: { [key: string]: any }): { [key: string]: any } {
    if (!parameters) return {};

    const sanitized: { [key: string]: any } = {};
    
    for (const [key, value] of Object.entries(parameters)) {
      // Remove sensitive data
      if (this.isSensitiveKey(key)) {
        continue;
      }

      // Sanitize value
      if (typeof value === 'string' && value.length > 100) {
        sanitized[key] = value.substring(0, 100) + '...';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = '[object]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private isSensitiveKey(key: string): boolean {
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth', 'credential'];
    return sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive));
  }

  private sendEventToService(event: AnalyticsEvent): void {
    // In a real implementation, this would send to Google Analytics, Mixpanel, etc.
    // For now, we'll just log it and store locally
    
    try {
      // Store events locally for debugging
      const storedEvents = JSON.parse(localStorage.getItem('analytics_events') || '[]');
      storedEvents.push(event);
      
      // Keep only last 100 events
      if (storedEvents.length > 100) {
        storedEvents.splice(0, storedEvents.length - 100);
      }
      
      localStorage.setItem('analytics_events', JSON.stringify(storedEvents));
      
      // Send to external service (placeholder)
      this.sendToExternalService(event);
    } catch (error) {
      this.loggingService.error('Failed to store analytics event', 'ANALYTICS', error);
    }
  }

  private sendToExternalService(event: AnalyticsEvent): void {
    // Placeholder for external analytics service
    // This could be Google Analytics, Mixpanel, Amplitude, etc.
    
    // Example for Google Analytics 4:
    // gtag('event', event.name, event.parameters);
    
    // Example for custom endpoint:
    // fetch('/api/analytics', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(event)
    // });
  }

  // Debug methods
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  getUserProperties(): UserProperties {
    return { ...this.userProperties };
  }

  clearEvents(): void {
    this.events = [];
    localStorage.removeItem('analytics_events');
    this.loggingService.info('Analytics events cleared', 'ANALYTICS');
  }

  // Export events for debugging
  exportEvents(): string {
    return JSON.stringify({
      events: this.events,
      userProperties: this.userProperties,
      timestamp: new Date().toISOString()
    }, null, 2);
  }
}
