import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { FormsModule }       from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonCheckbox,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonButton,
  ToastController
} from '@ionic/angular/standalone';
import { InspectionService, ReportedIssue } from 'src/app/services/inspection.service';
import { AuthService }                     from 'src/app/services/auth.service';
import { AppHeaderComponent } from '@app/components/app-header/app-header.component';
import { NavService } from '@app/services/nav.service';

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
    IonList,
    IonItem,
    IonLabel,
    IonCheckbox,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonButton,
    AppHeaderComponent
  ]
})
export class UserReviewPage implements OnInit {
  vanType    = '';
  vanNumber  = '';
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
    private navService: NavService
  ) {}

  ngOnInit() {
    // Read van info from query params
    this.vanType   = this.route.snapshot.queryParamMap.get('vanType')   || '';
    this.vanNumber = this.route.snapshot.queryParamMap.get('vanNumber') || '';
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
      // Step 2: merge report into the *same* document
      await this.insp.saveReport(this.inspectionId, reported);
      console.log('✅ saveReport succeeded');

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
