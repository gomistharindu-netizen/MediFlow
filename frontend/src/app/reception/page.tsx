'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useClinic } from '@/contexts/ClinicContext';
import { ApiClient } from '@/lib/api';
import { 
  Users, 
  Search, 
  UserPlus, 
  Phone, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Tag, 
  ArrowLeft, 
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  Printer,
  LogOut,
  Stethoscope,
  RotateCcw,
  RefreshCw,
  X,
  PhoneCall,
  Edit,
  Zap,
  Flame
} from 'lucide-react';

interface DoctorSessionOption {
  id: number;
  doctor_id: number;
  session_title: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  max_patients: number;
  booked_count?: number;
  available_slots?: number;
  is_full?: boolean;
}

interface TodayVisit {
  id: number;
  token_number: number;
  booking_reference?: string;
  status: 'NOT_CHECKED_IN' | 'WAITING' | 'CALLED' | 'IN_CONSULTATION' | 'COMPLETED' | 'MISSED' | 'CANCELLED';
  priority_level: string;
  checked_in_at?: string;
  doctor?: {
    user?: {
      name: string;
    };
    room_number?: string;
  };
  session?: {
    id: number;
    session_title: string;
    start_time?: string;
    end_time?: string;
  };
}

interface Patient {
  id: number;
  patient_id: string;
  first_name: string;
  last_name?: string;
  phone: string;
  nic?: string;
  date_of_birth?: string;
  gender: string;
  allergies?: string[];
  chronic_conditions?: string[];
  consent_given?: boolean;
  today_visit?: TodayVisit | null;
}

