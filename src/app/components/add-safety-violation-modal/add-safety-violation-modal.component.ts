import { Component, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  ModalController, 
  ToastController
} from '@ionic/angular/standalone';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonItem,
  IonLabel,
  IonRadioGroup,
  IonRadio,
  IonInput,
  IonTextarea,
  IonGrid,
  IonRow,
  IonCol
} from '@ionic/angular/standalone';
import { SAFETY_VIOLATION_TYPES, SafetyViolationType } from '../../models/safety-violation.model';

@Component({
  selector: 'app-add-safety-violation-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonItem,
    IonLabel,
    IonRadioGroup,
    IonRadio,
    IonInput,
    IonTextarea,
    IonGrid,
    IonRow,
    IonCol
  ],
  templateUrl: './add-safety-violation-modal.component.html',
  styleUrls: ['./add-safety-violation-modal.component.scss']
})
export class AddSafetyViolationModalComponent {
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);

  violationTypes = SAFETY_VIOLATION_TYPES;
  selectedViolationType: SafetyViolationType | null = null;
  selectedDate: string = '';
  notes: string = '';

  constructor() {
    // Set default to today
    const now = new Date();
    this.selectedDate = now.toISOString().split('T')[0];
    // Select first violation type by default
    this.selectedViolationType = this.violationTypes[0];
  }

  openDatePicker(event: Event): void {
    // Find the native input element within the ion-item
    const target = event.currentTarget as HTMLElement;
    const nativeInput = target.querySelector('input[type="date"]') as HTMLInputElement;
    if (nativeInput) {
      // Prevent the click from bubbling
      event.stopPropagation();
      if (nativeInput.showPicker) {
        nativeInput.showPicker();
      } else {
        nativeInput.focus();
        nativeInput.click();
      }
    }
  }

  async save(): Promise<void> {
    if (!this.selectedViolationType) {
      const toast = await this.toastCtrl.create({
        message: 'Please select a violation type',
        duration: 2000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    if (!this.selectedDate) {
      const toast = await this.toastCtrl.create({
        message: 'Please select a date',
        duration: 2000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    // Set time to start of day (00:00:00) for the selected date
    const occurredAt = new Date(`${this.selectedDate}T00:00:00`);

    await this.modalCtrl.dismiss({
      violationType: this.selectedViolationType,
      occurredAt,
      notes: this.notes.trim() || undefined
    }, 'saved');
  }

  dismiss(): void {
    this.modalCtrl.dismiss(null, 'cancelled');
  }
}

