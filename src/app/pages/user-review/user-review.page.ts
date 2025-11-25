import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { FormsModule }       from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonContent,
  IonCheckbox,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonButton,
  IonIcon,
  ToastController
} from '@ionic/angular/standalone';
import { InspectionService, ReportedIssue } from 'src/app/services/inspection.service';
import { AuthService }                     from 'src/app/services/auth.service';
import { NavService } from '@app/services/nav.service';
import { GpsTrackerService } from '@app/services/gps-tracker.service';
import { ShiftSessionService } from '@app/services/shift-session.service';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { BreadcrumbItem } from '@app/components/breadcrumb/breadcrumb.component';

interface IssueCategory {
  name: string;
  hasIssue: boolean;
  details: string;
  subcategories?: string[];
  selectedSubcategory?: string;
  severity?: 'high' | 'medium' | 'low';
  allowPhotoCapture?: boolean;
  capturedPhoto?: string;
}

@Component({
  standalone: true,
  selector: 'app-user-review',
  templateUrl: './user-review.page.html',
  styleUrls: ['./user-review.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonCheckbox,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonButton,
    IonIcon,
    PageHeaderComponent
  ]
})
export class UserReviewPage implements OnInit, OnDestroy {
  vanType    = '';
  vanNumber  = '';
  vanId      = ''; // NEW: Store the van document ID
  photoUrls: Record<string,string> = {};
  noIssues   = false;
  inspectionId = '';
  
  // Track if any form element is currently focused to prevent accidental category toggles
  private formElementFocused = false;
  private formInteractionTimeout: any = null;

  // Unsure category (separate from main categories)
  unsureIssue = {
    hasIssue: false,
    details: '',
    capturedPhoto: undefined as string | undefined
  };

  // Breadcrumb items
  breadcrumbItems: BreadcrumbItem[] = [];

  // CDV/Rental Categories (Conventional Delivery Vehicles & Rental Vehicles)
  cdvLmrCategories: IssueCategory[] = [
    {
      name: 'Safety & Security',
      hasIssue: false,
      details: '',
      severity: 'high',
      subcategories: [
        'Seat Belts',
        'Alarm / Security System',
        'Backup Camera / Sensors',
        'Emergency Lights',
        'Fire Extinguisher'
      ],
      selectedSubcategory: ''
    },
    {
      name: 'Engine & Transmission',
      hasIssue: false,
      details: '',
      severity: 'high',
      subcategories: [
        'Engine Problems',
        'Transmission Issues',
        'Won\'t Start / Hard to Start'
      ],
      selectedSubcategory: ''
    },
    {
      name: 'Brakes, Steering & Suspension',
      hasIssue: false,
      details: '',
      severity: 'high',
      subcategories: [
        'Brakes',
        'Steering',
        'Suspension / Ride Quality',
        'Wheels & Tires'
      ],
      selectedSubcategory: ''
    },
    {
      name: 'Electrical',
      hasIssue: false,
      details: '',
      severity: 'high',
      subcategories: [
        'Battery / Won\'t Start',
        'Lights Not Working',
        'Dashboard Warnings / Gauges'
      ],
      selectedSubcategory: ''
    },
    {
      name: 'Fluids & Leaks',
      hasIssue: false,
      details: '',
      severity: 'medium',
      subcategories: [
        'Oil Leak',
        'Coolant Leak',
        'Brake Fluid Leak',
        'Low Fluid Levels'
      ],
      selectedSubcategory: ''
    },
    {
      name: 'Heating & Cooling',
      hasIssue: false,
      details: '',
      severity: 'medium',
      subcategories: [
        'Air Conditioning Not Working',
        'Heater Not Working',
        'Temperature Controls'
      ],
      selectedSubcategory: ''
    },
    {
      name: 'Body & Interior',
      hasIssue: false,
      details: '',
      severity: 'low',
      subcategories: [
        'Doors Won\'t Open/Close',
        'Windows / Windshield',
        'Body Damage / Dents',
        'Seats / Interior Damage',
        'Side skirt panel(s) / Plastic Trim'
      ],
      selectedSubcategory: '',
      allowPhotoCapture: true
    }
  ];

