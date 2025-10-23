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

    console.log('[PwaBackButtonService] Initializing PWA back button handling');
    
    // Detect if we're in a PWA environment
    const isPWA = this.platform.is('pwa') || 
                 (window.navigator as any).standalone === true ||
                 window.matchMedia('(display-mode: standalone)').matches;

    console.log('[PwaBackButtonService] PWA detected:', isPWA);
    console.log('[PwaBackButtonService] Platform info:', {
      isAndroid: this.platform.is('android'),
      isMobile: this.platform.is('mobile'),
      isPWA: this.platform.is('pwa'),
      userAgent: navigator.userAgent,
      standalone: (window.navigator as any).standalone,
      displayMode: window.matchMedia('(display-mode: standalone)').matches
    });

    if (isPWA) {
      this.setupPwaBackButton();
      this.isInitialized = true;
    }
  }

  private setupPwaBackButton() {
    console.log('[PwaBackButtonService] Setting up PWA back button handling');

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
    console.log('[PwaBackButtonService] Setting up History API manipulation');
    
    // Push initial state if needed
    if (window.history.length === 1) {
      window.history.pushState({ pwaBackButton: true }, '', window.location.href);
    }

    // Listen for popstate events
    window.addEventListener('popstate', (event) => {
      console.log('[PwaBackButtonService] Popstate event triggered');
      
      if (event.state && event.state.pwaBackButton) {
        console.log('[PwaBackButtonService] PWA back button detected via History API');
        event.preventDefault();
        this.handleBackButton();
        
        // Push the state back to maintain the trap
        window.history.pushState({ pwaBackButton: true }, '', window.location.href);
      }
    });
  }

  private setupBeforeUnload() {
    console.log('[PwaBackButtonService] Setting up beforeunload handler');
    
    window.addEventListener('beforeunload', (event) => {
      console.log('[PwaBackButtonService] Beforeunload event triggered');
      // This can help detect when the user is trying to leave the app
    });
  }

  private setupVisibilityChange() {
    console.log('[PwaBackButtonService] Setting up visibility change handler');
    
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('[PwaBackButtonService] App became hidden - possible back button press');
      } else {
        console.log('[PwaBackButtonService] App became visible');
      }
    });
  }

  private setupPageEvents() {
    console.log('[PwaBackButtonService] Setting up page hide/show events');
    
    window.addEventListener('pagehide', (event) => {
      console.log('[PwaBackButtonService] Page hide event triggered');
    });

    window.addEventListener('pageshow', (event) => {
      console.log('[PwaBackButtonService] Page show event triggered');
    });
  }

  private handleBackButton() {
    console.log('[PwaBackButtonService] Handling PWA back button press');
    
    const currentUrl = this.router.url;
    console.log('[PwaBackButtonService] Current URL:', currentUrl);
    
    // Handle specific routes
    if (currentUrl === '/login' || currentUrl === '/signup') {
      console.log('[PwaBackButtonService] On auth page - preventing back navigation');
      return;
    }
    
    // Navigate back using Angular router
    if (window.history.length > 1) {
      console.log('[PwaBackButtonService] Navigating back via router');
      // Use browser back navigation
      window.history.back();
    } else {
      console.log('[PwaBackButtonService] No history - going to home');
      this.router.navigate(['/van-selection']);
    }
  }
}
