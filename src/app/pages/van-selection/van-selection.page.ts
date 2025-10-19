import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonSpinner, IonIcon } from '@ionic/angular/standalone';
import { RouterModule, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { AppHeaderComponent } from '@app/components/app-header/app-header.component';
import { NavService } from '@app/services/nav.service';
import { ShiftSessionService } from '@app/services/shift-session.service';
import { Van } from '@app/models/van.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-van-selection',
  templateUrl: './van-selection.page.html',
  styleUrls: ['./van-selection.page.scss'],
  standalone: true,
  imports: [ IonContent, IonSpinner, IonIcon, CommonModule, RouterModule, AppHeaderComponent ]
})
export class VanSelectionPage implements OnInit {
  vans$: Observable<Van[]>;
  vansByType: Record<string, Van[]> = {};
  isLoading = true;

  private firestore = inject(Firestore);
  private shiftSession = inject(ShiftSessionService);

  constructor(
    private router: Router,
    private auth: Auth,
    private navService: NavService
  ) {
    // Load vans from Firestore
    const vansRef = collection(this.firestore, 'vans');
    this.vans$ = collectionData(vansRef, { idField: 'docId' }) as Observable<Van[]>;
  }

  ngOnInit() {
    this.vans$.subscribe(vans => {
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
    });
  }

  async logout() {
    await this.auth.signOut();
    this.navService.enhancedLogout(); // Clear both app and browser history
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  async selectVan(van: Van) {
    try {
      // Start GPS tracking session for this van (tracks entire shift)
      await this.shiftSession.startShift(van.docId);
      
      // Navigate to photo capture with van info
      this.router.navigate([
        '/photo-capture',
        van.type,
        van.number.toString()
      ], { 
        replaceUrl: true,
        queryParams: { vanId: van.docId } // NEW: Pass the van document ID
      });
    } catch (error) {
      console.error('Failed to start shift:', error);
      // Still navigate even if GPS fails
      this.router.navigate([
        '/photo-capture',
        van.type,
        van.number.toString()
      ], { 
        replaceUrl: true,
        queryParams: { vanId: van.docId } // NEW: Pass the van document ID
      });
    }
  }

  getVanTypes(): string[] {
    const orderedTypes = ['EDV', 'CDV', 'LMR'];
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
      case 'LMR':
        return 'truck';
      default:
        return 'car';
    }
  }

  /**
   * Get the appropriate LMR image based on the van's make
   * @param van The van object
   * @returns The path to the appropriate LMR image
   */
  getLmrImage(van: Van): string {
    if (!van.make) {
      return 'assets/LMR.jpg'; // Default fallback
    }
    
    const make = van.make.toLowerCase().trim();
    
    if (make === 'ford') {
      return 'assets/LMR_ford.png';
    } else if (make === 'dodge') {
      return 'assets/LMR_dodge.png';
    }
    
    return 'assets/LMR.jpg'; // Default fallback for other makes
  }
}
