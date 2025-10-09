import { Component, Input } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { NavService } from '../../services/nav.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [IonicModule, CommonModule],
  template:`
  <ion-header>
    <ion-toolbar>
      <!-- START slot -->
      <ion-buttons slot="start">
        <ion-button *ngIf="showBackButton" fill="clear" (click)="goBack()">
          <ion-icon name="chevron-back" slot="icon-only"></ion-icon>
        </ion-button>
      </ion-buttons>
      
      <!-- Title -->
      <ion-title>{{ title }}</ion-title>

      <!-- END slot -->
      <ion-buttons slot="end">
        <ng-content select="[header-end]"></ng-content>
        
        <!-- Show logout button (default) -->
        <ion-button *ngIf="showLogout" fill="clear" (click)="logout()">
          <ion-icon name="log-out-outline"></ion-icon>
        </ion-button>
        
        <!-- Show invisible spacer (when showLogout is false) -->
        <div *ngIf="!showLogout" class="logout-button-spacer"></div>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>`,
  styles: [`
    .logout-button-spacer {
      width: 44px;
      height: 44px;
      display: inline-block;
      visibility: hidden;
    }
  `]
})
export class AppHeaderComponent {
  @Input() title = '';
  @Input() showLogout = true;
  @Input() showBackButton = true;

  constructor(
    private auth: Auth, 
    private router: Router,
    private location: Location,
    private authService: AuthService,
    private navService: NavService
  ) {}

  async goBack() {
    console.log('[AppHeader] Back button pressed');
    
    // Check if we're on the photo-capture page
    const currentUrl = this.router.url;
    console.log('[AppHeader] Current URL:', currentUrl);
    
    if (currentUrl.includes('/photo-capture/')) {
      console.log('[AppHeader] On photo-capture page - navigating to van-selection');
      this.router.navigate(['/van-selection']);
    } else {
      console.log('[AppHeader] Using standard back navigation');
      this.location.back();
    }
  }
  
  async logout() {
    await this.auth.signOut();
    this.navService.enhancedLogout(); // Clear both app and browser history
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}