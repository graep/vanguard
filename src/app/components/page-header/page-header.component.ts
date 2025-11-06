import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, IonButton } from '@ionic/angular/standalone';
import { BreadcrumbComponent, BreadcrumbItem } from '../breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, IonIcon, IonButton, BreadcrumbComponent],
  template: `
    <div class="page-header">
      <!-- Mobile Menu Button (optional, only shown on mobile) -->
      <div class="mobile-menu-container mobile-only" *ngIf="showMobileMenu">
        <ion-button 
          class="mobile-menu-btn"
          fill="clear" 
          color="primary"
          size="small"
          (click)="onMobileMenuClick()">
          <ion-icon name="menu" slot="icon-only"></ion-icon>
        </ion-button>
      </div>
      
      <!-- Vertical Divider -->
      <div class="divider-container mobile-only" *ngIf="showMobileMenu">
        <div class="divider"></div>
      </div>
      
      <!-- Breadcrumb Section -->
      <div class="breadcrumb-section">
        <app-breadcrumb [items]="breadcrumbItems"></app-breadcrumb>
      </div>
      
      <!-- Logout Section -->
      <div class="logout-section" *ngIf="showLogout">
        <ion-button 
          (click)="onLogout()" 
          fill="clear" 
          color="medium"
          class="logout-button"
          title="Logout"
        >
          <ion-icon name="log-out-outline" size="small"></ion-icon>
        </ion-button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      margin: 0;
      padding: 0;
      width: 100%;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #1e1e1e;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      min-height: 40px;
      margin: 0;
      padding: 0;
    }

    /* Laptop view - ensure consistent height matching van-selection page */
    @media (min-width: 769px) {
      .page-header {
        height: 50px;
        min-height: 50px;
      }
    }

    .mobile-menu-btn {
      --padding-start: 0;
      --padding-end: 0;
      --padding-top: 0;
      --padding-bottom: 0;
      --color: var(--ion-color-primary);
      margin: 0;
      flex-shrink: 0;
      transition: all 0.2s ease;
      width: 44px;
      height: 44px;
      min-width: 44px;
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;

      &:hover {
        --color: var(--ion-color-primary);
        --background: rgba(var(--ion-color-primary-rgb), 0.1);
      }

      ion-icon {
        font-size: 24px;
        margin: 0;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      }
    }

    .mobile-menu-container {
      flex-shrink: 0;
      padding: 8px 3px 8px 16px;
      display: flex;
      align-items: center;
    }

    .divider-container {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 8px;
    }

    .divider {
      width: 1px;
      height: 24px;
      background: rgba(255, 255, 255, 0.2);
    }

    .breadcrumb-section {
      flex: 1;
      min-width: 0; /* Allow shrinking */
    }

    .logout-section {
      flex-shrink: 0;
      padding: 8px 16px;
    }

    .logout-button {
      --padding-start: 8px;
      --padding-end: 8px;
      --padding-top: 8px;
      --padding-bottom: 8px;
      --border-radius: 50%;
      --background: rgba(255, 255, 255, 0.1);
      --color: rgba(255, 255, 255, 0.7);
      transition: all 0.2s ease;
    }

    .logout-button:hover {
      --background: rgba(244, 67, 54, 0.2);
      --color: #f44336;
    }

    .logout-button ion-icon {
      font-size: 18px;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .page-header {
        min-height: 44px;
      }
      
      .mobile-menu-container {
        padding: 6px 3px 6px 8px;
      }
      
      .divider-container {
        padding: 0 4px;
      }
      
      .divider {
        height: 20px;
      }
      
      .mobile-menu-btn {
        width: 44px;
        height: 44px;
        min-width: 44px;
        min-height: 44px;
        
        ion-icon {
          font-size: 20px;
          margin: 0;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
      }
      
      .logout-section {
        padding: 6px 12px;
      }
      
      .logout-button ion-icon {
        font-size: 16px;
      }
    }

    @media (min-width: 769px) {
      .mobile-only {
        display: none !important;
      }
    }
  `]
})
export class PageHeaderComponent {
  @Input() breadcrumbItems: BreadcrumbItem[] = [];
  @Input() showMobileMenu = false;
  @Input() showLogout = true;
  @Output() logout = new EventEmitter<void>();
  @Output() mobileMenuClick = new EventEmitter<void>();

  onLogout() {
    this.logout.emit();
  }

  onMobileMenuClick() {
    this.mobileMenuClick.emit();
  }
}
