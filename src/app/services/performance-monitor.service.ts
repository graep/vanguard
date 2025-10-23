// src/app/services/performance-monitor.service.ts
import { Injectable } from '@angular/core';
import { LoggingService } from './logging.service';

@Injectable({
  providedIn: 'root'
})
export class PerformanceMonitorService {
  private metrics: Map<string, number> = new Map();
  private timers: Map<string, number> = new Map();

  constructor(private loggingService: LoggingService) {
    this.initializePerformanceMonitoring();
  }

  private initializePerformanceMonitoring(): void {
    // Monitor page load performance
    this.monitorPageLoad();
    
    // Monitor memory usage
    this.monitorMemoryUsage();
    
    // Monitor network performance
    this.monitorNetworkPerformance();
  }

  private monitorPageLoad(): void {
    if (typeof window !== 'undefined' && window.performance) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const perfData = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          
          if (perfData) {
            this.loggingService.logPerformanceMetric('page_load_time', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
            this.loggingService.logPerformanceMetric('dom_content_loaded', perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart, 'ms');
            this.loggingService.logPerformanceMetric('first_paint', perfData.responseEnd - perfData.requestStart, 'ms');
          }
        }, 1000);
      });
    }
  }

  private monitorMemoryUsage(): void {
    if (typeof window !== 'undefined' && (window as any).performance?.memory) {
      setInterval(() => {
        const memory = (window as any).performance.memory;
        this.loggingService.logPerformanceMetric('memory_used', memory.usedJSHeapSize / 1024 / 1024, 'MB');
        this.loggingService.logPerformanceMetric('memory_total', memory.totalJSHeapSize / 1024 / 1024, 'MB');
        this.loggingService.logPerformanceMetric('memory_limit', memory.jsHeapSizeLimit / 1024 / 1024, 'MB');
      }, 30000); // Every 30 seconds
    }
  }

  private monitorNetworkPerformance(): void {
    if (typeof window !== 'undefined' && window.performance) {
      // Monitor resource loading times
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            this.loggingService.logPerformanceMetric(
              `resource_load_${this.getResourceType(resourceEntry.name)}`,
              resourceEntry.responseEnd - resourceEntry.requestStart,
              'ms'
            );
          }
        }
      });

      try {
        observer.observe({ entryTypes: ['resource'] });
      } catch (error) {
        this.loggingService.warn('Performance observer not supported', 'PERFORMANCE_MONITOR');
      }
    }
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'style';
    if (url.includes('.png') || url.includes('.jpg') || url.includes('.jpeg') || url.includes('.gif')) return 'image';
    if (url.includes('.woff') || url.includes('.ttf')) return 'font';
    return 'other';
  }

  // Public methods for manual performance tracking
  startTimer(name: string): void {
    this.timers.set(name, performance.now());
  }

  endTimer(name: string): number {
    const startTime = this.timers.get(name);
    if (startTime === undefined) {
      this.loggingService.warn(`Timer '${name}' was not started`, 'PERFORMANCE_MONITOR');
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(name);
    this.loggingService.logPerformanceMetric(`timer_${name}`, duration, 'ms');
    return duration;
  }

  measureAsync<T>(name: string, asyncFunction: () => Promise<T>): Promise<T> {
    this.startTimer(name);
    return asyncFunction().finally(() => {
      this.endTimer(name);
    });
  }

  measureSync<T>(name: string, syncFunction: () => T): T {
    this.startTimer(name);
    try {
      return syncFunction();
    } finally {
      this.endTimer(name);
    }
  }

  recordMetric(name: string, value: number, unit: string = ''): void {
    this.metrics.set(name, value);
    this.loggingService.logPerformanceMetric(name, value, unit);
  }

  getMetric(name: string): number | undefined {
    return this.metrics.get(name);
  }

  getAllMetrics(): Map<string, number> {
    return new Map(this.metrics);
  }

  clearMetrics(): void {
    this.metrics.clear();
    this.timers.clear();
  }

  // Monitor specific Angular operations
  monitorRouteChange(): void {
    this.startTimer('route_change');
  }

  endRouteChange(): void {
    this.endTimer('route_change');
  }

  monitorApiCall(url: string): () => void {
    const timerName = `api_call_${this.sanitizeUrl(url)}`;
    this.startTimer(timerName);
    
    return () => {
      this.endTimer(timerName);
    };
  }

  private sanitizeUrl(url: string): string {
    return url.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
  }
}
