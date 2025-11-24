import { Component, OnInit } from '@angular/core';
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
export class UserReviewPage implements OnInit {
  vanType    = '';
  vanNumber  = '';
  vanId      = ''; // NEW: Store the van document ID
  photoUrls: Record<string,string> = {};
  noIssues   = false;
  inspectionId = '';

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
        'Seat Belts & Airbags',
        'Alarm / Immobilizer',
        'Cameras & Sensors',
        'Emergency Lighting',
        'Fire Extinguisher'
      ],
      selectedSubcategory: ''
    },
    {
      name: 'Powertrain',
      hasIssue: false,
      details: '',
      severity: 'high',
      subcategories: [
        'Engine',
        'Transmission',
        'Differential',
        'Drivetrain'
      ],
      selectedSubcategory: ''
    },
    {
      name: 'Chassis & Running Gear',
      hasIssue: false,
      details: '',
      severity: 'high',
      subcategories: [
        'Suspension',
        'Brakes',
        'Steering',
        'Axles',
        'Wheels & Tires'
      ],
      selectedSubcategory: ''
    },
    {
      name: 'Electrical & Electronics',
      hasIssue: false,
      details: '',
      severity: 'high',
      subcategories: [
        'Battery / Charging',
        'Wiring Harness',
        'Lighting',
        'Sensors & Gauges',
        'Control Modules'
      ],
      selectedSubcategory: ''
    },
    {
      name: 'Fluids & Maintenance',
      hasIssue: false,
      details: '',
      severity: 'medium',
      subcategories: [
        'Engine Oil & Filter',
        'Coolant / Radiator',
        'Brake Fluid',
        'Transmission Fluid',
        'Fuel System',
        'Air / Cabin Filters'
      ],
      selectedSubcategory: ''
    },
    {
      name: 'HVAC & Comfort',
      hasIssue: false,
      details: '',
      severity: 'medium',
      subcategories: [
        'Air Conditioning',
        'Heating',
        'Ventilation',
        'Thermostat / Controls',
        'Insulation & Seals'
      ],
      selectedSubcategory: ''
    },
    {
      name: 'Body & Interior',
      hasIssue: false,
      details: '',
      severity: 'low',
      subcategories: [
        'Doors & Hinges',
        'Windows & Glass',
        'Exterior Panels',
        'Seats & Upholstery',
        'Dashboard & Trim'
      ],
      selectedSubcategory: ''
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
        'Seat Belts & Airbags',
        'Alarm / Immobilizer',
        'Cameras & Sensors',
        'Emergency Lighting',
        'Fire Extinguisher',
        'High-Voltage Safety Systems',
        'Battery Fire Safety / Thermal Runaway Protection'
      ],
      selectedSubcategory: ''
    },
    {
      name: 'Electric Powertrain',
      hasIssue: false,
      details: '',
      severity: 'high',
      subcategories: [
        'Electric Motor(s)',
        'Reduction Gear / Drive Unit',
        'Inverter & Power Electronics',
        'Onboard Charger',
        'High-Voltage Cabling & Connectors',
        'Regenerative Braking System',
        'Drive Control Modules',
        'Cooling System for Powertrain Components'
      ],
      selectedSubcategory: ''
    },
    {
      name: 'Chassis & Running Gear',
      hasIssue: false,
      details: '',
      severity: 'high',
      subcategories: [
        'Suspension',
        'Brakes (including regen brake blending)',
        'Steering (electronic power steering)',
        'Axles',
        'Wheels & Tires',
        'Weight Distribution / Handling Issues',
        'HV Cable Routing & Protection under chassis'
      ],
      selectedSubcategory: ''
    },
    {
      name: 'Electrical & Electronics',
      hasIssue: false,
      details: '',
      severity: 'high',
      subcategories: [
        '12V Battery / Low Voltage System',
        'High Voltage Battery System',
        'Wiring Harness',
        'Lighting',
        'Sensors & Gauges',
        'Control Modules (ECUs / BMS / VCU / MCU)',
        'Battery Management System (BMS)',
        'Thermal Management System',
        'DC-DC Converter',
        'HV Junction Box / Contactors',
        'Charging Port & Lock Mechanism'
      ],
      selectedSubcategory: ''
    },
    {
      name: 'Charging & Energy Management',
      hasIssue: false,
      details: '',
      severity: 'high',
      subcategories: [
        'Charging Port & Connector Integrity',
        'Charge Port Door & Locking Mechanism',
        'Onboard Charger Malfunctions',
        'EVSE Compatibility',
        'Charging Speed / Communication Errors',
        'AC vs DC Fast Charging Issues',
        'Vehicle-to-Grid / Vehicle-to-Load Systems',
        'Software Updates affecting charging logic'
      ],
      selectedSubcategory: ''
    },
    {
      name: 'Structural & Safety Integration',
      hasIssue: false,
      details: '',
      severity: 'high',
      subcategories: [
        'Battery Enclosure & Mounting Integrity',
        'Crash Protection for HV Components',
        'Underbody Shielding',
        'HV Isolation Faults'
      ],
      selectedSubcategory: ''
    },
    {
      name: 'Fluids & Maintenance',
      hasIssue: false,
      details: '',
      severity: 'medium',
      subcategories: [
        'Brake Fluid',
        'Coolant / Radiator',
        'Windshield Washer Fluid',
        'Thermal Cooling System Maintenance',
        'Gear Reduction Oil'
      ],
      selectedSubcategory: ''
    },
    {
      name: 'HVAC & Comfort',
      hasIssue: false,
      details: '',
      severity: 'medium',
      subcategories: [
        'Air Conditioning',
        'Heating',
        'Ventilation',
        'Thermostat / Controls',
        'Insulation & Seals',
        'Heat Pump System',
        'Battery Preconditioning HVAC Integration'
      ],
      selectedSubcategory: ''
    },
    {
      name: 'Software & Connectivity',
      hasIssue: false,
      details: '',
      severity: 'medium',
      subcategories: [
        'Infotainment & OTA Update Failures',
        'Drive Mode / Range Estimation Errors',
        'BMS or ECU Firmware Bugs',
        'Connectivity with Mobile Apps',
        'Driver Assistance Systems (ADAS)',
        'Energy Usage Monitoring / Trip Logs'
      ],
      selectedSubcategory: ''
    },
    {
      name: 'Body & Interior',
      hasIssue: false,
      details: '',
      severity: 'low',
      subcategories: [
        'Doors & Hinges',
        'Windows & Glass',
        'Exterior Panels',
        'Seats & Upholstery',
        'Dashboard & Trim',
        'Frunk Components',
        'Access Panels for HV Disconnects',
        'Acoustic Insulation'
      ],
      selectedSubcategory: ''
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
      case 'Powertrain':
      case 'Electric Powertrain':
        return 'settings';
      case 'Chassis & Running Gear':
        return 'car';
      case 'Electrical & Electronics':
        return 'flash';
      case 'HVAC & Comfort':
        return 'thermometer';
      case 'Body & Interior':
        return 'cube';
      case 'Safety & Security':
        return 'shield-checkmark';
      case 'Fluids & Maintenance':
        return 'water';
      case 'Charging & Energy Management':
        return 'battery-charging';
      case 'Software & Connectivity':
        return 'laptop';
      case 'Structural & Safety Integration':
        return 'construct';
      case 'Unsure':
        return 'help-circle';
      default:
        return 'warning';
    }
  }

  toggleCategory(category: IssueCategory): void {
    category.hasIssue = !category.hasIssue;
    
    // Clear details and subcategory when unchecking
    if (!category.hasIssue) {
      category.details = '';
      category.selectedSubcategory = '';
      category.capturedPhoto = undefined;
    }
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

    // build the report payload
    const reported: ReportedIssue[] = this.noIssues
      ? []
      : [
          ...this.issueCategories
            .filter(c => c.hasIssue)
            .map(c => ({
              name:        c.name,
              subcategory: c.selectedSubcategory,
              details:     c.details,
              severity:    c.severity || 'medium'
            })),
          ...(this.unsureIssue.hasIssue ? [{
            name:        'Unsure',
            subcategory: '',
            details:     this.unsureIssue.details,
            severity:    'medium' as const,
            photoUrl:    unsurePhotoUrl
          }] : [])
        ];

    try {
      // Step 1: Get mileage and update van
      const miles = this.gps.getMiles();
      // Update van mileage in Firestore
      if (miles > 0 && this.vanId) {
        await this.insp.updateVanMileage(this.vanId, miles);
      }

      // Step 2: merge report into the *same* document
      await this.insp.saveReport(this.inspectionId, reported);

      // Step 3: Stop GPS tracking and shift session
      await this.shiftSession.stopShift('logout');

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

    } catch (e) {
      console.error('❌ submitReview failed', e);
      const errToast = await this.toastCtrl.create({
        message:  'Could not submit review. Try again.',
        color:    'danger',
        duration: 2000,
        position: 'top'
      });
      await errToast.present();
    }
  }

  async logout() {
    await this.auth.logout();
    this.navService.enhancedLogout(); // Clear both app and browser history
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
