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

@Component({
  selector: 'app-admin-portal',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, NavbarComponent],
  templateUrl: './admin-portal.page.html',
  styleUrls: ['./admin-portal.page.scss'],
})
export class AdminPortalPage implements OnInit {
  collapsed = true;
  vans: Van[] = [];
  filteredVans: Van[] = [];
  searchTerm: string = '';
  pendingCount$!: Observable<number>;
  busy = new Set<string>();
  cdvs: Van[] = [];
  edvs: Van[] = [];
  filteredCdvs: Van[] = [];
  filteredEdvs: Van[] = [];

  allInspections: Array<{
    id: string;
    vanType: string;
    vanNumber: string;
    photos: Record<string, string>;
    createdAt: any;
    report?: ReportedIssue[];
    reportSubmittedAt?: any;
  }> = [];

  // Use inject() at class level (outside constructor)
  private firestore = inject(Firestore);
  private router = inject(Router);
  private modalCtrl = inject(ModalController);
  private insp = inject(InspectionService);
  private toast = inject(ToastController);
  private injector = inject(Injector);
  private auth = inject(Auth);

  // Empty constructor or remove it entirely
  constructor() {}

  async ngOnInit() {
    const vansRef = collection(
      this.firestore,
      'vans'
    ) as CollectionReference<Van>;

    collectionData<Van>(vansRef, { idField: 'docId' }).subscribe((data) => {
      this.vans = data;

      // NEW: split by type
      this.cdvs = data.filter((v) => (v.type || '').toUpperCase() === 'CDV');
      this.edvs = data.filter((v) => (v.type || '').toUpperCase() === 'EDV');

      // initialize filtered lists
      this.filteredCdvs = this.cdvs;
      this.filteredEdvs = this.edvs;
    });
  }


  filterVans(): void {
    const term = this.searchTerm.trim().toLowerCase();

    // Helper to reuse the same predicate for both lists
    const matches = (van: Van) =>
      van.docId?.toLowerCase().includes(term) ||
      van.vin?.toLowerCase().includes(term) ||
      van.type?.toLowerCase().includes(term);

    if (!term) {
      this.filteredCdvs = this.cdvs;
      this.filteredEdvs = this.edvs;
      return;
    }

    this.filteredCdvs = this.cdvs.filter(matches);
    this.filteredEdvs = this.edvs.filter(matches);
  }

  displayStatus(van: any): string {
    return van.isGrounded ? '🛑 Grounded' : '✅ Active';
  }

  get activeVansCount(): number {
    return this.vans.filter((v) => !v.isGrounded).length;
  }

  get groundedVansCount(): number {
    return this.vans.filter((v) => v.isGrounded).length;
  }

  get cdvActiveCount(): number {
    return this.cdvs.filter((v) => !v.isGrounded).length;
  }
  get cdvGroundedCount(): number {
    return this.cdvs.filter((v) => v.isGrounded).length;
  }

  get edvActiveCount(): number {
    return this.edvs.filter((v) => !v.isGrounded).length;
  }
  get edvGroundedCount(): number {
    return this.edvs.filter((v) => v.isGrounded).length;
  }

  async viewVan(van: any) {
    const [type, num] =
      typeof van.docId === 'string' && van.docId.includes('-')
        ? van.docId.split('-')
        : [van.type ?? van.vanType, String(van.number ?? van.vanNumber)];

    // The service will handle normalization now
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
