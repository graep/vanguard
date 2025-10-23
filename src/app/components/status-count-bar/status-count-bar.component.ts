import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
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
  LMR: number;
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
            <span class="total-label">Total:</span>
            <span class="total-number">{{ total }}</span>
          </div>
          
          <!-- Van Type Totals -->
          <div class="van-type-totals">
            <div class="van-type-item" 
                 *ngFor="let typeTotal of orderedVanTypeTotals; trackBy: trackByVanType"
                 [class.van-type-selected]="selectedVanTypeFilter === typeTotal.key"
                 (click)="onVanTypeClick(typeTotal.key)">
              <span class="van-type-label">{{ typeTotal.key }}:</span>
              <span class="van-type-count">{{ typeTotal.value }}</span>
            </div>
          </div>
        </div>

        <div class="status-items-container">
          <!-- Clear status filter button -->
          <button *ngIf="hasStatusFilter" class="status-clear-button" (click)="clearStatusFilter()" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <div *ngFor="let item of computedStatusData; trackBy: trackByStatusId"
               class="status-item"
               [style.background-color]="item.color + '15'"
               [style.border-color]="item.color + '30'"
               (click)="onItemClick(item)">
            
            <div class="status-overlay" [style.background-color]="item.color + '10'"></div>
            
            <div class="status-indicator-container">
              <div class="status-indicator" [style.background-color]="item.color"></div>
              <div class="status-pulse" [style.background-color]="item.color"></div>
            </div>

            <span class="status-label">{{ item.label }}</span>
            <span class="status-count" 
                  [style.background-color]="item.color + '20'"
                  [style.border-color]="item.color + '30'">
              {{ item.count }}
            </span>
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

  searchValue: string = '';
  computedStatusData: StatusItem[] = [];
  selectedStatusFilter: string | null = null;
  selectedVanTypeFilter: string | null = null;
  vanTypeTotals: VanTypeTotals = { EDV: 0, CDV: 0, LMR: 0 };
  private searchDebounceTimer: any;

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

  get orderedVanTypeTotals(): { key: string; value: number }[] {
    // Order: EDV first, then CDV, then LMR
    const order = ['EDV', 'CDV', 'LMR'];
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
      this.vanTypeTotals = { EDV: 0, CDV: 0, LMR: 0 };
      return;
    }

    let items = this.dataSource.items;
    
    // Apply search filter if active
    if (this.searchValue) {
      items = this.filterItemsBySearchTerm(items, this.searchValue);
    }

    // Apply status filter if active
    if (this.selectedStatusFilter) {
      items = items.filter(item => {
        const statusValue = this.getNestedValue(item, this.dataSource!.statusField);
        const activeValue = this.dataSource!.activeValue !== undefined ? this.dataSource!.activeValue : false;
        return this.compareValues(statusValue, activeValue);
      });
    }

    // Apply van type filter if active
    if (this.selectedVanTypeFilter) {
      items = items.filter(item => (item.type || '').toUpperCase() === this.selectedVanTypeFilter);
    }

    // Count by van type
    this.vanTypeTotals = {
      EDV: items.filter(item => (item.type || '').toUpperCase() === 'EDV').length,
      CDV: items.filter(item => (item.type || '').toUpperCase() === 'CDV').length,
      LMR: items.filter(item => (item.type || '').toUpperCase() === 'LMR').length
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

  onItemClick(item: StatusItem): void {
    if (this.clickable) {
      this.selectedStatusFilter = item.id;
      this.filterByStatus(item.id);
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
    if (!this.dataSource) return;

    const term = searchTerm.trim().toLowerCase();
    let filtered = [...this.dataSource.items];

    if (this.dataSource.filterField && this.dataSource.filterValue !== undefined) {
      filtered = filtered.filter(item => {
        const fieldValue = this.getNestedValue(item, this.dataSource!.filterField!);
        return this.compareValues(fieldValue, this.dataSource!.filterValue);
      });
    }

    if (term) {
      filtered = filtered.filter(item => {
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

    // Apply van type filter if active
    if (this.selectedVanTypeFilter) {
      filtered = filtered.filter(item => (item.type || '').toUpperCase() === this.selectedVanTypeFilter);
    }

    this.filteredData.emit(filtered);
  }

  clearSearch(): void {
    this.searchValue = '';
    this.updateVanTypeTotals();
    this.filterBySearch('');
  }

  clearStatusFilter(): void {
    this.selectedStatusFilter = null;
    this.updateVanTypeTotals();
    this.filterBySearch(this.searchValue); // Maintain search but clear status filter
  }

  onVanTypeClick(vanType: string): void {
    if (this.selectedVanTypeFilter === vanType) {
      // If clicking the same type, clear the filter
      this.selectedVanTypeFilter = null;
    } else {
      // Set the new van type filter
      this.selectedVanTypeFilter = vanType;
    }
    
    this.updateVanTypeTotals();
    this.filterBySearch(this.searchValue);
  }

  clearVanTypeFilter(): void {
    this.selectedVanTypeFilter = null;
    this.updateVanTypeTotals();
    this.filterBySearch(this.searchValue);
  }

  trackByStatusId(index: number, item: StatusItem): string {
    return item.id;
  }

  trackByVanType(index: number, item: { key: string; value: number }): string {
    return item.key;
  }
}