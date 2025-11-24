import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ViewWillLeave } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonImg,
  IonLoading,
  IonIcon,
  ToastController,
  Platform
} from '@ionic/angular/standalone';
import { InspectionService } from 'src/app/services/inspection.service';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { NavService } from '@app/services/nav.service';
import { AppLifecycleService } from '@app/services/app-lifecycle.service';
import { FullscreenCameraComponent } from '@app/components/fullscreen-camera/fullscreen-camera.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { BreadcrumbItem } from '@app/components/breadcrumb/breadcrumb.component';
import { Van } from '@app/models/van.model';

@Component({
  selector: 'app-photo-capture',
  templateUrl: './photo-capture.page.html',
  styleUrls: ['./photo-capture.page.scss'],
  standalone: true,
  imports: [
    IonLoading,
    IonImg,
    IonButton,
    IonIcon,
    IonContent,
    CommonModule,
    FullscreenCameraComponent,
    PageHeaderComponent
  ],
})
export class PhotoCapturePage implements OnInit, OnDestroy, ViewWillLeave {
  vanType!: string;
  vanNumber!: string;
  vanId!: string; // NEW: Store the actual van document ID
  vanDisplayName: string = ''; // Display name for the van (e.g., "Budget 1" for rentals)
  van: Van | null = null; // Full van object

  private firestore = inject(Firestore);

  // Breadcrumb items
  breadcrumbItems: BreadcrumbItem[] = [];

  // The four sides we need to capture
  sides = ['passenger', 'rear', 'driver', 'front'];

  // Holds the URI for each side’s photo
  photos: Record<string, string | null> = {
    front: null,
    rear: null,
    driver: null,
    passenger: null,
  };

  isLoading = false;
  showCamera = false;
  currentSide = '';

  get allPhotosTaken(): boolean {
    return this.sides.every((side) => !!this.photos[side]);
  }

  getCompletedCount(): number {
    return this.sides.filter(side => !!this.photos[side]).length;
  }

  getProgressPercentage(): number {
    return (this.getCompletedCount() / this.sides.length) * 100;
  }

  getSideOverlayImage(side: string): string {
    switch (side) {
      case 'front':
        return 'assets/overlays/frontOverlay.png';
      case 'rear':
        return 'assets/overlays/rearOverlay.png';
      case 'driver':
        return 'assets/overlays/driverSideOverlay.png';
      case 'passenger':
        return 'assets/overlays/passengerSideOverlay.png';
      default:
        return 'assets/overlays/frontOverlay.png';
    }
  }

  getSideDisplayName(side: string): string {
    return side.charAt(0).toUpperCase() + side.slice(1);
  }

  constructor(
    private route: ActivatedRoute,
    private inspection: InspectionService,
    private router: Router,
    private toastCtrl: ToastController,
    private auth: Auth,
    private navService: NavService,
    private platform: Platform,
    private appLifecycle: AppLifecycleService
  ) {}
  async ngOnInit() {
    // Pull vanType and vanNumber out of the URL
    this.vanType = this.route.snapshot.paramMap.get('vanType')!;
    this.vanNumber = this.route.snapshot.paramMap.get('vanNumber')!;
    
    // Get vanId from query params (passed from van selection)
    this.vanId = this.route.snapshot.queryParamMap.get('vanId') || '';
    
    // Load van data to get proper display name
    if (this.vanId) {
      await this.loadVanData();
    } else {
      // Fallback to URL params if vanId not available
      this.vanDisplayName = `${this.vanType} ${this.vanNumber}`;
    }
    
    // Check if we're coming from background tracking
    // DISABLED: Inspection prompt disabled per user request
    // const fromBackground = this.route.snapshot.queryParamMap.get('fromBackground') === 'true';
    // if (fromBackground) {
    //   this.showInspectionPrompt = true;
    // }
    
    // Setup breadcrumb items
    this.breadcrumbItems = [
      { label: 'Van Selection', url: '/van-selection', icon: 'car' },
      { label: this.vanDisplayName || `${this.vanType} ${this.vanNumber}`, icon: 'camera' }
    ];
    
    // Check if we're returning to this page and clear photos
    this.checkForReturnNavigation();
  }

  private async loadVanData() {
    if (!this.vanId) return;
    
    try {
      const vanDocRef = doc(this.firestore, 'vans', this.vanId);
      const vanDoc = await getDoc(vanDocRef);
      
      if (vanDoc.exists()) {
        const data = vanDoc.data();
        this.van = { docId: vanDoc.id, ...data } as Van;
        this.vanDisplayName = this.getVanDisplayName(this.van);
        
        // Update breadcrumb with correct display name
        this.breadcrumbItems = [
          { label: 'Van Selection', url: '/van-selection', icon: 'car' },
          { label: this.vanDisplayName, icon: 'camera' }
        ];
      } else {
        // Fallback if van not found
        this.vanDisplayName = `${this.vanType} ${this.vanNumber}`;
      }
    } catch (error) {
      console.error('Failed to load van data:', error);
      // Fallback if error
      this.vanDisplayName = `${this.vanType} ${this.vanNumber}`;
    }
  }

