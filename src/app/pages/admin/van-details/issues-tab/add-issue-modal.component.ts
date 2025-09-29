import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';

interface IssueCategory {
  name: string;
  subcategories?: string[];
}

interface NewIssue {
  category: string;
  subcategory?: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

@Component({
  selector: 'app-add-issue-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Add New Issue</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">
            <ion-icon name="close"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <form (ngSubmit)="saveIssue()" #issueForm="ngForm">
        
        <!-- Category Selection -->
        <ion-item>
          <ion-label position="stacked">Category *</ion-label>
          <ion-select 
            [(ngModel)]="newIssue.category" 
            name="category"
            placeholder="Select a category"
            required>
            <ion-select-option 
              *ngFor="let category of issueCategories" 
              [value]="category.name">
              {{ category.name }}
            </ion-select-option>
          </ion-select>
        </ion-item>

        <!-- Subcategory Selection (if available) -->
        <ion-item *ngIf="selectedCategory?.subcategories?.length">
          <ion-label position="stacked">Subcategory</ion-label>
          <ion-select 
            [(ngModel)]="newIssue.subcategory" 
            name="subcategory"
            placeholder="Select a subcategory">
            <ion-select-option 
              *ngFor="let subcategory of selectedCategory.subcategories" 
              [value]="subcategory">
              {{ subcategory }}
            </ion-select-option>
          </ion-select>
        </ion-item>

        <!-- Severity Selection -->
        <ion-item>
          <ion-label position="stacked">Severity *</ion-label>
          <ion-select 
            [(ngModel)]="newIssue.severity" 
            name="severity"
            placeholder="Select severity level"
            required>
            <ion-select-option value="low">Low</ion-select-option>
            <ion-select-option value="medium">Medium</ion-select-option>
            <ion-select-option value="high">High</ion-select-option>
            <ion-select-option value="critical">Critical</ion-select-option>
          </ion-select>
        </ion-item>

        <!-- Description -->
        <ion-item>
          <ion-label position="stacked">Description *</ion-label>
          <ion-textarea
            [(ngModel)]="newIssue.description"
            name="description"
            placeholder="Describe the issue in detail..."
            rows="4"
            required>
          </ion-textarea>
        </ion-item>

        <!-- Action Buttons -->
        <div class="modal-actions">
          <ion-button 
            expand="block" 
            type="submit"
            [disabled]="!issueForm.form.valid"
            class="save-button">
            <ion-icon name="save" slot="start"></ion-icon>
            Save Issue
          </ion-button>
          
          <ion-button 
            expand="block" 
            fill="clear" 
            color="medium"
            (click)="dismiss()"
            class="cancel-button">
            Cancel
          </ion-button>
        </div>

      </form>
    </ion-content>
  `,
  styles: [`
    .modal-actions {
      margin-top: 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .save-button {
      --height: 48px;
      font-weight: 600;
    }

    .cancel-button {
      --height: 40px;
    }

    ion-item {
      --padding-start: 0;
      --inner-padding-end: 0;
      margin-bottom: 16px;
    }

    ion-label[position="stacked"] {
      font-weight: 600;
      color: var(--ion-color-dark);
      margin-bottom: 8px;
    }

    ion-select,
    ion-textarea {
      --padding-start: 12px;
      --padding-end: 12px;
      border: 1px solid var(--ion-color-light-shade);
      border-radius: 8px;
      background: var(--ion-color-light);
    }

    ion-select:focus-within,
    ion-textarea:focus-within {
      border-color: var(--ion-color-primary);
      box-shadow: 0 0 0 2px var(--ion-color-primary-tint);
    }
  `]
})
export class AddIssueModalComponent {
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);

  newIssue: NewIssue = {
    category: '',
    subcategory: '',
    description: '',
    severity: 'medium'
  };

  // Categories from user-review page
  issueCategories: IssueCategory[] = [
    {
      name: 'Powertrain',
      subcategories: [
        'Engine',
        'Transmission',
        'Differential',
        'Drivetrain'
      ]
    },
    {
      name: 'Chassis & Running Gear',
      subcategories: [
        'Suspension',
        'Brakes',
        'Steering',
        'Axles',
        'Wheels & Tires'
      ]
    },
    {
      name: 'Electrical & Electronics',
      subcategories: [
        'Battery / Charging',
        'Wiring Harness',
        'Lighting',
        'Sensors & Gauges',
        'Control Modules'
      ]
    },
    {
      name: 'HVAC & Comfort',
      subcategories: [
        'Air Conditioning',
        'Heating',
        'Ventilation',
        'Thermostat / Controls',
        'Insulation & Seals'
      ]
    },
    {
      name: 'Body & Interior',
      subcategories: [
        'Doors & Hinges',
        'Windows & Glass',
        'Exterior Panels',
        'Seats & Upholstery',
        'Dashboard & Trim'
      ]
    },
    {
      name: 'Safety & Security',
      subcategories: [
        'Seat Belts & Airbags',
        'Alarm / Immobilizer',
        'Cameras & Sensors',
        'Emergency Lighting',
        'Fire Extinguisher'
      ]
    },
    {
      name: 'Fluids & Maintenance',
      subcategories: [
        'Engine Oil & Filter',
        'Coolant / Radiator',
        'Brake Fluid',
        'Transmission Fluid',
        'Fuel System',
        'Air / Cabin Filters'
      ]
    }
  ];

  get selectedCategory(): IssueCategory | undefined {
    return this.issueCategories.find(cat => cat.name === this.newIssue.category);
  }

  async saveIssue() {
    if (!this.newIssue.category || !this.newIssue.description) {
      const toast = await this.toastCtrl.create({
        message: 'Please fill in all required fields',
        duration: 2000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    // Create the issue data
    const issueData = {
      ...this.newIssue,
      id: Date.now().toString(), // Simple ID generation
      title: this.generateTitle(),
      status: 'open' as const,
      reportedDate: new Date(),
      reportedBy: 'Admin User' // TODO: Get actual user
    };

    // Dismiss modal and return the issue data
    await this.modalCtrl.dismiss(issueData, 'saved');
  }

  async dismiss() {
    await this.modalCtrl.dismiss(null, 'cancelled');
  }

  private generateTitle(): string {
    const category = this.newIssue.category;
    const subcategory = this.newIssue.subcategory;
    
    if (subcategory) {
      return `${subcategory} Issue - ${category}`;
    }
    
    return `${category} Issue`;
  }
}
