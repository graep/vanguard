import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';

export interface BreadcrumbItem {
  label: string;
  url?: string;
  icon?: string;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule, IonIcon],
  template: `
    <nav class="breadcrumb-nav" *ngIf="items && items.length > 0">
      <ol class="breadcrumb-list">
        <li *ngFor="let item of items; let last = last" class="breadcrumb-item" [class.active]="last">
          <ng-container *ngIf="item.url && !last; else noLink">
            <a [routerLink]="item.url" class="breadcrumb-link">
              <ion-icon *ngIf="item.icon" [name]="item.icon" class="breadcrumb-icon"></ion-icon>
              <span class="breadcrumb-text">{{ item.label }}</span>
            </a>
          </ng-container>
          <ng-template #noLink>
            <span class="breadcrumb-current">
              <ion-icon *ngIf="item.icon" [name]="item.icon" class="breadcrumb-icon"></ion-icon>
              <span class="breadcrumb-text">{{ item.label }}</span>
            </span>
          </ng-template>
          <ion-icon *ngIf="!last" name="chevron-forward" class="breadcrumb-separator"></ion-icon>
        </li>
      </ol>
    </nav>
  `,
  styles: [`
    .breadcrumb-nav {
      padding: 8px 16px;
      background: rgba(var(--ion-color-light-rgb), 0.1);
      border-bottom: 1px solid rgba(var(--ion-color-light-rgb), 0.2);
    }

    .breadcrumb-list {
      display: flex;
      align-items: center;
      list-style: none;
      margin: 0;
      padding: 0;
      font-size: 14px;
    }

    .breadcrumb-item {
      display: flex;
      align-items: center;
      margin: 0;
    }

    .breadcrumb-link {
      display: flex;
      align-items: center;
      text-decoration: none;
      color: var(--ion-color-medium);
      padding: 4px 8px;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .breadcrumb-link:hover {
      color: var(--ion-color-primary);
      background: rgba(var(--ion-color-primary-rgb), 0.1);
    }

    .breadcrumb-current {
      display: flex;
      align-items: center;
      color: var(--ion-color-dark);
      font-weight: 500;
      padding: 4px 8px;
    }

    .breadcrumb-icon {
      font-size: 16px;
      margin-right: 4px;
    }

    .breadcrumb-text {
      white-space: nowrap;
    }

    .breadcrumb-separator {
      font-size: 12px;
      color: var(--ion-color-medium);
      margin: 0 4px;
    }

    .breadcrumb-item.active .breadcrumb-current {
      color: var(--ion-color-primary);
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .breadcrumb-nav {
        padding: 6px 12px;
      }
      
      .breadcrumb-list {
        font-size: 13px;
      }
      
      .breadcrumb-icon {
        font-size: 14px;
      }
      
      .breadcrumb-separator {
        font-size: 10px;
        margin: 0 2px;
      }
    }
  `]
})
export class BreadcrumbComponent {
  @Input() items: BreadcrumbItem[] = [];
}
