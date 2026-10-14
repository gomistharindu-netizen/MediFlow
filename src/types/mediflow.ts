export type Gender = 'Male' | 'Female' | 'Other';

export type QueueStatus = 
  | 'NOT_CHECKED_IN' 
  | 'WAITING' 
  | 'CALLED' 
  | 'IN_CONSULTATION' 
  | 'COMPLETED' 
  | 'MISSED';

export type LabStatus = 'Pending' | 'Received' | 'Reviewed';

export type FeeMode = 'BEFORE' | 'AFTER';

export type PaymentMethod = 'Cash' | 'Card' | 'Bank Transfer';

export interface Patient {
  id: string; // MF-2026-XXXX
  name: string;
  age: number;
  gender: Gender;
  phone: string;
  nic: string;
  address: string;
  guardianOrFamilyRelation?: string;
  allergies: string[];
  chronicConditions: string[];
  pastVisitsCount: number;
  createdAt: string;
}

export interface PrescriptionItem {
  id: string;
  medicine: string;
  strength: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  quantityToDispense: number;
  dispensedBatch?: string;
  dispensedQuantity?: number;
}

export interface Prescription {
  id: string;
  issuedAt: string;
  items: PrescriptionItem[];
  isDispensed: boolean;
  dispensedAt?: string;
  dispensedBy?: string;
}

export interface LabReport {
  id: string;
  testName: string;
  labName: string;
  date: string;
  status: LabStatus;
  uploader: string;
  doctorNotes?: string;
  fileUrl?: string;
}

export interface BillingDetails {
  consultationFee: number;
  consultationPaid: boolean;
  consultationPaymentTime?: string;
  pharmacyFee: number;
  pharmacyPaid: boolean;
  pharmacyPaymentTime?: string;
  paymentMethod?: PaymentMethod;
  receiptNumber?: string;
}

export interface Visit {
  id: string; // V-XXXX
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: Gender;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorRoom: string;
  sessionName: string;
  bookingRef: string;
  tokenNumber: number;
  isWalkIn: boolean;
  status: QueueStatus;
  date?: string; // ISO date e.g. "2026-10-14" or "2026-08-14"
  bookedAt: string;
  checkedInAt?: string;
  calledAt?: string;
  completedAt?: string;
  priorityReason?: string;
  vitals?: {
    bp?: string;
    pulse?: string;
    temp?: string;
    weight?: string;
    sugar?: string;
  };
  clinicalNotes?: {
    complaints?: string;
    diagnosis?: string;
    doctorNotes?: string;
  };
  prescription?: Prescription;
  labReports: LabReport[];
  billing: BillingDetails;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  room: string;
  consultationFee: number;
  sessions: string[];
}

export interface InventoryBatch {
  batchNumber: string;
  expiryDate: string;
  stockQuantity: number;
  unitPrice: number;
  isNearExpiry?: boolean;
}

export interface MedicineItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  batches: InventoryBatch[];
}

export interface ClinicSettings {
  clinicName: string;
  tagline: string;
  consultationFeeMode: FeeMode;
  pharmacyEnabled: boolean;
  defaultConsultationFee: number;
  activeDoctorId: string;
  currentSession: string;
}
