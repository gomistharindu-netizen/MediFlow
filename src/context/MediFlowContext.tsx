'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Patient, 
  Visit, 
  Doctor, 
  MedicineItem, 
  ClinicSettings, 
  QueueStatus, 
  FeeMode, 
  PaymentMethod,
  Prescription,
  PrescriptionItem,
  LabReport
} from '@/types/mediflow';

interface MediFlowContextType {
  settings: ClinicSettings;
  doctors: Doctor[];
  patients: Patient[];
  visits: Visit[];
  medicines: MedicineItem[];
  activeView: string;
  selectedVisitIdForMobile: string;
  setActiveView: (view: string) => void;
  setSelectedVisitIdForMobile: (visitId: string) => void;
  
  // Settings Actions
  updateSettings: (newSettings: Partial<ClinicSettings>) => void;
  resetDemoData: () => void;
  
  // Patient Actions
  registerPatient: (patientData: Omit<Patient, 'id' | 'createdAt' | 'pastVisitsCount'>) => Patient;
  searchPatients: (query: string) => Patient[];
  
  // Visit & Booking Actions
  bookVisit: (patientId: string, doctorId: string, isWalkIn: boolean) => Visit;
  checkInVisit: (visitId: string) => void;
  checkInByQR: (bookingRefOrPatientId: string) => Visit | null;
  
  // Doctor Station Actions
  callPatient: (visitId: string) => void;
  startConsultation: (visitId: string) => void;
  updateVitals: (visitId: string, vitals: Visit['vitals']) => void;
  updateClinicalNotes: (visitId: string, notes: Visit['clinicalNotes']) => void;
  issuePrescription: (visitId: string, items: PrescriptionItem[]) => void;
  uploadLabReport: (visitId: string, report: Omit<LabReport, 'id'>) => void;
  reviewLabReport: (visitId: string, reportId: string, doctorNotes: string) => void;
  completeConsultation: (visitId: string) => void;
  markPatientMissed: (visitId: string) => void;
  setEmergencyPriority: (visitId: string, reason: string) => void;
  
  // Pharmacy Actions
  dispensePrescription: (visitId: string, batchAssignments: { itemId: string; batchNumber: string; quantity: number }[]) => void;
  
  // Cashier & Billing Actions
  collectConsultationFee: (visitId: string, method: PaymentMethod) => void;
  collectPharmacyFee: (visitId: string, method: PaymentMethod) => void;
  collectAllFees: (visitId: string, method: PaymentMethod) => void;
}

const STORAGE_KEY = 'mediflow_demo_state_v2';

const initialSettings: ClinicSettings = {
  clinicName: "MediFlow Family Health Care",
  tagline: "General Practice & Specialist Medical Center",
  consultationFeeMode: "AFTER",
  pharmacyEnabled: true,
  defaultConsultationFee: 2000,
  activeDoctorId: "doc-1",
  currentSession: "Evening GP Session (05:00 PM - 08:30 PM)"
};

const initialDoctors: Doctor[] = [
  {
    id: "doc-1",
    name: "Dr. K. Perera",
    specialty: "General Practitioner / Family Physician",
    room: "Room 01",
    consultationFee: 2000,
    sessions: ["Evening GP Session (05:00 PM - 08:30 PM)"]
  },
  {
    id: "doc-2",
    name: "Dr. N. Silva",
    specialty: "Visiting Consultant Physician",
    room: "Room 02",
    consultationFee: 3500,
    sessions: ["Visiting Clinic (06:00 PM - 08:00 PM)"]
  }
];

const initialPatients: Patient[] = [
  {
    id: "MF-2026-0038",
    name: "Kamani Jayasinghe",
    age: 52,
    gender: "Female",
    phone: "077 452 9812",
    nic: "746219803V",
    address: "No. 42, Ward Place, Colombo 07",
    allergies: ["Penicillin"],
    chronicConditions: ["Hypertension", "Dyslipidemia"],
    pastVisitsCount: 6,
    createdAt: "2026-01-15"
  },
  {
    id: "MF-2026-0041",
    name: "Kasun Fernando",
    age: 34,
    gender: "Male",
    phone: "071 883 4510",
    nic: "921820455V",
    address: "18/2, Havelock Road, Colombo 05",
    allergies: [],
    chronicConditions: ["Gastritis"],
    pastVisitsCount: 2,
    createdAt: "2026-04-10"
  },
  {
    id: "MF-2026-0042",
    name: "Nimal Senanayake",
    age: 61,
    gender: "Male",
    phone: "077 123 4567",
    nic: "651908234V",
    address: "55, Cotta Road, Rajagiriya",
    guardianOrFamilyRelation: "Head of Family",
    allergies: ["Sulfa drugs"],
    chronicConditions: ["Type 2 Diabetes"],
    pastVisitsCount: 8,
    createdAt: "2025-11-03"
  },
  {
    id: "MF-2026-0043",
    name: "Sanjaya Senanayake",
    age: 14,
    gender: "Male",
    phone: "077 123 4567", // Shared family phone
    nic: "Child / School Student",
    address: "55, Cotta Road, Rajagiriya",
    guardianOrFamilyRelation: "Son of Nimal Senanayake (MF-2026-0042)",
    allergies: [],
    chronicConditions: ["Mild Asthma"],
    pastVisitsCount: 1,
    createdAt: "2026-08-12"
  },
  {
    id: "MF-2026-0045",
    name: "Dilani Alwis",
    age: 28,
    gender: "Female",
    phone: "076 991 2304",
    nic: "985412901V",
    address: "102, Kynsey Road, Colombo 08",
    allergies: ["Aspirin"],
    chronicConditions: [],
    pastVisitsCount: 3,
    createdAt: "2026-05-18"
  },
  {
    id: "MF-2026-0048",
    name: "Sunil Wickramasinghe",
    age: 47,
    gender: "Male",
    phone: "075 220 1934",
    nic: "791408331V",
    address: "88, Stanley Tilakaratne Mawatha, Nugegoda",
    allergies: [],
    chronicConditions: ["Migraine"],
    pastVisitsCount: 4,
    createdAt: "2026-03-22"
  }
];

