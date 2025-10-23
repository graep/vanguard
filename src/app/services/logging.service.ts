// src/app/services/logging.service.ts
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  stack?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LoggingService {
  private readonly logLevel: LogLevel;
  private readonly sessionId: string;
  private readonly isProduction: boolean;

  constructor() {
    this.isProduction = environment.production;
    this.logLevel = this.isProduction ? LogLevel.WARN : LogLevel.DEBUG;
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private createLogEntry(level: LogLevel, message: string, context?: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      stack: level >= LogLevel.ERROR ? new Error().stack : undefined
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatLogEntry(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    const contextStr = entry.context ? `[${entry.context}]` : '';
    const dataStr = entry.data ? ` | Data: ${JSON.stringify(entry.data)}` : '';
    
    return `${entry.timestamp} [${levelName}]${contextStr} ${entry.message}${dataStr}`;
  }

  private logToConsole(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const formattedMessage = this.formatLogEntry(entry);
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formattedMessage);
        if (entry.stack && !this.isProduction) {
          console.error('Stack trace:', entry.stack);
        }
        break;
    }
  }

  private async logToRemote(entry: LogEntry): Promise<void> {
    if (!this.isProduction) return;

    try {
      // In production, send logs to a remote service
      // This could be Firebase Functions, external logging service, etc.
      await this.sendToRemoteService(entry);
    } catch (error) {
      // Don't let logging errors break the app
      console.error('Failed to send log to remote service:', error);
    }
  }

  private async sendToRemoteService(entry: LogEntry): Promise<void> {
    // TODO: Implement remote logging service
    // This could be Firebase Functions, Sentry, LogRocket, etc.
    // For now, we'll just store in localStorage for debugging
    try {
      const logs = JSON.parse(localStorage.getItem('app_logs') || '[]');
      logs.push(entry);
      
      // Keep only last 100 logs
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      localStorage.setItem('app_logs', JSON.stringify(logs));
    } catch (error) {
      // Silently fail if localStorage is not available
    }
  }

  // Public logging methods
  debug(message: string, context?: string, data?: any): void {
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context, data);
    this.logToConsole(entry);
  }

  info(message: string, context?: string, data?: any): void {
    const entry = this.createLogEntry(LogLevel.INFO, message, context, data);
    this.logToConsole(entry);
    this.logToRemote(entry);
  }

  warn(message: string, context?: string, data?: any): void {
    const entry = this.createLogEntry(LogLevel.WARN, message, context, data);
    this.logToConsole(entry);
    this.logToRemote(entry);
  }

  error(message: string, context?: string, data?: any): void {
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, data);
    this.logToConsole(entry);
    this.logToRemote(entry);
  }

  fatal(message: string, context?: string, data?: any): void {
    const entry = this.createLogEntry(LogLevel.FATAL, message, context, data);
    this.logToConsole(entry);
    this.logToRemote(entry);
  }

  // Utility methods
  logUserAction(action: string, data?: any): void {
    this.info(`User action: ${action}`, 'USER_ACTION', data);
  }

  logApiCall(method: string, url: string, status?: number, duration?: number): void {
    const data = { method, url, status, duration };
    if (status && status >= 400) {
      this.error(`API call failed: ${method} ${url}`, 'API_CALL', data);
    } else {
      this.info(`API call: ${method} ${url}`, 'API_CALL', data);
    }
  }

  logSecurityEvent(event: string, data?: any): void {
    this.warn(`Security event: ${event}`, 'SECURITY', data);
  }

  logPerformanceMetric(metric: string, value: number, unit?: string): void {
    this.info(`Performance metric: ${metric}`, 'PERFORMANCE', { value, unit });
  }

  // Get logs for debugging
  getLogs(): LogEntry[] {
    try {
      return JSON.parse(localStorage.getItem('app_logs') || '[]');
    } catch {
      return [];
    }
  }

  clearLogs(): void {
    localStorage.removeItem('app_logs');
  }
}
