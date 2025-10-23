// src/app/services/health-check.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, timer } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { LoggingService } from './logging.service';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: number;
  services: {
    [serviceName: string]: {
      status: 'up' | 'down' | 'degraded';
      responseTime?: number;
      error?: string;
    };
  };
  uptime: number;
  version: string;
}

@Injectable({
  providedIn: 'root'
})
export class HealthCheckService {
  private startTime = Date.now();
  private healthStatus: HealthStatus = {
    status: 'healthy',
    timestamp: Date.now(),
    services: {},
    uptime: 0,
    version: '1.0.0'
  };

  constructor(
    private http: HttpClient,
    private loggingService: LoggingService
  ) {
    this.initializeHealthMonitoring();
  }

  private initializeHealthMonitoring(): void {
    // Check health every 30 seconds
    timer(0, 30000).pipe(
      switchMap(() => this.checkAllServices())
    ).subscribe(
      (status) => {
        this.healthStatus = status;
        this.loggingService.debug('Health check completed', 'HEALTH_CHECK', status);
      },
      (error) => {
        this.loggingService.error('Health check failed', 'HEALTH_CHECK', error);
        this.healthStatus.status = 'unhealthy';
      }
    );
  }

  private checkAllServices(): Observable<HealthStatus> {
    const services = [
      this.checkFirebaseAuth(),
      this.checkFirebaseFirestore(),
      this.checkFirebaseStorage(),
      this.checkLocalStorage(),
      this.checkNetworkConnectivity()
    ];

    return new Observable(observer => {
      const results: { [key: string]: any } = {};
      let completed = 0;

      services.forEach((service, index) => {
        service.subscribe(
          (result) => {
            results[`service_${index}`] = result;
            completed++;
            
            if (completed === services.length) {
              const status = this.aggregateHealthStatus(results);
              observer.next(status);
              observer.complete();
            }
          },
          (error) => {
            results[`service_${index}`] = { status: 'down', error: error.message };
            completed++;
            
            if (completed === services.length) {
              const status = this.aggregateHealthStatus(results);
              observer.next(status);
              observer.complete();
            }
          }
        );
      });
    });
  }

  private checkFirebaseAuth(): Observable<any> {
    return new Observable(observer => {
      const startTime = Date.now();
      
      // Check if Firebase Auth is available
      if (typeof window !== 'undefined' && (window as any).firebase) {
        observer.next({
          status: 'up',
          responseTime: Date.now() - startTime
        });
      } else {
        observer.next({
          status: 'down',
          error: 'Firebase Auth not available'
        });
      }
      observer.complete();
    });
  }

  private checkFirebaseFirestore(): Observable<any> {
    return new Observable(observer => {
      const startTime = Date.now();
      
      // Check Firestore connectivity
      if (typeof window !== 'undefined' && (window as any).firebase) {
        observer.next({
          status: 'up',
          responseTime: Date.now() - startTime
        });
      } else {
        observer.next({
          status: 'down',
          error: 'Firestore not available'
        });
      }
      observer.complete();
    });
  }

  private checkFirebaseStorage(): Observable<any> {
    return new Observable(observer => {
      const startTime = Date.now();
      
      // Check Firebase Storage connectivity
      if (typeof window !== 'undefined' && (window as any).firebase) {
        observer.next({
          status: 'up',
          responseTime: Date.now() - startTime
        });
      } else {
        observer.next({
          status: 'down',
          error: 'Firebase Storage not available'
        });
      }
      observer.complete();
    });
  }

  private checkLocalStorage(): Observable<any> {
    return new Observable(observer => {
      const startTime = Date.now();
      
      try {
        const testKey = 'health_check_test';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        
        observer.next({
          status: 'up',
          responseTime: Date.now() - startTime
        });
      } catch (error) {
        observer.next({
          status: 'down',
          error: 'Local storage not available'
        });
      }
      observer.complete();
    });
  }

  private checkNetworkConnectivity(): Observable<any> {
    return new Observable(observer => {
      const startTime = Date.now();
      
      // Simple network check
      fetch('/health', { method: 'HEAD' })
        .then(() => {
          observer.next({
            status: 'up',
            responseTime: Date.now() - startTime
          });
        })
        .catch(() => {
          observer.next({
            status: 'down',
            error: 'Network connectivity issues'
          });
        })
        .finally(() => {
          observer.complete();
        });
    });
  }

  private aggregateHealthStatus(services: { [key: string]: any }): HealthStatus {
    const serviceStatuses = Object.values(services);
    const upServices = serviceStatuses.filter(s => s.status === 'up').length;
    const totalServices = serviceStatuses.length;
    
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded';
    
    if (upServices === totalServices) {
      overallStatus = 'healthy';
    } else if (upServices === 0) {
      overallStatus = 'unhealthy';
    } else {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: Date.now(),
      services: services,
      uptime: Date.now() - this.startTime,
      version: '1.0.0'
    };
  }

  // Public methods
  getHealthStatus(): HealthStatus {
    return { ...this.healthStatus };
  }

  isHealthy(): boolean {
    return this.healthStatus.status === 'healthy';
  }

  getUptime(): number {
    return Date.now() - this.startTime;
  }

  // Manual health check
  performHealthCheck(): Observable<HealthStatus> {
    return this.checkAllServices();
  }

  // Get service-specific status
  getServiceStatus(serviceName: string): any {
    return this.healthStatus.services[serviceName];
  }

  // Format uptime for display
  getFormattedUptime(): string {
    const uptime = this.getUptime();
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
    
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  // Export health data
  exportHealthData(): string {
    return JSON.stringify({
      ...this.healthStatus,
      formattedUptime: this.getFormattedUptime(),
      exportTime: new Date().toISOString()
    }, null, 2);
  }
}
