'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useMediFlow } from '@/context/MediFlowContext';
import { Visit, PrescriptionItem, LabReport, Patient } from '@/types/mediflow';
import { useToast } from '@/components/ui/Toast';
import {
  Stethoscope,
  Users,
  CheckCircle2,
  FileText,
  Pill,
  Plus,
  Trash2,
  Printer,
  Upload,
  Activity,
  Clock,
  Volume2,
  AlertTriangle,
  Heart,
  FlaskConical,
  Sparkles,
  ArrowRight,
  UserCheck,
  ShieldAlert,
  X,
  History,
  Copy,
  Calendar,
  Thermometer,
  Scale,
  Droplet,
  Eye,
  Check,
  ChevronRight,
  AlertCircle,
  FileClock
} from 'lucide-react';

// Common Quick Presets for high-speed Sri Lankan GP consultations
const QUICK_COMPLAINTS = [
  "Occipital headache and dizziness for 3 days",
  "Fever, dry cough, and sore throat for 2 days",
  "Epigastric burning pain and nausea after meals",
  "Routine diabetic and blood pressure follow-up",
  "General body weakness and joint stiffness"
];

const QUICK_DIAGNOSES = [
  "Essential Hypertension (Mild Decompensation)",
  "Acute Upper Respiratory Tract Infection (URTI)",
  "Acid Peptic Disease / Reflux Gastritis",
  "Type 2 Diabetes Mellitus — Follow-up",
  "Tension-Type Headache"
];

const QUICK_MEDICINES = [
  {
    medicine: "Paracetamol",
    strength: "500mg",
    dosage: "2 tabs",
    frequency: "TDS (8 hourly)",
    duration: "3 days",
    instructions: "Take after meals for fever/pain",
    quantityToDispense: 18,
    category: "Analgesic"
  },
  {
    medicine: "Amoxicillin",
    strength: "500mg",
    dosage: "1 cap",
    frequency: "TDS (8 hourly)",
    duration: "5 days",
    instructions: "Complete full antibiotic course",
    quantityToDispense: 15,
    category: "Antibiotic (Penicillin group)"
  },
  {
    medicine: "Omeprazole",
    strength: "20mg",
    dosage: "1 cap",
    frequency: "BD (12 hourly)",
    duration: "14 days",
    instructions: "Take 30 mins before breakfast & dinner",
    quantityToDispense: 28,
    category: "Antacid"
  },
  {
    medicine: "Cetirizine",
    strength: "10mg",
    dosage: "1 tab",
    frequency: "OD (Night)",
    duration: "5 days",
    instructions: "Take at bedtime",
    quantityToDispense: 5,
    category: "Antihistamine"
  },
  {
    medicine: "Metformin",
    strength: "500mg",
    dosage: "1 tab",
    frequency: "BD (12 hourly)",
    duration: "30 days",
    instructions: "Take with or right after main meals",
    quantityToDispense: 60,
    category: "Antidiabetic"
  },
  {
    medicine: "Atorvastatin",
    strength: "20mg",
    dosage: "1 tab",
    frequency: "OD (Night)",
    duration: "30 days",
    instructions: "Take after dinner",
    quantityToDispense: 30,
    category: "Cardiovascular"
  }
];

