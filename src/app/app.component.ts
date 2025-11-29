import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { NavService } from './services/nav.service';
import { PwaBackButtonService } from './services/pwa-back-button.service';
import { AuthService } from './services/auth.service';
import { AppLifecycleService } from './services/app-lifecycle.service';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Platform } from '@ionic/angular';
import { filter } from 'rxjs';
import { isDevMode } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit, OnDestroy {
  private swUpdate = inject(SwUpdate);
  private navService = inject(NavService);
  private pwaBackButtonService = inject(PwaBackButtonService);
  private authService = inject(AuthService);
  private appLifecycle = inject(AppLifecycleService);
  private platform = inject(Platform);

  constructor() {
    // NavService constructor will automatically setup Android back button handling
    
    // Initialize PWA back button handling
    this.pwaBackButtonService.initialize();
    
    // Expose auth helper to window for debugging
    (window as any).checkAuth = () => {
      const user = this.authService.currentUser$.value;
      const profile = this.authService.currentUserProfile$.value;
      // Auth debug info available via checkAuth() helper
      return { user, profile };
    };
    // Debug helper available: checkAuth() in console
  }

  private async initStatusBar() {
    try {
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#0B1A2A' });
    } catch (err) {
      console.warn('StatusBar init failed:', err);
    }
  }

  async ngOnInit() {
    // Initialize StatusBar after platform is ready
    if (this.platform.is('capacitor')) {
      await this.platform.ready();
      await this.initStatusBar();
    } else {
      // For web/PWA, still try to initialize (will fail gracefully)
      await this.initStatusBar();
    }

    // Check for service worker updates
    if (this.swUpdate.isEnabled && !isDevMode()) {
      // Check for updates immediately
      this.swUpdate.checkForUpdate();
      
      // Check for updates every 6 hours
      setInterval(() => {
        this.swUpdate.checkForUpdate();
      }, 6 * 60 * 60 * 1000);

      // Listen for version ready events
      this.swUpdate.versionUpdates
        .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
        .subscribe(() => {
          // Force immediate update when new version is ready
          // New version available, reloading
          window.location.reload();
        });
    }
  }

  ngOnDestroy() {
    // Cleanup if needed
  }
}