const initialMedicines: MedicineItem[] = [
  {
    id: "med-1",
    name: "Amoxicillin",
    category: "Antibiotic",
    unit: "Capsule",
    batches: [
      { batchNumber: "AMX-2026A", expiryDate: "2027-04-30", stockQuantity: 280, unitPrice: 35 },
      { batchNumber: "AMX-2026B", expiryDate: "2027-09-15", stockQuantity: 500, unitPrice: 35 }
    ]
  },
  {
    id: "med-2",
    name: "Paracetamol",
    category: "Analgesic / Antipyretic",
    unit: "Tablet",
    batches: [
      { batchNumber: "PCM-991", expiryDate: "2027-11-20", stockQuantity: 1250, unitPrice: 8 }
    ]
  },
  {
    id: "med-3",
    name: "Metformin 500mg",
    category: "Antidiabetic",
    unit: "Tablet",
    batches: [
      { batchNumber: "MET-104", expiryDate: "2026-11-15", stockQuantity: 85, unitPrice: 15, isNearExpiry: true },
      { batchNumber: "MET-202", expiryDate: "2027-06-30", stockQuantity: 600, unitPrice: 15 }
    ]
  },
  {
    id: "med-4",
    name: "Omeprazole 20mg",
    category: "Antacid / PPI",
    unit: "Capsule",
    batches: [
      { batchNumber: "OMP-418", expiryDate: "2027-05-20", stockQuantity: 420, unitPrice: 25 }
    ]
  },
  {
    id: "med-5",
    name: "Atorvastatin 20mg",
    category: "Cardiovascular / Statin",
    unit: "Tablet",
    batches: [
      { batchNumber: "ATV-802", expiryDate: "2027-08-10", stockQuantity: 190, unitPrice: 40 }
    ]
  },
  {
    id: "med-6",
    name: "Cetirizine 10mg",
    category: "Antihistamine",
    unit: "Tablet",
    batches: [
      { batchNumber: "CTZ-312", expiryDate: "2027-03-25", stockQuantity: 340, unitPrice: 12 }
    ]
  },
  {
    id: "med-7",
    name: "Salbutamol Inhaler 100mcg",
    category: "Respiratory",
    unit: "Inhaler Canister",
    batches: [
      { batchNumber: "SBL-770", expiryDate: "2027-10-18", stockQuantity: 32, unitPrice: 850 }
    ]
  }
];

