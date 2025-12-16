import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc, setDoc, updateDoc, collection, getDocs } from '@angular/fire/firestore';
import { Timestamp } from 'firebase/firestore';
import { Observable, from, map, catchError, of, take, firstValueFrom } from 'rxjs';

export interface WorkDayDetails {
  date: string; // Date string in YYYY-MM-DD format
  role?: 'Driver' | 'Dispatch' | 'Extra'; // Role for the work day
  clockIn?: string; // Clock in time in HH:mm format
  clockOut?: string; // Clock out time in HH:mm format
}

export interface UserSchedule {
  userId: string;
  workDays: string[]; // Array of date strings in YYYY-MM-DD format (for backward compatibility)
  workDayDetails?: Record<string, WorkDayDetails>; // Map of date strings to work day details
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
            workDayDetails: data['workDayDetails'] || {},
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
    
    // Get existing schedule to preserve workDayDetails
    const snap = await getDoc(scheduleRef);
    const existingData = snap.exists() ? snap.data() : {};
    
    const scheduleData: any = {
      userId,
      workDays,
      workDayDetails: existingData['workDayDetails'] || {},
      updatedAt: Timestamp.now(),
      updatedBy
    };

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
   * Set work day details (role and times) for a specific date
   */
  async setWorkDayDetails(userId: string, date: string, details: WorkDayDetails, updatedBy?: string): Promise<void> {
    const scheduleRef = doc(this.firestore, 'userSchedules', userId);
    
    // Get existing schedule
    const snap = await getDoc(scheduleRef);
    const existingData = snap.exists() ? snap.data() : {};
    const existingWorkDays = existingData['workDays'] || [];
    const existingWorkDayDetails = existingData['workDayDetails'] || {};
    
    // Ensure date is in workDays array
    const updatedWorkDays = existingWorkDays.includes(date) 
      ? existingWorkDays 
      : [...existingWorkDays, date].sort();
    
    // Update workDayDetails
    const updatedWorkDayDetails = {
      ...existingWorkDayDetails,
      [date]: details
    };
    
    const scheduleData: any = {
      userId,
      workDays: updatedWorkDays,
      workDayDetails: updatedWorkDayDetails,
      updatedAt: Timestamp.now(),
      updatedBy
    };

    if (snap.exists()) {
      await updateDoc(scheduleRef, scheduleData);
    } else {
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

  /**
   * Get all work assignments for a specific date
   * Returns an array of work day details with userId
   */
  async getWorkAssignmentsForDate(date: string): Promise<Array<WorkDayDetails & { userId: string }>> {
    try {
      const schedulesRef = collection(this.firestore, 'userSchedules');
      const snapshot = await getDocs(schedulesRef);
      
      const assignments: Array<WorkDayDetails & { userId: string }> = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const workDayDetails = data['workDayDetails'] || {};
        const workDays = data['workDays'] || [];
        
        // Check if the date is in workDays array (exact match)
        const hasInWorkDays = Array.isArray(workDays) && workDays.includes(date);
        
        // Check if workDayDetails exists for this date
        let hasInDetails = false;
        let details: WorkDayDetails | null = null;
        
        if (workDayDetails && typeof workDayDetails === 'object' && !Array.isArray(workDayDetails)) {
          // Check if the date key exists in workDayDetails
          const detailData = workDayDetails[date];
          if (detailData !== undefined && detailData !== null) {
            hasInDetails = true;
            // Handle both object format and direct data
            if (typeof detailData === 'object') {
              details = {
                date: detailData.date || date,
                role: detailData.role,
                clockIn: detailData.clockIn,
                clockOut: detailData.clockOut
              };
            } else {
              details = { date: date, role: undefined, clockIn: undefined, clockOut: undefined };
            }
          }
        }
        
        if (hasInWorkDays || hasInDetails) {
          // Use details from workDayDetails if available, otherwise create default
          const assignmentDetails = details || { 
            date: date, 
            role: undefined, 
            clockIn: undefined, 
            clockOut: undefined 
          };
          
          assignments.push({
            ...assignmentDetails,
            userId: doc.id
          });
        }
      });
      
      console.log(`[ScheduleService] Total assignments found for ${date}:`, assignments.length);
      return assignments;
    } catch (error) {
      console.error('[ScheduleService] Error getting work assignments for date:', error);
      return [];
    }
  }
}

