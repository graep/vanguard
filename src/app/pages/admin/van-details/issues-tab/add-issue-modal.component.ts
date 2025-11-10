import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';

interface IssueCategory {
  name: string;
  subcategories?: string[];
  severity: 'high' | 'medium' | 'low';
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

    <ion-content>
      <form (ngSubmit)="saveIssue()" #issueForm="ngForm">
        
        <!-- Category Selection Section -->
        <div class="form-section">
          <div class="section-title">Issue Details</div>
          
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
                *ngFor="let subcategory of selectedCategory?.subcategories" 
                [value]="subcategory">
                {{ subcategory }}
              </ion-select-option>
            </ion-select>
          </ion-item>

          <!-- Severity Display (Auto-set based on category) -->
          <div *ngIf="selectedCategory" class="severity-display">
            <ion-label position="stacked">Severity Level</ion-label>
            <ion-chip [color]="getSeverityColor(selectedCategory.severity)" class="severity-chip">
              <ion-icon [name]="getSeverityIcon(selectedCategory.severity)"></ion-icon>
              <ion-label>{{ getSeverityLabel(selectedCategory.severity) }}</ion-label>
            </ion-chip>
          </div>
        </div>

        <!-- Description Section -->
        <div class="form-section">
          <div class="section-title">Description</div>
          
          <ion-item>
            <ion-label position="stacked">Issue Description *</ion-label>
            <ion-textarea
              [(ngModel)]="newIssue.description"
              name="description"
              placeholder="Describe the issue in detail. Include any relevant information about when it occurs, symptoms, or impact..."
              rows="4"
              required>
            </ion-textarea>
          </ion-item>
        </div>

        <!-- Action Buttons -->
        <div class="modal-actions">
          <ion-button 
            expand="block" 
            type="submit"
            [disabled]="!issueForm.form.valid"
            class="save-button">
            <ion-icon name="checkmark-circle" slot="start"></ion-icon>
            Save Issue
          </ion-button>
          
          <ion-button 
            expand="block" 
            fill="clear" 
            color="medium"
            (click)="dismiss()"
            class="cancel-button">
            <ion-icon name="close" slot="start"></ion-icon>
            Cancel
          </ion-button>
        </div>

      </form>
    </ion-content>
  `,
  styles: [`
    ion-header {
      ion-toolbar {
        --background: var(--ion-color-light);
        --color: var(--ion-color-dark);
        
        ion-title {
          font-weight: 600;
          font-size: 1.1rem;
        }
        
        ion-button {
          --color: var(--ion-color-dark);
          --color-hover: var(--ion-color-medium);
          
          &:hover {
            transform: translateY(-2px);
          }
          
          &:active {
            transform: translateY(1px);
          }
        }
      }
    }

    ion-content {
      --background: #1e1e1e;
    }

    form {
      padding: 32px;
      background: #1e1e1e;
      margin: 20px;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .form-section {
      margin-bottom: 32px;
      
      &:last-child {
        margin-bottom: 0;
      }
    }

    .section-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: white;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
      padding-left: 4px;
    }

    ion-item {
      --background: transparent;
      --border-radius: 10px;
      --padding-start: 20px;
      --padding-end: 20px;
      --inner-padding-end: 0;
      margin-bottom: 20px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 10px;
      transition: all 0.2s ease;

      &:hover {
        border-color: var(--ion-color-primary-tint);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }

      &.item-has-focus {
        border-color: var(--ion-color-primary);
        box-shadow: 0 0 0 3px var(--ion-color-primary-tint);
      }
    }

    ion-label[position="stacked"] {
      font-weight: 600;
      color: white;
      margin-bottom: 8px;
      font-size: 0.9rem;
    }

    ion-select,
    ion-textarea {
      --padding-start: 0;
      --padding-end: 0;
      --background: transparent;
      font-size: 1rem;
      color: white;
      --placeholder-color: rgba(255, 255, 255, 0.6);
    }

    ion-textarea {
      min-height: 100px;
      line-height: 1.5;
    }

    .severity-display {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .severity-chip {
      --height: 36px;
      font-weight: 600;
      font-size: 0.9rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .modal-actions {
      margin-top: 40px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .save-button {
      --height: 52px;
      --border-radius: 10px;
      font-weight: 600;
      font-size: 1rem;
      text-transform: none;
      box-shadow: 0 4px 12px rgba(var(--ion-color-primary-rgb), 0.3);
      transition: all 0.2s ease;

      &:hover {
        box-shadow: 0 6px 16px rgba(var(--ion-color-primary-rgb), 0.4);
        transform: translateY(-2px);
      }
      
      &:active {
        transform: translateY(1px);
        box-shadow: 0 2px 8px rgba(var(--ion-color-primary-rgb), 0.2);
      }
    }

    .cancel-button {
      --height: 44px;
      --border-radius: 10px;
      font-weight: 500;
      text-transform: none;
      transition: all 0.2s ease;

      &:hover {
        --background: var(--ion-color-light-shade);
        transform: translateY(-2px);
      }
      
      &:active {
        transform: translateY(1px);
      }
    }

    /* Responsive adjustments */
    @media (max-width: 480px) {
      form {
        margin: 12px;
        padding: 24px;
      }
      
      .modal-actions {
        margin-top: 32px;
      }
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

  // Categories from user-review page with predefined severity
  issueCategories: IssueCategory[] = [
    {
      name: 'Powertrain',
      severity: 'high',
      subcategories: [
        'Engine',
        'Transmission',
        'Differential',
        'Drivetrain'
      ]
    },
    {
      name: 'Chassis & Running Gear',
      severity: 'high',
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
      severity: 'high',
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
      severity: 'medium',
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
      severity: 'low',
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
      severity: 'high',
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
      severity: 'medium',
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

  getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'high': return 'warning';
      case 'medium': return 'information-circle';
      case 'low': return 'ellipse';
      default: return 'help';
    }
  }

  getSeverityLabel(severity: string): string {
    switch (severity) {
      case 'high': return 'High';
      case 'medium': return 'Medium';
      case 'low': return 'Low';
      default: return 'Unknown';
    }
  }

  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'medium';
    }
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
      severity: this.selectedCategory?.severity || 'medium', // Use predefined severity
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