  // EDV Categories (Electric Delivery Vehicles)
  edvCategories: IssueCategory[] = [
    {
      name: 'Safety & Security',
      hasIssue: false,
      details: '',
      severity: 'high',
      subcategories: [
        'Seat Belts',
        'Alarm / Security System',
        'Backup Camera / Sensors',
        'Emergency Lights',
        'Fire Extinguisher'
      ],
      selectedSubcategory: ''
    },
    {
      name: 'Electric Motor & Power',
      hasIssue: false,
      details: '',
      severity: 'high',
      subcategories: [
        'Electric Motor Problems',
        'Power Loss / Reduced Performance',
        'Won\'t Start / Drive'
      ],
      selectedSubcategory: ''
    },
    {
      name: 'Brakes, Steering & Suspension',
      hasIssue: false,
      details: '',
      severity: 'high',
      subcategories: [
        'Brakes',
        'Steering',
        'Suspension / Ride Quality',
        'Wheels & Tires'
      ],
      selectedSubcategory: ''
    },
    {
      name: 'Battery & Charging',
      hasIssue: false,
      details: '',
      severity: 'high',
      subcategories: [
        'Battery Won\'t Charge',
        'Charging Port Issues',
        'Battery Warning Lights',
        'Range / Battery Life Problems'
      ],
      selectedSubcategory: ''
    },
    {
      name: 'Electrical Systems',
      hasIssue: false,
      details: '',
      severity: 'high',
      subcategories: [
        'Lights Not Working',
        'Dashboard Warnings / Gauges',
        'Electrical Problems'
      ],
      selectedSubcategory: ''
    },
    {
      name: 'Heating & Cooling',
      hasIssue: false,
      details: '',
      severity: 'medium',
      subcategories: [
        'Air Conditioning Not Working',
        'Heater Not Working',
        'Temperature Controls'
      ],
      selectedSubcategory: ''
    },
    {
      name: 'Software & Display',
      hasIssue: false,
      details: '',
      severity: 'medium',
      subcategories: [
        'Screen / Display Issues',
        'App Connectivity Problems',
        'System Errors / Warnings'
      ],
      selectedSubcategory: ''
    },
    {
      name: 'Body & Interior',
      hasIssue: false,
      details: '',
      severity: 'low',
      subcategories: [
        'Doors Won\'t Open/Close',
        'Windows / Windshield',
        'Body Damage / Dents',
        'Seats / Interior Damage',
        'Side skirt panel(s) / Plastic Trim'
      ],
      selectedSubcategory: '',
      allowPhotoCapture: true
    }
  ];

  // Dynamic categories based on van type
  get issueCategories(): IssueCategory[] {
    return this.vanType === 'EDV' ? this.edvCategories : this.cdvLmrCategories;
  }

  constructor(
    private insp: InspectionService,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toastCtrl: ToastController,
    private navService: NavService,
    private gps: GpsTrackerService,
    private shiftSession: ShiftSessionService
  ) {}

  ngOnInit() {
    // Read van info from query params
    this.vanType   = this.route.snapshot.queryParamMap.get('vanType')   || '';
    this.vanNumber = this.route.snapshot.queryParamMap.get('vanNumber') || '';
    this.vanId     = this.route.snapshot.queryParamMap.get('vanId')     || ''; // NEW: Get van document ID
    this.inspectionId = this.route.snapshot.queryParamMap.get('inspectionId') ?? '';

    // If no inspectionId, clear all form data (user might have navigated here without proper flow)
    if (!this.inspectionId) {
      this.clearAllFormData();
    }

    // Setup breadcrumb items
    this.breadcrumbItems = [
      { label: 'Van Selection', url: '/van-selection', icon: 'car' },
      { label: `${this.vanType} ${this.vanNumber}`, url: `/photo-capture/${this.vanType}/${this.vanNumber}?vanId=${this.vanId}`, icon: 'camera' },
      { label: 'Review', icon: 'checkmark-circle' }
    ];

    // Read photo URLs passed in navigation state
    const nav = this.router.getCurrentNavigation();
    this.photoUrls = (nav?.extras.state as any)?.photoUrls || {};
  }
  
  /** Clear all form data - called on logout and when inspectionId is missing */
  private clearAllFormData(): void {
    // Reset all CDV/LMR categories
    this.cdvLmrCategories.forEach(cat => {
      cat.hasIssue = false;
      cat.details = '';
      cat.selectedSubcategory = '';
      cat.capturedPhoto = undefined;
    });
    
    // Reset all EDV categories
    this.edvCategories.forEach(cat => {
      cat.hasIssue = false;
      cat.details = '';
      cat.selectedSubcategory = '';
      cat.capturedPhoto = undefined;
    });
    
    // Reset unsure issue
    this.unsureIssue.hasIssue = false;
    this.unsureIssue.details = '';
    this.unsureIssue.capturedPhoto = undefined;
    
    // Reset no issues flag
    this.noIssues = false;
    
    // Clear form element focus state
    this.formElementFocused = false;
    if (this.formInteractionTimeout) {
      clearTimeout(this.formInteractionTimeout);
      this.formInteractionTimeout = null;
    }
  }
  
