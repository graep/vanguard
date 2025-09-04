import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

interface IssueRecord {
  id: string;
  title: string;
  category: string;
  subcategory?: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
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
        <h3>Issues & Reports</h3>
        <p class="section-subtitle">Reported issues and their resolution status</p>
      </div>

      <!-- Compact Status Boxes -->
      <div class="compact-stats-row">
        <div class="compact-stat-card danger">
          <div class="compact-stat-number">{{ getOpenIssues() }}</div>
          <div class="compact-stat-label">Open</div>
        </div>
        <div class="compact-stat-card warning">
          <div class="compact-stat-number">{{ getInProgressIssues() }}</div>
          <div class="compact-stat-label">In Progress</div>
        </div>
        <div class="compact-stat-card success">
          <div class="compact-stat-number">{{ getResolvedIssues() }}</div>
          <div class="compact-stat-label">Resolved</div>
        </div>
      </div>

      <!-- Issues List -->
      <div class="issues-list">
        <ion-card *ngFor="let issue of issueRecords" class="issue-card" [class]="'severity-' + issue.severity">
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

              <ion-chip [color]="getStatusColor(issue.status)" class="status-chip">
                <ion-icon [name]="getStatusIcon(issue.status)"></ion-icon>
                <ion-label>{{ getStatusLabel(issue.status) }}</ion-label>
              </ion-chip>
            </div>

            <div class="issue-description">
              {{ issue.description }}
            </div>

            <div class="issue-footer">
              <div class="issue-dates">
                <span class="reported-date">
                  <ion-icon name="calendar" class="date-icon"></ion-icon>
                  Reported: {{ formatDate(issue.reportedDate) }}
                </span>
                <span *ngIf="issue.resolvedDate" class="resolved-date">
                  <ion-icon name="checkmark" class="date-icon"></ion-icon>
                  Resolved: {{ formatDate(issue.resolvedDate) }}
                </span>
              </div>
              
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
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Empty State -->
        <div *ngIf="issueRecords.length === 0" class="empty-state">
          <ion-icon name="checkmark-done-circle" class="empty-icon success"></ion-icon>
          <h3>No Issues Reported</h3>
          <p>This van has no reported issues. Great work!</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .issues-tab-content {
      .section-header {
        margin-bottom: 20px;
        
        h3 {
          font-size: 1.2rem;
          font-weight: 600;
          color: var(--ion-color-dark);
          margin: 0 0 8px 0;
        }
        
        .section-subtitle {
          font-size: 0.9rem;
          color: var(--ion-color-medium);
          margin: 0;
        }
      }

      .compact-stats-row {
        display: flex;
        justify-content: space-evenly;
      }

      .issue-card {
        margin-bottom: 12px;
        border-left: 4px solid transparent;

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

        .status-chip {
          align-self: flex-start;
          height: 28px;
          font-size: 0.8rem;
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
        align-items: flex-start;
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

  issueRecords: IssueRecord[] = [];

  ngOnInit() {
    this.loadIssueRecords();
  }

  private loadIssueRecords() {
    // TODO: Load from Firestore inspection reports
    // Placeholder data for now
    this.issueRecords = [
      {
        id: '1',
        title: 'Passenger Side Mirror Adjustment Issue',
        category: 'Body & Interior',
        subcategory: 'Mirrors & Windows',
        description: 'Passenger side mirror does not adjust properly when using electronic controls. May require manual adjustment.',
        severity: 'low',
        status: 'open',
        reportedDate: new Date('2024-12-15'),
        reportedBy: 'Admin User',
        inspectionId: 'insp_123'
      },
      {
        id: '2',
        title: 'Engine Oil Level Low',
        category: 'Fluids & Maintenance',
        subcategory: 'Engine Oil & Filter',
        description: 'Oil level indicator showing below minimum. Requires immediate attention before next operation.',
        severity: 'high',
        status: 'in_progress',
        reportedDate: new Date('2024-12-10'),
        reportedBy: 'Admin User',
        assignedTo: 'Fleet Maintenance Team',
        inspectionId: 'insp_122'
      },
      {
        id: '3',
        title: 'Minor Scratches on Rear Panel',
        category: 'Body & Interior',
        description: 'Cosmetic scratches noted on rear panel. Does not affect functionality but should be addressed for fleet appearance standards.',
        severity: 'low',
        status: 'resolved',
        reportedDate: new Date('2024-11-20'),
        resolvedDate: new Date('2024-12-01'),
        reportedBy: 'Admin User',
        assignedTo: 'Body Shop Team',
        inspectionId: 'insp_121'
      }
    ];
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
      case 'in_progress': return 'warning';
      case 'resolved': return 'success';
      case 'closed': return 'medium';
      default: return 'medium';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'open': return 'alert-circle';
      case 'in_progress': return 'construct';
      case 'resolved': return 'checkmark-circle';
      case 'closed': return 'close-circle';
      default: return 'help-circle';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'open': return 'Open';
      case 'in_progress': return 'In Progress';
      case 'resolved': return 'Resolved';
      case 'closed': return 'Closed';
      default: return 'Unknown';
    }
  }

  getOpenIssues(): number {
    return this.issueRecords.filter(i => i.status === 'open').length;
  }

  getInProgressIssues(): number {
    return this.issueRecords.filter(i => i.status === 'in_progress').length;
  }

  getResolvedIssues(): number {
    return this.issueRecords.filter(i => i.status === 'resolved' || i.status === 'closed').length;
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}