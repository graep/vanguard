import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonGrid, IonRow, IonCol, IonButton, IonImg, IonLoading, ToastController } from '@ionic/angular/standalone';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { InspectionService } from 'src/app/services/inspection.service';

@Component({
  selector: 'app-photo-capture',
  templateUrl: './photo-capture.page.html',
  styleUrls: ['./photo-capture.page.scss'],
  standalone: true,
  imports: [IonLoading, IonImg, IonButton, IonCol, IonRow, IonGrid, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule]
})
export class PhotoCapturePage implements OnInit {
  // Route params
  vanType!: string;
  vanNumber!: string;

  // The four sides we need to capture
  sides = ['front', 'rear', 'left', 'right'];

  // Holds the URI for each side’s photo
  photos: Record<string, string | null> = {
    front: null,
    rear: null,
    left: null,
    right: null
  };

  isLoading = false;

  get allPhotosTaken(): boolean {
  return this.sides.every(side => !!this.photos[side]);
}

  constructor(
    private route: ActivatedRoute,
    private inspection: InspectionService,
    private router: Router,
    private toastCtrl: ToastController
  ) {}
  ngOnInit() {
    // Pull vanType and vanNumber out of the URL
    this.vanType   = this.route.snapshot.paramMap.get('vanType')!;
    this.vanNumber = this.route.snapshot.paramMap.get('vanNumber')!;
  }

  /** Launches the camera to take (or retake) a photo for the given side */
  async takePhoto(side: string) {
  console.log('📷 ask for photo of', side);
  try {
    const photo = await Camera.getPhoto({
      quality: 80,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      promptLabelHeader: `Capture ${side}`
    });
    console.log('📥 got photo.dataUrl', photo.dataUrl?.slice(0,30) + '…');
    this.photos[side] = photo.dataUrl!;
  } catch (err) {
    console.error('Unable to take photo!', err);
  }
  console.log('📦 photos map now', this.photos);
}

  private async showSuccessToast() {
    const toast = await this.toastCtrl.create({
      message: 'Inspection submitted successfully!',
      color: 'success',
      duration: 2000,
      position: 'top'
    });
    await toast.present();
  }

async submitAll() {
  this.isLoading = true;
  try {
    const urls: Record<string,string> = {};
    for (const side of this.sides) {
      const data = this.photos[side]!;
      urls[side] = await this.inspection.uploadPhoto(
        this.vanType,
        this.vanNumber,
        side,
        data
      );
    }

    await this.inspection.saveInspection(this.vanType, this.vanNumber, urls);

    // ← hide spinner here
    this.isLoading = false;

    // ← then toast & navigate
    await this.showSuccessToast();
    await this.router.navigateByUrl('/user-review', { replaceUrl: true });

  } catch (e) {
    console.error('Upload or save failed', e);
    this.isLoading = false;        // ensure spinner hides on error too
  }
}
}