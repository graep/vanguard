// src/app/pages/admin/navbar/navbar.component.ts
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
import { NavbarStateService } from '@app/services/navbar-state.service';

import { RecentSubmissionsModalComponent } from '@app/components/recent-submissions/recent-submissions-modal.component';
import { InspectionService } from '@app/services/inspection.service';
import { NavService } from '@app/services/nav.service';
import { AuthService } from '@app/services/auth.service';

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

  // User info
  userDisplayName: string = 'User';

  private subs: Subscription[] = [];

  // Menu config (no manual 'active' flags; routing decides)
  menuItems = [
    { title: 'Dashboard', icon: 'home-outline', route: '/admin' },
    { title: 'Fleet', icon: 'car-outline', route: '/admin/fleet' },
    { title: 'Users', icon: 'people-outline', route: '/admin/users' },
    { title: 'Planning', icon: 'calendar-outline', route: '/admin/planning' },
    {
      title: 'Pending Submissions',
      icon: 'document-outline',
      action: () => this.openPendingModal(),
      hasNotification: () => this.hasNewSubmissions
    },
    { title: 'Projects', icon: 'folder-outline' },
    { title: 'Messages', icon: 'chatbubbles-outline' },
    { title: 'Settings', icon: 'settings-outline' }
  ];

  constructor(
    private auth: Auth,
    private router: Router,
    private modalCtrl: ModalController,
    private inspectionService: InspectionService,
    private navService: NavService,
    private navbarState: NavbarStateService,
    private authService: AuthService
  ) {}

  // ---------- Lifecycle ----------
  ngOnInit() {
    this.checkForNewSubmissions();
    this.loadUserInfo();
    
    // Subscribe to mobile menu state from service
    const mobileSub = this.navbarState.isMobileOpen$.subscribe(isOpen => {
      this.isMobileMenuOpen = isOpen;
    });
    this.subs.push(mobileSub);
    
    // Subscribe to collapsed state from service
    const collapsedSub = this.navbarState.isCollapsed$.subscribe(isCollapsed => {
      this.isCollapsed = isCollapsed;
    });
    this.subs.push(collapsedSub);
  }

  loadUserInfo() {
    const sub = this.authService.currentUserProfile$.subscribe(profile => {
      this.userDisplayName = this.authService.getDisplayName(profile);
    });
    this.subs.push(sub);
  }

  ngOnDestroy() {
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
    // Only toggle on desktop (not mobile)
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) {
      this.isCollapsed = !this.isCollapsed;
      this.navbarState.setCollapsed(this.isCollapsed);
    }
  }

  toggleMobileMenu() { 
    this.isMobileMenuOpen = !this.isMobileMenuOpen; 
    this.navbarState.setMobileOpen(this.isMobileMenuOpen);
  }
  
  closeMobileMenu() { 
    this.isMobileMenuOpen = false; 
    this.navbarState.setMobileOpen(false);
  }

  onSidebarClick(event: Event) {
    // On mobile, clicking anywhere on the sidebar (except menu items) closes it
    const isMobile = window.innerWidth <= 768;
    if (isMobile && this.isMobileMenuOpen) {
      const target = event.target as HTMLElement;
      // Don't close if clicking on a menu item (they handle their own clicks and close the menu)
      const isMenuItem = target.closest('.menu-item');
      const isLogo = target.closest('.logo');
      
      // Close if clicking on sidebar background, header (except logo), or empty areas
      if (!isMenuItem && !isLogo) {
        this.closeMobileMenu();
      }
    }
  }

  onSidebarHeaderClick(event: Event) {
    event.stopPropagation(); // Prevent sidebar click from firing
    const isMobile = window.innerWidth <= 768;
    if (isMobile && this.isMobileMenuOpen) {
      // On mobile, clicking header closes the menu
      this.closeMobileMenu();
    } else {
      // On desktop, toggle collapsed state
      this.toggleSidebar();
    }
  }

  onSidebarAreaClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.toggleSidebar();
    }
  }

  // Prevent dragging behavior on touch devices
  onTouchStart(event: TouchEvent) {
    // Don't prevent default - let clicks work normally
    // CSS touch-action: manipulation already handles preventing unwanted gestures
  }

  onTouchMove(event: TouchEvent) {
    // Don't prevent default - let clicks work normally
    // CSS touch-action: manipulation already handles preventing unwanted gestures
  }

  onMouseDown(event: MouseEvent) {
    // Prevent default mouse behavior if needed
    // This can be used to prevent text selection or other unwanted behaviors
  }

  handleItemClick(item: any, index: number, event: Event) {
    // Stop propagation to prevent sidebar area click from firing
    event.stopPropagation();
    
    // Close mobile menu when item is clicked
    if (this.isMobileMenuOpen) {
      this.closeMobileMenu();
    }

    // If item has an action, execute it
    if (item.action) {
      item.action();
    }
    // If item has a route, RouterLink will handle navigation
  }

  async logout() {
    try {
      await this.authService.logout();
      this.router.navigate(['/login'], { replaceUrl: true });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}