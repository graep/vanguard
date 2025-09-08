import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

interface NoteEntry {
  id: string;
  content: string;
  timestamp: Date;
  author: string;
}

@Component({
  selector: 'app-notes-tab',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="notes-tab-content">
      <div class="section-header">
        <h3>Previous Notes History</h3>
        <p class="section-subtitle">Historical notes for this van</p>
      </div>

      <!-- Current Note -->
      <ion-card *ngIf="currentNotes" class="current-note-card">
        <ion-card-content>
          <div class="note-header">
            <ion-icon name="document-text" class="note-icon current"></ion-icon>
            <div class="note-meta">
              <h4>Current Note</h4>
              <p class="note-date">Active</p>
            </div>
          </div>
          <div class="note-content current">
            {{ currentNotes }}
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Previous Notes List -->
      <div class="notes-list">
        <ion-card *ngFor="let note of previousNotes" class="note-card">
          <ion-card-content>
            <div class="note-header">
              <ion-icon name="document-text" class="note-icon"></ion-icon>
              <div class="note-meta">
                <h4>Note by {{ note.author }}</h4>
                <p class="note-date">{{ formatDate(note.timestamp) }}</p>
              </div>
            </div>
            <div class="note-content">
              {{ note.content }}
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Empty State -->
        <div *ngIf="previousNotes.length === 0" class="empty-state">
          <ion-icon name="document-outline" class="empty-icon"></ion-icon>
          <h3>No Previous Notes</h3>
          <p>This van has no historical notes recorded.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notes-tab-content {
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

      .current-note-card {
        background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
        border-left: 4px solid var(--ion-color-primary);
        margin-bottom: 24px;
      }

      .note-card {
        margin-bottom: 12px;
      }

      .note-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;

        .note-icon {
          font-size: 20px;
          color: var(--ion-color-medium);
          flex-shrink: 0;
          
          &.current {
            color: var(--ion-color-primary);
          }
        }

        .note-meta {
          flex: 1;

          h4 {
            font-size: 1rem;
            font-weight: 600;
            color: var(--ion-color-dark);
            margin: 0 0 4px 0;
          }

          .note-date {
            font-size: 0.85rem;
            color: var(--ion-color-medium);
            margin: 0;
          }
        }
      }

      .note-content {
        background: var(--ion-color-light);
        border-radius: 8px;
        padding: 12px;
        font-size: 0.95rem;
        line-height: 1.4;
        color: var(--ion-color-dark-tint);
        
        &.current {
          background: rgba(255, 255, 255, 0.7);
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
          opacity: 0.5;
        }

        h3 {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0 0 8px 0;
        }

        p {
          font-size: 0.9rem;
          margin: 0;
        }
      }
    }
  `]
})
export class NotesTabComponent implements OnInit {
  @Input() vanId!: string;
  @Input() currentNotes?: string;

  previousNotes: NoteEntry[] = [];

  ngOnInit() {
    this.loadPreviousNotes();
  }

  private loadPreviousNotes() {
    // TODO: Load from Firestore when you add notes history
    // For now, showing placeholder data
    this.previousNotes = [
      {
        id: '1',
        content: 'Van completed routine maintenance check. All systems operating normally.',
        timestamp: new Date('2024-12-15T14:30:00'),
        author: 'Admin User'
      },
      {
        id: '2',
        content: 'Minor scratches noted on passenger side. Scheduled for cosmetic repair.',
        timestamp: new Date('2024-12-01T10:15:00'),
        author: 'Admin User'
      },
      {
        id: '3',
        content: 'Battery performance excellent after recent charging system upgrade.',
        timestamp: new Date('2024-11-20T16:45:00'),
        author: 'Fleet Technician'
      }
    ];
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}