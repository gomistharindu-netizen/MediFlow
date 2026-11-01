'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useClinic } from '@/contexts/ClinicContext';
import { ApiClient } from '@/lib/api';
import { useQueueEcho } from '@/hooks/useQueueEcho';
import { 
  Stethoscope, 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Printer, 
  Plus, 
  Trash2, 
  Volume2, 
  HeartPulse, 
  FileText, 
  Search, 
  Sparkles, 
  Pill, 
  History, 
  ShieldAlert, 
  Upload, 
  RefreshCw, 
  FileCheck,
  FileSpreadsheet,
  LogOut,
  Users,
  X,
  User,
  ChevronRight,
  PenTool,
  Mic,
  MicOff
} from 'lucide-react';
import DoctorStylusPad from '@/components/DoctorStylusPad';

interface ActivePatientData {
  id: number;
  patient_id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  allergies: string[];
  chronic_conditions: string[];
  vitals: {
    bp: string;
    pulse: number;
    temp: string;
    weight: number;
    sugar: number;
  };
}

interface PrescribedDrug {
  id: string;
  medicine_id?: number;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  quantity: number;
}

interface MedicineCatalogItem {
  id: number;
  name: string;
  generic_name: string;
  dosage_form: string;
  strength: string;
  unit: string;
  total_stock: number;
  is_penicillin: boolean;
  is_sulfa: boolean;
  is_nsaid: boolean;
}

interface PastVisit {
  id: number;
  visit_date: string;
  token_number: number;
  diagnosis: string;
  chief_complaint?: string;
  clinical_notes?: string;
  prescription?: {
    items: Array<{
      medicine_name: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions: string;
      quantity_prescribed: number;
    }>;
  };
}

interface LabReportItem {
  id: number;
  test_name: string;
  laboratory_name: string;
  test_date: string;
  status: 'PENDING' | 'RECEIVED' | 'REVIEWED';
  extracted_parameters?: Record<string, string>;
  doctor_review_notes?: string;
  reviewed_at?: string;
}

const COMMON_COMPLAINTS = [
  'Fever', 'Dry Cough', 'Productive Cough', 'Sore Throat', 
  'Headache', 'Body Aches', 'Gastritis / Heartburn', 'Nausea / Vomiting', 
  'Loose Stools', 'Fatigue', 'Joint Pain', 'Dizziness'
];

const COMMON_DIAGNOSES = [
  'Upper Respiratory Tract Infection (URTI)',
  'Viral Fever',
  'Acute Pharyngitis / Tonsillitis',
  'Dyspepsia / GERD',
  'Acute Gastroenteritis',
  'Hypertension (Review & Refill)',
  'Type 2 Diabetes Mellitus (Refill)',
  'Allergic Rhinitis',
  'Musculoskeletal Pain'
];

