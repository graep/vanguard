// status-count-bar.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface StatusItem {
  id: string;
  label: string;
  count: number;
  color: string;
}

export type StatusCountBarVariant = 'default' | 'compact';

// New interface for data input - more flexible
export interface StatusDataSource {
  items: any[];
  statusField: string; // field name that determines status (e.g., 'isGrounded')
  activeValue?: any; // value that means "active" (default: false for isGrounded)
  searchFields: string[]; // fields to search in (e.g., ['docId', 'vin', 'type'])
  filterField?: string; // optional field to filter by type (e.g., 'type')
  filterValue?: any; // value to filter by
}

@Component({
  selector: 'app-status-count-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div [class]="getContainerClasses()">
      <!-- Search Bar Section -->
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
            (keyup.enter)="onSearchSubmit()"
            (focus)="onSearchFocus()"
            (blur)="onSearchBlur()"
          />
          <button 
            *ngIf="searchValue" 
            class="clear-button"
            (click)="clearSearch()"
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <!-- Status and Total Section -->
      <div class="status-section">
        <!-- Total Counter -->
        <div class="total-container">
          <span class="total-label">Total:</span>
          <span class="total-number">{{ total }}</span>
        </div>

        <!-- Status Items -->
        <div class="status-items-container">
          <div 
            *ngFor="let item of computedStatusData; trackBy: trackByStatusId"
            [class]="getStatusItemClasses()"
            [style.background-color]="item.color + '15'"
            [style.border-color]="item.color + '30'"
            (click)="onItemClick(item)"
          >
            <!-- Hover overlay -->
            <div 
              class="status-overlay"
              [style.background-color]="item.color + '10'"
            ></div>

            <!-- Status indicator with pulse -->
            <div class="status-indicator-container">
              <div 
                class="status-indicator"
                [style.background-color]="item.color"
                [style.box-shadow]="'0 0 8px ' + item.color + '60'"
              ></div>
              <div 
                class="status-pulse"
                [style.background-color]="item.color"
              ></div>
            </div>

            <span class="status-label">{{ item.label }}</span>
            
            <span 
              class="status-count"
              [style.background-color]="item.color + '20'"
              [style.border-color]="item.color + '30'"
            >
              {{ item.count }}
            </span>
          </div>
        </div>
      </div>

      <!-- Progress bar -->
      <div *ngIf="showProgress" class="progress-bar">
        <div class="progress-track">
          <div 
            *ngFor="let item of computedStatusData; let i = index"
            class="progress-segment"
            [style.width.%]="getProgressWidth(item.count)"
            [style.background-color]="item.color"
          ></div>
        </div>
        <div class="progress-shimmer"></div>
      </div>
    </div>
  `,
  styles: [`
    .container {
      background: #1e1e1e;
      border-radius: 16px;
      border: 1px solid rgba(148, 163, 184, 0.1);
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
      box-shadow: 
        0 20px 25px -5px rgba(0, 0, 0, 0.3),
        0 10px 10px -5px rgba(0, 0, 0, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }



    .container.default {
      padding: 24px 32px;
    }

    .container.compact {
      padding: 16px 24px;
    }

    /* Search Section */
    .search-section {
      margin-bottom: 20px;
    }

    .search-container {
      position: relative;
      display: flex;
      align-items: center;
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 12px;
      padding: 12px 16px;
      transition: all 0.2s ease;
    }

    .search-container:focus-within {
      border-color: rgba(59, 130, 246, 0.5);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      background: rgba(30, 41, 59, 0.8);
    }

    .search-icon {
      color: #94a3b8;
      margin-right: 12px;
      flex-shrink: 0;
      transition: color 0.2s ease;
    }

    .search-container:focus-within .search-icon {
      color: #60a5fa;
    }

    .search-input {
      background: transparent;
      border: none;
      color: #f8fafc;
      font-size: 16px;
      font-weight: 400;
      outline: none;
      width: 100%;
      padding: 0;
    }

    .search-input::placeholder {
      color: #64748b;
      font-weight: 400;
    }

    .clear-button {
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      transition: all 0.2s ease;
      margin-left: 8px;
      flex-shrink: 0;
    }

    .clear-button:hover {
      color: #94a3b8;
      background: rgba(148, 163, 184, 0.1);
    }

    /* Status Section */
    .status-section {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
    }

    .total-container {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .total-label {
      color: #cbd5e1;
      font-size: 18px;
      font-weight: 600;
      letter-spacing: 0.025em;
    }

    .total-number {
      color: #f8fafc;
      font-size: 24px;
      font-weight: 700;
      background: linear-gradient(135deg, #60a5fa, #3b82f6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .status-items-container {
      display: flex;
      align-items: center;
    }

    .status-items-container.default {
      gap: 20px;
    }

    .status-items-container.compact {
      gap: 12px;
    }

    .status-item {
      display: flex;
      align-items: center;
      border-radius: 12px;
      border: 1px solid;
      transition: all 0.2s ease;
      position: relative;
      overflow: hidden;
    }

    .status-item.default {
      gap: 12px;
      padding: 12px 20px;
    }

    .status-item.compact {
      gap: 8px;
      padding: 8px 16px;
    }

    .status-item.clickable {
      cursor: pointer;
    }

    .status-item.clickable:hover {
      transform: scale(1.02);
    }

    .status-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      opacity: 0;
      transition: opacity 0.2s ease;
      border-radius: 12px;
      pointer-events: none;
    }

    .status-item:hover .status-overlay {
      opacity: 1;
    }

    .status-indicator-container {
      position: relative;
      flex-shrink: 0;
    }

    .status-indicator {
      border-radius: 50%;
      position: relative;
      z-index: 1;
    }

    .status-indicator.default {
      width: 10px;
      height: 10px;
    }

    .status-indicator.compact {
      width: 8px;
      height: 8px;
    }

    .status-pulse {
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      border-radius: 50%;
      opacity: 0.6;
      animation: pulse 2s infinite;
    }

    .status-label {
      color: #e2e8f0;
      font-weight: 500;
      text-transform: capitalize;
      letter-spacing: 0.025em;
      position: relative;
      z-index: 1;
    }

    .status-label.default {
      font-size: 14px;
    }

    .status-label.compact {
      font-size: 13px;
    }

    .status-count {
      color: #f8fafc;
      border-radius: 20px;
      font-weight: 600;
      min-width: 24px;
      text-align: center;
      backdrop-filter: blur(10px);
      border: 1px solid;
      position: relative;
      z-index: 1;
    }

    .status-count.default {
      padding: 4px 12px;
      font-size: 13px;
    }

    .status-count.compact {
      padding: 2px 8px;
      font-size: 12px;
    }

    .progress-bar {
      margin-top: 20px;
      height: 6px;
      background: rgba(71, 85, 105, 0.3);
      border-radius: 3px;
      overflow: hidden;
      position: relative;
    }

    .progress-track {
      height: 100%;
      display: flex;
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-segment {
      height: 100%;
      transition: all 0.5s ease;
    }

    .progress-shimmer {
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      animation: shimmer 3s infinite;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .status-section {
        flex-direction: column;
        align-items: stretch;
      }

      .total-container {
        justify-content: center;
        margin-bottom: 12px;
      }

      .status-items-container {
        justify-content: center;
        flex-wrap: wrap;
      }
    }

    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
        opacity: 0.6;
      }
      50% {
        transform: scale(1.2);
        opacity: 0.3;
      }
    }

    @keyframes shimmer {
      0% {
        left: -100%;
      }
      100% {
        left: 100%;
      }
    }
  `]
})
export class StatusCountBarComponent implements OnInit, OnChanges {
  // New flexible input - can accept either pre-computed data OR raw data source
  @Input() data?: StatusItem[];
  @Input() dataSource?: StatusDataSource;
  
  // Configuration
  @Input() showProgress: boolean = true;
  @Input() variant: StatusCountBarVariant = 'default';
  @Input() customClass: string = '';
  @Input() clickable: boolean = false;
  @Input() searchPlaceholder: string = 'Search by #, VIN or Type';
  
  // Status configuration for data source mode
  @Input() activeLabel: string = 'Active';
  @Input() inactiveLabel: string = 'Grounded';
  @Input() activeColor: string = '#22c55e';
  @Input() inactiveColor: string = '#ef4444';

  // Outputs
  @Output() statusClick = new EventEmitter<StatusItem>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() searchSubmit = new EventEmitter<string>();
  @Output() searchFocus = new EventEmitter<void>();
  @Output() searchBlur = new EventEmitter<void>();
  @Output() filteredData = new EventEmitter<any[]>();

  searchValue: string = '';
  computedStatusData: StatusItem[] = [];
  filteredItems: any[] = [];

  ngOnInit(): void {
    this.updateComputedData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['dataSource']) {
      this.updateComputedData();
    }
  }

  private updateComputedData(): void {
    if (this.data) {
      // Use pre-computed data
      this.computedStatusData = [...this.data];
    } else if (this.dataSource) {
      // Compute data from source
      this.computedStatusData = this.computeStatusFromSource(this.dataSource);
      this.filteredItems = [...this.dataSource.items];
    } else {
      // Fallback to default
      this.computedStatusData = [
        { id: 'active', label: this.activeLabel, count: 0, color: this.activeColor },
        { id: 'inactive', label: this.inactiveLabel, count: 0, color: this.inactiveColor }
      ];
    }
  }

  private computeStatusFromSource(source: StatusDataSource): StatusItem[] {
    let items = source.items;
    
    // Apply type filter if specified
    if (source.filterField && source.filterValue !== undefined) {
      items = items.filter(item => {
        const fieldValue = this.getNestedValue(item, source.filterField!);
        return this.compareValues(fieldValue, source.filterValue);
      });
    }

    // Count active/inactive
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

  get total(): number {
    return this.computedStatusData.reduce((sum, item) => sum + item.count, 0);
  }

  getContainerClasses(): string {
    return `container ${this.variant} ${this.customClass}`.trim();
  }

  getStatusItemClasses(): string {
    const classes = [`status-item`, this.variant];
    if (this.clickable) {
      classes.push('clickable');
    }
    return classes.join(' ');
  }

  getProgressWidth(count: number): number {
    return this.total > 0 ? (count / this.total) * 100 : 0;
  }

  onItemClick(item: StatusItem): void {
    if (this.clickable) {
      this.statusClick.emit(item);
      
      // If using dataSource, perform filtering automatically
      if (this.dataSource) {
        this.filterByStatus(item.id);
      }
    }
  }

  private filterByStatus(statusId: string): void {
    if (!this.dataSource) return;

    let filtered = [...this.dataSource.items];

    // Apply type filter first
    if (this.dataSource.filterField && this.dataSource.filterValue !== undefined) {
      filtered = filtered.filter(item => {
        const fieldValue = this.getNestedValue(item, this.dataSource!.filterField!);
        return this.compareValues(fieldValue, this.dataSource!.filterValue);
      });
    }

    // Apply status filter
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

    this.filteredItems = filtered;
    this.filteredData.emit(filtered);
  }

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchValue = target.value;
    this.searchChange.emit(this.searchValue);
    
    // If using dataSource, perform filtering automatically
    if (this.dataSource) {
      this.filterBySearch(this.searchValue);
    }
  }

  private filterBySearch(searchTerm: string): void {
    if (!this.dataSource) return;

    const term = searchTerm.trim().toLowerCase();
    let filtered = [...this.dataSource.items];

    // Apply type filter first
    if (this.dataSource.filterField && this.dataSource.filterValue !== undefined) {
      filtered = filtered.filter(item => {
        const fieldValue = this.getNestedValue(item, this.dataSource!.filterField!);
        return this.compareValues(fieldValue, this.dataSource!.filterValue);
      });
    }

    // Apply search filter
    if (term) {
      filtered = filtered.filter(item => {
        return this.dataSource!.searchFields.some(field => {
          const value = this.getNestedValue(item, field);
          return value && String(value).toLowerCase().includes(term);
        });
      });
    }

    this.filteredItems = filtered;
    this.filteredData.emit(filtered);
  }

  onSearchSubmit(): void {
    this.searchSubmit.emit(this.searchValue);
  }

  onSearchFocus(): void {
    this.searchFocus.emit();
  }

  onSearchBlur(): void {
    this.searchBlur.emit();
  }

  clearSearch(): void {
    this.searchValue = '';
    this.searchChange.emit('');
    
    // Reset filtered data when clearing search
    if (this.dataSource) {
      this.filterBySearch('');
    }
  }

  trackByStatusId(index: number, item: StatusItem): string {
    return item.id;
  }
}