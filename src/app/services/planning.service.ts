import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, setDoc, getDoc, deleteDoc, query, where, getDocs, updateDoc } from '@angular/fire/firestore';
import { Observable, from, map, catchError, of } from 'rxjs';
import { DriverAssignment, DailyPlan } from '../models/planning.model';

@Injectable({
  providedIn: 'root'
})
export class PlanningService {
  private firestore = inject(Firestore);

  /**
   * Get or create a daily plan for a specific date, pre-populating with active vans
   */
  async getOrCreateDailyPlan(date: string, activeVans: any[] = []): Promise<DailyPlan> {
    const planId = this.getPlanIdFromDate(date);
    const planRef = doc(this.firestore, 'dailyPlans', planId);

    try {
      
      
      
      
      // First, check if a plan exists with this ID
      
      const planSnap = await getDoc(planRef);

      if (planSnap.exists()) {
        
        const existingPlan = planSnap.data() as DailyPlan;
        
        
        // Ensure the plan ID matches the date (in case of any inconsistencies)
        if (existingPlan.id !== planId) {
          console.warn('[PlanningService] Plan ID mismatch! Existing:', existingPlan.id, 'Expected:', planId);
          existingPlan.id = planId;
          existingPlan.date = date;
          await setDoc(planRef, existingPlan);
        }
        
        return existingPlan;
      }

      // Additional safety check: Query for any plans with the same date
      // This catches any edge cases where a plan might exist with a different ID
      const plansRef = collection(this.firestore, 'dailyPlans');
      const dateQuery = query(plansRef, where('date', '==', date));
      const dateQuerySnap = await getDocs(dateQuery);
      
      if (!dateQuerySnap.empty) {
        console.warn('[PlanningService] Found', dateQuerySnap.size, 'plan(s) with date', date, '- consolidating');
        
        // If multiple plans exist, merge them into the one with the correct ID
        const plans = dateQuerySnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyPlan));
        
        // Find or create the plan with the correct ID
        let targetPlan = plans.find(p => p.id === planId);
        
        if (!targetPlan) {
          // Use the first plan as the base
          targetPlan = plans[0];
          targetPlan.id = planId;
        }
        
        // Merge assignments from all plans (deduplicate by assignment ID)
        const allAssignments = new Map<string, DriverAssignment>();
        plans.forEach(plan => {
          plan.assignments?.forEach(assignment => {
            if (assignment.id) {
              // Keep the assignment with the most data (prefer assigned over unassigned)
              const existing = allAssignments.get(assignment.id);
              if (!existing || (!existing.driverName && assignment.driverName)) {
                allAssignments.set(assignment.id, assignment);
              }
            }
          });
        });
        
        targetPlan.assignments = Array.from(allAssignments.values());
        targetPlan.date = date;
        targetPlan.updatedAt = new Date();
        
        // Save the consolidated plan
        await setDoc(planRef, targetPlan);
        
        // Delete duplicate plans
        for (const plan of plans) {
          if (plan.id !== planId) {
            
            await deleteDoc(doc(this.firestore, 'dailyPlans', plan.id));
          }
        }
        
        
        return targetPlan;
      }

      
      
      activeVans.forEach((van, idx) => {
        // Van processing
      });
      
      // Create new plan with assignments pre-filled ONLY with active vans
      const assignments: DriverAssignment[] = [];
      
      // Populate ONLY with active vans (no placeholders)
      activeVans.forEach((van, index) => {
        const slot: DriverAssignment = {
          id: this.generateId(),
          date,
          vanId: van.docId || van.id || '',
          vanType: (van.type || 'CDV') as any,
          vanNumber: van.number || index + 1,
          driverName: '', // Unassigned initially
        };
        assignments.push(slot);
        
      });
      
      

