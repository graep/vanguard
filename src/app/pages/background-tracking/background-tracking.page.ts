// src/app/pages/background-tracking/background-tracking.page.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { IonContent, IonSpinner, IonIcon } from '@ionic/angular/standalone';
import { Platform } from '@ionic/angular';

@Component({
  selector: 'app-background-tracking',
  templateUrl: './background-tracking.page.html',
  styleUrls: ['./background-tracking.page.scss'],
  standalone: true,
  imports: [IonContent, IonSpinner, IonIcon, CommonModule]
})
export class BackgroundTrackingPage implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  platform = inject(Platform); // Public for template access

  vanType: string = '';
  vanNumber: string = '';
  vanId: string = '';

  ngOnInit() {
    // Get van info from query params
    this.vanType = this.route.snapshot.queryParamMap.get('vanType') || '';
    this.vanNumber = this.route.snapshot.queryParamMap.get('vanNumber') || '';
    this.vanId = this.route.snapshot.queryParamMap.get('vanId') || '';

    // Store tracking state immediately
    this.minimizeApp();

    // Show message for 3 seconds, then the user can switch apps
    // The app lifecycle service will handle navigation when they return
    setTimeout(() => {
      console.log('Background tracking initialized. User can now switch apps.');
    }, 3000);
  }

  async minimizeApp() {
    // Store state that we're in background tracking mode
    localStorage.setItem('vanguard_background_tracking', JSON.stringify({
      vanType: this.vanType,
      vanNumber: this.vanNumber,
      vanId: this.vanId,
      startedAt: Date.now()
    }));
    
    console.log('GPS tracking started. App will continue tracking in background.');
    
    // Try to minimize the app on Android
    if (this.platform.is('capacitor') && this.platform.is('android')) {
      // Wait a moment for the message to be visible, then minimize
      setTimeout(() => {
        this.attemptMinimize();
      }, 2000);
    }
  }

  private attemptMinimize() {
    if (!this.platform.is('capacitor') || !this.platform.is('android')) {
      return;
    }
    
    try {
      // Use JavaScript interface exposed by MainActivity
      // @ts-ignore - accessing Android JavaScript interface
      if (window.AndroidMinimize && typeof window.AndroidMinimize.minimize === 'function') {
        // @ts-ignore
        window.AndroidMinimize.minimize();
        return;
      }
    } catch (error) {
      console.log('Could not minimize app programmatically:', error);
      // User will need to press home button manually
    }
  }
}

