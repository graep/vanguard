import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonChip,
  IonAlert,
  IonToast,
  IonSpinner,
  AlertController,
  ToastController,
  ModalController
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { WorkBlockService } from '../../../services/work-block.service';
import { WorkBlock, WorkBlockFormData } from '../../../models/work-block.model';
import { AuthService } from '../../../services/auth.service';
import { BreadcrumbService } from '../../../services/breadcrumb.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-work-blocks',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonChip,
    IonSpinner
  ],
  templateUrl: './work-blocks.page.html',
  styleUrls: ['./work-blocks.page.scss']
})
export class WorkBlocksPage implements OnInit {
  private workBlockService = inject(WorkBlockService);
  private authService = inject(AuthService);
  private breadcrumbService = inject(BreadcrumbService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private router = inject(Router);

  workBlocks: WorkBlock[] = [];
  isLoading = false;
  showCreateForm = false;
  editingBlock: WorkBlock | null = null;

  // Form data
  formData: WorkBlockFormData = {
    name: '',
    startTime: '',
    endTime: '',
    duties: [],
    color: '#3b82f6'
  };
  newDuty = '';

  constructor() {}

  ngOnInit() {
    this.breadcrumbService.setTail([
      { label: 'Admin', url: '/admin' },
      { label: 'Work Blocks', url: '/admin/work-blocks' }
    ]);
    this.loadWorkBlocks();
  }

  async loadWorkBlocks() {
    this.isLoading = true;
    try {
      const blocks = await firstValueFrom(this.workBlockService.getAllWorkBlocks());
      this.workBlocks = blocks;
    } catch (error) {
      console.error('Error loading work blocks:', error);
      this.showToast('Error loading work blocks', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  openCreateForm() {
    this.editingBlock = null;
    this.formData = {
      name: '',
      startTime: '',
      endTime: '',
      duties: [],
      color: '#3b82f6'
    };
    this.newDuty = '';
    this.showCreateForm = true;
  }

  openEditForm(block: WorkBlock) {
    this.editingBlock = block;
    this.formData = {
      name: block.name,
      startTime: block.startTime,
      endTime: block.endTime,
      duties: [...block.duties],
      color: block.color || '#3b82f6'
    };
    this.newDuty = '';
    this.showCreateForm = true;
  }

  closeForm() {
    this.showCreateForm = false;
    this.editingBlock = null;
    this.formData = {
      name: '',
      startTime: '',
      endTime: '',
      duties: [],
      color: '#3b82f6'
    };
    this.newDuty = '';
  }

  addDuty() {
    if (this.newDuty.trim()) {
      this.formData.duties.push(this.newDuty.trim());
      this.newDuty = '';
    }
  }

  removeDuty(index: number) {
    this.formData.duties.splice(index, 1);
  }

  async saveWorkBlock() {
    // Validation
    if (!this.formData.name.trim()) {
      this.showToast('Please enter a work block name', 'warning');
      return;
    }

    if (!this.formData.startTime || !this.formData.endTime) {
      this.showToast('Please enter both start and end times', 'warning');
      return;
    }

    if (!this.workBlockService.isValidTimeFormat(this.formData.startTime)) {
      this.showToast('Invalid start time format. Use HH:mm (e.g., 08:00)', 'warning');
      return;
    }

    if (!this.workBlockService.isValidTimeFormat(this.formData.endTime)) {
      this.showToast('Invalid end time format. Use HH:mm (e.g., 17:00)', 'warning');
      return;
    }

    if (!this.workBlockService.isValidTimeRange(this.formData.startTime, this.formData.endTime)) {
      this.showToast('End time must be after start time', 'warning');
      return;
    }

    try {
      const currentUser = this.authService.currentUser$.value;
      const userId = currentUser?.uid;

      if (this.editingBlock) {
        // Update existing
        await this.workBlockService.updateWorkBlock(
          this.editingBlock.id,
          {
            name: this.formData.name.trim(),
            startTime: this.formData.startTime,
            endTime: this.formData.endTime,
            duties: this.formData.duties,
            color: this.formData.color
          },
          userId
        );
        this.showToast('Work block updated successfully', 'success');
      } else {
        // Create new
        await this.workBlockService.createWorkBlock(
          {
            name: this.formData.name.trim(),
            startTime: this.formData.startTime,
            endTime: this.formData.endTime,
            duties: this.formData.duties,
            color: this.formData.color
          },
          userId
        );
        this.showToast('Work block created successfully', 'success');
      }

      this.closeForm();
      await this.loadWorkBlocks();
    } catch (error) {
      console.error('Error saving work block:', error);
      this.showToast('Error saving work block', 'danger');
    }
  }

  async deleteWorkBlock(block: WorkBlock) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Work Block',
      message: `Are you sure you want to delete "${block.name}"? This action cannot be undone.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              await this.workBlockService.deleteWorkBlock(block.id);
              this.showToast('Work block deleted successfully', 'success');
              await this.loadWorkBlocks();
            } catch (error) {
              console.error('Error deleting work block:', error);
              this.showToast('Error deleting work block', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  formatTime(time: string): string {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  getDuration(startTime: string, endTime: string): string {
    if (!startTime || !endTime) return '';
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    const startTotal = startHours * 60 + startMinutes;
    const endTotal = endHours * 60 + endMinutes;
    const durationMinutes = endTotal - startTotal;
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${minutes}m`;
    }
  }

  async showToast(message: string, color: 'success' | 'warning' | 'danger' = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}

