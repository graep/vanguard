// src/app/services/cache.service.ts
import { Injectable } from '@angular/core';
import { LoggingService } from './logging.service';

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private loggingService: LoggingService) {
    // Clean up expired items every minute
    setInterval(() => this.cleanup(), 60000);
  }

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    const now = Date.now();
    const expiresAt = now + ttl;

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt
    });

    this.loggingService.debug(`Cache set: ${key}`, 'CACHE', { ttl, expiresAt });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.loggingService.debug(`Cache miss: ${key}`, 'CACHE');
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.loggingService.debug(`Cache expired: ${key}`, 'CACHE');
      return null;
    }

    this.loggingService.debug(`Cache hit: ${key}`, 'CACHE');
    return item.data;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.loggingService.debug(`Cache deleted: ${key}`, 'CACHE');
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.loggingService.info('Cache cleared', 'CACHE');
  }

  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.loggingService.debug(`Cache cleanup: removed ${cleanedCount} expired items`, 'CACHE');
    }
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Utility methods for common caching patterns
  async getOrSet<T>(
    key: string, 
    factory: () => Promise<T>, 
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    try {
      const data = await factory();
      this.set(key, data, ttl);
      return data;
    } catch (error) {
      this.loggingService.error(`Cache factory failed for ${key}`, 'CACHE', error);
      throw error;
    }
  }

  // Cache with automatic refresh
  async getWithRefresh<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL,
    refreshThreshold: number = 0.8 // Refresh when 80% of TTL has passed
  ): Promise<T> {
    const item = this.cache.get(key);
    
    if (!item) {
      // Cache miss - fetch and store
      const data = await factory();
      this.set(key, data, ttl);
      return data;
    }

    const now = Date.now();
    const age = now - item.timestamp;
    const shouldRefresh = age > (ttl * refreshThreshold);

    if (shouldRefresh) {
      // Refresh in background
      factory().then(data => {
        this.set(key, data, ttl);
      }).catch(error => {
        this.loggingService.error(`Background refresh failed for ${key}`, 'CACHE', error);
      });
    }

    return item.data;
  }
}
