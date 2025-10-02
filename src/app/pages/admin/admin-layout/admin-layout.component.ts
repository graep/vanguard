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
  `]
})
export class AdminLayoutComponent {}