
export interface Van {
  docId: string;
  vin: string;
  type: string;
  number: number;
  isGrounded: boolean;
  notes?: string;
  imageUrl?: string;
}
