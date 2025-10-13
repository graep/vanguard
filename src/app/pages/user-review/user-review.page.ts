import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { FormsModule }       from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
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
import { AppHeaderComponent } from '@app/components/app-header/app-header.component';
import { NavService } from '@app/services/nav.service';
import { GpsTrackerService } from '@app/services/gps-tracker.service';
import { ShiftSessionService } from '@app/services/shift-session.service';

interface IssueCategory {
  name: string;
  hasIssue: boolean;
  details: string;
  subcategories?: string[];
  selectedSubcategory?: string;
  severity?: 'high' | 'medium' | 'low';
}

@Component({
  standalone: true,
  selector: 'app-user-review',
  templateUrl: './user-review.page.html',
  styleUrls: ['./user-review.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonContent,
    IonCheckbox,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonButton,
    IonIcon,
    AppHeaderComponent
  ]
})
export class UserReviewPage implements OnInit {
  vanType    = '';
  vanNumber  = '';
  vanId      = ''; // NEW: Store the van document ID
  photoUrls: Record<string,string> = {};
  noIssues   = false;
  inspectionId = '';

  issueCategories: IssueCategory[] = [
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
    },
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
    }
  ];

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

    // Read photo URLs passed in navigation state
    const nav = this.router.getCurrentNavigation();
    this.photoUrls = (nav?.extras.state as any)?.photoUrls || {};
  }

  /** true if at least one category is checked */
  get hasSelectedIssues(): boolean {
    return this.issueCategories.some(c => c.hasIssue);
  }

  /** allow submit when noIssues OR at least one issue */
  get canSubmit(): boolean {
    return this.noIssues || this.hasSelectedIssues;
  }

  getCategoryIcon(categoryName: string): string {
    switch (categoryName) {
      case 'Powertrain':
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
      });
    }
  }

  /** User taps “Submit Review” */
  async submitReview() {
    console.log('🔔 submitReview start — ID:', this.inspectionId);

    // build the report payload
    const reported: ReportedIssue[] = this.noIssues
      ? []
      : this.issueCategories
          .filter(c => c.hasIssue)
          .map(c => ({
            name:        c.name,
            subcategory: c.selectedSubcategory,
            details:     c.details,
            severity:    c.severity || 'medium'
          }));

    try {
      // Step 1: Get mileage and update van
      const miles = this.gps.getMiles();
      console.log('📊 Miles driven this shift:', miles);
      
      // Update van mileage in Firestore
      if (miles > 0 && this.vanId) {
        await this.insp.updateVanMileage(this.vanId, miles);
        console.log('✅ Van mileage updated');
      }

      // Step 2: merge report into the *same* document
      await this.insp.saveReport(this.inspectionId, reported);
      console.log('✅ saveReport succeeded');

      // Step 3: Stop GPS tracking and shift session
      await this.shiftSession.stopShift('logout');
      console.log('✅ Shift session ended');

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
        console.log('🔒 Logging out & navigating to /login');
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
}
