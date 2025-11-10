// src/app/pages/admin/user-details/user-details.page.ts
import { Component, OnInit, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  IonContent,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonButton,
  IonIcon,
  IonChip,
  IonLabel,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { UserProfile, Role, AuthService } from '../../../services/auth.service';
import { BreadcrumbService } from '@app/services/breadcrumb.service';
import { UserManagementService } from '../../../services/user-management.service';

@Component({
  selector: 'app-user-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonContent,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonButton,
    IonIcon,
    IonChip,
    IonLabel
  ],
  templateUrl: './user-details.page.html',
  styleUrls: ['./user-details.page.scss'],
  encapsulation: ViewEncapsulation.None
})
export class UserDetailsPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private firestore = inject(Firestore);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private breadcrumbService = inject(BreadcrumbService);
  private authService = inject(AuthService);
  private userManagement = inject(UserManagementService);

  user: UserProfile | null = null;
  loading = true;
  errorMsg = '';
  activeTab: string = 'overview';
  tabs = [
    { id: 'overview', label: 'Overview', icon: 'person' },
    { id: 'activity', label: 'Activity', icon: 'time' },
    { id: 'permissions', label: 'Permissions', icon: 'shield-checkmark' }
  ];

  // Placeholder data for Overview tab
  overviewStats = {
    totalInspections: 0,
    inspectionsThisMonth: 0,
    vansAssigned: 0,
    issuesReported: 0,
    notesAdded: 0
  };

  // Placeholder data for Activity tab
  recentActivity: any[] = [];
  inspectionHistory: any[] = [];
  loginHistory: any[] = [];

  async ngOnInit() {
    this.loading = true;
    // Only set a placeholder if no tail was primed by the previous page
    if (!this.breadcrumbService.getTail()?.length) {
      this.breadcrumbService.setTail([
        { label: 'User Details', icon: 'person' }
      ]);
    }
    
    const userId = this.route.snapshot.paramMap.get('id');
    if (!userId) {
      this.errorMsg = 'No user ID provided';
      this.loading = false;
      return;
    }

    try {
      await this.loadUserData(userId);
      if (this.user) {
        // Set layout-level breadcrumb tail with specific user label
        this.breadcrumbService.setTail([
          { label: this.getDisplayName(), icon: 'person' }
        ]);
      }
    } catch (error: any) {
      this.errorMsg = error.message || 'Failed to load user data';
    } finally {
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    // Intentionally do not clear breadcrumb here to avoid flicker when navigating
  }

  private async loadUserData(userId: string) {
    const userDocRef = doc(this.firestore, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      this.user = { uid: userDoc.id, ...userDoc.data() } as UserProfile;
    } else {
      throw new Error('User not found');
    }
  }

  getDisplayName(): string {
    return this.user ? this.authService.getDisplayName(this.user) || 'Unnamed User' : '';
  }

  getHighestRole(): Role | null {
    if (!this.user?.roles || this.user.roles.length === 0) {
      return null;
    }
    
    // Check in order of hierarchy (highest to lowest)
    if (this.user.roles.includes('owner')) {
      return 'owner';
    }
    if (this.user.roles.includes('admin')) {
      return 'admin';
    }
    if (this.user.roles.includes('driver')) {
      return 'driver';
    }
    
    return null;
  }

  getAvatarIcon(): string {
    const highestRole = this.getHighestRole();
    
    if (!highestRole) {
      return 'person-circle';
    }
    
    switch (highestRole) {
      case 'owner':
        return 'star';
      case 'admin':
        return 'shield-checkmark';
      case 'driver':
        return 'car';
      default:
        return 'person-circle';
    }
  }

  getSortedRoles(): Role[] {
    if (!this.user?.roles || this.user.roles.length === 0) {
      return [];
    }
    
    const roleHierarchy: Record<Role, number> = {
      'owner': 3,
      'admin': 2,
      'driver': 1
    };
    
    return [...this.user.roles].sort((a, b) => {
      const rankA = roleHierarchy[a] || 0;
      const rankB = roleHierarchy[b] || 0;
      return rankB - rankA;
    });
  }

  getRoleIcon(role: Role): string {
    switch (role) {
      case 'admin':
        return 'shield-checkmark';
      case 'owner':
        return 'star';
      default:
        return 'car';
    }
  }

  getStatusColor(): string {
    return this.user?.isActive ? 'success' : 'danger';
  }

  getStatusText(): string {
    return this.user?.isActive ? 'Active' : 'Inactive';
  }

  getStatusIcon(): string {
    return this.user?.isActive ? 'checkmark-circle' : 'close-circle';
  }

  formatDate(date: any): string {
    if (!date) return 'Unknown';
    const d =
      date instanceof Date
        ? date
        : typeof date?.toDate === 'function'
        ? date.toDate()
        : new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  async toggleActiveStatus() {
    if (!this.user) return;

    const alert = await this.alertCtrl.create({
      header: 'Change User Status',
      message: `Are you sure you want to ${this.user.isActive ? 'deactivate' : 'activate'} this user?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Confirm',
          handler: async () => {
            try {
              await this.userManagement.toggleUserStatus(this.user!.uid, !this.user!.isActive);

              // Update local state
              this.user!.isActive = !this.user!.isActive;

              const toast = await this.toastCtrl.create({
                message: `User ${this.user!.isActive ? 'activated' : 'deactivated'} successfully`,
                duration: 2000,
                color: 'success'
              });
              toast.present();

            } catch (error: any) {
              const toast = await this.toastCtrl.create({
                message: 'Failed to update user status',
                duration: 2000,
                color: 'danger'
              });
              toast.present();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async sendMessage() {
    if (!this.user) return;

    const toast = await this.toastCtrl.create({
      message: `Messaging feature coming soon for ${this.getDisplayName()}`,
      duration: 2000,
      color: 'info'
    });
    toast.present();

    // TODO: Implement messaging functionality
    // This could navigate to a messaging page or open a message modal
    // Example: this.router.navigate(['/admin/messages', this.user.uid]);
  }

  // Overview Tab Methods
  getRoleDescription(role: Role): string {
    switch (role) {
      case 'owner':
        return 'Full system access and control';
      case 'admin':
        return 'Administrative access to manage users and fleet';
      case 'driver':
        return 'Can perform inspections and report issues';
      default:
        return 'No description available';
    }
  }

  // Activity Tab Methods
  // TODO: Implement data loading from services
  // These are placeholder methods that return empty arrays for now

  // Permissions Tab Methods
  getEffectivePermissions(): string[] {
    if (!this.user?.roles) return [];
    
    const permissions: string[] = [];
    
    if (this.user.roles.includes('owner')) {
      permissions.push('Full system access');
      permissions.push('User management');
      permissions.push('Fleet management');
      permissions.push('View all reports');
      permissions.push('System configuration');
    } else if (this.user.roles.includes('admin')) {
      permissions.push('User management');
      permissions.push('Fleet management');
      permissions.push('View all reports');
      permissions.push('Issue management');
    } else if (this.user.roles.includes('driver')) {
      permissions.push('Perform inspections');
      permissions.push('Report issues');
      permissions.push('Add notes');
      permissions.push('View assigned vans');
    }
    
    return permissions;
  }

  hasUserManagementAccess(): boolean {
    return this.user?.roles?.includes('owner') || this.user?.roles?.includes('admin') || false;
  }

  hasSystemSettingsAccess(): boolean {
    return this.user?.roles?.includes('owner') || false;
  }

  canManageRoles(): boolean {
    // TODO: Check if current user has permission to manage roles
    // For now, return false as placeholder
    return false;
  }

  getRoleChangeHistory(): any[] {
    // TODO: Load role change history from service
    return [];
  }

  selectTab(tabId: string): void {
    this.activeTab = tabId;
  }

  goBack() {
    this.router.navigate(['/admin/users']);
  }
}

