// src/app/pages/admin/admin-layout/admin-layout.component.ts
import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [IonicModule, RouterOutlet, NavbarComponent],
  template: `
    <app-admin-navbar>
      <router-outlet></router-outlet>
    </app-admin-navbar>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100vh;
      overflow: hidden;
    }
    
    /* Automatically reserve space for collapsed sidebar */
    :host ::ng-deep .content-wrapper {
      padding-left: 70px; /* Space for collapsed sidebar */
      transition: padding-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    /* When sidebar is expanded, keep the same padding so it overlaps */
    :host ::ng-deep .sidebar:not(.collapsed) ~ .content-wrapper {
      padding-left: 70px; /* Keep same padding - sidebar overlaps content */
    }
    
    /* Mobile: no padding needed */
    @media (max-width: 768px) {
      :host ::ng-deep .content-wrapper {
        padding-left: 0 !important;
      }
      
      :host ::ng-deep .sidebar {
        transform: translateX(-100%) !important;
      }
      
      :host ::ng-deep .sidebar.mobile-open {
        transform: translateX(0) !important;
      }
    }
  `]
})
export class AdminLayoutComponent {}