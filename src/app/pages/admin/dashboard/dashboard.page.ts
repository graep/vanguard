// src/app/pages/admin/dashboard/dashboard.page.ts
import { Component, NgZone, OnInit, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionData,
  CollectionReference,
} from '@angular/fire/firestore';
import {
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonIcon,
  IonButton,
  LoadingController,
  ToastController,
  ModalController
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Van } from 'src/app/models/van.model';
import { StatusCountBarComponent, StatusDataSource } from '@app/components/status-count-bar/status-count-bar.component';
import { BreadcrumbItem } from '@app/components/breadcrumb/breadcrumb.component';
import { NavService } from '@app/services/nav.service';
import { VanService } from '@app/services/van.service';
import { AddVanModalComponent } from '@app/components/add-van-modal/add-van-modal.component';
import { BreadcrumbService } from '@app/services/breadcrumb.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonIcon,
    IonButton,
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
  filteredRentals: Van[] = [];

  // Filter state tracking
  hasActiveFilters = false;

  // Data sources for the status bars
  overallDataSource: StatusDataSource = {
    items: [],
    statusField: 'isGrounded',
    activeValue: false,
    searchFields: ['docId', 'VIN', 'type', 'number']
  };

  cdvDataSource: StatusDataSource = {
    items: [],
    statusField: 'isGrounded',
    activeValue: false,
    searchFields: ['docId', 'VIN', 'number'],
    filterField: 'type',
    filterValue: 'CDV'
  };

  edvDataSource: StatusDataSource = {
    items: [],
    statusField: 'isGrounded', 
    activeValue: false,
    searchFields: ['docId', 'VIN', 'number'],
    filterField: 'type',
    filterValue: 'EDV'
  };

  rentalDataSource: StatusDataSource = {
    items: [],
    statusField: 'isGrounded',
    activeValue: false,
    searchFields: ['docId', 'VIN', 'number'],
    filterField: 'type',
    filterValue: 'Rental'
  };

  // Breadcrumb
  breadcrumbItems: BreadcrumbItem[] = [];

  // Inject only what we need
  private route = inject(ActivatedRoute);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private auth = inject(Auth);
  private ngZone = inject(NgZone);
  private navService = inject(NavService);
  private vanService = inject(VanService);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);
  private modalCtrl = inject(ModalController);
  private breadcrumbService = inject(BreadcrumbService);

  ngOnInit() {
    // Ensure no residual tail remains when landing on Dashboard
    this.breadcrumbService.clearTail();
    // Set breadcrumb to mirror van-details header style
    this.breadcrumbItems = [
      { label: 'Dashboard', icon: 'home' }
    ];
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
    this.filteredRentals = data.filter((v) => (v.type || '').toUpperCase() === 'RENTAL');
  }

  // Handle filtered data from overall status bar
  onOverallFilteredData(filteredData: Van[]): void {
    this.filteredVans = filteredData;
    // Update CDV, EDV, and Rental lists based on overall filter
    this.filteredCdvs = filteredData.filter((v) => (v.type || '').toUpperCase() === 'CDV');
    this.filteredEdvs = filteredData.filter((v) => (v.type || '').toUpperCase() === 'EDV');
    this.filteredRentals = filteredData.filter((v) => (v.type || '').toUpperCase() === 'RENTAL');
    
    // Check if any filters are active (filtered data is different from original data)
    this.hasActiveFilters = filteredData.length !== this.vans.length;
  }

  viewVan(van: Van): void {
    // Prime breadcrumb so it shows immediately on navigation
    if (van && van.type && van.number != null) {
      this.breadcrumbService.setTail([
        { label: `${(van.type || '').toUpperCase()} ${van.number}`, icon: 'car' }
      ]);
    }
    // Navigate to the dynamic van detail page using the van's docId
    this.router.navigate(['van', van.docId], { relativeTo: this.route });
  }

  async addVan(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: AddVanModalComponent,
      componentProps: {
        existingVans: this.vans
      }
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    
    if (data) {
      // Van was added successfully, the data will be automatically updated via the Firestore subscription
      console.log('New van added:', data);
    }
  }

  async deleteVan(van: Van): Promise<void> {
    try {
      await this.vanService.deleteVan(van.docId);
      
      // Show success message
      const toast = await this.toastCtrl.create({
        message: `${van.type} van #${van.number} deleted successfully!`,
        duration: 3000,
        color: 'success',
        position: 'top'
      });
      await toast.present();

    } catch (error) {
      console.error('Error deleting van:', error);

      // Show error message
      const toast = await this.toastCtrl.create({
        message: 'Failed to delete van. Please try again.',
        duration: 4000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    }
  }

  async logout(): Promise<void> {
    await this.auth.signOut();
    this.navService.enhancedLogout(); // Clear both app and browser history
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  /**
   * Get the appropriate Rental image based on the van's make
   * @param van The van object
   * @returns The path to the appropriate Rental image
   */
  getRentalImage(van: Van): string {
    if (!van.make) {
      return 'assets/Rental.jpg'; // Default fallback
    }
    
    const make = van.make.toLowerCase().trim();
    
    if (make === 'ford') {
      return 'assets/Rental_ford.png';
    } else if (make === 'dodge') {
      return 'assets/Rental_dodge.png';
    }
    
    return 'assets/Rental.jpg'; // Default fallback for other makes
  }
}