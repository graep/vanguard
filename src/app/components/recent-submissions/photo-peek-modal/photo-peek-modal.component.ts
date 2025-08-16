// src/app/components/recent-submissions-card/photo-peek-modal.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { Inspection } from '../../../services/inspection.service';

@Component({
  selector: 'app-photo-peek-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
  <ion-header>
    <ion-toolbar>
      <ion-title>{{inspection?.vanType}}-{{inspection?.vanNumber}}</ion-title>
      <ion-buttons slot="end"><ion-button (click)="close()">Close</ion-button></ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-padding">
    <ion-grid *ngIf="photos.length; else none">
      <ion-row>
        <ion-col size="6" *ngFor="let p of photos">
          <ion-img [src]="p.url"></ion-img>
          <ion-text color="medium"><small>{{ p.label }}</small></ion-text>
        </ion-col>
      </ion-row>
    </ion-grid>
    <ng-template #none><p>No photos.</p></ng-template>
  </ion-content>
  `
})
export class PhotoPeekModalComponent {
  @Input() inspection!: Inspection | null;
  constructor(private modal: ModalController) {}
  get photos() {
    const p = this.inspection?.photos ?? {};
    return Object.keys(p).map(k => ({ label: k, url: (p as any)[k] }));
  }
  close(){ this.modal.dismiss(); }
}
