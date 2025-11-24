export type SafetyViolationType = 
  | 'Speeding'
  | 'Distraction'
  | 'Stop Sign'
  | 'Follow Distance'
  | 'Red Light'
  | 'Seatbelt'
  | 'Hard Turn'
  | 'Roadside'
  | 'Weaving';

export interface SafetyViolation {
  id?: string;
  userId: string;
  violationType: SafetyViolationType;
  occurredAt: Date;
  createdAt: Date;
  createdBy: string; // Admin/user who recorded the violation
  notes?: string;
  vanId?: string; // Optional: associated van if applicable
}

export const SAFETY_VIOLATION_TYPES: SafetyViolationType[] = [
  'Speeding',
  'Distraction',
  'Stop Sign',
  'Follow Distance',
  'Red Light',
  'Seatbelt',
  'Hard Turn',
  'Roadside',
  'Weaving'
];

