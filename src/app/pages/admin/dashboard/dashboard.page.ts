// src/app/pages/admin/dashboard/dashboard.page.ts
import { Component, OnInit, OnDestroy, AfterViewInit, NgZone, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { 
  IonContent, 
  IonGrid, 
  IonRow, 
  IonCol, 
  IonCard, 
  IonCardHeader, 
  IonCardTitle, 
  IonCardContent,
  IonIcon,
  IonSpinner,
  IonButton,
  ModalController
} from '@ionic/angular/standalone';
import { Firestore, collection, collectionData, Timestamp, CollectionReference, doc, getDoc, updateDoc } from '@angular/fire/firestore';
import { Van } from '@app/models/van.model';
import { Inspection } from '@app/services/inspection.service';
import { PlanningService } from '@app/services/planning.service';
import { DailyPlan, getPlanStats } from '@app/models/planning.model';
import { BreadcrumbService } from '@app/services/breadcrumb.service';
import { AuthService, UserProfile } from '@app/services/auth.service';
import { ToastController } from '@ionic/angular';
import { Subscription, combineLatest, from, of } from 'rxjs';
import { map, catchError, filter, take } from 'rxjs/operators';
import { StatisticsGridComponent, StatCard } from '@app/components/statistics-grid/statistics-grid.component';
import { RecentSubmissionsModalComponent } from '@app/components/recent-submissions/recent-submissions-modal.component';

interface VanStats {
  total: number;
  active: number;
  grounded: number;
  byType: {
    CDV: number;
    EDV: number;
    Rental: number;
  };
  assigned: number;
  unassigned: number;
  expiringDocs: number;
  expiredDocs: number;
}

interface InspectionStats {
  pending: number;
  approved: number;
  rejected: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  openIssues: number;
  resolvedIssues: number;
  highSeverityIssues: number;
  mediumSeverityIssues: number;
  lowSeverityIssues: number;
}

interface DriverStats {
  activeToday: number;
  uniqueThisWeek: number;
  uniqueThisMonth: number;
  mostAssigned: Array<{ name: string; count: number }>;
  assignmentRate: number;
  coverageByType: {
    CDV: number;
    EDV: number;
    Rental: number;
    BUDGET: number;
  };
}

interface OperationalHealth {
  readyForService: number;
  needsAttention: number;
}

interface UserStats {
  total: number;
  active: number;
  inactive: number;
}

interface StatisticsSection {
  id: string;
  title: string;
  icon: string;
  order: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonIcon,
    IonSpinner,
    IonButton,
    StatisticsGridComponent
  ],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss']
})
export class DashboardPage implements OnInit, OnDestroy, AfterViewInit {
  // Data
  vans: Van[] = [];
  inspections: Inspection[] = [];
  users: UserProfile[] = [];
  todayPlan: DailyPlan | null = null;
  
  // Statistics
  vanStats: VanStats = {
    total: 0,
    active: 0,
    grounded: 0,
    byType: { CDV: 0, EDV: 0, Rental: 0 },
    assigned: 0,
    unassigned: 0,
    expiringDocs: 0,
    expiredDocs: 0
  };
  
  inspectionStats: InspectionStats = {
    pending: 0,
    approved: 0,
    rejected: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    openIssues: 0,
    resolvedIssues: 0,
    highSeverityIssues: 0,
    mediumSeverityIssues: 0,
    lowSeverityIssues: 0
  };
  
  driverStats: DriverStats = {
    activeToday: 0,
    uniqueThisWeek: 0,
    uniqueThisMonth: 0,
    mostAssigned: [],
    assignmentRate: 0,
    coverageByType: { CDV: 0, EDV: 0, Rental: 0, BUDGET: 0 }
  };
  
  operationalHealth: OperationalHealth = {
    readyForService: 0,
    needsAttention: 0
  };
  
  userStats: UserStats = {
    total: 0,
    active: 0,
    inactive: 0
  };
  
  // Loading state
  isLoading = true;
  
  // Edit mode
  isEditMode = false;
  
  // User info
  userDisplayName: string = 'User';
  
  // Section editing state
  editingSectionId: string | null = null;
  editingSectionTitle: string = '';
  
  // Sections and cards
  sections: StatisticsSection[] = [];
  cardsBySection: Record<string, StatCard[]> = {};
  allCards: StatCard[] = []; // Flattened array of all cards for the unified grid
  private readonly STORAGE_KEY_SECTIONS = 'statistics_sections_order';
  private readonly STORAGE_KEY_SECTIONS_DATA = 'statistics_sections_data'; // Store full section data including titles
  private readonly STORAGE_KEY_CARDS = 'statistics_cards_order';
  private readonly STORAGE_KEY_EDIT_MODE = 'statistics_edit_mode';
  private readonly DEFAULT_SECTIONS: StatisticsSection[] = [
    { id: 'vans', title: 'Van Statistics', icon: 'car-outline', order: 0 },
    { id: 'inspections', title: 'Inspection Statistics', icon: 'document-text-outline', order: 1 },
    { id: 'drivers', title: 'Driver Statistics', icon: 'people-outline', order: 2 },
    { id: 'health', title: 'Operational Health', icon: 'pulse-outline', order: 3 }
  ];
  
  // Subscriptions
  private subscriptions = new Subscription();
  
