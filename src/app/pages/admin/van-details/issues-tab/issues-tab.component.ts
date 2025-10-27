import { Component, Input, OnInit, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { AddIssueModalComponent } from './add-issue-modal.component';
import { InspectionService, Inspection } from 'src/app/services/inspection.service';
import { AuthService } from 'src/app/services/auth.service';

interface IssueRecord {
  id: string;
  title: string;
  category: string;
  subcategory?: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'resolved';
  reportedDate: Date;
  resolvedDate?: Date;
  reportedBy: string;
  assignedTo?: string;
  inspectionId?: string;
}

@Component({
  selector: 'app-issues-tab',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="issues-tab-content">
      <div class="section-header">
        <div class="header-content">
          <div class="header-text">
            <h3>Issues & Reports</h3>
            <p class="section-subtitle">Reported issues and their resolution status</p>
          </div>
          <ion-button 
            fill="solid" 
            color="primary" 
            size="small"
            (click)="openAddIssueModal()"
            class="add-issue-button">
            <ion-icon name="add" slot="start"></ion-icon>
            Add Issue
          </ion-button>
        </div>
      </div>

      <!-- Issue Tabs -->
      <div class="issue-tabs">
        <ion-button 
          [fill]="activeIssueTab === 'open' ? 'solid' : 'outline'"
          [color]="activeIssueTab === 'open' ? 'danger' : 'medium'"
          (click)="setActiveIssueTab('open')"
          class="tab-button">
          <ion-icon name="alert-circle" slot="start"></ion-icon>
          Open ({{ getOpenIssues() }})
        </ion-button>
        
        <ion-button 
          [fill]="activeIssueTab === 'resolved' ? 'solid' : 'outline'"
          [color]="activeIssueTab === 'resolved' ? 'success' : 'medium'"
          (click)="setActiveIssueTab('resolved')"
          class="tab-button">
          <ion-icon name="checkmark-circle" slot="start"></ion-icon>
          Resolved ({{ getResolvedIssues() }})
        </ion-button>
      </div>

      <!-- Issues List -->
      <div class="issues-list">
        <ion-card *ngFor="let issue of getFilteredIssues()" class="issue-card" [class]="'severity-' + issue.severity">
          <ion-card-content>
            <div class="issue-header">
              <div class="issue-priority">
                <ion-icon [name]="getSeverityIcon(issue.severity)" 
                         [class]="'severity-icon ' + issue.severity"></ion-icon>
                <div class="severity-label">{{ getSeverityLabel(issue.severity) }}</div>
              </div>
              
              <div class="issue-info">
                <h4>{{ issue.title }}</h4>
                <div class="issue-meta">
                  <span class="category">{{ issue.category }}</span>
                  <span *ngIf="issue.subcategory" class="subcategory">• {{ issue.subcategory }}</span>
                </div>
              </div>

              <div class="issue-actions">
                <ion-chip [color]="getStatusColor(issue.status)" class="status-chip">
                  <ion-icon [name]="getStatusIcon(issue.status)"></ion-icon>
                  <ion-label>{{ getStatusLabel(issue.status) }}</ion-label>
                </ion-chip>
                
                <ion-button 
                  *ngIf="issue.status === 'open'"
                  fill="clear" 
                  size="small" 
                  color="success"
                  (click)="markAsResolved(issue)"
                  class="resolve-button">
                  <ion-icon name="checkmark-circle" slot="start"></ion-icon>
                  Mark Resolved
                </ion-button>
              </div>
            </div>

            <div class="issue-description">
              {{ issue.description }}
            </div>

            <div class="issue-footer">
              <div class="issue-people">
                <span class="reported-by">
                  <ion-icon name="person" class="person-icon"></ion-icon>
                  {{ issue.reportedBy }}
                </span>
                <span *ngIf="issue.assignedTo" class="assigned-to">
                  <ion-icon name="person-circle" class="person-icon"></ion-icon>
                  Assigned: {{ issue.assignedTo }}
                </span>
              </div>
              
              <div class="issue-dates">
                <span class="reported-date">
                  <ion-icon name="calendar" class="date-icon"></ion-icon>
                  {{ formatDate(issue.reportedDate) }}
                </span>
                <span *ngIf="issue.resolvedDate" class="resolved-date">
                  <ion-icon name="checkmark" class="date-icon"></ion-icon>
                  Resolved: {{ formatDate(issue.resolvedDate) }}
                </span>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Empty State -->
        <div *ngIf="getFilteredIssues().length === 0" class="empty-state">
          <ion-icon [name]="activeIssueTab === 'open' ? 'checkmark-done-circle' : 'time'" 
                   [class]="'empty-icon ' + (activeIssueTab === 'open' ? 'success' : 'medium')"></ion-icon>
          <h3>{{ activeIssueTab === 'open' ? 'No Open Issues' : 'No Resolved Issues' }}</h3>
          <p>{{ activeIssueTab === 'open' ? 'All issues have been resolved. Great work!' : 'No issues have been resolved yet.' }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .issues-tab-content {
      .section-header {
        margin-bottom: 20px;
        padding: 0 16px;
        
        @media (max-width: 768px) {
          padding: 0 8px;
        }
        
        @media (max-width: 480px) {
          padding: 0 4px;
        }
        
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }
        
        .header-text {
          flex: 1;
        }
        
        h3 {
          font-size: 1.2rem;
          font-weight: 600;
          color: var(--ion-color-dark);
          margin: 0 0 8px 0;
          
          @media (max-width: 480px) {
            font-size: 1rem;
          }
        }
        
        .section-subtitle {
          font-size: 0.9rem;
          color: var(--ion-color-medium);
          margin: 0;
          
          @media (max-width: 480px) {
            font-size: 0.8rem;
          }
        }
        
        .add-issue-button {
          --height: 36px;
          font-size: 0.85rem;
          white-space: nowrap;
        }
      }

      .issue-tabs {
        display: flex;
        gap: 12px;
        margin-bottom: 20px;
        
        .tab-button {
          flex: 1;
          --height: 40px;
          font-size: 0.9rem;
          font-weight: 600;
        }
      }

      .issues-list {
        // Padding removed - using tab-content padding
      }

      .issue-card {
        margin-bottom: 12px;
        border-left: 4px solid transparent;
        width: 100% !important;
        max-width: 100% !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
        
        ion-card-content {
          padding: 16px;
          
          @media (max-width: 480px) {
            padding: 12px;
          }
        }

        &.severity-critical {
          border-left-color: var(--ion-color-danger);
        }

        &.severity-high {
          border-left-color: var(--ion-color-warning);
        }

        &.severity-medium {
          border-left-color: var(--ion-color-primary);
        }

        &.severity-low {
          border-left-color: var(--ion-color-success);
        }
      }
      
      .issue-card.md.hydrated {
        width: 100% !important;
        max-width: 100% !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
        
        ion-card-content {
          padding: 16px !important;
          
          @media (max-width: 480px) {
            padding: 12px !important;
          }
        }
      }

      .issue-header {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        margin-bottom: 12px;

        .issue-priority {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 60px;

          .severity-icon {
            font-size: 20px;
            margin-bottom: 4px;
            
            &.critical {
              color: var(--ion-color-danger);
            }
            
            &.high {
              color: var(--ion-color-warning);
            }
            
            &.medium {
              color: var(--ion-color-primary);
            }
            
            &.low {
              color: var(--ion-color-success);
            }
          }

          .severity-label {
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            color: var(--ion-color-medium);
          }
        }

        .issue-info {
          flex: 1;

          h4 {
            font-size: 1rem;
            font-weight: 600;
            color: var(--ion-color-dark);
            margin: 0 0 6px 0;
            line-height: 1.3;
          }

          .issue-meta {
            display: flex;
            gap: 4px;
            flex-wrap: wrap;

            .category,
            .subcategory {
              font-size: 0.85rem;
              color: var(--ion-color-medium-tint);
            }

            .category {
              font-weight: 500;
            }
          }
        }

        .issue-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;

          .status-chip {
            height: 28px;
            font-size: 0.8rem;
          }

          .resolve-button {
            --height: 32px;
            font-size: 0.8rem;
            font-weight: 600;
          }
        }
      }

      .issue-description {
        background: var(--ion-color-light);
        border-radius: 8px;
        padding: 12px;
        font-size: 0.9rem;
        line-height: 1.4;
        color: var(--ion-color-dark-tint);
        margin-bottom: 12px;
      }

      .issue-footer {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 16px;
        font-size: 0.85rem;
        color: var(--ion-color-medium);

        .issue-dates,
        .issue-people {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .reported-date,
        .resolved-date,
        .reported-by,
        .assigned-to {
          display: flex;
          align-items: center;
          gap: 6px;

          .date-icon,
          .person-icon {
            font-size: 14px;
            color: var(--ion-color-medium);
          }
        }

        .resolved-date {
          color: var(--ion-color-success);

          .date-icon {
            color: var(--ion-color-success);
          }
        }

        .assigned-to {
          font-weight: 500;
        }
      }

      .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: var(--ion-color-medium);

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
          
          &.success {
            color: var(--ion-color-success);
            opacity: 0.8;
          }
        }

        h3 {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0 0 8px 0;
          color: var(--ion-color-success);
        }

        p {
          font-size: 0.9rem;
          margin: 0;
        }
      }
    }

    // Responsive adjustments
    @media (max-width: 768px) {
      .issue-header {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;

        .issue-priority {
          flex-direction: row;
          align-items: center;
          min-width: auto;
          gap: 8px;

          .severity-icon {
            margin-bottom: 0;
          }
        }

        .status-chip {
          align-self: flex-end;
        }
      }

      .issue-footer {
        flex-direction: column;
        gap: 12px;

        .issue-dates,
        .issue-people {
          align-self: stretch;
        }
      }
    }
  `]
})
export class IssuesTabComponent implements OnInit {
  @Input() vanId!: string;
  @Output() issueAdded = new EventEmitter<{ severity: string; category: string }>();

  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);
  private inspectionService = inject(InspectionService);
  private authService = inject(AuthService);

  issueRecords: IssueRecord[] = [];
  activeIssueTab: 'open' | 'resolved' = 'open';

  ngOnInit() {
    this.loadIssueRecords();
  }

  // Public method to refresh issues (can be called from parent component)
  async refreshIssues() {
    await this.loadIssueRecords();
  }

  private async loadIssueRecords() {
    try {
      console.log('Loading issue records for vanId:', this.vanId);
      
      // Get van data to determine vanType and vanNumber
      const vanData = await this.getVanData();
      console.log('Van data:', vanData);
      
      if (!vanData) {
        console.error('Could not load van data');
        return;
      }

      // Load all approved inspections for this van
      const approvedInspections = await this.inspectionService.getApprovedInspectionsByVan(
        vanData.vanType, 
        vanData.vanNumber
      );
      
      console.log('Approved inspections:', approvedInspections);

      // Convert approved inspection reports to issue records
      this.issueRecords = [];
      for (const inspection of approvedInspections) {
        console.log('Processing inspection:', inspection.id, 'Status:', inspection.status, 'Report:', inspection.report);
        
        if (inspection.report && inspection.report.length > 0) {
          // Get submitter display name
          let submitterName = 'Unknown';
          if (inspection.createdBy) {
            try {
              const userProfile = await this.authService.getUserProfile(inspection.createdBy);
              submitterName = userProfile?.displayName || 'Unknown';
            } catch (error) {
              console.error('Failed to load user profile:', error);
            }
          }

          // Convert each reported issue to an IssueRecord
          for (const reportedIssue of inspection.report) {
            console.log('Converting issue:', reportedIssue);
            
            const issueRecord: IssueRecord = {
              id: `${inspection.id}_${reportedIssue.name}`,
              title: reportedIssue.name,
              category: 'Driver Report', // Default category for driver-reported issues
              subcategory: reportedIssue.subcategory,
              description: reportedIssue.details,
              severity: reportedIssue.severity || 'low',
              status: reportedIssue.status || 'open', // Use status from database or default to open
              reportedDate: inspection.createdAt?.toDate ? inspection.createdAt.toDate() : new Date(),
              resolvedDate: reportedIssue.resolvedDate ? new Date(reportedIssue.resolvedDate) : undefined,
              reportedBy: submitterName,
              inspectionId: inspection.id
            };
            this.issueRecords.push(issueRecord);
          }
        }
      }

      console.log('Final issue records:', this.issueRecords);

      // Sort by reported date (newest first)
      this.issueRecords.sort((a, b) => b.reportedDate.getTime() - a.reportedDate.getTime());

    } catch (error) {
      console.error('Failed to load issue records:', error);
      this.issueRecords = [];
    }
  }

  private async getVanData(): Promise<{vanType: string, vanNumber: string} | null> {
    try {
      // This is a simplified approach - in a real app, you might want to pass van data as input
      // For now, we'll extract it from the vanId or make an additional call
      // Since we have the vanId, we can make a call to get van details
      const vanDoc = await this.inspectionService.getVanByDocId(this.vanId);
      if (vanDoc) {
        return {
          vanType: vanDoc.vanType,
          vanNumber: vanDoc.vanNumber
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get van data:', error);
      return null;
    }
  }

  getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical': return 'alert';
      case 'high': return 'warning';
      case 'medium': return 'information-circle';
      case 'low': return 'ellipse';
      default: return 'help';
    }
  }

  getSeverityLabel(severity: string): string {
    switch (severity) {
      case 'critical': return 'Critical';
      case 'high': return 'High';
      case 'medium': return 'Medium';
      case 'low': return 'Low';
      default: return 'Unknown';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'open': return 'danger';
      case 'resolved': return 'success';
      default: return 'medium';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'open': return 'alert-circle';
      case 'resolved': return 'checkmark-circle';
      default: return 'help-circle';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'open': return 'Open';
      case 'resolved': return 'Resolved';
      default: return 'Unknown';
    }
  }

  getOpenIssues(): number {
    return this.issueRecords.filter(i => i.status === 'open').length;
  }

  getResolvedIssues(): number {
    return this.issueRecords.filter(i => i.status === 'resolved').length;
  }

  getFilteredIssues(): IssueRecord[] {
    return this.issueRecords.filter(issue => issue.status === this.activeIssueTab);
  }

  setActiveIssueTab(tab: 'open' | 'resolved') {
    this.activeIssueTab = tab;
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  async markAsResolved(issue: IssueRecord) {
    try {
      if (!issue.inspectionId) {
        throw new Error('No inspection ID found for this issue');
      }
      
      // Update the issue in the database
      await this.inspectionService.markIssueResolved(issue.inspectionId, issue.title);
      
      // Update the local issue status
      issue.status = 'resolved';
      issue.resolvedDate = new Date();
      
      const toast = await this.toastCtrl.create({
        message: 'Issue marked as resolved',
        duration: 2000,
        color: 'success'
      });
      await toast.present();
    } catch (error) {
      console.error('Failed to mark issue as resolved:', error);
      const toast = await this.toastCtrl.create({
        message: 'Failed to mark issue as resolved',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  async openAddIssueModal() {
    const modal = await this.modalCtrl.create({
      component: AddIssueModalComponent,
      cssClass: 'add-issue-modal'
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();
    
    if (role === 'saved' && data) {
      // Add the new issue to the list
      this.issueRecords.unshift(data);
      
      // Check if severity is medium or higher and emit event for grounding
      if (data.severity === 'medium' || data.severity === 'high' || data.severity === 'critical') {
        this.issueAdded.emit({
          severity: data.severity,
          category: data.category
        });
      }
      
      const toast = await this.toastCtrl.create({
        message: 'Issue added successfully',
        duration: 2000,
        color: 'success'
      });
      await toast.present();
    }
  }
}