// src/app/pages/dashboard/van-report/van-report.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { InspectionService, Inspection } from 'src/app/services/inspection.service';
import { AuthService } from 'src/app/services/auth.service';

type Side = 'front' | 'passenger' | 'rear' | 'driver';

@Component({
  selector: 'app-van-report',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './van-report.component.html',
  styleUrls: ['./van-report.component.scss'],
  host: {
    '[class.review-mode]': 'reviewMode'
  }
})
export class VanReportComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private insp = inject(InspectionService);
  private auth = inject(AuthService);
  private toast = inject(ToastController);
  private alert = inject(AlertController);

  currReportItems: any[] = [];
  prevReportItems: any[] = [];
  comparisonRows: { side: string; prevUrl: string; currUrl: string }[] = [];

  currInspectionId: string | null = null;
  currentInspection: any = null;
  previousInspection: any = null;
  currentSubmitterName: string = 'Unknown';
  previousSubmitterName: string = 'Unknown';
  loading = true;
  errorMsg = '';
  reviewMode = false;
  expandedImage: string | null = null;

  async ngOnInit() {
    this.loading = true;
    this.reviewMode = this.route.snapshot.queryParamMap.get('review') === '1';

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMsg = 'No inspection id provided.';
      this.loading = false;
      return;
    }

    try {
      // 1. Load current inspection
      const curr = await this.insp.getInspectionById(id);
      if (!curr) throw new Error('Inspection not found.');
      this.currInspectionId = curr.id;
      this.currentInspection = curr;

      // 2. Load latest 2 inspections for this van
      const latestTwo = await this.insp.getLatestInspectionsByVan(curr.vanType, curr.vanNumber, 2);
      const prev = latestTwo.find(x => x.id !== curr.id);
      this.previousInspection = prev;

      // 3. Build rows for comparison
      this.buildComparisonRows([curr, prev].filter(Boolean) as Inspection[]);
      this.currReportItems = curr.report ?? [];
      this.prevReportItems = prev?.report ?? [];

      // 4. Load user display names
      await this.loadUserDisplayNames();
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Failed to load report.';
      this.buildComparisonRows([]);
    } finally {
      this.loading = false;
    }
  }

  private buildComparisonRows(reports: Inspection[]) {
    const order: Side[] = ['front', 'passenger', 'rear', 'driver'];
    const prev = reports[1]?.photos ?? {};
    const curr = reports[0]?.photos ?? {};

    this.comparisonRows = order.map(side => ({
      side,
      prevUrl: (prev as any)[side] ?? '',
      currUrl: (curr as any)[side] ?? '',
    }));
  }

  private async loadUserDisplayNames() {
    try {
      // Load current inspection submitter name
      if (this.currentInspection?.createdBy) {
        const currentUser = await this.auth.getUserProfile(this.currentInspection.createdBy);
        this.currentSubmitterName = currentUser?.displayName || 'Unknown';
      }

      // Load previous inspection submitter name
      if (this.previousInspection?.createdBy) {
        const previousUser = await this.auth.getUserProfile(this.previousInspection.createdBy);
        this.previousSubmitterName = previousUser?.displayName || 'Unknown';
      }
    } catch (error) {
      console.error('Failed to load user display names:', error);
    }
  }

  toggleImageExpansion(url: string) {
    if (this.expandedImage === url) {
      this.expandedImage = null;
    } else {
      this.expandedImage = url;
    }
  }

  // ----- Approve / Deny -----
  async approve() {
    if (!this.currInspectionId) return;
    await this.insp.approveInspection(this.currInspectionId);
    (await this.toast.create({ message: 'Approved', duration: 1400 })).present();
    this.router.navigate(['/admin']);
  }

  async deny() {
    if (!this.currInspectionId) return;
    const a = await this.alert.create({
      header: 'Reject submission?',
      inputs: [{ name: 'reason', type: 'text', placeholder: 'Reason (optional)' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Reject',
          role: 'confirm',
          handler: async (data: any) => {
            await this.insp.rejectInspection(this.currInspectionId!, data?.reason);
            (await this.toast.create({ message: 'Rejected', duration: 1400 })).present();
            this.router.navigate(['/admin']);
          },
        },
      ],
    });
    await a.present();
  }
}
