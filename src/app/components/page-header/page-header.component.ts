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
      <!-- Breadcrumb Section -->
      <div class="breadcrumb-section">
        <app-breadcrumb [items]="breadcrumbItems"></app-breadcrumb>
      </div>
      
      <!-- Logout Section -->
      <div class="logout-section">
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
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--ion-color-light);
      border-bottom: 1px solid rgba(var(--ion-color-medium-rgb), 0.2);
      min-height: 48px;
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
      --background: rgba(var(--ion-color-medium-rgb), 0.1);
      --color: var(--ion-color-medium);
      transition: all 0.2s ease;
    }

    .logout-button:hover {
      --background: rgba(var(--ion-color-danger-rgb), 0.1);
      --color: var(--ion-color-danger);
    }

    .logout-button ion-icon {
      font-size: 18px;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .page-header {
        min-height: 44px;
      }
      
      .logout-section {
        padding: 6px 12px;
      }
      
      .logout-button ion-icon {
        font-size: 16px;
      }
    }
  `]
})
export class PageHeaderComponent {
  @Input() breadcrumbItems: BreadcrumbItem[] = [];
  @Output() logout = new EventEmitter<void>();

  onLogout() {
    this.logout.emit();
  }
}
