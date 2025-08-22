// navbar.component.ts
import { Component, OnInit } from '@angular/core';
import { IonicModule } from "@ionic/angular";
import { CommonModule } from '@angular/common';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular'
import { RecentSubmissionsModalComponent } from '@app/components/recent-submissions/recent-submissions-modal.component';
import { InspectionService } from '@app/services/inspection.service';

@Component({
  selector: 'app-admin-navbar',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnInit {
  today = new Date();
  isCollapsed = true;
  isMobileMenuOpen = false;
  hasNewSubmissions = true;


  menuItems = [
    { title: 'Dashboard', icon: 'home-outline', route: '/admin/dashboard', active: true },
    { title: 'Users', icon: 'people-outline', route: '/admin/users', active: false },
    {
      title: 'Pending Reviews', 
      icon: 'document-outline', 
      action: () => this.openPendingModal(), 
      active: false,
      hasNotification: () => this.hasNewSubmissions
    },
    { title: 'Analytics', icon: 'analytics-outline', route: '/admin/analytics', active: false },
    { title: 'Projects', icon: 'folder-outline', route: '/admin/projects', active: false },
    { title: 'Messages', icon: 'chatbubbles-outline', route: '/admin/messages', active: false },
    { title: 'Settings', icon: 'settings-outline', route: '/admin/settings', active: false }
  ];

  constructor(
    private auth: Auth,
    private router: Router,
    private modalCtrl: ModalController,
    private inspectionService: InspectionService
  ) {}

  ngOnInit() {
    this.checkForNewSubmissions();
  }

  async checkForNewSubmissions() {
  try {
    this.inspectionService.pendingSubmissions$(true, 10).subscribe({
      next: (newSubmissions) => {
        this.hasNewSubmissions = newSubmissions.length > 0;
        console.log('New submissions count:', newSubmissions.length);
      },
      error: (error) => {
        console.error('Error checking submissions:', error);
        this.hasNewSubmissions = false;
      }
    });
  } catch (error) {
    console.error('Error checking submissions:', error);
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
  
  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    console.log('Sidebar collapsed:', this.isCollapsed); // Debug log
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
  }

onMenuItemClick(item: any, event: Event) {
  // If sidebar is collapsed, expand it and don't navigate
  if (this.isCollapsed) {
    event.stopPropagation();
    this.toggleSidebar();
    return;
  }
  
  // If expanded, handle action or navigation
  // Remove active from all items
  this.menuItems.forEach(menuItem => menuItem.active = false);
  // Set clicked item as active
  item.active = true;
  
  // Check if item has an action (like opening a modal)
  if (item.action) {
    item.action(); // Execute the action (opens the modal)
  } else if (item.route) {
    // Navigate to route if no action
    this.router.navigate([item.route]);
  }
  
  // Close mobile menu if open
  this.closeMobileMenu();
}

  onSidebarAreaClick(event: Event) {
    // Only toggle if clicking on empty space (not on specific items)
    if (event.target === event.currentTarget) {
      this.toggleSidebar();
    }
  }

  onDateClick() {
    console.log('Date clicked:', this.today);
  }

  async logout() {
    await this.auth.signOut();
    this.router.navigate(['/login']);
  }
}