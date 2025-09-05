import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { UserProfile } from '../../../services/auth.service';
import { UserManagementService } from '../../../services/user-management.service';
import { NavbarComponent } from '../navbar/navbar.component';

type FilterKey = 'all' | 'active' | 'drivers' | 'admins';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, NavbarComponent],
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
})
export class UsersPage implements OnInit {
  activeFilter: FilterKey = 'all';

  allUsers$!: Observable<UserProfile[]>;
  filteredUsers$!: Observable<UserProfile[]>;
  counts$!: Observable<{ total: number; active: number; drivers: number; admins: number }>;

  constructor(private userManagement: UserManagementService) {}

  ngOnInit() {
    this.allUsers$ = this.userManagement.getAllUsers();

    this.counts$ = this.allUsers$.pipe(
      map(users => ({
        total: users.length,
        active: users.filter(u => u.isActive).length,
        drivers: users.filter(u => u.role === 'driver').length,
        admins: users.filter(u => u.role === 'admin').length
      }))
    );

    this.applyFilter();
  }

  applyFilter() {
    this.filteredUsers$ = this.allUsers$.pipe(
      map(users => {
        switch (this.activeFilter) {
          case 'active': return users.filter(u => u.isActive);
          case 'drivers': return users.filter(u => u.role === 'driver');
          case 'admins': return users.filter(u => u.role === 'admin');
          default: return users;
        }
      })
    );
  }

  // Helpers
  trackByUserId(_: number, user: UserProfile) { return user.uid; }
  getRoleColor(role: string) { return role === 'admin' ? 'warning' : 'primary'; }
  getRoleIcon(role: string) { return role === 'admin' ? 'shield-checkmark' : 'car'; }

  formatDate(date: any): string {
    if (!date) return 'Unknown';
    const d = date instanceof Date
      ? date
      : typeof date?.toDate === 'function'
        ? date.toDate()
        : new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  getEmptyStateMessage(): string {
    switch (this.activeFilter) {
      case 'active': return 'No active users found';
      case 'drivers': return 'No drivers found';
      case 'admins': return 'No admin users found';
      default: return 'No users found';
    }
  }
}
