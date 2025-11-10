/**
 * Planning data models for daily van assignments
 */

export type VehicleType = 'CDV' | 'EDV' | 'Rental' | 'BUDGET';

/**
 * Assignment for a single driver/van pairing on a specific day
 */
export interface DriverAssignment {
  id?: string;
  date: string; // YYYY-MM-DD format
  vanId: string; // Reference to van docId
  vanType: VehicleType;
  vanNumber: number;
  driverName: string; // Employee/DA name (e.g., "Tristen", "Anderson")
  routeNumber?: string; // e.g., "CX197", "CX140"
  staging?: string; // e.g., "E.1", "E.8", "C.10"
  wave?: number; // Typically 1, 2, or 3
  pad?: number; // Typically 2, 3, or 4
  phoneBatteryLights?: string; // Equipment notes like "BB", "12 WB", "10"
  notes?: string; // Special instructions, departure times, etc.
  assignedAt?: Date;
  assignedBy?: string; // User ID who made the assignment
}

/**
 * Complete daily plan for a specific date
 * Contains all assignments for all vehicle types
 */
export interface DailyPlan {
  id: string; // Use date as YYYY-MM-DD as the ID
  date: string; // YYYY-MM-DD format
  assignments: DriverAssignment[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Helper function to create a default unassigned slot
 */
export function createUnassignedSlot(
  vanId: string,
  vanType: VehicleType,
  vanNumber: number,
  date: string
): DriverAssignment {
  return {
    date,
    vanId,
    vanType,
    vanNumber,
    driverName: '', // Empty = unassigned
  };
}

/**
 * Check if an assignment is unassigned (no driver name)
 */
export function isAssignmentUnassigned(assignment: DriverAssignment): boolean {
  return !assignment.driverName || assignment.driverName.trim() === '';
}

/**
 * Get assignments grouped by vehicle type
 */
export function groupAssignmentsByType(
  assignments: DriverAssignment[]
): Record<VehicleType, DriverAssignment[]> {
  const grouped: Record<VehicleType, DriverAssignment[]> = {
    CDV: [],
    EDV: [],
    Rental: [],
    BUDGET: [],
  };

  assignments.forEach((assignment) => {
    if (assignment.vanType in grouped) {
      grouped[assignment.vanType].push(assignment);
    }
  });

  // Sort by van number within each group
  Object.keys(grouped).forEach((type) => {
    grouped[type as VehicleType].sort(
      (a, b) => a.vanNumber - b.vanNumber
    );
  });

  return grouped;
}

/**
 * Get stats for a daily plan
 */
export function getPlanStats(plan: DailyPlan | null) {
  if (!plan) {
    return {
      totalAssigned: 0,
      totalUnassigned: 0,
      cdvAssigned: 0,
      cdvUnassigned: 0,
      edvAssigned: 0,
      edvUnassigned: 0,
      rentalAssigned: 0,
      rentalUnassigned: 0,
      budgetAssigned: 0,
      budgetUnassigned: 0,
    };
  }

  const stats = {
    totalAssigned: 0,
    totalUnassigned: 0,
    cdvAssigned: 0,
    cdvUnassigned: 0,
    edvAssigned: 0,
    edvUnassigned: 0,
    rentalAssigned: 0,
    rentalUnassigned: 0,
    budgetAssigned: 0,
    budgetUnassigned: 0,
  };

  plan.assignments.forEach((assignment) => {
    const assigned = !isAssignmentUnassigned(assignment);
    stats.totalAssigned += assigned ? 1 : 0;
    stats.totalUnassigned += assigned ? 0 : 1;

    switch (assignment.vanType) {
      case 'CDV':
        stats.cdvAssigned += assigned ? 1 : 0;
        stats.cdvUnassigned += assigned ? 0 : 1;
        break;
      case 'EDV':
        stats.edvAssigned += assigned ? 1 : 0;
        stats.edvUnassigned += assigned ? 0 : 1;
        break;
      case 'Rental':
        stats.rentalAssigned += assigned ? 1 : 0;
        stats.rentalUnassigned += assigned ? 0 : 1;
        break;
      case 'BUDGET':
        stats.budgetAssigned += assigned ? 1 : 0;
        stats.budgetUnassigned += assigned ? 0 : 1;
        break;
    }
  });

  return stats;
}

