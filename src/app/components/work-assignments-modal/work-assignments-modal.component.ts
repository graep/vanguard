import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonItem,
  IonLabel,
  IonChip,
  IonSpinner,
  ModalController
} from '@ionic/angular/standalone';
import { WorkDayDetails } from '../../services/schedule.service';
import { UserProfile, AuthService } from '../../services/auth.service';
import { UserManagementService } from '../../services/user-management.service';
import { firstValueFrom } from 'rxjs';

interface UserWithRole {
  uid?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  role: 'Driver' | 'Dispatch' | 'Extra' | 'Unassigned';
  clockIn?: string;
  clockOut?: string;
}

@Component({
  selector: 'app-work-assignments-modal',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonItem,
    IonLabel,
    IonChip,
    IonSpinner
  ],
  templateUrl: './work-assignments-modal.component.html',
  styleUrls: ['./work-assignments-modal.component.scss']
})
export class WorkAssignmentsModalComponent implements OnInit {
  @Input() workAssignments: Array<WorkDayDetails & { userId: string }> = [];
  @Input() selectedDate: string = '';

  private userManagementService = inject(UserManagementService);
  private authService = inject(AuthService);
  private modalCtrl = inject(ModalController);

  usersByRole: { role: string; users: UserWithRole[] }[] = [];
  isLoading = true;

  async ngOnInit() {
    await this.loadUsers();
  }

  async loadUsers() {
    this.isLoading = true;
    try {
      // Get all users
      const allUsers = await firstValueFrom(this.userManagementService.getAllUsers());
      
      // Create a map of userId to user profile
      const userMap = new Map<string, UserProfile>();
      allUsers.forEach((user: UserProfile) => {
        if (user.uid) {
          userMap.set(user.uid, user);
        }
      });

      // Group assignments by role and map to users
      const roleGroups: Record<string, UserWithRole[]> = {};

      this.workAssignments.forEach(assignment => {
        const role = assignment.role || 'Unassigned';
        const user = userMap.get(assignment.userId);
        
        if (user) {
          if (!roleGroups[role]) {
            roleGroups[role] = [];
          }
          
          roleGroups[role].push({
            uid: user.uid,
            email: user.email,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            displayName: user.displayName, // Include displayName if available
            role: role as 'Driver' | 'Dispatch' | 'Extra' | 'Unassigned',
            clockIn: assignment.clockIn,
            clockOut: assignment.clockOut
          });
        }
      });

      // Convert to array and sort
      this.usersByRole = Object.entries(roleGroups)
        .map(([role, users]) => ({
          role,
          users: users.sort((a, b) => {
            const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
            const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
            return nameA.localeCompare(nameB);
          })
        }))
        .sort((a, b) => {
          // Sort: Driver, Dispatch, Extra, then Unassigned
          const order: Record<string, number> = { 'Driver': 1, 'Dispatch': 2, 'Extra': 3, 'Unassigned': 4 };
          return (order[a.role] || 99) - (order[b.role] || 99);
        });
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      this.isLoading = false;
    }
  }

  getUserDisplayName(user: UserWithRole): string {
    // Prioritize firstName and lastName
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`.trim();
    }
    if (user.firstName) {
      return user.firstName;
    }
    if (user.lastName) {
      return user.lastName;
    }
    // Fallback to displayName if available (from UserProfile)
    if ((user as any).displayName) {
      return (user as any).displayName;
    }
    // Last resort: use email but extract name part before @
    if (user.email) {
      const emailName = user.email.split('@')[0];
      // Capitalize first letter of each word
      return emailName.split('.').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }
    return 'Unknown User';
  }

  getFormattedDate(): string {
    if (!this.selectedDate) return '';
    const [year, month, day] = this.selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  formatTime12Hour(time24: string | undefined): string {
    if (!time24) return 'TBD';
    
    try {
      const [hours, minutes] = time24.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) return time24;
      
      const period = hours >= 12 ? 'PM' : 'AM';
      const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      const minutesStr = minutes.toString().padStart(2, '0');
      
      return `${hours12}:${minutesStr} ${period}`;
    } catch (error) {
      return time24;
    }
  }

  getTimeRange(clockIn: string | undefined, clockOut: string | undefined): string {
    const inTime = this.formatTime12Hour(clockIn);
    const outTime = this.formatTime12Hour(clockOut);
    return `${inTime} - ${outTime}`;
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}

