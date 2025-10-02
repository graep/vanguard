import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonGrid,
  IonRow,
  IonCol,
  IonButton,
  IonImg,
  IonLoading,
  ToastController,
  IonBackButton,
  IonButtons, IonIcon } from '@ionic/angular/standalone';
import {
  Camera,
  CameraResultType,
  CameraSource,
  Photo,
} from '@capacitor/camera';
import { InspectionService } from 'src/app/services/inspection.service';
import { Auth } from '@angular/fire/auth';
import { getApp } from '@angular/fire/app';
import { AppHeaderComponent } from '@app/components/app-header/app-header.component';
import { NavService } from '@app/services/nav.service';

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
    AppHeaderComponent
  ],
})
export class PhotoCapturePage implements OnInit {
  vanType!: string;
  vanNumber!: string;

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

  get allPhotosTaken(): boolean {
    return this.sides.every((side) => !!this.photos[side]);
  }

  constructor(
    private route: ActivatedRoute,
    private inspection: InspectionService,
    private router: Router,
    private toastCtrl: ToastController,
    private auth: Auth,
    private navService: NavService
  ) {}
  ngOnInit() {
    // Pull vanType and vanNumber out of the URL
    this.vanType = this.route.snapshot.paramMap.get('vanType')!;
    this.vanNumber = this.route.snapshot.paramMap.get('vanNumber')!;
  }

  /** Launches the camera to take (or retake) a photo for the given side */
  async takePhoto(side: string) {
    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        promptLabelHeader: `Capture ${side}`,
      });
      this.photos[side] = photo.dataUrl!;
    } catch (err) {
      console.error('Unable to take photo!', err);
    }
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
