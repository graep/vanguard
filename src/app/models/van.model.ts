export type VanType = 'EDV' | 'CDV' | 'Rental';

export interface Van {
  docId: string;
  VIN: string;
  type: string;
  number: number;
  isGrounded: boolean;
  
  // Vehicle Information
  year?: number;
  make?: string;
  model?: string;
  licensePlate?: string;
  
  // Registration & Insurance
  registrationInfo?: {
    imageUrl?: string;
    registrationNumber?: string;
    registrationExpiry?: string;
    registrationState?: string;
  };
  insuranceInfo?: {
    imageUrl?: string;
    policyNumber?: string;
    insuranceProvider?: string;
    coverageExpiry?: string;
  };
  
  // Mileage Tracking
  estimatedMiles?: number;
  lastShiftMiles?: number;
  lastShiftEndedAt?: Date;
  lastShiftReason?: 'logout' | 'manual' | 'admin' | 'midnight';
  
  notes?: string;
  imageUrl?: string;
}

export const normalizeVanNumber = (v: string) => v.replace(/^0+/, '') || '0';
export const makeVanId = (t: VanType, n: number) => `${t}-${String(n).padStart(2,'0')}`;