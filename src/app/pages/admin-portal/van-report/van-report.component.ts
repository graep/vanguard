import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { ImageViewerComponent } from 'src/app/components/image-viewer/image-viewer.component';
import {
  Firestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  CollectionReference,
  QueryDocumentSnapshot
} from '@angular/fire/firestore';
import { InspectionService } from 'src/app/services/inspection.service';

type Side = 'front' | 'passenger' | 'rear' | 'driver';

interface InspectionDoc {
  vanType?: string;
  vanNumber: string;
  createdAt?: any;
  reportSubmittedAt?: any;
  photos?: Record<Side, string>;
  report?: { name: string; subcategory?: string; details: string; reportSubmittedAt?: any }[];
}

@Component({
  selector: 'app-van-report',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './van-report.component.html',
  styleUrls: ['./van-report.component.scss'],
})
export class VanReportComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private firestore = inject(Firestore);
  private modalCtrl = inject(ModalController);
  private insp = inject(InspectionService);
  private toast = inject(ToastController);
  private alert = inject(AlertController);

  currReportItems: any[] = [];
  prevReportItems: any[] = [];

  loading = true;
  errorMsg = '';

  routeParam = '';
  vanNumber = '';

  // NEW: which doc are we reviewing right now
  currInspectionId: string | null = null;

  // show approve/deny when coming from recent-submissions
  reviewMode = false;

  comparisonRows: { side: string; prevUrl: string; currUrl: string }[] = [];
  reportDetails: Record<Side, string> = { front: '', passenger: '', rear: '', driver: '' };

  async openImageViewer(url: string) {
    const modal = await this.modalCtrl.create({
      component: ImageViewerComponent,
      componentProps: { imageUrl: url },
      cssClass: 'image-viewer-modal'
    });
    await modal.present();
  }

async ngOnInit() {
  // 1) Read any of the possible param names + query fallback
  const inspectionId =
    this.route.snapshot.paramMap.get('inspectionId') ??
    this.route.snapshot.paramMap.get('vanId') ??
    this.route.snapshot.paramMap.get('id') ??
    this.route.snapshot.queryParamMap.get('id');

  this.reviewMode = this.route.snapshot.queryParamMap.get('review') === '1';

  const base = collection(this.firestore, 'inspections') as CollectionReference<InspectionDoc>;

  try {
    this.loading = true;

    if (inspectionId) {
      // ===== Path A: We were given a specific inspection (from the modal) =====
      const currSnap = await getDocs(
        query(base, where('__name__', '==', inspectionId), limit(1))
      );
      const currDoc = currSnap.docs[0];
      if (!currDoc) throw new Error('Inspection not found.');

      const curr = { id: currDoc.id, ...(currDoc.data() as InspectionDoc) };
      this.currInspectionId = currDoc.id;

      // figure out the van and time so we can get the previous one
      this.vanNumber = curr.vanNumber;
      const before = curr.createdAt ?? curr.reportSubmittedAt;

      // previous for same van, earlier timestamp
      const prevSnap = await getDocs(
        query(
          base,
          where('vanNumber', '==', this.vanNumber),
          ...(before ? [where('createdAt', '<', before)] : []),
          orderBy('createdAt', 'desc'),
          limit(1)
        )
      );
      const prevDoc = prevSnap.docs[0];
      const prev = prevDoc ? (prevDoc.data() as InspectionDoc) : undefined;

      this.buildComparisonRows([curr, prev].filter(Boolean) as InspectionDoc[]);
    } else {
      // ===== Path B: No id given — fall back to your vanNumber logic =====
      this.routeParam = this.route.snapshot.paramMap.get('vanId') ?? '';
      this.vanNumber = this.normalizeVanNumber(this.routeParam);

      try {
        const snaps = await this.fetchLatestTwo(base, 'createdAt');
        this.currInspectionId = snaps[0]?.id ?? null;
        this.buildComparisonRows(snaps.map(s => s.data()));
      } catch {
        try {
          const snaps = await this.fetchLatestTwo(base, 'reportSubmittedAt');
          this.currInspectionId = snaps[0]?.id ?? null;
          this.buildComparisonRows(snaps.map(s => s.data()));
        } catch {
          const q3 = query(base, where('vanNumber', '==', this.vanNumber), limit(2));
          const snap = await getDocs(q3);
          const docs = snap.docs as QueryDocumentSnapshot<InspectionDoc>[];
          this.currInspectionId = docs[0]?.id ?? null;
          this.buildComparisonRows(docs.map(d => d.data()));
        }
      }
    }
  } catch (e: any) {
    this.errorMsg = e?.message ?? 'Could not load inspections. Check Firestore rules/indexes.';
  } finally {
    this.loading = false;
  }
}


  private async fetchLatestTwo(
    base: CollectionReference<InspectionDoc>,
    orderField: 'createdAt' | 'reportSubmittedAt'
  ) {
    const q1 = query(
      base,
      where('vanNumber', '==', this.vanNumber),
      orderBy(orderField, 'desc'),
      limit(2)
    );
    const snap = await getDocs(q1); // needs composite index (vanNumber asc, orderField desc)
    return snap.docs as QueryDocumentSnapshot<InspectionDoc>[];
  }

  private buildComparisonRows(reports: InspectionDoc[]) {
    const order: Side[] = ['front', 'passenger', 'rear', 'driver'];

    const prev = reports[1]?.photos ?? {};
    const curr = reports[0]?.photos ?? {};
    this.prevReportItems = Array.isArray(reports[1]?.report) ? reports[1]!.report! : [];
    this.currReportItems = Array.isArray(reports[0]?.report) ? reports[0]!.report! : [];

    this.comparisonRows = order.map(side => ({
      side,
      prevUrl: (prev as any)[side] ?? '',
      currUrl: (curr as any)[side] ?? ''
    }));
  }

  private normalizeVanNumber(param: string): string {
    if (!param) return '';
    if (param.includes('-')) {
      const parts = param.split('-');
      return (parts[1] ?? '').replace(/^0+/, '') || '';
    }
    return param;
  }

  // ----- Approve / Deny (temporary review bar) -----

  async approve() {
    if (!this.currInspectionId) return;
    await this.insp.approveInspection(this.currInspectionId);
    (await this.toast.create({ message: 'Approved', duration: 1400 })).present();
    this.router.navigate(['/admin']); // change to your dashboard route
  }

  async deny() {
    if (!this.currInspectionId) return;
    const a = await this.alert.create({
      header: 'Reject submission?',
      inputs: [{ name: 'reason', type: 'text', placeholder: 'Reason (optional)' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Reject', role: 'confirm', handler: async (data:any) => {
            await this.insp.rejectInspection(this.currInspectionId!, data?.reason);
            (await this.toast.create({ message: 'Rejected', duration: 1400 })).present();
            this.router.navigate(['/admin']); // change to your dashboard route
          }
        }
      ]
    });
    await a.present();
  }
}
