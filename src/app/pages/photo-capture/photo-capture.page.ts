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
    private auth: Auth
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
    this.isLoading = true;
    try {
      // 1. Upload all four photos and collect URLs
      const urls: Record<string, string> = {};
      for (const side of this.sides) {
        const data = this.photos[side]!;
        urls[side] = await this.inspection.uploadPhoto(
          this.vanType,
          this.vanNumber,
          side,
          data
        );
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
      this.isLoading = false;
      const errToast = await this.toastCtrl.create({
        message: 'Could not upload photos. Try again.',
        color: 'danger',
        duration: 2000,
        position: 'top',
      });
      await errToast.present();
    }
  }
  async logout() {
    await this.auth.signOut();
    this.router.navigate(['/login']);
  }
}
