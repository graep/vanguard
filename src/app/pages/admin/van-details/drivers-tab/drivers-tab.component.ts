import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { IonCard, IonCardContent, IonSpinner, IonIcon } from '@ionic/angular/standalone';
import { Firestore, collection, query, where, orderBy, getDocs } from '@angular/fire/firestore';
import { InspectionService, Inspection } from '@app/services/inspection.service';
import { AuthService } from '@app/services/auth.service';
import { BreadcrumbService } from '@app/services/breadcrumb.service';
import { Timestamp } from 'firebase/firestore';

interface DriverRecord {
  id: string;
  date: Date;
  driverName: string | null;
  driverId?: string;
}

@Component({
  selector: 'app-drivers-tab',
  standalone: true,
  imports: [CommonModule, IonCard, IonCardContent, IonSpinner, IonIcon],
  templateUrl: './drivers-tab.component.html',
  styleUrls: ['./drivers-tab.component.scss']
})
export class DriversTabComponent implements OnInit {
  @Input() vanId!: string;

  private inspectionService = inject(InspectionService);
  private authService = inject(AuthService);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private breadcrumbService = inject(BreadcrumbService);

  driverRecords: DriverRecord[] = [];
  loading = true;

  async ngOnInit() {
    await this.loadDriverRecords();
  }

  private async loadDriverRecords() {
    this.loading = true;
    try {
      // Get van information from vanId
      const vanInfo = await this.inspectionService.getVanByDocId(this.vanId);
      if (!vanInfo) {
        console.warn('Could not find van information for vanId:', this.vanId);
        this.driverRecords = [];
        return;
      }

      // Get all inspections for this van
      const inspections = await this.getAllInspectionsByVan(vanInfo.vanType, vanInfo.vanNumber);
      
      // Convert inspections to driver records
      this.driverRecords = await this.convertInspectionsToDriverRecords(inspections);
      
      // Sort by date descending (most recent first)
      this.driverRecords.sort((a, b) => b.date.getTime() - a.date.getTime());
    } catch (error) {
      console.error('Error loading driver records:', error);
      this.driverRecords = [];
    } finally {
      this.loading = false;
    }
  }

  private normalizeVanNumber(vanNumber: string): string {
    return vanNumber.replace(/^0+/, '') || '0';
  }

  private async getAllInspectionsByVan(vanType: string, vanNumber: string): Promise<Inspection[]> {
    try {
      const inspectionsRef = collection(this.firestore, 'inspections');
      const normalizedVanNumber = this.normalizeVanNumber(vanNumber);
      
      const q = query(
        inspectionsRef,
        where('vanType', '==', vanType),
        where('vanNumber', '==', normalizedVanNumber),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Inspection[];
    } catch (error) {
      console.error('Error fetching inspections:', error);
      return [];
    }
  }

  private async convertInspectionsToDriverRecords(inspections: Inspection[]): Promise<DriverRecord[]> {
    const records: DriverRecord[] = [];
    const userCache = new Map<string, string>(); // Cache user display names

    for (const inspection of inspections) {
      // Extract date from createdAt timestamp
      let inspectionDate: Date;
      if (inspection.createdAt instanceof Timestamp) {
        inspectionDate = inspection.createdAt.toDate();
      } else if (inspection.createdAt instanceof Date) {
        inspectionDate = inspection.createdAt;
      } else if (inspection.createdAt) {
        // Handle other timestamp formats
        inspectionDate = new Date(inspection.createdAt as any);
      } else {
        continue; // Skip if no valid date
      }

      // Get driver name from createdBy
      let driverName: string | null = null;
      if (inspection.createdBy) {
        // Check cache first
        if (userCache.has(inspection.createdBy)) {
          driverName = userCache.get(inspection.createdBy) || null;
        } else {
          // Load user profile
          try {
            const userProfile = await this.authService.getUserProfile(inspection.createdBy);
            driverName = this.authService.getDisplayName(userProfile);
            userCache.set(inspection.createdBy, driverName);
          } catch (error) {
            console.warn('Could not load user profile for:', inspection.createdBy);
            driverName = 'Unknown User';
          }
        }
      }

      // Create a date key to avoid duplicates (same day, same driver)
      const dateKey = inspectionDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Check if we already have a record for this date
      const existingRecord = records.find(r => {
        const recordDateKey = r.date.toISOString().split('T')[0];
        return recordDateKey === dateKey;
      });

      if (!existingRecord) {
        records.push({
          id: inspection.id,
          date: inspectionDate,
          driverName: driverName,
          driverId: inspection.createdBy || undefined
        });
      } else {
        // If we have multiple inspections on the same day, prefer the one with a driver name
        if (!existingRecord.driverName && driverName) {
          existingRecord.driverName = driverName;
          existingRecord.driverId = inspection.createdBy || undefined;
        }
      }
    }

    return records;
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getDayName(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }

  viewUser(record: DriverRecord): void {
    if (!record.driverId) {
      return; // Can't navigate without a user ID
    }

    // Prime breadcrumb so it shows immediately on navigation
    if (record.driverName) {
      this.breadcrumbService.setTail([
        { label: record.driverName, icon: 'person' }
      ]);
    }

    // Navigate to the user detail page using the user's uid
    // Navigate relative to parent (admin) route
    this.router.navigate(['user', record.driverId], { relativeTo: this.route.parent });
  }
}