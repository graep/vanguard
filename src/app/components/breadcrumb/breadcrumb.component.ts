import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { BreadcrumbService } from '@app/services/breadcrumb.service';

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
        <li *ngFor="let item of items; let last = last; let i = index" class="breadcrumb-item" [class.active]="last">
          <ng-container *ngIf="item.url && !last; else noLink">
            <a [routerLink]="item.url" class="breadcrumb-link" (click)="onItemClick(i)">
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
      padding: 6px 16px;
      background: transparent;
      border-bottom: none;
    }

    .breadcrumb-list {
      display: flex;
      align-items: center;
      list-style: none;
      margin: 0;
      padding: 0;
      font-size: 12px;
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
      color: rgba(255, 255, 255, 0.7);
      padding: 4px 8px;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .breadcrumb-link:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.1);
    }

    .breadcrumb-current {
      display: flex;
      align-items: center;
      color: rgba(255, 255, 255, 0.9);
      font-weight: 500;
      padding: 4px 8px;
    }

    .breadcrumb-icon {
      font-size: 14px;
      margin-right: 4px;
    }

    .breadcrumb-text {
      white-space: nowrap;
    }

    .breadcrumb-separator {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
      margin: 0 4px;
    }

    .breadcrumb-item.active .breadcrumb-current {
      color: #3b82f6;
      
      .breadcrumb-icon {
        color: #3b82f6;
      }
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .breadcrumb-nav {
        padding: 6px 12px;
      }
      
      .breadcrumb-list {
        font-size: 11px;
      }
      
      .breadcrumb-icon {
        font-size: 12px;
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

  private breadcrumbService = inject(BreadcrumbService);

  onItemClick(index: number): void {
    // Trim the tail immediately to the clicked item to avoid flicker during navigation
    // IMPORTANT: Admin layout always prepends the base Dashboard item, so we must
    // pass ONLY the dynamic tail (exclude the first Dashboard item) back to the service.
    if (!this.items || index < 0) return;
    const inclusive = this.items.slice(0, index + 1);
    const dynamicTail = inclusive.length > 0 ? inclusive.slice(1) : [];
    this.breadcrumbService.setTail(dynamicTail);
  }
}
