// src/app/pages/van-detail/van-detail.page.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { Van } from '../../../models/van.model';
import { InspectionService } from '../../../services/inspection.service';
import { IssuesTabComponent } from "./issues-tab/issues-tab.component";
import { MaintenanceTabComponent } from "./maintenance-tab/maintenance-tab.component";
import { NotesTabComponent } from "./notes-tab/notes-tab.component";
import { DriversTabComponent } from "./drivers-tab/drivers-tab.component";
import { BreadcrumbItem, BreadcrumbComponent } from '../../../components/breadcrumb/breadcrumb.component';


@Component({
  selector: 'app-van-details',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, IssuesTabComponent, MaintenanceTabComponent, NotesTabComponent, DriversTabComponent, BreadcrumbComponent],
  templateUrl: './van-details.page.html',
  styleUrls: ['./van-details.page.scss']
})
export class VanDetailsPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private firestore = inject(Firestore);
  private storage = inject(Storage);
  private inspectionService = inject(InspectionService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  van: Van | null = null;
  loading = true;
  errorMsg = '';
  activeTab: string = 'notes';
  tabs = [
    { id: 'notes', label: 'Notes', icon: 'document-text' },
    { id: 'issues', label: 'Issues', icon: 'warning' },
    { id: 'maintenance', label: 'Maintenance', icon: 'build' },
    { id: 'drivers', label: 'Drivers', icon: 'person' }
  ];
  latestInspectionId: string | null = null;
  breadcrumbItems: BreadcrumbItem[] = [];
  
  // Van type display mapping
  vanTypeLabels: Record<string, string> = {
    'EDV': 'Electric Delivery Van',
    'CDV': 'Cargo Delivery Van',
    'LMR': 'Large Mail Route'
  };

  async ngOnInit() {
    this.loading = true;
    
    const vanId = this.route.snapshot.paramMap.get('id');
    if (!vanId) {
      this.errorMsg = 'No van ID provided';
      this.loading = false;
      return;
    }

    try {
      await this.loadVanData(vanId);
      if (this.van) {
        await this.loadLatestInspection();
        // Set breadcrumb items
        this.breadcrumbItems = [
          { label: 'Dashboard', url: '/admin', icon: 'home' },
          { label: `${this.van.type.toUpperCase()} ${this.van.number}`, icon: 'car' }
        ];
      }
    } catch (error: any) {
      this.errorMsg = error.message || 'Failed to load van data';
    } finally {
      this.loading = false;
    }
  }

  private async loadVanData(vanId: string) {
    const vanDocRef = doc(this.firestore, 'vans', vanId);
    const vanDoc = await getDoc(vanDocRef);
    
    if (vanDoc.exists()) {
      this.van = { docId: vanDoc.id, ...vanDoc.data() } as Van;
    } else {
      throw new Error('Van not found');
    }
  }

  private async loadLatestInspection() {
    if (!this.van) return;
    
    try {
      this.latestInspectionId = await this.inspectionService.getLatestInspectionId(
        this.van.type, 
        this.van.number.toString()
      );
    } catch (error: any) {
      // Inspection loading is optional, don't throw error
      console.warn('Could not load latest inspection:', error);
    }
  }

  getVanTypeLabel(): string {
    return this.van ? this.vanTypeLabels[this.van.type.toUpperCase()] || this.van.type : '';
  }

  getVehicleInfo(): string {
    if (!this.van) return '';
    
    const parts: string[] = [];
    if (this.van.year) parts.push(this.van.year.toString());
    if (this.van.make) parts.push(this.van.make);
    if (this.van.model) parts.push(this.van.model);
    
    return parts.length > 0 ? parts.join(' ') : 'Not specified';
  }


  viewDocument(imageUrl: string, title: string) {
    // Open document in a new tab/window for full view
    window.open(imageUrl, '_blank');
  }

  handleRegistrationClick() {
    if (this.van?.registrationInfo?.imageUrl) {
      this.viewDocument(this.van.registrationInfo.imageUrl, 'Registration Document');
    } else {
      this.addRegistration();
    }
  }

  handleInsuranceClick() {
    if (this.van?.insuranceInfo?.imageUrl) {
      this.viewDocument(this.van.insuranceInfo.imageUrl, 'Insurance Document');
    } else {
      this.addInsurance();
    }
  }

  async addRegistration() {
    if (!this.van) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png';
    input.onchange = async (event: any) => {
      const file = event.target.files[0];
      if (file) {
        await this.uploadDocument(file, 'registration');
      }
    };
    input.click();
  }

  async addInsurance() {
    if (!this.van) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png';
    input.onchange = async (event: any) => {
      const file = event.target.files[0];
      if (file) {
        await this.uploadDocument(file, 'insurance');
      }
    };
    input.click();
  }

  async uploadDocument(file: File, type: 'registration' | 'insurance') {
    if (!this.van) return;

    const toastLoading = await this.toastCtrl.create({
      message: 'Uploading document...',
      duration: 2000,
      color: 'info'
    });
    toastLoading.present();

    try {
      // Create a unique filename
      const timestamp = Date.now();
      const extension = file.name.split('.').pop();
      const filename = `${this.van.type}_${this.van.number}_${type}_${timestamp}.${extension}`;
      const filePath = `van-documents/${this.van.docId}/${filename}`;

      // Upload file to Firebase Storage
      const storageRef = ref(this.storage, filePath);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Update Firestore with the document URL
      const vanDocRef = doc(this.firestore, 'vans', this.van.docId);
      const updateData: any = {};
      
      if (type === 'registration') {
        updateData['registrationInfo'] = {
          imageUrl: downloadURL,
          uploadedAt: new Date()
        };
      } else {
        updateData['insuranceInfo'] = {
          imageUrl: downloadURL,
          uploadedAt: new Date()
        };
      }

      await setDoc(vanDocRef, updateData, { merge: true });

      // Update local van object
      if (type === 'registration') {
        this.van.registrationInfo = { imageUrl: downloadURL };
      } else {
        this.van.insuranceInfo = { imageUrl: downloadURL };
      }

      toastLoading.dismiss();

      const toast = await this.toastCtrl.create({
        message: `${type === 'registration' ? 'Registration' : 'Insurance'} document uploaded successfully`,
        duration: 2000,
        color: 'success'
      });
      toast.present();

    } catch (error: any) {
      console.error('Error uploading document:', error);
      toastLoading.dismiss();

      const errorMessage = error.message || 'Failed to upload document. Check console for details.';
      const toast = await this.toastCtrl.create({
        message: errorMessage,
        duration: 3000,
        color: 'danger',
        buttons: [
          {
            text: 'Dismiss',
            role: 'cancel'
          }
        ]
      });
      toast.present();
    }
  }

  getVanImage(): string {
    if (!this.van) return '';
    
    // Use custom image if available, otherwise fall back to type-based image
    if (this.van.imageUrl) {
      return this.van.imageUrl;
    }
    
    // For LMR vans, use dynamic image based on make
    if (this.van.type.toUpperCase() === 'LMR') {
      return this.getLmrImage(this.van);
    }
    
    // Default images based on van type for EDV and CDV
    const vanType = this.van.type.toUpperCase();
    return `assets/${vanType}.jpg`;
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

  getStatusColor(): string {
    return this.van?.isGrounded ? 'danger' : 'success';
  }

  getStatusText(): string {
    return this.van?.isGrounded ? 'Grounded' : 'Active';
  }

  getStatusIcon(): string {
    return this.van?.isGrounded ? 'warning' : 'checkmark-circle';
  }

  async viewLatestInspection() {
    if (!this.latestInspectionId) {
      const toast = await this.toastCtrl.create({
        message: 'No inspection reports available for this van',
        duration: 2000,
        color: 'warning'
      });
      toast.present();
      return;
    }

    this.router.navigate(['/van-report', this.latestInspectionId]);
  }

  async startInspection() {
    if (!this.van) return;
    
    this.router.navigate(['/photo-capture', this.van.type, this.van.number]);
  }

  async toggleGroundedStatus() {
    if (!this.van) return;

    const alert = await this.alertCtrl.create({
      header: 'Change Van Status',
      message: `Are you sure you want to ${this.van.isGrounded ? 'activate' : 'ground'} this van?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Confirm',
          handler: async () => {
            try {
              // Update in Firebase
              const vanDocRef = doc(this.firestore, 'vans', this.van!.docId);
              const { setDoc } = await import('@angular/fire/firestore');
              
              await setDoc(vanDocRef, {
                ...this.van,
                isGrounded: !this.van!.isGrounded
              }, { merge: true });

              // Update local state
              this.van!.isGrounded = !this.van!.isGrounded;

              const toast = await this.toastCtrl.create({
                message: `Van ${this.van!.isGrounded ? 'grounded' : 'activated'} successfully`,
                duration: 2000,
                color: 'success'
              });
              toast.present();

            } catch (error: any) {
              const toast = await this.toastCtrl.create({
                message: 'Failed to update van status',
                duration: 2000,
                color: 'danger'
              });
              toast.present();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  selectTab(tabId: string): void {
    this.activeTab = tabId;
  }

  goBack() {
    this.router.navigate(['/admin']);
  }
}