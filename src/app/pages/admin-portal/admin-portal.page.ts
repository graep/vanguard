import { Component, inject, OnInit } from '@angular/core';
import { Firestore, collection, collectionData, CollectionReference } from '@angular/fire/firestore';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Van } from 'src/app/models/van.model';
import { NavbarComponent } from './navbar/navbar.component';
import { InspectionService, ReportedIssue } from 'src/app/services/inspection.service';
import { Router } from '@angular/router';
import { RecentSubmissionsModalComponent } from '@app/components/recent-submissions/recent-submissions-modal.component';
import { getDocs } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { ModalController } from '@ionic/angular';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-admin-portal',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, NavbarComponent],
  templateUrl: './admin-portal.page.html',
  styleUrls: ['./admin-portal.page.scss'],
})
export class AdminPortalPage implements OnInit {

  private firestore: Firestore = inject(Firestore);
  private inspService = inject(InspectionService);
  private router = inject(Router);

  vans: Van[] = [];
  filteredVans: Van[] = [];
  searchTerm: string = '';
  selectedDate: string = new Date().toISOString();
  showPicker = false;
  pendingCount$!: Observable<number>;

  allInspections: Array<{
    id: string;
    vanType: string;
    vanNumber: string;
    photos: Record<string,string>;
    createdAt: any;
    report?: ReportedIssue[];
    reportSubmittedAt?: any;
  }> = [];

  constructor(
    private auth: Auth,
    private modalCtrl: ModalController
  ) {}


  async ngOnInit() {

    const vansRef = collection(this.firestore,'vans') as CollectionReference<Van>;

    collectionData<Van>(vansRef, { idField: 'docId' }).subscribe(data => {
      this.vans = data;
      this.filteredVans = data;    // initialize the filtered list
    });

    this.pendingCount$ = this.inspService.pendingCount$();
  }

    async openPendingModal() {
    const modal = await this.modalCtrl.create({
      component: RecentSubmissionsModalComponent
    });
    await modal.present();
  }

  filterVans(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredVans = this.vans;
      return;
    }

    this.filteredVans = this.vans.filter(van =>
      van.docId.toLowerCase().includes(term) ||
      (van.vin      && van.vin.toLowerCase().includes(term)) ||
      van.type.toLowerCase().includes(term)
    );
  }

  displayStatus(van: any): string {
    return van.isGrounded ? '🛑 Grounded' : '✅ Active';
  }

  /** number of vans whose status is exactly "active" (case-insensitive) */
   get activeVansCount(): number {
    return this.vans.filter(v => !v.isGrounded).length;
  }


  // /** vans that _are_ grounded *
  get groundedVansCount(): number {
    return this.vans.filter(v => v.isGrounded).length;
  }


  viewVan(van: any) {
  this.router.navigate(['/admin/van-report', van.docId]);
  }
}