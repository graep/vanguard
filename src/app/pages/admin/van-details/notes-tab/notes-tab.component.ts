import { Component, Input, OnInit, OnChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { NotesHistoryService, NoteEntry } from '../../../../services/notes-history.service';

@Component({
  selector: 'app-notes-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <div class="notes-tab-content">
      <div class="section-header">
        <div class="header-content">
          <div class="header-text">
            <h3>Notes History</h3>
            <p class="section-subtitle">Add and view notes for this van</p>
          </div>
          <ion-button 
            *ngIf="!editingNotes"
            fill="solid" 
            color="primary" 
            size="small"
            (click)="startEditingNotes()"
            class="add-note-button">
            <ion-icon name="add" slot="start"></ion-icon>
            Add Note
          </ion-button>
        </div>
      </div>

      <!-- Note Editor -->
      <div *ngIf="editingNotes" class="note-editor">
        <div class="editor-header">
          <h4>Add New Note</h4>
        </div>
        <ion-textarea
          [(ngModel)]="notesText"
          placeholder="Enter a new note..."
          rows="4"
          fill="outline"
          class="notes-textarea">
        </ion-textarea>
        <div class="editor-actions">
          <ion-button
            fill="solid"
            color="primary"
            (click)="saveNotes()"
            [disabled]="!notesText.trim()"
            class="save-button">
            <ion-icon name="checkmark" slot="start"></ion-icon>
            Save Note
          </ion-button>
          <ion-button
            fill="clear"
            color="medium"
            (click)="cancelEditingNotes()"
            class="cancel-button">
            <ion-icon name="close" slot="start"></ion-icon>
            Cancel
          </ion-button>
        </div>
      </div>

      <!-- Previous Notes List -->
      <div class="notes-list">
        <ion-card *ngFor="let note of previousNotes" class="note-card">
          <ion-card-content>
            <div class="note-header">
              <ion-icon name="document-text" class="note-icon"></ion-icon>
              <div class="note-meta">
                <h4>{{ note.author }}</h4>
                <p class="note-date">{{ formatDate(note.timestamp) }}</p>
              </div>
              <ion-button
                fill="clear"
                color="danger"
                size="small"
                (click)="deleteNote(note)"
                class="delete-button">
                <ion-icon name="trash" slot="icon-only"></ion-icon>
              </ion-button>
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
          font-family: 'Montserrat', 'TikTok Sans', sans-serif;
          font-size: 1.2rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #ffffff;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-transform: uppercase;
          position: relative;
          z-index: 1;
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
        
        .add-note-button {
          --height: 36px;
          font-size: 0.85rem;
          white-space: nowrap;
          
          &:hover {
            transform: translateY(-2px);
          }
          
          &:active {
            transform: translateY(1px);
          }
        }
      }

      .notes-list {
        // Padding removed - using tab-content padding
      }

      .note-editor {
        margin-bottom: 24px;
        padding: 16px;
        margin-left: 16px;
        margin-right: 16px;
        background: var(--ion-color-light);
        border-radius: 10px;
        border: 1px solid var(--ion-color-light-shade);
        
        @media (max-width: 768px) {
          margin-left: 8px;
          margin-right: 8px;
        }
        
        @media (max-width: 480px) {
          margin-left: 4px;
          margin-right: 4px;
        }

        .editor-header {
          margin-bottom: 12px;
          
          h4 {
            font-size: 1rem;
            font-weight: 600;
            color: var(--ion-color-dark);
            margin: 0;
          }
        }

        .notes-textarea {
          margin-bottom: 16px;
          --background: var(--ion-color-light);
          --border-radius: 10px;
          --padding-start: 12px;
          --padding-end: 12px;
          --padding-top: 12px;
          --padding-bottom: 12px;
        }

        .editor-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;

          .save-button {
            --padding-start: 16px;
            --padding-end: 16px;
            height: 40px;
            font-weight: 600;
            
            &:hover {
              transform: translateY(-2px);
            }
            
            &:active {
              transform: translateY(0);
            }
          }

          .cancel-button {
            --padding-start: 16px;
            --padding-end: 16px;
            height: 40px;
            
            &:hover {
              transform: translateY(-2px);
            }
            
            &:active {
              transform: translateY(0);
            }
          }
        }
      }

      .note-card {
        margin-bottom: 12px;
        width: 100% !important;
        max-width: 100% !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
        transform: none !important;
        
        ion-card-content {
          padding: 16px;
          
          @media (max-width: 480px) {
            padding: 12px;
          }
        }
      }
      
      .note-card.md.hydrated {
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

      .note-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;

        .note-icon {
          font-size: 20px;
          color: var(--ion-color-medium);
          flex-shrink: 0;
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

        .delete-button {
          --height: 32px;
          --width: 32px;
          --border-radius: 50%;
          flex-shrink: 0;
          opacity: 0.7;
          transition: opacity 0.2s ease;

          &:hover {
            opacity: 1;
            transform: translateY(-2px);
          }
          
          &:active {
            transform: translateY(1px);
            opacity: 0.9;
          }

          ion-icon {
            font-size: 16px;
          }
        }
      }

      .note-content {
        background: var(--ion-color-light);
        border-radius: 10px;
        padding: 12px;
        font-size: 0.95rem;
        line-height: 1.4;
        color: var(--ion-color-dark-tint);
        
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
export class NotesTabComponent implements OnInit, OnChanges {
  @Input() vanId!: string;
  @Input() currentNotes?: string;

  private notesHistoryService = inject(NotesHistoryService);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  
  previousNotes: NoteEntry[] = [];
  
  // Note editing state
  editingNotes = false;
  notesText = '';

  ngOnInit() {
    this.loadPreviousNotes();
  }

  ngOnChanges() {
    // Reload notes when vanId changes
    if (this.vanId) {
      this.loadPreviousNotes();
    }
  }

  async refreshNotes() {
    await this.loadPreviousNotes();
  }

  private async loadPreviousNotes() {
    try {
      this.previousNotes = await this.notesHistoryService.getNotesHistory(this.vanId);
    } catch (error: unknown) {
      console.error('Failed to load notes history:', error);
      this.previousNotes = [];
    }
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

  startEditingNotes() {
    this.editingNotes = true;
    this.notesText = '';
  }

  cancelEditingNotes() {
    this.editingNotes = false;
    this.notesText = '';
  }

  hasNotesChanged(): boolean {
    return this.notesText.trim().length > 0;
  }

  async saveNotes() {
    if (!this.hasNotesChanged() || !this.notesText.trim()) return;

    try {
      // Add note to history
      await this.notesHistoryService.addNote(this.vanId, this.notesText.trim());

      // Clear the input and exit edit mode
      this.notesText = '';
      this.editingNotes = false;

      const toast = await this.toastCtrl.create({
        message: 'Note added successfully',
        duration: 2000,
        color: 'success'
      });
      toast.present();

      // Refresh the notes list to show the new note
      await this.loadPreviousNotes();

    } catch (error: unknown) {
      const toast = await this.toastCtrl.create({
        message: 'Failed to add note',
        duration: 2000,
        color: 'danger'
      });
      toast.present();
    }
  }

  async deleteNote(note: NoteEntry) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Note',
      message: 'Are you sure you want to delete this note? This action cannot be undone.',
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
              await this.notesHistoryService.deleteNote(note.id);
              
              const toast = await this.toastCtrl.create({
                message: 'Note deleted successfully',
                duration: 2000,
                color: 'success'
              });
              toast.present();

              // Refresh the notes list
              await this.loadPreviousNotes();
            } catch (error: unknown) {
              const toast = await this.toastCtrl.create({
                message: 'Failed to delete note',
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
}