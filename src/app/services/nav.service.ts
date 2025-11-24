import { Injectable } from '@angular/core';
import { Router, UrlTree, NavigationExtras, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Platform } from '@ionic/angular';

const KEY = 'firstNavAfterLogin'; // per-tab, cleared on first use
const HISTORY_KEY = 'navHistory'; // track navigation history

@Injectable({ providedIn: 'root' })
export class NavService {
  private navigationHistory: string[] = [];
  private isLoggedIn = false;
  private currentUserRoles: string[] = [];
  private isHandlingBackButton = false; // Prevent infinite loops
  private backButtonHandlersSetup = false; // Prevent duplicate setup

  constructor(private router: Router, private authService: AuthService, private platform: Platform) {
    // Track navigation history
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.addToHistory(event.url);
    });

    // Monitor authentication state changes
    this.authService.currentUserProfile$.subscribe(profile => {
      const wasLoggedIn = this.isLoggedIn;
      this.isLoggedIn = !!profile;
      this.currentUserRoles = profile?.roles || [];
      
      // If user just logged out, clear browser history
      if (wasLoggedIn && !this.isLoggedIn) {
        this.clearBrowserHistory();
      }
    });

    // Listen for browser back/forward events
    this.setupBrowserHistoryListener();

    // Setup Android hardware back button handling
    this.setupAndroidBackButton();

    // Don't load history from sessionStorage - start fresh each session
    // This prevents users from navigating back to protected routes after logout
  }

  private addToHistory(url: string) {
    // Don't add login page or signup page to history
    if (url === '/login' || url === '/signup') {
      return;
    }

    // Don't add root path or empty URLs
    if (!url || url === '/' || url === '') {
      return;
    }

    // Normalize URL by removing query parameters for history tracking
    const normalizedUrl = url.split('?')[0];

    // Don't add duplicate consecutive URLs (using normalized URL)
    if (this.navigationHistory.length > 0 && this.navigationHistory[this.navigationHistory.length - 1] === normalizedUrl) {
      return;
    }

    this.navigationHistory.push(normalizedUrl);
    
    // Keep only last 10 entries
    if (this.navigationHistory.length > 10) {
      this.navigationHistory.shift();
    }
    
    // Simple history tracking - no reconstruction
    
    // Don't persist history to sessionStorage to prevent back navigation after logout
  }


  /** Get the last safe URL for the current user to navigate back to */
  getLastSafeUrl(isAdmin: boolean): string {
    // If no history or only current page, use safe default
    if (this.navigationHistory.length <= 1) {
      const defaultUrl = isAdmin ? '/admin' : '/van-selection';
      return defaultUrl;
    }
    
    // Go through history in reverse to find a safe URL (skip current page at last index)
    for (let i = this.navigationHistory.length - 2; i >= 0; i--) {
      const url = this.navigationHistory[i];
      const isAdminUrl = url.includes('/admin');
      
      // If it's an admin URL and user is not admin, skip it
      if (isAdminUrl && !isAdmin) {
        continue;
      }
      
      // If user is admin, they can go back to any URL
      // If user is not admin, they can only go back to non-admin URLs
      return url;
    }
    
    // Default fallback if no safe URL found - ALWAYS use role-appropriate default
    const fallbackUrl = isAdmin ? '/admin' : '/van-selection';
    return fallbackUrl;
  }

  /** Call right after successful login, BEFORE navigating. */
  markFirstNavPending() {
    sessionStorage.setItem(KEY, '1');
  }

  private consumeIsFirstNav(): boolean {
    if (sessionStorage.getItem(KEY) === '1') {
      sessionStorage.removeItem(KEY);
      return true;
    }
    return false;
  }

  /** Use this instead of router.navigateByUrl(...) */
  navigateByUrl(url: string | UrlTree, extras: NavigationExtras = {}) {
    const isFirst = this.consumeIsFirstNav();
    return this.router.navigateByUrl(url, isFirst ? { ...extras, replaceUrl: true } : extras);
  }

  /** Optional helper mirroring router.navigate([...]) */
  navigate(commands: any[], extras: NavigationExtras = {}) {
    const isFirst = this.consumeIsFirstNav();
    return this.router.navigate(commands, isFirst ? { ...extras, replaceUrl: true } : extras);
  }

  /** Call on logout so next login will replace again. */
  reset() {
    sessionStorage.removeItem(KEY);
    sessionStorage.removeItem(HISTORY_KEY);
    this.navigationHistory = [];
  }

  /** Clear all navigation history - use when user reaches login page */
  clearHistory() {
    this.navigationHistory = [];
    sessionStorage.removeItem(HISTORY_KEY);
  }

  /** Setup listener for browser back/forward navigation */
  private setupBrowserHistoryListener() {
    // Listen for popstate events (browser back/forward)
    window.addEventListener('popstate', (event) => {
      // Check if the target URL requires admin access
      const targetUrl = window.location.pathname;
      const requiresAdmin = targetUrl.includes('/admin');
      
      if (requiresAdmin && !(this.currentUserRoles.includes('admin') || this.currentUserRoles.includes('owner'))) {
        console.warn('[NavService] Blocking unauthorized admin access via browser navigation');
        // Replace the current history entry to prevent going back to admin
        window.history.replaceState(null, '', '/van-selection');
        this.router.navigateByUrl('/van-selection', { replaceUrl: true });
      }
    });
  }

  /** Clear browser history by replacing current state */
  private clearBrowserHistory() {
    
    // Replace current history state to prevent back navigation
    window.history.replaceState(null, '', '/login');
    
    // Clear any additional history entries by pushing a new state
    window.history.pushState(null, '', '/login');
    
    // Clear the application's navigation history
    this.navigationHistory = [];
  }


  /** Enhanced logout method that clears both app and browser history */
  enhancedLogout() {
    this.clearBrowserHistory();
    this.reset();
  }

  /** Setup Android hardware back button handling */
  private setupAndroidBackButton() {
    if (this.backButtonHandlersSetup) {
      return;
    }

    // Multiple detection methods for Android/PWA
    const detectionMethods = {
      ionicAndroid: this.platform.is('android'),
      userAgentAndroid: /Android/i.test(navigator.userAgent),
      standalone: (window.navigator as any).standalone === true,
      displayModeStandalone: window.matchMedia('(display-mode: standalone)').matches,
      displayModeFullscreen: window.matchMedia('(display-mode: fullscreen)').matches,
      displayModeMinimalUI: window.matchMedia('(display-mode: minimal-ui)').matches
    };
    
    const isAndroid = Object.values(detectionMethods).some(result => result === true);

    if (isAndroid) {
      // Mark as setup to prevent duplicates
      this.backButtonHandlersSetup = true;
      
      // Wait for platform to be ready for Ionic back button
      this.platform.ready().then(() => {
        // Method 1: Ionic Platform back button (highest priority)
        if (this.platform.backButton) {
          this.platform.backButton.subscribeWithPriority(100, (processNextHandler) => {
            this.handleBackButton();
            // Don't call processNextHandler - we want to consume the event
          });
        }
      }).catch(error => {
        console.error('[NavService] Platform ready failed:', error);
      });

      // Method 2: CONTROLLED popstate handling
      const popstateHandler = (event: PopStateEvent) => {
        // Prevent infinite loops
        if (this.isHandlingBackButton) {
          return;
        }
        
        // Prevent default behavior
        event.preventDefault();
        event.stopPropagation();
        
        // Handle the back button
        this.handleBackButton();
      };
      
      window.addEventListener('popstate', popstateHandler);

      // Method 3: Document keydown event (additional fallback)
      const keydownHandler = (event: KeyboardEvent) => {
        if (event.key === 'Backspace' && event.target === document.body) {
          event.preventDefault();
          this.handleBackButton();
        }
      };
      
      document.addEventListener('keydown', keydownHandler);

      // Method 4: Simple History API manipulation
      this.setupSimpleHistoryAPI();
    }
  }


  /** Handle back button press with navigation logic */
  private handleBackButton() {
    // Prevent infinite loops
    if (this.isHandlingBackButton) {
      return;
    }

    this.isHandlingBackButton = true;
    
    const currentUrl = this.router.url;
    
    // Handle specific routes
    if (currentUrl === '/login' || currentUrl === '/signup') {
      this.isHandlingBackButton = false;
      return;
    }
    
    // Clean up navigation history - remove duplicates and invalid entries
    this.cleanNavigationHistory();
    
    // Check if we have navigation history
    if (this.navigationHistory.length > 1) {
      const previousUrl = this.navigationHistory[this.navigationHistory.length - 2];
      
      // Check if previous URL requires admin access
      const requiresAdmin = previousUrl.includes('/admin');
      const hasAdminRole = this.currentUserRoles.includes('admin') || this.currentUserRoles.includes('owner');
      
      if (requiresAdmin && !hasAdminRole) {
        this.navigateByUrl('/van-selection');
      } else {
        // Navigate back to previous URL
        this.navigateByUrl(previousUrl);
      }
    } else {
      // No history - go to appropriate default
      const isAdmin = this.currentUserRoles.includes('admin') || this.currentUserRoles.includes('owner');
      const defaultUrl = isAdmin ? '/admin' : '/van-selection';
      this.navigateByUrl(defaultUrl);
    }

    // Reset the flag after a short delay
    setTimeout(() => {
      this.isHandlingBackButton = false;
    }, 100);
  }

  /** Clean up navigation history to remove duplicates and invalid entries */
  private cleanNavigationHistory() {
    const originalLength = this.navigationHistory.length;
    
    // Remove duplicates and invalid entries
    this.navigationHistory = this.navigationHistory.filter((url, index, array) => {
      // Remove duplicates
      if (array.indexOf(url) !== index) {
        return false;
      }
      
      // Remove invalid URLs
      if (!url || url === '/' || url === '') {
        return false;
      }
      
      return true;
    });
    
  }

  /** Setup Simple History API manipulation for PWA back button handling */
  private setupSimpleHistoryAPI() {
    // Push initial state if needed
    if (window.history.length === 1) {
      window.history.pushState({ navServiceDummy: true }, '', window.location.href);
    }

    // Simple popstate handling
    window.addEventListener('popstate', (event) => {
      // If it's our dummy state, handle it
      if (event.state && event.state.navServiceDummy) {
        event.preventDefault();
        this.handleBackButton();
        
        // Push the dummy state back to maintain the trap
        window.history.pushState({ navServiceDummy: true }, '', window.location.href);
      }
    });
  }
}
