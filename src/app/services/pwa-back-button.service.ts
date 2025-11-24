import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class PwaBackButtonService {
  private isInitialized = false;

  constructor(private router: Router, private platform: Platform) {}

  initialize() {
    if (this.isInitialized) {
      return;
    }

    // Detect if we're in a PWA environment
    const isPWA = this.platform.is('pwa') || 
                 (window.navigator as any).standalone === true ||
                 window.matchMedia('(display-mode: standalone)').matches;

    if (isPWA) {
      this.setupPwaBackButton();
      this.isInitialized = true;
    }
  }

  private setupPwaBackButton() {
    // Method 1: History API manipulation
    this.setupHistoryAPI();

    // Method 2: Beforeunload event
    this.setupBeforeUnload();

    // Method 3: Visibility change detection
    this.setupVisibilityChange();

    // Method 4: Page hide/show events
    this.setupPageEvents();
  }

  private setupHistoryAPI() {
    // Push initial state if needed
    if (window.history.length === 1) {
      window.history.pushState({ pwaBackButton: true }, '', window.location.href);
    }

    // Listen for popstate events
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.pwaBackButton) {
        event.preventDefault();
        this.handleBackButton();
        
        // Push the state back to maintain the trap
        window.history.pushState({ pwaBackButton: true }, '', window.location.href);
      }
    });
  }

  private setupBeforeUnload() {
    window.addEventListener('beforeunload', (event) => {
      // This can help detect when the user is trying to leave the app
    });
  }

  private setupVisibilityChange() {
    document.addEventListener('visibilitychange', () => {
      // Handle visibility changes
    });
  }

  private setupPageEvents() {
    window.addEventListener('pagehide', (event) => {
      // Handle page hide
    });

    window.addEventListener('pageshow', (event) => {
      // Handle page show
    });
  }

  private handleBackButton() {
    const currentUrl = this.router.url;
    
    // Handle specific routes
    if (currentUrl === '/login' || currentUrl === '/signup') {
      return;
    }
    
    // Navigate back using Angular router
    if (window.history.length > 1) {
      // Use browser back navigation
      window.history.back();
    } else {
      this.router.navigate(['/van-selection']);
    }
  }
}
