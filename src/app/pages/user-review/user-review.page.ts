import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonCheckbox,
  IonTextarea,
  IonButton,
  ToastController
} from '@ionic/angular/standalone';
import { InspectionService } from '../../services/inspection.service';

interface IssueCategory {
  name: string;
  hasIssue: boolean;
  details: string;
}

@Component({
  standalone: true,
  selector: 'app-user-review',
  templateUrl: './user-review.page.html',
  styleUrls: ['./user-review.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonCheckbox,
    IonTextarea,
    IonButton
  ]
})
export class UserReviewPage implements OnInit {
  inspections: any[] = [];

  issueCategories: IssueCategory[] = [
    { name: 'Powertrain', hasIssue: false, details: '' },
    { name: 'Chassis & Running Gear', hasIssue: false, details: '' },
    { name: 'Electrical & Electronics', hasIssue: false, details: '' },
    { name: 'HVAC & Comfort', hasIssue: false, details: '' },
    { name: 'Body & Interior', hasIssue: false, details: '' },
    { name: 'Safety & Security', hasIssue: false, details: '' },
    { name: 'Fluids & Maintenance', hasIssue: false, details: '' }
  ];

  constructor(
    private insp: InspectionService,
    private toastCtrl: ToastController
  ) {}

  async ngOnInit() {
    this.inspections = await this.insp.getAllInspections();
  }

  /** Gathers issues and shows confirmation */
  async submitReview() {
    const reported = this.issueCategories
      .filter(cat => cat.hasIssue)
      .map(cat => ({ name: cat.name, details: cat.details }));

    // TODO: Save `reported` to Firestore under the current inspection

    const toast = await this.toastCtrl.create({
      message: 'Issues submitted successfully!',
      color: 'success',
      duration: 2000,
      position: 'top'
    });
    await toast.present();

    // Optionally, navigate or reset the form here
  }
}