  /**
   * Get the display name for a van
   * For Rental vans, uses vanId (e.g., "Budget 1"); for EDV/CDV, uses type and number
   * @param van The van object
   * @returns The display name for the van
   */
  private getVanDisplayName(van: Van): string {
    if (!van) return `${this.vanType} ${this.vanNumber}`;
    
    // For rental vans, use vanId property (e.g., "Budget 1")
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
      
      // If no vanId/docId, use type and number
      return `${van.type} ${van.number || 0}`;
    }
    
    // For EDV/CDV, use type and number
    return van.number != null ? `${van.type} ${van.number}` : `${van.type} Unknown`;
  }

  private checkForReturnNavigation() {
    // Check if we have any photos and clear them when returning to the page
    const hasPhotos = Object.values(this.photos).some(photo => photo !== null);
    if (hasPhotos) {
      this.clearAllPhotos();
    }
  }

  ionViewWillLeave() {
    // Clear photos when leaving the page
    this.clearAllPhotos();
  }

  ngOnDestroy() {
    // Component cleanup
  }

  private clearAllPhotos() {
    this.photos = {
      front: null,
      rear: null,
      driver: null,
      passenger: null,
    };
    this.showCamera = false;
    this.currentSide = '';
  }

  /** Shows the full-screen camera for the given side */
  takePhoto(side: string) {
    this.currentSide = side;
    this.showCamera = true;
  }

  /** Handles photo captured from camera component */
  onPhotoCaptured(photo: string) {
    this.photos[this.currentSide] = photo;
    this.showCamera = false;
    this.currentSide = '';
  }

  /** Handles camera cancellation */
  onCameraCancelled() {
    this.showCamera = false;
    this.currentSide = '';
  }

  private async showSuccessToast() {
    const toast = await this.toastCtrl.create({
      message: 'Photos saved! Please complete your inspection.',
      color: 'success',
      duration: 2000,
      position: 'middle',
    });
    await toast.present();
  }

  async submitAll() {
    // Check authentication before proceeding
    if (!this.auth.currentUser) {
      console.error('User not authenticated');
      const errToast = await this.toastCtrl.create({
        message: 'Please log in again to upload photos.',
        color: 'danger',
        duration: 3000,
        position: 'top',
      });
      await errToast.present();
      return;
    }

    this.isLoading = true;
    try {
      // 1. Upload all four photos and collect URLs
      const urls: Record<string, string> = {};
      for (const side of this.sides) {
        const data = this.photos[side]!;
        try {
          urls[side] = await this.inspection.uploadPhoto(
            this.vanType,
            this.vanNumber,
            side,
            data
          );
        } catch (uploadError) {
          console.error(`Failed to upload ${side} photo:`, uploadError);
          const errorMessage = uploadError instanceof Error ? uploadError.message : String(uploadError);
          throw new Error(`Failed to upload ${side} photo: ${errorMessage}`);
        }
      }

      // 2. Save the inspection (photos) and grab its new Firestore ID
      const inspectionId = await this.inspection.saveInspection(
        this.vanType,
        this.vanNumber,
        urls
      );

      // 3. Hide the spinner
      this.isLoading = false;

      // 4. Show success toast
      await this.showSuccessToast();
      // Clear background tracking state when inspection is submitted
      this.appLifecycle.clearBackgroundTracking();
      
      await this.router.navigate(['/user-review'], {
        replaceUrl: true,
        queryParams: {
          inspectionId,
          vanType: this.vanType,
          vanNumber: this.vanNumber,
          vanId: this.vanId, // NEW: Pass the van document ID
        },
      });
    } catch (e) {
      console.error('Upload or save failed', e);
      
      // Type-safe error handling
      const error = e as any;
      this.isLoading = false;
      
      let errorMessage = 'Could not upload photos. Try again.';
      if (error?.code === 'storage/unauthorized') {
        errorMessage = 'Permission denied. Please contact support.';
      } else if (error?.code === 'storage/unauthenticated') {
        errorMessage = 'Please log in again to upload photos.';
      } else if (error?.code === 'storage/quota-exceeded') {
        errorMessage = 'Storage quota exceeded. Please contact support.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      const errToast = await this.toastCtrl.create({
        message: errorMessage,
        color: 'danger',
        duration: 3000,
        position: 'top',
      });
      await errToast.present();
    }
  }

  async logout() {
    await this.auth.signOut();
    this.navService.reset(); // Clear navigation history to prevent back navigation to protected routes
    this.router.navigate(['/login']);
  }
}
