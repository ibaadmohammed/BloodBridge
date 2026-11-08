export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export type AppointmentStatus = 'booked' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  centerId: string;
  centerName: string;
  donorName: string;
  phone: string;
  bloodGroup: BloodGroup;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  notes: string;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface Slot {
  time: string;
  capacity: number;
  remaining: number;
}

/** Shape of an item from GET /api/bloodbanks. Adjust to match data/db.json. */
export interface BloodBank {
  id: string | number;
  name: string;
  city?: string;
}

export interface BookingInput {
  donorName: string;
  phone: string;
  bloodGroup: BloodGroup;
  centerId: string;
  centerName: string;
  date: string;
  time: string;
  notes?: string;
}
