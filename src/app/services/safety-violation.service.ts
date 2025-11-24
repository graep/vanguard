import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, addDoc, query, where, orderBy, Timestamp, getDocs } from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { SafetyViolation, SafetyViolationType } from '../models/safety-violation.model';

@Injectable({
  providedIn: 'root'
})
export class SafetyViolationService {
  private firestore = inject(Firestore);

  /**
   * Add a new safety violation
   */
  async addViolation(violation: Omit<SafetyViolation, 'id' | 'createdAt'>): Promise<string> {
    const violationsRef = collection(this.firestore, 'safetyViolations');
    const occurredAtTimestamp = Timestamp.fromDate(violation.occurredAt);
    
    console.log('[SafetyViolationService] Adding violation:', {
      userId: violation.userId,
      violationType: violation.violationType,
      occurredAt: violation.occurredAt.toISOString(),
      occurredAtTimestamp: occurredAtTimestamp.toDate().toISOString(),
      createdBy: violation.createdBy
    });
    
    const violationData: any = {
      userId: violation.userId,
      violationType: violation.violationType,
      occurredAt: occurredAtTimestamp,
      createdAt: Timestamp.now(),
      createdBy: violation.createdBy
    };
    
    // Only include notes if it's provided and not empty
    if (violation.notes && violation.notes.trim()) {
      violationData.notes = violation.notes.trim();
    }
    
    // Only include vanId if it's provided
    if (violation.vanId) {
      violationData.vanId = violation.vanId;
    }
    
    console.log('[SafetyViolationService] Saving violation data:', violationData);
    const docRef = await addDoc(violationsRef, violationData);
    console.log('[SafetyViolationService] Violation saved with ID:', docRef.id);
    return docRef.id;
  }

  /**
   * Get all violations for a specific user
   */
  getUserViolations(userId: string): Observable<SafetyViolation[]> {
    const violationsRef = collection(this.firestore, 'safetyViolations');
    const q = query(
      violationsRef,
      where('userId', '==', userId),
      orderBy('occurredAt', 'desc')
    );

    return collectionData(q, { idField: 'id' }).pipe(
      map((violations: any[]) => {
        return violations.map(v => this.mapViolation(v));
      })
    );
  }

  /**
   * Get violations for a user within a date range
   */
  async getUserViolationsInRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SafetyViolation[]> {
    const violationsRef = collection(this.firestore, 'safetyViolations');
    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    const q = query(
      violationsRef,
      where('userId', '==', userId),
      where('occurredAt', '>=', startTimestamp),
      where('occurredAt', '<=', endTimestamp),
      orderBy('occurredAt', 'desc')
    );

    try {
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return this.mapViolation({ id: doc.id, ...data });
      });
    } catch (error: any) {
      // If index is missing, try without date range
      if (error?.code === 'failed-precondition') {
        const allViolations = await getDocs(
          query(
            violationsRef,
            where('userId', '==', userId),
            orderBy('occurredAt', 'desc')
          )
        );
        const violations = allViolations.docs.map(doc => {
          const data = doc.data();
          return this.mapViolation({ id: doc.id, ...data });
        });
        // Filter in memory - normalize dates to start of day for comparison
        const filtered = violations.filter(v => {
          const violationDate = new Date(v.occurredAt.getFullYear(), v.occurredAt.getMonth(), v.occurredAt.getDate());
          const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
          const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
          const inRange = violationDate >= start && violationDate <= end;
          console.log('[SafetyViolationService] Violation date:', violationDate, 'in range:', inRange, 'start:', start, 'end:', end);
          return inRange;
        });
        console.log('[SafetyViolationService] Filtered violations:', filtered.length, 'out of', violations.length);
        return filtered;
      }
      throw error;
    }
  }

  /**
   * Get violations for the current week (Monday to Sunday)
   */
  async getWeeklyViolations(userId: string): Promise<SafetyViolation[]> {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(now.getFullYear(), now.getMonth(), diff);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    console.log('[SafetyViolationService] Weekly range:', monday, 'to', sunday);
    const violations = await this.getUserViolationsInRange(userId, monday, sunday);
    console.log('[SafetyViolationService] Found', violations.length, 'violations in week');
    return violations;
  }

  /**
   * Get all violations for a user (all-time)
   */
  async getAllTimeViolations(userId: string): Promise<SafetyViolation[]> {
    const violationsRef = collection(this.firestore, 'safetyViolations');
    const q = query(
      violationsRef,
      where('userId', '==', userId),
      orderBy('occurredAt', 'desc')
    );

    try {
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return this.mapViolation({ id: doc.id, ...data });
      });
    } catch (error: any) {
      // If index is missing, try without orderBy
      if (error?.code === 'failed-precondition') {
        const allViolations = await getDocs(
          query(
            violationsRef,
            where('userId', '==', userId)
          )
        );
        const violations = allViolations.docs.map(doc => {
          const data = doc.data();
          return this.mapViolation({ id: doc.id, ...data });
        });
        // Sort in memory
        return violations.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
      }
      throw error;
    }
  }

  /**
   * Get violation count by type for a user within a date range
   */
  async getViolationCountsByType(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Record<SafetyViolationType, number>> {
    const violations = await this.getUserViolationsInRange(userId, startDate, endDate);
    const counts: Record<SafetyViolationType, number> = {
      'Speeding': 0,
      'Distraction': 0,
      'Stop Sign': 0,
      'Follow Distance': 0,
      'Red Light': 0,
      'Seatbelt': 0,
      'Hard Turn': 0,
      'Roadside': 0,
      'Weaving': 0
    };

    violations.forEach(v => {
      counts[v.violationType] = (counts[v.violationType] || 0) + 1;
    });

    return counts;
  }

  /**
   * Map Firestore document to SafetyViolation model
   */
  private mapViolation(data: any): SafetyViolation {
    let occurredAt: Date;
    let createdAt: Date;

    if (data.occurredAt instanceof Timestamp) {
      occurredAt = data.occurredAt.toDate();
    } else if (data.occurredAt instanceof Date) {
      occurredAt = data.occurredAt;
    } else if (data.occurredAt) {
      occurredAt = new Date(data.occurredAt);
    } else {
      occurredAt = new Date();
    }

    if (data.createdAt instanceof Timestamp) {
      createdAt = data.createdAt.toDate();
    } else if (data.createdAt instanceof Date) {
      createdAt = data.createdAt;
    } else if (data.createdAt) {
      createdAt = new Date(data.createdAt);
    } else {
      createdAt = new Date();
    }

    return {
      id: data.id,
      userId: data.userId,
      violationType: data.violationType,
      occurredAt,
      createdAt,
      createdBy: data.createdBy,
      notes: data.notes,
      vanId: data.vanId
    };
  }
}

