import { Component, OnInit, OnDestroy } from '@angular/core';
import { ViewWillLeave } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import {
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonButton,
  IonImg,
  IonLoading,
  ToastController,
  Platform
} from '@ionic/angular/standalone';
import { InspectionService } from 'src/app/services/inspection.service';
import { Auth } from '@angular/fire/auth';
import { getApp } from '@angular/fire/app';
import { AppHeaderComponent } from '@app/components/app-header/app-header.component';
import { NavService } from '@app/services/nav.service';
import { FullscreenCameraComponent } from '@app/components/fullscreen-camera/fullscreen-camera.component';

@Component({
  selector: 'app-photo-capture',
  templateUrl: './photo-capture.page.html',
  styleUrls: ['./photo-capture.page.scss'],
  standalone: true,
  imports: [
    IonLoading,
    IonImg,
    IonButton,
    IonCol,
    IonRow,
    IonGrid,
    IonContent,
    CommonModule,
    AppHeaderComponent,
    FullscreenCameraComponent
  ],
})
export class PhotoCapturePage implements OnInit, OnDestroy, ViewWillLeave {
  vanType!: string;
  vanNumber!: string;
  vanId!: string; // NEW: Store the actual van document ID

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

  constructor(
    private route: ActivatedRoute,
    private inspection: InspectionService,
    private router: Router,
    private toastCtrl: ToastController,
    private auth: Auth,
    private navService: NavService,
    private platform: Platform
  ) {}
  ngOnInit() {
    // Pull vanType and vanNumber out of the URL
    this.vanType = this.route.snapshot.paramMap.get('vanType')!;
    this.vanNumber = this.route.snapshot.paramMap.get('vanNumber')!;
    
    // Get vanId from query params (passed from van selection)
    this.vanId = this.route.snapshot.queryParamMap.get('vanId') || '';
    
    // Check if we're returning to this page and clear photos
    this.checkForReturnNavigation();
  }

  private checkForReturnNavigation() {
    // Check if we have any photos and clear them when returning to the page
    const hasPhotos = Object.values(this.photos).some(photo => photo !== null);
    if (hasPhotos) {
      console.log('Returning to photo capture page - clearing existing photos');
      this.clearAllPhotos();
    }
  }

  ionViewWillLeave() {
    // Clear photos when leaving the page
    console.log('Leaving photo capture page - clearing photos');
    console.log('Current URL:', window.location.pathname);
    console.log('Navigation history:', this.navService);
    this.clearAllPhotos();
  }

  ngOnDestroy() {
    // Component cleanup
  }

  private clearAllPhotos() {
    console.log('Clearing all photos');
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
    console.log('takePhoto called for side:', side);
    this.currentSide = side;
    this.showCamera = true;
    console.log('showCamera set to:', this.showCamera);
    console.log('currentSide set to:', this.currentSide);
  }

  /** Handles photo captured from camera component */
  onPhotoCaptured(photo: string) {
    console.log('onPhotoCaptured called for side:', this.currentSide);
    this.photos[this.currentSide] = photo;
    this.showCamera = false;
    this.currentSide = '';
    console.log('showCamera set to false, camera hidden');
  }

  /** Handles camera cancellation */
  onCameraCancelled() {
    console.log('onCameraCancelled called');
    this.showCamera = false;
    this.currentSide = '';
    console.log('showCamera set to false, camera hidden');
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
    console.log('runtime bucket =', getApp().options.storageBucket);
    console.log('uid at upload:', this.auth.currentUser?.uid);
    console.log('auth state:', this.auth.currentUser);
    
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
        console.log(`Uploading ${side} photo...`);
        const data = this.photos[side]!;
        try {
          urls[side] = await this.inspection.uploadPhoto(
            this.vanType,
            this.vanNumber,
            side,
            data
          );
          console.log(`${side} photo uploaded successfully:`, urls[side]);
        } catch (uploadError) {
          console.error(`Failed to upload ${side} photo:`, uploadError);
          const errorMessage = uploadError instanceof Error ? uploadError.message : String(uploadError);
          throw new Error(`Failed to upload ${side} photo: ${errorMessage}`);
        }
      }

      // 2. Save the inspection (photos) and grab its new Firestore ID
      console.log('Saving inspection to Firestore...');
      const inspectionId = await this.inspection.saveInspection(
        this.vanType,
        this.vanNumber,
        urls
      );
      console.log('Inspection saved with ID:', inspectionId);

      // 3. Hide the spinner
      this.isLoading = false;

      // 4. Show success toast
      await this.showSuccessToast();
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
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack
      });
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