  // Services
  private firestore = inject(Firestore);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private planningService = inject(PlanningService);
  private breadcrumbService = inject(BreadcrumbService);
  private authService = inject(AuthService);
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);
  
  async ngOnInit() {
    this.breadcrumbService.clearTail();
    
    // Always wait for user to be authenticated - use a promise-based approach
    const loadPreferencesAndData = async () => {
      // Wait for user authentication
      let user = this.authService.currentUser$.value;
      if (!user) {
        // Wait for user to be authenticated
        await new Promise<void>((resolve) => {
          const userSub = this.authService.currentUser$.pipe(
            filter(u => u !== null),
            take(1)
          ).subscribe((u) => {
            user = u;
            userSub.unsubscribe();
            resolve();
          });
        });
      }
      
      if (user) {
        // Load preferences first
        await this.loadDashboardPreferences();
      }
      
      // Then load data (this will trigger initializeCards which uses the preferences)
      this.loadAllData();
      this.loadUserInfo();
    };
    
    // Start loading
    loadPreferencesAndData().catch(error => {
      console.error('Error in ngOnInit:', error);
      // Fallback: load data anyway
      this.loadAllData();
      this.loadUserInfo();
    });
  }
  
  private loadUserInfo() {
    const sub = this.authService.currentUserProfile$.subscribe(profile => {
      this.userDisplayName = this.authService.getFirstName(profile);
    });
    this.subscriptions.add(sub);
  }
  
  ngAfterViewInit() {
    // Don't initialize cards here - they'll be initialized when data loads
    // This prevents double initialization and preserves saved preferences
  }
  
  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
  
  private loadAllData(): void {
    const vansRef = collection(this.firestore, 'vans') as CollectionReference<Van>;
    const inspectionsRef = collection(this.firestore, 'inspections') as CollectionReference<Inspection>;
    const usersRef = collection(this.firestore, 'users') as CollectionReference<UserProfile>;
    
    const vans$ = collectionData<Van>(vansRef, { idField: 'docId' });
    const inspections$ = collectionData<Inspection>(inspectionsRef, { idField: 'id' });
    const users$ = collectionData<UserProfile>(usersRef, { idField: 'uid' });
    
    // Get today's plan
    const today = new Date().toISOString().split('T')[0];
    const todayPlan$ = from(this.planningService.getDailyPlan(today)).pipe(
      map(plan => plan || null),
      catchError(() => of(null))
    );
    
    this.subscriptions.add(
      combineLatest([vans$, inspections$, users$, todayPlan$]).subscribe({
        next: ([vans, inspections, users, plan]) => {
          this.ngZone.run(() => {
            this.vans = vans;
            this.inspections = inspections;
            this.users = users;
            this.todayPlan = plan;
            this.calculateAllStats();
            this.initializeCards();
            this.isLoading = false;
          });
        },
        error: (error) => {
          console.error('Error loading statistics data:', error);
          this.ngZone.run(() => {
            this.isLoading = false;
          });
        }
      })
    );
  }
  
  private calculateAllStats(): void {
    this.calculateVanStats();
    this.calculateInspectionStats();
    this.calculateDriverStats();
    this.calculateOperationalHealth();
    this.calculateUserStats();
    // Update card values after stats are calculated
    this.updateCardValues();
  }
  
  private calculateUserStats(): void {
    const total = this.users.length;
    const active = this.users.filter(u => u.isActive === true).length;
    const inactive = this.users.filter(u => u.isActive === false).length;
    
    this.userStats = {
      total,
      active,
      inactive
    };
  }
  
  private updateCardValues(): void {
    // Update card values with latest stats (this doesn't change order)
    if (this.cardsBySection['vans']) {
      this.cardsBySection['vans'].forEach(card => {
        switch(card.id) {
          case 'vans-assigned': card.value = this.vanStats.assigned; card.label = `${this.vanStats.unassigned} unassigned`; break;
        }
      });
    }
    // Inspection timeframe tile values are handled in the template directly
    if (this.cardsBySection['drivers']) {
      this.cardsBySection['drivers'].forEach(card => {
        switch(card.id) {
          case 'driver-active': card.value = this.driverStats.activeToday; break;
          case 'driver-week': card.value = this.driverStats.uniqueThisWeek; break;
          case 'driver-month': card.value = this.driverStats.uniqueThisMonth; break;
          case 'driver-rate': card.value = this.driverStats.assignmentRate; break;
        }
      });
    }
    if (this.cardsBySection['health']) {
      this.cardsBySection['health'].forEach(card => {
        switch(card.id) {
          case 'health-ready': card.value = this.operationalHealth.readyForService; break;
        }
      });
    }
    
    // Update values in allCards array without changing order
    // Only rebuild if we don't have a saved order (to preserve exact positions)
    if (!(this as any)._hasSavedOrder) {
      this.updateAllCards();
    } else {
      // Just sync values from cardsBySection to allCards without reordering
      const cardsMap = new Map(this.allCards.map(c => [c.id, c]));
      Object.values(this.cardsBySection).forEach(sectionCards => {
        sectionCards.forEach(card => {
          const existingCard = cardsMap.get(card.id);
          if (existingCard) {
            // Update values but keep position
            existingCard.value = card.value;
            existingCard.label = card.label;
          }
        });
      });
    }
  }
  
  private calculateVanStats(): void {
    const total = this.vans.length;
    const active = this.vans.filter(v => !v.isGrounded).length;
    const grounded = this.vans.filter(v => v.isGrounded).length;
    
    const byType = {
      CDV: this.vans.filter(v => v.type?.toUpperCase() === 'CDV').length,
      EDV: this.vans.filter(v => v.type?.toUpperCase() === 'EDV').length,
      Rental: this.vans.filter(v => v.type?.toUpperCase() === 'RENTAL').length
    };
    
    // Calculate assigned/unassigned from today's plan
    let assigned = 0;
    let unassigned = 0;
    if (this.todayPlan) {
      const stats = getPlanStats(this.todayPlan);
      assigned = stats.totalAssigned;
      unassigned = stats.totalUnassigned;
    }
    
    // Check for expiring/expired documents
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    let expiringDocs = 0;
    let expiredDocs = 0;
    
    this.vans.forEach(van => {
      // Check registration expiry
      if (van.registrationInfo?.registrationExpiry) {
        const expiry = new Date(van.registrationInfo.registrationExpiry);
        if (expiry < now) {
          expiredDocs++;
        } else if (expiry <= thirtyDaysFromNow) {
          expiringDocs++;
        }
      }
      
      // Check insurance expiry
      if (van.insuranceInfo?.coverageExpiry) {
        const expiry = new Date(van.insuranceInfo.coverageExpiry);
        if (expiry < now) {
          expiredDocs++;
        } else if (expiry <= thirtyDaysFromNow) {
          expiringDocs++;
        }
      }
    });
    
    this.vanStats = {
      total,
      active,
      grounded,
      byType,
      assigned,
      unassigned,
      expiringDocs,
      expiredDocs
    };
  }
  
  private calculateInspectionStats(): void {
    // Time-based stats
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Filter inspections to only today's inspections
    const todayInspections = this.inspections.filter(i => {
      const created = this.getDateFromTimestamp(i.createdAt);
      return created >= today;
    });
    
    const pending = todayInspections.filter(i => i.status === 'pending').length;
    const approved = todayInspections.filter(i => i.status === 'approved').length;
    const rejected = todayInspections.filter(i => i.status === 'rejected').length;
    
    const todayCount = todayInspections.length;
    
    const thisWeekCount = this.inspections.filter(i => {
      const created = this.getDateFromTimestamp(i.createdAt);
      return created >= weekAgo;
    }).length;
    
    const thisMonthCount = this.inspections.filter(i => {
      const created = this.getDateFromTimestamp(i.createdAt);
      return created >= monthAgo;
    }).length;
    
    // Issue stats
    let openIssues = 0;
    let resolvedIssues = 0;
    let highSeverityIssues = 0;
    let mediumSeverityIssues = 0;
    let lowSeverityIssues = 0;
    
    this.inspections.forEach(inspection => {
      if (inspection.report && inspection.report.length > 0) {
        inspection.report.forEach(issue => {
          if (issue.status === 'open' || !issue.status) {
            openIssues++;
          } else if (issue.status === 'resolved') {
            resolvedIssues++;
          }
          
          if (issue.severity === 'high') {
            highSeverityIssues++;
          } else if (issue.severity === 'medium') {
            mediumSeverityIssues++;
          } else if (issue.severity === 'low') {
            lowSeverityIssues++;
          }
        });
      }
    });
    
    this.inspectionStats = {
      pending,
      approved,
      rejected,
      today: todayCount,
      thisWeek: thisWeekCount,
      thisMonth: thisMonthCount,
      openIssues,
      resolvedIssues,
      highSeverityIssues,
      mediumSeverityIssues,
      lowSeverityIssues
    };
  }
  
  private calculateDriverStats(): void {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Active drivers today
    const activeToday = new Set<string>();
    if (this.todayPlan) {
      this.todayPlan.assignments.forEach(a => {
        if (a.driverName && a.driverName.trim()) {
          activeToday.add(a.driverName);
        }
      });
    }
    
    // Get assignments for this week and month
    // Note: This is a simplified calculation. In production, you'd want to fetch multiple daily plans
    const uniqueThisWeek = new Set<string>();
    const uniqueThisMonth = new Set<string>();
    const driverCounts = new Map<string, number>();
    
    if (this.todayPlan) {
      this.todayPlan.assignments.forEach(a => {
        if (a.driverName && a.driverName.trim()) {
          uniqueThisWeek.add(a.driverName);
          uniqueThisMonth.add(a.driverName);
          
          const count = driverCounts.get(a.driverName) || 0;
          driverCounts.set(a.driverName, count + 1);
        }
      });
    }
    
    // Most assigned drivers
    const mostAssigned = Array.from(driverCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Assignment rate
    const totalVans = this.vans.filter(v => !v.isGrounded).length;
    const assignmentRate = totalVans > 0 ? (this.vanStats.assigned / totalVans) * 100 : 0;
    
    // Coverage by type
    const coverageByType = {
      CDV: 0,
      EDV: 0,
      Rental: 0,
      BUDGET: 0
    };
    
    if (this.todayPlan) {
      const stats = getPlanStats(this.todayPlan);
      const totalCDV = stats.cdvAssigned + stats.cdvUnassigned;
      const totalEDV = stats.edvAssigned + stats.edvUnassigned;
      const totalRental = stats.rentalAssigned + stats.rentalUnassigned;
      const totalBudget = stats.budgetAssigned + stats.budgetUnassigned;
      
      coverageByType.CDV = totalCDV > 0 ? (stats.cdvAssigned / totalCDV) * 100 : 0;
      coverageByType.EDV = totalEDV > 0 ? (stats.edvAssigned / totalEDV) * 100 : 0;
      coverageByType.Rental = totalRental > 0 ? (stats.rentalAssigned / totalRental) * 100 : 0;
      coverageByType.BUDGET = totalBudget > 0 ? (stats.budgetAssigned / totalBudget) * 100 : 0;
    }
    
    this.driverStats = {
      activeToday: activeToday.size,
      uniqueThisWeek: uniqueThisWeek.size,
      uniqueThisMonth: uniqueThisMonth.size,
      mostAssigned,
      assignmentRate: Math.round(assignmentRate),
      coverageByType
    };
  }
  
  private calculateOperationalHealth(): void {
    // Vans ready for service: active + assigned + recent inspection (within last 7 days)
    const weekAgo = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000);
    const readyForService = this.vans.filter(van => {
      if (van.isGrounded) return false;
      
      // Check if assigned today
      const isAssigned = this.todayPlan?.assignments.some(
        a => a.vanId === van.docId && a.driverName && a.driverName.trim()
      ) || false;
      
      // Check for recent inspection
      const recentInspection = this.inspections.some(i => {
        if (i.vanType?.toUpperCase() !== van.type?.toUpperCase()) return false;
        if (i.vanNumber !== van.number?.toString()) return false;
        const created = this.getDateFromTimestamp(i.createdAt);
        return created >= weekAgo && i.status === 'approved';
      });
      
      return isAssigned && recentInspection;
    }).length;
    
    // Vans needing attention: grounded OR open issues OR expired docs
    const needsAttention = this.vans.filter(van => {
      if (van.isGrounded) return true;
      
      // Check for open issues
      const hasOpenIssues = this.inspections.some(i => {
        if (i.vanType?.toUpperCase() !== van.type?.toUpperCase()) return false;
        if (i.vanNumber !== van.number?.toString()) return false;
        return i.report?.some(issue => issue.status === 'open' || !issue.status);
      });
      
      // Check for expired documents
      const now = new Date();
      const hasExpiredDocs = 
        (van.registrationInfo?.registrationExpiry && new Date(van.registrationInfo.registrationExpiry) < now) ||
        (van.insuranceInfo?.coverageExpiry && new Date(van.insuranceInfo.coverageExpiry) < now);
      
      return hasOpenIssues || hasExpiredDocs;
    }).length;
    
    this.operationalHealth = {
      readyForService,
      needsAttention
    };
  }
  
  private getDateFromTimestamp(timestamp: any): Date {
    if (!timestamp) return new Date(0);
    if (timestamp instanceof Date) return timestamp;
    if (timestamp instanceof Timestamp) return timestamp.toDate();
    if (timestamp.toDate) return timestamp.toDate();
    return new Date(timestamp);
  }
  
  formatNumber(num: number): string {
    return num.toLocaleString();
  }
  
  formatPercentage(num: number): string {
    return `${Math.round(num)}%`;
  }
  
  // Card movement handler
  
  moveCard(event: { cardId: string; direction: 'up' | 'down' | 'left' | 'right' }): void {
    const cardIndex = this.allCards.findIndex(c => c.id === event.cardId);
    if (cardIndex === -1) return;
    
    // Get the actual grid container element to read its computed grid-template-columns
    const gridContainer = document.querySelector('.stats-grid-container') as HTMLElement;
    if (!gridContainer) {
      console.error('Grid container not found');
      return;
    }
    
    // Calculate the actual number of CSS grid columns based on container width
    // CSS Grid uses: repeat(auto-fit, minmax(250px, 1fr)) with 15px gap and no padding
    // Formula: columns = floor((container_width + gap) / (min_column_width + gap))
    const containerRect = gridContainer.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const minColumnWidth = 250; // Minimum column width is 250px
    const gap = 15; // Gap between columns
    
    // Calculate how many columns fit in the container width
    // With auto-fit, columns expand to fill space, but we use min width for calculation
    const gridColumns = Math.floor((containerWidth + gap) / (minColumnWidth + gap));
    
    // Get computed style for debugging
    const computedStyle = window.getComputedStyle(gridContainer);
    const gridTemplateColumns = computedStyle.gridTemplateColumns;
    
    
    if (gridColumns <= 0) {
      return;
    }
    
    // Calculate current row and column for debugging
    // Array index 0 = row 0, col 0 (top-left)
    // Array index 1 = row 0, col 1 (top, second from left)
    // Array index gridColumns = row 1, col 0 (second row, left)
    const currentRow = Math.floor(cardIndex / gridColumns);
    const currentCol = cardIndex % gridColumns;
    
    let newIndex = cardIndex;
    
    switch (event.direction) {
      case 'up':
        // Move up one row (back by gridColumns positions)
        // If at row 1, col 2, moving up should go to row 0, col 2
        newIndex = Math.max(0, cardIndex - gridColumns);
        break;
      case 'down':
        // Move down one row (forward by gridColumns positions)
        // If at row 0, col 0, moving down should go to row 1, col 0
        newIndex = Math.min(this.allCards.length - 1, cardIndex + gridColumns);
        break;
      case 'left':
        // Move left one column (back by 1 position)
        // If at row 0, col 1, moving left should go to row 0, col 0
        newIndex = Math.max(0, cardIndex - 1);
        break;
      case 'right':
        // Move right one column (forward by 1 position)
        // If at row 0, col 0, moving right should go to row 0, col 1
        newIndex = Math.min(this.allCards.length - 1, cardIndex + 1);
        break;
    }
    
    const newRow = Math.floor(newIndex / gridColumns);
    const newCol = newIndex % gridColumns;
    
    // Validate: if moving down from row 0, col 0, we should end up at row 1, col 0
    if (event.direction === 'down' && currentRow === 0 && currentCol === 0) {
      if (newRow !== 1 || newCol !== 0) {
        console.error('  ERROR: Expected row 1, col 0 but got row', newRow, 'col', newCol);
        console.error('  This means gridColumns might be wrong. gridColumns =', gridColumns);
      }
    }
    
    // Only swap if the new index is different and valid
    if (newIndex !== cardIndex && newIndex >= 0 && newIndex < this.allCards.length) {
      // Simple swap: move card to new position, the card at new position moves to old position
      const temp = this.allCards[newIndex];
      this.allCards[newIndex] = this.allCards[cardIndex];
      this.allCards[cardIndex] = temp;
      
      // Verify the swap worked correctly
      const verifyRow = Math.floor(newIndex / gridColumns);
      const verifyCol = newIndex % gridColumns;
      
      // Update cardsBySection to reflect the new order
      this.syncCardsToSections();
      
      // Force change detection and save
      this.cdr.detectChanges();
      this.saveCardOrder();
    }
  }
  
  onCardColorChanged(event: { cardId: string; color: string }): void {
    const card = this.allCards.find(c => c.id === event.cardId);
    if (card) {
      card.customColor = event.color || undefined;
      // Update in cardsBySection as well
      if (this.cardsBySection[card.sectionId]) {
        const sectionCard = this.cardsBySection[card.sectionId].find(c => c.id === event.cardId);
        if (sectionCard) {
          sectionCard.customColor = event.color || undefined;
        }
      }
      // Save to localStorage
      this.saveCardOrder();
      this.cdr.detectChanges();
    }
  }

  async onCardClicked(event: { cardId: string }): Promise<void> {
    // Open pending submissions modal when inspections card is clicked
    if (event.cardId === 'insp-approved-rejected') {
      const modal = await this.modalCtrl.create({
        component: RecentSubmissionsModalComponent,
      });
      await modal.present();
    }
  }
  
  resetAllTileColors(): void {
    // Clear custom colors from all cards
    this.allCards.forEach(card => {
      card.customColor = undefined;
    });
    
    // Update cardsBySection as well
    Object.keys(this.cardsBySection).forEach(sectionId => {
      this.cardsBySection[sectionId].forEach(card => {
        card.customColor = undefined;
      });
    });
    
    // Save to localStorage
    this.saveCardOrder();
    this.cdr.detectChanges();
  }
  
  private syncCardsToSections(): void {
    // Rebuild cardsBySection from allCards, maintaining section groupings
    const newCardsBySection: Record<string, StatCard[]> = {};
    
    this.allCards.forEach((card: StatCard) => {
      if (!newCardsBySection[card.sectionId]) {
        newCardsBySection[card.sectionId] = [];
      }
      newCardsBySection[card.sectionId].push(card);
    });
    
    this.cardsBySection = newCardsBySection;
  }
  
  private initializeCards(): void {
    // Prevent multiple initializations
    if ((this as any)._cardsInitialized) {
      return;
    }
    
    // Initialize default cards if not loaded from storage
    if (Object.keys(this.cardsBySection).length === 0) {
      this.createDefaultCards();
    }
    
    // Try to load card order from saved preferences first
    const savedPreferences = (this as any)._savedPreferences;
    if (savedPreferences) {
      
      // Prefer flat order (exact display order) over section-based order
      if (savedPreferences.cardsOrder && Array.isArray(savedPreferences.cardsOrder) && savedPreferences.cardsOrder.length > 0) {
        this.loadCardOrderFromFlatOrder(savedPreferences.cardsOrder);
        // Mark that we have a saved order to prevent re-sorting
        (this as any)._hasSavedOrder = true;
      } else if (savedPreferences.cardsOrderBySection) {
        this.loadCardOrderFromPreferences(savedPreferences.cardsOrderBySection);
        // Rebuild allCards from cardsBySection to preserve order
        this.rebuildAllCardsFromSections();
        // Mark that we have a saved order to prevent re-sorting
        (this as any)._hasSavedOrder = true;
      } else {
        this.loadCardOrder();
        this.updateAllCards();
      }
      
      // Load card colors if available (must be done after cards are loaded)
      if (savedPreferences.cardColors && Object.keys(savedPreferences.cardColors).length > 0) {
        // Use setTimeout to ensure cards are fully initialized
        setTimeout(() => {
          this.loadCardColors(savedPreferences.cardColors);
        }, 0);
      }
      
      // Mark as initialized and clear saved preferences after use
      (this as any)._cardsInitialized = true;
      (this as any)._savedPreferences = null;
    } else {
      this.loadCardOrder();
      this.updateAllCards();
      (this as any)._cardsInitialized = true;
    }
  }
  
  private updateAllCards(): void {
    // If we have a saved order, don't re-sort - preserve the exact order
    if ((this as any)._hasSavedOrder && this.allCards.length > 0) {
      // Just update card values without changing order
      return;
    }
    
    // Flatten all cards from all sections into a single array
    const allCardsArray: StatCard[] = [];
    Object.values(this.cardsBySection).forEach((sectionCards: StatCard[]) => {
      allCardsArray.push(...sectionCards);
    });
    
    this.allCards = allCardsArray.sort((a: StatCard, b: StatCard) => {
      // Sort by section order first, then by card order within section
      const sectionA = this.sections.findIndex(s => s.id === a.sectionId);
      const sectionB = this.sections.findIndex(s => s.id === b.sectionId);
      if (sectionA !== sectionB) {
        return sectionA - sectionB;
      }
      return a.order - b.order;
    });
  }
  
  private createDefaultCards(): void {
    this.cardsBySection = {
      vans: [
        { id: 'vans-active', sectionId: 'vans', type: 'card', title: 'Active Vans', icon: 'checkmark-circle-outline', iconClass: 'icon-success', value: 'custom', label: 'active-grounded', valueType: 'custom', order: 0, size: '1x1' },
        { id: 'vans-assigned', sectionId: 'vans', type: 'card', title: 'Assigned Today', icon: 'people-outline', iconClass: 'icon-info', value: this.vanStats.assigned, label: `${this.vanStats.unassigned} unassigned`, valueType: 'number', order: 1, size: '1x1' },
        { id: 'vans-by-type', sectionId: 'vans', type: 'card', title: 'Fleet', icon: 'car-outline', value: 'custom', label: 'van-types', valueType: 'custom', order: 2, size: '2x1' },
        { id: 'vans-documents', sectionId: 'vans', type: 'card', title: 'Document Status', icon: 'document-text-outline', value: 'custom', label: 'documents', valueType: 'custom', order: 3, size: '1x1' }
      ],
      inspections: [
        { id: 'insp-approved-rejected', sectionId: 'inspections', type: 'card', title: 'Inspections', icon: 'document-text-outline', value: 'custom', label: 'approved-rejected', valueType: 'custom', order: 0, size: '1x1' },
        { id: 'insp-timeframe', sectionId: 'inspections', type: 'card', title: 'Inspection Activity', icon: 'calendar-outline', value: 'custom', label: 'timeframe', valueType: 'custom', order: 1, size: '2x1' },
        { id: 'insp-severity', sectionId: 'inspections', type: 'card', title: 'Issues', icon: 'flag-outline', value: 'custom', label: 'issues', valueType: 'custom', order: 2, size: '2x2' }
      ],
      drivers: [
        { id: 'driver-active', sectionId: 'drivers', type: 'card', title: 'Active Today', icon: 'person-outline', iconClass: 'icon-info', value: this.driverStats.activeToday, label: 'Drivers assigned', valueType: 'number', order: 0, size: '1x1' },
        { id: 'driver-week', sectionId: 'drivers', type: 'compact', title: 'This Week', icon: '', value: this.driverStats.uniqueThisWeek, label: 'This Week', valueType: 'number', order: 1, size: '1x1' },
        { id: 'driver-month', sectionId: 'drivers', type: 'compact', title: 'This Month', icon: '', value: this.driverStats.uniqueThisMonth, label: 'This Month', valueType: 'number', order: 2, size: '1x1' },
        { id: 'driver-rate', sectionId: 'drivers', type: 'card', title: 'Assignment Rate', icon: 'pie-chart-outline', value: this.driverStats.assignmentRate, label: 'of active vans assigned', valueType: 'percentage', order: 3, size: '1x1' },
        { id: 'driver-coverage', sectionId: 'drivers', type: 'card', title: 'Coverage by Type', icon: 'car-sport-outline', value: 'custom', label: 'coverage', valueType: 'custom', order: 4, size: '2x1' },
        { id: 'driver-top', sectionId: 'drivers', type: 'card', title: 'Most Assigned Drivers', icon: 'star-outline', value: 'custom', label: 'drivers', valueType: 'custom', order: 5, size: '2x2' }
      ],
      users: [
        { id: 'users-active', sectionId: 'users', type: 'card', title: 'Active Users', icon: 'person-outline', iconClass: 'icon-success', value: 'custom', label: 'active-inactive', valueType: 'custom', order: 0, size: '1x1' }
      ],
      health: [
        { id: 'health-ready', sectionId: 'health', type: 'card', title: 'Ready for Service', icon: 'checkmark-circle', value: this.operationalHealth.readyForService, label: 'Active, assigned, and recently inspected', valueType: 'number', order: 0, size: '1x1' }
      ]
    };
  }
  
  private loadSectionOrder(): void {
    try {
      // Load section data (including custom titles)
      const savedData = localStorage.getItem(this.STORAGE_KEY_SECTIONS_DATA);
      if (savedData) {
        const savedSections = JSON.parse(savedData) as StatisticsSection[];
        // Merge with defaults to ensure all sections exist
        const defaultIds = new Set(this.DEFAULT_SECTIONS.map(s => s.id));
        const customSections = savedSections.filter(s => defaultIds.has(s.id));
        const missingSections = this.DEFAULT_SECTIONS.filter(s => !customSections.find(cs => cs.id === s.id));
        this.sections = [...customSections, ...missingSections].sort((a, b) => a.order - b.order);
      } else {
        // Fallback to order-only storage
        const saved = localStorage.getItem(this.STORAGE_KEY_SECTIONS);
        if (saved) {
          const savedOrder = JSON.parse(saved) as string[];
          const orderedSections = savedOrder
            .map(id => this.DEFAULT_SECTIONS.find(s => s.id === id))
            .filter((s): s is StatisticsSection => s !== undefined);
          const existingIds = new Set(orderedSections.map(s => s.id));
          const newSections = this.DEFAULT_SECTIONS.filter(s => !existingIds.has(s.id));
          this.sections = [...orderedSections, ...newSections];
        } else {
          this.sections = [...this.DEFAULT_SECTIONS];
        }
      }
    } catch (error) {
      console.error('Error loading section order:', error);
      this.sections = [...this.DEFAULT_SECTIONS];
    }
  }
  
  private loadCardOrder(): void {
    try {
      // Try loading unified order first (check user-specific keys first, then global)
      const user = this.authService.currentUser$.value;
      let saved: string | null = null;
      
      if (user) {
        // Try user-specific key first
        const userStoragePrefix = `dashboard_${user.uid}_`;
        saved = localStorage.getItem(`${userStoragePrefix}${this.STORAGE_KEY_CARDS}`);
      }
      
      // Fall back to global key if user-specific not found
      if (!saved) {
        saved = localStorage.getItem(this.STORAGE_KEY_CARDS);
      }
      
      if (saved) {
        const savedOrder = JSON.parse(saved) as string[];
        // Reorder all cards based on saved order
        const allCardsArray: StatCard[] = [];
        Object.values(this.cardsBySection).forEach((sectionCards: StatCard[]) => {
          allCardsArray.push(...sectionCards);
        });
        const orderedCards = savedOrder
          .map((id: string) => allCardsArray.find((c: StatCard) => c.id === id))
          .filter((c): c is StatCard => c !== undefined);
        const existingIds = new Set(orderedCards.map((c: StatCard) => c.id));
        const newCards = allCardsArray.filter((c: StatCard) => !existingIds.has(c.id));
        this.allCards = [...orderedCards, ...newCards];
        this.syncCardsToSections();
      } else {
        // Fallback to section-based order (check user-specific keys first)
        const user = this.authService.currentUser$.value;
        let savedSectionOrder: string | null = null;
        
        if (user) {
          const userStoragePrefix = `dashboard_${user.uid}_`;
          savedSectionOrder = localStorage.getItem(`${userStoragePrefix}statistics_cards_order_by_section`);
        }
        
        if (!savedSectionOrder) {
          savedSectionOrder = localStorage.getItem('statistics_cards_order_by_section');
        }
        
        if (savedSectionOrder) {
          const savedOrder = JSON.parse(savedSectionOrder) as Record<string, string[]>;
          // Reorder cards based on saved order
          Object.keys(this.cardsBySection).forEach(sectionId => {
            if (savedOrder[sectionId]) {
              const cards = this.cardsBySection[sectionId];
              const orderedCards = savedOrder[sectionId]
                .map((id: string) => cards.find((c: StatCard) => c.id === id))
                .filter((c): c is StatCard => c !== undefined);
              const existingIds = new Set(orderedCards.map((c: StatCard) => c.id));
              const newCards = cards.filter((c: StatCard) => !existingIds.has(c.id));
              this.cardsBySection[sectionId] = [...orderedCards, ...newCards];
            }
          });
          this.updateAllCards();
        } else {
          this.updateAllCards();
        }
      }
      
      // Remove cardClass from all cards (migration to uniform neutral color)
      Object.keys(this.cardsBySection).forEach(sectionId => {
        this.cardsBySection[sectionId].forEach(card => {
          if (card.cardClass) {
            delete card.cardClass;
          }
        });
      });
      
      // Ensure all cards have the size property (migration for existing saved layouts)
      Object.keys(this.cardsBySection).forEach(sectionId => {
        this.cardsBySection[sectionId].forEach(card => {
          if (!card.size || (card.size !== '1x1' && card.size !== '2x1' && card.size !== '2x2')) {
            // Migrate old 'standard'/'large' to new grid sizes
            if (card.size === 'standard') {
              card.size = '1x1';
            } else if (card.size === 'large') {
              // Determine if it should be 2x1 or 2x2 based on card ID
              const chartCardIds = ['insp-severity', 'driver-top'];
              card.size = chartCardIds.includes(card.id) ? '2x2' : '2x1';
            } else {
              // Default to 1x1 for unknown sizes
              card.size = '1x1';
            }
          }
        });
        
        // Remove old individual van type cards if they exist (migration)
        this.cardsBySection[sectionId] = this.cardsBySection[sectionId].filter(
          (card: StatCard) => !['vans-cdv', 'vans-edv', 'vans-rental', 'vans-grounded'].includes(card.id)
        );
        
        // Remove old separate expiring/expired cards if they exist (migration to combined card)
        this.cardsBySection[sectionId] = this.cardsBySection[sectionId].filter(
          (card: StatCard) => !['vans-expiring', 'vans-expired'].includes(card.id)
        );
        
        // Remove old separate approved/rejected/pending cards if they exist (migration to combined card)
        this.cardsBySection[sectionId] = this.cardsBySection[sectionId].filter(
          (card: StatCard) => !['insp-approved', 'insp-rejected', 'insp-pending', 'insp-open-issues'].includes(card.id)
        );
        
        // Remove old health-attention card if it exists (migration to combined Issues tile)
        this.cardsBySection[sectionId] = this.cardsBySection[sectionId].filter(
          (card: StatCard) => !['health-attention'].includes(card.id)
        );
        
        // Remove old separate timeframe cards if they exist (migration to combined timeframe tile)
        const hasOldTimeframeCards = this.cardsBySection[sectionId].some(
          (card: StatCard) => ['insp-today', 'insp-week', 'insp-month'].includes(card.id)
        );
        const hasNewTimeframeCard = this.cardsBySection[sectionId].some(
          (card: StatCard) => card.id === 'insp-timeframe'
        );
        
        if (hasOldTimeframeCards && !hasNewTimeframeCard) {
          // Remove old individual timeframe cards
          this.cardsBySection[sectionId] = this.cardsBySection[sectionId].filter(
            (card: StatCard) => !['insp-today', 'insp-week', 'insp-month'].includes(card.id)
          );
          // Add the new combined timeframe card
          this.cardsBySection[sectionId].push({
            id: 'insp-timeframe',
            sectionId: 'inspections',
            type: 'card',
            title: 'Inspection Activity',
            icon: 'calendar-outline',
            value: 'custom',
            label: 'timeframe',
            valueType: 'custom',
            order: 1,
            size: '2x1'
          });
        } else if (hasOldTimeframeCards && hasNewTimeframeCard) {
          // Just remove the old ones if new one already exists
          this.cardsBySection[sectionId] = this.cardsBySection[sectionId].filter(
            (card: StatCard) => !['insp-today', 'insp-week', 'insp-month'].includes(card.id)
          );
        }
      });
      
      this.updateAllCards();
    } catch (error) {
      console.error('Error loading card order:', error);
      this.updateAllCards();
    }
  }
  
  private saveSectionOrder(): void {
    try {
      const order = this.sections.map(s => s.id);
      localStorage.setItem(this.STORAGE_KEY_SECTIONS, JSON.stringify(order));
      // Also save full section data including custom titles
      localStorage.setItem(this.STORAGE_KEY_SECTIONS_DATA, JSON.stringify(this.sections));
    } catch (error) {
      console.error('Error saving section order:', error);
    }
  }
  
  // Section renaming methods
  startEditingSection(section: StatisticsSection): void {
    if (!this.isEditMode) return;
    this.editingSectionId = section.id;
    this.editingSectionTitle = section.title;
    // Focus input after view update
    setTimeout(() => {
      const input = document.querySelector(`[data-section-id="${section.id}"] .section-title-input`) as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  }
  
  saveSectionTitle(section: StatisticsSection): void {
    if (this.editingSectionTitle.trim()) {
      section.title = this.editingSectionTitle.trim();
      this.saveSectionOrder();
    }
    this.editingSectionId = null;
    this.editingSectionTitle = '';
  }
  
  cancelEditingSection(): void {
    this.editingSectionId = null;
    this.editingSectionTitle = '';
  }
  
  isEditingSection(sectionId: string): boolean {
    return this.editingSectionId === sectionId;
  }
  
  private saveCardOrder(): void {
    try {
      // Save order as a flat array of card IDs
      const order = this.allCards.map(c => c.id);
      localStorage.setItem(this.STORAGE_KEY_CARDS, JSON.stringify(order));
      
      // Also save section-based order for backward compatibility
      const sectionOrder: Record<string, string[]> = {};
      Object.keys(this.cardsBySection).forEach(sectionId => {
        sectionOrder[sectionId] = this.cardsBySection[sectionId].map(c => c.id);
      });
      localStorage.setItem('statistics_cards_order_by_section', JSON.stringify(sectionOrder));
    } catch (error) {
      console.error('Error saving card order:', error);
    }
  }
  
  resetLayout(): void {
    this.sections = [...this.DEFAULT_SECTIONS];
    this.createDefaultCards();
    this.updateAllCards();
    localStorage.removeItem(this.STORAGE_KEY_SECTIONS);
    localStorage.removeItem(this.STORAGE_KEY_SECTIONS_DATA);
    localStorage.removeItem(this.STORAGE_KEY_CARDS);
    localStorage.removeItem('statistics_cards_order_by_section');
  }
  
  async saveDashboardPreferences(): Promise<void> {
    const user = this.authService.currentUser$.value;
    if (!user) {
      const toast = await this.toastCtrl.create({
        message: 'You must be logged in to save preferences',
        color: 'warning',
        duration: 2000,
        position: 'top'
      });
      await toast.present();
      return;
    }
    
    try {
      // Ensure allCards is up to date before saving
      if (this.allCards.length === 0) {
        console.warn('allCards is empty, cannot save preferences');
        const toast = await this.toastCtrl.create({
          message: 'No cards to save. Please wait for the dashboard to load.',
          color: 'warning',
          duration: 2000,
          position: 'top'
        });
        await toast.present();
        return;
      }
      
      // Capture the EXACT current order of tiles as they appear on screen
      // Create a copy of allCards to preserve the exact order without any modifications
      const currentCardOrder = [...this.allCards].map(c => c.id);
      
      // Collect all dashboard preferences including card colors
      const cardColors: Record<string, string> = {};
      this.allCards.forEach(card => {
        if (card.customColor) {
          cardColors[card.id] = card.customColor;
        }
      });
      
      // Save the exact order as displayed (preserving current tile positions)
      // Include userId to ensure preferences are associated with the correct user
      const preferences = {
        userId: user.uid, // Store user ID to verify ownership
        sections: this.sections.map(s => s.id),
        sectionsData: this.sections,
        cardsOrder: currentCardOrder, // Exact order as currently displayed - this preserves tile positions
        cardsOrderBySection: this.getCardsOrderBySection(), // Order within each section
        cardColors: cardColors,
        editMode: this.isEditMode,
        savedAt: new Date().toISOString()
      };
      
      // Save to Firestore user document (user-specific storage)
      const userRef = doc(this.firestore, 'users', user.uid);
      
      await updateDoc(userRef, {
        dashboardPreferences: preferences
      });
      
      // Verify the save by reading it back immediately
      try {
        const verifySnap = await getDoc(userRef);
        if (verifySnap.exists()) {
          const savedData = verifySnap.data();
          if (savedData['dashboardPreferences']) {
            const savedPrefs = savedData['dashboardPreferences'];
          } else {
            console.warn('Verification - dashboardPreferences NOT found in saved document!');
          }
        } else {
          console.error('Verification - User document does not exist after save!');
        }
      } catch (verifyError) {
        console.error('Error verifying save:', verifyError);
      }
      
      // Also save to localStorage as backup with user-specific keys
      const userStoragePrefix = `dashboard_${user.uid}_`;
      localStorage.setItem(`${userStoragePrefix}${this.STORAGE_KEY_SECTIONS}`, JSON.stringify(preferences.sections));
      localStorage.setItem(`${userStoragePrefix}${this.STORAGE_KEY_SECTIONS_DATA}`, JSON.stringify(preferences.sectionsData));
      localStorage.setItem(`${userStoragePrefix}${this.STORAGE_KEY_CARDS}`, JSON.stringify(preferences.cardsOrder));
      localStorage.setItem(`${userStoragePrefix}statistics_cards_order_by_section`, JSON.stringify(preferences.cardsOrderBySection));
      
      // Don't call updateAllCards() or saveCardOrder() here - we want to preserve the exact current state
      
      const toast = await this.toastCtrl.create({
        message: 'Dashboard preferences saved successfully!',
        color: 'success',
        duration: 2000,
        position: 'top'
      });
      await toast.present();
    } catch (error) {
      console.error('Error saving dashboard preferences for user:', user.uid, error);
      const toast = await this.toastCtrl.create({
        message: 'Failed to save preferences. Please try again.',
        color: 'danger',
        duration: 2000,
        position: 'top'
      });
      await toast.present();
    }
  }
  
  private getCardsOrderBySection(): Record<string, string[]> {
    const orderBySection: Record<string, string[]> = {};
    Object.keys(this.cardsBySection).forEach(sectionId => {
      orderBySection[sectionId] = this.cardsBySection[sectionId].map(card => card.id);
    });
    return orderBySection;
  }
  
  private async loadDashboardPreferences(): Promise<void> {
    const user = this.authService.currentUser$.value;
    
    let preferences: any = null;
    
    // Try to load from Firestore first (user-specific preferences)
    if (user) {
      try {
        const userRef = doc(this.firestore, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          
          if (userData && userData['dashboardPreferences']) {
            preferences = userData['dashboardPreferences'];
            
            // Verify that preferences belong to the current user
            if (preferences.userId && preferences.userId !== user.uid) {
              console.warn('Dashboard preferences userId mismatch. Expected:', user.uid, 'Got:', preferences.userId);
              preferences = null; // Don't use preferences from wrong user
            } else {
            }
          } else {
          }
        } else {
        }
      } catch (error) {
        console.error('Error loading dashboard preferences from Firestore for user:', user.uid, error);
        console.error('Error details:', error);
      }
    } else {
    }
    
    
    // Load sections
    if (preferences?.sectionsData && Array.isArray(preferences.sectionsData)) {
      this.sections = preferences.sectionsData;
    } else if (preferences?.sections && Array.isArray(preferences.sections)) {
      // Fallback to order only
      const order = preferences.sections;
      this.sections = this.DEFAULT_SECTIONS
        .map(s => {
          const index = order.indexOf(s.id);
          return index >= 0 ? { ...s, order: index } : { ...s, order: 999 };
        })
        .sort((a, b) => a.order - b.order);
    } else {
      // Fall back to localStorage (try user-specific keys first, then global)
      const user = this.authService.currentUser$.value;
      if (user) {
        const userStoragePrefix = `dashboard_${user.uid}_`;
        const userSectionsData = localStorage.getItem(`${userStoragePrefix}${this.STORAGE_KEY_SECTIONS_DATA}`);
        if (userSectionsData) {
          try {
            const savedSections = JSON.parse(userSectionsData) as StatisticsSection[];
            const defaultIds = new Set(this.DEFAULT_SECTIONS.map(s => s.id));
            const customSections = savedSections.filter(s => defaultIds.has(s.id));
            const missingSections = this.DEFAULT_SECTIONS.filter(s => !customSections.find(cs => cs.id === s.id));
            this.sections = [...customSections, ...missingSections].sort((a, b) => a.order - b.order);
          } catch (error) {
            console.error('Error loading user-specific sections from localStorage:', error);
            this.loadSectionOrder();
          }
        } else {
          this.loadSectionOrder();
        }
      } else {
        this.loadSectionOrder();
      }
    }
    
    // Don't restore edit mode from preferences - always start in non-edit mode
    // Edit mode should only be activated when the user explicitly clicks the button
    this.isEditMode = false;
    
    // Store preferences for later use when cards are initialized
    if (preferences) {
      (this as any)._savedPreferences = preferences;
    } else {
      (this as any)._savedPreferences = null;
    }
  }
  
  private loadCardOrderFromPreferences(cardsOrderBySection: Record<string, string[]>): void {
    // Rebuild cardsBySection based on saved order, preserving exact order
    const newCardsBySection: Record<string, StatCard[]> = {};
    
    // First, collect all cards into a map for quick lookup
    const allCardsMap = new Map<string, StatCard>();
    Object.values(this.cardsBySection).forEach(sectionCards => {
      sectionCards.forEach(card => {
        allCardsMap.set(card.id, card);
      });
    });
    
    // Rebuild sections in saved order
    Object.keys(cardsOrderBySection).forEach(sectionId => {
      const cardIds = cardsOrderBySection[sectionId];
      const sectionCards: StatCard[] = [];
      
      cardIds.forEach(cardId => {
        const card = allCardsMap.get(cardId);
        if (card) {
          // Create a copy with the correct sectionId
          sectionCards.push({ ...card, sectionId });
          allCardsMap.delete(cardId); // Remove from map so we don't add it twice
        }
      });
      
      if (sectionCards.length > 0) {
        newCardsBySection[sectionId] = sectionCards;
      }
    });
    
    // Add any remaining cards that weren't in the saved order to their original sections
    allCardsMap.forEach((card, cardId) => {
      const originalSectionId = card.sectionId || 'other';
      if (!newCardsBySection[originalSectionId]) {
        newCardsBySection[originalSectionId] = [];
      }
      newCardsBySection[originalSectionId].push(card);
    });
    
    this.cardsBySection = newCardsBySection;
    // Don't call updateAllCards here - we'll rebuild allCards from the saved flat order instead
  }
  
  private loadCardOrderFromFlatOrder(cardIds: string[]): void {
    // Rebuild cards in the exact saved order (preserving display order)
    const allCardsMap = new Map<string, StatCard>();
    
    // Collect all cards into a map
    Object.values(this.cardsBySection).forEach(sectionCards => {
      sectionCards.forEach(card => {
        allCardsMap.set(card.id, card);
      });
    });
    
    // Build ordered array in exact saved order
    const orderedCards: StatCard[] = [];
    const foundCardIds = new Set<string>();
    
    cardIds.forEach(cardId => {
      const card = allCardsMap.get(cardId);
      if (card) {
        orderedCards.push(card);
        foundCardIds.add(cardId);
      }
    });
    
    // Add any remaining cards that weren't in saved order (new cards that were added)
    allCardsMap.forEach((card, cardId) => {
      if (!foundCardIds.has(cardId)) {
        orderedCards.push(card);
      }
    });
    
    // Set allCards directly to preserve exact order (don't re-sort)
    this.allCards = orderedCards;
    
    // Rebuild cardsBySection from ordered allCards to keep sections in sync
    this.rebuildSectionsFromAllCards();
  }
  
  private rebuildSectionsFromAllCards(): void {
    // Rebuild cardsBySection from allCards to keep them in sync
    const newCardsBySection: Record<string, StatCard[]> = {};
    this.allCards.forEach(card => {
      const sectionId = card.sectionId || 'other';
      if (!newCardsBySection[sectionId]) {
        newCardsBySection[sectionId] = [];
      }
      newCardsBySection[sectionId].push(card);
    });
    this.cardsBySection = newCardsBySection;
  }
  
  private rebuildAllCardsFromSections(): void {
    // Rebuild allCards from cardsBySection preserving order within each section
    const allCardsArray: StatCard[] = [];
    // Iterate sections in order
    this.sections.forEach(section => {
      if (this.cardsBySection[section.id]) {
        allCardsArray.push(...this.cardsBySection[section.id]);
      }
    });
    // Add any cards in sections not in the sections array
    Object.keys(this.cardsBySection).forEach(sectionId => {
      if (!this.sections.find(s => s.id === sectionId)) {
        allCardsArray.push(...this.cardsBySection[sectionId]);
      }
    });
    this.allCards = allCardsArray;
  }
  
  private loadCardColors(cardColors: Record<string, string>): void {
    // Apply saved colors to cards
    Object.keys(cardColors).forEach(cardId => {
      const card = this.allCards.find(c => c.id === cardId);
      if (card) {
        card.customColor = cardColors[cardId];
      }
      // Also update in cardsBySection
      Object.keys(this.cardsBySection).forEach(sectionId => {
        const sectionCard = this.cardsBySection[sectionId].find(c => c.id === cardId);
        if (sectionCard) {
          sectionCard.customColor = cardColors[cardId];
        }
      });
    });
  }
  
  getCardsForSection(sectionId: string): StatCard[] {
    return this.cardsBySection[sectionId] || [];
  }
  
  trackByCardId(index: number, card: StatCard): string {
    return card.id;
  }
  
  getCardValue(card: StatCard): string {
    if (card.valueType === 'percentage' && typeof card.value === 'number') {
      return this.formatPercentage(card.value);
    } else if (card.valueType === 'number' && typeof card.value === 'number') {
      return this.formatNumber(card.value);
    }
    return String(card.value);
  }
  
  getSectionById(id: string): StatisticsSection | undefined {
    return this.sections.find(s => s.id === id);
  }
  
  getCardSize(card: StatCard): { xs: string; md: string; lg: string } {
    // Grid uses 12 columns
    // 1x1 = 12 cols (full width on mobile), 6 cols (half width on tablet+)
    // 2x1 = 12 cols (full width on mobile), 12 cols (full width on tablet+)
    // 2x2 = 12 cols (full width on mobile), 12 cols (full width on tablet+)
    
    switch (card.size) {
      case '2x2':
        return { xs: '12', md: '12', lg: '12' }; // Full width, takes 2 rows
      case '2x1':
        return { xs: '12', md: '12', lg: '12' }; // Full width, single row
      case '1x1':
      default:
        return { xs: '12', md: '6', lg: '6' }; // Half width on tablet+
    }
  }
  
  getCardRowSpan(card: StatCard): number {
    // Return row span for 2x2 cards
    return card.size === '2x2' ? 2 : 1;
  }
  
  // Edit mode handlers
  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
    this.saveEditMode();
  }
  
  private loadEditMode(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY_EDIT_MODE);
      if (saved !== null) {
        this.isEditMode = JSON.parse(saved) === true;
      }
    } catch (error) {
      console.error('Error loading edit mode:', error);
      this.isEditMode = false;
    }
  }
  
  private saveEditMode(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY_EDIT_MODE, JSON.stringify(this.isEditMode));
    } catch (error) {
      console.error('Error saving edit mode:', error);
    }
  }
}