  ngOnDestroy() {
    // Clean up timeout to prevent memory leaks
    if (this.formInteractionTimeout) {
      clearTimeout(this.formInteractionTimeout);
    }
  }

  /** true if at least one category is checked */
  get hasSelectedIssues(): boolean {
    return this.issueCategories.some(c => c.hasIssue) || this.unsureIssue.hasIssue;
  }

  /** allow submit when noIssues OR at least one issue */
  get canSubmit(): boolean {
    return this.noIssues || this.hasSelectedIssues;
  }

  getCategoryIcon(categoryName: string): string {
    switch (categoryName) {
      case 'Engine & Transmission':
      case 'Electric Motor & Power':
        return 'settings';
      case 'Brakes, Steering & Suspension':
        return 'car';
      case 'Electrical':
      case 'Electrical Systems':
        return 'flash';
      case 'Heating & Cooling':
        return 'thermometer';
      case 'Body & Interior':
        return 'cube';
      case 'Safety & Security':
        return 'shield-checkmark';
      case 'Fluids & Leaks':
        return 'water';
      case 'Battery & Charging':
        return 'battery-charging';
      case 'Software & Display':
        return 'laptop';
      case 'Unsure':
        return 'help-circle';
      default:
        return 'warning';
    }
  }

  toggleCategory(category: IssueCategory): void {
    // Prevent toggling if a form element is focused or was recently interacted with
    // This prevents the checkbox from being unchecked when the keyboard appears on mobile
    if (this.formElementFocused) {
      return;
    }
    
    category.hasIssue = !category.hasIssue;
    
    // Clear details and subcategory when unchecking
    if (!category.hasIssue) {
      category.details = '';
      category.selectedSubcategory = '';
      category.capturedPhoto = undefined;
    }
  }
  
  onFormElementFocus(): void {
    this.formElementFocused = true;
    // Clear any existing timeout
    if (this.formInteractionTimeout) {
      clearTimeout(this.formInteractionTimeout);
    }
  }
  
  onFormElementBlur(): void {
    // Add a small delay before allowing category toggles again
    // This prevents accidental toggles when the keyboard closes and causes layout shifts
    if (this.formInteractionTimeout) {
      clearTimeout(this.formInteractionTimeout);
    }
    this.formInteractionTimeout = setTimeout(() => {
      this.formElementFocused = false;
    }, 300);
  }

  toggleNoIssues(): void {
    this.noIssues = !this.noIssues;
    
    // Clear all category selections when "no issues" is checked
    if (this.noIssues) {
      this.issueCategories.forEach(cat => {
        cat.hasIssue = false;
        cat.details = '';
        cat.selectedSubcategory = '';
        cat.capturedPhoto = undefined;
      });
      this.unsureIssue.hasIssue = false;
      this.unsureIssue.details = '';
      this.unsureIssue.capturedPhoto = undefined;
    }
  }

  toggleUnsureIssue(): void {
    this.unsureIssue.hasIssue = !this.unsureIssue.hasIssue;
    
    // Clear details and photo when unchecking
    if (!this.unsureIssue.hasIssue) {
      this.unsureIssue.details = '';
      this.unsureIssue.capturedPhoto = undefined;
    }
  }

  async capturePhoto(category?: IssueCategory): Promise<void> {
    try {
      // Use the camera service for proper camera functionality
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });

