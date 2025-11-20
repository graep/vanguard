// src/app/pages/admin/fleet/fleet.page.ts
import { Component, NgZone, OnInit, OnDestroy, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionData,
  CollectionReference,
} from '@angular/fire/firestore';
import {
  IonContent,
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
import { AuthService } from '@app/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-fleet',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    IonContent,
    IonIcon,
    IonButton,
    StatusCountBarComponent
  ],
  templateUrl: './fleet.page.html',
  styleUrls: ['./fleet.page.scss'],
})
export class FleetPage implements OnInit, OnDestroy {
  // Van data
  vans: Van[] = [];
  filteredVans: Van[] = [];
  filteredCdvs: Van[] = [];
  filteredEdvs: Van[] = [];
  filteredRentals: Van[] = [];

  // Filter state tracking
  hasActiveFilters = false;
  
  // User info
  userDisplayName: string = 'User';

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
  private authService = inject(AuthService);
  private subscriptions = new Subscription();

  ngOnInit() {
    // Clear any existing tail - admin layout will build breadcrumb from route
    this.breadcrumbService.clearTail();
    this.loadVans();
    this.loadUserInfo();
  }
  
  private loadUserInfo() {
    const sub = this.authService.currentUserProfile$.subscribe(profile => {
      this.userDisplayName = this.authService.getFirstName(profile);
    });
    this.subscriptions.add(sub);
  }
  
  ngOnDestroy() {
    this.subscriptions.unsubscribe();
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
    if (van && van.type) {
      // For rental vans, use vanId; for others, use number
      const displayName = van.type.toUpperCase() === 'RENTAL' 
        ? (van.vanId || 'Unknown')
        : (van.number != null ? `${van.number}` : 'Unknown');
      this.breadcrumbService.setTail([
        { label: displayName, icon: 'car' }
      ]);
    }
    // Navigate to the dynamic van detail page using the van's docId
    // Navigate relative to parent (admin) route, not the current fleet route
    this.router.navigate(['van', van.docId], { relativeTo: this.route.parent });
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
   * Get the appropriate van image based on make, model, and type
   * @param van The van object
   * @returns The path to the appropriate van image
   */
  getVanImage(van: Van): string {
    // Use custom image if available
    if (van.imageUrl) {
      return van.imageUrl;
    }

    // Check for Ford Transit (works for any van type)
    // Use contains check to handle variations like "Transit 250", "Transit Connect", etc.
    // Handle both undefined and empty string cases
    if (van.make && van.make.trim() && van.model && van.model.trim()) {
      const make = van.make.toLowerCase().trim();
      const model = van.model.toLowerCase().trim();
      
      if (make === 'ford' && model.includes('transit')) {
        return 'assets/Ford_Transit.png';
      }
    }

    // For Rental vans, check for Dodge Promaster
    if (van.type && van.type.toUpperCase() === 'RENTAL') {
      return this.getRentalImage(van);
    }

    // Default images based on van type for EDV and CDV
    const vanType = (van.type || '').toUpperCase();
    return `assets/${vanType}.jpg`;
  }

  /**
   * Get the appropriate Rental image based on the van's make and model
   * @param van The van object
   * @returns The path to the appropriate Rental image
   */
  getRentalImage(van: Van): string {
    // Handle both undefined and empty string cases
    if (!van.make || !van.make.trim()) {
      return 'assets/Rental.jpg'; // Default fallback
    }
    
    const make = van.make.toLowerCase().trim();
    const model = van.model && van.model.trim() ? van.model.toLowerCase().trim() : '';
    
    // Check for Ford Transit first (should have been caught in getVanImage, but double-check here)
    if (make === 'ford' && model && model.includes('transit')) {
      return 'assets/Ford_Transit.png';
    }
    
    // Check for Dodge Promaster (Rental only)
    // Use contains check to handle variations
    if (make === 'dodge' && model && model.includes('promaster') && van.type && van.type.toUpperCase() === 'RENTAL') {
      return 'assets/Dodge_Promaster_Rent.jpg';
    }
    
    // Legacy support for make-only checks
    if (make === 'ford') {
      return 'assets/Rental_ford.png';
    } else if (make === 'dodge') {
      return 'assets/Rental_dodge.png';
    }
    
    return 'assets/Rental.jpg'; // Default fallback for other makes
  }
}