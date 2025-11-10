import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';

import { UserProfile, Role, AuthService } from '../../../services/auth.service';
import { UserManagementService } from '../../../services/user-management.service';
import { BreadcrumbService } from '../../../services/breadcrumb.service';

type FilterKey = 'all' | 'active' | 'drivers' | 'admins' | 'owners';

interface Counts {
  total: number;
  active: number;
  drivers: number;
  admins: number;
  owners: number;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
})
export class UsersPage implements OnInit {
  // UI state for <ion-segment>
  activeFilter: FilterKey = 'all';
  private filter$ = new BehaviorSubject<FilterKey>('all');

  // Streams
  allUsers$!: Observable<UserProfile[]>;
  filteredUsers$!: Observable<UserProfile[]>;
  counts$!: Observable<Counts>;

  constructor(
    private userManagement: UserManagementService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private breadcrumbService: BreadcrumbService
  ) {}

  ngOnInit() {
    this.allUsers$ = this.userManagement.getAllUsers();

    // Header counts
    this.counts$ = this.allUsers$.pipe(
      map((users) => ({
        total: users.length,
        active: users.filter((u) => u.isActive).length,
        drivers: users.filter((u) => this.has(u, 'driver')).length,
        admins: users.filter((u) => this.has(u, 'admin')).length,
        owners: users.filter((u) => this.has(u, 'owner')).length,
      }))
    );

    // Apply filter
    this.filteredUsers$ = combineLatest([this.allUsers$, this.filter$]).pipe(
      map(([users, filter]) => {
        let filtered: UserProfile[];
        
        switch (filter) {
          case 'active':
            filtered = users.filter((u) => u.isActive);
            break;
          case 'drivers':
            filtered = users.filter((u) => this.has(u, 'driver'));
            break;
          case 'admins':
            filtered = users.filter((u) => this.has(u, 'admin'));
            break;
          case 'owners':
            filtered = users.filter((u) => this.has(u, 'owner'));
            break;
          case 'all':
          default:
            filtered = users;
        }
        
        // Sort by role hierarchy (owner > admin > driver > no role)
        return this.sortUsersByRole(filtered);
      })
    );
  }

  // Segment handlers
  onSegmentChange(ev: CustomEvent) {
    const raw = (ev.detail as any)?.value as string | null;
    const next = (raw ?? 'all') as FilterKey;
    this.setFilter(next);
  }
  setFilter(f: FilterKey) {
    this.activeFilter = f;
    this.filter$.next(f);
  }

  // Helpers
  private has(u: UserProfile, r: Role): boolean {
    return u.roles?.includes(r) ?? false;
  }

  /**
   * Sort users by their highest role hierarchy (owner > admin > driver > no role)
   * Returns users sorted from highest to lowest rank
   */
  private sortUsersByRole(users: UserProfile[]): UserProfile[] {
    // Define role hierarchy (higher number = higher rank)
    const roleHierarchy: Record<Role, number> = {
      'owner': 3,
      'admin': 2,
      'driver': 1
    };
    
    // Get the highest role rank for a user
    const getUserRank = (user: UserProfile): number => {
      if (!user.roles || user.roles.length === 0) {
        return 0; // No roles = lowest rank
      }
      
      const ranks = user.roles.map(role => roleHierarchy[role] || 0);
      return Math.max(...ranks); // Get the highest rank
    };
    
    // Sort users by their highest role (descending order)
    return [...users].sort((a, b) => {
      const rankA = getUserRank(a);
      const rankB = getUserRank(b);
      return rankB - rankA; // Descending order (highest first)
    });
  }

  /**
   * Sort roles by hierarchy (owner > admin > driver)
   * Returns roles sorted from highest to lowest rank
   */
  getSortedRoles(user: UserProfile): Role[] {
    if (!user.roles || user.roles.length === 0) {
      return [];
    }
    
    // Define role hierarchy (higher number = higher rank)
    const roleHierarchy: Record<Role, number> = {
      'owner': 3,
      'admin': 2,
      'driver': 1
    };
    
    // Sort roles by hierarchy (highest first)
    return [...user.roles].sort((a, b) => {
      const rankA = roleHierarchy[a] || 0;
      const rankB = roleHierarchy[b] || 0;
      return rankB - rankA; // Descending order (highest first)
    });
  }

  trackByUserId(_: number, user: UserProfile) {
    return user.uid;
  }
  trackByRole(_: number, r: Role) {
    return r;
  }

  getRoleColor(role: Role) {
    switch (role) {
      case 'admin':
        return 'warning';
      case 'owner':
        return 'tertiary';
      default:
        return 'primary'; // driver
    }
  }

  getRoleIcon(role: Role) {
    switch (role) {
      case 'admin':
        return 'shield-checkmark';
      case 'owner':
        return 'star';
      default:
        return 'car'; // driver
    }
  }

  /**
   * Get the highest ranking role from a user's roles array
   * Hierarchy: owner > admin > driver
   */
  getHighestRole(user: UserProfile): Role | null {
    if (!user.roles || user.roles.length === 0) {
      return null;
    }
    
    // Check in order of hierarchy (highest to lowest)
    if (user.roles.includes('owner')) {
      return 'owner';
    }
    if (user.roles.includes('admin')) {
      return 'admin';
    }
    if (user.roles.includes('driver')) {
      return 'driver';
    }
    
    return null;
  }

  /**
   * Get the avatar icon based on the user's highest role
   * Returns the icon name for the highest ranking role, or 'person-circle' as fallback
   */
  getAvatarIcon(user: UserProfile): string {
    const highestRole = this.getHighestRole(user);
    
    if (!highestRole) {
      return 'person-circle';
    }
    
    // Use role-specific icons for avatars
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

  getDisplayName(user: UserProfile): string {
    return this.authService.getDisplayName(user) || 'Unnamed User';
  }

  getEmptyStateMessage(): string {
    switch (this.activeFilter) {
      case 'active':
        return 'No active users found';
      case 'drivers':
        return 'No drivers found';
      case 'admins':
        return 'No admin users found';
      case 'owners':
        return 'No owners found';
      default:
        return 'No users found';
    }
  }

  viewUser(user: UserProfile): void {
    // Prime breadcrumb so it shows immediately on navigation
    if (user) {
      this.breadcrumbService.setTail([
        { label: this.getDisplayName(user), icon: 'person' }
      ]);
    }
    // Navigate to the user detail page using the user's uid
    // Navigate relative to parent (admin) route, not the current users route
    this.router.navigate(['user', user.uid], { relativeTo: this.route.parent });
  }
}