      const now = new Date();
      const newPlan: DailyPlan = {
        id: planId,
        date,
        assignments,
        createdAt: now,
        updatedAt: now,
      };

      
      await setDoc(planRef, newPlan);
      
      
      return newPlan;
    } catch (error: any) {
      console.error('[PlanningService] getOrCreateDailyPlan - ERROR getting/creating daily plan:', error);
      console.error('[PlanningService] getOrCreateDailyPlan - Error code:', error?.code);
      console.error('[PlanningService] getOrCreateDailyPlan - Error message:', error?.message);
      console.error('[PlanningService] getOrCreateDailyPlan - Error stack:', error?.stack);
      throw error;
    }
  }

  /**
   * Get a daily plan by date
   */
  async getDailyPlan(date: string): Promise<DailyPlan | null> {
    const planId = this.getPlanIdFromDate(date);
    const planRef = doc(this.firestore, 'dailyPlans', planId);
    const planSnap = await getDoc(planRef);

    if (planSnap.exists()) {
      return planSnap.data() as DailyPlan;
    }

    return null;
  }

  /**
   * Update an assignment in a daily plan
   */
  async updateAssignment(
    date: string,
    assignmentId: string,
    updates: Partial<DriverAssignment>
  ): Promise<void> {
    const planId = this.getPlanIdFromDate(date);
    const planRef = doc(this.firestore, 'dailyPlans', planId);

    try {
      const planSnap = await getDoc(planRef);
      if (!planSnap.exists()) {
        throw new Error('Daily plan not found');
      }

      const plan = planSnap.data() as DailyPlan;
      const assignmentIndex = plan.assignments.findIndex(a => a.id === assignmentId);

      if (assignmentIndex === -1) {
        throw new Error('Assignment not found');
      }

      // Update the assignment
      plan.assignments[assignmentIndex] = {
        ...plan.assignments[assignmentIndex],
        ...updates,
        assignedAt: new Date(),
      };

      plan.updatedAt = new Date();

      await setDoc(planRef, plan);
    } catch (error) {
      console.error('Error updating assignment:', error);
      throw error;
    }
  }

  /**
   * Create a new assignment in a daily plan
   */
  async createAssignment(
    date: string,
    assignment: DriverAssignment
  ): Promise<void> {
    const planId = this.getPlanIdFromDate(date);
    const planRef = doc(this.firestore, 'dailyPlans', planId);

    try {
      const planSnap = await getDoc(planRef);
      if (!planSnap.exists()) {
        throw new Error('Daily plan not found');
      }

      const plan = planSnap.data() as DailyPlan;
      
      // Add the new assignment
      const newAssignment: DriverAssignment = {
        ...assignment,
        id: this.generateId(),
        date,
      };

      plan.assignments.push(newAssignment);
      plan.updatedAt = new Date();

      await setDoc(planRef, plan);
    } catch (error) {
      console.error('Error creating assignment:', error);
      throw error;
    }
  }

  /**
   * Delete an assignment from a daily plan
   */
  async deleteAssignment(
    date: string,
    assignmentId: string
  ): Promise<void> {
    const planId = this.getPlanIdFromDate(date);
    const planRef = doc(this.firestore, 'dailyPlans', planId);

    try {
      const planSnap = await getDoc(planRef);
      if (!planSnap.exists()) {
        throw new Error('Daily plan not found');
      }

      const plan = planSnap.data() as DailyPlan;
      plan.assignments = plan.assignments.filter(a => a.id !== assignmentId);
      plan.updatedAt = new Date();

      await setDoc(planRef, plan);
    } catch (error) {
      console.error('Error deleting assignment:', error);
      throw error;
    }
  }

  /**
   * Save the entire daily plan
   */
  async saveDailyPlan(plan: DailyPlan): Promise<void> {
    const planRef = doc(this.firestore, 'dailyPlans', plan.id);
    plan.updatedAt = new Date();
    
    try {
      await setDoc(planRef, plan, { merge: true });
    } catch (error) {
      console.error('Error saving daily plan:', error);
      throw error;
    }
  }

  /**
   * Get plans for a date range
   */
  async getPlansForDateRange(startDate: string, endDate: string): Promise<DailyPlan[]> {
    const plansRef = collection(this.firestore, 'dailyPlans');
    const startId = this.getPlanIdFromDate(startDate);
    const endId = this.getPlanIdFromDate(endDate);

    const q = query(
      plansRef,
      where('id', '>=', startId),
      where('id', '<=', endId)
    );

    const querySnap = await getDocs(q);
    return querySnap.docs.map(doc => doc.data() as DailyPlan);
  }

  /**
   * Helper: Convert date string to plan ID (YYYY-MM-DD)
   */
  private getPlanIdFromDate(date: string): string {
    // Ensure date is in YYYY-MM-DD format using local time (not UTC)
    // If date is already in YYYY-MM-DD format, use it directly
    if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return date;
    }
    
    // Otherwise parse and format using local time
    const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Helper: Generate a unique ID for new assignments
   */
  generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format date for display (using local time, not UTC)
   */
  formatDate(date: string): string {
    // Parse date string (YYYY-MM-DD) using local time
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day); // month is 0-indexed
    
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Get date string for today (using local time, not UTC)
   */
  getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get date string for tomorrow (using local time, not UTC)
   */
  getTomorrowDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get date string for a specific day from today (using local time, not UTC)
   */
  getDateDaysFromToday(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

