
import { Component, inject, Injector, OnInit } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionData,
  CollectionReference,
} from '@angular/fire/firestore';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Van } from 'src/app/models/van.model';
import { NavbarComponent } from './navbar/navbar.component';
import {
  InspectionService,
  ReportedIssue,
} from 'src/app/services/inspection.service';
import { Router } from '@angular/router';
import { RecentSubmissionsModalComponent } from '@app/components/recent-submissions/recent-submissions-modal.component';
import { ModalController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { ToastController } from '@ionic/angular';
import { StatusCountBarComponent, StatusDataSource } from '@app/components/status-count-bar/status-count-bar.component';

@Component({
  selector: 'app-admin-portal',
  standalone: true,
  imports: [
    CommonModule, 
    IonicModule, 
    FormsModule, 
    NavbarComponent, 
    StatusCountBarComponent
  ],
  templateUrl: './admin-portal.page.html',
  styleUrls: ['./admin-portal.page.scss'],
})
export class AdminPortalPage implements OnInit {
  vans: Van[] = [];
  filteredVans: Van[] = [];
  filteredCdvs: Van[] = [];
  filteredEdvs: Van[] = [];

  // Data sources for the status bars - much cleaner!
  overallDataSource: StatusDataSource = {
    items: [],
    statusField: 'isGrounded',
    activeValue: false,
    searchFields: ['docId', 'vin', 'type', 'number']
  };

  cdvDataSource: StatusDataSource = {
    items: [],
    statusField: 'isGrounded',
    activeValue: false,
    searchFields: ['docId', 'vin', 'number'],
    filterField: 'type',
    filterValue: 'CDV'
  };

  edvDataSource: StatusDataSource = {
    items: [],
    statusField: 'isGrounded', 
    activeValue: false,
    searchFields: ['docId', 'vin', 'number'],
    filterField: 'type',
    filterValue: 'EDV'
  };

  // Inject services
  private firestore = inject(Firestore);
  private router = inject(Router);
  private modalCtrl = inject(ModalController);
  private insp = inject(InspectionService);
  private toast = inject(ToastController);
  private injector = inject(Injector);
  private auth = inject(Auth);

  constructor() {}

  async ngOnInit() {
    const vansRef = collection(
      this.firestore,
      'vans'
    ) as CollectionReference<Van>;

    collectionData<Van>(vansRef, { idField: 'docId' }).subscribe((data) => {
      this.vans = data;
      
      // Update data source - the component handles the rest!
      this.overallDataSource = { ...this.overallDataSource, items: data };
      
      // Initialize filtered data
      this.filteredVans = data;
      this.filteredCdvs = data.filter((v) => (v.type || '').toUpperCase() === 'CDV');
      this.filteredEdvs = data.filter((v) => (v.type || '').toUpperCase() === 'EDV');
    });
  }

  // Handle filtered data from overall status bar
  onOverallFilteredData(filteredData: Van[]): void {
    this.filteredVans = filteredData;
    // Update both CDV and EDV lists based on overall filter
    this.filteredCdvs = filteredData.filter((v) => (v.type || '').toUpperCase() === 'CDV');
    this.filteredEdvs = filteredData.filter((v) => (v.type || '').toUpperCase() === 'EDV');
  }



  async viewVan(van: any) {
    const [type, num] =
      typeof van.docId === 'string' && van.docId.includes('-')
        ? van.docId.split('-')
        : [van.type ?? van.vanType, String(van.number ?? van.vanNumber)];

    const id = await this.insp.getLatestInspectionId(type, num);

    if (!id) {
      /* show toast if needed */
      return;
    }

    this.router.navigate(['/van-report', id], { queryParams: { review: '1' } });
  }

  async logout() {
    await this.auth.signOut();
    this.router.navigate(['/login']);
  }
}