// src/app/services/app-lifecycle.service.ts
import { Injectable, inject } from '@angular/core';
import { App, AppState } from '@capacitor/app';
import { Platform } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppLifecycleService {
  private platform = inject(Platform);
  private router = inject(Router);
  
  private appStateChange$ = new Subject<{ isActive: boolean }>();
  
  constructor() {
    this.initializeAppStateListener();
  }

  /**
   * Observable for app state changes (foreground/background)
   */
  get appStateChanges(): Observable<{ isActive: boolean }> {
    return this.appStateChange$.asObservable();
  }

  private async initializeAppStateListener() {
    if (this.platform.is('capacitor')) {
      // Use Capacitor App plugin for native platforms
      try {
        await App.addListener('appStateChange', (state: AppState) => {
          const isActive = state.isActive;
          this.appStateChange$.next({ isActive });
          
          if (isActive) {
            // App came to foreground
            // Add a small delay to ensure app is fully active
            setTimeout(() => {
              this.handleAppResume();
            }, 500);
          } else {
            // App went to background
            this.handleAppPause();
          }
        });
      } catch (error) {
        console.error('Failed to setup app state listener:', error);
        // Fallback to visibility API
        this.setupVisibilityListener();
      }
    } else {
      // For web/PWA, use page visibility API
      this.setupVisibilityListener();
    }
  }

  private setupVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      const isActive = !document.hidden;
      this.appStateChange$.next({ isActive });
      
      if (isActive) {
        // Add a small delay to ensure page is fully visible
        setTimeout(() => {
          this.handleAppResume();
        }, 500);
      } else {
        this.handleAppPause();
      }
    });
  }

  private handleAppResume() {
    // Check if we're in background tracking mode
    const trackingData = localStorage.getItem('vanguard_background_tracking');
    if (trackingData) {
      try {
        const data = JSON.parse(trackingData);
        // Show inspection prompt
        this.showInspectionPrompt(data);
      } catch (error) {
        console.error('Error parsing background tracking data:', error);
      }
    }
  }

  private handleAppPause() {
    // App went to background - GPS should continue tracking
    console.log('App paused - GPS tracking continues in background');
  }

  private async showInspectionPrompt(vanData: { vanType: string; vanNumber: string; vanId: string }) {
    // Only show prompt if we're not already on an inspection page
    const currentUrl = this.router.url;
    
    // Skip if already on photo-capture or user-review pages
    if (currentUrl.includes('/photo-capture') || currentUrl.includes('/user-review')) {
      return;
    }
    
    // If on background-tracking page, navigate away
    if (currentUrl.includes('/background-tracking')) {
      this.router.navigate([
        '/photo-capture',
        vanData.vanType,
        vanData.vanNumber
      ], {
        queryParams: { 
          vanId: vanData.vanId,
          fromBackground: 'true' // Flag to show prompt
        },
        replaceUrl: true // Replace background-tracking page
      });
    } else {
      // Navigate to photo-capture to start inspection
      this.router.navigate([
        '/photo-capture',
        vanData.vanType,
        vanData.vanNumber
      ], {
        queryParams: { 
          vanId: vanData.vanId,
          fromBackground: 'true' // Flag to show prompt
        },
        replaceUrl: false
      });
    }
  }

  /**
   * Clear background tracking state (e.g., when inspection is complete)
   */
  clearBackgroundTracking() {
    localStorage.removeItem('vanguard_background_tracking');
  }

  /**
   * Check if app is currently in background tracking mode
   */
  isInBackgroundTrackingMode(): boolean {
    return !!localStorage.getItem('vanguard_background_tracking');
  }

  /**
   * Get current background tracking data
   */
  getBackgroundTrackingData(): { vanType: string; vanNumber: string; vanId: string; startedAt: number } | null {
    const data = localStorage.getItem('vanguard_background_tracking');
    if (!data) return null;
    
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
}

