export type VanType = 'EDV' | 'CDV' | 'LMR';

export interface Van {
  docId: string;
  vin: string;
  type: string;
  number: number;
  isGrounded: boolean;
  notes?: string;
  imageUrl?: string;
}

export const normalizeVanNumber = (v: string) => v.replace(/^0+/, '') || '0';
export const makeVanId = (t: VanType, n: number) => `${t}-${String(n).padStart(2,'0')}`;