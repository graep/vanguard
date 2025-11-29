export interface WorkBlock {
  id: string;
  name: string; // e.g., "Route", "Dispatch", "Route/Dispatch"
  startTime: string; // Format: "HH:mm" (24-hour format, e.g., "08:00")
  endTime: string; // Format: "HH:mm" (24-hour format, e.g., "17:00")
  duties: string[]; // Array of duty descriptions
  color?: string; // Optional color for UI display (hex code)
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface WorkBlockFormData {
  name: string;
  startTime: string;
  endTime: string;
  duties: string[];
  color?: string;
}

