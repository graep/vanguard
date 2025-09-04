// recent-submissions-modal.component.ts
import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './recent-submissions-modal.component.html',
  styleUrls: ['./recent-submissions-modal.component.scss']
})
export class RecentSubmissionsModalComponent implements OnInit {
  @Input() pageSize = 12;

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
    this.reload();
  }

  reload() {
    this.items$ = this.insp.pendingSubmissions$(this.onlyUnseen, this.pageSize);
  }

  close() { 
    this.modalCtrl.dismiss(); 
  }

  isBusy(id: string) { 
    return this.busy.has(id); 
  }

  trackById(index: number, item: Inspection) {
    return item.id;
  }

  async view(item: Inspection) {
    console.log('Viewing inspection:', item);
    
    try { 
      await this.insp.markSeen(item.id); 
    } catch (error) {
      console.log('Could not mark as seen:', error);
    }
    
    await this.modalCtrl.dismiss();
    this.router.navigate(['/van-report', item.id], { 
      queryParams: { review: '1' } 
    });
  }

  async approve(item: Inspection) {
    if (this.busy.has(item.id)) return;
    
    this.busy.add(item.id);
    
    try {
      await this.insp.approveInspection(item.id);
      const toast = await this.toast.create({ 
        message: 'Approved', 
        duration: 2000,
        color: 'success'
      });
      await toast.present();
    } catch (error: any) {
      const toast = await this.toast.create({ 
        message: error?.message || 'Approve failed', 
        color: 'danger', 
        duration: 2000
      });
      await toast.present();
    } finally {
      this.busy.delete(item.id);
    }
  }

  async reject(item: Inspection) {
    if (this.busy.has(item.id)) return;

    const alert = await this.alert.create({
      header: 'Reject Submission',
      message: `Reject ${item.vanType} ${item.vanNumber}?`,
      inputs: [
        { 
          name: 'reason', 
          type: 'textarea', 
          placeholder: 'Reason (optional)',
          attributes: { maxlength: 200 }
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Reject', 
          role: 'confirm',
          handler: async (data: any) => {
            await this.performReject(item, data?.reason);
          }
        }
      ]
    });
    
    await alert.present();
  }

  private async performReject(item: Inspection, reason: string) {
    this.busy.add(item.id);
    
    try {
      await this.insp.rejectInspection(item.id, reason);
      const toast = await this.toast.create({ 
        message: 'Rejected', 
        duration: 2000,
        color: 'warning'
      });
      await toast.present();
    } catch (error: any) {
      const toast = await this.toast.create({ 
        message: error?.message || 'Reject failed', 
        color: 'danger', 
        duration: 2000
      });
      await toast.present();
    } finally {
      this.busy.delete(item.id);
    }
  }
}