// src/app/pages/admin/dashboard/dashboard.page.ts
import { Component, NgZone, OnInit, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionData,
  CollectionReference,
} from '@angular/fire/firestore';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Van } from 'src/app/models/van.model';
import { StatusCountBarComponent, StatusDataSource } from '@app/components/status-count-bar/status-count-bar.component';
import { NavService } from '@app/services/nav.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    IonicModule, 
    FormsModule, 
    StatusCountBarComponent
  ],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {
  // Van data
  vans: Van[] = [];
  filteredVans: Van[] = [];
  filteredCdvs: Van[] = [];
  filteredEdvs: Van[] = [];

  // Data sources for the status bars
  overallDataSource: StatusDataSource = {
    items: [],
    statusField: 'isGrounded',
    activeValue: false,
    searchFields: ['docId', 'vin', 'type', 'number']
  };

  cdvDataSource: StatusDataSource = {
    items: [],
    statusField: 'isGrounded',
    activeValue: false,
    searchFields: ['docId', 'vin', 'number'],
    filterField: 'type',
    filterValue: 'CDV'
  };

  edvDataSource: StatusDataSource = {
    items: [],
    statusField: 'isGrounded', 
    activeValue: false,
    searchFields: ['docId', 'vin', 'number'],
    filterField: 'type',
    filterValue: 'EDV'
  };

  // Inject only what we need
  private route = inject(ActivatedRoute);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private auth = inject(Auth);
  private ngZone = inject(NgZone);
  private navService = inject(NavService);

  ngOnInit() {
    this.loadVans();
  }

  private loadVans(): void {
    const vansRef = collection(
      this.firestore,
      'vans'
    ) as CollectionReference<Van>;

    // Wrap Firebase subscription in NgZone to fix warnings
    collectionData<Van>(vansRef, { idField: 'docId' }).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          this.vans = data;
          
          // Update data source
          this.overallDataSource = { ...this.overallDataSource, items: data };
          
          // Initialize filtered data
          this.updateFilteredLists(data);
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          console.error('Error loading vans:', error);
          // Reset to empty state on error
          this.vans = [];
          this.updateFilteredLists([]);
        });
      }
    });
  }

  private updateFilteredLists(data: Van[]): void {
    this.filteredVans = data;
    this.filteredCdvs = data.filter((v) => (v.type || '').toUpperCase() === 'CDV');
    this.filteredEdvs = data.filter((v) => (v.type || '').toUpperCase() === 'EDV');
  }

  // Handle filtered data from overall status bar
  onOverallFilteredData(filteredData: Van[]): void {
    this.filteredVans = filteredData;
    // Update both CDV and EDV lists based on overall filter
    this.filteredCdvs = filteredData.filter((v) => (v.type || '').toUpperCase() === 'CDV');
    this.filteredEdvs = filteredData.filter((v) => (v.type || '').toUpperCase() === 'EDV');
  }

  viewVan(van: Van): void {
    // Navigate to the dynamic van detail page using the van's docId
    this.router.navigate(['van', van.docId], { relativeTo: this.route });
  }

  async logout(): Promise<void> {
    await this.auth.signOut();
    this.navService.enhancedLogout(); // Clear both app and browser history
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}