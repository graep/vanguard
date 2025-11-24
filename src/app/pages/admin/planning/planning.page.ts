import { Component, OnInit, OnDestroy, inject, Renderer2, ViewChild, ChangeDetectorRef, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, LoadingController, ToastController, ModalController } from '@ionic/angular';
import { Firestore, collection, CollectionReference, collectionData } from '@angular/fire/firestore';
import { Subscription, forkJoin, Observable, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

import { Van } from '../../../models/van.model';
import { PlanningService } from '../../../services/planning.service';
import { AuthService, UserProfile } from '../../../services/auth.service';
import {
  DriverAssignment,
  DailyPlan,
  VehicleType,
  groupAssignmentsByType,
  getPlanStats,
  isAssignmentUnassigned,
} from '../../../models/planning.model';

interface EditState {
  assignment: DriverAssignment;
  isEditing: boolean;
}

@Component({
  selector: 'app-planning',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './planning.page.html',
  styleUrls: ['./planning.page.scss'],
})
export class PlanningPage implements OnInit, OnDestroy {
  // Current date tracking
  currentDate = new Date();
  currentDateString = ''; // Will be set in ngOnInit
  
  // Data
  allVans: Van[] = [];
  dailyPlan: DailyPlan | null = null;
  userProfile: UserProfile | null = null;
  
  // Grouped assignments by vehicle type
  groupedAssignments: Record<VehicleType, DriverAssignment[]> = {
    CDV: [],
    EDV: [],
    Rental: [],
    BUDGET: [],
  };
  
  stats = getPlanStats(null);
  
  // UI State
  selectedDate: string = this.currentDateString;
  isLoading = false;
  isSaving = false;
  editingStates: Map<string, EditState> = new Map();
  numberOfRoutes: number = 0; // Number of routes to create
  driverSearchQueries: Map<string, string> = new Map(); // Store search queries for each assignment
  editingNotes: Map<string, boolean> = new Map(); // Track which assignments are editing notes
  activeDriverField: string | null = null; // Track which assignment field is currently active
  checkedAssignments: Set<string> = new Set(); // Track which assignments are checked
  isGroupedByWave = false; // Track if grouping by wave is enabled
  
  // Dropdown portal state
  dropdownElement: HTMLElement | null = null;
  dropdownPosition = { top: 0, left: 0, width: 0 };
  activeInputElement: HTMLElement | null = null;
  isPositioning = false; // Flag to prevent premature closing during positioning
  
  // Date input reference
  @ViewChild('dateInput', { static: false }) dateInput!: ElementRef<HTMLInputElement>;
  
  // User management
  allUsers$!: Observable<UserProfile[]>;
  driverNames: string[] = [];
  
  // Cached computed properties to prevent expensive recalculations
  private _cachedGroupedAssignmentsByWave: Array<{ wave: number | null; assignments: DriverAssignment[] }> = [];
  private _cachedHasMultipleWaves = false;
  private _cachedFormattedDate = '';
  private _cachedAllCompletedChecked = false;
  private _cachedSomeCompletedChecked = false;
  private _lastCacheUpdate = 0;
  
  // Subscriptions
  private subs: Subscription[] = [];
  
  // Services
  private firestore = inject(Firestore);
  private planningService = inject(PlanningService);
  private authService = inject(AuthService);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);
  private router = inject(Router);
  private renderer = inject(Renderer2);
  private cdr = inject(ChangeDetectorRef);
  
  ngOnInit() {
    // Initialize current date
    this.currentDateString = this.planningService.getTodayDate();
    this.selectedDate = this.currentDateString;
    
    this.loadUserProfile();
    this.loadUsers();
    this.loadVans();
    
    // Daily plan will be loaded automatically when vans are ready
    // If vans take too long, loadDailyPlan has a timeout mechanism
    // Also trigger after a short delay as fallback
    setTimeout(() => {
      if (!this.dailyPlan && !this.isLoading) {
        this.loadDailyPlan();
      }
    }, 1000);
    
    // Listen for window resize and scroll to update dropdown position
    this.renderer.listen('window', 'resize', () => {
      if (this.dropdownElement && this.activeDriverField && this.activeInputElement) {
        // Reposition the dropdown using the stored input element
        const rect = this.activeInputElement.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const dropdownHeight = 200;
        
        this.dropdownPosition = {
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width
        };
        
        if (rect.bottom + dropdownHeight > windowHeight) {
          this.dropdownPosition.top = rect.top + window.scrollY - dropdownHeight - 4;
        }
        
        this.updateDropdownPosition();
      }
    });
    
    this.renderer.listen('window', 'scroll', () => {
      if (this.dropdownElement && this.activeDriverField && this.activeInputElement) {
        // Reposition the dropdown using the stored input element
        const rect = this.activeInputElement.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const dropdownHeight = 200;
        
        this.dropdownPosition = {
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width
        };
        
        if (rect.bottom + dropdownHeight > windowHeight) {
          this.dropdownPosition.top = rect.top + window.scrollY - dropdownHeight - 4;
        }
        
        this.updateDropdownPosition();
      }
    });
    
    // Listen for Escape key
    this.renderer.listen('document', 'keydown', (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.handleEscapeKey();
      }
    });
  }
  
  ngOnDestroy() {
    this.subs.forEach(sub => sub.unsubscribe());
    this.destroyDropdown();
  }
  
  // ========== Data Loading ==========
  
  private loadUserProfile(): void {
    const sub = this.authService.currentUserProfile$.subscribe(profile => {
      this.userProfile = profile;
    });
    this.subs.push(sub);
  }
  
  private loadVans(): void {
    const vansRef = collection(this.firestore, 'vans') as CollectionReference<Van>;
    
    const sub = collectionData<Van>(vansRef, { idField: 'docId' }).subscribe({
      next: (vans) => {
        // Filter to only active vans (not grounded)
        this.allVans = vans.filter(van => !van.isGrounded);
        // Sort by type in specific order (EDV first, then CDV, then Rental), then by number
        const typeOrder = ['EDV', 'CDV', 'Rental'];
        this.allVans.sort((a, b) => {
          // Get index in the desired order (lower = earlier in list)
          const aOrder = typeOrder.indexOf(a.type);
          const bOrder = typeOrder.indexOf(b.type);
          
          // Sort by type order first
          if (aOrder !== bOrder) {
            // If both are in the predefined order, compare by index
            if (aOrder !== -1 && bOrder !== -1) {
              return aOrder - bOrder;
            }
            // If only one is in the order, prioritize the one in order
            if (aOrder !== -1) return -1;
            if (bOrder !== -1) return 1;
            // If neither in order, alphabetically
            return a.type.localeCompare(b.type);
          }
          
          // Same type order, sort by number
          return a.number - b.number;
        });
        
        // Trigger daily plan load when vans are ready (only if not already loading)
        if (!this.dailyPlan && !this.isLoading) {
          this.loadDailyPlan();
        }
      },
      error: (error) => {
        console.error('Error loading vans:', error);
        this.showToast('Failed to load vans', 'danger');
        // Still try to load daily plan even if vans failed
        if (!this.dailyPlan && !this.isLoading) {
          this.loadDailyPlan();
        }
      },
    });
    this.subs.push(sub);
  }
  
  private loadUsers(): void {
    const usersRef = collection(this.firestore, 'users');
    
    collectionData(usersRef).subscribe({
      next: (users: any[]) => {
        // Extract driver names from active users who have driver role
        this.driverNames = users
          .filter(user => 
            (user.firstName || user.displayName) && 
            user.isActive === true &&
            user.roles && 
            user.roles.includes('driver')
          )
          .map(user => this.authService.getDisplayName(user as UserProfile))
          .sort();
        
      },
      error: (error) => {
        console.error('Error loading users:', error);
      },
    });
  }
  
  private async loadDailyPlan(): Promise<void> {
    this.isLoading = true;
    
    try {
      // Wait for vans to load before creating the plan (with timeout)
      const maxWaitTime = 5000; // 5 seconds max wait
      const checkInterval = 100; // Check every 100ms
      let waited = 0;
      
      while (this.allVans.length === 0 && waited < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waited += checkInterval;
      }
      
      if (this.allVans.length === 0) {
        console.warn('[Planning] No vans loaded after waiting', maxWaitTime, 'ms. Proceeding with empty array.');
        this.showToast('Warning: No vans loaded. The plan may be incomplete.', 'warning');
      }
      
      // Get or create plan for the selected date with active vans (with timeout)
      const planPromise = this.planningService.getOrCreateDailyPlan(
        this.selectedDate,
        this.allVans
      );
      
      // Add timeout to prevent infinite hangs
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout: Daily plan loading took too long')), 30000);
      });
      
      const plan = await Promise.race([planPromise, timeoutPromise]);
      
      this.dailyPlan = plan;
      
      // Calculate stats (grouped for display)
      this.groupedAssignments = groupAssignmentsByType(plan.assignments);
      this.stats = getPlanStats(plan);
      
      // Update cached properties
      this.updateCachedProperties();
      
    } catch (error: any) {
      console.error('Error loading daily plan:', error);
      
      let errorMsg = error?.message || 'Failed to load daily plan.';
      
      // Check if this is a permission error
      if (error?.name === 'PermissionDenied' || error?.message?.includes('sign out')) {
        errorMsg = error?.message || 'Admin permissions required. Please sign out and sign back in.';
      } else if (error?.message?.includes('timeout')) {
        errorMsg = 'The request timed out. Please check your internet connection and try again.';
      }
      
      this.showToast(errorMsg, 'danger');
      
      // Set a minimal plan to prevent UI from being completely broken
      // Use selectedDate as ID (it should already be in YYYY-MM-DD format)
      this.dailyPlan = {
        id: this.selectedDate,
        date: this.selectedDate,
        assignments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.groupedAssignments = groupAssignmentsByType([]);
      this.stats = getPlanStats(null);
    } finally {
      this.isLoading = false;
    }
  }
  
  // Get active vans for a specific type
  getVansForType(type: string): Van[] {
    return this.allVans.filter(van => van.type === type);
  }
  
  // Get all vans as options
  getAllVansOptions(): Array<{value: string, label: string}> {
    return this.allVans.map(van => ({
      value: van.docId,
      label: `${van.type} ${van.number}`
    }));
  }
  
  // Get van label from docId
  getVanLabel(vanId: string): string {
    const van = this.allVans.find(v => v.docId === vanId);
    return van ? `${van.type} ${van.number}` : '';
  }
  
  // Check if assignment has a van
  hasVan(assignment: DriverAssignment): boolean {
    return !!(assignment.vanId && assignment.vanId.trim() !== '');
  }
  
  // Check if assignment can be edited
  canEdit(assignment: DriverAssignment): boolean {
    return this.hasVan(assignment) || assignment.id !== undefined;
  }
  
  // ========== Date Management ==========
  
  onDateChange(event: any): void {
    const newDate = event.target.value;
    if (newDate !== this.selectedDate) {
      this.selectedDate = newDate;
      this.currentDate = new Date(newDate);
      this._cachedFormattedDate = ''; // Clear cache
      this.loadDailyPlan();
    }
  }
  
  getTodayDateString(): string {
    return this.planningService.getTodayDate();
  }
  
  getTomorrowDateString(): string {
    return this.planningService.getTomorrowDate();
  }
  
  selectToday(): void {
    this.selectedDate = this.planningService.getTodayDate();
    this.currentDate = new Date();
    this.loadDailyPlan();
  }
  
  selectTomorrow(): void {
    this.selectedDate = this.planningService.getTomorrowDate();
    this.currentDate = new Date(this.selectedDate);
    this.loadDailyPlan();
  }
  
  openDatePicker(): void {
    // Trigger the date picker to open
    if (this.dateInput?.nativeElement) {
      const input = this.dateInput.nativeElement;
      if (input.showPicker) {
        input.showPicker();
      } else {
        input.click();
      }
    }
  }
  
  isTodaySelected(): boolean {
    return this.selectedDate === this.getTodayDateString();
  }
  
  isTomorrowSelected(): boolean {
    return this.selectedDate === this.getTomorrowDateString();
  }
  
  // ========== Assignment Editing ==========
  
  handleRowClick(assignment: DriverAssignment): void {
    // Only start editing if not already editing
    if (!this.isAssignmentEditing(assignment.id || '')) {
      this.startEditing(assignment);
    }
  }
  
  handleEscapeKey(): void {
    // First, close dropdown if open
    if (this.activeDriverField !== null) {
      this.closeDriverDropdown();
      return;
    }
    
    // If no dropdown, exit edit mode for all assignments
    if (this.editingStates.size > 0) {
      // Get the first (and should be only) editing assignment
      const assignmentId = this.editingStates.keys().next().value;
      if (assignmentId) {
        this.cancelEditing(assignmentId);
      }
    }
  }
  
  startEditing(assignment: DriverAssignment): void {
    if (!assignment.id) {
      assignment.id = this.planningService.generateId();
    }
    
    // Clear any active driver field from previous rows
    this.activeDriverField = null;
    
    const editState: EditState = {
      assignment: { ...assignment },
      isEditing: true,
    };
    
    this.editingStates.set(assignment.id, editState);
    
    // Initialize driver search query with current driver name if exists
    if (assignment.driverName && assignment.driverName.trim() !== '') {
      this.driverSearchQueries.set(assignment.id, assignment.driverName);
    }
  }
  
  cancelEditing(assignmentId: string): void {
    this.editingStates.delete(assignmentId);
    this.driverSearchQueries.delete(assignmentId);
    this.editingNotes.delete(assignmentId);
    if (this.activeDriverField === assignmentId) {
      this.closeDriverDropdown();
    }
  }
  
  saveAssignment(assignmentId: string): void {
    const editState = this.editingStates.get(assignmentId);
    if (!editState) return;
    
    this.updateAssignment(editState.assignment);
    this.editingStates.delete(assignmentId);
    this.editingNotes.delete(assignmentId); // Clear notes editing state when saving
    if (this.activeDriverField === assignmentId) {
      this.activeDriverField = null; // Clear active driver field when saving
    }
    // Cache will be updated after loadDailyPlan completes
  }
  
  clearAssignment(assignmentId: string): void {
    const editState = this.editingStates.get(assignmentId);
    if (!editState) return;
    
    const assignment = editState.assignment;
    // Clear all fields except vehicle info
    const clearedAssignment = {
      ...assignment,
      driverName: '',
      routeNumber: '',
      staging: '',
      wave: undefined,
      pad: undefined,
      phoneBatteryLights: '',
      notes: '',
    };
    
    this.updateAssignment(clearedAssignment);
    this.editingStates.delete(assignmentId);
  }
  
  // ========== Assignment Updates ==========
  
  private async updateAssignment(assignment: DriverAssignment): Promise<void> {
    if (!this.dailyPlan || !assignment.id) return;
    
    this.isSaving = true;
    
    try {
      await this.planningService.updateAssignment(
        this.selectedDate,
        assignment.id,
        assignment
      );
      
      // Reload the plan to get fresh data
      await this.loadDailyPlan();
      
      this.showToast('Assignment updated successfully', 'success');
    } catch (error) {
      console.error('Error updating assignment:', error);
      this.showToast('Failed to update assignment', 'danger');
    } finally {
      this.isSaving = false;
    }
  }
  
  // ========== Helper Methods ==========
  
  get isEditing(): boolean {
    return this.editingStates.size > 0;
  }
  
  isAssignmentEditing(assignmentId: string): boolean {
    return this.editingStates.has(assignmentId);
  }
  
  getAssignment(assignmentId: string): DriverAssignment | null {
    const editState = this.editingStates.get(assignmentId);
    return editState?.assignment || null;
  }
  
  getEditingValue(assignmentId: string, field: keyof DriverAssignment): any {
    const editState = this.editingStates.get(assignmentId);
    const value = editState?.assignment?.[field];
    
    // Convert number fields to string for ion-select
    if (field === 'wave' || field === 'pad') {
      return value !== undefined && value !== null && value !== '' ? String(value) : '';
    }
    
    return value || '';
  }
  
  updateEditingValue(assignmentId: string, field: keyof DriverAssignment, value: any): void {
    const editState = this.editingStates.get(assignmentId);
    if (editState) {
      // Convert string to number for wave and pad fields
      if (field === 'wave' || field === 'pad') {
        const numValue = value === '' || value === null || value === undefined 
          ? undefined 
          : parseInt(value, 10);
        (editState.assignment as any)[field] = numValue;
      } else if (field === 'routeNumber') {
        // Automatically prepend "CX" if not already present
        let routeValue = value || '';
        if (routeValue && !routeValue.toUpperCase().startsWith('CX')) {
          routeValue = 'CX' + routeValue;
        }
        (editState.assignment as any)[field] = routeValue;
      } else {
        // Type-safe assignment for other DriverAssignment fields
        (editState.assignment as any)[field] = value;
      }
      // Note: Cache is based on dailyPlan, not editing states, so no need to update here
    }
  }
  
  validateWave(assignmentId: string): void {
    const editState = this.editingStates.get(assignmentId);
    if (!editState) return;
    
    const wave = editState.assignment.wave;
    if (wave !== undefined) {
      // Clamp wave to valid range 1-3
      if (wave < 1) {
        editState.assignment.wave = 1;
      } else if (wave > 3) {
        editState.assignment.wave = 3;
      }
    }
  }
  
  validatePad(assignmentId: string): void {
    const editState = this.editingStates.get(assignmentId);
    if (!editState) return;
    
    const pad = editState.assignment.pad;
    if (pad !== undefined) {
      // Clamp pad to valid range 1-3
      if (pad < 1) {
        editState.assignment.pad = 1;
      } else if (pad > 3) {
        editState.assignment.pad = 3;
      }
    }
  }
  
  formatStaging(assignmentId: string): void {
    const editState = this.editingStates.get(assignmentId);
    if (!editState) return;
    
    let staging = editState.assignment.staging || '';
    if (staging) {
      // Format staging: e1 -> E.1, w3 -> W.3, etc.
      const trimmed = staging.trim().toUpperCase();
      // Match pattern: letter followed by number (e.g., "E1", "W3")
      const match = trimmed.match(/^([A-Z])(\d+)$/);
      if (match) {
        staging = `${match[1]}.${match[2]}`;
        editState.assignment.staging = staging;
      }
    }
  }
  
  filterDriverName(assignmentId: string, value: string): void {
    // Set this as the active driver field
    this.activeDriverField = assignmentId;
    
    // Store the search query
    this.driverSearchQueries.set(assignmentId, value);
    
    // Also update the assignment with the typed value for display
    this.updateEditingValue(assignmentId, 'driverName', value);
    
    // Create dropdown if it doesn't exist
    if (!this.dropdownElement) {
      this.createDropdown();
      
      // Position it if we have an active input element
      if (this.activeInputElement) {
        const rect = this.activeInputElement.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const dropdownHeight = 200;
        
        this.dropdownPosition = {
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width
        };
        
        if (rect.bottom + dropdownHeight > windowHeight) {
          this.dropdownPosition.top = rect.top + window.scrollY - dropdownHeight - 4;
        }
        
        this.updateDropdownPosition();
      }
    }
    
    // Update dropdown content
    this.updateDropdownContent(assignmentId);
  }
  
  getFilteredDrivers(assignmentId: string): string[] {
    // Only show dropdown if this is the active field
    if (this.activeDriverField !== assignmentId) {
      return [];
    }
    
    const query = this.driverSearchQueries.get(assignmentId) || '';
    if (!query || query.trim() === '') {
      return this.driverNames;
    }
    
    const searchTerm = query.toLowerCase().trim();
    return this.driverNames.filter(driver => {
      // Split driver name into parts (first name, last name, etc.)
      const parts = driver.toLowerCase().split(' ');
      // Check if query matches any part of the name
      return parts.some(part => part.startsWith(searchTerm));
    });
  }
  
  handleDriverKeydown(assignmentId: string, event: any): void {
    // Check if Tab key is pressed
    if (event.key === 'Tab' || event.keyCode === 9) {
      const filteredDrivers = this.getFilteredDrivers(assignmentId);
      
      // If there are filtered results, select the first one
      if (filteredDrivers.length > 0) {
        event.preventDefault(); // Prevent default tab behavior
        this.selectDriver(assignmentId, filteredDrivers[0]);
      }
    }
  }
  
  selectDriver(assignmentId: string, driverName: string): void {
    // Clear the search query
    this.driverSearchQueries.set(assignmentId, driverName);
    
    // Update the assignment with the selected driver
    this.updateEditingValue(assignmentId, 'driverName', driverName);
    
    // Close the dropdown
    this.closeDriverDropdown();
  }
  
  closeDriverDropdown(): void {
    this.activeDriverField = null;
    this.activeInputElement = null;
    this.isPositioning = false;
    this.destroyDropdown();
  }
  
  isDropdownActive(): boolean {
    return this.activeDriverField !== null;
  }
  
  // ========== Dropdown Portal Management ==========
  
  positionDropdown(event: any, assignmentId: string): void {
    this.isPositioning = true; // Prevent premature closing
    this.activeDriverField = assignmentId;
    
    // Get the ion-input element (the wrapper)
    const ionInputElement = event?.target || event;
    
    if (!ionInputElement) {
      this.isPositioning = false;
      return;
    }
    
    // Find the actual input element inside ion-input
    let actualInput = null;
    if (ionInputElement.tagName === 'ION-INPUT') {
      actualInput = ionInputElement.querySelector('input');
    } else {
      actualInput = ionInputElement;
    }
    
    if (!actualInput) {
      this.isPositioning = false;
      return;
    }
    
    this.activeInputElement = actualInput as HTMLElement;
    
    // Get bounding rect from the ion-input wrapper for full width
    const rect = ionInputElement.getBoundingClientRect ? 
      ionInputElement.getBoundingClientRect() : 
      actualInput.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const dropdownHeight = 200; // Max height of dropdown
    
    // Calculate position
    this.dropdownPosition = {
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: rect.width
    };
    
    // Adjust if dropdown would go below viewport
    if (rect.bottom + dropdownHeight > windowHeight) {
      this.dropdownPosition.top = rect.top + window.scrollY - dropdownHeight - 4;
    }
    
    // Create or update dropdown
    if (!this.dropdownElement) {
      this.createDropdown();
    }
    this.updateDropdownPosition();
    this.updateDropdownContent(assignmentId);
    
    // Reset positioning flag after a short delay to allow focus to complete
    setTimeout(() => {
      this.isPositioning = false;
    }, 150);
  }
  
  createClickListener(): (event: MouseEvent) => void {
    return (event: MouseEvent) => {
      if (!this.dropdownElement) return;
      
      // Don't close if we're currently positioning the dropdown or if preventClose flag is set
      if (this.isPositioning || (this.dropdownElement as any).__preventClose) return;
      
      const target = event.target as HTMLElement;
      const clickOnDropdown = this.dropdownElement.contains(target);
      
      // Check if click is on any driver autocomplete input by checking for the placeholder attribute
      const isDriverSearchInput = target.closest('.driver-autocomplete') !== null ||
                                 target.closest('ion-input[placeholder="Search driver"]') !== null ||
                                 target.querySelector('input[placeholder="Search driver"]') !== null ||
                                 (target.tagName === 'ION-INPUT' && target.getAttribute('placeholder') === 'Search driver') ||
                                 (target.tagName === 'INPUT' && (target as HTMLInputElement).placeholder === 'Search driver');
      
      // Only close if clicking outside both dropdown and any driver input
      if (!clickOnDropdown && !isDriverSearchInput) {
        this.closeDriverDropdown();
      }
    };
  }
  
  createDropdown(): void {
    if (this.dropdownElement) {
      return;
    }
    
    this.dropdownElement = this.renderer.createElement('div');
    this.renderer.addClass(this.dropdownElement, 'driver-dropdown-portal');
    this.renderer.setStyle(this.dropdownElement, 'position', 'fixed');
    this.renderer.setStyle(this.dropdownElement, 'z-index', '99999');
    this.renderer.setStyle(this.dropdownElement, 'pointer-events', 'auto');
    
    // Append to body
    this.renderer.appendChild(document.body, this.dropdownElement);
    
    // Listen for clicks outside the dropdown
    setTimeout(() => {
      const clickListener = this.createClickListener();
      document.addEventListener('click', clickListener, false);
      (this.dropdownElement as any).__clickListener = clickListener;
      
      // Also listen for mousedown to catch input clicks earlier
      const mousedownListener = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (target.closest('.driver-autocomplete') || 
            target.closest('ion-input') ||
            target.closest('ion-input[placeholder="Search driver"]')) {
          // If clicking on any driver input, prevent closing
          (this.dropdownElement as any).__preventClose = true;
          setTimeout(() => {
            (this.dropdownElement as any).__preventClose = false;
          }, 100);
        }
      };
      document.addEventListener('mousedown', mousedownListener);
      (this.dropdownElement as any).__mousedownListener = mousedownListener;
    }, 100);
  }
  
  updateDropdownPosition(): void {
    if (!this.dropdownElement) {
      return;
    }
    
    this.renderer.setStyle(this.dropdownElement, 'top', `${this.dropdownPosition.top}px`);
    this.renderer.setStyle(this.dropdownElement, 'left', `${this.dropdownPosition.left}px`);
    this.renderer.setStyle(this.dropdownElement, 'width', `${this.dropdownPosition.width}px`);
  }
  
  destroyDropdown(): void {
    if (this.dropdownElement) {
      // Remove click listener if it exists
      const clickListener = (this.dropdownElement as any).__clickListener;
      if (clickListener) {
        document.removeEventListener('click', clickListener, false);
      }
      
      // Remove mousedown listener if it exists
      const mousedownListener = (this.dropdownElement as any).__mousedownListener;
      if (mousedownListener) {
        document.removeEventListener('mousedown', mousedownListener);
      }
      
      this.renderer.removeChild(document.body, this.dropdownElement);
      this.dropdownElement = null;
    }
  }
  
  updateDropdownContent(assignmentId: string): void {
    if (!this.dropdownElement || this.activeDriverField !== assignmentId) {
      return;
    }
    
    const drivers = this.getFilteredDrivers(assignmentId);
    
    // Clear existing content
    this.dropdownElement.innerHTML = '';
    
    if (drivers.length === 0) {
      const noResults = this.renderer.createElement('div');
      this.renderer.addClass(noResults, 'driver-suggestion');
      this.renderer.setStyle(noResults, 'color', 'rgba(255, 255, 255, 0.5)');
      this.renderer.setStyle(noResults, 'font-style', 'italic');
      const text = this.renderer.createText('No drivers found');
      this.renderer.appendChild(noResults, text);
      this.renderer.appendChild(this.dropdownElement, noResults);
    } else {
      drivers.forEach((driver, index) => {
        const item = this.renderer.createElement('div');
        this.renderer.addClass(item, 'driver-suggestion');
        this.renderer.setProperty(item, 'tabindex', '0');
        
        const text = this.renderer.createText(driver);
        this.renderer.appendChild(item, text);
        
        this.renderer.listen(item, 'click', (event: MouseEvent) => {
          event.stopPropagation(); // Prevent document click listener from firing
          this.selectDriver(assignmentId, driver);
        });
        
        this.renderer.listen(item, 'keydown', (event: KeyboardEvent) => {
          if (event.key === 'Enter') {
            event.stopPropagation();
            this.selectDriver(assignmentId, driver);
          }
        });
        
        this.renderer.appendChild(this.dropdownElement, item);
      });
    }
    
    // Apply styles to dropdown container
    this.renderer.setStyle(this.dropdownElement, 'background', '#1e293b');
    this.renderer.setStyle(this.dropdownElement, 'border', '1px solid rgba(255, 255, 255, 0.2)');
    this.renderer.setStyle(this.dropdownElement, 'border-radius', '8px');
    this.renderer.setStyle(this.dropdownElement, 'max-height', '200px');
    this.renderer.setStyle(this.dropdownElement, 'overflow-y', 'auto');
    this.renderer.setStyle(this.dropdownElement, 'box-shadow', '0 8px 24px rgba(0, 0, 0, 0.8)');
  }
  
  isUnassigned(assignment: DriverAssignment): boolean {
    return isAssignmentUnassigned(assignment);
  }
  
  isNotesEditing(assignmentId: string): boolean {
    return this.editingNotes.get(assignmentId) || false;
  }
  
  startEditingNotes(assignmentId: string): void {
    this.editingNotes.set(assignmentId, true);
  }
  
  cancelEditingNotes(assignmentId: string): void {
    this.editingNotes.delete(assignmentId);
  }
  
  handleNotesKeydown(assignmentId: string, event: KeyboardEvent, currentIndex: number): void {
    // Check if Tab key is pressed
    if (event.key === 'Tab' || event.keyCode === 9) {
      // Prevent default tab behavior
      event.preventDefault();
      event.stopPropagation();
      
      // Don't save - keep current row in edit mode and move to next row
      // Find the next row
      if (!this.dailyPlan || !this.dailyPlan.assignments) {
        return;
      }
      
      const nextIndex = currentIndex + 1;
      if (nextIndex < this.dailyPlan.assignments.length) {
        const nextAssignment = this.dailyPlan.assignments[nextIndex];
        
        // Start editing the next row
        this.startEditing(nextAssignment);
        
        // Focus on the driver input of the next row after a short delay to ensure it's rendered
        setTimeout(() => {
          this.focusDriverInput(nextAssignment.id || '');
        }, 100);
      }
    }
  }
  
  handleAddNotesButtonKeydown(assignmentId: string, event: KeyboardEvent, currentIndex: number): void {
    // Check if Tab key is pressed
    if (event.key === 'Tab' || event.keyCode === 9) {
      // Prevent default tab behavior
      event.preventDefault();
      event.stopPropagation();
      
      // Find the next row
      if (!this.dailyPlan || !this.dailyPlan.assignments) {
        return;
      }
      
      const nextIndex = currentIndex + 1;
      if (nextIndex < this.dailyPlan.assignments.length) {
        const nextAssignment = this.dailyPlan.assignments[nextIndex];
        
        // Start editing the next row
        this.startEditing(nextAssignment);
        
        // Focus on the driver input of the next row after a short delay to ensure it's rendered
        setTimeout(() => {
          this.focusDriverInput(nextAssignment.id || '');
        }, 100);
      }
    }
  }
  
  focusDriverInput(assignmentId: string): void {
    // Use a small delay to ensure Angular has rendered the new editing state
    setTimeout(() => {
      const editState = this.editingStates.get(assignmentId);
      if (!editState) return;
      
      // Find the driver input for the row with this assignment ID
      const rows = document.querySelectorAll('.table-row');
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i] as HTMLElement;
        
        // Check if this row is in editing mode and matches our assignment
        if (row.classList.contains('editing')) {
          // Get the assignment for this row index
          if (this.dailyPlan && this.dailyPlan.assignments[i]) {
            const rowAssignment = this.dailyPlan.assignments[i];
            if (rowAssignment.id === assignmentId) {
              // Found the matching row - get its driver input
              const ionInputElement = row.querySelector('.driver-autocomplete ion-input') as HTMLElement;
              if (ionInputElement) {
                const nativeInput = ionInputElement.shadowRoot?.querySelector('input') || 
                                    ionInputElement.querySelector('input');
                if (nativeInput instanceof HTMLInputElement) {
                  // Focus the input first
                  nativeInput.focus();
                  
                  // Set as active input element
                  this.activeInputElement = nativeInput;
                  
                  // Trigger the dropdown to open by calling positionDropdown
                  // Pass the ion-input element so it can find the correct bounding rect
                  setTimeout(() => {
                    // Call positionDropdown with the ion-input element
                    this.positionDropdown(ionInputElement, assignmentId);
                    
                    // Also manually trigger filterDriverName to ensure dropdown content is populated
                    const currentValue = this.getEditingValue(assignmentId, 'driverName') || '';
                    this.filterDriverName(assignmentId, currentValue);
                  }, 50);
                  return;
                }
              }
            }
          }
        }
      }
      
      // Fallback: if we couldn't find by ID, use the last visible driver input
      const driverInputs = document.querySelectorAll('.driver-autocomplete ion-input');
      if (driverInputs.length > 0) {
        const ionInputElement = driverInputs[driverInputs.length - 1] as HTMLElement;
        const nativeInput = ionInputElement.shadowRoot?.querySelector('input') || 
                            ionInputElement.querySelector('input');
        if (nativeInput instanceof HTMLInputElement) {
          nativeInput.focus();
          this.activeInputElement = nativeInput;
          setTimeout(() => {
            this.positionDropdown(ionInputElement, assignmentId);
            const currentValue = this.getEditingValue(assignmentId, 'driverName') || '';
            this.filterDriverName(assignmentId, currentValue);
          }, 50);
        }
      }
    }, 150);
  }
  
  isCompleted(assignment: DriverAssignment): boolean {
    return !!(assignment.vanId && 
              assignment.vanId.trim() !== '' && 
              assignment.driverName && 
              assignment.driverName.trim() !== '' &&
              assignment.routeNumber && 
              assignment.routeNumber.trim() !== '' &&
              assignment.staging &&
              assignment.staging.trim() !== '' &&
              assignment.wave !== undefined &&
              assignment.pad !== undefined);
  }
  
  hasAllInformation(assignment: DriverAssignment): boolean {
    const assignmentId = assignment.id || '';
    const isEditing = this.isAssignmentEditing(assignmentId);
    
    // Van is always required and comes from the original assignment (read-only)
    const hasVan = !!(assignment.vanId && assignment.vanId.trim() !== '');
    if (!hasVan) return false;
    
    if (isEditing) {
      // Check editing values for other fields
      const editState = this.editingStates.get(assignmentId);
      if (!editState) return false;
      
      const editingAssignment = editState.assignment;
      return !!(editingAssignment.driverName && 
                editingAssignment.driverName.trim() !== '' &&
                editingAssignment.routeNumber && 
                editingAssignment.routeNumber.trim() !== '' &&
                editingAssignment.staging &&
                editingAssignment.staging.trim() !== '' &&
                editingAssignment.wave !== undefined &&
                editingAssignment.pad !== undefined);
    } else {
      // Check actual assignment values
      return this.isCompleted(assignment);
    }
  }
  
  getWaveNumber(assignment: DriverAssignment): number | null {
    const assignmentId = assignment.id || '';
    const isEditing = this.isAssignmentEditing(assignmentId);
    
    if (isEditing) {
      const editState = this.editingStates.get(assignmentId);
      return editState?.assignment?.wave ?? null;
    } else {
      return assignment.wave ?? null;
    }
  }
  
  getFormattedDate(): string {
    // Return cached value if date hasn't changed
    if (this._cachedFormattedDate && this.selectedDate) {
      return this._cachedFormattedDate;
    }
    this._cachedFormattedDate = this.planningService.formatDate(this.selectedDate);
    return this._cachedFormattedDate;
  }
  
  // Update all cached properties
  private updateCachedProperties(): void {
    if (!this.dailyPlan) {
      this._cachedGroupedAssignmentsByWave = [];
      this._cachedHasMultipleWaves = false;
      this._cachedAllCompletedChecked = false;
      this._cachedSomeCompletedChecked = false;
      return;
    }
    
    // Update grouped assignments cache
    this._cachedGroupedAssignmentsByWave = this.computeGroupedAssignmentsByWave();
    
    // Update multiple waves cache
    this._cachedHasMultipleWaves = this.computeHasMultipleWaves();
    
    // Update checkbox states cache
    this._cachedAllCompletedChecked = this.computeAllCompletedChecked();
    this._cachedSomeCompletedChecked = this.computeSomeCompletedChecked();
    
    // Update formatted date cache
    this._cachedFormattedDate = this.planningService.formatDate(this.selectedDate);
    
    this._lastCacheUpdate = Date.now();
  }
  
  // Internal computation methods (not called from template)
  private computeGroupedAssignmentsByWave(): Array<{ wave: number | null; assignments: DriverAssignment[] }> {
    if (!this.dailyPlan) {
      return [];
    }
    
    const sorted = this.computeSortedAssignments();
    
    if (!this.isGroupedByWave) {
      return [{ wave: null, assignments: sorted }];
    }
    
    // Group by wave
    const groups = new Map<number | null, DriverAssignment[]>();
    
    sorted.forEach(assignment => {
      const wave = assignment.wave ?? null;
      if (!groups.has(wave)) {
        groups.set(wave, []);
      }
      groups.get(wave)!.push(assignment);
    });
    
    // Convert to array and sort by wave (null last)
    return Array.from(groups.entries())
      .map(([wave, assignments]) => ({ wave, assignments }))
      .sort((a, b) => {
        if (a.wave === null) return 1;
        if (b.wave === null) return -1;
        return a.wave - b.wave;
      });
  }
  
  private computeSortedAssignments(): DriverAssignment[] {
    if (!this.dailyPlan) {
      return [];
    }
    
    const assignments = [...this.dailyPlan.assignments];
    
    // If grouping is enabled or all assignments are completed, sort by wave
    if (this.isGroupedByWave || this.computeAreAllAssignmentsCompleted()) {
      return assignments.sort((a, b) => {
        const waveA = a.wave ?? 0;
        const waveB = b.wave ?? 0;
        
        if (waveA !== waveB) {
          return waveA - waveB;
        }
        
        return 0;
      });
    }
    
    return assignments;
  }
  
  private computeAreAllAssignmentsCompleted(): boolean {
    if (!this.dailyPlan || this.dailyPlan.assignments.length === 0) {
      return false;
    }
    
    return this.dailyPlan.assignments.every(assignment => this.isCompleted(assignment));
  }
  
  private computeHasMultipleWaves(): boolean {
    if (!this.dailyPlan || this.dailyPlan.assignments.length === 0) {
      return false;
    }
    
    const assignedWaves = new Set<number>();
    this.dailyPlan.assignments.forEach(assignment => {
      if (assignment.wave !== undefined && assignment.wave !== null && !this.isUnassigned(assignment)) {
        assignedWaves.add(assignment.wave);
      }
    });
    
    return assignedWaves.size >= 2;
  }
  
  private computeAllCompletedChecked(): boolean {
    if (!this.dailyPlan) return false;
    const assignmentsWithCheckboxes = this.dailyPlan.assignments.filter(a => this.hasAllInformation(a));
    if (assignmentsWithCheckboxes.length === 0) return false;
    return assignmentsWithCheckboxes.every(a => this.checkedAssignments.has(a.id || ''));
  }
  
  private computeSomeCompletedChecked(): boolean {
    if (!this.dailyPlan) return false;
    const assignmentsWithCheckboxes = this.dailyPlan.assignments.filter(a => this.hasAllInformation(a));
    return assignmentsWithCheckboxes.some(a => this.checkedAssignments.has(a.id || ''));
  }
  
  // Check if all assignments are completed
  areAllAssignmentsCompleted(): boolean {
    return this.computeAreAllAssignmentsCompleted();
  }
  
  // Check if there are 2 or more different waves assigned (cached)
  hasMultipleWavesAssigned(): boolean {
    return this._cachedHasMultipleWaves;
  }
  
  // Toggle wave grouping
  toggleWaveGrouping(): void {
    this.isGroupedByWave = !this.isGroupedByWave;
    this.updateCachedProperties();
  }
  
  // Get grouped assignments by wave for display with separators (cached)
  getGroupedAssignmentsByWave(): Array<{ wave: number | null; assignments: DriverAssignment[] }> {
    return this._cachedGroupedAssignmentsByWave;
  }
  
  // TrackBy functions for *ngFor optimization
  trackByGroupIndex(index: number, group: { wave: number | null; assignments: DriverAssignment[] }): string {
    return `group-${group.wave ?? 'null'}-${index}`;
  }
  
  trackByAssignmentId(index: number, assignment: DriverAssignment): string {
    return assignment.id || `assignment-${index}`;
  }
  
  // ========== Print Functionality ==========
  
  printPlan(): void {
    // Add print class to body to trigger print styles
    document.body.classList.add('printing');
    
    // Wait a moment for styles to apply, then print
    setTimeout(() => {
      window.print();
      
      // Remove print class after printing
      setTimeout(() => {
        document.body.classList.remove('printing');
      }, 500);
    }, 100);
  }
  
  // ========== Toast Messages ==========
  
  private async showToast(message: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'top',
    });
    await toast.present();
  }
  
  // ========== Generate Routes ==========
  
  async generateRoutes(): Promise<void> {
    if (!this.dailyPlan || this.numberOfRoutes <= 0) {
      this.showToast('Please enter a valid number of routes', 'warning');
      return;
    }
    
    this.isSaving = true;
    
    const loading = await this.loadingCtrl.create({
      message: `Creating ${this.numberOfRoutes} routes...`,
      duration: 0,
    });
    await loading.present();
    
    try {
      // Clear existing assignments
      this.dailyPlan.assignments = [];
      
      // Create assignment slots for each route
      // Fill with active vans first (which are already sorted EDV -> CDV -> Rental)
      const activeVansCount = this.allVans.length;
      const routesToFill = Math.min(this.numberOfRoutes, activeVansCount);
      
      
      for (let i = 0; i < this.numberOfRoutes; i++) {
        let vanId = '';
        let vanType: VehicleType = 'CDV';
        let vanNumber = i + 1;
        
        // If we have an active van for this slot, assign it
        if (i < activeVansCount) {
          const van = this.allVans[i];
          vanId = van.docId;
          vanType = (van.type || 'CDV') as VehicleType;
          vanNumber = van.number || i + 1;
          
        } else {
        }
        
        const assignment: DriverAssignment = {
          id: this.planningService.generateId(),
          date: this.selectedDate,
          vanId,
          vanType,
          vanNumber,
          driverName: '',
        };
        this.dailyPlan.assignments.push(assignment);
      }
      
      // Save the plan
      await this.planningService.saveDailyPlan(this.dailyPlan);
      this.showToast(`Created ${this.numberOfRoutes} routes (${routesToFill} with vans, ${this.numberOfRoutes - routesToFill} empty)`, 'success');
      
      // Reload to ensure data is fresh
      await this.loadDailyPlan();
      
    } catch (error) {
      console.error('Error generating routes:', error);
      this.showToast('Failed to generate routes', 'danger');
    } finally {
      this.isSaving = false;
      await loading.dismiss();
    }
  }
  
  // ========== Save All ==========
  
  async saveAll(): Promise<void> {
    if (!this.dailyPlan) return;
    
    this.isSaving = true;
    
    const loading = await this.loadingCtrl.create({
      message: 'Saving all changes...',
      duration: 0,
    });
    await loading.present();
    
    try {
      await this.planningService.saveDailyPlan(this.dailyPlan);
      this.showToast('All changes saved successfully', 'success');
      
      // Reload to ensure data is fresh
      await this.loadDailyPlan();
      
    } catch (error) {
      console.error('Error saving daily plan:', error);
      this.showToast('Failed to save changes', 'danger');
    } finally {
      this.isSaving = false;
      await loading.dismiss();
    }
  }
  
  // ========== Assignment Clearing ==========
  
  async clearAssignmentData(assignmentId: string): Promise<void> {
    if (!this.dailyPlan || !assignmentId) return;
    
    const assignment = this.dailyPlan.assignments.find(a => a.id === assignmentId);
    if (!assignment) return;
    
    // Ask for confirmation
    const confirmed = confirm('Are you sure you want to clear all data from this assignment?');
    if (!confirmed) return;
    
    this.isSaving = true;
    
    const loading = await this.loadingCtrl.create({
      message: 'Clearing assignment...',
      duration: 0,
    });
    await loading.present();
    
    try {
      // Clear all fields except the vehicle info
      const clearedAssignment: DriverAssignment = {
        ...assignment,
        driverName: '',
        routeNumber: '',
        staging: '',
        wave: undefined,
        pad: undefined,
        phoneBatteryLights: '',
        notes: '',
      };
      
      await this.planningService.updateAssignment(
        this.selectedDate,
        assignmentId,
        clearedAssignment
      );
      
      // Remove from checked if it was checked
      this.checkedAssignments.delete(assignmentId);
      
      // Reload to ensure data is fresh
      await this.loadDailyPlan();
      
      this.showToast('Assignment cleared successfully', 'success');
    } catch (error) {
      console.error('Error clearing assignment:', error);
      this.showToast('Failed to clear assignment', 'danger');
    } finally {
      this.isSaving = false;
      await loading.dismiss();
    }
  }
  
  // ========== Checkbox Management ==========
  
  isChecked(assignmentId: string): boolean {
    return this.checkedAssignments.has(assignmentId);
  }
  
  toggleChecked(assignmentId: string, checked: boolean): void {
    if (checked) {
      this.checkedAssignments.add(assignmentId);
    } else {
      this.checkedAssignments.delete(assignmentId);
    }
    this.updateCachedProperties();
  }
  
  isAllCompletedChecked(): boolean {
    return this._cachedAllCompletedChecked;
  }
  
  isSomeCompletedChecked(): boolean {
    return this._cachedSomeCompletedChecked;
  }
  
  toggleAllCompleted(checked: boolean): void {
    if (!this.dailyPlan) return;
    // Get all assignments that have checkboxes (have all information filled)
    const assignmentsWithCheckboxes = this.dailyPlan.assignments.filter(a => this.hasAllInformation(a));
    assignmentsWithCheckboxes.forEach(a => {
      const id = a.id || '';
      if (checked) {
        this.checkedAssignments.add(id);
      } else {
        this.checkedAssignments.delete(id);
      }
    });
    this.updateCachedProperties();
  }
  
  hasCheckedAssignments(): boolean {
    return this.checkedAssignments.size > 0;
  }
  
  getCheckedCount(): number {
    return this.checkedAssignments.size;
  }
  
  async submitCheckedAssignments(): Promise<void> {
    if (!this.dailyPlan || this.checkedAssignments.size === 0) return;
    
    this.isSaving = true;
    
    const loading = await this.loadingCtrl.create({
      message: `Submitting ${this.checkedAssignments.size} assignment(s)...`,
      duration: 0,
    });
    await loading.present();
    
    try {
      const checkedIds = Array.from(this.checkedAssignments);
      
      // Save each checked assignment
      for (const assignmentId of checkedIds) {
        // Find the original assignment to preserve required fields
        const originalAssignment = this.dailyPlan.assignments.find(a => a.id === assignmentId);
        if (!originalAssignment) continue;
        
        // Check if assignment is being edited - if so, merge edited values with original
        const editState = this.editingStates.get(assignmentId);
        let assignmentToSave: DriverAssignment;
        
        if (editState) {
          // Merge edited values with original to ensure all fields are preserved
          assignmentToSave = {
            ...originalAssignment,
            ...editState.assignment,
            id: originalAssignment.id, // Ensure ID is preserved
            date: originalAssignment.date, // Ensure date is preserved
            vanId: originalAssignment.vanId, // Ensure vanId is preserved
            vanType: originalAssignment.vanType, // Ensure vanType is preserved
            vanNumber: originalAssignment.vanNumber, // Ensure vanNumber is preserved
          };
        } else {
          // Use original assignment values
          assignmentToSave = originalAssignment;
        }
        
        if (assignmentToSave.id) {
          await this.planningService.updateAssignment(
            this.selectedDate,
            assignmentToSave.id,
            assignmentToSave
          );
          
          // Exit edit mode after saving
          this.cancelEditing(assignmentToSave.id);
        }
      }
      
      // Clear checked assignments
      this.checkedAssignments.clear();
      
      // Reload to ensure data is fresh
      await this.loadDailyPlan();
      
      this.showToast(`Successfully submitted ${checkedIds.length} assignment(s)`, 'success');
    } catch (error) {
      console.error('Error submitting assignments:', error);
      this.showToast('Failed to submit assignments', 'danger');
    } finally {
      this.isSaving = false;
      await loading.dismiss();
    }
  }
}

