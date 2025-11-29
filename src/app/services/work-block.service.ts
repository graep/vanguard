import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, orderBy, Timestamp } from '@angular/fire/firestore';
import { Observable, from, map, catchError, of } from 'rxjs';
import { WorkBlock } from '../models/work-block.model';

@Injectable({
  providedIn: 'root'
})
export class WorkBlockService {
  private firestore = inject(Firestore);
  private readonly collectionName = 'workBlocks';

  /**
   * Get all work blocks
   */
  getAllWorkBlocks(): Observable<WorkBlock[]> {
    const workBlocksRef = collection(this.firestore, this.collectionName);
    const q = query(workBlocksRef, orderBy('name', 'asc'));
    
    return from(getDocs(q)).pipe(
      map(snapshot => {
        return snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data['name'],
            startTime: data['startTime'],
            endTime: data['endTime'],
            duties: data['duties'] || [],
            color: data['color'],
            createdAt: data['createdAt']?.toDate() || new Date(),
            updatedAt: data['updatedAt']?.toDate() || new Date(),
            createdBy: data['createdBy'],
            updatedBy: data['updatedBy']
          } as WorkBlock;
        });
      }),
      catchError(error => {
        console.error('[WorkBlockService] Error getting work blocks:', error);
        return of([]);
      })
    );
  }

  /**
   * Get a single work block by ID
   */
  getWorkBlock(id: string): Observable<WorkBlock | null> {
    const workBlockRef = doc(this.firestore, this.collectionName, id);
    
    return from(getDoc(workBlockRef)).pipe(
      map(snap => {
        if (snap.exists()) {
          const data = snap.data();
          return {
            id: snap.id,
            name: data['name'],
            startTime: data['startTime'],
            endTime: data['endTime'],
            duties: data['duties'] || [],
            color: data['color'],
            createdAt: data['createdAt']?.toDate() || new Date(),
            updatedAt: data['updatedAt']?.toDate() || new Date(),
            createdBy: data['createdBy'],
            updatedBy: data['updatedBy']
          } as WorkBlock;
        }
        return null;
      }),
      catchError(error => {
        console.error('[WorkBlockService] Error getting work block:', error);
        return of(null);
      })
    );
  }

  /**
   * Create a new work block
   */
  async createWorkBlock(workBlock: Omit<WorkBlock, 'id' | 'createdAt' | 'updatedAt'>, createdBy?: string): Promise<string> {
    const workBlocksRef = collection(this.firestore, this.collectionName);
    const newDocRef = doc(workBlocksRef);
    
    const workBlockData: any = {
      name: workBlock.name,
      startTime: workBlock.startTime,
      endTime: workBlock.endTime,
      duties: workBlock.duties || [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy
    };

    if (workBlock.color) {
      workBlockData.color = workBlock.color;
    }

    await setDoc(newDocRef, workBlockData);
    return newDocRef.id;
  }

  /**
   * Update an existing work block
   */
  async updateWorkBlock(id: string, updates: Partial<WorkBlock>, updatedBy?: string): Promise<void> {
    const workBlockRef = doc(this.firestore, this.collectionName, id);
    
    const updateData: any = {
      updatedAt: Timestamp.now(),
      updatedBy
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.startTime !== undefined) updateData.startTime = updates.startTime;
    if (updates.endTime !== undefined) updateData.endTime = updates.endTime;
    if (updates.duties !== undefined) updateData.duties = updates.duties;
    if (updates.color !== undefined) updateData.color = updates.color;

    await updateDoc(workBlockRef, updateData);
  }

  /**
   * Delete a work block
   */
  async deleteWorkBlock(id: string): Promise<void> {
    const workBlockRef = doc(this.firestore, this.collectionName, id);
    await deleteDoc(workBlockRef);
  }

  /**
   * Validate time format (HH:mm)
   */
  isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * Validate that end time is after start time
   */
  isValidTimeRange(startTime: string, endTime: string): boolean {
    if (!this.isValidTimeFormat(startTime) || !this.isValidTimeFormat(endTime)) {
      return false;
    }

    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const startTotal = startHours * 60 + startMinutes;
    const endTotal = endHours * 60 + endMinutes;

    return endTotal > startTotal;
  }
}

