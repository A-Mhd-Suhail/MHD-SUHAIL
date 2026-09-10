/* MHD Hospital — Firestore data types (matches the original app's data model
 * exactly: uid-keyed users, epoch-ms timestamps, 'YYYY-MM-DD' date strings). */

export type Role = 'patient' | 'doctor' | 'hospital';

export interface MhdUser {
  id: string;
  role: Role;
  name: string;
  email: string;
  createdAt: number;
  language?: string;
  photo?: string;
  /* patient */
  dob?: string;
  gender?: string;
  bloodGroup?: string;
  phone?: string;
  aadhaar?: string;
  address?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  heightCm?: string;
  weightKg?: string;
  allergies?: string;
  conditions?: string;
  surgeries?: string;
  accidents?: string;
  familyHistory?: string;
  income?: string;
  healthId?: string;
  /* doctor */
  specialization?: string;
  experience?: string;
  hospital?: string;
  regNo?: string;
  onDuty?: boolean;
  location?: { lat: number; lng: number; updatedAt: number };
  /* hospital */
  adminName?: string;
  licenseNo?: string;
  [key: string]: unknown;
}

export interface Medicine {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  startDate: string;
  durationDays?: string;
  prescribedBy?: string;
  verified?: boolean;
  verifiedBy?: string;
  verifiedAt?: number;
  source?: 'patient' | 'doctor';
  active?: boolean;
  createdAt: number;
  takenDates?: Record<string, boolean>;
  [key: string]: unknown;
}

export type ApptStatus = 'upcoming' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  healthId?: string;
  doctorId: string;
  doctorName: string;
  hospital?: string;
  date: string; // 'YYYY-MM-DD'
  time: string; // '09:00 AM'
  type: string;
  reason?: string;
  status: ApptStatus;
  createdAt: number;
  [key: string]: unknown;
}

export interface CaseDoc {
  id: string;
  patientId: string;
  patientName?: string;
  healthId?: string;
  chiefComplaint: string;
  symptoms?: string;
  area?: string;
  duration?: string;
  severity?: 'Mild' | 'Moderate' | 'Severe';
  prevTreatment?: string;
  existing?: string;
  currentMeds?: string;
  allergyNote?: string;
  surgeryNote?: string;
  familyHistory?: string;
  other?: string;
  status: 'waiting' | 'reviewed';
  createdAt: number;
  /* review fields */
  doctorId?: string;
  doctorName?: string;
  reviewedAt?: number;
  fee?: number;
  doctorNotes?: string;
  observations?: string;
  prescriptionText?: string;
  tests?: string;
  followupDays?: string;
  sharedWithPatient?: boolean;
  [key: string]: unknown;
}

export interface TimelineEntry {
  id: string;
  patientId: string;
  date: string;
  type: 'case' | 'appointment' | 'consult' | 'prescription' | 'followup' | 'report';
  icon: string;
  title: string;
  description: string;
  createdAt: number;
  due?: string;
  [key: string]: unknown;
}

export interface ReportDoc {
  id: string;
  patientId: string;
  patientName?: string;
  healthId?: string;
  title: string;
  type: string;
  date: string;
  hospital?: string;
  doctor?: string;
  note?: string;
  verified: boolean;
  uploadedBy?: string;
  uploadedByRole?: string;
  createdAt: number;
  fileData?: string;
  source?: string;
  [key: string]: unknown;
}

export interface VitalsDoc {
  id: string;
  patientId: string;
  patientName?: string;
  healthId?: string;
  date: string;
  temp: string;
  bp: string;
  hr: string;
  wt: string;
  sym?: string;
  enteredBy: string;
  doctorId?: string;
  doctorName?: string;
  createdAt: number;
  [key: string]: unknown;
}

export interface BillItem { label: string; amount: number }

export interface Bill {
  id: string;
  patientId: string;
  patientName?: string;
  healthId?: string;
  doctorId?: string;
  doctorName?: string;
  hospital?: string;
  type?: string;
  items?: BillItem[];
  total: number;
  status: 'pending' | 'paid';
  createdAt: number;
  paidAt?: number;
  [key: string]: unknown;
}

export interface Notif {
  id: string;
  to: string; // uid or 'role:doctor'
  title: string;
  body: string;
  navTarget?: string | null;
  read: boolean;
  createdAt: number;
  [key: string]: unknown;
}

export interface AccessLogEntry {
  id: string;
  patientId: string;
  actorName: string;
  actorRole: string;
  action: string;
  createdAt: number;
  [key: string]: unknown;
}

export interface Consent {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  status: 'revoked' | 'allowed';
  updatedAt: number;
  [key: string]: unknown;
}

export interface ChatMessage {
  id: string;
  from: string;
  fromRole: Role;
  text: string;
  at: number;
  [key: string]: unknown;
}
