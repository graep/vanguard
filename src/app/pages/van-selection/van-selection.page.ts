import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonSpinner, IonIcon } from '@ionic/angular/standalone';
import { RouterModule, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { AppHeaderComponent } from '@app/components/app-header/app-header.component';
import { NavService } from '@app/services/nav.service';
import { ShiftSessionService } from '@app/services/shift-session.service';
import { AuthService } from '@app/services/auth.service';
import { Van } from '@app/models/van.model';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { BreadcrumbItem } from '@app/components/breadcrumb/breadcrumb.component';
import { Observable, Subscription, filter, take } from 'rxjs';

@Component({
  selector: 'app-van-selection',
  templateUrl: './van-selection.page.html',
  styleUrls: ['./van-selection.page.scss'],
  standalone: true,
  imports: [ IonContent, IonSpinner, IonIcon, CommonModule, RouterModule, PageHeaderComponent ]
})
export class VanSelectionPage implements OnInit, OnDestroy {
  vansByType: Record<string, Van[]> = {};
  isLoading = true;
  breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Van Selection', icon: 'car' }
  ];

  private firestore = inject(Firestore);
  private shiftSession = inject(ShiftSessionService);
  private authService = inject(AuthService);
  private subs: Subscription[] = [];

  constructor(
    private router: Router,
    private auth: Auth,
    private navService: NavService
  ) {}

  ngOnInit() {
    // Wait for user profile to be loaded before querying Firestore
    // This ensures auth state is fully propagated to Firestore
    const profileSub = this.authService.currentUserProfile$.pipe(
      filter(profile => profile !== null), // Wait for profile to exist
      take(1) // Only take the first non-null profile
    ).subscribe(() => {
      this.loadVans();
    });
    this.subs.push(profileSub);
  }

  ngOnDestroy() {
    this.subs.forEach(sub => sub.unsubscribe());
  }

  private loadVans(): void {
    const vansRef = collection(this.firestore, 'vans');
    const vans$ = collectionData(vansRef, { idField: 'docId' }) as Observable<Van[]>;
    
    const vansSub = vans$.subscribe({
      next: (vans) => {
        // Group vans by type
        this.vansByType = vans.reduce((acc, van) => {
          if (!acc[van.type]) {
            acc[van.type] = [];
          }
          acc[van.type].push(van);
          return acc;
        }, {} as Record<string, Van[]>);

        // Sort vans by number within each type
        Object.keys(this.vansByType).forEach(type => {
          this.vansByType[type].sort((a, b) => (a.number || 0) - (b.number || 0));
        });

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading vans:', error);
        // Reset to empty state on error and stop loading
        this.vansByType = {};
        this.isLoading = false;
        
        // Log detailed error info for debugging
        if (error?.code) {
          console.error('Firestore error code:', error.code);
        }
        if (error?.message) {
          console.error('Firestore error message:', error.message);
        }
      }
    });
    this.subs.push(vansSub);
  }

  async logout() {
    await this.auth.signOut();
    this.navService.enhancedLogout(); // Clear both app and browser history
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  async selectVan(van: Van) {
    // Prevent selection of grounded vans
    if (van.isGrounded) {
      return;
    }

    // GPS tracking disabled - navigate directly to photo-capture
    // TODO: Re-enable GPS tracking when needed
    // await this.shiftSession.startShift(van.docId);
    
    // Navigate directly to photo-capture page
    this.router.navigate(['/photo-capture', van.type, van.number.toString()], {
      queryParams: {
        vanId: van.docId
      }
    });
  }

  getVanTypes(): string[] {
    const orderedTypes = ['EDV', 'CDV', 'Rental'];
    return orderedTypes.filter(type => this.vansByType[type] && this.vansByType[type].length > 0);
  }

  getVansByType(type: string): Van[] {
    return this.vansByType[type] || [];
  }

  getVanTypeIcon(vanType: string): string {
    switch (vanType) {
      case 'EDV':
        return 'car';
      case 'CDV':
        return 'car-sport';
      case 'Rental':
        return 'truck';
      default:
        return 'car';
    }
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
    if (van.make && van.model) {
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
    if (!van.make) {
      return 'assets/Rental.jpg'; // Default fallback
    }
    
    const make = van.make.toLowerCase().trim();
    const model = van.model ? van.model.toLowerCase().trim() : '';
    
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

  /**
   * Get the display name for a van
   * For Rental vans, uses vanId (e.g., "Budget 1"); for EDV/CDV, returns null to use number directly
   * @param van The van object
   * @returns The display name for rental vans, or null for EDV/CDV (which will use number)
   */
  getVanDisplayName(van: Van): string | null {
    if (!van) return null;
    
    // Only apply special logic for rental vans
    const vanType = van.type ? van.type.toUpperCase() : '';
    if (vanType === 'RENTAL') {
      // Use vanId property first (the original user-entered value like "Budget 1")
      if (van.vanId && String(van.vanId).trim()) {
        return String(van.vanId).trim();
      }
      
      // Fallback to docId (for new vans, docId is the sanitized vanId)
      // Convert underscores back to spaces for better display
      if (van.docId) {
        return van.docId.replace(/_/g, ' ');
      }
      
      // If no vanId/docId, don't show number (which would be 0 for rentals)
      return 'Unknown';
    }
    
    // For EDV/CDV, return null so the template uses van.number directly
    return null;
  }

}