      if (image.dataUrl) {
        if (category) {
          category.capturedPhoto = image.dataUrl;
        } else {
          this.unsureIssue.capturedPhoto = image.dataUrl;
        }
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      const toast = await this.toastCtrl.create({
        message: 'Could not capture photo. Please try again.',
        color: 'danger',
        duration: 2000,
        position: 'top'
      });
      await toast.present();
    }
  }

  removePhoto(category?: IssueCategory): void {
    if (category) {
      category.capturedPhoto = undefined;
    } else {
      this.unsureIssue.capturedPhoto = undefined;
    }
  }

  /** User taps "Submit Review" */
  async submitReview() {
    // Validate inspectionId before proceeding
    if (!this.inspectionId || this.inspectionId.trim() === '') {
      console.error('❌ submitReview failed: inspectionId is missing');
      const errToast = await this.toastCtrl.create({
        message:  'Invalid inspection. Please start a new inspection.',
        color:    'danger',
        duration: 3000,
        position: 'top'
      });
      await errToast.present();
      return;
    }

    // Upload "Unsure" photo if it exists
    let unsurePhotoUrl: string | undefined;
    if (this.unsureIssue.hasIssue && this.unsureIssue.capturedPhoto) {
      try {
        unsurePhotoUrl = await this.insp.uploadPhoto(
          this.vanType,
          this.vanNumber,
          'unsure',
          this.unsureIssue.capturedPhoto
        );
      } catch (error) {
        console.error('❌ Failed to upload unsure photo:', error);
        // Continue without photo rather than failing the entire submission
      }
    }

    // Upload category photos
    const categoryPhotoUrls: Record<string, string> = {};
    for (const category of this.issueCategories) {
      if (category.hasIssue && category.capturedPhoto) {
        try {
          const photoUrl = await this.insp.uploadPhoto(
            this.vanType,
            this.vanNumber,
            `${category.name.toLowerCase().replace(/\s+/g, '-')}-${category.selectedSubcategory?.toLowerCase().replace(/\s+/g, '-') || 'general'}`,
            category.capturedPhoto
          );
          categoryPhotoUrls[category.name] = photoUrl;
        } catch (error) {
          console.error(`❌ Failed to upload photo for ${category.name}:`, error);
          // Continue without photo rather than failing the entire submission
        }
      }
    }

    // Helper function to remove undefined values from an object
    const removeUndefined = (obj: any): any => {
      const cleaned: any = {};
      for (const key in obj) {
        if (obj[key] !== undefined) {
          cleaned[key] = obj[key];
        }
      }
      return cleaned;
    };

    // build the report payload
    const reported: ReportedIssue[] = this.noIssues
      ? []
      : [
          ...this.issueCategories
            .filter(c => c.hasIssue)
            .map(c => {
              const issue: any = {
                name:        c.name,
                details:     c.details,
                severity:    c.severity || 'medium'
              };
              
              // Only include subcategory if it exists and is not empty
              if (c.selectedSubcategory && c.selectedSubcategory.trim() !== '') {
                issue.subcategory = c.selectedSubcategory;
              }
              
              // Only include photoUrl if it exists
              if (categoryPhotoUrls[c.name]) {
                issue.photoUrl = categoryPhotoUrls[c.name];
              }
              
              return issue;
            }),
          ...(this.unsureIssue.hasIssue ? [(() => {
            const issue: any = {
              name:        'Unsure',
              details:     this.unsureIssue.details,
              severity:    'medium' as const
            };
            
            // Only include photoUrl if it exists
            if (unsurePhotoUrl) {
              issue.photoUrl = unsurePhotoUrl;
            }
            
            return issue;
          })()] : [])
        ];

    try {
      // Step 1: Get mileage and update van
      const miles = this.gps.getMiles();
      // Update van mileage in Firestore
      if (miles > 0 && this.vanId) {
        try {
          await this.insp.updateVanMileage(this.vanId, miles);
        } catch (mileageError) {
          console.error('❌ Failed to update mileage:', mileageError);
          // Continue with submission even if mileage update fails
        }
      }

      // Step 2: merge report into the *same* document
      await this.insp.saveReport(this.inspectionId, reported);

      // Step 3: Stop GPS tracking and shift session
      try {
        await this.shiftSession.stopShift('logout');
      } catch (shiftError) {
        console.error('❌ Failed to stop shift session:', shiftError);
        // Continue even if shift session stop fails
      }

      // Clear all form data after successful submission
      this.clearAllFormData();

      // show a toast immediately
      const toast = await this.toastCtrl.create({
        message:  'Review submitted successfully!',
        color:    'success',
        duration: 2000,
        position: 'middle'
      });
      await toast.present();

      // after 2s, logout & redirect
      setTimeout(async () => {
        await this.auth.logout();
        this.navService.enhancedLogout(); // Clear both app and browser history
        await this.router.navigateByUrl('/login', { replaceUrl: true });
      }, 2000);

    } catch (e: any) {
      console.error('❌ submitReview failed', e);
      const errorMessage = e?.message || 'Unknown error occurred';
      const errorCode = e?.code || 'unknown';
      
      let userMessage = 'Could not submit review. Try again.';
      if (errorCode === 'permission-denied') {
        userMessage = 'Permission denied. Please check your access.';
      } else if (errorCode === 'not-found') {
        userMessage = 'Inspection not found. Please start a new inspection.';
      } else if (errorMessage.includes('inspectionId') || errorMessage.includes('inspection')) {
        userMessage = 'Invalid inspection. Please start a new inspection.';
      }
      
      const errToast = await this.toastCtrl.create({
        message:  userMessage,
        color:    'danger',
        duration: 3000,
        position: 'top'
      });
      await errToast.present();
    }
  }

  async logout() {
    // Clear all form data before logging out
    this.clearAllFormData();
    
    await this.auth.logout();
    this.navService.enhancedLogout(); // Clear both app and browser history
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
