// src/app/pages/admin/dashboard/dashboard.page.ts
import { Component, OnInit, OnDestroy, AfterViewInit, NgZone, inject, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem, CdkDragStart, CdkDragEnd, CdkDragMove } from '@angular/cdk/drag-drop';
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
  IonButton
} from '@ionic/angular/standalone';
import { Firestore, collection, collectionData, Timestamp, CollectionReference } from '@angular/fire/firestore';
import { Van } from '@app/models/van.model';
import { Inspection } from '@app/services/inspection.service';
import { PlanningService } from '@app/services/planning.service';
import { DailyPlan, getPlanStats } from '@app/models/planning.model';
import { BreadcrumbService } from '@app/services/breadcrumb.service';
import { AuthService } from '@app/services/auth.service';
import { Subscription, combineLatest, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { StatisticsGridComponent, StatCard } from '@app/components/statistics-grid/statistics-grid.component';

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
    FormsModule,
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
  
  ngOnInit() {
    this.breadcrumbService.clearTail();
    this.loadSectionOrder();
    this.loadEditMode();
    this.loadAllData();
    this.loadUserInfo();
  }
  
  private loadUserInfo() {
    const sub = this.authService.currentUserProfile$.subscribe(profile => {
      this.userDisplayName = this.authService.getFirstName(profile);
    });
    this.subscriptions.add(sub);
  }
  
  ngAfterViewInit() {
    // Initialize cards after data loads
    if (!this.isLoading) {
      this.initializeCards();
    }
  }
  
  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
  
  private loadAllData(): void {
    const vansRef = collection(this.firestore, 'vans') as CollectionReference<Van>;
    const inspectionsRef = collection(this.firestore, 'inspections') as CollectionReference<Inspection>;
    
    const vans$ = collectionData<Van>(vansRef, { idField: 'docId' });
    const inspections$ = collectionData<Inspection>(inspectionsRef, { idField: 'id' });
    
    // Get today's plan
    const today = new Date().toISOString().split('T')[0];
    const todayPlan$ = from(this.planningService.getDailyPlan(today)).pipe(
      map(plan => plan || null),
      catchError(() => of(null))
    );
    
    this.subscriptions.add(
      combineLatest([vans$, inspections$, todayPlan$]).subscribe({
        next: ([vans, inspections, plan]) => {
          this.ngZone.run(() => {
            this.vans = vans;
            this.inspections = inspections;
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
    // Update card values after stats are calculated
    this.updateCardValues();
  }
  
  private updateCardValues(): void {
    // Update card values with latest stats
    if (this.cardsBySection['vans']) {
      this.cardsBySection['vans'].forEach(card => {
        switch(card.id) {
          case 'vans-assigned': card.value = this.vanStats.assigned; card.label = `${this.vanStats.unassigned} unassigned`; break;
        }
      });
    }
    if (this.cardsBySection['inspections']) {
      this.cardsBySection['inspections'].forEach(card => {
        switch(card.id) {
          case 'insp-today': card.value = this.inspectionStats.today; break;
          case 'insp-week': card.value = this.inspectionStats.thisWeek; break;
          case 'insp-month': card.value = this.inspectionStats.thisMonth; break;
        }
      });
    }
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
    // Update the flattened array
    this.updateAllCards();
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
    const pending = this.inspections.filter(i => i.status === 'pending').length;
    const approved = this.inspections.filter(i => i.status === 'approved').length;
    const rejected = this.inspections.filter(i => i.status === 'rejected').length;
    
    // Time-based stats
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const todayCount = this.inspections.filter(i => {
      const created = this.getDateFromTimestamp(i.createdAt);
      return created >= today;
    }).length;
    
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
    
    console.log('=== Move Card Debug ===');
    console.log('Card ID:', event.cardId);
    console.log('Direction:', event.direction);
    console.log('Current index:', cardIndex);
    console.log('Container width:', containerWidth);
    console.log('Min column width:', minColumnWidth, 'Gap:', gap);
    console.log('Calculated gridColumns:', gridColumns);
    console.log('Grid template columns (computed):', gridTemplateColumns);
    console.log('Total cards:', this.allCards.length);
    
    if (gridColumns <= 0) {
      console.log('ERROR: gridColumns <= 0, aborting');
      return;
    }
    
    // Calculate current row and column for debugging
    // Array index 0 = row 0, col 0 (top-left)
    // Array index 1 = row 0, col 1 (top, second from left)
    // Array index gridColumns = row 1, col 0 (second row, left)
    const currentRow = Math.floor(cardIndex / gridColumns);
    const currentCol = cardIndex % gridColumns;
    console.log('Current position - Row:', currentRow, 'Col:', currentCol, '(index:', cardIndex + ')');
    
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
    console.log('New index:', newIndex);
    console.log('New position - Row:', newRow, 'Col:', newCol, '(index:', newIndex + ')');
    console.log('Row change:', newRow - currentRow, 'Col change:', newCol - currentCol);
    console.log('Expected: Row change should be', event.direction === 'up' ? -1 : event.direction === 'down' ? 1 : 0);
    console.log('Expected: Col change should be', event.direction === 'left' ? -1 : event.direction === 'right' ? 1 : 0);
    
    // Validate: if moving down from row 0, col 0, we should end up at row 1, col 0
    if (event.direction === 'down' && currentRow === 0 && currentCol === 0) {
      console.log('VALIDATION: Moving down from (0,0) - should go to row 1, col 0');
      console.log('  Calculated newIndex:', newIndex, 'which is row', newRow, 'col', newCol);
      if (newRow !== 1 || newCol !== 0) {
        console.error('  ERROR: Expected row 1, col 0 but got row', newRow, 'col', newCol);
        console.error('  This means gridColumns might be wrong. gridColumns =', gridColumns);
      }
    }
    console.log('========================');
    
    // Only swap if the new index is different and valid
    if (newIndex !== cardIndex && newIndex >= 0 && newIndex < this.allCards.length) {
      // Simple swap: move card to new position, the card at new position moves to old position
      const temp = this.allCards[newIndex];
      this.allCards[newIndex] = this.allCards[cardIndex];
      this.allCards[cardIndex] = temp;
      
      // Verify the swap worked correctly
      const verifyRow = Math.floor(newIndex / gridColumns);
      const verifyCol = newIndex % gridColumns;
      console.log('After swap - Card at newIndex', newIndex, 'is now at Row:', verifyRow, 'Col:', verifyCol);
      
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
    // Initialize default cards if not loaded from storage
    if (Object.keys(this.cardsBySection).length === 0) {
      this.createDefaultCards();
    }
    this.loadCardOrder();
    this.updateAllCards();
  }
  
  private updateAllCards(): void {
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
        { id: 'insp-today', sectionId: 'inspections', type: 'compact', title: 'Today', icon: '', value: this.inspectionStats.today, label: 'Today', valueType: 'number', order: 1, size: '1x1' },
        { id: 'insp-week', sectionId: 'inspections', type: 'compact', title: 'This Week', icon: '', value: this.inspectionStats.thisWeek, label: 'This Week', valueType: 'number', order: 2, size: '1x1' },
        { id: 'insp-month', sectionId: 'inspections', type: 'compact', title: 'This Month', icon: '', value: this.inspectionStats.thisMonth, label: 'This Month', valueType: 'number', order: 3, size: '1x1' },
        { id: 'insp-severity', sectionId: 'inspections', type: 'card', title: 'Issues', icon: 'flag-outline', value: 'custom', label: 'issues', valueType: 'custom', order: 4, size: '2x2' }
      ],
      drivers: [
        { id: 'driver-active', sectionId: 'drivers', type: 'card', title: 'Active Today', icon: 'person-outline', iconClass: 'icon-info', value: this.driverStats.activeToday, label: 'Drivers assigned', valueType: 'number', order: 0, size: '1x1' },
        { id: 'driver-week', sectionId: 'drivers', type: 'compact', title: 'This Week', icon: '', value: this.driverStats.uniqueThisWeek, label: 'This Week', valueType: 'number', order: 1, size: '1x1' },
        { id: 'driver-month', sectionId: 'drivers', type: 'compact', title: 'This Month', icon: '', value: this.driverStats.uniqueThisMonth, label: 'This Month', valueType: 'number', order: 2, size: '1x1' },
        { id: 'driver-rate', sectionId: 'drivers', type: 'card', title: 'Assignment Rate', icon: 'pie-chart-outline', value: this.driverStats.assignmentRate, label: 'of active vans assigned', valueType: 'percentage', order: 3, size: '1x1' },
        { id: 'driver-coverage', sectionId: 'drivers', type: 'card', title: 'Coverage by Type', icon: 'car-sport-outline', value: 'custom', label: 'coverage', valueType: 'custom', order: 4, size: '2x1' },
        { id: 'driver-top', sectionId: 'drivers', type: 'card', title: 'Most Assigned Drivers', icon: 'star-outline', value: 'custom', label: 'drivers', valueType: 'custom', order: 5, size: '2x2' }
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
      // Try loading unified order first
      const saved = localStorage.getItem(this.STORAGE_KEY_CARDS);
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
        // Fallback to section-based order
        const savedSectionOrder = localStorage.getItem('statistics_cards_order_by_section');
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