const initialVisits: Visit[] = [
  {
    id: "V-1015",
    patientId: "MF-2026-0038",
    patientName: "Kamani Jayasinghe",
    patientAge: 52,
    patientGender: "Female",
    patientPhone: "077 452 9812",
    doctorId: "doc-1",
    doctorName: "Dr. K. Perera",
    doctorSpecialty: "General Practitioner / Family Physician",
    doctorRoom: "Room 01",
    sessionName: "Evening GP Session (05:00 PM - 08:30 PM)",
    bookingRef: "BK-8815",
    tokenNumber: 15,
    isWalkIn: false,
    status: "IN_CONSULTATION",
    bookedAt: "10:30 AM",
    checkedInAt: "05:02 PM",
    calledAt: "05:15 PM",
    vitals: {
      bp: "138/88",
      pulse: "76 bpm",
      temp: "98.4 °F",
      weight: "68 kg",
      sugar: "142 mg/dL"
    },
    clinicalNotes: {
      complaints: "Patient presents with occipital headache and dizziness for 3 days. Elevated BP recorded.",
      diagnosis: "Essential Hypertension (mild decompensation) & Tension Headache",
      doctorNotes: "Advised low-salt diet and regular home BP monitoring. Continue medication."
    },
    prescription: {
      id: "RX-5501",
      issuedAt: "05:22 PM",
      isDispensed: false,
      items: [
        {
          id: "item-1",
          medicine: "Atorvastatin",
          strength: "20mg",
          dosage: "1 tab",
          frequency: "OD (Night)",
          duration: "30 days",
          instructions: "Take after dinner",
          quantityToDispense: 30
        },
        {
          id: "item-2",
          medicine: "Paracetamol",
          strength: "500mg",
          dosage: "1-2 tabs",
          frequency: "TDS / SOS",
          duration: "3 days",
          instructions: "For headache if required",
          quantityToDispense: 12
        }
      ]
    },
    labReports: [
      {
        id: "LAB-901",
        testName: "Full Blood Count (FBC)",
        labName: "MediFlow Diagnostics",
        date: "2026-10-12",
        status: "Reviewed",
        uploader: "Staff Nurse Chathuri",
        doctorNotes: "Hb: 12.8 g/dL, Platelets normal. White cell count within normal range."
      },
      {
        id: "LAB-902",
        testName: "Lipid Profile",
        labName: "Central Lab Colombo",
        date: "2026-10-14",
        status: "Received",
        uploader: "Staff Nurse Chathuri",
        doctorNotes: "Total cholesterol: 228 mg/dL. LDL slightly elevated."
      }
    ],
    billing: {
      consultationFee: 2000,
      consultationPaid: false,
      pharmacyFee: 1296,
      pharmacyPaid: false
    }
  },
  {
    id: "V-1016",
    patientId: "MF-2026-0041",
    patientName: "Kasun Fernando",
    patientAge: 34,
    patientGender: "Male",
    patientPhone: "071 883 4510",
    doctorId: "doc-1",
    doctorName: "Dr. K. Perera",
    doctorSpecialty: "General Practitioner / Family Physician",
    doctorRoom: "Room 01",
    sessionName: "Evening GP Session (05:00 PM - 08:30 PM)",
    bookingRef: "BK-8816",
    tokenNumber: 16,
    isWalkIn: false,
    status: "WAITING",
    bookedAt: "11:15 AM",
    checkedInAt: "05:10 PM",
    vitals: {
      bp: "122/80",
      pulse: "72 bpm",
      temp: "98.6 °F",
      weight: "74 kg",
      sugar: "98 mg/dL"
    },
    labReports: [],
    billing: {
      consultationFee: 2000,
      consultationPaid: false,
      pharmacyFee: 0,
      pharmacyPaid: false
    }
  },
  {
    id: "V-1024",
    patientId: "MF-2026-0042",
    patientName: "Nimal Senanayake",
    patientAge: 61,
    patientGender: "Male",
    patientPhone: "077 123 4567",
    doctorId: "doc-1",
    doctorName: "Dr. K. Perera",
    doctorSpecialty: "General Practitioner / Family Physician",
    doctorRoom: "Room 01",
    sessionName: "Evening GP Session (05:00 PM - 08:30 PM)",
    bookingRef: "BK-8824",
    tokenNumber: 24,
    isWalkIn: false,
    status: "WAITING",
    bookedAt: "01:00 PM",
    checkedInAt: "05:18 PM", // Checked in after 16, illustrates 16/24 scenario
    vitals: {
      bp: "130/82",
      pulse: "78 bpm",
      temp: "98.2 °F",
      weight: "71 kg",
      sugar: "165 mg/dL"
    },
    labReports: [
      {
        id: "LAB-905",
        testName: "Fasting Blood Sugar & HbA1c",
        labName: "MediFlow Diagnostics",
        date: "2026-10-13",
        status: "Received",
        uploader: "Nurse Chathuri",
        doctorNotes: "Pending consultation review"
      }
    ],
    billing: {
      consultationFee: 2000,
      consultationPaid: false,
      pharmacyFee: 0,
      pharmacyPaid: false
    }
  },
  {
    id: "V-1017",
    patientId: "MF-2026-0048",
    patientName: "Sunil Wickramasinghe",
    patientAge: 47,
    patientGender: "Male",
    patientPhone: "075 220 1934",
    doctorId: "doc-1",
    doctorName: "Dr. K. Perera",
    doctorSpecialty: "General Practitioner / Family Physician",
    doctorRoom: "Room 01",
    sessionName: "Evening GP Session (05:00 PM - 08:30 PM)",
    bookingRef: "BK-8817",
    tokenNumber: 17,
    isWalkIn: false,
    status: "NOT_CHECKED_IN",
    bookedAt: "02:30 PM",
    labReports: [],
    billing: {
      consultationFee: 2000,
      consultationPaid: false,
      pharmacyFee: 0,
      pharmacyPaid: false
    }
  },
  {
    id: "V-1014",
    patientId: "MF-2026-0045",
    patientName: "Dilani Alwis",
    patientAge: 28,
    patientGender: "Female",
    patientPhone: "076 991 2304",
    doctorId: "doc-1",
    doctorName: "Dr. K. Perera",
    doctorSpecialty: "General Practitioner / Family Physician",
    doctorRoom: "Room 01",
    sessionName: "Evening GP Session (05:00 PM - 08:30 PM)",
    bookingRef: "BK-8814",
    tokenNumber: 14,
    isWalkIn: false,
    status: "COMPLETED",
    bookedAt: "09:40 AM",
    checkedInAt: "04:55 PM",
    calledAt: "05:00 PM",
    completedAt: "05:14 PM",
    vitals: {
      bp: "115/75",
      pulse: "70 bpm",
      temp: "99.1 °F",
      weight: "54 kg"
    },
    clinicalNotes: {
      complaints: "Acute pharyngitis, sore throat, and mild fever for 2 days.",
      diagnosis: "Upper Respiratory Tract Infection (Streptococcal suspect)",
      doctorNotes: "Prescribed antibiotic course. Advised warm water gargle and rest."
    },
    prescription: {
      id: "RX-5500",
      issuedAt: "05:10 PM",
      isDispensed: true,
      dispensedAt: "05:18 PM",
      dispensedBy: "Pharmacist Samantha",
      items: [
        {
          id: "item-a",
          medicine: "Amoxicillin",
          strength: "500mg",
          dosage: "1 cap",
          frequency: "TDS (8 hourly)",
          duration: "5 days",
          instructions: "Complete the full 5-day course",
          quantityToDispense: 15,
          dispensedBatch: "AMX-2026A",
          dispensedQuantity: 15
        },
        {
          id: "item-b",
          medicine: "Paracetamol",
          strength: "500mg",
          dosage: "2 tabs",
          frequency: "TDS / SOS",
          duration: "3 days",
          instructions: "Take after meals for fever or pain",
          quantityToDispense: 12,
          dispensedBatch: "PCM-991",
          dispensedQuantity: 12
        }
      ]
    },
    labReports: [],
    billing: {
      consultationFee: 2000,
      consultationPaid: true,
      consultationPaymentTime: "05:25 PM",
      pharmacyFee: 621,
      pharmacyPaid: true,
      pharmacyPaymentTime: "05:25 PM",
      paymentMethod: "Card",
      receiptNumber: "RCP-2026-0182"
    }
  },
  // ── HISTORICAL PAST VISITS FOR RETURNING PATIENTS ──
  {
    id: "V-HIST-38-1",
    patientId: "MF-2026-0038",
    patientName: "Kamani Jayasinghe",
    patientAge: 52,
    patientGender: "Female",
    patientPhone: "077 452 9812",
    doctorId: "doc-1",
    doctorName: "Dr. K. Perera",
    doctorSpecialty: "General Practitioner / Family Physician",
    doctorRoom: "Room 01",
    sessionName: "Evening GP Session",
    bookingRef: "BK-7102",
    tokenNumber: 9,
    isWalkIn: false,
    status: "COMPLETED",
    date: "2026-08-14",
    bookedAt: "04:10 PM",
    checkedInAt: "05:00 PM",
    calledAt: "05:15 PM",
    completedAt: "05:30 PM",
    vitals: {
      bp: "142/90",
      pulse: "78 bpm",
      temp: "98.4 °F",
      weight: "69 kg",
      sugar: "138 mg/dL"
    },
    clinicalNotes: {
      complaints: "Routine follow-up for blood pressure and mild epigastric burning after dinner.",
      diagnosis: "Essential Hypertension & Mild Gastritis (Penicillin Allergy confirmed)",
      doctorNotes: "Advised low-salt diet and regular morning walking. Prescribed Atorvastatin and Omeprazole."
    },
    prescription: {
      id: "RX-HIST-38-1",
      issuedAt: "05:25 PM",
      isDispensed: true,
      dispensedAt: "05:35 PM",
      dispensedBy: "Pharmacist Samantha",
      items: [
        {
          id: "item-h1",
          medicine: "Atorvastatin",
          strength: "20mg",
          dosage: "1 tab",
          frequency: "OD (Night)",
          duration: "30 days",
          instructions: "Take after dinner",
          quantityToDispense: 30
        },
        {
          id: "item-h2",
          medicine: "Omeprazole",
          strength: "20mg",
          dosage: "1 cap",
          frequency: "BD (12 hourly)",
          duration: "14 days",
          instructions: "Take 30 mins before breakfast & dinner",
          quantityToDispense: 28
        }
      ]
    },
    labReports: [
      {
        id: "LAB-H38",
        testName: "Lipid Profile & Serum Creatinine",
        labName: "MediFlow Diagnostics",
        date: "2026-08-10",
        status: "Reviewed",
        uploader: "Staff Nurse Chathuri",
        doctorNotes: "Total cholesterol: 232 mg/dL. Renal profile normal."
      }
    ],
    billing: {
      consultationFee: 2000,
      consultationPaid: true,
      pharmacyFee: 1900,
      pharmacyPaid: true
    }
  },
  {
    id: "V-HIST-38-2",
    patientId: "MF-2026-0038",
    patientName: "Kamani Jayasinghe",
    patientAge: 52,
    patientGender: "Female",
    patientPhone: "077 452 9812",
    doctorId: "doc-1",
    doctorName: "Dr. K. Perera",
    doctorSpecialty: "General Practitioner / Family Physician",
    doctorRoom: "Room 01",
    sessionName: "Evening GP Session",
    bookingRef: "BK-6320",
    tokenNumber: 4,
    isWalkIn: true,
    status: "COMPLETED",
    date: "2026-04-22",
    bookedAt: "05:15 PM",
    checkedInAt: "05:20 PM",
    calledAt: "05:32 PM",
    completedAt: "05:46 PM",
    vitals: {
      bp: "136/86",
      pulse: "82 bpm",
      temp: "100.1 °F",
      weight: "70 kg",
      sugar: "128 mg/dL"
    },
    clinicalNotes: {
      complaints: "Fever, dry irritating cough, and runny nose for 3 days.",
      diagnosis: "Acute Viral URTI (Penicillin allergy noted - avoid Beta-lactams)",
      doctorNotes: "Symptomatic treatment provided with Paracetamol and Cetirizine. Steam inhalation advised."
    },
    prescription: {
      id: "RX-HIST-38-2",
      issuedAt: "05:40 PM",
      isDispensed: true,
      dispensedAt: "05:50 PM",
      dispensedBy: "Pharmacist Samantha",
      items: [
        {
          id: "item-h3",
          medicine: "Paracetamol",
          strength: "500mg",
          dosage: "2 tabs",
          frequency: "TDS (8 hourly)",
          duration: "4 days",
          instructions: "Take after meals for fever/headache",
          quantityToDispense: 24
        },
        {
          id: "item-h4",
          medicine: "Cetirizine",
          strength: "10mg",
          dosage: "1 tab",
          frequency: "OD (Night)",
          duration: "5 days",
          instructions: "Take at bedtime",
          quantityToDispense: 5
        }
      ]
    },
    labReports: [],
    billing: {
      consultationFee: 2000,
      consultationPaid: true,
      pharmacyFee: 252,
      pharmacyPaid: true
    }
  },
  {
    id: "V-HIST-42-1",
    patientId: "MF-2026-0042",
    patientName: "Nimal Senanayake",
    patientAge: 61,
    patientGender: "Male",
    patientPhone: "077 123 4567",
    doctorId: "doc-1",
    doctorName: "Dr. K. Perera",
    doctorSpecialty: "General Practitioner / Family Physician",
    doctorRoom: "Room 01",
    sessionName: "Evening GP Session",
    bookingRef: "BK-7610",
    tokenNumber: 12,
    isWalkIn: false,
    status: "COMPLETED",
    date: "2026-09-02",
    bookedAt: "04:30 PM",
    checkedInAt: "05:10 PM",
    calledAt: "05:25 PM",
    completedAt: "05:42 PM",
    vitals: {
      bp: "132/84",
      pulse: "80 bpm",
      temp: "98.2 °F",
      weight: "72 kg",
      sugar: "172 mg/dL"
    },
    clinicalNotes: {
      complaints: "Type 2 Diabetes routine review and fasting blood sugar monitoring. Occasional foot tingling.",
      diagnosis: "Type 2 Diabetes Mellitus - Suboptimal Glycemic Control (Sulfa Allergy Alert)",
      doctorNotes: "HbA1c 7.8%. Emphasized strict carbohydrate diet and 30 mins brisk walking. Avoid Sulphonylureas due to sulfa allergy."
    },
    prescription: {
      id: "RX-HIST-42-1",
      issuedAt: "05:38 PM",
      isDispensed: true,
      dispensedAt: "05:48 PM",
      dispensedBy: "Pharmacist Samantha",
      items: [
        {
          id: "item-h5",
          medicine: "Metformin 500mg",
          strength: "500mg",
          dosage: "1 tab",
          frequency: "BD (12 hourly)",
          duration: "30 days",
          instructions: "Take with or right after main meals",
          quantityToDispense: 60
        }
      ]
    },
    labReports: [
      {
        id: "LAB-H42",
        testName: "HbA1c & Fasting Plasma Glucose",
        labName: "MediFlow Diagnostics",
        date: "2026-09-01",
        status: "Reviewed",
        uploader: "Staff Nurse Chathuri",
        doctorNotes: "HbA1c: 7.8%, FBS: 168 mg/dL."
      }
    ],
    billing: {
      consultationFee: 2000,
      consultationPaid: true,
      pharmacyFee: 900,
      pharmacyPaid: true
    }
  },
  {
    id: "V-HIST-41-1",
    patientId: "MF-2026-0041",
    patientName: "Kasun Fernando",
    patientAge: 34,
    patientGender: "Male",
    patientPhone: "071 883 4510",
    doctorId: "doc-1",
    doctorName: "Dr. K. Perera",
    doctorSpecialty: "General Practitioner / Family Physician",
    doctorRoom: "Room 01",
    sessionName: "Evening GP Session",
    bookingRef: "BK-6912",
    tokenNumber: 7,
    isWalkIn: true,
    status: "COMPLETED",
    date: "2026-07-10",
    bookedAt: "05:00 PM",
    checkedInAt: "05:05 PM",
    calledAt: "05:18 PM",
    completedAt: "05:32 PM",
    vitals: {
      bp: "120/78",
      pulse: "72 bpm",
      temp: "98.6 °F",
      weight: "74 kg",
      sugar: "94 mg/dL"
    },
    clinicalNotes: {
      complaints: "Burning sensation in upper abdomen and sour burping after spicy food.",
      diagnosis: "Acid Peptic Disease / Reflux Gastritis",
      doctorNotes: "Prescribed 14-day PPI course. Advised to avoid tea on empty stomach."
    },
    prescription: {
      id: "RX-HIST-41-1",
      issuedAt: "05:28 PM",
      isDispensed: true,
      dispensedAt: "05:38 PM",
      dispensedBy: "Pharmacist Samantha",
      items: [
        {
          id: "item-h6",
          medicine: "Omeprazole 20mg",
          strength: "20mg",
          dosage: "1 cap",
          frequency: "BD (12 hourly)",
          duration: "14 days",
          instructions: "Take 30 mins before morning & night meals",
          quantityToDispense: 28
        }
      ]
    },
    labReports: [],
    billing: {
      consultationFee: 2000,
      consultationPaid: true,
      pharmacyFee: 700,
      pharmacyPaid: true
    }
  }
];

