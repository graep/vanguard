import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, getDocs, query, where, orderBy, limit, doc, deleteDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { AuthService } from './auth.service';

export interface NoteEntry {
  id: string;
  content: string;
  timestamp: Date;
  author: string;
  vanId: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotesHistoryService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private authService = inject(AuthService);

  async addNote(vanId: string, content: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const userProfile = this.authService.currentUserProfile$.value;
    const authorName = this.authService.getDisplayName(userProfile) || user.displayName || 'Admin User';

    const noteData = {
      vanId,
      content: content.trim(),
      timestamp: new Date(),
      author: authorName,
      authorId: user.uid
    };

    const notesCollection = collection(this.firestore, 'van-notes');
    await addDoc(notesCollection, noteData);
  }

  async getNotesHistory(vanId: string): Promise<NoteEntry[]> {
    const notesCollection = collection(this.firestore, 'van-notes');
    const q = query(
      notesCollection,
      where('vanId', '==', vanId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        content: data['content'],
        timestamp: data['timestamp']?.toDate ? data['timestamp'].toDate() : new Date(data['timestamp']),
        author: data['author'],
        vanId: data['vanId']
      } as NoteEntry;
    });
  }

  async deleteNote(noteId: string): Promise<void> {
    const noteDocRef = doc(this.firestore, 'van-notes', noteId);
    await deleteDoc(noteDocRef);
  }
}
