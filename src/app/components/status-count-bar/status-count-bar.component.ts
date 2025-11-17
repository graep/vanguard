import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, SimpleChanges, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface StatusItem {
  id: string;
  label: string;
  count: number;
  color: string;
}

export interface StatusDataSource {
  items: any[];
  statusField: string;
  activeValue?: any;
  searchFields: string[];
  filterField?: string;
  filterValue?: any;
}

export interface VanTypeTotals {
  EDV: number;
  CDV: number;
  Rental: number;
}

@Component({
  selector: 'app-status-count-bar',
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
            <span class="total-number">{{ total }}</span>
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
            <!-- Status Filters -->
            <div class="filter-group">
              <div class="filter-group-header">Status</div>
              <div class="filter-options">
                <label 
                  *ngFor="let item of computedStatusData; trackBy: trackByStatusId"
                  class="filter-option">
                  <input
                    type="checkbox"
                    [checked]="selectedStatusFilters.has(item.id)"
                    (change)="toggleStatusFilter(item.id)"
                    class="filter-checkbox">
                  <div class="filter-option-content">
                    <div class="filter-option-indicator" [style.background-color]="item.color"></div>
                    <span class="filter-option-label">{{ item.label }}</span>
                    <span class="filter-option-count">{{ item.count }}</span>
                  </div>
                </label>
              </div>
            </div>

            <!-- Van Type Filters -->
            <div class="filter-group">
              <div class="filter-group-header">Van Type</div>
              <div class="filter-options">
                <label 
                  *ngFor="let typeTotal of orderedVanTypeTotals; trackBy: trackByVanType"
                  class="filter-option">
                  <input
                    type="checkbox"
                    [checked]="selectedVanTypeFilters.has(typeTotal.key)"
                    (change)="toggleVanTypeFilter(typeTotal.key)"
                    class="filter-checkbox">
                  <div class="filter-option-content">
                    <span class="filter-option-label">{{ typeTotal.key }}</span>
                    <span class="filter-option-count">{{ typeTotal.value }}</span>
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
      <div *ngIf="showProgress" class="progress-bar">
        <div class="progress-track">
          <div *ngFor="let item of computedStatusData"
               class="progress-segment"
               [style.width.%]="getProgressWidth(item.count)"
               [style.background-color]="item.color">
          </div>
        </div>
        <div class="progress-shimmer"></div>
      </div>
    </div>
  `,
  styleUrls: ['./status-count-bar.component.scss']
})
export class StatusCountBarComponent implements OnInit, OnChanges, OnDestroy {
  @Input() dataSource?: StatusDataSource;
  @Input() showProgress: boolean = true;
  @Input() clickable: boolean = false;
  @Input() searchPlaceholder: string = 'Search by #, VIN (or last 4 digits), or Type';
  @Input() activeLabel: string = 'Active';
  @Input() inactiveLabel: string = 'Grounded';
  @Input() activeColor: string = '#22c55e';
  @Input() inactiveColor: string = '#ef4444';

  @Output() filteredData = new EventEmitter<any[]>();

  constructor(private elementRef: ElementRef) {}

  searchValue: string = '';
  computedStatusData: StatusItem[] = [];
  selectedStatusFilter: string | null = null;
  selectedVanTypeFilter: string | null = null;
  vanTypeTotals: VanTypeTotals = { EDV: 0, CDV: 0, Rental: 0 };
  private searchDebounceTimer: any;
  
  // Filter dropdown state
  isFilterDropdownOpen: boolean = false;
  selectedStatusFilters: Set<string> = new Set();
  selectedVanTypeFilters: Set<string> = new Set();

  ngOnInit(): void {
    this.updateComputedData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dataSource']) {
      this.updateComputedData();
    }
  }

  ngOnDestroy(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
  }

  get total(): number {
    return this.computedStatusData.reduce((sum, item) => sum + item.count, 0);
  }

  get hasStatusFilter(): boolean {
    return this.selectedStatusFilter !== null;
  }

  get hasVanTypeFilter(): boolean {
    return this.selectedVanTypeFilter !== null;
  }

  get hasActiveFilters(): boolean {
    return this.selectedStatusFilters.size > 0 || this.selectedVanTypeFilters.size > 0;
  }

  get activeFilterCount(): number {
    return this.selectedStatusFilters.size + this.selectedVanTypeFilters.size;
  }

  get orderedVanTypeTotals(): { key: string; value: number }[] {
    // Order: EDV first, then CDV, then Rental
    const order = ['EDV', 'CDV', 'Rental'];
    return order.map(key => ({ key, value: this.vanTypeTotals[key as keyof VanTypeTotals] }));
  }

  private updateComputedData(): void {
    if (this.dataSource) {
      this.computedStatusData = this.computeStatusFromSource(this.dataSource);
      this.updateVanTypeTotals();
    }
  }

  private updateVanTypeTotals(): void {
    if (!this.dataSource?.items) {
      this.vanTypeTotals = { EDV: 0, CDV: 0, Rental: 0 };
      return;
    }

    let items = this.dataSource.items;
    
    // Apply base filter if exists
    if (this.dataSource.filterField && this.dataSource.filterValue !== undefined) {
      items = items.filter(item => {
        const fieldValue = this.getNestedValue(item, this.dataSource!.filterField!);
        return this.compareValues(fieldValue, this.dataSource!.filterValue);
      });
    }
    
    // Apply search filter if active
    if (this.searchValue) {
      items = this.filterItemsBySearchTerm(items, this.searchValue);
    }

    // Apply status filters if active
    if (this.selectedStatusFilters.size > 0) {
      items = items.filter(item => {
        const statusValue = this.getNestedValue(item, this.dataSource!.statusField);
        const activeValue = this.dataSource!.activeValue !== undefined ? this.dataSource!.activeValue : false;
        const isActive = this.compareValues(statusValue, activeValue);
        
        if (this.selectedStatusFilters.has('active') && isActive) return true;
        if (this.selectedStatusFilters.has('inactive') && !isActive) return true;
        return false;
      });
    }

    // Apply van type filters if active
    if (this.selectedVanTypeFilters.size > 0) {
      items = items.filter(item => {
        const itemType = (item.type || '').toUpperCase();
        return Array.from(this.selectedVanTypeFilters).some(filterType => itemType === filterType);
      });
    }

    // Count by van type
    this.vanTypeTotals = {
      EDV: items.filter(item => (item.type || '').toUpperCase() === 'EDV').length,
      CDV: items.filter(item => (item.type || '').toUpperCase() === 'CDV').length,
      Rental: items.filter(item => (item.type || '').toUpperCase() === 'RENTAL').length
    };
  }

  private computeStatusFromSource(source: StatusDataSource): StatusItem[] {
    let items = source.items || [];
    
    if (source.filterField && source.filterValue !== undefined) {
      items = items.filter(item => {
        const fieldValue = this.getNestedValue(item, source.filterField!);
        return this.compareValues(fieldValue, source.filterValue);
      });
    }

    const activeCount = items.filter(item => {
      const statusValue = this.getNestedValue(item, source.statusField);
      const activeValue = source.activeValue !== undefined ? source.activeValue : false;
      return this.compareValues(statusValue, activeValue);
    }).length;

    const inactiveCount = items.length - activeCount;

    return [
      { id: 'active', label: this.activeLabel, count: activeCount, color: this.activeColor },
      { id: 'inactive', label: this.inactiveLabel, count: inactiveCount, color: this.inactiveColor }
    ];
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  private compareValues(value1: any, value2: any): boolean {
    if (typeof value1 === 'string' && typeof value2 === 'string') {
      return value1.toLowerCase() === value2.toLowerCase();
    }
    return value1 === value2;
  }

  getProgressWidth(count: number): number {
    return this.total > 0 ? (count / this.total) * 100 : 0;
  }

  toggleFilterDropdown(): void {
    this.isFilterDropdownOpen = !this.isFilterDropdownOpen;
  }

  toggleStatusFilter(statusId: string): void {
    if (this.selectedStatusFilters.has(statusId)) {
      this.selectedStatusFilters.delete(statusId);
    } else {
      this.selectedStatusFilters.add(statusId);
    }
    this.applyFilters();
  }

  toggleVanTypeFilter(vanType: string): void {
    if (this.selectedVanTypeFilters.has(vanType)) {
      this.selectedVanTypeFilters.delete(vanType);
    } else {
      this.selectedVanTypeFilters.add(vanType);
    }
    this.applyFilters();
  }

  clearAllFilters(): void {
    this.selectedStatusFilters.clear();
    this.selectedVanTypeFilters.clear();
    this.selectedStatusFilter = null;
    this.selectedVanTypeFilter = null;
    this.applyFilters();
  }

  private applyFilters(): void {
    if (!this.dataSource) return;

    let filtered = [...this.dataSource.items];

    // Apply base filter if exists
    if (this.dataSource.filterField && this.dataSource.filterValue !== undefined) {
      filtered = filtered.filter(item => {
        const fieldValue = this.getNestedValue(item, this.dataSource!.filterField!);
        return this.compareValues(fieldValue, this.dataSource!.filterValue);
      });
    }

    // Apply search filter
    if (this.searchValue) {
      filtered = this.filterItemsBySearchTerm(filtered, this.searchValue);
    }

    // Apply status filters (multiple selection)
    if (this.selectedStatusFilters.size > 0) {
      filtered = filtered.filter(item => {
        const statusValue = this.getNestedValue(item, this.dataSource!.statusField);
        const activeValue = this.dataSource!.activeValue !== undefined ? this.dataSource!.activeValue : false;
        const isActive = this.compareValues(statusValue, activeValue);
        
        if (this.selectedStatusFilters.has('active') && isActive) return true;
        if (this.selectedStatusFilters.has('inactive') && !isActive) return true;
        return false;
      });
    }

    // Apply van type filters (multiple selection)
    if (this.selectedVanTypeFilters.size > 0) {
      filtered = filtered.filter(item => {
        const itemType = (item.type || '').toUpperCase();
        return Array.from(this.selectedVanTypeFilters).some(filterType => itemType === filterType);
      });
    }

    this.updateVanTypeTotals();
    this.filteredData.emit(filtered);
  }

  onItemClick(item: StatusItem): void {
    if (this.clickable) {
      this.toggleStatusFilter(item.id);
    }
  }

  private filterByStatus(statusId: string): void {
    if (!this.dataSource) return;

    let filtered = [...this.dataSource.items];

    if (this.dataSource.filterField && this.dataSource.filterValue !== undefined) {
      filtered = filtered.filter(item => {
        const fieldValue = this.getNestedValue(item, this.dataSource!.filterField!);
        return this.compareValues(fieldValue, this.dataSource!.filterValue);
      });
    }

    if (statusId === 'active') {
      filtered = filtered.filter(item => {
        const statusValue = this.getNestedValue(item, this.dataSource!.statusField);
        const activeValue = this.dataSource!.activeValue !== undefined ? this.dataSource!.activeValue : false;
        return this.compareValues(statusValue, activeValue);
      });
    } else if (statusId === 'inactive') {
      filtered = filtered.filter(item => {
        const statusValue = this.getNestedValue(item, this.dataSource!.statusField);
        const activeValue = this.dataSource!.activeValue !== undefined ? this.dataSource!.activeValue : false;
        return !this.compareValues(statusValue, activeValue);
      });
    }

    this.filteredData.emit(filtered);
  }

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchValue = target.value;
    
    // Update van type totals immediately for responsive UI
    this.updateVanTypeTotals();
    
    // Clear existing timer
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    
    // Set new timer
    this.searchDebounceTimer = setTimeout(() => {
      this.filterBySearch(this.searchValue);
    }, 1200);
  }

  private filterItemsBySearchTerm(items: any[], searchTerm: string): any[] {
    if (!searchTerm.trim()) return items;
    
    const term = searchTerm.trim().toLowerCase();
    return items.filter(item => {
      return this.dataSource!.searchFields.some(field => {
        const value = this.getNestedValue(item, field);
        if (!value) return false;
        
        const stringValue = String(value).toLowerCase();
        
        // Special handling for VIN field - check last 4 digits
        if (field === 'VIN' && term.length === 4 && /^\d{4}$/.test(term)) {
          return stringValue.endsWith(term);
        }
        
        // Regular search for all other cases
        return stringValue.includes(term);
      });
    });
  }

  private filterBySearch(searchTerm: string): void {
    this.updateVanTypeTotals();
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchValue = '';
    this.updateVanTypeTotals();
    this.applyFilters();
  }

  clearStatusFilter(): void {
    this.selectedStatusFilter = null;
    this.selectedStatusFilters.clear();
    this.updateVanTypeTotals();
    this.applyFilters();
  }

  onVanTypeClick(vanType: string): void {
    this.toggleVanTypeFilter(vanType);
  }

  clearVanTypeFilter(): void {
    this.selectedVanTypeFilter = null;
    this.selectedVanTypeFilters.clear();
    this.updateVanTypeTotals();
    this.applyFilters();
  }

  trackByStatusId(index: number, item: StatusItem): string {
    return item.id;
  }

  trackByVanType(index: number, item: { key: string; value: number }): string {
    return item.key;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isFilterDropdownOpen && !this.elementRef.nativeElement.contains(event.target)) {
      this.isFilterDropdownOpen = false;
    }
  }
}