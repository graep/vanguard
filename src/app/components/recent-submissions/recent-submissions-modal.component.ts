// recent-submissions-modal.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';                  // ✅ for ngModel
import {
  IonicModule,
  AlertController,
  ToastController,
  ModalController
} from '@ionic/angular';
import { Observable } from 'rxjs';
import { InspectionService, Inspection } from '../../services/inspection.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-recent-submissions-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],           // ✅ include FormsModule
  templateUrl: './recent-submissions-modal.component.html',
  styleUrls: ['./recent-submissions-modal.component.scss']
})
export class RecentSubmissionsModalComponent {
  @Input() pageSize = 12;

  // ✅ bound in the template's ion-segment
  onlyUnseen = true;

  items$!: Observable<Inspection[]>;
  busy = new Set<string>();

  constructor(
    private insp: InspectionService,
    private toast: ToastController,
    private alert: AlertController,
    private router: Router,
    private modalCtrl: ModalController
  ) {}

  ngOnInit() {
    this.reload();                                            // ✅ initial load
  }

  // ✅ called by (ionChange) on the segment
  reload() {
    this.items$ = this.insp.pendingSubmissions$(this.onlyUnseen, this.pageSize);
  }

  close() { this.modalCtrl.dismiss(); }

  isBusy(id: string) { return this.busy.has(id); }

  async view(i: Inspection) {
    try { await this.insp.markSeen(i.id); } catch {}
    await this.modalCtrl.dismiss();
    this.router.navigate(['/van-report', i.id], { queryParams: { review: '1' } });
  }

  async approve(i: Inspection) {
    if (this.busy.has(i.id)) return;
    this.busy.add(i.id);
    try {
      await this.insp.approveInspection(i.id);
      (await this.toast.create({ message: 'Approved', duration: 1400 })).present();
    } catch (e: any) {
      (await this.toast.create({ message: e?.message ?? 'Approve failed', color: 'danger', duration: 1800 })).present();
    } finally {
      this.busy.delete(i.id);
    }
  }

  async reject(i: Inspection) {
    const a = await this.alert.create({
      header: 'Reject submission?',
      inputs: [{ name: 'reason', type: 'text', placeholder: 'Reason (optional)' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Reject', role: 'confirm', handler: async (data: any) => {
            this.busy.add(i.id);
            try {
              await this.insp.rejectInspection(i.id, data?.reason);
              (await this.toast.create({ message: 'Rejected', duration: 1400 })).present();
            } finally {
              this.busy.delete(i.id);
            }
          }
        }
      ]
    });
    await a.present();
  }
}
