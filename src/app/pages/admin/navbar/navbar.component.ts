// src/app/pages/dashboard/navbar/navbar.component.ts
import {
  Component,
  OnInit,
  OnDestroy
} from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Auth } from '@angular/fire/auth';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { Subscription } from 'rxjs';

import { RecentSubmissionsModalComponent } from '@app/components/recent-submissions/recent-submissions-modal.component';
import { InspectionService } from '@app/services/inspection.service';

@Component({
  selector: 'app-admin-navbar',
  standalone: true,
  imports: [IonicModule, CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnInit, OnDestroy {
  // UI state
  today = new Date();
  isCollapsed = true; // Changed back to true - default collapsed
  isMobileMenuOpen = false;

  // notifications
  hasNewSubmissions = true;

  private subs: Subscription[] = [];

  // Menu config (no manual 'active' flags; routing decides)
  menuItems = [
    { title: 'Dashboard', icon: 'home-outline', route: '/admin' },
    { title: 'Users', icon: 'people-outline', route: '/admin/users' },
    {
      title: 'Pending Submissions',
      icon: 'document-outline',
      action: () => this.openPendingModal(),
      hasNotification: () => this.hasNewSubmissions
    },
    { title: 'Analytics', icon: 'analytics-outline', route: '/admin/analytics' },
    { title: 'Projects', icon: 'folder-outline', route: '/admin/projects' },
    { title: 'Messages', icon: 'chatbubbles-outline', route: '/admin/messages' },
    { title: 'Settings', icon: 'settings-outline', route: '/admin/settings' }
  ];

  constructor(
    private auth: Auth,
    private router: Router,
    private modalCtrl: ModalController,
    private inspectionService: InspectionService
  ) {}

  // ---------- Lifecycle ----------
  ngOnInit() {
    this.checkForNewSubmissions();
  }

  ngOnDestroy() {
    console.log('NavbarComponent ngOnDestroy called');
    this.subs.forEach(s => s.unsubscribe());
  }

  // ---------- Data / notifications ----------
  async checkForNewSubmissions() {
    try {
      const sub = this.inspectionService.pendingSubmissions$(true, 10).subscribe({
        next: (list) => { this.hasNewSubmissions = list.length > 0; },
        error: () => { this.hasNewSubmissions = false; }
      });
      this.subs.push(sub);
    } catch {
      this.hasNewSubmissions = false;
    }
  }

  async openPendingModal() {
    const modal = await this.modalCtrl.create({
      component: RecentSubmissionsModalComponent,
    });
    this.hasNewSubmissions = false;
    await modal.present();
  }

  setNewSubmissions(hasNew: boolean) {
    this.hasNewSubmissions = hasNew;
  }

  // ---------- Sidebar interactions ----------
  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }

  toggleMobileMenu() { 
    this.isMobileMenuOpen = !this.isMobileMenuOpen; 
  }
  
  closeMobileMenu() { 
    this.isMobileMenuOpen = false; 
  }

  onSidebarAreaClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.toggleSidebar();
    }
  }

  onDateClick() { 
    /* noop or open date picker */ 
  }

  async logout() {
    await this.auth.signOut();
    this.router.navigate(['/login']);
  }

  // ---------- Menu item clicks ----------
  /** Used by the template. Router handles navigation for items with a route.
   *  For action-only items (like the modal), run the action and keep the current route active. */
  handleItemClick(item: any, _index: number, ev: MouseEvent) {
    // Don't collapse on navigation - let user control sidebar state
    if (!item.route && item.action) {
      ev.stopPropagation();
      item.action();
    }

    this.closeMobileMenu();
  }

  /** Back-compat if your template still calls onMenuItemClick */
  onMenuItemClick(item: any, ev: Event) {
    this.handleItemClick(item, -1, ev as MouseEvent);
  }
}