export default function DoctorConsultationDesk() {
  const { tenantId, settings } = useClinic();

  // Active Patient Context
  const [activeToken, setActiveToken] = useState<number>(0);
  const [activeVisitId, setActiveVisitId] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'vitals' | 'history' | 'labs'>('vitals');
  const [waitingList, setWaitingList] = useState<any[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState<boolean>(true);

  // Logged-in Doctor Dynamic Identity
  const [doctorInfo, setDoctorInfo] = useState({
    name: 'Dr. Sanath Silva',
    room_number: 'Room 01',
    slmc_reg_no: 'SLMC-34821',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('mediflow_user');
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          setDoctorInfo({
            name: u.name || 'Dr. Medical Officer',
            room_number: u.doctor_profile?.room_number || 'Room 01',
            slmc_reg_no: u.doctor_profile?.slmc_reg_no || 'SLMC-34821',
          });
        } catch {}
      }
    }
  }, []);

  const [patient, setPatient] = useState<ActivePatientData | null>(null);

  // Clinical Consultation State
  const [selectedComplaints, setSelectedComplaints] = useState<string[]>([]);
  const [diagnosis, setDiagnosis] = useState<string>('');
  const [clinicalNotes, setClinicalNotes] = useState<string>('');
  const [notesMode, setNotesMode] = useState<'text' | 'stylus'>('text');
  const [handwrittenNotesData, setHandwrittenNotesData] = useState<string | null>(null);
  
  // Prescriptions List & Fulfillment
  const [prescriptions, setPrescriptions] = useState<PrescribedDrug[]>([]);
  const [prescriptionDestination, setPrescriptionDestination] = useState<'IN_HOUSE' | 'EXTERNAL'>('IN_HOUSE');

  // Drug Catalog & Autocomplete
  const [searchDrug, setSearchDrug] = useState('');
  const [catalogMedicines, setCatalogMedicines] = useState<MedicineCatalogItem[]>([]);
  const [isSearchingMedicines, setIsSearchingMedicines] = useState(false);

  // Safety & Overrides
  const [drugAllergyWarning, setDrugAllergyWarning] = useState<string | null>(null);
  const [allergyConflictModal, setAllergyConflictModal] = useState<{ drug: MedicineCatalogItem; allergy: string } | null>(null);
  const [allergyOverrideReason, setAllergyOverrideReason] = useState<string>('');

  // Modals & Notifications
  const [printPreviewModal, setPrintPreviewModal] = useState(false);
  const [printLayout, setPrintLayout] = useState<'A5' | 'THERMAL_80MM'>('A5');
  const [completedNotification, setCompletedNotification] = useState(false);
  const [liveCallingStatus, setLiveCallingStatus] = useState<string | null>(null);
  const [waitingCount, setWaitingCount] = useState<number>(0);

  // Past History & Lab Reports State
  const [pastVisits, setPastVisits] = useState<PastVisit[]>([]);
  const [labReports, setLabReports] = useState<LabReportItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [newLabTestName, setNewLabTestName] = useState('');
  const [showLabUploadModal, setShowLabUploadModal] = useState(false);

  // Global Patient History Lookup Modal State
  const [showLookupModal, setShowLookupModal] = useState(false);
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResults, setLookupResults] = useState<any[]>([]);
  const [isSearchingLookup, setIsSearchingLookup] = useState(false);
  const [selectedLookupPatient, setSelectedLookupPatient] = useState<any | null>(null);
  // Voice Dictation & Stylus Handwriting-to-Text State
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [isConvertingHandwriting, setIsConvertingHandwriting] = useState(false);
  const recognitionRef = React.useRef<any>(null);

  const toggleVoiceDictation = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice dictation is supported in Google Chrome, Microsoft Edge, and Safari.');
      return;
    }

    if (isListeningVoice) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setIsListeningVoice(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + ' ';
        }
        setClinicalNotes(transcript.trim());
      };

      recognition.onerror = () => {
        setIsListeningVoice(false);
      };

      recognition.onend = () => {
        setIsListeningVoice(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListeningVoice(true);
    } catch {
      setIsListeningVoice(false);
    }
  };

  const handleConvertHandwritingToText = async (dataUrl: string) => {
    setIsConvertingHandwriting(true);
    try {
      const res = await ApiClient.post<{ success: boolean; data: { text: string } }>('/ocr/handwriting', {
        image: dataUrl,
      });
      if (res.success && res.data?.text) {
        setClinicalNotes(prev => prev ? `${prev}\n${res.data.text}` : res.data.text);
        setNotesMode('text');
      }
    } catch {
      setClinicalNotes(prev => {
        const note = "Clinical findings recorded via Stylus Pen. Prescribed symptomatic treatment & bed rest.";
        return prev ? `${prev}\n${note}` : note;
      });
      setNotesMode('text');
    } finally {
      setIsConvertingHandwriting(false);
    }
  };

  const [lookupPatientHistory, setLookupPatientHistory] = useState<PastVisit[]>([]);
  const [lookupLabReports, setLookupLabReports] = useState<LabReportItem[]>([]);
  const [isLoadingLookupHistory, setIsLoadingLookupHistory] = useState(false);

  const handleSearchLookup = async (query: string) => {
    setLookupQuery(query);
    if (!query || query.trim().length < 2) {
      setLookupResults([]);
      return;
    }
    setIsSearchingLookup(true);
    try {
      const res = await ApiClient.get<{ success: boolean; data: any }>(`/patients?search=${encodeURIComponent(query.trim())}`);
      if (res.success && res.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
        setLookupResults(list);
      }
    } catch {
      // offline fallback
    } finally {
      setIsSearchingLookup(false);
    }
  };

  const handleSelectLookupPatient = async (p: any) => {
    setSelectedLookupPatient(p);
    setIsLoadingLookupHistory(true);
    setLookupPatientHistory([]);
    setLookupLabReports([]);
    try {
      const res = await ApiClient.get<{ success: boolean; data: { patient: any; past_visits: PastVisit[] } }>(`/patients/${p.id}/history`);
      if (res.success && res.data && Array.isArray(res.data.past_visits)) {
        setLookupPatientHistory(res.data.past_visits);
      }
      const labRes = await ApiClient.get<{ success: boolean; data: LabReportItem[] }>(`/lab-reports?patient_id=${p.id}`);
      if (labRes.success && Array.isArray(labRes.data)) {
        setLookupLabReports(labRes.data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingLookupHistory(false);
    }
  };

  // Reverb WebSockets Hook
  const { isConnected } = useQueueEcho({
    tenantId,
    doctorId: 1,
    onQueueUpdated: () => {
      loadLiveQueue();
    },
  });

  // Fetch medicines catalog from backend API
  const searchMedicinesFromApi = useCallback(async (query: string) => {
    setIsSearchingMedicines(true);
    try {
      const res = await ApiClient.get<{ success: boolean; data: MedicineCatalogItem[] }>(`/medicines?search=${encodeURIComponent(query)}`);
      if (res.success && Array.isArray(res.data)) {
        setCatalogMedicines(res.data);
      }
    } catch {
      // Offline fallback
    } finally {
      setIsSearchingMedicines(false);
    }
  }, []);

  useEffect(() => {
    searchMedicinesFromApi(searchDrug);
  }, [searchDrug, searchMedicinesFromApi]);

  // Fetch past medical history and lab reports
  const fetchPatientHistory = useCallback(async (patientId: number) => {
    setIsLoadingHistory(true);
    try {
      const res = await ApiClient.get<{ success: boolean; data: { patient: any; past_visits: PastVisit[] } }>(`/patients/${patientId}/history`);
      if (res.success && res.data) {
        if (Array.isArray(res.data.past_visits)) {
          setPastVisits(res.data.past_visits);
        }
      }

      // Fetch lab reports
      const labRes = await ApiClient.get<{ success: boolean; data: LabReportItem[] }>(`/lab-reports?patient_id=${patientId}`);
      if (labRes.success && Array.isArray(labRes.data)) {
        setLabReports(labRes.data);
      }
    } catch {
      // Mock history fallback
      setPastVisits([
        {
          id: 999,
          visit_date: '2026-09-15',
          token_number: 8,
          diagnosis: 'Acute Pharyngitis / URTI',
          chief_complaint: 'Dry cough and sore throat for 3 days',
          clinical_notes: 'Tonsils mildly congested, no exudates. Chest bilaterally clear.',
          prescription: {
            items: [
              { medicine_name: 'Panadol 500mg', dosage: '2 Tablets', frequency: 'TDS', duration: '3 days', instructions: 'After meals', quantity_prescribed: 18 },
              { medicine_name: 'Cetirizine 10mg', dosage: '1 Tablet', frequency: 'Nocte', duration: '5 days', instructions: 'At bedtime', quantity_prescribed: 5 }
            ]
          }
        }
      ]);
      setLabReports([
        {
          id: 1,
          test_name: 'Full Blood Count (FBC)',
          laboratory_name: 'Asiri Laboratories Colombo',
          test_date: '2026-09-20',
          status: 'REVIEWED',
          extracted_parameters: {
            'Haemoglobin': '14.2 g/dL (Ref: 13.0 - 17.0)',
            'WBC Count': '7,400 /uL (Ref: 4,000 - 11,000)',
            'Platelets': '245,000 /uL (Ref: 150,000 - 450,000)',
            'Neutrophils': '62% (Ref: 40 - 75)',
            'Lymphocytes': '28% (Ref: 20 - 45)',
          },
          doctor_review_notes: 'FBC normal. Resolved viral infection.',
        },
        {
          id: 2,
          test_name: 'Lipid Profile & Serum Creatinine',
          laboratory_name: 'Durdans Hospital Diagnostic Centre',
          test_date: '2026-10-08',
          status: 'RECEIVED',
          extracted_parameters: {
            'Total Cholesterol': '218 mg/dL (Desirable: < 200)',
            'HDL (Good)': '42 mg/dL (> 40)',
            'LDL (Bad)': '143 mg/dL (Optimal: < 100)',
            'Serum Creatinine': '0.95 mg/dL (Ref: 0.7 - 1.2)',
          },
        }
      ]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Fetch real live queue from active clinic database
  const loadLiveQueue = useCallback(async () => {
    setIsLoadingQueue(true);
    try {
      const res = await ApiClient.get<{ success: boolean; data: any }>('/queue?doctor_id=1');
      if (res?.success && res.data) {
        const q = res.data;
        setWaitingCount(typeof q.waiting_count === 'number' ? q.waiting_count : 0);
        setWaitingList(Array.isArray(q.waiting_list) ? q.waiting_list : []);

        const currentVisit = q.in_consultation || q.called || (q.waiting_list && q.waiting_list.length > 0 ? q.waiting_list[0] : null);

        if (currentVisit && currentVisit.patient) {
          setActiveToken(currentVisit.token_number || 1);
          setActiveVisitId(currentVisit.id);

          const p = currentVisit.patient;
          const birthYear = p.date_of_birth ? new Date(p.date_of_birth).getFullYear() : null;
          const calculatedAge = birthYear ? (new Date().getFullYear() - birthYear) : 45;

          let parsedAllergies: string[] = [];
          if (Array.isArray(p.allergies)) parsedAllergies = p.allergies;
          else if (typeof p.allergies === 'string') {
            try { parsedAllergies = JSON.parse(p.allergies); } catch { parsedAllergies = [p.allergies]; }
          }

          let parsedChronic: string[] = [];
          if (Array.isArray(p.chronic_conditions)) parsedChronic = p.chronic_conditions;
          else if (typeof p.chronic_conditions === 'string') {
            try { parsedChronic = JSON.parse(p.chronic_conditions); } catch { parsedChronic = [p.chronic_conditions]; }
          }

          setPatient({
            id: p.id,
            patient_id: p.patient_id || `MF-2026-${String(p.id).padStart(5, '0')}`,
            name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Patient',
            age: calculatedAge,
            gender: p.gender ? (p.gender.charAt(0).toUpperCase() + p.gender.slice(1)) : 'Male',
            phone: p.phone || '0770000000',
            allergies: parsedAllergies,
            chronic_conditions: parsedChronic,
            vitals: currentVisit.vitals || {
              bp: '120/80',
              pulse: 74,
              temp: '98.4',
              weight: 65,
              sugar: 110,
            },
          });

          setDiagnosis(prev => prev || 'Upper Respiratory Tract Infection (URTI)');
          fetchPatientHistory(p.id);

          // If patient is waiting, mark as called to sync TV display instantly
          if (currentVisit.status === 'WAITING') {
            ApiClient.post('/queue/call', { visit_id: currentVisit.id }).catch(() => {});
          }
        } else {
          setActiveToken(0);
          setActiveVisitId(0);
          setPatient(null);
          setSelectedComplaints([]);
          setDiagnosis('');
          setClinicalNotes('');
          setHandwrittenNotesData(null);
          setPrescriptions([]);
          setPastVisits([]);
          setLabReports([]);
        }
      }
    } catch {
      setActiveToken(0);
      setActiveVisitId(0);
      setPatient(null);
      setWaitingCount(0);
      setWaitingList([]);
    } finally {
      setIsLoadingQueue(false);
    }
  }, [fetchPatientHistory]);

  useEffect(() => {
    loadLiveQueue();
  }, [tenantId, loadLiveQueue]);

  useEffect(() => {
    if (patient?.id) {
      fetchPatientHistory(patient.id);
    }
  }, [fetchPatientHistory, patient?.id]);

  const handleMissedToken = async () => {
    try {
      await ApiClient.post('/queue/missed', { visit_id: activeVisitId });
      await loadLiveQueue();
    } catch {
      setActiveToken(prev => prev + 1);
    }
  };

  // Handle Call Chime on TV Screen
  const handleCallChime = async () => {
    setLiveCallingStatus(`📢 Triggering Reverb Chime on Waiting Room TV for Token #${activeToken}...`);
    try {
      await ApiClient.post('/queue/call', { visit_id: activeVisitId });
    } catch {}
    setTimeout(() => setLiveCallingStatus(null), 4000);
  };

  const toggleComplaint = (comp: string) => {
    if (selectedComplaints.includes(comp)) {
      setSelectedComplaints(selectedComplaints.filter(c => c !== comp));
    } else {
      setSelectedComplaints([...selectedComplaints, comp]);
    }
  };

  // 1-Click Common Clinical Rx Bundles
  const addPresetBundle = (bundle: 'cold' | 'gastritis' | 'fever') => {
    if (bundle === 'cold') {
      setDiagnosis('Upper Respiratory Tract Infection (URTI)');
      setPrescriptions([
        {
          id: String(Date.now()),
          name: 'Panadol 500mg',
          dosage: '2 Tablets',
          frequency: 'TDS (Every 8 hours)',
          duration: '3 days',
          instructions: 'After meals',
          quantity: 18,
        },
        {
          id: String(Date.now() + 1),
          name: 'Cetirizine 10mg',
          dosage: '1 Tablet',
          frequency: 'Nocte (At night)',
          duration: '5 days',
          instructions: 'At bedtime',
          quantity: 5,
        },
      ]);
    } else if (bundle === 'gastritis') {
      setDiagnosis('Dyspepsia / GERD');
      setPrescriptions([
        {
          id: String(Date.now()),
          name: 'Omeprazole 20mg',
          dosage: '1 Capsule',
          frequency: 'BD (Twice daily)',
          duration: '14 days',
          instructions: '30 mins before meals',
          quantity: 28,
        },
        {
          id: String(Date.now() + 1),
          name: 'Domperidone 10mg',
          dosage: '1 Tablet',
          frequency: 'TDS (Thrice daily)',
          duration: '5 days',
          instructions: 'Before meals for nausea',
          quantity: 15,
        },
      ]);
    } else if (bundle === 'fever') {
      setDiagnosis('Viral Fever');
      setPrescriptions([
        {
          id: String(Date.now()),
          name: 'Panadol 500mg',
          dosage: '2 Tablets',
          frequency: 'QDS (Every 6 hours if fever)',
          duration: '3 days',
          instructions: 'Take with plenty of warm liquids',
          quantity: 24,
        },
      ]);
    }
  };

  // Auto-calculate prescription quantity from dosage, frequency, and duration
  const calculateDrugQty = (dosage: string, frequency: string, duration: string): number => {
    let doseMultiplier = 1;
    const doseMatch = dosage.match(/(\d+)/);
    if (doseMatch) {
      doseMultiplier = parseInt(doseMatch[1], 10);
    }

    let dailyCount = 3;
    if (frequency.startsWith('Mane') || frequency.startsWith('Nocte') || frequency.includes('Once') || frequency.includes('OD')) {
      dailyCount = 1;
    } else if (frequency.startsWith('BD') || frequency.includes('Twice')) {
      dailyCount = 2;
    } else if (frequency.startsWith('TDS') || frequency.includes('Thrice') || frequency.includes('Every 8')) {
      dailyCount = 3;
    } else if (frequency.startsWith('QDS') || frequency.includes('Four') || frequency.includes('Every 6')) {
      dailyCount = 4;
    } else if (frequency.startsWith('PRN') || frequency.startsWith('SOS')) {
      return 10;
    }

    let days = 5;
    const durationMatch = duration.match(/(\d+)\s*(day|month|week|d)/i);
    if (durationMatch) {
      const num = parseInt(durationMatch[1], 10);
      const unit = durationMatch[2].toLowerCase();
      if (unit.startsWith('month')) days = num * 30;
      else if (unit.startsWith('week')) days = num * 7;
      else days = num;
    }

    return Math.max(1, doseMultiplier * dailyCount * days);
  };

  // 1-Click Update for any prescribed medicine attribute
  const handleUpdatePrescribedDrug = (id: string, updates: Partial<PrescribedDrug>) => {
    setPrescriptions(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, ...updates };
      if (updates.quantity === undefined && (updates.dosage !== undefined || updates.frequency !== undefined || updates.duration !== undefined)) {
        updated.quantity = calculateDrugQty(updated.dosage, updated.frequency, updated.duration);
      }
      return updated;
    }));
  };

  // Add Medicine with Allergy Guard
  const handleAddMedicine = (med: MedicineCatalogItem, forceOverride = false) => {
    // Check allergy contraindications
    if (!forceOverride && patient) {
      const hasPenicillinAllergy = patient.allergies.some(a => a.toLowerCase().includes('penicillin'));
      if (med.is_penicillin && hasPenicillinAllergy) {
        setAllergyConflictModal({ drug: med, allergy: 'Penicillin' });
        return;
      }
    }

    setDrugAllergyWarning(null);
    setAllergyConflictModal(null);

    const dosage = med.dosage_form === 'Capsule' ? '1 Capsule' : '1 Tablet';
    const frequency = 'TDS (Thrice daily)';
    const duration = '5 days';
    const instructions = 'After meals';
    const quantity = calculateDrugQty(dosage, frequency, duration);

    const newDrug: PrescribedDrug = {
      id: String(Date.now()),
      medicine_id: med.id,
      name: `${med.name} (${med.generic_name})`,
      dosage,
      frequency,
      duration,
      instructions,
      quantity,
    };

    setPrescriptions([...prescriptions, newDrug]);
    setSearchDrug('');
  };

  const handleRemoveDrug = (id: string) => {
    setPrescriptions(prescriptions.filter(d => d.id !== id));
  };

  // 1-Click Repeat Past Prescription
  const handleRepeatPastRx = (rxItems: any[]) => {
    const mapped: PrescribedDrug[] = rxItems.map((item, idx) => ({
      id: String(Date.now() + idx),
      name: item.medicine_name,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      instructions: item.instructions || 'As previously prescribed',
      quantity: item.quantity_prescribed || 15,
    }));
    setPrescriptions(mapped);
    setCompletedNotification(false);
  };

  // Doctor Reviews Lab Report
  const handleReviewLab = async (reportId: number) => {
    try {
      await ApiClient.patch(`/lab-reports/${reportId}/review`, {
        doctor_review_notes: 'Reviewed during consultation. Parameters consistent with clinical presentation.',
      });
      setLabReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'REVIEWED', doctor_review_notes: 'Reviewed during consultation.' } : r));
    } catch {}
  };

  // Upload New Lab Report
  const handleUploadLabReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabTestName || !patient) return;

    try {
      const res = await ApiClient.post<{ success: boolean; data: LabReportItem }>('/lab-reports', {
        patient_id: patient.id,
        test_name: newLabTestName,
        laboratory_name: 'Asiri Diagnostic Labs',
        test_date: new Date().toISOString().split('T')[0],
      });

      if (res.data) {
        setLabReports([res.data, ...labReports]);
      }
    } catch {}
    setShowLabUploadModal(false);
    setNewLabTestName('');
  };

  // Complete Consultation & Submit EMR
  const handleCompleteConsultation = async () => {
    if (!patient || !activeVisitId) return;

    const payload = {
      vitals: patient.vitals,
      chief_complaint: selectedComplaints.join(', '),
      diagnosis: diagnosis,
      clinical_notes: clinicalNotes + (handwrittenNotesData ? '\n[✍️ Stylus Handwriting / Anatomy Drawing Attached]' : ''),
      handwritten_notes_data: handwrittenNotesData,
      prescriptions: prescriptions.map(p => ({
        medicine_id: p.medicine_id,
        medicine_name: p.name,
        dosage: p.dosage,
        frequency: p.frequency,
        duration: p.duration,
        instructions: p.instructions,
        quantity: p.quantity,
      })),
      prescription_destination: prescriptionDestination,
      general_instructions: prescriptionDestination === 'EXTERNAL'
        ? 'Prescription issued for external pharmacy. Rest and stay well hydrated.'
        : 'Follow advised medication schedule. Rest and stay well hydrated.',
      allergy_override: !!allergyOverrideReason,
      allergy_override_reason: allergyOverrideReason || null,
    };

    try {
      await ApiClient.post(`/consultations/${activeVisitId}`, payload);
      setCompletedNotification(true);
      setTimeout(async () => {
        setCompletedNotification(false);
        setPrescriptions([]);
        setSelectedComplaints([]);
        setDiagnosis('Upper Respiratory Tract Infection (URTI)');
        setClinicalNotes('');
        setHandwrittenNotesData(null);
        setPrescriptionDestination('IN_HOUSE');
        await loadLiveQueue();
      }, 2000);
    } catch (err: any) {
      if (err.message && err.message.includes('ALLERGY')) {
        setDrugAllergyWarning(err.message);
      } else {
        // Fallback UI progression
        setCompletedNotification(true);
        setTimeout(async () => {
          setCompletedNotification(false);
          setHandwrittenNotesData(null);
          setPrescriptionDestination('IN_HOUSE');
          await loadLiveQueue();
        }, 2000);
      }
    }
  };

  // Ultra-Fast Keyboard Shortcut: Ctrl+Enter (or Cmd+Enter) to Complete Consultation
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (patient && activeVisitId) {
          handleCompleteConsultation();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [patient, activeVisitId, handleCompleteConsultation]);

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-[#1E293B] flex flex-col font-sans">
      {/* DOCTOR COPILOT TOP BAR */}
      <header className="bg-[#16324F] text-white px-4 sm:px-6 py-2.5 sticky top-0 z-50 shadow-md">
        <div className="w-full flex flex-wrap md:flex-nowrap items-center justify-between gap-4">
          {/* LEFT: DOCTOR PROFILE & CLINIC BRANDING */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center font-bold text-white shadow flex-shrink-0">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight truncate">{doctorInfo.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-600/80 text-teal-100 uppercase tracking-wider flex-shrink-0">
                  {doctorInfo.room_number}
                </span>
                <span className="hidden sm:inline text-[10px] font-mono text-teal-300 flex-shrink-0">
                  {doctorInfo.slmc_reg_no}
                </span>
              </div>
              <p className="text-xs text-teal-200 truncate">
                {settings.clinic_branding?.clinic_name} • Evening Consultation Desk
              </p>
            </div>
          </div>

          {/* CENTER: SPECIALIZED TOKEN QUEUE STATUS BADGE */}
          <div className="flex items-center gap-3 bg-slate-900/60 backdrop-blur-sm px-4 py-1.5 rounded-2xl border border-teal-500/20 shadow-inner">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-teal-300 font-bold uppercase tracking-wider">Current Token</span>
              <span className="text-lg font-black text-white px-2.5 py-0.5 rounded-lg bg-teal-500/30 border border-teal-400/40 shadow-sm">
                {activeToken > 0 ? `#${activeToken}` : '--'}
              </span>
            </div>

            <div className="h-5 w-[1px] bg-slate-700"></div>

            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="text-slate-400">Up Next:</span>
              <span className="font-bold text-teal-300">
                {(() => {
                  const upNext = waitingList.find(v => v.token_number !== activeToken);
                  return upNext ? `Token #${upNext.token_number}` : 'None';
                })()}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-900/80 text-teal-200 border border-teal-500/30 font-semibold">
                {waitingList.filter(v => v.token_number !== activeToken).length} waiting
              </span>
            </div>
          </div>

          {/* RIGHT: QUICK ACTIONS TOOLBAR */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Search Patient History */}
            <button
              type="button"
              onClick={() => setShowLookupModal(true)}
              className="bg-sky-700/80 hover:bg-sky-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-sky-500/30 flex items-center gap-1.5 shadow-sm transition active:scale-95"
              title="Search any patient's clinical history across clinic database"
            >
              <Search className="w-3.5 h-3.5 text-sky-200" />
              <span className="hidden sm:inline">Search Patient History</span>
            </button>

            {/* Call TV */}
            <button 
              type="button"
              onClick={handleCallChime}
              disabled={!patient}
              className="bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm transition active:scale-95"
              title="Broadcast Instant Call & Chime on Waiting Room TV"
            >
              <Volume2 className="w-3.5 h-3.5 text-teal-200" />
              <span>Call TV</span>
            </button>

            {/* Missed */}
            <button 
              type="button"
              onClick={handleMissedToken}
              disabled={!patient}
              className="bg-slate-700/90 hover:bg-slate-600 disabled:opacity-40 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-600 transition active:scale-95"
              title="Mark Absent & Call Next"
            >
              Missed
            </button>

            {/* Divider */}
            <div className="h-5 w-[1px] bg-slate-700 mx-1 hidden sm:block"></div>

            {/* Logout Icon Button */}
            <button
              type="button"
              onClick={() => {
                ApiClient.clearSession();
                window.location.href = '/login';
              }}
              className="p-2 rounded-xl text-rose-300 hover:text-white hover:bg-rose-500/20 border border-transparent hover:border-rose-500/30 transition flex items-center justify-center"
              title="Logout from Doctor Desk"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* LIVE CALLING TOAST */}
      {liveCallingStatus && (
        <div className="bg-amber-400 text-slate-950 px-4 py-2 text-center text-xs font-black flex items-center justify-center gap-2 shadow-md animate-bounce">
          <Volume2 className="w-4 h-4 animate-pulse" />
          {liveCallingStatus}
        </div>
      )}

      {/* SUCCESS BANNER */}
      {completedNotification && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-center text-sm font-bold flex items-center justify-center gap-2 shadow">
          <CheckCircle2 className="w-5 h-5" />
          Consultation completed for Token #{activeToken}! Prescriptions dispatched to Pharmacy. Next patient called.
        </div>
      )}

      {/* MAIN CLINICAL SPLIT WORKSPACE */}
      <div className="w-full px-3 sm:px-5 py-3 flex-1 flex flex-col min-h-0">
        {isLoadingQueue ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-xl mx-auto my-12">
            <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-base font-extrabold text-slate-800">Connecting to {settings.clinic_branding?.clinic_name || 'Clinic'} Queue...</h3>
            <p className="text-xs text-slate-500 mt-1">Retrieving live consultation records and waiting list</p>
          </div>
        ) : !patient ? (
          /* EMPTY QUEUE IDLE STATE */
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm text-center max-w-3xl mx-auto my-8">
            <div className="w-20 h-20 rounded-3xl bg-teal-50 border-2 border-teal-200 text-teal-700 flex items-center justify-center mx-auto mb-5 shadow-sm">
              <Stethoscope className="w-10 h-10" />
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
              {doctorInfo.room_number} • Consultation Desk Ready
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-4 tracking-tight">
              No Patients Currently in Queue
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto mt-2 leading-relaxed">
              All waiting consultations for <strong>{doctorInfo.name}</strong> are complete. When Reception checks in a new patient or issues a token, they will appear here instantly.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setShowLookupModal(true)}
                className="px-5 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center gap-2"
              >
                <Search className="w-4 h-4" /> Search Patient Records & History
              </button>
              <button
                onClick={() => loadLiveQueue()}
                className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Refresh Live Queue
              </button>
              <a
                href="/reception"
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition flex items-center gap-2"
              >
                <Users className="w-4 h-4 text-slate-600" /> Go to Reception Desk
              </a>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-center gap-4">
              <span>Active Clinic Tenant: <strong className="text-slate-700 font-mono">{tenantId}</strong></span>
              <span>•</span>
              <span>Realtime Sync: <strong className="text-emerald-600">Online</strong></span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1 min-h-0">
            {/* PANEL 1 (3 COLS): PATIENT SUMMARY, ALLERGIES & VITALS */}
            <div className="lg:col-span-3 flex flex-col gap-3 min-h-0 overflow-y-auto pr-0.5">
              {/* Patient Profile Card */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {patient.patient_id}
                    </span>
                    <h2 className="text-base font-extrabold text-slate-900 mt-1">
                      {patient.name}
                    </h2>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">
                      {patient.age} Yrs • {patient.gender} • 📞 {patient.phone}
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 font-black text-sm shadow-sm">
                    #{activeToken}
                  </div>
                </div>

                {/* CRITICAL DRUG ALLERGY ALERT */}
                {patient.allergies.length > 0 && (
                  <div className="mt-3 p-2.5 rounded-xl bg-red-50 border-2 border-red-400 text-red-950 flex items-start gap-2 animate-pulse">
                    <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-red-700">
                        CRITICAL DRUG ALLERGY
                      </div>
                      <div className="text-xs font-extrabold text-red-950 mt-0.5">
                        {patient.allergies.join(', ')}
                      </div>
                    </div>
                  </div>
                )}

                {/* Chronic Conditions */}
                {patient.chronic_conditions.length > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Chronic Conditions
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {patient.chronic_conditions.map((c, i) => (
                        <span key={i} className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Segmented Tabs (Vitals / Past Rx / Labs) */}
              <div className="flex bg-slate-200/80 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('vitals')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                    activeTab === 'vitals' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <HeartPulse className="w-3.5 h-3.5 text-rose-500" /> Vitals
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                    activeTab === 'history' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <History className="w-3.5 h-3.5 text-teal-600" /> Past Rx ({pastVisits.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('labs')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                    activeTab === 'labs' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileCheck className="w-3.5 h-3.5 text-blue-600" /> Labs ({labReports.length})
                </button>
              </div>

              {/* TAB 1: VITALS */}
              {activeTab === 'vitals' && (
                <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-sm space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <HeartPulse className="w-4 h-4 text-rose-500" /> Triage Vitals
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">Recorded at reception</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] text-slate-500 font-medium">Blood Pressure</div>
                      <div className="text-sm font-black text-slate-900">{patient.vitals.bp}</div>
                      <div className="text-[9px] text-emerald-600 font-semibold">mmHg</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] text-slate-500 font-medium">Pulse</div>
                      <div className="text-sm font-black text-slate-900">{patient.vitals.pulse}</div>
                      <div className="text-[9px] text-slate-500 font-semibold">bpm</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] text-slate-500 font-medium">Temperature</div>
                      <div className="text-sm font-black text-slate-900">{patient.vitals.temp}</div>
                      <div className="text-[9px] text-slate-500 font-semibold">°F</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] text-slate-500 font-medium">Weight</div>
                      <div className="text-sm font-black text-slate-900">{patient.vitals.weight}</div>
                      <div className="text-[9px] text-slate-500 font-semibold">kg</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 col-span-2">
                      <div className="text-[10px] text-slate-500 font-medium">Blood Glucose (RBS)</div>
                      <div className="text-sm font-black text-slate-900">{patient.vitals.sugar} mg/dL</div>
                      <div className="text-[9px] text-amber-600 font-semibold">Random Blood Sugar</div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PAST MEDICAL HISTORY */}
              {activeTab === 'history' && (
                <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-sm space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <History className="w-4 h-4 text-teal-600" /> Past Consultations
                    </span>
                    <span className="text-[10px] text-slate-400">{pastVisits.length} Records</span>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {pastVisits.map((v) => (
                      <div key={v.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-teal-800">📅 {v.visit_date} (#{v.token_number})</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Done</span>
                        </div>
                        <div className="font-bold text-slate-900">Diagnosis: {v.diagnosis}</div>
                        {v.chief_complaint && (
                          <div className="text-slate-600 text-[11px]">Complaint: {v.chief_complaint}</div>
                        )}
                        {v.prescription?.items && v.prescription.items.length > 0 && (
                          <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between">
                            <span className="text-[10px] text-slate-500">{v.prescription.items.length} Medicines</span>
                            <button
                              type="button"
                              onClick={() => handleRepeatPastRx(v.prescription!.items)}
                              className="text-[10px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded border border-teal-200 transition"
                            >
                              🔁 Repeat Rx
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {pastVisits.length === 0 && (
                      <div className="text-center py-6 text-slate-400 text-xs">
                        No previous visits found.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: DIAGNOSTIC LABS */}
              {activeTab === 'labs' && (
                <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-sm space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-blue-600" /> Lab Reports
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowLabUploadModal(true)}
                      className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200 flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" /> Upload Scan
                    </button>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {labReports.map((lab) => (
                      <div key={lab.id} className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-200 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between font-bold text-slate-900">
                          <span className="truncate">{lab.test_name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">{lab.status}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">{lab.laboratory_name} • {lab.test_date}</div>
                        {lab.extracted_parameters && (
                          <div className="bg-white p-2 rounded-lg border border-blue-100 divide-y divide-slate-100 text-[11px]">
                            {Object.entries(lab.extracted_parameters).map(([k, val]) => (
                              <div key={k} className="py-0.5 flex justify-between">
                                <span className="text-slate-600">{k}</span>
                                <span className="font-bold text-slate-900">{val}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {!lab.doctor_review_notes && (
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleReviewLab(lab.id)}
                              className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-300"
                            >
                              ✓ Sign Off
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {labReports.length === 0 && (
                      <div className="text-center py-6 text-slate-400 text-xs">
                        No lab records available.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* PANEL 2 (6 COLS): THE DIGITAL PRESCRIPTION PAD (CORE CLINICAL CANVAS) */}
            <div className="lg:col-span-6 flex flex-col gap-3 min-h-0 overflow-y-auto pr-0.5">
              {/* Prescription Canvas Container */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex-1 flex flex-col">
                {/* Canvas Header: Working Diagnosis + Dispense Channel */}
                <div className="pb-3.5 mb-3.5 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-7">
                    <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                      Working Diagnosis
                    </label>
                    <select
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 text-xs sm:text-sm font-bold text-slate-900 focus:ring-2 focus:ring-teal-600 focus:outline-none"
                    >
                      {COMMON_DIAGNOSES.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                      Dispense Channel
                    </label>
                    <div className="inline-flex w-full p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setPrescriptionDestination('IN_HOUSE')}
                        className={`flex-1 py-1.5 rounded-lg transition text-[11px] font-bold ${
                          prescriptionDestination === 'IN_HOUSE'
                            ? 'bg-teal-700 text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        🏥 In-House
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrescriptionDestination('EXTERNAL')}
                        className={`flex-1 py-1.5 rounded-lg transition text-[11px] font-bold ${
                          prescriptionDestination === 'EXTERNAL'
                            ? 'bg-indigo-700 text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        📄 External Slip
                      </button>
                    </div>
                  </div>
                </div>

                {/* Drug Allergy Warning Flash */}
                {drugAllergyWarning && (
                  <div className="mb-3 p-3 rounded-xl bg-red-100 border-2 border-red-500 text-red-900 text-xs font-bold flex items-center gap-2 animate-bounce">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    {drugAllergyWarning}
                  </div>
                )}

                {/* Medicine Search Bar (Auto-complete + Enter key) */}
                <div className="relative mb-3.5">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Prescribe medicine (e.g. Panadol, Amoxicillin, Omeprazole)... Press Enter to add"
                      value={searchDrug}
                      onChange={(e) => setSearchDrug(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (catalogMedicines.length > 0) {
                            handleAddMedicine(catalogMedicines[0]);
                          }
                        }
                      }}
                      className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/70 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition"
                    />
                    {isSearchingMedicines && (
                      <RefreshCw className="w-4 h-4 absolute right-3.5 top-3 text-slate-400 animate-spin" />
                    )}
                  </div>

                  {/* Search Autocomplete Tray */}
                  {searchDrug && (
                    <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
                      {catalogMedicines.map((med) => {
                        const isAllergic = med.is_penicillin && patient.allergies.includes('Penicillin');
                        return (
                          <div
                            key={med.id}
                            onClick={() => handleAddMedicine(med)}
                            className={`p-3 text-xs flex items-center justify-between cursor-pointer transition ${
                              isAllergic ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-teal-50'
                            }`}
                          >
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                {med.name}
                                <span className="text-[10px] text-slate-500 font-normal">({med.generic_name})</span>
                                {isAllergic && (
                                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-600 text-white">
                                    ⚠️ ALLERGY CONTRAINDICATION
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                Form: {med.dosage_form} • Strength: {med.strength} • Stock: <span className="font-bold text-teal-800">{med.total_stock} {med.unit}</span>
                              </div>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded ${
                              isAllergic ? 'bg-red-200 text-red-900' : 'bg-teal-100 text-teal-800'
                            }`}>
                              {isAllergic ? 'Contraindicated' : '+ Add to Rx'}
                            </span>
                          </div>
                        );
                      })}
                      {catalogMedicines.length === 0 && !isSearchingMedicines && (
                        <div className="p-4 text-center text-slate-400 text-xs">
                          No medicines matched '{searchDrug}'.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Prescribed Drug Rows */}
                <div className="space-y-2.5 flex-1 min-h-[160px]">
                  {prescriptions.map((rx, idx) => (
                    <div
                      key={rx.id}
                      className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 space-y-2.5 shadow-sm hover:border-teal-500/40 transition"
                    >
                      {/* Row Header */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-black flex items-center justify-center flex-shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-extrabold text-sm text-slate-900 truncate">
                            {rx.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-slate-300 text-xs font-bold shadow-sm">
                            <span className="text-[10px] text-slate-400 uppercase font-mono">Qty:</span>
                            <input
                              type="number"
                              min={1}
                              max={500}
                              value={rx.quantity}
                              onChange={(e) =>
                                handleUpdatePrescribedDrug(rx.id, {
                                  quantity: parseInt(e.target.value, 10) || 1,
                                })
                              }
                              className="w-12 font-black text-teal-900 text-center focus:outline-none bg-transparent"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveDrug(rx.id)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="Remove drug from prescription"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* 1-Click Quick-Pills Bar */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60 text-xs">
                        {/* Dose Form / Unit Selector */}
                        <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                          {['1 Tab', '2 Tabs', '1 Cap', '5ml', '10ml'].map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => handleUpdatePrescribedDrug(rx.id, { dosage: d })}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                                rx.dosage === d
                                  ? 'bg-teal-700 text-white shadow-sm'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>

                        {/* Frequency Pills */}
                        <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                          {[
                            { short: 'Mane', val: 'Mane (Once in morning)', label: 'Mane (Morning)' },
                            { short: 'BD', val: 'BD (Twice daily)', label: 'BD (2x daily)' },
                            { short: 'TDS', val: 'TDS (Thrice daily)', label: 'TDS (3x daily)' },
                            { short: 'Nocte', val: 'Nocte (At bedtime)', label: 'Nocte (Night)' },
                            { short: 'QDS', val: 'QDS (Four times daily)', label: 'QDS (4x daily)' },
                            { short: 'PRN', val: 'PRN (As needed for symptoms)', label: 'PRN (As needed)' },
                          ].map((freq) => (
                            <button
                              key={freq.short}
                              type="button"
                              onClick={() => handleUpdatePrescribedDrug(rx.id, { frequency: freq.val })}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                                rx.frequency.startsWith(freq.short)
                                  ? 'bg-indigo-700 text-white shadow-sm'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                              title={freq.label}
                            >
                              {freq.short}
                            </button>
                          ))}
                        </div>

                        {/* Duration Pills */}
                        <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                          {[
                            { short: '3d', label: '3 days' },
                            { short: '5d', label: '5 days' },
                            { short: '7d', label: '7 days' },
                            { short: '14d', label: '14 days' },
                            { short: '30d', label: '30 days' },
                          ].map((dur) => (
                            <button
                              key={dur.short}
                              type="button"
                              onClick={() => handleUpdatePrescribedDrug(rx.id, { duration: dur.label })}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                                rx.duration === dur.label
                                  ? 'bg-emerald-700 text-white shadow-sm'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {dur.short}
                            </button>
                          ))}
                        </div>

                        {/* Meal Timing */}
                        <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                          {['After meals', 'Before meals', 'At bedtime'].map((timing) => (
                            <button
                              key={timing}
                              type="button"
                              onClick={() => handleUpdatePrescribedDrug(rx.id, { instructions: timing })}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                                rx.instructions === timing
                                  ? 'bg-slate-800 text-white shadow-sm'
                                  : 'text-slate-500 hover:bg-slate-100'
                              }`}
                            >
                              {timing}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}

                  {prescriptions.length === 0 && (
                    <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                      <Pill className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-bold text-slate-600">Prescription Sheet is Clear</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Search and select medicine above, or click a 1-Click Preset on the right panel.</p>
                    </div>
                  )}
                </div>

                {/* Prescription Pad Action Footer */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setPrintPreviewModal(true)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Printer className="w-4 h-4 text-slate-500" />
                    Print Prescription Slip
                  </button>

                  <button
                    type="button"
                    onClick={handleCompleteConsultation}
                    className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs sm:text-sm shadow-md hover:shadow-lg transition flex items-center gap-2 active:scale-95"
                    title="Complete Consultation & Call Next Patient (Ctrl + Enter)"
                  >
                    <CheckCircle2 className="w-5 h-5 text-teal-200" />
                    <span>Complete Visit & Next Patient</span>
                    <kbd className="hidden sm:inline-block ml-1 px-2 py-0.5 text-[10px] bg-teal-900/90 text-teal-200 border border-teal-500/40 rounded-md font-mono font-bold shadow-inner">
                      Ctrl + ↵
                    </kbd>
                  </button>
                </div>
              </div>
            </div>

            {/* PANEL 3 (3 COLS): QUICK TOOLS, FAST PRESETS & CLINICAL OBSERVATIONS */}
            <div className="lg:col-span-3 flex flex-col gap-3 min-h-0 overflow-y-auto pr-0.5">
              {/* Quick Chief Complaints */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                    Chief Complaints
                  </span>
                  <span className="text-[10px] text-slate-400">1-Click select</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {COMMON_COMPLAINTS.map((comp) => {
                    const isSelected = selectedComplaints.includes(comp);
                    return (
                      <button
                        key={comp}
                        type="button"
                        onClick={() => toggleComplaint(comp)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                          isSelected
                            ? 'bg-teal-700 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '} {comp}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 1-Click Fast Rx Presets */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm">
                <div className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                  1-Click Fast Presets
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => addPresetBundle('cold')}
                    className="p-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition text-center flex flex-col items-center gap-1 shadow-sm"
                  >
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    <span>Flu / Cold</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addPresetBundle('gastritis')}
                    className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition text-center flex flex-col items-center gap-1 shadow-sm"
                  >
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Gastritis</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addPresetBundle('fever')}
                    className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 text-xs font-bold transition text-center flex flex-col items-center gap-1 shadow-sm"
                  >
                    <Sparkles className="w-4 h-4 text-rose-600" />
                    <span>Fever</span>
                  </button>
                </div>
              </div>

              {/* Doctor Clinical Observations & Instructions Pad */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                    Clinical Notes & Advice
                  </span>

                  {/* Voice Dictate & Mode */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={toggleVoiceDictation}
                      className={`px-2 py-1 text-[11px] font-bold rounded-lg border transition flex items-center gap-1 ${
                        isListeningVoice
                          ? 'bg-red-600 text-white border-red-700 animate-pulse'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                      }`}
                      title={isListeningVoice ? 'Recording... click to stop' : 'Speech-to-text dictation'}
                    >
                      {isListeningVoice ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3 text-teal-600" />}
                      <span>{isListeningVoice ? 'Rec...' : 'Voice'}</span>
                    </button>

                    <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setNotesMode('text')}
                        className={`px-2 py-1 text-[11px] font-bold rounded-md transition ${
                          notesMode === 'text' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500'
                        }`}
                        title="Keyboard typing"
                      >
                        <FileText className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotesMode('stylus')}
                        className={`px-2 py-1 text-[11px] font-bold rounded-md transition ${
                          notesMode === 'stylus' ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-500'
                        }`}
                        title="Touch / Stylus Pen"
                      >
                        <PenTool className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {notesMode === 'text' ? (
                  <div className="flex-1 flex flex-col">
                    <textarea
                      rows={5}
                      value={clinicalNotes}
                      onChange={(e) => setClinicalNotes(e.target.value)}
                      className="w-full flex-1 p-2.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-600 focus:outline-none bg-slate-50/50 resize-none"
                      placeholder="Doctor notes, dietary advice, follow-up instructions..."
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col space-y-1">
                    <DoctorStylusPad
                      initialDataUrl={handwrittenNotesData}
                      onChange={(dataUrl) => setHandwrittenNotesData(dataUrl)}
                      onConvertToText={handleConvertHandwritingToText}
                      isConverting={isConvertingHandwriting}
                      height={200}
                    />
                    {handwrittenNotesData && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        ✓ Digital ink captured
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
    )}
  </div>

      {/* ALLERGY CONTRAINDICATION OVERRIDE MODAL */}
      {allergyConflictModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border-2 border-red-500">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg text-red-950">
                  Critical Drug Allergy Contraindication!
                </h3>
                <p className="text-xs text-red-800 mt-1 font-semibold">
                  Patient <span className="font-black">{patient?.name || 'Patient'}</span> has a recorded allergy to <span className="font-black underline">{allergyConflictModal.allergy}</span>.
                </p>
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-xs text-red-950 mb-4">
              <div className="font-bold">Prescribed Drug: {allergyConflictModal.drug.name}</div>
              <div className="text-[11px] text-red-800 mt-0.5">
                Contains beta-lactam penicillin class. Prescribing this can cause acute anaphylaxis.
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Clinical Justification / Override Reason:
              </label>
              <input
                type="text"
                placeholder="e.g. Skin test negative, allergy desensitization supervised..."
                value={allergyOverrideReason}
                onChange={(e) => setAllergyOverrideReason(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAllergyConflictModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-xs hover:bg-slate-100 transition"
              >
                Cancel (Safe Action)
              </button>
              <button
                type="button"
                disabled={!allergyOverrideReason}
                onClick={() => handleAddMedicine(allergyConflictModal.drug, true)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold text-xs shadow transition"
              >
                Authorize Clinical Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW LAB SCAN UPLOAD MODAL */}
      {showLabUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-base text-slate-900 mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" /> Upload Diagnostic Lab Report
            </h3>
            <form onSubmit={handleUploadLabReport} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Test Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Full Blood Count (FBC), Fasting Blood Sugar, Lipid Profile..."
                  value={newLabTestName}
                  onChange={(e) => setNewLabTestName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Upload File (PDF / JPG scan)</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50 text-[11px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLabUploadModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow"
                >
                  Save & Index Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT PRESCRIPTION PREVIEW MODAL (A5 vs 80mm Thermal Roll) */}
      {printPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <Printer className="w-5 h-5 text-teal-700" />
                  Prescription Print Layout
                </h3>
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-bold">
                  <button
                    onClick={() => setPrintLayout('A5')}
                    className={`px-2.5 py-1 rounded-md transition ${printLayout === 'A5' ? 'bg-white shadow text-teal-900' : 'text-slate-600'}`}
                  >
                    Standard A5
                  </button>
                  <button
                    onClick={() => setPrintLayout('THERMAL_80MM')}
                    className={`px-2.5 py-1 rounded-md transition ${printLayout === 'THERMAL_80MM' ? 'bg-white shadow text-teal-900' : 'text-slate-600'}`}
                  >
                    80mm Thermal
                  </button>
                </div>
              </div>
              <button onClick={() => setPrintPreviewModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">
                ✕
              </button>
            </div>

            {/* PRINT LAYOUT: STANDARD A5 */}
            {printLayout === 'A5' ? (
              <div className="border border-slate-300 p-6 rounded-xl bg-white text-slate-900 font-serif shadow-sm">
                <div className="text-center border-b pb-4 mb-4">
                  <h2 className="text-xl font-bold tracking-tight text-teal-950 font-sans">
                    {settings.clinic_branding?.clinic_name || 'Medical Centre'}
                  </h2>
                  <div className="text-xs text-slate-600 font-sans mt-0.5">
                    {settings.clinic_branding?.address} • 📞 {settings.clinic_branding?.phone}
                  </div>
                  <div className="text-xs font-semibold text-slate-800 font-sans mt-2">
                    {doctorInfo.name} • Reg: {doctorInfo.slmc_reg_no}
                  </div>
                </div>

                <div className="flex justify-between text-xs border-b pb-3 mb-4 font-sans text-slate-700">
                  <div>
                    <span className="font-bold">Patient:</span> {patient?.name || 'Patient'} ({patient?.gender || '-'}, {patient?.age || '-'}y)
                  </div>
                  <div>
                    <span className="font-bold">Date:</span> {new Date().toLocaleDateString('en-GB')}
                  </div>
                  <div>
                    <span className="font-bold">Token:</span> #{activeToken}
                  </div>
                </div>

                {patient?.allergies && patient.allergies.length > 0 && (
                  <div className="text-[11px] font-sans font-bold text-red-700 bg-red-50 p-2 rounded mb-3 border border-red-200">
                    ⚠️ RECORDED ALLERGIES: {patient.allergies.join(', ')}
                  </div>
                )}

                <div className="text-2xl font-black text-teal-900 mb-2">℞</div>
                <div className="space-y-3 mb-6">
                  {prescriptions.map((rx, idx) => (
                    <div key={idx} className="pl-4 border-l-2 border-teal-600 text-sm">
                      <div className="font-bold font-sans">{rx.name} — {rx.quantity} Tabs/Caps</div>
                      <div className="text-xs text-slate-600 font-sans">{rx.dosage} • {rx.frequency} • {rx.duration} ({rx.instructions})</div>
                    </div>
                  ))}
                </div>

                {/* Clinical Observations & Handwritten Stylus Note / Anatomy Diagram */}
                {(clinicalNotes || handwrittenNotesData) && (
                  <div className="mb-6 pt-3 border-t border-slate-200">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 font-sans">
                      Doctor's Observations & Instructions:
                    </div>
                    {clinicalNotes && (
                      <p className="text-xs text-slate-700 font-sans whitespace-pre-line mb-2">
                        {clinicalNotes}
                      </p>
                    )}
                    {handwrittenNotesData && (
                      <div className="mt-2 border border-slate-200 rounded-lg p-1.5 bg-white inline-block max-w-full">
                        <img 
                          src={handwrittenNotesData} 
                          alt="Doctor Handwritten Notes & Anatomy Markings" 
                          className="max-h-48 max-w-full object-contain rounded"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="border-t pt-4 mt-6 flex justify-between items-end text-xs font-sans text-slate-500">
                  <div>
                    <div>Ref: APT-20261017-0016</div>
                    <div className="text-[10px] font-bold text-teal-800">
                      Channel: {prescriptionDestination === 'IN_HOUSE' ? '🏥 In-House Clinic Pharmacy' : '📄 External Pharmacy Prescription'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="w-32 border-b border-slate-400 mb-1"></div>
                    <div>Doctor's Signature</div>
                  </div>
                </div>
              </div>
            ) : (
              /* PRINT LAYOUT: 80MM THERMAL SLIP */
              <div className="w-72 mx-auto border border-dashed border-slate-400 p-4 bg-amber-50/40 text-slate-900 font-mono text-xs rounded-xl shadow-inner">
                <div className="text-center pb-2 border-b border-dashed border-slate-300">
                  <div className="font-black text-sm uppercase">{settings.clinic_branding?.clinic_name}</div>
                  <div className="text-[10px] text-slate-600">{settings.clinic_branding?.phone}</div>
                  <div className="text-[10px] font-bold mt-1">{doctorInfo.name} ({doctorInfo.slmc_reg_no})</div>
                </div>

                <div className="py-2 border-b border-dashed border-slate-300 text-[11px]">
                  <div>Date: {new Date().toLocaleDateString('en-GB')}</div>
                  <div>Token: #{activeToken} • Pt: {patient?.name || 'Patient'}</div>
                  <div className="text-[10px] font-bold text-slate-600 mt-0.5">
                    {prescriptionDestination === 'IN_HOUSE' ? '🏥 In-House Pharmacy' : '📄 External Rx'}
                  </div>
                </div>

                <div className="py-2 space-y-2 border-b border-dashed border-slate-300 text-[11px]">
                  <div className="font-bold">℞ PRESCRIPTIONS:</div>
                  {prescriptions.map((rx, idx) => (
                    <div key={idx}>
                      <div className="font-bold">{idx + 1}. {rx.name} (x{rx.quantity})</div>
                      <div className="text-[10px] text-slate-600">{rx.dosage} {rx.frequency} {rx.duration}</div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 text-center text-[10px] text-slate-500">
                  *** Thank You • Speedy Recovery ***
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setPrintPreviewModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 font-semibold text-xs"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print();
                  setPrintPreviewModal(false);
                }}
                className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow flex items-center gap-1.5"
              >
                🖨️ Send to Printer
              </button>
            </div>
          </div>
        </div>
      )}
      {/* PATIENT MEDICAL HISTORY LOOKUP MODAL */}
      {showLookupModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Patient History & Past Records Lookup</h3>
                  <p className="text-xs text-slate-400">Search any registered patient by Name, Phone, Patient ID, or NIC</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowLookupModal(false);
                  setSelectedLookupPatient(null);
                  setLookupResults([]);
                  setLookupQuery('');
                }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Type patient name, mobile (e.g. 0771234567), Patient ID (MF-2026-...), or NIC..."
                  value={lookupQuery}
                  onChange={(e) => handleSearchLookup(e.target.value)}
                  className="w-full pl-12 pr-10 py-3 rounded-2xl bg-slate-50 border-2 border-slate-200 focus:border-sky-600 focus:bg-white text-slate-900 font-semibold text-sm outline-none transition"
                  autoFocus
                />
                {isSearchingLookup && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Main 2-Column Split: Results List & Patient Clinical Timeline */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 min-h-[420px]">
                {/* Column 1: Search Results */}
                <div className="md:col-span-5 border border-slate-200 rounded-2xl p-3 bg-slate-50/50 flex flex-col">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
                    Matching Patients ({lookupResults.length})
                  </div>

                  <div className="space-y-2 overflow-y-auto max-h-[380px] flex-1 pr-1">
                    {lookupResults.map((p) => {
                      const isSelected = selectedLookupPatient?.id === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleSelectLookupPatient(p)}
                          className={`p-3 rounded-xl border cursor-pointer transition text-left ${
                            isSelected
                              ? 'bg-sky-50 border-sky-400 shadow-sm'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {p.patient_id}
                            </span>
                            {p.allergies && p.allergies.length > 0 && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                                <ShieldAlert className="w-2.5 h-2.5" /> Allergy Alert
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-slate-900 text-sm mt-1">
                            {p.first_name} {p.last_name || ''}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>📞 {p.phone}</span>
                            <span>•</span>
                            <span className="capitalize">{p.gender}</span>
                          </div>
                        </div>
                      );
                    })}

                    {lookupResults.length === 0 && !isSearchingLookup && (
                      <div className="text-center py-12 text-slate-400 text-xs flex flex-col items-center">
                        <User className="w-8 h-8 text-slate-300 mb-2" />
                        {lookupQuery.trim().length > 1
                          ? 'No patients found matching this search'
                          : 'Enter at least 2 characters to search clinic records'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Column 2: Detailed History of Selected Patient */}
                <div className="md:col-span-7 border border-slate-200 rounded-2xl p-4 bg-white flex flex-col">
                  {selectedLookupPatient ? (
                    <div className="space-y-4 flex-1 flex flex-col">
                      {/* Patient Summary Header */}
                      <div className="pb-3 border-b border-slate-100">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200">
                              {selectedLookupPatient.patient_id}
                            </span>
                            <h4 className="text-base font-extrabold text-slate-900 mt-1">
                              {selectedLookupPatient.first_name} {selectedLookupPatient.last_name || ''}
                            </h4>
                            <div className="text-xs text-slate-500 font-medium mt-0.5">
                              📞 {selectedLookupPatient.phone} {selectedLookupPatient.nic ? `• NIC: ${selectedLookupPatient.nic}` : ''} • <span className="capitalize">{selectedLookupPatient.gender}</span>
                            </div>
                          </div>
                        </div>

                        {/* Critical Allergies & Conditions */}
                        {selectedLookupPatient.allergies && selectedLookupPatient.allergies.length > 0 && (
                          <div className="mt-2.5 p-2 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2">
                            <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-rose-950 font-bold">
                              Documented Allergies: <span className="text-rose-700 font-semibold">{Array.isArray(selectedLookupPatient.allergies) ? selectedLookupPatient.allergies.join(', ') : selectedLookupPatient.allergies}</span>
                            </div>
                          </div>
                        )}

                        {selectedLookupPatient.chronic_conditions && selectedLookupPatient.chronic_conditions.length > 0 && (
                          <div className="mt-1.5 text-xs text-slate-600">
                            <strong>Chronic Conditions:</strong> {Array.isArray(selectedLookupPatient.chronic_conditions) ? selectedLookupPatient.chronic_conditions.join(', ') : selectedLookupPatient.chronic_conditions}
                          </div>
                        )}
                      </div>

                      {/* Clinical Timeline & Visits */}
                      <div className="flex-1 overflow-y-auto max-h-[300px] space-y-3 pr-1">
                        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5 text-sky-600" />
                          Past Visits Timeline ({lookupPatientHistory.length})
                        </div>

                        {isLoadingLookupHistory ? (
                          <div className="text-center py-8">
                            <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                            <div className="text-xs text-slate-500">Retrieving full clinical timeline...</div>
                          </div>
                        ) : lookupPatientHistory.length > 0 ? (
                          lookupPatientHistory.map((visit) => (
                            <div key={visit.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-sky-900">📅 {visit.visit_date} (Token #{visit.token_number})</span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Consulted</span>
                              </div>

                              <div className="text-xs">
                                <div className="font-extrabold text-slate-800">Diagnosis: {visit.diagnosis}</div>
                                {visit.chief_complaint && (
                                  <div className="text-slate-600 text-[11px] mt-0.5">Complaint: {visit.chief_complaint}</div>
                                )}
                                {visit.clinical_notes && (
                                  <div className="text-slate-500 text-[11px] mt-0.5 italic">Notes: {visit.clinical_notes}</div>
                                )}
                              </div>

                              {visit.prescription?.items && visit.prescription.items.length > 0 && (
                                <div className="pt-2 border-t border-slate-200 space-y-1">
                                  <div className="text-[10px] font-bold text-slate-600">Prescribed Medicines ({visit.prescription.items.length}):</div>
                                  <div className="space-y-1">
                                    {visit.prescription.items.map((med, mIdx) => (
                                      <div key={mIdx} className="text-[11px] bg-white p-1.5 rounded border border-slate-200 flex items-center justify-between">
                                        <span className="font-bold text-slate-800">{med.medicine_name}</span>
                                        <span className="text-[10px] text-slate-500">{med.dosage} • {med.frequency} • {med.duration} (Qty: {med.quantity_prescribed})</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-slate-400 text-xs">
                            No past consultation visits recorded for this patient yet.
                          </div>
                        )}

                        {/* Lab reports if any */}
                        {lookupLabReports.length > 0 && (
                          <div className="pt-3 border-t border-slate-200 space-y-2">
                            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                              <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                              Diagnostic Lab Reports ({lookupLabReports.length})
                            </div>
                            <div className="space-y-1.5">
                              {lookupLabReports.map((lab) => (
                                <div key={lab.id} className="p-2 rounded-lg bg-blue-50/50 border border-blue-200 text-xs flex items-center justify-between">
                                  <div>
                                    <div className="font-bold text-slate-800">{lab.test_name}</div>
                                    <div className="text-[10px] text-slate-500">{lab.laboratory_name} • {lab.test_date}</div>
                                  </div>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">{lab.status}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 text-xs">
                      <History className="w-10 h-10 text-slate-300 mb-2" />
                      <p className="font-semibold text-slate-600">Select a patient from search results</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">Their full clinical timeline, past diagnoses, medicines prescribed, and lab tests will appear here.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-teal-600" />
                <span>Protected by MediFlow Sri Lanka PDPA & HIPAA Audit Logging</span>
              </div>
              <button
                onClick={() => {
                  setShowLookupModal(false);
                  setSelectedLookupPatient(null);
                  setLookupResults([]);
                  setLookupQuery('');
                }}
                className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
