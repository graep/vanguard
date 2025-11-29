import { Component, Input, Output, EventEmitter, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface UserCounts {
  total: number;
  active: number;
  drivers: number;
  admins: number;
  owners: number;
}

@Component({
  selector: 'app-users-control-container',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <!-- Search Section -->
      <div class="search-section">
        <div class="search-container">
          <div class="search-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </div>
          <input
            type="text"
            class="search-input"
            [placeholder]="searchPlaceholder"
            [(ngModel)]="searchValue"
            (input)="onSearchChange($event)"
          />
          <button *ngIf="searchValue" class="clear-button" (click)="clearSearch()" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <!-- Status Section -->
      <div class="status-section">
        <div class="totals-container">
          <div class="total-container">
            <span class="total-number">{{ counts.total }}</span>
          </div>
        </div>

        <!-- Filter Button with Dropdown -->
        <div class="filter-container">
          <button 
            class="filter-button"
            [class.filter-active]="hasActiveFilters"
            (click)="toggleFilterDropdown()"
            type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            <span *ngIf="activeFilterCount > 0" class="filter-badge">{{ activeFilterCount }}</span>
            <svg 
              class="filter-arrow"
              [class.filter-arrow-open]="isFilterDropdownOpen"
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          <!-- Filter Dropdown -->
          <div 
            class="filter-dropdown"
            [class.filter-dropdown-open]="isFilterDropdownOpen"
            *ngIf="isFilterDropdownOpen">
            <!-- Role Filters -->
            <div class="filter-group">
              <div class="filter-group-header">Role</div>
              <div class="filter-options">
                <label 
                  class="filter-option"
                  (click)="toggleRoleFilter('driver')">
                  <input
                    type="checkbox"
                    [checked]="selectedRoleFilters.has('driver')"
                    (change)="toggleRoleFilter('driver')"
                    class="filter-checkbox">
                  <div class="filter-option-content">
                    <div class="filter-option-indicator" style="background-color: #4CAF50;"></div>
                    <span class="filter-option-label">Drivers</span>
                    <span class="filter-option-count">{{ counts.drivers }}</span>
                  </div>
                </label>
                
                <label 
                  class="filter-option"
                  (click)="toggleRoleFilter('admin')">
                  <input
                    type="checkbox"
                    [checked]="selectedRoleFilters.has('admin')"
                    (change)="toggleRoleFilter('admin')"
                    class="filter-checkbox">
                  <div class="filter-option-content">
                    <div class="filter-option-indicator" style="background-color: #FF9800;"></div>
                    <span class="filter-option-label">Admins</span>
                    <span class="filter-option-count">{{ counts.admins }}</span>
                  </div>
                </label>
                
                <label 
                  class="filter-option"
                  (click)="toggleRoleFilter('owner')">
                  <input
                    type="checkbox"
                    [checked]="selectedRoleFilters.has('owner')"
                    (change)="toggleRoleFilter('owner')"
                    class="filter-checkbox">
                  <div class="filter-option-content">
                    <div class="filter-option-indicator" style="background-color: #9C27B0;"></div>
                    <span class="filter-option-label">Owners</span>
                    <span class="filter-option-count">{{ counts.owners }}</span>
                  </div>
                </label>
              </div>
            </div>

            <!-- Status Filters -->
            <div class="filter-group">
              <div class="filter-group-header">Status</div>
              <div class="filter-options">
                <label 
                  class="filter-option"
                  (click)="toggleStatusFilter('active')">
                  <input
                    type="checkbox"
                    [checked]="selectedStatusFilters.has('active')"
                    (change)="toggleStatusFilter('active')"
                    class="filter-checkbox">
                  <div class="filter-option-content">
                    <div class="filter-option-indicator" style="background-color: #22c55e;"></div>
                    <span class="filter-option-label">Active</span>
                    <span class="filter-option-count">{{ counts.active }}</span>
                  </div>
                </label>
                
                <label 
                  class="filter-option"
                  (click)="toggleStatusFilter('inactive')">
                  <input
                    type="checkbox"
                    [checked]="selectedStatusFilters.has('inactive')"
                    (change)="toggleStatusFilter('inactive')"
                    class="filter-checkbox">
                  <div class="filter-option-content">
                    <div class="filter-option-indicator" style="background-color: #ef4444;"></div>
                    <span class="filter-option-label">Inactive</span>
                    <span class="filter-option-count">{{ counts.total - counts.active }}</span>
                  </div>
                </label>
              </div>
            </div>

            <!-- Clear Filters Button -->
            <div class="filter-actions" *ngIf="hasActiveFilters">
              <button class="filter-clear-button" (click)="clearAllFilters()" type="button">
                Clear All Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="progress-bar">
        <div class="progress-track">
          <div class="progress-segment" 
               [style.width.%]="getProgressWidth(counts.drivers, counts.total)" 
               style="background-color: #4CAF50;"></div>
          <div class="progress-segment" 
               [style.width.%]="getProgressWidth(counts.admins, counts.total)" 
               style="background-color: #FF9800;"></div>
          <div class="progress-segment" 
               [style.width.%]="getProgressWidth(counts.owners, counts.total)" 
               style="background-color: #9C27B0;"></div>
        </div>
        <div class="progress-shimmer"></div>
      </div>
    </div>
  `,
  styleUrls: ['./users-control-container.component.scss']
})
export class UsersControlContainerComponent implements OnInit {
  @Input() counts: UserCounts = { total: 0, active: 0, drivers: 0, admins: 0, owners: 0 };
  @Input() searchPlaceholder: string = 'Search by name or email';

  @Output() searchChange = new EventEmitter<string>();
  @Output() roleFiltersChange = new EventEmitter<Set<string>>();
  @Output() statusFiltersChange = new EventEmitter<Set<string>>();

  searchValue: string = '';
  isFilterDropdownOpen: boolean = false;
  selectedRoleFilters: Set<string> = new Set();
  selectedStatusFilters: Set<string> = new Set();

  constructor(private elementRef: ElementRef) {}

  ngOnInit(): void {}

  get hasActiveFilters(): boolean {
    return this.selectedRoleFilters.size > 0 || this.selectedStatusFilters.size > 0;
  }

  get activeFilterCount(): number {
    return this.selectedRoleFilters.size + this.selectedStatusFilters.size;
  }

  toggleFilterDropdown(): void {
    this.isFilterDropdownOpen = !this.isFilterDropdownOpen;
  }

  toggleRoleFilter(role: string): void {
    if (this.selectedRoleFilters.has(role)) {
      this.selectedRoleFilters.delete(role);
    } else {
      this.selectedRoleFilters.add(role);
    }
    this.roleFiltersChange.emit(new Set(this.selectedRoleFilters));
  }

  toggleStatusFilter(status: string): void {
    if (this.selectedStatusFilters.has(status)) {
      this.selectedStatusFilters.delete(status);
    } else {
      this.selectedStatusFilters.add(status);
    }
    this.statusFiltersChange.emit(new Set(this.selectedStatusFilters));
  }

  clearAllFilters(): void {
    this.selectedRoleFilters.clear();
    this.selectedStatusFilters.clear();
    this.roleFiltersChange.emit(new Set());
    this.statusFiltersChange.emit(new Set());
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchValue = value;
    this.searchChange.emit(value);
  }

  clearSearch(): void {
    this.searchValue = '';
    this.searchChange.emit('');
  }

  getProgressWidth(count: number, total: number): number {
    return total > 0 ? (count / total) * 100 : 0;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isFilterDropdownOpen && !this.elementRef.nativeElement.contains(event.target)) {
      this.isFilterDropdownOpen = false;
    }
  }
}