export const DoctorView: React.FC = () => {
  const {
    visits,
    patients,
    callPatient,
    startConsultation,
    completeConsultation,
    updateVitals,
    updateClinicalNotes,
    issuePrescription,
    uploadLabReport,
    reviewLabReport,
    markPatientMissed
  } = useMediFlow();

  const { showToast } = useToast();

  // Find priority patient: In consultation > Called > First waiting
  const inConsultVisit = visits.find(v => v.status === 'IN_CONSULTATION');
  const calledVisit = visits.find(v => v.status === 'CALLED');
  const firstWaitingVisit = visits.find(v => v.status === 'WAITING');
  const defaultSelected = inConsultVisit || calledVisit || firstWaitingVisit;

  const [selectedVisitId, setSelectedVisitId] = useState<string>(defaultSelected?.id || '');
  const [isCallingAudioFlash, setIsCallingAudioFlash] = useState(false);
  const [activeTab, setActiveTab] = useState<'consultation' | 'history' | 'labs'>('consultation');
  const [queueFilter, setQueueFilter] = useState<'all' | 'waiting'>('waiting');

  // Active visit
  const currentVisit = visits.find(v => v.id === selectedVisitId) || defaultSelected;

  // Active patient full profile
  const currentPatient = useMemo(() => {
    if (!currentVisit) return null;
    return patients.find(p => p.id === currentVisit.patientId) || null;
  }, [patients, currentVisit]);

  // Past completed visits for the current patient
  const pastVisits = useMemo(() => {
    if (!currentVisit) return [];
    return visits
      .filter(v => v.patientId === currentVisit.patientId && v.status === 'COMPLETED' && v.id !== currentVisit.id)
      .sort((a, b) => {
        const dateA = a.date || a.bookedAt || '';
        const dateB = b.date || b.bookedAt || '';
        return dateB.localeCompare(dateA);
      });
  }, [visits, currentVisit]);

  // Form states for active consultation
  const [complaints, setComplaints] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');

  // Vitals
  const [bp, setBp] = useState('120/80');
  const [pulse, setPulse] = useState('74 bpm');
  const [temp, setTemp] = useState('98.6 °F');
  const [weight, setWeight] = useState('65 kg');
  const [sugar, setSugar] = useState('110 mg/dL');

  // Prescription items
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([]);

  // Modals
  const [isRxPrintModalOpen, setIsRxPrintModalOpen] = useState(false);
  const [isLabUploadModalOpen, setIsLabUploadModalOpen] = useState(false);
  const [newLabTestName, setNewLabTestName] = useState('');
  const [newLabFacility, setNewLabFacility] = useState('MediFlow Diagnostics');

  // Sync form states whenever selected visit changes
  useEffect(() => {
    if (currentVisit) {
      setComplaints(currentVisit.clinicalNotes?.complaints || '');
      setDiagnosis(currentVisit.clinicalNotes?.diagnosis || '');
      setDoctorNotes(currentVisit.clinicalNotes?.doctorNotes || '');
      setBp(currentVisit.vitals?.bp || '120/80');
      setPulse(currentVisit.vitals?.pulse || '74 bpm');
      setTemp(currentVisit.vitals?.temp || '98.6 °F');
      setWeight(currentVisit.vitals?.weight || '65 kg');
      setSugar(currentVisit.vitals?.sugar || '110 mg/dL');
      setPrescriptionItems(currentVisit.prescription?.items || []);
      // Default to consultation tab
      setActiveTab('consultation');
    }
  }, [currentVisit?.id]);

  // Queue lists
  const waitingPatients = visits.filter(
    v => v.status === 'WAITING' || v.status === 'CALLED' || v.status === 'IN_CONSULTATION'
  );
  const nextWaitingPatient = visits.find(v => v.status === 'WAITING');

  const displayedQueue = queueFilter === 'waiting'
    ? waitingPatients
    : visits.filter(v => v.status !== 'NOT_CHECKED_IN');

  // Check patient allergies
  const allergiesList = currentPatient?.allergies || [];
  const chronicList = currentPatient?.chronicConditions || [];
  const hasPenicillinAllergy = allergiesList.some(a => a.toLowerCase().includes('penicillin'));

  // 1-Click Call Patient Action
  const handleCallPatient = (visit: Visit) => {
    callPatient(visit.id);
    setSelectedVisitId(visit.id);
    setIsCallingAudioFlash(true);
    setTimeout(() => setIsCallingAudioFlash(false), 3000);
    showToast('info', `Calling Token #${visit.tokenNumber}`, `${visit.patientName} — please enter Room 01.`);
  };

  const handleStartConsultation = (visitId: string) => {
    startConsultation(visitId);
    showToast('success', 'Consultation Active', 'Patient is now in Doctor Room 01.');
  };

  // Add medication via Quick Chip
  const handleAddQuickMed = (med: typeof QUICK_MEDICINES[0]) => {
    // Allergy safety check
    if (med.medicine === 'Amoxicillin' && hasPenicillinAllergy) {
      if (!confirm(`⚠️ ALLERGY WARNING: ${currentVisit?.patientName} has a documented PENICILLIN allergy!\n\nAre you sure you want to add Amoxicillin?`)) {
        return;
      }
    }

    const newItem: PrescriptionItem = {
      id: `rx-${Date.now()}-${Math.random()}`,
      medicine: med.medicine,
      strength: med.strength,
      dosage: med.dosage,
      frequency: med.frequency,
      duration: med.duration,
      instructions: med.instructions,
      quantityToDispense: med.quantityToDispense
    };
    setPrescriptionItems(prev => [...prev, newItem]);
    showToast('success', `Added ${med.medicine}`, `${med.dosage} ${med.frequency} for ${med.duration}`);
  };

  // Add a blank custom medicine row
  const handleAddCustomRow = () => {
    const newItem: PrescriptionItem = {
      id: `rx-${Date.now()}`,
      medicine: '',
      strength: '',
      dosage: '1 tab',
      frequency: 'TDS (8 hourly)',
      duration: '3 days',
      instructions: 'Take after meals',
      quantityToDispense: 10
    };
    setPrescriptionItems(prev => [...prev, newItem]);
  };

  const handleRemoveMedicineRow = (id: string) => {
    setPrescriptionItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateMedicineField = (id: string, field: keyof PrescriptionItem, value: any) => {
    setPrescriptionItems(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Copy prescription from a past visit into today's consultation
  const handleCopyPastPrescription = (pastRx: PrescriptionItem[]) => {
    if (!pastRx || pastRx.length === 0) return;
    const copiedItems = pastRx.map(item => ({
      ...item,
      id: `rx-${Date.now()}-${Math.random()}`
    }));
    setPrescriptionItems(prev => [...prev, ...copiedItems]);
    setActiveTab('consultation');
    showToast('success', 'Prescription Copied', `${copiedItems.length} medication(s) imported from previous visit.`);
  };

  // 1-Click Complete & Call Next Patient (The ultimate doctor workflow!)
  const handleCompleteAndCallNext = () => {
    if (!currentVisit) return;

    // 1. Save notes and vitals
    updateVitals(currentVisit.id, { bp, pulse, temp, weight, sugar });
    updateClinicalNotes(currentVisit.id, { complaints, diagnosis, doctorNotes });

    // 2. Issue prescription if any items
    if (prescriptionItems.length > 0) {
      issuePrescription(currentVisit.id, prescriptionItems);
    }

    // 3. Complete current visit
    completeConsultation(currentVisit.id);
    showToast('success', `Token #${currentVisit.tokenNumber} Finished`, `Consultation completed. Prescription forwarded to Pharmacy.`);

    // 4. Automatically find and call the next waiting patient!
    const remainingWaiting = visits.filter(
      v => v.status === 'WAITING' && v.id !== currentVisit.id
    );

    if (remainingWaiting.length > 0) {
      const nextOne = remainingWaiting[0];
      handleCallPatient(nextOne);
    } else {
      setSelectedVisitId('');
    }
  };

  const handleUploadLab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVisit || !newLabTestName) return;
    uploadLabReport(currentVisit.id, {
      testName: newLabTestName,
      labName: newLabFacility,
      date: new Date().toISOString().split('T')[0],
      status: 'Reviewed',
      uploader: 'Dr. K. Perera',
      doctorNotes: 'Reviewed in consultation. Normal findings.'
    });
    setIsLabUploadModalOpen(false);
    setNewLabTestName('');
    showToast('success', 'Lab Report Attached', `${newLabTestName} linked and reviewed.`);
  };

  return (
    <div className="w-full space-y-4">
      {/* ── Audio Chime Broadcast Flash ── */}
      {isCallingAudioFlash && currentVisit && (
        <div className="bg-[#16324F] text-white px-5 py-3 rounded-2xl flex items-center justify-between shadow-xl border border-teal-400 animate-pulse transition">
          <div className="flex items-center gap-3 text-sm font-semibold">
            <Volume2 className="w-5 h-5 text-teal-400" />
            <span>
              📢 Chime Broadcast: &ldquo;Token Number <strong className="text-teal-300">#{currentVisit.tokenNumber}</strong> — {currentVisit.patientName}, please enter <strong>Room 01</strong>&rdquo;
            </span>
          </div>
          <span className="text-[11px] bg-teal-600/80 text-teal-100 px-3 py-1 rounded-full font-mono uppercase font-bold tracking-wide">
            Lobby TV Updated
          </span>
        </div>
      )}

      {/* ── Full-Screen Modern Doctor Layout ── */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        
        {/* ════════════════════════════════════════════════════════════
            LEFT SIDEBAR: Sleek Patient Queue (~310px width)
            ════════════════════════════════════════════════════════════ */}
        <aside className="w-full lg:w-80 shrink-0 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col space-y-3">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-[#16324F] flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#0F766E]" />
                <span>Patient Queue</span>
              </h2>
              <p className="text-[11px] text-slate-500">Dr. K. Perera • Room 01</p>
            </div>
            <span className="text-xs bg-teal-50 text-teal-800 border border-teal-200 font-semibold px-2 py-0.5 rounded-full">
              {waitingPatients.length} Active
            </span>
          </div>

          {/* Quick Call Next Button */}
          {nextWaitingPatient ? (
            <button
              onClick={() => handleCallPatient(nextWaitingPatient)}
              className="w-full bg-[#0F766E] hover:bg-[#0c5c56] text-white py-2.5 px-3 rounded-xl font-semibold text-xs shadow-sm flex items-center justify-center gap-2 transition active:scale-98"
            >
              <Volume2 className="w-4 h-4 text-[#CCFBF1]" />
              <span>Call Next: Token #{nextWaitingPatient.tokenNumber}</span>
            </button>
          ) : (
            <div className="text-center py-2 bg-slate-50 rounded-xl text-xs text-slate-400 font-medium">
              Queue is clear
            </div>
          )}

          {/* Queue Filter Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setQueueFilter('waiting')}
              className={`flex-1 py-1 rounded-lg font-medium transition ${
                queueFilter === 'waiting'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Waiting ({waitingPatients.length})
            </button>
            <button
              onClick={() => setQueueFilter('all')}
              className={`flex-1 py-1 rounded-lg font-medium transition ${
                queueFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Session ({visits.filter(v => v.status !== 'NOT_CHECKED_IN').length})
            </button>
          </div>

          {/* Patient Cards List */}
          <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-290px)] pr-1">
            {displayedQueue.length === 0 ? (
              <div className="text-center py-10 text-slate-400 space-y-1">
                <Users className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs">No patients to display</p>
              </div>
            ) : (
              displayedQueue.map(visit => {
                const isSelected = visit.id === currentVisit?.id;
                const isInRoom = visit.status === 'IN_CONSULTATION';
                const isCalled = visit.status === 'CALLED';
                const isCompleted = visit.status === 'COMPLETED';
                const patientProfile = patients.find(p => p.id === visit.patientId);
                const isReturning = (patientProfile?.pastVisitsCount || 0) > 0;

                return (
                  <div
                    key={visit.id}
                    onClick={() => setSelectedVisitId(visit.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition text-left relative ${
                      isSelected
                        ? 'bg-teal-50/70 border-teal-500 shadow-sm ring-1 ring-teal-500/30'
                        : isInRoom
                        ? 'bg-emerald-50/50 border-emerald-300 hover:border-emerald-400'
                        : isCalled
                        ? 'bg-amber-50/50 border-amber-300 hover:border-amber-400'
                        : isCompleted
                        ? 'bg-slate-50/70 border-slate-200 opacity-70 hover:opacity-100'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                          isInRoom
                            ? 'bg-emerald-600 text-white'
                            : isCalled
                            ? 'bg-amber-500 text-white'
                            : isCompleted
                            ? 'bg-slate-400 text-white'
                            : 'bg-[#16324F] text-white'
                        }`}>
                          #{visit.tokenNumber}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-800 leading-tight">
                            {visit.patientName}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {visit.patientAge}y • {visit.patientGender}
                          </p>
                        </div>
                      </div>

                      {/* Status indicator */}
                      <span className="text-[10px] font-semibold flex items-center gap-1">
                        {isInRoom && (
                          <span className="flex items-center gap-1 text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            In Room
                          </span>
                        )}
                        {isCalled && (
                          <span className="flex items-center gap-1 text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                            Called
                          </span>
                        )}
                        {isCompleted && (
                          <span className="text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">
                            Done
                          </span>
                        )}
                        {visit.status === 'WAITING' && (
                          <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            Waiting
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Returning Patient Pill */}
                    {isReturning && (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-100/80 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="flex items-center gap-1 text-teal-700 font-medium">
                          <History className="w-3 h-3 text-teal-600" />
                          Returning Patient ({patientProfile?.pastVisitsCount} visits)
                        </span>
                        {patientProfile?.allergies && patientProfile.allergies.length > 0 && (
                          <span className="text-rose-600 font-bold">
                            ⚠️ Allergy Alert
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ════════════════════════════════════════════════════════════
            MAIN CONSULTATION WORKSPACE (Full Width & Spacious)
            ════════════════════════════════════════════════════════════ */}
        <main className="flex-1 w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-5">
          
          {currentVisit ? (
            <>
              {/* ── 1. PATIENT HEADER STRIP (Clean & Dignified) ── */}
              <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Patient Info */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="bg-[#16324F] text-white text-sm font-black px-3 py-1 rounded-lg font-mono">
                      TOKEN #{currentVisit.tokenNumber}
                    </span>
                    <h1 className="text-lg font-bold text-slate-900">
                      {currentVisit.patientName}
                    </h1>
                    <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                      {currentVisit.patientAge} Years • {currentVisit.patientGender}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      ID: {currentVisit.patientId}
                    </span>
                  </div>

                  {/* Medical Alerts Row (Allergies + Chronic + Returning) */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {/* Allergies Alert */}
                    {allergiesList.length > 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-xs bg-rose-100 text-rose-800 border border-rose-300 font-bold px-2.5 py-0.5 rounded-full">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        ALLERGY: {allergiesList.join(', ').toUpperCase()}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-medium">
                        <Check className="w-3 h-3 text-emerald-600" />
                        No Known Allergies
                      </span>
                    )}

                    {/* Chronic Conditions */}
                    {chronicList.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium px-2.5 py-0.5 rounded-full">
                        <Activity className="w-3.5 h-3.5 text-indigo-600" />
                        Chronic: {chronicList.join(', ')}
                      </span>
                    )}

                    {/* Returning status */}
                    {pastVisits.length > 0 ? (
                      <button
                        onClick={() => setActiveTab('history')}
                        className="inline-flex items-center gap-1 text-xs bg-teal-100 text-teal-800 hover:bg-teal-200 transition font-semibold px-2.5 py-0.5 rounded-full cursor-pointer"
                        title="Click to view full medical history"
                      >
                        <History className="w-3.5 h-3.5 text-teal-700" />
                        Returning Patient ({pastVisits.length} past records) &rarr;
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                        New Patient (1st Visit)
                      </span>
                    )}

                    <span className="text-xs text-slate-500">
                      📞 {currentVisit.patientPhone}
                    </span>
                  </div>
                </div>

                {/* Top Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {currentVisit.status === 'CALLED' && (
                    <button
                      onClick={() => handleStartConsultation(currentVisit.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5 transition active:scale-98"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Start Consultation</span>
                    </button>
                  )}

                  <button
                    onClick={() => setIsRxPrintModalOpen(true)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 flex items-center gap-1.5 transition"
                    title="Print Prescription (Sri Lankan Format)"
                  >
                    <Printer className="w-4 h-4 text-slate-500" />
                    <span>Print Rx</span>
                  </button>

                  <button
                    onClick={() => setIsLabUploadModalOpen(true)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 flex items-center gap-1.5 transition"
                  >
                    <FlaskConical className="w-4 h-4 text-slate-500" />
                    <span>Attach Lab</span>
                  </button>

                  {/* Ultimate 1-Click Complete & Call Next Patient Button */}
                  <button
                    onClick={handleCompleteAndCallNext}
                    className="bg-[#0F766E] hover:bg-[#0c5c56] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition active:scale-98"
                  >
                    <span>Complete &amp; Next</span>
                    <ArrowRight className="w-4 h-4 text-[#CCFBF1]" />
                  </button>
                </div>
              </div>

              {/* ── 2. VIEW NAVIGATION TABS ── */}
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setActiveTab('consultation')}
                  className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold border-b-2 transition ${
                    activeTab === 'consultation'
                      ? 'border-[#0F766E] text-[#0F766E]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Stethoscope className="w-4 h-4" />
                  <span>Today&apos;s Consultation &amp; Rx</span>
                </button>

                <button
                  onClick={() => setActiveTab('history')}
                  className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold border-b-2 transition ${
                    activeTab === 'history'
                      ? 'border-[#0F766E] text-[#0F766E]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileClock className="w-4 h-4" />
                  <span>Patient Medical History</span>
                  {pastVisits.length > 0 && (
                    <span className="bg-teal-100 text-teal-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                      {pastVisits.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('labs')}
                  className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold border-b-2 transition ${
                    activeTab === 'labs'
                      ? 'border-[#0F766E] text-[#0F766E]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FlaskConical className="w-4 h-4" />
                  <span>Diagnostics &amp; Labs</span>
                  {currentVisit.labReports.length > 0 && (
                    <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                      {currentVisit.labReports.length}
                    </span>
                  )}
                </button>
              </div>

              {/* ── 3. TAB CONTENT ── */}

              {/* ══════════════════════════════════════════════════════════
                  TAB 1: TODAY'S CONSULTATION & PRESCRIPTION
                  ══════════════════════════════════════════════════════════ */}
              {activeTab === 'consultation' && (
                <div className="space-y-5">
                  
                  {/* Returning Patient Fast Quick-Action Alert */}
                  {pastVisits.length > 0 && (
                    <div className="bg-emerald-50 border border-emerald-200/90 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <History className="w-5 h-5 text-emerald-700 shrink-0" />
                        <div>
                          <p className="font-bold text-emerald-900">
                            Returning Patient: Last consulted on {pastVisits[0].date || 'earlier this session'} by {pastVisits[0].doctorName}
                          </p>
                          <p className="text-emerald-700 text-[11px]">
                            Diagnosis: <strong>{pastVisits[0].clinicalNotes?.diagnosis || 'Routine Checkup'}</strong> • BP was {pastVisits[0].vitals?.bp || '120/80'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {pastVisits[0].prescription?.items && pastVisits[0].prescription.items.length > 0 && (
                          <button
                            onClick={() => handleCopyPastPrescription(pastVisits[0].prescription?.items || [])}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-1.5 rounded-lg shadow-xs flex items-center gap-1.5 transition active:scale-98"
                            title="Import all medications from previous consultation"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Repeat Last Prescription</span>
                          </button>
                        )}
                        <button
                          onClick={() => setActiveTab('history')}
                          className="text-emerald-800 hover:underline font-semibold text-xs px-2 py-1"
                        >
                          View History &rarr;
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Vitals Row (Clean 5 Cards) ── */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-rose-500" />
                      <span>Patient Vitals (Triaged / Current)</span>
                    </h3>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {/* Blood Pressure */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                          <Activity className="w-3 h-3 text-teal-600" />
                          Blood Pressure
                        </span>
                        <input
                          type="text"
                          value={bp}
                          onChange={e => setBp(e.target.value)}
                          className="w-full mt-1 font-bold text-sm text-slate-900 bg-transparent border-b border-transparent focus:border-teal-500 focus:outline-none"
                          placeholder="120/80"
                        />
                        <span className="text-[10px] text-slate-400">mmHg</span>
                      </div>

                      {/* Pulse */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                          <Heart className="w-3 h-3 text-rose-500" />
                          Heart Rate
                        </span>
                        <input
                          type="text"
                          value={pulse}
                          onChange={e => setPulse(e.target.value)}
                          className="w-full mt-1 font-bold text-sm text-slate-900 bg-transparent border-b border-transparent focus:border-teal-500 focus:outline-none"
                          placeholder="72 bpm"
                        />
                        <span className="text-[10px] text-slate-400">bpm</span>
                      </div>

                      {/* Temperature */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                          <Thermometer className="w-3 h-3 text-amber-500" />
                          Temperature
                        </span>
                        <input
                          type="text"
                          value={temp}
                          onChange={e => setTemp(e.target.value)}
                          className="w-full mt-1 font-bold text-sm text-slate-900 bg-transparent border-b border-transparent focus:border-teal-500 focus:outline-none"
                          placeholder="98.6 °F"
                        />
                        <span className="text-[10px] text-slate-400">Fahrenheit</span>
                      </div>

                      {/* Weight */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                          <Scale className="w-3 h-3 text-indigo-500" />
                          Weight
                        </span>
                        <input
                          type="text"
                          value={weight}
                          onChange={e => setWeight(e.target.value)}
                          className="w-full mt-1 font-bold text-sm text-slate-900 bg-transparent border-b border-transparent focus:border-teal-500 focus:outline-none"
                          placeholder="65 kg"
                        />
                        <span className="text-[10px] text-slate-400">Kilograms</span>
                      </div>

                      {/* Random Blood Sugar */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                          <Droplet className="w-3 h-3 text-cyan-600" />
                          Blood Sugar
                        </span>
                        <input
                          type="text"
                          value={sugar}
                          onChange={e => setSugar(e.target.value)}
                          className="w-full mt-1 font-bold text-sm text-slate-900 bg-transparent border-b border-transparent focus:border-teal-500 focus:outline-none"
                          placeholder="110 mg/dL"
                        />
                        <span className="text-[10px] text-slate-400">mg/dL</span>
                      </div>
                    </div>
                  </div>

                  {/* ── Clinical Notes (2 Side-by-Side Clean Cards) ── */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Complaints */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">
                          Chief Complaints &amp; History
                        </label>
                        <span className="text-[10px] text-slate-400">Click preset to add:</span>
                      </div>
                      
                      {/* Quick Chips */}
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_COMPLAINTS.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setComplaints(prev => prev ? `${prev}. ${item}` : item)}
                            className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md transition"
                          >
                            + {item.split(' ')[0]} {item.split(' ')[1]}
                          </button>
                        ))}
                      </div>

                      <textarea
                        rows={3}
                        value={complaints}
                        onChange={e => setComplaints(e.target.value)}
                        placeholder="Patient complaints, duration, severity, physical examination findings..."
                        className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none resize-none"
                      />
                    </div>

                    {/* Diagnosis & Notes */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">
                          Diagnosis &amp; Management Plan
                        </label>
                        <span className="text-[10px] text-slate-400">Click preset:</span>
                      </div>

                      {/* Quick Chips */}
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_DIAGNOSES.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setDiagnosis(item)}
                            className="text-[10px] bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-md transition"
                          >
                            {item.split(' ')[0]} {item.split(' ')[1]}
                          </button>
                        ))}
                      </div>

                      <textarea
                        rows={3}
                        value={diagnosis}
                        onChange={e => setDiagnosis(e.target.value)}
                        placeholder="Primary diagnosis, ICD/clinical notes, lifestyle advice, diet guidelines..."
                        className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none resize-none"
                      />
                    </div>
                  </div>

                  {/* ── Prescription Section (Rx) ── */}
                  <div className="space-y-3 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <Pill className="w-4 h-4 text-[#0F766E]" />
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Prescription (Rx) &bull; {prescriptionItems.length} Medication(s)
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleAddCustomRow}
                          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Custom Drug</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick 1-Click Medication Chips (Standard Sri Lankan Clinic Presets) */}
                    <div>
                      <p className="text-[11px] text-slate-500 mb-1.5">
                        Click preset to add medication with dosage &amp; duration:
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        {QUICK_MEDICINES.map((med, idx) => {
                          const isPenicillinAlert = med.medicine === 'Amoxicillin' && hasPenicillinAllergy;

                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleAddQuickMed(med)}
                              className={`p-2 rounded-xl text-left border transition relative ${
                                isPenicillinAlert
                                  ? 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100'
                                  : 'bg-slate-50 hover:bg-teal-50/70 border-slate-200 hover:border-teal-300 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold">{med.medicine}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{med.strength}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                {med.dosage} &bull; {med.frequency.split(' ')[0]}
                              </p>
                              {isPenicillinAlert && (
                                <span className="text-[9px] font-bold text-rose-600 block mt-0.5">
                                  ⚠️ Penicillin Allergy!
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Prescription Items Table */}
                    {prescriptionItems.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 space-y-1">
                        <Pill className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-xs font-semibold text-slate-500">No medicines added to prescription yet.</p>
                        <p className="text-[11px] text-slate-400">
                          Click any quick medication chip above, copy from patient history, or add a custom row.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-100/80 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
                            <tr>
                              <th className="py-2.5 px-3">Medicine &amp; Strength</th>
                              <th className="py-2.5 px-3">Dosage</th>
                              <th className="py-2.5 px-3">Frequency</th>
                              <th className="py-2.5 px-3">Duration</th>
                              <th className="py-2.5 px-3">Qty</th>
                              <th className="py-2.5 px-3">Instructions</th>
                              <th className="py-2.5 px-2 text-center w-10">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {prescriptionItems.map((item, idx) => (
                              <tr key={item.id} className="hover:bg-slate-50/50">
                                <td className="py-2 px-3">
                                  <input
                                    type="text"
                                    value={item.medicine}
                                    onChange={e => handleUpdateMedicineField(item.id, 'medicine', e.target.value)}
                                    placeholder="Medicine name"
                                    className="font-bold text-slate-800 bg-transparent w-full focus:outline-none"
                                  />
                                  <input
                                    type="text"
                                    value={item.strength}
                                    onChange={e => handleUpdateMedicineField(item.id, 'strength', e.target.value)}
                                    placeholder="Strength (e.g. 500mg)"
                                    className="text-[11px] text-slate-500 bg-transparent w-full focus:outline-none"
                                  />
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="text"
                                    value={item.dosage}
                                    onChange={e => handleUpdateMedicineField(item.id, 'dosage', e.target.value)}
                                    className="bg-slate-100 px-2 py-1 rounded w-20 text-xs focus:outline-none"
                                  />
                                </td>
                                <td className="py-2 px-3">
                                  <select
                                    value={item.frequency}
                                    onChange={e => handleUpdateMedicineField(item.id, 'frequency', e.target.value)}
                                    className="bg-slate-100 px-2 py-1 rounded text-xs focus:outline-none"
                                  >
                                    <option value="OD (Morning)">OD (Morning)</option>
                                    <option value="OD (Night)">OD (Night)</option>
                                    <option value="BD (12 hourly)">BD (12 hourly)</option>
                                    <option value="TDS (8 hourly)">TDS (8 hourly)</option>
                                    <option value="QDS (6 hourly)">QDS (6 hourly)</option>
                                    <option value="TDS / SOS">TDS / SOS (As needed)</option>
                                    <option value="Stat">Stat (Immediate)</option>
                                  </select>
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="text"
                                    value={item.duration}
                                    onChange={e => handleUpdateMedicineField(item.id, 'duration', e.target.value)}
                                    className="bg-slate-100 px-2 py-1 rounded w-20 text-xs focus:outline-none"
                                  />
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="number"
                                    value={item.quantityToDispense}
                                    onChange={e => handleUpdateMedicineField(item.id, 'quantityToDispense', parseInt(e.target.value) || 0)}
                                    className="bg-slate-100 px-2 py-1 rounded w-16 text-xs font-mono font-bold focus:outline-none"
                                  />
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="text"
                                    value={item.instructions}
                                    onChange={e => handleUpdateMedicineField(item.id, 'instructions', e.target.value)}
                                    placeholder="e.g. After meals"
                                    className="bg-transparent w-full text-xs text-slate-600 focus:outline-none"
                                  />
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMedicineRow(item.id)}
                                    className="text-slate-400 hover:text-rose-600 p-1 transition"
                                    title="Remove item"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════
                  TAB 2: PATIENT MEDICAL HISTORY (CRITICAL REQUEST)
                  ══════════════════════════════════════════════════════════ */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  {/* Summary Banner */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#16324F] flex items-center gap-2">
                        <FileClock className="w-4 h-4 text-[#0F766E]" />
                        <span>Medical Records for {currentVisit.patientName}</span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        Patient ID: <strong>{currentVisit.patientId}</strong> &bull; Total Recorded Visits: <strong>{pastVisits.length}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-slate-700 font-medium">
                        First Seen: {currentPatient?.createdAt || '2026-01-15'}
                      </span>
                    </div>
                  </div>

                  {pastVisits.length === 0 ? (
                    <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                      <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                      <h4 className="text-sm font-bold text-slate-700">No Previous Consultation History</h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        This is the patient&apos;s first visit at MediFlow Clinic. Once you complete today&apos;s consultation, this record will be preserved in their permanent medical file.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pastVisits.map((past, index) => {
                        const visitDate = past.date || 'Previous Visit';
                        const rxItems = past.prescription?.items || [];

                        return (
                          <div
                            key={past.id}
                            className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3 hover:border-teal-300 transition"
                          >
                            {/* Card Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                              <div className="flex items-center gap-2.5">
                                <span className="bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {visitDate}
                                </span>
                                <span className="text-xs font-semibold text-slate-700">
                                  {past.doctorName} ({past.doctorSpecialty})
                                </span>
                                <span className="text-xs text-slate-400 font-mono">
                                  Token #{past.tokenNumber}
                                </span>
                              </div>

                              {/* 1-Click Copy Rx Button */}
                              {rxItems.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyPastPrescription(rxItems)}
                                  className="self-start sm:self-auto bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 font-semibold text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:border-teal-300 flex items-center gap-1.5 transition active:scale-98"
                                >
                                  <Copy className="w-3.5 h-3.5 text-teal-600" />
                                  <span>Copy This Prescription to Today</span>
                                </button>
                              )}
                            </div>

                            {/* Vitals Snapshot */}
                            {past.vitals && (
                              <div className="flex flex-wrap items-center gap-3 bg-slate-50/70 p-2.5 rounded-xl text-xs">
                                <span className="text-slate-500 font-medium">Recorded Vitals:</span>
                                {past.vitals.bp && (
                                  <span className="font-bold text-slate-800">BP: {past.vitals.bp} mmHg</span>
                                )}
                                {past.vitals.pulse && (
                                  <span className="text-slate-700">Pulse: {past.vitals.pulse}</span>
                                )}
                                {past.vitals.temp && (
                                  <span className="text-slate-700">Temp: {past.vitals.temp}</span>
                                )}
                                {past.vitals.sugar && (
                                  <span className="font-bold text-amber-700">Sugar: {past.vitals.sugar}</span>
                                )}
                                {past.vitals.weight && (
                                  <span className="text-slate-700">Weight: {past.vitals.weight}</span>
                                )}
                              </div>
                            )}

                            {/* Clinical Findings */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                  Chief Complaints &amp; History
                                </span>
                                <p className="text-slate-800">
                                  {past.clinicalNotes?.complaints || 'No complaints logged.'}
                                </p>
                              </div>

                              <div className="bg-teal-50/50 border border-teal-100 p-3 rounded-xl space-y-1">
                                <span className="text-[10px] uppercase font-bold text-teal-800 tracking-wider">
                                  Diagnosis &amp; Management
                                </span>
                                <p className="font-bold text-teal-900">
                                  {past.clinicalNotes?.diagnosis || 'General follow-up.'}
                                </p>
                                {past.clinicalNotes?.doctorNotes && (
                                  <p className="text-slate-600 text-[11px] mt-1">
                                    {past.clinicalNotes.doctorNotes}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Prescribed Medications */}
                            {rxItems.length > 0 && (
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1.5">
                                  Prescribed Medications on {visitDate}:
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {rxItems.map(item => (
                                    <div
                                      key={item.id}
                                      className="bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl text-xs flex items-start justify-between"
                                    >
                                      <div>
                                        <p className="font-bold text-slate-900">
                                          {item.medicine} {item.strength}
                                        </p>
                                        <p className="text-slate-600 text-[11px]">
                                          {item.dosage} &bull; {item.frequency}
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                          Duration: {item.duration} ({item.quantityToDispense} units)
                                        </p>
                                      </div>
                                      <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                                        Dispensed
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Lab Reports if any */}
                            {past.labReports && past.labReports.length > 0 && (
                              <div className="border-t border-slate-100 pt-2 text-xs">
                                <span className="text-slate-500 font-medium">Attached Labs: </span>
                                {past.labReports.map(lab => (
                                  <span key={lab.id} className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md mr-2 text-[11px]">
                                    <FlaskConical className="w-3 h-3 text-purple-600" />
                                    {lab.testName} ({lab.date})
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════
                  TAB 3: DIAGNOSTICS & LAB REPORTS
                  ══════════════════════════════════════════════════════════ */}
              {activeTab === 'labs' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Laboratory Reports &amp; Diagnostic Records
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        External laboratory results linked to patient token #{currentVisit.tokenNumber}
                      </p>
                    </div>

                    <button
                      onClick={() => setIsLabUploadModalOpen(true)}
                      className="bg-[#0F766E] hover:bg-[#0c5c56] text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Upload New Lab</span>
                    </button>
                  </div>

                  {currentVisit.labReports.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                      <FlaskConical className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-semibold text-slate-500">No lab reports attached for this visit.</p>
                      <button
                        onClick={() => setIsLabUploadModalOpen(true)}
                        className="text-xs text-[#0F766E] font-bold hover:underline"
                      >
                        + Attach Full Blood Count or Lipid Profile
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {currentVisit.labReports.map(report => (
                        <div
                          key={report.id}
                          className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <FlaskConical className="w-4 h-4 text-purple-600" />
                                {report.testName}
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                {report.labName} &bull; Date: {report.date}
                              </p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              report.status === 'Reviewed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {report.status}
                            </span>
                          </div>

                          <div className="bg-slate-50 p-2.5 rounded-lg text-xs space-y-1">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase">
                              Doctor Review Findings:
                            </span>
                            <p className="text-slate-800">
                              {report.doctorNotes || 'No specific remarks entered.'}
                            </p>
                          </div>

                          {report.status !== 'Reviewed' && (
                            <button
                              onClick={() => {
                                reviewLabReport(currentVisit.id, report.id, 'Reviewed and findings noted in consultation.');
                                showToast('success', 'Lab Marked Reviewed', report.testName);
                              }}
                              className="w-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 font-semibold text-xs py-1.5 rounded-lg border border-slate-200 transition"
                            >
                              ✓ Mark as Doctor Reviewed
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-24 text-slate-400 space-y-3">
              <Stethoscope className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-700">Doctor Consultation Station Ready</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No patient is currently in Room 01. Select a waiting patient from the queue on the left or click &ldquo;Call Next Patient&rdquo; to begin.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* ════════════════════════════════════════════════════════════
          MODAL: SRI LANKAN CLINIC PRINTABLE PRESCRIPTION
          ════════════════════════════════════════════════════════════ */}
      {isRxPrintModalOpen && currentVisit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 p-6 space-y-5 animate-in fade-in zoom-in duration-150">
            
            {/* Clinic Printable Header */}
            <div className="text-center border-b-2 border-slate-900 pb-3">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                MEDIFLOW FAMILY HEALTH CARE
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                General Practice &bull; Specialist Medical Center
              </p>
              <p className="text-[11px] text-slate-500">
                Dr. K. Perera &bull; MBBS (Col), DFM, MCGP &bull; SLMC Reg: 18452
              </p>
            </div>

            {/* Patient Strip */}
            <div className="flex justify-between text-xs border-b border-slate-200 pb-2">
              <div>
                <p><strong>Patient:</strong> {currentVisit.patientName}</p>
                <p><strong>Age/Gender:</strong> {currentVisit.patientAge} Yrs / {currentVisit.patientGender}</p>
              </div>
              <div className="text-right">
                <p><strong>Date:</strong> {new Date().toLocaleDateString('en-GB')}</p>
                <p><strong>Token:</strong> #{currentVisit.tokenNumber}</p>
              </div>
            </div>

            {/* Allergies on Prescription */}
            {allergiesList.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 p-2 rounded-lg text-xs text-rose-800 font-bold">
                ⚠️ KNOWN ALLERGIES: {allergiesList.join(', ').toUpperCase()}
              </div>
            )}

            {/* Rx Symbol & Medication List */}
            <div className="space-y-3 min-h-[140px]">
              <span className="text-2xl font-serif font-black text-slate-900 block">℞</span>
              {prescriptionItems.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No medications prescribed.</p>
              ) : (
                <ol className="list-decimal list-inside space-y-2 text-xs">
                  {prescriptionItems.map((item, idx) => (
                    <li key={idx} className="text-slate-800">
                      <strong>{item.medicine} {item.strength}</strong> — {item.dosage} {item.frequency} for {item.duration}
                      <span className="block text-[11px] text-slate-500 pl-4">
                        &bull; Dispense: {item.quantityToDispense} units ({item.instructions})
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* Doctor Signature */}
            <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-xs">
              <div>
                <p className="text-slate-500 text-[10px]">MediFlow Digital Health ID: {currentVisit.patientId}</p>
              </div>
              <div className="text-center">
                <div className="w-32 border-b border-slate-400 mb-1"></div>
                <p className="font-bold text-slate-800">Dr. K. Perera</p>
                <p className="text-[10px] text-slate-500">Registered Medical Practitioner</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  window.print();
                  setIsRxPrintModalOpen(false);
                }}
                className="flex-1 bg-[#0F766E] hover:bg-[#0c5c56] text-white py-2 rounded-xl text-xs font-bold transition"
              >
                Print to Receipt / A5 Printer
              </button>
              <button
                type="button"
                onClick={() => setIsRxPrintModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          MODAL: ATTACH LAB REPORT
          ════════════════════════════════════════════════════════════ */}
      {isLabUploadModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-[#0F766E]" />
                Attach Lab Report
              </h3>
              <button onClick={() => setIsLabUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadLab} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Test Name</label>
                <select
                  value={newLabTestName}
                  onChange={e => setNewLabTestName(e.target.value)}
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500"
                >
                  <option value="">Select or choose test...</option>
                  <option value="Full Blood Count (FBC)">Full Blood Count (FBC)</option>
                  <option value="Lipid Profile">Lipid Profile</option>
                  <option value="HbA1c & Fasting Blood Sugar">HbA1c &amp; Fasting Blood Sugar</option>
                  <option value="Serum Creatinine & eGFR">Serum Creatinine &amp; eGFR</option>
                  <option value="Urine Full Report (UFR)">Urine Full Report (UFR)</option>
                  <option value="Liver Function Test (LFT)">Liver Function Test (LFT)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Laboratory Facility</label>
                <input
                  type="text"
                  value={newLabFacility}
                  onChange={e => setNewLabFacility(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center space-y-1">
                <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-[11px] text-slate-500">PDF / Scanned Report (Demo Simulation)</p>
                <span className="text-[10px] text-teal-600 font-semibold">Simulated upload instant attach</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#0F766E] hover:bg-[#0c5c56] text-white py-2 rounded-xl font-bold transition"
                >
                  Attach &amp; Link to Patient
                </button>
                <button
                  type="button"
                  onClick={() => setIsLabUploadModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
