// src/app/pages/van-detail/van-detail.page.ts
import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { Van } from '../../../models/van.model';
import { InspectionService } from '../../../services/inspection.service';
import { NotesHistoryService } from '../../../services/notes-history.service';
import { IssuesTabComponent } from "./issues-tab/issues-tab.component";
import { MaintenanceTabComponent } from "./maintenance-tab/maintenance-tab.component";
import { NotesTabComponent } from "./notes-tab/notes-tab.component";
import { DriversTabComponent } from "./drivers-tab/drivers-tab.component";


@Component({
  selector: 'app-van-details',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, IssuesTabComponent, MaintenanceTabComponent, NotesTabComponent, DriversTabComponent],
  templateUrl: './van-details.page.html',
  styleUrls: ['./van-details.page.scss']
})
export class VanDetailsPage implements OnInit {
  @ViewChild('notesTab') notesTab!: NotesTabComponent;
  @ViewChild('issuesTab') issuesTab!: IssuesTabComponent;
  
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private firestore = inject(Firestore);
  private inspectionService = inject(InspectionService);
  private notesHistoryService = inject(NotesHistoryService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  van: Van | null = null;
  loading = true;
  errorMsg = '';
  activeTab: string = 'notes';
  tabs = [
    { id: 'notes', label: 'Notes', icon: 'document-text' },
    { id: 'issues', label: 'Issues', icon: 'warning' },
    { id: 'maintenance', label: 'Maintenance', icon: 'build' },
    { id: 'drivers', label: 'Drivers', icon: 'person' }
  ];
  latestInspectionId: string | null = null;
  
  // Notes editing state
  editingNotes = false;
  notesText = '';
  originalNotes = '';
  
  // Van type display mapping
  vanTypeLabels: Record<string, string> = {
    'EDV': 'Electric Delivery Van',
    'CDV': 'Cargo Delivery Van',
    'LMR': 'Large Mail Route'
  };

  async ngOnInit() {
    this.loading = true;
    
    const vanId = this.route.snapshot.paramMap.get('id');
    if (!vanId) {
      this.errorMsg = 'No van ID provided';
      this.loading = false;
      return;
    }

    try {
      await this.loadVanData(vanId);
      if (this.van) {
        await this.loadLatestInspection();
      }
    } catch (error: any) {
      this.errorMsg = error.message || 'Failed to load van data';
    } finally {
      this.loading = false;
    }
  }

  private async loadVanData(vanId: string) {
    const vanDocRef = doc(this.firestore, 'vans', vanId);
    const vanDoc = await getDoc(vanDocRef);
    
    if (vanDoc.exists()) {
      this.van = { docId: vanDoc.id, ...vanDoc.data() } as Van;
    } else {
      throw new Error('Van not found');
    }
  }

  private async loadLatestInspection() {
    if (!this.van) return;
    
    try {
      this.latestInspectionId = await this.inspectionService.getLatestInspectionId(
        this.van.type, 
        this.van.number.toString()
      );
    } catch (error: any) {
      // Inspection loading is optional, don't throw error
      console.warn('Could not load latest inspection:', error);
    }
  }

  getVanTypeLabel(): string {
    return this.van ? this.vanTypeLabels[this.van.type.toUpperCase()] || this.van.type : '';
  }

  getVanImage(): string {
    if (!this.van) return '';
    
    // Use custom image if available, otherwise fall back to type-based image
    if (this.van.imageUrl) {
      return this.van.imageUrl;
    }
    
    // Default images based on van type
    const vanType = this.van.type.toUpperCase();
    return `assets/${vanType}.jpg`;
  }

  getStatusColor(): string {
    return this.van?.isGrounded ? 'danger' : 'success';
  }

  getStatusText(): string {
    return this.van?.isGrounded ? 'Grounded' : 'Active';
  }

  getStatusIcon(): string {
    return this.van?.isGrounded ? 'warning' : 'checkmark-circle';
  }

  async viewLatestInspection() {
    if (!this.latestInspectionId) {
      const toast = await this.toastCtrl.create({
        message: 'No inspection reports available for this van',
        duration: 2000,
        color: 'warning'
      });
      toast.present();
      return;
    }

    this.router.navigate(['/van-report', this.latestInspectionId]);
  }

  async startInspection() {
    if (!this.van) return;
    
    this.router.navigate(['/photo-capture', this.van.type, this.van.number]);
  }

  async toggleGroundedStatus() {
    if (!this.van) return;

    const alert = await this.alertCtrl.create({
      header: 'Change Van Status',
      message: `Are you sure you want to ${this.van.isGrounded ? 'activate' : 'ground'} this van?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Confirm',
          handler: async () => {
            try {
              // Update in Firebase
              const vanDocRef = doc(this.firestore, 'vans', this.van!.docId);
              const { setDoc } = await import('@angular/fire/firestore');
              
              await setDoc(vanDocRef, {
                ...this.van,
                isGrounded: !this.van!.isGrounded
              }, { merge: true });

              // Update local state
              this.van!.isGrounded = !this.van!.isGrounded;

              const toast = await this.toastCtrl.create({
                message: `Van ${this.van!.isGrounded ? 'grounded' : 'activated'} successfully`,
                duration: 2000,
                color: 'success'
              });
              toast.present();

            } catch (error: any) {
              const toast = await this.toastCtrl.create({
                message: 'Failed to update van status',
                duration: 2000,
                color: 'danger'
              });
              toast.present();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async groundVanAutomatically(reason: string) {
    if (!this.van || this.van.isGrounded) return;

    try {
      // Update in Firebase
      const vanDocRef = doc(this.firestore, 'vans', this.van.docId);
      const { setDoc } = await import('@angular/fire/firestore');
      
      await setDoc(vanDocRef, {
        ...this.van,
        isGrounded: true
      }, { merge: true });

      // Update local state
      this.van.isGrounded = true;

      const toast = await this.toastCtrl.create({
        message: `Van automatically grounded due to ${reason}`,
        duration: 3000,
        color: 'warning'
      });
      toast.present();

    } catch (error: any) {
      console.error('Failed to ground van automatically:', error);
      const toast = await this.toastCtrl.create({
        message: 'Failed to ground van automatically',
        duration: 2000,
        color: 'danger'
      });
      toast.present();
    }
  }

  startEditingNotes() {
    if (!this.van) return;
    
    this.editingNotes = true;
    this.notesText = '';
    this.originalNotes = '';
  }

  cancelEditingNotes() {
    this.editingNotes = false;
    this.notesText = '';
    this.originalNotes = '';
  }

  hasNotesChanged(): boolean {
    return this.notesText.trim().length > 0;
  }

  async saveNotes() {
    if (!this.van || !this.hasNotesChanged() || !this.notesText.trim()) return;

    try {
      // Add note to history
      await this.notesHistoryService.addNote(this.van.docId, this.notesText.trim());

      // Clear the input and exit edit mode
      this.notesText = '';
      this.originalNotes = '';
      this.editingNotes = false;

      const toast = await this.toastCtrl.create({
        message: 'Note added successfully',
        duration: 2000,
        color: 'success'
      });
      toast.present();

      // Refresh the notes tab to show the new note
      if (this.notesTab) {
        await this.notesTab.refreshNotes();
      } else {
        // Force a re-render by switching tabs briefly
        const currentTab = this.activeTab;
        this.activeTab = 'issues';
        setTimeout(() => {
          this.activeTab = currentTab;
        }, 100);
      }

    } catch (error: any) {
      const toast = await this.toastCtrl.create({
        message: 'Failed to add note',
        duration: 2000,
        color: 'danger'
      });
      toast.present();
    }
  }

  selectTab(tabId: string): void {
    this.activeTab = tabId;
    
    // Refresh issues when switching to issues tab
    if (tabId === 'issues' && this.issuesTab) {
      this.issuesTab.refreshIssues();
    }
  }

  async onIssueAdded(event: { severity: string; category: string }) {
    if (event.severity === 'medium' || event.severity === 'high' || event.severity === 'critical') {
      const severityText = event.severity.charAt(0).toUpperCase() + event.severity.slice(1);
      await this.groundVanAutomatically(`${severityText} severity issue in ${event.category}`);
    }
  }

  goBack() {
    this.router.navigate(['/admin'], { replaceUrl: true });
  }
}