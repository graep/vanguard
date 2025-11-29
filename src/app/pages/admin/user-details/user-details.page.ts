// src/app/pages/admin/user-details/user-details.page.ts
import { Component, OnInit, inject, ViewEncapsulation, NgZone } from '@angular/core';
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
import { Firestore, doc, getDoc, setDoc, collection, query, where, orderBy, getDocs } from '@angular/fire/firestore';
import { UserProfile, Role, AuthService } from '../../../services/auth.service';
import { BreadcrumbService } from '@app/services/breadcrumb.service';
import { UserManagementService } from '../../../services/user-management.service';
import { InspectionService, Inspection } from '../../../services/inspection.service';
import { SafetyViolationService } from '../../../services/safety-violation.service';
import { SafetyViolation, SafetyViolationType, SAFETY_VIOLATION_TYPES } from '../../../models/safety-violation.model';
import { AddSafetyViolationModalComponent } from '../../../components/add-safety-violation-modal/add-safety-violation-modal.component';
import { ModalController } from '@ionic/angular/standalone';
import { Timestamp } from 'firebase/firestore';
import { UserScheduleCalendarComponent } from '../../../components/user-schedule-calendar/user-schedule-calendar.component';

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
    IonLabel,
    UserScheduleCalendarComponent
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
  private inspectionService = inject(InspectionService);
  private safetyViolationService = inject(SafetyViolationService);
  private modalCtrl = inject(ModalController);
  private ngZone = inject(NgZone);

  user: UserProfile | null = null;
  loading = true;
  errorMsg = '';
  activeTab: string = 'overview';
  tabs = [
    { id: 'overview', label: 'Overview', icon: 'person' },
    { id: 'activity', label: 'Activity', icon: 'time' },
    { id: 'permissions', label: 'Permissions', icon: 'shield-checkmark' },
    { id: 'schedule', label: 'Schedule', icon: 'calendar' }
  ];

  // Placeholder data for Overview tab
  overviewStats = {
    inspectionsThisMonth: 0,
    vansAssigned: 0,
    issuesReported: 0,
    notesAdded: 0
  };

  // Placeholder data for Activity tab
  recentActivity: any[] = [];
  inspectionHistory: any[] = [];
  loginHistory: any[] = [];

  // Safety Violations
  weeklyViolations: SafetyViolation[] = [];
  allTimeViolations: SafetyViolation[] = [];
  showAllTimeViolations = false;
  violationCounts: Record<SafetyViolationType, number> = {
    'Speeding': 0,
    'Distraction': 0,
    'Stop Sign': 0,
    'Follow Distance': 0,
    'Red Light': 0,
    'Seatbelt': 0,
    'Hard Turn': 0,
    'Roadside': 0,
    'Weaving': 0
  };

  isMobile = false;
  private resizeListener?: () => void;

  async ngOnInit() {
    this.loading = true;
    // Check if mobile (430px and below)
    this.isMobile = window.innerWidth <= 430;
    
    // Listen for window resize to update mobile state
    this.resizeListener = () => {
      this.isMobile = window.innerWidth <= 430;
    };
    window.addEventListener('resize', this.resizeListener);
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
        // Load inspections and stats
        await this.loadInspections(userId);
        await this.loadSafetyViolations(userId);
        this.updateOverviewStats();
      }
    } catch (error: any) {
      this.errorMsg = error.message || 'Failed to load user data';
    } finally {
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    // Intentionally do not clear breadcrumb here to avoid flicker when navigating
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
  }

  private async loadUserData(userId: string) {
    const userDocRef = doc(this.firestore, 'users', userId);
    // Wrap in NgZone to ensure Firebase API is called within injection context
    const userDoc = await this.ngZone.run(() => getDoc(userDocRef));
    
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

  private async loadInspections(userId: string): Promise<void> {
    try {
      const inspectionsRef = collection(this.firestore, 'inspections');
      const q = query(
        inspectionsRef,
        where('createdBy', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      // Wrap in NgZone to ensure Firebase API is called within injection context
      const querySnapshot = await this.ngZone.run(() => getDocs(q));
      
      this.inspectionHistory = querySnapshot.docs.map(doc => {
        const data = doc.data();
        let createdAt: Date;
        
        if (data['createdAt'] instanceof Timestamp) {
          createdAt = data['createdAt'].toDate();
        } else if (data['createdAt'] instanceof Date) {
          createdAt = data['createdAt'];
        } else if (data['createdAt']) {
          createdAt = new Date(data['createdAt']);
        } else {
          createdAt = new Date(); // Fallback
        }
        
        return {
          id: doc.id,
          vanType: data['vanType'] || '',
          vanNumber: data['vanNumber'] || '',
          status: data['status'] || 'pending',
          date: this.formatDate(createdAt),
          createdAt: createdAt,
          reportId: doc.id
        };
      });
      
    } catch (error: any) {
      console.error('[UserDetails] Error loading inspections:', error);
      console.error('[UserDetails] Error code:', error?.code);
      console.error('[UserDetails] Error message:', error?.message);
      
      // If it's a missing index error, try without orderBy as fallback
      if (error?.code === 'failed-precondition') {
        console.warn('[UserDetails] Index missing, trying query without orderBy');
        try {
          const inspectionsRef = collection(this.firestore, 'inspections');
          const q = query(
            inspectionsRef,
            where('createdBy', '==', userId)
          );
          
          const querySnapshot = await getDocs(q);
          this.inspectionHistory = querySnapshot.docs.map(doc => {
            const data = doc.data();
            let createdAt: Date;
            
            if (data['createdAt'] instanceof Timestamp) {
              createdAt = data['createdAt'].toDate();
            } else if (data['createdAt'] instanceof Date) {
              createdAt = data['createdAt'];
            } else if (data['createdAt']) {
              createdAt = new Date(data['createdAt']);
            } else {
              createdAt = new Date();
            }
            
            return {
              id: doc.id,
              vanType: data['vanType'] || '',
              vanNumber: data['vanNumber'] || '',
              status: data['status'] || 'pending',
              date: this.formatDate(createdAt),
              createdAt: createdAt,
              reportId: doc.id
            };
          });
          
          // Sort manually by date descending
          this.inspectionHistory.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        } catch (fallbackError) {
          console.error('[UserDetails] Fallback query also failed:', fallbackError);
          this.inspectionHistory = [];
        }
      } else {
        this.inspectionHistory = [];
      }
    }
  }

  private updateOverviewStats(): void {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    this.overviewStats.inspectionsThisMonth = this.inspectionHistory.filter(inspection => {
      return inspection.createdAt >= startOfMonth;
    }).length;
    
    // TODO: Load other stats (vansAssigned, issuesReported, notesAdded) from other services
  }

  getWeeklyViolationCount(): number {
    return this.weeklyViolations.length;
  }

  viewInspection(inspection: any): void {
    if (inspection.id) {
      // Prime breadcrumb for Van Report
      this.breadcrumbService.setTail([
        { label: `${inspection.vanType} ${inspection.vanNumber}`, icon: 'car' },
        { label: 'Van Report' }
      ]);
      this.router.navigate(['/admin/van-report', inspection.id]);
    }
  }

  private async loadSafetyViolations(userId: string): Promise<void> {
    try {
      // Load weekly violations
      this.weeklyViolations = await this.safetyViolationService.getWeeklyViolations(userId);
      
      // Calculate violation counts for the week
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(now.getFullYear(), now.getMonth(), diff);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);


      this.violationCounts = await this.safetyViolationService.getViolationCountsByType(
        userId,
        monday,
        sunday
      );
    } catch (error: any) {
      console.error('[UserDetails] Error loading safety violations:', error);
      this.weeklyViolations = [];
      // Reset counts on error
      this.violationCounts = {
        'Speeding': 0,
        'Distraction': 0,
        'Stop Sign': 0,
        'Follow Distance': 0,
        'Red Light': 0,
        'Seatbelt': 0,
        'Hard Turn': 0,
        'Roadside': 0,
        'Weaving': 0
      };
    }
  }

  async toggleAllTimeView(): Promise<void> {
    if (!this.user) return;

    if (!this.showAllTimeViolations) {
      // Load all-time violations
      try {
        this.allTimeViolations = await this.safetyViolationService.getAllTimeViolations(this.user.uid);
      } catch (error: any) {
        console.error('[UserDetails] Error loading all-time violations:', error);
        const toast = await this.toastCtrl.create({
          message: 'Failed to load all-time violations',
          duration: 2000,
          color: 'danger'
        });
        toast.present();
        return;
      }
    }

    this.showAllTimeViolations = !this.showAllTimeViolations;
  }

  async addSafetyViolation(): Promise<void> {
    if (!this.user) return;

    const modal = await this.modalCtrl.create({
      component: AddSafetyViolationModalComponent,
      cssClass: 'add-violation-modal'
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'saved' && data) {
      await this.handleAddViolation({
        violationType: data.violationType,
        occurredAt: data.occurredAt,
        notes: data.notes
      });
    }
  }

  private async handleAddViolation(data: { violationType: SafetyViolationType; occurredAt: Date; notes?: string }): Promise<void> {
    try {
      const currentUser = this.authService.currentUserProfile$.value;
      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      if (!this.user) {
        throw new Error('User not loaded');
      }
      
      
      await this.safetyViolationService.addViolation({
        userId: this.user.uid,
        violationType: data.violationType,
        occurredAt: data.occurredAt,
        createdBy: currentUser.uid,
        notes: data.notes
      });

      // Reload violations
      await this.loadSafetyViolations(this.user.uid);
      if (this.showAllTimeViolations) {
        this.allTimeViolations = await this.safetyViolationService.getAllTimeViolations(this.user.uid);
      }

      const toast = await this.toastCtrl.create({
        message: 'Safety violation added successfully',
        duration: 2000,
        color: 'success'
      });
      toast.present();
    } catch (error: any) {
      console.error('[UserDetails] Error adding violation:', error);
      const toast = await this.toastCtrl.create({
        message: 'Failed to add safety violation: ' + (error.message || 'Unknown error'),
        duration: 3000,
        color: 'danger'
      });
      toast.present();
    }
  }

  formatViolationDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getViolationIcon(type: SafetyViolationType): string {
    const icons: Record<SafetyViolationType, string> = {
      'Speeding': 'speedometer',
      'Distraction': 'phone-portrait',
      'Stop Sign': 'stop',
      'Follow Distance': 'car',
      'Red Light': 'warning',
      'Seatbelt': 'shield',
      'Hard Turn': 'arrow-redo',
      'Roadside': 'warning',
      'Weaving': 'swap-horizontal'
    };
    return icons[type] || 'alert-circle';
  }

  get violationTypes(): SafetyViolationType[] {
    return SAFETY_VIOLATION_TYPES;
  }
}

