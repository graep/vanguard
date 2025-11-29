import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc, setDoc, updateDoc } from '@angular/fire/firestore';
import { Timestamp } from 'firebase/firestore';
import { Observable, from, map, catchError, of, take, firstValueFrom } from 'rxjs';

export interface UserSchedule {
  userId: string;
  workDays: string[]; // Array of date strings in YYYY-MM-DD format
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ScheduleService {
  private firestore = inject(Firestore);

  /**
   * Get user schedule from Firestore
   */
  getUserSchedule(userId: string): Observable<UserSchedule | null> {
    const scheduleRef = doc(this.firestore, 'userSchedules', userId);
    
    return from(getDoc(scheduleRef)).pipe(
      map(snap => {
        if (snap.exists()) {
          const data = snap.data();
          return {
            userId: data['userId'],
            workDays: data['workDays'] || [],
            createdAt: data['createdAt']?.toDate() || new Date(),
            updatedAt: data['updatedAt']?.toDate() || new Date(),
            updatedBy: data['updatedBy']
          } as UserSchedule;
        }
        return null;
      }),
      catchError(error => {
        console.error('[ScheduleService] Error getting user schedule:', error);
        return of(null);
      })
    );
  }

  /**
   * Set work days for a user
   */
  async setWorkDays(userId: string, workDays: string[], updatedBy?: string): Promise<void> {
    const scheduleRef = doc(this.firestore, 'userSchedules', userId);
    
    const scheduleData: any = {
      userId,
      workDays,
      updatedAt: Timestamp.now(),
      updatedBy
    };

    // Check if schedule exists
    const snap = await getDoc(scheduleRef);
    
    if (snap.exists()) {
      // Update existing schedule
      await updateDoc(scheduleRef, scheduleData);
    } else {
      // Create new schedule
      scheduleData.createdAt = Timestamp.now();
      await setDoc(scheduleRef, scheduleData);
    }
  }

  /**
   * Check if a user works on a specific date
   */
  async isWorkDay(userId: string, date: string): Promise<boolean> {
    const schedule = await firstValueFrom(this.getUserSchedule(userId).pipe(take(1)));
    if (!schedule) return false;
    return schedule.workDays.includes(date);
  }

  /**
   * Get work days for a specific month
   */
  async getWorkDaysForMonth(userId: string, year: number, month: number): Promise<string[]> {
    const schedule = await firstValueFrom(this.getUserSchedule(userId).pipe(take(1)));
    if (!schedule) return [];
    
    // Filter work days for the specified month
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    return schedule.workDays.filter(day => day.startsWith(monthStr));
  }
}