const MediFlowContext = createContext<MediFlowContextType | undefined>(undefined);

export const MediFlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ClinicSettings>(initialSettings);
  const [doctors] = useState<Doctor[]>(initialDoctors);
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [visits, setVisits] = useState<Visit[]>(initialVisits);
  const [medicines, setMedicines] = useState<MedicineItem[]>(initialMedicines);
  const [activeView, setActiveView] = useState<string>('reception');
  const [selectedVisitIdForMobile, setSelectedVisitIdForMobile] = useState<string>('V-1016');

  // Load from LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.settings) setSettings(parsed.settings);
        if (parsed.patients) setPatients(parsed.patients);
        if (parsed.visits) setVisits(parsed.visits);
        if (parsed.medicines) setMedicines(parsed.medicines);
      }
    } catch (e) {
      console.error("Failed to load MediFlow state from localStorage", e);
    }
  }, []);

  // Sync to LocalStorage
  const saveState = (
    newSettings = settings,
    newPatients = patients,
    newVisits = visits,
    newMedicines = medicines
  ) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          settings: newSettings,
          patients: newPatients,
          visits: newVisits,
          medicines: newMedicines
        })
      );
    } catch (e) {
      console.error("Failed to save MediFlow state to localStorage", e);
    }
  };

  const updateSettings = (newSettings: Partial<ClinicSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveState(updated);
  };

  const resetDemoData = () => {
    setSettings(initialSettings);
    setPatients(initialPatients);
    setVisits(initialVisits);
    setMedicines(initialMedicines);
    setSelectedVisitIdForMobile('V-1016');
    saveState(initialSettings, initialPatients, initialVisits, initialMedicines);
  };

  const registerPatient = (patientData: Omit<Patient, 'id' | 'createdAt' | 'pastVisitsCount'>): Patient => {
    const newId = `MF-2026-${String(patients.length + 40).padStart(4, '0')}`;
    const newPatient: Patient = {
      ...patientData,
      id: newId,
      pastVisitsCount: 0,
      createdAt: new Date().toISOString().split('T')[0]
    };
    const updated = [newPatient, ...patients];
    setPatients(updated);
    saveState(settings, updated);
    return newPatient;
  };

  const searchPatients = (query: string): Patient[] => {
    const q = query.toLowerCase().trim();
    if (!q) return patients;
    return patients.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.nic.toLowerCase().includes(q)
    );
  };

  const bookVisit = (patientId: string, doctorId: string, isWalkIn: boolean): Visit => {
    const patient = patients.find(p => p.id === patientId);
    const doctor = doctors.find(d => d.id === doctorId) || doctors[0];
    
    // Find highest token for the doctor today
    const currentTokens = visits
      .filter(v => v.doctorId === doctor.id)
      .map(v => v.tokenNumber);
    const nextToken = currentTokens.length > 0 ? Math.max(...currentTokens) + 1 : 1;
    
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newVisitId = `V-${1000 + visits.length + 1}`;
    const bookingRef = `BK-${8800 + visits.length + 1}`;

    const newVisit: Visit = {
      id: newVisitId,
      patientId: patient?.id || 'MF-UNKNOWN',
      patientName: patient?.name || 'Walk-in Patient',
      patientAge: patient?.age || 30,
      patientGender: patient?.gender || 'Male',
      patientPhone: patient?.phone || '',
      doctorId: doctor.id,
      doctorName: doctor.name,
      doctorSpecialty: doctor.specialty,
      doctorRoom: doctor.room,
      sessionName: doctor.sessions[0],
      bookingRef,
      tokenNumber: nextToken,
      isWalkIn,
      status: isWalkIn ? 'WAITING' : 'NOT_CHECKED_IN',
      bookedAt: timeString,
      checkedInAt: isWalkIn ? timeString : undefined,
      labReports: [],
      billing: {
        consultationFee: doctor.consultationFee,
        consultationPaid: false,
        pharmacyFee: 0,
        pharmacyPaid: false
      }
    };

    const updatedVisits = [...visits, newVisit];
    setVisits(updatedVisits);
    setSelectedVisitIdForMobile(newVisit.id);
    saveState(settings, patients, updatedVisits);
    return newVisit;
  };

  const checkInVisit = (visitId: string) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updated = visits.map(v => {
      if (v.id === visitId) {
        return {
          ...v,
          status: 'WAITING' as QueueStatus,
          checkedInAt: v.checkedInAt || now
        };
      }
      return v;
    });
    setVisits(updated);
    saveState(settings, patients, updated);
  };

  const checkInByQR = (codeOrRef: string): Visit | null => {
    const trimmed = codeOrRef.trim().toUpperCase();
    const match = visits.find(
      v => v.bookingRef.toUpperCase() === trimmed || 
           v.patientId.toUpperCase() === trimmed || 
           v.id.toUpperCase() === trimmed
    );
    if (match) {
      checkInVisit(match.id);
      return match;
    }
    return null;
  };

  const callPatient = (visitId: string) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updated = visits.map(v => {
      if (v.id === visitId) {
        return {
          ...v,
          status: 'CALLED' as QueueStatus,
          calledAt: now
        };
      }
      return v;
    });
    setVisits(updated);
    saveState(settings, patients, updated);
  };

  const startConsultation = (visitId: string) => {
    const updated = visits.map(v => {
      if (v.id === visitId) {
        return {
          ...v,
          status: 'IN_CONSULTATION' as QueueStatus
        };
      }
      return v;
    });
    setVisits(updated);
    saveState(settings, patients, updated);
  };

  const updateVitals = (visitId: string, vitals: Visit['vitals']) => {
    const updated = visits.map(v => {
      if (v.id === visitId) {
        return {
          ...v,
          vitals: { ...v.vitals, ...vitals }
        };
      }
      return v;
    });
    setVisits(updated);
    saveState(settings, patients, updated);
  };

  const updateClinicalNotes = (visitId: string, notes: Visit['clinicalNotes']) => {
    const updated = visits.map(v => {
      if (v.id === visitId) {
        return {
          ...v,
          clinicalNotes: { ...v.clinicalNotes, ...notes }
        };
      }
      return v;
    });
    setVisits(updated);
    saveState(settings, patients, updated);
  };

  const issuePrescription = (visitId: string, items: PrescriptionItem[]) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const rxId = `RX-${Math.floor(1000 + Math.random() * 9000)}`;

    // Estimate pharmacy fee
    let totalPharmacyFee = 0;
    items.forEach(it => {
      const med = medicines.find(m => m.name.toLowerCase().includes(it.medicine.toLowerCase()));
      const price = med?.batches[0]?.unitPrice || 20;
      totalPharmacyFee += price * (it.quantityToDispense || 10);
    });

    const updated = visits.map(v => {
      if (v.id === visitId) {
        return {
          ...v,
          prescription: {
            id: rxId,
            issuedAt: now,
            items,
            isDispensed: false
          },
          billing: {
            ...v.billing,
            pharmacyFee: totalPharmacyFee
          }
        };
      }
      return v;
    });
    setVisits(updated);
    saveState(settings, patients, updated);
  };

  const uploadLabReport = (visitId: string, report: Omit<LabReport, 'id'>) => {
    const reportId = `LAB-${Math.floor(100 + Math.random() * 900)}`;
    const newReport: LabReport = {
      ...report,
      id: reportId
    };

    const updated = visits.map(v => {
      if (v.id === visitId) {
        return {
          ...v,
          labReports: [...v.labReports, newReport]
        };
      }
      return v;
    });
    setVisits(updated);
    saveState(settings, patients, updated);
  };

  const reviewLabReport = (visitId: string, reportId: string, doctorNotes: string) => {
    const updated = visits.map(v => {
      if (v.id === visitId) {
        return {
          ...v,
          labReports: v.labReports.map(lr => {
            if (lr.id === reportId) {
              return {
                ...lr,
                status: 'Reviewed' as const,
                doctorNotes
              };
            }
            return lr;
          })
        };
      }
      return v;
    });
    setVisits(updated);
    saveState(settings, patients, updated);
  };

  const completeConsultation = (visitId: string) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updated = visits.map(v => {
      if (v.id === visitId) {
        return {
          ...v,
          status: 'COMPLETED' as QueueStatus,
          completedAt: now
        };
      }
      return v;
    });
    setVisits(updated);
    saveState(settings, patients, updated);
  };

  const markPatientMissed = (visitId: string) => {
    const updated = visits.map(v => {
      if (v.id === visitId) {
        return {
          ...v,
          status: 'MISSED' as QueueStatus
        };
      }
      return v;
    });
    setVisits(updated);
    saveState(settings, patients, updated);
  };

  const setEmergencyPriority = (visitId: string, reason: string) => {
    const updated = visits.map(v => {
      if (v.id === visitId) {
        return {
          ...v,
          priorityReason: reason
        };
      }
      return v;
    });
    setVisits(updated);
    saveState(settings, patients, updated);
  };

  const dispensePrescription = (
    visitId: string,
    batchAssignments: { itemId: string; batchNumber: string; quantity: number }[]
  ) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Deduct stock from medicines
    const updatedMedicines = medicines.map(med => {
      const updatedBatches = med.batches.map(batch => {
        const matched = batchAssignments.find(b => b.batchNumber === batch.batchNumber);
        if (matched) {
          return {
            ...batch,
            stockQuantity: Math.max(0, batch.stockQuantity - matched.quantity)
          };
        }
        return batch;
      });
      return { ...med, batches: updatedBatches };
    });

    const updatedVisits = visits.map(v => {
      if (v.id === visitId && v.prescription) {
        const updatedItems = v.prescription.items.map(it => {
          const matched = batchAssignments.find(b => b.itemId === it.id);
          return {
            ...it,
            dispensedBatch: matched?.batchNumber || 'STANDARD-BATCH',
            dispensedQuantity: matched?.quantity || it.quantityToDispense
          };
        });

        return {
          ...v,
          prescription: {
            ...v.prescription,
            isDispensed: true,
            dispensedAt: now,
            dispensedBy: "Pharmacist Samantha",
            items: updatedItems
          }
        };
      }
      return v;
    });

    setMedicines(updatedMedicines);
    setVisits(updatedVisits);
    saveState(settings, patients, updatedVisits, updatedMedicines);
  };

  const collectConsultationFee = (visitId: string, method: PaymentMethod) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const receipt = `RCP-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const updated = visits.map(v => {
      if (v.id === visitId) {
        return {
          ...v,
          billing: {
            ...v.billing,
            consultationPaid: true,
            consultationPaymentTime: now,
            paymentMethod: method,
            receiptNumber: v.billing.receiptNumber || receipt
          }
        };
      }
      return v;
    });
    setVisits(updated);
    saveState(settings, patients, updated);
  };

  const collectPharmacyFee = (visitId: string, method: PaymentMethod) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const receipt = `RCP-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const updated = visits.map(v => {
      if (v.id === visitId) {
        return {
          ...v,
          billing: {
            ...v.billing,
            pharmacyPaid: true,
            pharmacyPaymentTime: now,
            paymentMethod: method,
            receiptNumber: v.billing.receiptNumber || receipt
          }
        };
      }
      return v;
    });
    setVisits(updated);
    saveState(settings, patients, updated);
  };

  const collectAllFees = (visitId: string, method: PaymentMethod) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const receipt = `RCP-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const updated = visits.map(v => {
      if (v.id === visitId) {
        return {
          ...v,
          billing: {
            ...v.billing,
            consultationPaid: true,
            consultationPaymentTime: now,
            pharmacyPaid: true,
            pharmacyPaymentTime: now,
            paymentMethod: method,
            receiptNumber: receipt
          }
        };
      }
      return v;
    });
    setVisits(updated);
    saveState(settings, patients, updated);
  };

  return (
    <MediFlowContext.Provider
      value={{
        settings,
        doctors,
        patients,
        visits,
        medicines,
        activeView,
        selectedVisitIdForMobile,
        setActiveView,
        setSelectedVisitIdForMobile,
        updateSettings,
        resetDemoData,
        registerPatient,
        searchPatients,
        bookVisit,
        checkInVisit,
        checkInByQR,
        callPatient,
        startConsultation,
        updateVitals,
        updateClinicalNotes,
        issuePrescription,
        uploadLabReport,
        reviewLabReport,
        completeConsultation,
        markPatientMissed,
        setEmergencyPriority,
        dispensePrescription,
        collectConsultationFee,
        collectPharmacyFee,
        collectAllFees
      }}
    >
      {children}
    </MediFlowContext.Provider>
  );
};

export const useMediFlow = () => {
  const context = useContext(MediFlowContext);
  if (!context) {
    throw new Error('useMediFlow must be used within a MediFlowProvider');
  }
  return context;
};
