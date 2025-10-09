import { Injectable } from '@angular/core';
import { Router, UrlTree, NavigationExtras, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from './auth.service';

const KEY = 'firstNavAfterLogin'; // per-tab, cleared on first use
const HISTORY_KEY = 'navHistory'; // track navigation history

@Injectable({ providedIn: 'root' })
export class NavService {
  private navigationHistory: string[] = [];
  private isLoggedIn = false;
  private currentUserRoles: string[] = [];

  constructor(private router: Router, private authService: AuthService) {
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

    // Don't load history from sessionStorage - start fresh each session
    // This prevents users from navigating back to protected routes after logout
  }

  private addToHistory(url: string) {
    // Don't add login page or signup page to history
    if (url === '/login' || url === '/signup') {
      console.log('[NavService] Skipping auth page from history:', url);
      return;
    }

    console.log('[NavService] Adding to history:', url);
    this.navigationHistory.push(url);
    
    // Keep only last 10 entries
    if (this.navigationHistory.length > 10) {
      this.navigationHistory.shift();
    }
    
    console.log('[NavService] Updated history:', this.navigationHistory);
    // Don't persist history to sessionStorage to prevent back navigation after logout
  }

  /** Get the last safe URL for the current user to navigate back to */
  getLastSafeUrl(isAdmin: boolean): string {
    console.log('[NavService] Getting safe URL for isAdmin:', isAdmin);
    console.log('[NavService] Current navigation history:', this.navigationHistory);
    
    // If no history or only current page, use safe default
    if (this.navigationHistory.length <= 1) {
      const defaultUrl = isAdmin ? '/admin' : '/van-selection';
      console.log('[NavService] No history available, using default:', defaultUrl);
      return defaultUrl;
    }
    
    // Go through history in reverse to find a safe URL (skip current page at last index)
    for (let i = this.navigationHistory.length - 2; i >= 0; i--) {
      const url = this.navigationHistory[i];
      const isAdminUrl = url.includes('/admin');
      
      console.log('[NavService] Checking URL:', url, 'isAdminUrl:', isAdminUrl);
      
      // If it's an admin URL and user is not admin, skip it
      if (isAdminUrl && !isAdmin) {
        console.log('[NavService] Skipping admin URL for non-admin user');
        continue;
      }
      
      // If user is admin, they can go back to any URL
      // If user is not admin, they can only go back to non-admin URLs
      console.log('[NavService] Found safe URL:', url);
      return url;
    }
    
    // Default fallback if no safe URL found - ALWAYS use role-appropriate default
    const fallbackUrl = isAdmin ? '/admin' : '/van-selection';
    console.log('[NavService] No safe URL found, using fallback:', fallbackUrl);
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
    console.log('[NavService] Resetting navigation service - clearing history');
    console.log('[NavService] Previous history:', this.navigationHistory);
    sessionStorage.removeItem(KEY);
    sessionStorage.removeItem(HISTORY_KEY);
    this.navigationHistory = [];
    console.log('[NavService] History cleared');
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
      console.log('[NavService] Browser navigation detected:', window.location.pathname);
      console.log('[NavService] Event state:', event.state);
      console.log('[NavService] Current user roles:', this.currentUserRoles);
      
      // Check if the target URL requires admin access
      const targetUrl = window.location.pathname;
      const requiresAdmin = targetUrl.includes('/admin');
      
      console.log('[NavService] Target URL:', targetUrl, 'Requires admin:', requiresAdmin);
      
      if (requiresAdmin && !this.hasAdminRole()) {
        console.warn('[NavService] Blocking unauthorized admin access via browser navigation');
        // Replace the current history entry to prevent going back to admin
        window.history.replaceState(null, '', '/van-selection');
        this.router.navigateByUrl('/van-selection', { replaceUrl: true });
      } else {
        console.log('[NavService] Allowing navigation to:', targetUrl);
      }
    });
  }

  /** Clear browser history by replacing current state */
  private clearBrowserHistory() {
    console.log('[NavService] Clearing browser history on logout');
    
    // Replace current history state to prevent back navigation
    window.history.replaceState(null, '', '/login');
    
    // Clear any additional history entries by pushing a new state
    window.history.pushState(null, '', '/login');
    
    // Clear the application's navigation history
    this.navigationHistory = [];
  }

  /** Check if current user has admin role */
  private hasAdminRole(): boolean {
    return this.currentUserRoles.includes('admin') || this.currentUserRoles.includes('owner');
  }

  /** Enhanced logout method that clears both app and browser history */
  enhancedLogout() {
    console.log('[NavService] Enhanced logout - clearing all history');
    this.clearBrowserHistory();
    this.reset();
  }
}