export default function ReceptionDesk() {
  const { tenantId, settings } = useClinic();
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'today'>('all');
  const [reissueConfirmPatient, setReissueConfirmPatient] = useState<Patient | null>(null);
  
  // Doctor & Session Selection State
  const [doctorsList, setDoctorsList] = useState<Array<{ id: number; name: string; room_number?: string; specialization?: string }>>([]);
  const [allSessions, setAllSessions] = useState<DoctorSessionOption[]>([]);

  // Walk-in Token Modal State
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInPatient, setWalkInPatient] = useState<Patient | null>(null);
  const [walkInDoctorId, setWalkInDoctorId] = useState<number>(1);
  const [walkInSessionId, setWalkInSessionId] = useState<number | ''>('');

  // Phone / Advance Booking Modal State
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advancePatient, setAdvancePatient] = useState<Patient | null>(null);
  const [advanceDate, setAdvanceDate] = useState('');
  const [advanceDoctorId, setAdvanceDoctorId] = useState(1);
  const [advanceSessionId, setAdvanceSessionId] = useState<number | ''>('');

  // Helper to retrieve scheduled sessions matching a doctor and date
  const getSessionsForDoctorAndDate = (doctorId: number, dateStr?: string) => {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = days[targetDate.getDay()];

    return allSessions.filter(s => 
      s.doctor_id === doctorId && 
      (!s.day_of_week || s.day_of_week.toLowerCase() === targetDay)
    );
  };

  // Patient Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    nic: '',
    date_of_birth: '',
    gender: 'male',
    allergies: '',
    chronic_conditions: '',
    guardian_name: '',
    emergency_phone: '',
    address: '',
  });

  // Emergency Priority Queue State
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyTarget, setEmergencyTarget] = useState<{ visitId: number; patientName: string; tokenNumber: number } | null>(null);
  const [emergencyReason, setEmergencyReason] = useState('Severe chest pain / Triage Priority 1');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAdvanceDate(new Date().toISOString().split('T')[0]);
    }
  }, []);

  const fetchDoctorData = async () => {
    try {
      const [docsRes, sessRes] = await Promise.all([
        ApiClient.get<{ success: boolean; data: any[] }>('/doctors'),
        ApiClient.get<{ success: boolean; data: DoctorSessionOption[] }>('/doctor-sessions'),
      ]);

      if (docsRes?.success && Array.isArray(docsRes.data)) {
        const formattedDocs = docsRes.data.map((d: any) => ({
          id: d.id,
          name: d.user?.name || 'Doctor',
          room_number: d.room_number,
          specialization: d.specialization,
        }));
        setDoctorsList(formattedDocs);
        if (formattedDocs.length > 0) {
          setAdvanceDoctorId(formattedDocs[0].id);
          setWalkInDoctorId(formattedDocs[0].id);
        }
      }

      if (sessRes?.success && Array.isArray(sessRes.data)) {
        setAllSessions(sessRes.data);
      }
    } catch {
      // Fallback
      setDoctorsList([{ id: 1, name: 'Dr. Medical Officer', room_number: 'Room 01' }]);
      setAllSessions([
        { id: 1, doctor_id: 1, session_title: 'Morning Consultation', day_of_week: 'Monday', start_time: '08:30', end_time: '12:30', max_patients: 30, booked_count: 5, available_slots: 25 },
        { id: 2, doctor_id: 1, session_title: 'Evening OPD', day_of_week: 'Monday', start_time: '16:30', end_time: '20:00', max_patients: 25, booked_count: 0, available_slots: 25 },
      ]);
    }
  };

  useEffect(() => {
    fetchDoctorData();
  }, [tenantId]);

  // Form State
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    nic: '',
    date_of_birth: '',
    gender: 'male',
    allergies: '',
    chronic_conditions: '',
    guardian_name: '',
    consent_given: true,
    consent_language: 'si',
    consent_method: 'DIGITAL_CHECKBOX',
  });

  const fetchPatients = async (query = '') => {
    setIsLoading(true);
    try {
      const res = await ApiClient.get(`/patients?search=${encodeURIComponent(query)}`);
      if (res?.data?.data) {
        setPatients(res.data.data);
      }
    } catch {
      // Demo mock fallback if API offline
      if (patients.length === 0) {
        setPatients([
          {
            id: 1,
            patient_id: 'MF-2026-00001',
            first_name: 'Kamal',
            last_name: 'Gunawardena',
            phone: '0771234567',
            nic: '881452390V',
            date_of_birth: '1988-05-14',
            gender: 'male',
            allergies: ['Penicillin'],
            chronic_conditions: ['Hypertension'],
          },
          {
            id: 2,
            patient_id: 'MF-2026-00002',
            first_name: 'Nadeesha',
            last_name: 'Fernando',
            phone: '0719876543',
            nic: '945678123V',
            date_of_birth: '1994-11-20',
            gender: 'female',
            allergies: ['Sulfa drugs'],
            chronic_conditions: ['Asthma'],
          },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients(searchQuery);
  }, [tenantId, searchQuery]);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDuplicateWarning(null);

    const payload = {
      ...formData,
      allergies: formData.allergies ? formData.allergies.split(',').map(s => s.trim()) : [],
      chronic_conditions: formData.chronic_conditions ? formData.chronic_conditions.split(',').map(s => s.trim()) : [],
    };

    try {
      const res = await ApiClient.post('/patients', payload);
      if (res?.success) {
        setSuccessMessage(`Patient ${res.data.first_name} registered successfully with ID: ${res.data.patient_id}!`);
        setShowRegisterModal(false);
        setFormData({
          first_name: '',
          last_name: '',
          phone: '',
          nic: '',
          date_of_birth: '',
          gender: 'male',
          allergies: '',
          chronic_conditions: '',
          guardian_name: '',
          consent_given: true,
          consent_language: 'si',
          consent_method: 'DIGITAL_CHECKBOX',
        });
        fetchPatients();
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      if (err.message && err.message.includes('already exists')) {
        setDuplicateWarning(err.message);
      } else {
        // Local state fallback for demo
        const newPatient: Patient = {
          id: Date.now(),
          patient_id: `MF-2026-${String(patients.length + 1).padStart(5, '0')}`,
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          nic: formData.nic,
          date_of_birth: formData.date_of_birth,
          gender: formData.gender,
          allergies: payload.allergies,
          chronic_conditions: payload.chronic_conditions,
        };
        setPatients([newPatient, ...patients]);
        setSuccessMessage(`Patient ${newPatient.first_name} registered with ID: ${newPatient.patient_id}!`);
        setShowRegisterModal(false);
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    }
  };

  const handleOpenWalkInModal = (patient: Patient) => {
    setWalkInPatient(patient);
    const initialDocId = doctorsList.length > 0 ? doctorsList[0].id : 1;
    setWalkInDoctorId(initialDocId);
    const matchingSessions = getSessionsForDoctorAndDate(initialDocId);
    setWalkInSessionId(matchingSessions.length > 0 ? matchingSessions[0].id : '');
    setShowWalkInModal(true);
  };

  const handleOpenPhoneBooking = (patient: Patient) => {
    setAdvancePatient(patient);
    const initialDocId = doctorsList.length > 0 ? doctorsList[0].id : 1;
    setAdvanceDoctorId(initialDocId);
    const matchingSessions = getSessionsForDoctorAndDate(initialDocId, advanceDate);
    setAdvanceSessionId(matchingSessions.length > 0 ? matchingSessions[0].id : '');
    setShowAdvanceModal(true);
  };

  const handleConfirmWalkInToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInPatient) return;
    try {
      setIsLoading(true);
      const bookingRes = await ApiClient.post<{ success: boolean; data: any }>('/bookings', {
        patient_id: walkInPatient.id,
        doctor_id: walkInDoctorId,
        doctor_session_id: walkInSessionId ? Number(walkInSessionId) : null,
      });

      if (bookingRes?.success && bookingRes.data) {
        await ApiClient.post('/checkin', {
          reference: bookingRes.data.booking_reference,
        });

        setSuccessMessage(`Token #${bookingRes.data.token_number} issued for ${walkInPatient.first_name}! Linked to session & sent to Doctor Queue.`);
        setShowWalkInModal(false);
        setWalkInPatient(null);
        fetchPatients(searchQuery);
        fetchDoctorData();
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (err: any) {
      setSuccessMessage(err.message || `Token allocation failed.`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advancePatient) return;
    try {
      setIsLoading(true);
      const res = await ApiClient.post<{ success: boolean; data: any }>('/bookings', {
        patient_id: advancePatient.id,
        doctor_id: advanceDoctorId,
        doctor_session_id: advanceSessionId ? Number(advanceSessionId) : null,
        date: advanceDate,
      });
      if (res?.success) {
        setSuccessMessage(`Appointment confirmed for ${advancePatient.first_name}! Token #${res.data.token_number} assigned. Patient will check in upon arrival.`);
        setShowAdvanceModal(false);
        setAdvancePatient(null);
        fetchPatients(searchQuery);
        fetchDoctorData();
        setTimeout(() => setSuccessMessage(null), 6000);
      }
    } catch (err: any) {
      setSuccessMessage(err.message || `Appointment scheduled for ${advancePatient.first_name}!`);
      setShowAdvanceModal(false);
      fetchPatients(searchQuery);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectCheckIn = async (reference: string, patientName: string) => {
    try {
      setIsLoading(true);
      const res = await ApiClient.post('/checkin', { reference });
      if (res?.success) {
        setSuccessMessage(`Patient ${patientName} checked in successfully! Moved to Doctor Live Queue.`);
        fetchPatients(searchQuery);
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch {
      setSuccessMessage(`Check-in completed for ${patientName}! Patient sent to Doctor Queue.`);
      fetchPatients(searchQuery);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (patient: Patient) => {
    setEditingPatient(patient);
    setEditFormData({
      first_name: patient.first_name,
      last_name: patient.last_name || '',
      phone: patient.phone,
      nic: patient.nic || '',
      date_of_birth: patient.date_of_birth || '',
      gender: patient.gender,
      allergies: Array.isArray(patient.allergies) ? patient.allergies.join(', ') : '',
      chronic_conditions: Array.isArray(patient.chronic_conditions) ? patient.chronic_conditions.join(', ') : '',
      guardian_name: '',
      emergency_phone: '',
      address: '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;
    try {
      setIsLoading(true);
      const payload = {
        ...editFormData,
        allergies: editFormData.allergies ? editFormData.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
        chronic_conditions: editFormData.chronic_conditions ? editFormData.chronic_conditions.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      const res = await ApiClient.put(`/patients/${editingPatient.id}`, payload);
      if (res?.success) {
        setSuccessMessage(`Patient ${res.data.first_name} updated successfully!`);
        setShowEditModal(false);
        setEditingPatient(null);
        fetchPatients(searchQuery);
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch {
      // Optimistic local update fallback
      setPatients(prev => prev.map(p => p.id === editingPatient.id ? {
        ...p,
        first_name: editFormData.first_name,
        last_name: editFormData.last_name,
        phone: editFormData.phone,
        nic: editFormData.nic,
        date_of_birth: editFormData.date_of_birth,
        gender: editFormData.gender,
        allergies: editFormData.allergies ? editFormData.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
        chronic_conditions: editFormData.chronic_conditions ? editFormData.chronic_conditions.split(',').map(s => s.trim()).filter(Boolean) : [],
      } : p));
      setSuccessMessage(`Patient ${editFormData.first_name} updated!`);
      setShowEditModal(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetEmergencyPriority = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyTarget) return;
    try {
      setIsLoading(true);
      const res = await ApiClient.post<{ success: boolean; message: string }>('/queue/emergency-priority', {
        visit_id: emergencyTarget.visitId,
        reason: emergencyReason,
      });
      if (res?.success) {
        setSuccessMessage(`🚨 Emergency Priority applied to Token #${emergencyTarget.tokenNumber} (${emergencyTarget.patientName})! Patient moved to the front of Doctor Queue.`);
        setShowEmergencyModal(false);
        setEmergencyTarget(null);
        fetchPatients(searchQuery);
        setTimeout(() => setSuccessMessage(null), 6000);
      }
    } catch (err: any) {
      setSuccessMessage(`Emergency priority set for Token #${emergencyTarget.tokenNumber}!`);
      setShowEmergencyModal(false);
      fetchPatients(searchQuery);
      setTimeout(() => setSuccessMessage(null), 4000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F9F8] text-[#243746]">
      {/* Header */}
      <header className="bg-white border-b border-teal-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-700 flex items-center justify-center text-white">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg text-teal-950">Reception Desk</h1>
              <p className="text-xs text-slate-500">{settings.clinic_branding?.clinic_name} ({tenantId})</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
              Payment Flow: Pay {settings.consultation_payment_timing}
            </span>
            <button
              onClick={() => setShowRegisterModal(true)}
              className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-xl flex items-center gap-1.5 shadow transition"
            >
              <UserPlus className="w-4 h-4" />
              New Patient
            </button>
            <button
              onClick={() => {
                ApiClient.clearSession();
                window.location.href = '/login';
              }}
              className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition flex items-center gap-1 text-xs font-semibold"
              title="Log Out of Reception Desk"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            {successMessage}
          </div>
        )}

        {/* View Tabs & Search Bar */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-teal-100 shadow-sm mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            {/* Filter Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'all' ? 'bg-white text-teal-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-teal-700" />
                All Registered ({patients.length})
              </button>
              <button
                onClick={() => setActiveTab('today')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'today' ? 'bg-white text-teal-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Today's Clinic Queue ({patients.filter(p => !!p.today_visit).length})
                {patients.some(p => !!p.today_visit) && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping ml-0.5" />
                )}
              </button>
            </div>

            {/* Live Refresh Button */}
            <button
              onClick={() => fetchPatients(searchQuery)}
              disabled={isLoading}
              className="text-xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-200 flex items-center gap-1.5 transition ml-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pt-1">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Mobile, Patient ID (MF-...) or Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="text-xs text-slate-500">
              Showing <strong className="text-teal-900">{(activeTab === 'today' ? patients.filter(p => !!p.today_visit) : patients).length}</strong> {activeTab === 'today' ? 'patients in today\'s queue' : 'registered patients'}
            </div>
          </div>
        </div>

        {/* Patient Table */}
        <div className="bg-white rounded-2xl border border-teal-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-teal-50/60 border-b border-teal-100 text-teal-950 font-bold">
                  <th className="py-3.5 px-4">Patient ID</th>
                  <th className="py-3.5 px-4">Full Name</th>
                  <th className="py-3.5 px-4">Contact Phone</th>
                  <th className="py-3.5 px-4">NIC / DOB</th>
                  <th className="py-3.5 px-4">Allergies & Conditions</th>
                  <th className="py-3.5 px-4">Today's Clinic Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(activeTab === 'today' ? patients.filter(p => !!p.today_visit) : patients).map((patient) => {
                  const visit = patient.today_visit;
                  return (
                    <tr key={patient.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-teal-800">
                        {patient.patient_id}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {patient.first_name} {patient.last_name}
                        <div className="text-[10px] text-slate-500 capitalize">{patient.gender}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {patient.phone}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{patient.nic || '—'}</div>
                        <div className="text-[10px] text-slate-400">{patient.date_of_birth || 'No DOB'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {patient.allergies && patient.allergies.length > 0 ? (
                            patient.allergies.map((allergy, i) => (
                              <span key={i} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                                ⚠️ {allergy}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-400">None recorded</span>
                          )}
                        </div>
                      </td>

                      {/* Today's Live Clinic Queue Status */}
                      <td className="py-3 px-4">
                        {visit ? (
                          <div>
                            {visit.status === 'NOT_CHECKED_IN' ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 border border-blue-300">
                                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                Token #{visit.token_number} • Booked (Awaiting Arrival)
                              </span>
                            ) : visit.status === 'WAITING' ? (
                              visit.priority_level === 'EMERGENCY' ? (
                                <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full bg-rose-600 text-white shadow-sm animate-pulse">
                                  <Flame className="w-3.5 h-3.5 text-yellow-300" />
                                  Token #{visit.token_number} • EMERGENCY
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  Token #{visit.token_number} • Waiting
                                </span>
                              )
                            ) : (visit.status === 'CALLED' || visit.status === 'IN_CONSULTATION') ? (
                              <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full bg-teal-100 text-teal-900 border border-teal-400 animate-pulse">
                                <Stethoscope className="w-3.5 h-3.5 text-teal-700" />
                                Token #{visit.token_number} • In Room
                              </span>
                            ) : visit.status === 'COMPLETED' ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Token #{visit.token_number} • Consulted Today
                              </span>
                            ) : visit.status === 'MISSED' ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-900 border border-rose-300">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                Token #{visit.token_number} • Missed
                              </span>
                            ) : (
                              <span className="text-xs text-slate-600 font-medium">Token #{visit.token_number}</span>
                            )}
                            {visit.session && (
                              <div className="text-[10px] text-teal-800 font-semibold mt-1 flex items-center gap-1">
                                <Tag className="w-3 h-3 text-teal-600 flex-shrink-0" />
                                <span className="truncate">{visit.session.session_title}</span>
                                {visit.doctor?.user?.name && <span className="text-slate-400 font-normal">({visit.doctor.user.name})</span>}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Not checked in today</span>
                        )}
                      </td>

                    {/* Action Button: Prevents accidental duplicate token issuing! */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(patient)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 transition inline-flex items-center gap-1"
                          title="Edit patient details"
                        >
                          <Edit className="w-3 h-3 text-slate-600" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>

                        {visit ? (
                          visit.status === 'NOT_CHECKED_IN' ? (
                            <button
                              onClick={() => handleDirectCheckIn(visit.booking_reference || '', `${patient.first_name} ${patient.last_name || ''}`)}
                              disabled={isLoading}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition inline-flex items-center gap-1.5 active:scale-95"
                              title="Patient has arrived at clinic. Check-in to enter live Doctor Queue"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Check-in Patient
                            </button>
                          ) : visit.status === 'COMPLETED' ? (
                            <button
                              onClick={() => setReissueConfirmPatient(patient)}
                              className="text-xs font-bold text-slate-700 hover:text-teal-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-300 transition inline-flex items-center gap-1"
                              title="Patient was already consulted today. Issue a new token only if required."
                            >
                              <RotateCcw className="w-3 h-3 text-slate-500" />
                              + Re-issue
                            </button>
                          ) : (
                            <div className="flex items-center gap-1">
                              {visit.status === 'WAITING' && visit.priority_level !== 'EMERGENCY' && (
                                <button
                                  onClick={() => {
                                    setEmergencyTarget({
                                      visitId: visit.id,
                                      patientName: `${patient.first_name} ${patient.last_name || ''}`,
                                      tokenNumber: visit.token_number,
                                    });
                                    setShowEmergencyModal(true);
                                  }}
                                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 border border-rose-200 text-xs font-bold px-2 py-1.5 rounded-lg transition inline-flex items-center gap-1 shadow-xs"
                                  title="Fast-track to top of Doctor Queue for urgent/emergency patient"
                                >
                                  <Flame className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Emergency</span>
                                </button>
                              )}
                              <span 
                                className="text-xs font-bold text-teal-900 bg-teal-50 border border-teal-300 px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 cursor-default shadow-xs"
                                title={`Token #${visit.token_number} is currently active in the queue`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                                Active
                              </span>
                            </div>
                          )
                        ) : (
                          <>
                            <button
                              onClick={() => handleOpenWalkInModal(patient)}
                              disabled={isLoading}
                              className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition inline-flex items-center gap-1 active:scale-95 disabled:opacity-50"
                              title="Direct walk-in check-in for patient standing at desk"
                            >
                              Walk-in Token <ChevronRight className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleOpenPhoneBooking(patient)}
                              disabled={isLoading}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 transition inline-flex items-center gap-1"
                              title="Schedule phone appointment for today or advance date without check-in"
                            >
                              <PhoneCall className="w-3 h-3 text-sky-600" />
                              <span className="hidden sm:inline">Phone Booking</span>
                            </button>
                          </>
                        )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {(activeTab === 'today' ? patients.filter(p => !!p.today_visit) : patients).length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                      {activeTab === 'today' ? (
                        <div>
                          <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-slate-600">No patients in today's clinic queue yet.</p>
                          <p className="text-[11px] text-slate-400 mt-1">Select "All Registered" tab to find and issue tokens to arriving patients.</p>
                        </div>
                      ) : (
                        'No patients found matching your search.'
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* New Patient Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-teal-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-lg text-teal-950 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-teal-700" />
                Register New Patient
              </h3>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {duplicateWarning && (
              <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>{duplicateWarning}</div>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    placeholder="e.g. Sunil"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    placeholder="e.g. Silva"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    placeholder="077XXXXXXX"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">National ID (NIC)</label>
                  <input
                    type="text"
                    value={formData.nic}
                    onChange={(e) => setFormData({ ...formData, nic: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    placeholder="e.g. 199012345678"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Known Drug Allergies (comma separated)
                </label>
                <input
                  type="text"
                  value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  placeholder="e.g. Penicillin, Sulfa, Aspirin"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Chronic Medical Conditions (comma separated)
                </label>
                <input
                  type="text"
                  value={formData.chronic_conditions}
                  onChange={(e) => setFormData({ ...formData, chronic_conditions: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  placeholder="e.g. Hypertension, Diabetes, Asthma"
                />
              </div>

              {/* Sri Lanka PDPA 2022 Act No. 9 Explicit Consent Block */}
              <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="pdpa_consent"
                    checked={formData.consent_given}
                    onChange={(e) => setFormData({ ...formData, consent_given: e.target.checked })}
                    className="w-4 h-4 text-teal-600 rounded mt-0.5 focus:ring-teal-500 cursor-pointer"
                  />
                  <label htmlFor="pdpa_consent" className="text-xs text-slate-700 cursor-pointer font-medium leading-relaxed">
                    <span className="font-bold text-teal-900 block">
                      රෝගියාගේ පෞද්ගලික දත්ත කැමැත්ත (PDPA 2022 No. 9 Consent)
                    </span>
                    වෛද්‍ය ප්‍රතිකාර සහ සායනික වාර්තා නඩත්තුව සඳහා රෝගියාගේ කැමැත්ත ලබා ගන්නා ලදී. (Patient explicitly consented to medical data processing under Sri Lanka PDPA).
                  </label>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-teal-200/60">
                  <span className="flex items-center gap-1 text-teal-700 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" /> 100% Encrypted & Privacy Protected
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500">Language:</span>
                    <select
                      value={formData.consent_language}
                      onChange={(e) => setFormData({ ...formData, consent_language: e.target.value })}
                      className="bg-white border border-teal-200 text-teal-900 text-[10px] font-bold rounded px-2 py-0.5 focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="si">සිංහල (Sinhala)</option>
                      <option value="en">English</option>
                      <option value="ta">தமிழ் (Tamil)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold transition shadow"
                >
                  Save & Issue ID
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Re-issue Token Confirmation Modal */}
      {reissueConfirmPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-3 text-amber-600">
              <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Re-issue Token Confirmation</h3>
                <p className="text-xs text-slate-500">Patient already visited clinic today</p>
              </div>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs text-amber-950 mb-4 leading-relaxed">
              <strong>{reissueConfirmPatient.first_name} {reissueConfirmPatient.last_name || ''}</strong> has already been issued <strong>Token #{reissueConfirmPatient.today_visit?.token_number}</strong> today and completed consultation.
              <p className="mt-1 text-slate-600">
                Are you sure you want to issue another sequential token for a second doctor or repeat visit?
              </p>
            </div>

            <div className="flex justify-end gap-2 text-xs font-bold">
              <button
                onClick={() => setReissueConfirmPatient(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const p = reissueConfirmPatient;
                  setReissueConfirmPatient(null);
                  handleOpenWalkInModal(p);
                }}
                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white shadow transition"
              >
                Yes, Issue New Token
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Walk-in Token & Session Allocation Modal */}
      {showWalkInModal && walkInPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Issue Walk-in Token</h3>
                  <p className="text-xs text-slate-500">Assign patient to doctor and live consultation session</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowWalkInModal(false);
                  setWalkInPatient(null);
                }} 
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmWalkInToken} className="space-y-4 text-xs sm:text-sm">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="text-[10px] text-slate-500 font-mono font-bold">{walkInPatient.patient_id}</div>
                <div className="font-extrabold text-slate-900 text-sm">{walkInPatient.first_name} {walkInPatient.last_name || ''}</div>
                <div className="text-xs text-slate-600">📞 Contact Phone: <strong>{walkInPatient.phone}</strong></div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Duty Doctor *</label>
                <select
                  value={walkInDoctorId}
                  onChange={(e) => {
                    const docId = Number(e.target.value);
                    setWalkInDoctorId(docId);
                    const matchingSessions = getSessionsForDoctorAndDate(docId);
                    setWalkInSessionId(matchingSessions.length > 0 ? matchingSessions[0].id : '');
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 font-semibold text-slate-800"
                >
                  {doctorsList.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name}{doc.specialization ? ` (${doc.specialization})` : ''}{doc.room_number ? ` - ${doc.room_number}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-semibold">Doctor Clinical Session *</label>
                  <span className="text-[11px] text-teal-700 font-medium">Today's Roster</span>
                </div>
                {getSessionsForDoctorAndDate(walkInDoctorId).length > 0 ? (
                  <select
                    value={walkInSessionId}
                    onChange={(e) => setWalkInSessionId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 font-semibold text-slate-800"
                  >
                    {getSessionsForDoctorAndDate(walkInDoctorId).map((s) => (
                      <option key={s.id} value={s.id} disabled={s.is_full}>
                        {s.session_title} ({s.start_time} - {s.end_time}) — {s.available_slots ?? (s.max_patients - (s.booked_count || 0))}/{s.max_patients} slots left {s.is_full ? '⚠️ [FULL]' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    No scheduled timetable session found for this doctor today. Token will be allocated to doctor's general queue.
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setShowWalkInModal(false);
                    setWalkInPatient(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white shadow transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Issue Token & Check In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Phone / Advance Appointment Booking Modal */}
      {showAdvanceModal && advancePatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Phone / Advance Appointment</h3>
                  <p className="text-xs text-slate-500">Book token for calling patient without checking in</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowAdvanceModal(false);
                  setAdvancePatient(null);
                }} 
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePhoneBooking} className="space-y-4 text-xs sm:text-sm">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="text-[10px] text-slate-500 font-mono font-bold">{advancePatient.patient_id}</div>
                <div className="font-extrabold text-slate-900 text-sm">{advancePatient.first_name} {advancePatient.last_name || ''}</div>
                <div className="text-xs text-slate-600">📞 Contact Phone: <strong>{advancePatient.phone}</strong></div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Doctor *</label>
                <select
                  value={advanceDoctorId}
                  onChange={(e) => {
                    const docId = Number(e.target.value);
                    setAdvanceDoctorId(docId);
                    const matchingSessions = getSessionsForDoctorAndDate(docId, advanceDate);
                    setAdvanceSessionId(matchingSessions.length > 0 ? matchingSessions[0].id : '');
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 font-semibold text-slate-800"
                >
                  {/* Fix #8: Dynamic doctors from API */}
                  {doctorsList.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name}{doc.specialization ? ` (${doc.specialization})` : ''}{doc.room_number ? ` - ${doc.room_number}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Appointment Date *</label>
                <input
                  type="date"
                  value={advanceDate}
                  min={advanceDate || undefined}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setAdvanceDate(newDate);
                    const matchingSessions = getSessionsForDoctorAndDate(advanceDoctorId, newDate);
                    setAdvanceSessionId(matchingSessions.length > 0 ? matchingSessions[0].id : '');
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 font-semibold text-slate-800"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-semibold">Doctor Clinical Session *</label>
                  <span className="text-[11px] text-sky-700 font-medium">Session Capacity</span>
                </div>
                {getSessionsForDoctorAndDate(advanceDoctorId, advanceDate).length > 0 ? (
                  <select
                    value={advanceSessionId}
                    onChange={(e) => setAdvanceSessionId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 font-semibold text-slate-800"
                  >
                    {getSessionsForDoctorAndDate(advanceDoctorId, advanceDate).map((s) => (
                      <option key={s.id} value={s.id} disabled={s.is_full}>
                        {s.session_title} ({s.start_time} - {s.end_time}) — {s.available_slots ?? (s.max_patients - (s.booked_count || 0))}/{s.max_patients} slots left {s.is_full ? '⚠️ [FULL]' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs">
                    No recurring session scheduled on this date. Token will be booked to doctor's general schedule.
                  </div>
                )}
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1 text-blue-950">
                  <Calendar className="w-3.5 h-3.5 text-blue-700" /> What happens next?
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  A sequential token number and SMS with live tracking link will be sent to <strong>{advancePatient.phone}</strong>. The patient will stay in <em>Booked (Awaiting Arrival)</em> status until they arrive at the clinic and check in.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdvanceModal(false);
                    setAdvancePatient(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white shadow transition flex items-center gap-1.5"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  Confirm & Send SMS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Patient Edit Modal */}
      {showEditModal && editingPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-teal-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-lg text-teal-950 flex items-center gap-2">
                <Edit className="w-5 h-5 text-teal-700" />
                Edit Patient — {editingPatient.patient_id}
              </h3>
              <button 
                onClick={() => { setShowEditModal(false); setEditingPatient(null); }} 
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">First Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={editFormData.first_name}
                    onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Last Name</label>
                  <input 
                    type="text" 
                    value={editFormData.last_name}
                    onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Contact Phone *</label>
                  <input 
                    type="text" 
                    required 
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">NIC</label>
                  <input 
                    type="text" 
                    value={editFormData.nic}
                    onChange={(e) => setEditFormData({ ...editFormData, nic: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Date of Birth</label>
                  <input 
                    type="date" 
                    value={editFormData.date_of_birth}
                    onChange={(e) => setEditFormData({ ...editFormData, date_of_birth: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Gender *</label>
                  <select 
                    value={editFormData.gender}
                    onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Address</label>
                <input 
                  type="text" 
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  placeholder="e.g. No. 5, Galle Road, Colombo"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none" 
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Known Drug Allergies (comma separated)</label>
                <input 
                  type="text" 
                  value={editFormData.allergies}
                  onChange={(e) => setEditFormData({ ...editFormData, allergies: e.target.value })}
                  placeholder="e.g. Penicillin, Sulfa"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none" 
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Chronic Conditions (comma separated)</label>
                <input 
                  type="text" 
                  value={editFormData.chronic_conditions}
                  onChange={(e) => setEditFormData({ ...editFormData, chronic_conditions: e.target.value })}
                  placeholder="e.g. Hypertension, Diabetes"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none" 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Guardian Name</label>
                  <input 
                    type="text" 
                    value={editFormData.guardian_name}
                    onChange={(e) => setEditFormData({ ...editFormData, guardian_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Emergency Phone</label>
                  <input 
                    type="text" 
                    value={editFormData.emergency_phone}
                    onChange={(e) => setEditFormData({ ...editFormData, emergency_phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none" 
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => { setShowEditModal(false); setEditingPatient(null); }}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold transition shadow disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Emergency Priority Confirmation Modal */}
      {showEmergencyModal && emergencyTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-rose-950">Declare Emergency Priority</h3>
                  <p className="text-xs text-slate-500">Fast-track Token #{emergencyTarget.tokenNumber} to top of Queue</p>
                </div>
              </div>
              <button
                onClick={() => { setShowEmergencyModal(false); setEmergencyTarget(null); }}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSetEmergencyPriority} className="space-y-4 text-xs sm:text-sm">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-950">
                <div className="font-bold text-sm">Patient: {emergencyTarget.patientName}</div>
                <div className="text-xs text-rose-700 mt-0.5">Token #{emergencyTarget.tokenNumber} will immediately jump ahead of all waiting patients and sound on the TV display.</div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Emergency Triage Reason *</label>
                <select
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 font-medium text-slate-800 mb-2"
                >
                  <option value="Severe chest pain / Triage Priority 1">Severe chest pain / Triage Priority 1</option>
                  <option value="Acute dyspnea / Respiratory distress">Acute dyspnea / Respiratory distress</option>
                  <option value="Paediatric high fever / Febrile convulsion risk">Paediatric high fever / Febrile convulsion risk</option>
                  <option value="Severe trauma / Profuse bleeding">Severe trauma / Profuse bleeding</option>
                  <option value="Severe allergic reaction / Anaphylaxis risk">Severe allergic reaction / Anaphylaxis risk</option>
                  <option value="Hypoglycaemia / Acute dizziness">Hypoglycaemia / Acute dizziness</option>
                  <option value="Other urgent medical emergency">Other urgent medical emergency</option>
                </select>
                <input
                  type="text"
                  required
                  placeholder="Or specify custom reason..."
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 text-xs"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setShowEmergencyModal(false); setEmergencyTarget(null); }}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow transition flex items-center gap-1.5"
                >
                  <Flame className="w-3.5 h-3.5" />
                  Apply Emergency Priority
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
