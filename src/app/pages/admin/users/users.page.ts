import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { UserProfile, Role } from '../../../services/auth.service';
import { UserManagementService } from '../../../services/user-management.service';

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

  constructor(private userManagement: UserManagementService) {}

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
        switch (filter) {
          case 'active':
            return users.filter((u) => u.isActive);
          case 'drivers':
            return users.filter((u) => this.has(u, 'driver'));
          case 'admins':
            return users.filter((u) => this.has(u, 'admin'));
          case 'owners':
            return users.filter((u) => this.has(u, 'owner'));
          case 'all':
          default:
            return users;
        }
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
        return 'ribbon';
      default:
        return 'car'; // driver
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
}
