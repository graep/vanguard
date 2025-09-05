import { Component, Input } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [IonicModule, CommonModule],
  template:`
  <ion-header>
    <ion-toolbar>
      <!-- START slot -->
      <ion-buttons slot="start">
        <ion-button fill="clear" (click)="goBack()">
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

  constructor(
    private auth: Auth, 
    private router: Router,
    private location: Location
  ) {}

  goBack() {
    this.location.back();
  }
  
  async logout() {
    await this.auth.signOut();
    this.router.navigate(['/login']);
  }
}