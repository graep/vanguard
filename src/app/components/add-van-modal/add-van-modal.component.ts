import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, LoadingController, ToastController } from '@ionic/angular';
import { Van } from '../../models/van.model';
import { VanService } from '../../services/van.service';

@Component({
  selector: 'app-add-van-modal',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Add New Van</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">
            <ion-icon name="close"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <form #vanForm="ngForm" (ngSubmit)="onSubmit()">
        <ion-list>
          <!-- Van Type -->
          <ion-item class="first-field">
            <ion-select 
              [(ngModel)]="vanData.type" 
              name="type" 
              placeholder="Van type *"
              required>
              <ion-select-option value="EDV">EDV</ion-select-option>
              <ion-select-option value="CDV">CDV</ion-select-option>
              <ion-select-option value="Rental">Rental</ion-select-option>
            </ion-select>
          </ion-item>

          <!-- Van Number -->
          <ion-item>
            <ion-input 
              type="text" 
              [(ngModel)]="vanNumberString" 
              name="number" 
              placeholder="Van number *"
              required>
            </ion-input>
          </ion-item>

          <!-- VIN -->
          <ion-item>
            <ion-input 
              type="text" 
              [(ngModel)]="vanData.VIN" 
              name="VIN" 
              placeholder="VIN *"
              required>
            </ion-input>
          </ion-item>

          <!-- Status -->
          <ion-item>
            <ion-toggle 
              [(ngModel)]="isActive" 
              name="isActive"
              (ionChange)="onStatusChange($event)">
            </ion-toggle>
            <ion-label slot="end" class="status-label">{{ isActive ? 'Active' : 'Grounded' }}</ion-label>
          </ion-item>

          <!-- Vehicle Information Section -->
          <ion-item class="section-header">
            <ion-label>Vehicle Information</ion-label>
          </ion-item>

          <!-- Year -->
          <ion-item>
            <ion-input 
              type="number" 
              [(ngModel)]="vanData.year" 
              name="year" 
              placeholder="Year"
              min="1900"
              max="2030">
            </ion-input>
          </ion-item>

          <!-- Make -->
          <ion-item>
            <ion-input 
              type="text" 
              [(ngModel)]="vanData.make" 
              name="make" 
              placeholder="Make">
            </ion-input>
          </ion-item>

          <!-- Model -->
          <ion-item>
            <ion-input 
              type="text" 
              [(ngModel)]="vanData.model" 
              name="model" 
              placeholder="Model">
            </ion-input>
          </ion-item>

          <!-- License Plate -->
          <ion-item>
            <ion-input 
              type="text" 
              [(ngModel)]="vanData.licensePlate" 
              name="licensePlate" 
              placeholder="License Plate">
            </ion-input>
          </ion-item>

          <!-- Registration Image Upload -->
          <ion-item>
            <ion-label>Registration Document</ion-label>
            <input 
              type="file" 
              accept="image/*" 
              (change)="onRegistrationFileSelected($event)"
              #registrationFileInput
              style="display: none;">
            <ion-button 
              fill="outline" 
              (click)="registrationFileInput.click()"
              slot="end">
              <ion-icon name="camera" slot="start"></ion-icon>
              {{ vanData.registrationInfo!.imageUrl ? 'Change' : 'Upload' }}
            </ion-button>
          </ion-item>

          <!-- Registration Image Preview -->
          <ion-item *ngIf="vanData.registrationInfo!.imageUrl">
            <div class="image-preview-container">
              <img 
                [src]="vanData.registrationInfo!.imageUrl" 
                alt="Registration document"
                class="document-preview"
                (click)="viewDocument(vanData.registrationInfo!.imageUrl!, 'Registration Document')">
              <ion-button 
                fill="clear" 
                color="danger" 
                size="small"
                class="delete-image-btn"
                (click)="removeRegistrationImage()">
                <ion-icon name="trash" slot="icon-only"></ion-icon>
              </ion-button>
            </div>
          </ion-item>

          <!-- Insurance Image Upload -->
          <ion-item>
            <ion-label>Insurance Document</ion-label>
            <input 
              type="file" 
              accept="image/*" 
              (change)="onInsuranceFileSelected($event)"
              #insuranceFileInput
              style="display: none;">
            <ion-button 
              fill="outline" 
              (click)="insuranceFileInput.click()"
              slot="end">
              <ion-icon name="camera" slot="start"></ion-icon>
              {{ vanData.insuranceInfo!.imageUrl ? 'Change' : 'Upload' }}
            </ion-button>
          </ion-item>

          <!-- Insurance Image Preview -->
          <ion-item *ngIf="vanData.insuranceInfo!.imageUrl">
            <div class="image-preview-container">
              <img 
                [src]="vanData.insuranceInfo!.imageUrl" 
                alt="Insurance document"
                class="document-preview"
                (click)="viewDocument(vanData.insuranceInfo!.imageUrl!, 'Insurance Document')">
              <ion-button 
                fill="clear" 
                color="danger" 
                size="small"
                class="delete-image-btn"
                (click)="removeInsuranceImage()">
                <ion-icon name="trash" slot="icon-only"></ion-icon>
              </ion-button>
            </div>
          </ion-item>

          <!-- Notes -->
          <ion-item class="notes-section">
            <ion-textarea 
              [(ngModel)]="vanData.notes" 
              name="notes" 
              placeholder="Notes"
              rows="3">
            </ion-textarea>
          </ion-item>

          <!-- Image URL -->
          <ion-item>
            <ion-input 
              type="url" 
              [(ngModel)]="vanData.imageUrl" 
              name="imageUrl" 
              placeholder="Image URL">
            </ion-input>
          </ion-item>
        </ion-list>

        <div class="ion-padding">
          <ion-button 
            expand="block" 
            type="submit" 
            [disabled]="!vanForm.form.valid || isSubmitting">
            <ion-spinner *ngIf="isSubmitting" name="crescent"></ion-spinner>
            <span *ngIf="!isSubmitting">Add Van</span>
          </ion-button>
        </div>
      </form>
    </ion-content>
  `,
  styles: [`
    ion-content {
      --background: var(--ion-color-light);
    }

    ion-list {
      background: transparent;
    }

    ion-item {
      --background: var(--ion-color-light);
      --border-color: var(--ion-color-light-shade);
      margin-bottom: 8px;
      border-radius: 16px;
    }


    ion-input, ion-textarea, ion-select {
      margin-bottom: 8px;
      border-radius: 8px;
      overflow: hidden;
      --padding-start: 12px;
      --inner-border-radius: 8px;
      --background: rgba(255, 255, 255, 0.28);
      --color: var(--ion-text-color);
      position: relative;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      --border-width: 2px;
    }

    ion-input:focus-within,
    ion-textarea:focus-within,
    ion-select:focus-within {
      transform: translateY(-2px);
      --background: rgba(255, 255, 255, 0.35);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
      border-radius: 8px;
      z-index: 1000;
      position: relative;
      margin-top: 4px;
      margin-bottom: 4px;
    }

    ion-input::after,
    ion-textarea::after,
    ion-select::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      width: 0;
      height: 2px;
      background: var(--ion-color-primary);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      transform: translateX(-50%);
    }

    ion-input:focus-within::after,
    ion-textarea:focus-within::after,
    ion-select:focus-within::after {
      width: 100%;
    }

    ion-select {
      --background: rgba(255, 255, 255, 0.28);
      --background-hover: rgba(255, 255, 255, 0.35);
      --background-focused: rgba(255, 255, 255, 0.35);
      --background-activated: rgba(255, 255, 255, 0.35);
      --border-color: transparent;
      --border-color-focused: transparent;
      --border-color-hover: transparent;
      --border-color-activated: transparent;
      --border-style: none;
      --border-width: 0;
      --outline: none;
      --outline-color: transparent;
      --outline-style: none;
      --outline-width: 0;
      --box-shadow: none;
      --focus-ring: none;
      --focus-ring-color: transparent;
      --focus-ring-style: none;
      --focus-ring-width: 0;
      --highlight-color: transparent;
      --highlight-color-focused: transparent;
      --highlight-color-activated: transparent;
      --ripple-color: transparent;
      --ripple-opacity: 0;
      --color: var(--ion-text-color);
      --color-focused: var(--ion-text-color);
      --color-hover: var(--ion-text-color);
      --color-activated: var(--ion-text-color);
      --icon-color: var(--ion-color-medium);
      --icon-color-focused: var(--ion-color-medium);
      --icon-color-hover: var(--ion-color-medium);
      --icon-color-activated: var(--ion-color-medium);
      --border-radius: 8px;
      --padding-start: 12px;
      --padding-end: 12px;
      --min-height: 48px;
      --height: 48px;
    }

    ion-select:hover,
    ion-select:active,
    ion-select:focus,
    ion-select:focus-visible,
    ion-select:focus-within {
      --background: rgba(255, 255, 255, 0.35) !important;
      --background-hover: rgba(255, 255, 255, 0.35) !important;
      --background-focused: rgba(255, 255, 255, 0.35) !important;
      --background-activated: rgba(255, 255, 255, 0.35) !important;
      --border-color: transparent !important;
      --border-color-focused: transparent !important;
      --border-color-hover: transparent !important;
      --border-color-activated: transparent !important;
      --border-style: none !important;
      --border-width: 0 !important;
      --outline: none !important;
      --outline-color: transparent !important;
      --outline-style: none !important;
      --outline-width: 0 !important;
      --box-shadow: none !important;
      --focus-ring: none !important;
      --focus-ring-color: transparent !important;
      --focus-ring-style: none !important;
      --focus-ring-width: 0 !important;
      --highlight-color: transparent !important;
      --highlight-color-focused: transparent !important;
      --highlight-color-activated: transparent !important;
      --ripple-color: transparent !important;
    }

    /* Target all internal elements */
    ion-select *,
    ion-select *:before,
    ion-select *:after {
      outline: none !important;
      box-shadow: none !important;
      border: none !important;
      border-color: transparent !important;
      border-style: none !important;
      border-width: 0 !important;
    }

    /* Use ::ng-deep to override Ionic's internal styles */
    ::ng-deep ion-select {
      outline: none !important;
      box-shadow: none !important;
      border: none !important;
      border-color: transparent !important;
      border-style: none !important;
      border-width: 0 !important;
    }

    ::ng-deep ion-select *,
    ::ng-deep ion-select *:before,
    ::ng-deep ion-select *:after {
      outline: none !important;
      box-shadow: none !important;
      border: none !important;
      border-color: transparent !important;
      border-style: none !important;
      border-width: 0 !important;
    }

    ::ng-deep ion-select:hover,
    ::ng-deep ion-select:active,
    ::ng-deep ion-select:focus,
    ::ng-deep ion-select:focus-visible,
    ::ng-deep ion-select:focus-within {
      outline: none !important;
      box-shadow: none !important;
      border: none !important;
      border-color: transparent !important;
      border-style: none !important;
      border-width: 0 !important;
    }

    ion-button {
      margin-top: 16px;
      --border-radius: 16px;
    }

    ion-button[disabled] {
      opacity: 0.6;
    }

    ion-spinner {
      margin-right: 8px;
    }

    .status-label {
      min-width: 80px;
      text-align: left;
    }

    .section-header {
      margin-top: 24px;
    }

    .first-field {
      margin-top: 16px;
    }

    .notes-section {
      margin-top: 24px;
    }

    .image-preview-container {
      position: relative;
      display: flex;
      align-items: center;
      margin: 8px 0 8px 20px;
      gap: 12px;
    }

    .document-preview {
      max-width: 120px;
      max-height: 120px;
      object-fit: cover;
      border-radius: 8px;
      border: 2px solid var(--ion-color-light);
      cursor: pointer;
      transition: all 0.3s ease;
      
      &:hover {
        border-color: var(--ion-color-primary);
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
    }

    .delete-image-btn {
      --padding-start: 8px;
      --padding-end: 8px;
      --padding-top: 8px;
      --padding-bottom: 8px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      --background: transparent;
      --color: var(--ion-color-danger);
      --border-color: var(--ion-color-danger);
      --border-width: 2px;
      --border-style: solid;
      flex-shrink: 0;
      
      ion-icon {
        font-size: 16px;
      }
      
      &:hover {
        --background: var(--ion-color-danger);
        --color: white;
        transform: scale(1.1);
      }
    }
  `]
})
export class AddVanModalComponent {
  @Input() existingVans: Van[] = [];
  @Output() vanAdded = new EventEmitter<Van>();

  vanData: Omit<Van, 'docId'> = {
    VIN: '',
    type: '', // Start empty to show placeholder
    number: 0,
    isGrounded: false,
    notes: '',
    imageUrl: '',
    // Vehicle Information
    year: undefined,
    make: '',
    model: '',
    licensePlate: '',
    // Registration & Insurance
    registrationInfo: {
      imageUrl: '',
      registrationNumber: '',
      registrationExpiry: '',
      registrationState: ''
    },
    insuranceInfo: {
      imageUrl: '',
      policyNumber: '',
      insuranceProvider: '',
      coverageExpiry: ''
    }
  };

  vanNumberString = ''; // String version for the input field
  isActive = true; // Default to active (not grounded)
  isSubmitting = false;

  private modalCtrl = inject(ModalController);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);
  private vanService = inject(VanService);

  ngOnInit() {
    // Keep fields empty to show placeholders
  }

  onTypeChange() {
    // Update van number when type changes
    if (this.vanData.type && this.existingVans.length > 0) {
      this.vanData.number = this.vanService.getNextVanNumber(this.existingVans, this.vanData.type);
    }
  }

  onStatusChange(event: any) {
    // Update isGrounded based on toggle state
    this.vanData.isGrounded = !event.detail.checked;
  }

  onRegistrationFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Create a preview URL for the image
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.vanData.registrationInfo!.imageUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onInsuranceFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Create a preview URL for the image
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.vanData.insuranceInfo!.imageUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeRegistrationImage() {
    this.vanData.registrationInfo!.imageUrl = '';
  }

  removeInsuranceImage() {
    this.vanData.insuranceInfo!.imageUrl = '';
  }

  viewDocument(imageUrl: string, title: string) {
    // Create a modal to display the full-size image
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      cursor: pointer;
    `;
    
    const img = document.createElement('img');
    img.src = imageUrl;
    img.style.cssText = `
      max-width: 90%;
      max-height: 90%;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    `;
    
    const closeBtn = document.createElement('div');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `
      position: absolute;
      top: 20px;
      right: 30px;
      color: white;
      font-size: 30px;
      cursor: pointer;
      z-index: 10001;
    `;
    
    modal.appendChild(img);
    modal.appendChild(closeBtn);
    document.body.appendChild(modal);
    
    // Close modal when clicking anywhere
    modal.onclick = () => {
      document.body.removeChild(modal);
    };
    
    // Close modal when clicking close button
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      document.body.removeChild(modal);
    };
    
    // Close modal with Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        document.body.removeChild(modal);
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  async onSubmit() {
    if (this.isSubmitting) return;

    this.isSubmitting = true;

    try {
      // Convert string to number for van number
      this.vanData.number = parseInt(this.vanNumberString) || 0;
      
      // Add van to Firestore
      const vanId = await this.vanService.addVan(this.vanData);
      
      // Create the complete van object
      const newVan: Van = {
        docId: vanId,
        ...this.vanData
      };

      // Show success message
      const toast = await this.toastCtrl.create({
        message: `${this.vanData.type} van #${this.vanData.number} added successfully!`,
        duration: 3000,
        color: 'success',
        position: 'top'
      });
      await toast.present();

      // Emit the new van and close modal
      this.vanAdded.emit(newVan);
      this.dismiss();

    } catch (error) {
      console.error('Error adding van:', error);

      // Show error message
      const toast = await this.toastCtrl.create({
        message: 'Failed to add van. Please try again.',
        duration: 4000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    } finally {
      this.isSubmitting = false;
    }
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}
