'use client';

import React, { useState } from 'react';
import { useMediFlow } from '@/context/MediFlowContext';
import { Patient, Visit } from '@/types/mediflow';
import { useToast } from '@/components/ui/Toast';
import { StatusChip, StatCard, SectionHeader, EmptyState } from '@/components/ui/MedicalUI';
import {
  Users,
  UserPlus,
  Search,
  QrCode,
  Ticket,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  UserCheck,
  ArrowRight,
  ShieldAlert,
  Smartphone,
  Hash,
  AlertTriangle,
  X,
  CalendarCheck,
  Activity,
  MapPin
} from 'lucide-react';

export const ReceptionView: React.FC = () => {
  const {
    patients,
    visits,
    doctors,
    registerPatient,
    searchPatients,
    bookVisit,
    checkInVisit,
    checkInByQR,
    setSelectedVisitIdForMobile,
    setActiveView
  } = useMediFlow();

  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientForBooking, setSelectedPatientForBooking] = useState<Patient | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [qrScanResult, setQrScanResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [smsPreviewVisit, setSmsPreviewVisit] = useState<Visit | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    phone: '',
    nic: '',
    address: '',
    guardianOrFamilyRelation: '',
    allergies: '',
    chronicConditions: ''
  });
  const [isQuickWalkInModalOpen, setIsQuickWalkInModalOpen] = useState(false);
  const [quickWalkInData, setQuickWalkInData] = useState({
    name: '',
    age: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    phone: ''
  });
  const [duplicateWarning, setDuplicateWarning] = useState<Patient | null>(null);

  const filteredPatients = searchPatients(searchQuery);

  // Stats
  const totalToday = visits.length;
  const waitingCount = visits.filter(v => v.status === 'WAITING').length;
  const inConsultCount = visits.filter(v => v.status === 'IN_CONSULTATION' || v.status === 'CALLED').length;
  const completedCount = visits.filter(v => v.status === 'COMPLETED').length;
  const notYetArrived = visits.filter(v => v.status === 'NOT_CHECKED_IN').length;

  const handlePhoneChange = (phoneVal: string) => {
    setFormData(prev => ({ ...prev, phone: phoneVal }));
    const existing = patients.find(p => p.phone.replace(/\s+/g, '') === phoneVal.replace(/\s+/g, ''));
    setDuplicateWarning(existing || null);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      showToast('error', 'Required fields missing', 'Patient name and phone number are mandatory.');
      return;
    }
    const created = registerPatient({
      name: formData.name,
      age: parseInt(formData.age) || 30,
      gender: formData.gender,
      phone: formData.phone,
      nic: formData.nic || 'N/A',
      address: formData.address || 'Colombo',
      guardianOrFamilyRelation: formData.guardianOrFamilyRelation || undefined,
      allergies: formData.allergies ? formData.allergies.split(',').map(s => s.trim()) : [],
      chronicConditions: formData.chronicConditions ? formData.chronicConditions.split(',').map(s => s.trim()) : []
    });
    setIsRegisterModalOpen(false);
    setFormData({ name: '', age: '', gender: 'Male', phone: '', nic: '', address: '', guardianOrFamilyRelation: '', allergies: '', chronicConditions: '' });
    setDuplicateWarning(null);
    showToast('success', `Patient Registered — ${created.id}`, `${created.name} has been added to the clinic database.`);
    setSelectedPatientForBooking(created);
  };

  const handleQuickBook = (patient: Patient, isWalkIn: boolean) => {
    const booked = bookVisit(patient.id, doctors[0].id, isWalkIn);
    setSelectedPatientForBooking(null);
    setSmsPreviewVisit(booked);
    showToast(
      'success',
      `Token #${booked.tokenNumber} Assigned`,
      isWalkIn ? `${patient.name} is now in the waiting queue.` : `Booking confirmed. SMS link sent to ${patient.phone}.`
    );
  };

  const handleManualCheckIn = (visitId: string, patientName: string, tokenNumber: number) => {
    checkInVisit(visitId);
    showToast('success', `Arrival Confirmed — Token #${tokenNumber}`, `${patientName} has been added to the waiting queue.`);
  };

  const handleSimulateQRScan = (codeToScan?: string) => {
    const code = codeToScan || qrInput;
    if (!code) return;
    const match = checkInByQR(code);
    if (match) {
      setQrScanResult({ ok: true, message: `✓ Arrival confirmed for ${match.patientName} — Token #${match.tokenNumber}` });
      showToast('success', `QR Check-in — Token #${match.tokenNumber}`, `${match.patientName} is now waiting in queue.`);
      setTimeout(() => {
        setIsQRScannerOpen(false);
        setQrScanResult(null);
        setQrInput('');
      }, 1800);
    } else {
      setQrScanResult({ ok: false, message: 'QR code not recognised. Check the booking reference or search manually.' });
    }
  };

  const handleQuickWalkInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickWalkInData.name) {
      showToast('error', 'Name Required', 'Please enter patient name.');
      return;
    }

    const created = registerPatient({
      name: quickWalkInData.name,
      age: parseInt(quickWalkInData.age) || 30,
      gender: quickWalkInData.gender,
      phone: quickWalkInData.phone || '077 000 0000',
      nic: 'Walk-in',
      address: 'Colombo',
      allergies: [],
      chronicConditions: []
    });

    const booked = bookVisit(created.id, doctors[0].id, true);
    setIsQuickWalkInModalOpen(false);
    setQuickWalkInData({ name: '', age: '', gender: 'Male', phone: '' });

    showToast(
      'success',
      `Walk-In Token #${booked.tokenNumber} Issued!`,
      `${created.name} is now checked in and waiting for Dr. K. Perera.`
    );
  };

  return (
    <div className="space-y-5">
      {/* ─── Session Stats Strip ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Tokens Today"
          value={totalToday}
          subLabel="Dr. K. Perera — Evening Session"
          accent="teal"
          icon={<Hash className="w-5 h-5 text-teal-700" />}
        />
        <StatCard
          label="In Waiting Room"
          value={waitingCount}
          subLabel="Checked in, ready to be called"
          accent="emerald"
          icon={<Clock className="w-5 h-5 text-emerald-700" />}
        />
        <StatCard
          label="In Consultation Now"
          value={inConsultCount}
          subLabel="Doctor room occupied"
          accent="blue"
          icon={<Activity className="w-5 h-5 text-blue-700" />}
        />
        <StatCard
          label="Not Yet Arrived"
          value={notYetArrived}
          subLabel="Phone bookings pending arrival"
          accent="amber"
          icon={<AlertCircle className="w-5 h-5 text-amber-700" />}
        />
      </div>

      {/* ─── Top Action Bar ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#16324F] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#0F766E]" />
            Reception & Patient Check-in
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Register patients, issue tokens in seconds, confirm arrivals via QR scan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsQuickWalkInModalOpen(true)}
            className="flex items-center gap-2 bg-[#0F766E] hover:bg-[#0c5c56] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all duration-150 active:scale-95"
          >
            <Ticket className="w-4 h-4 text-[#CCFBF1]" />
            <span>⚡ Fast Walk-In Token</span>
          </button>
          <button
            onClick={() => setIsQRScannerOpen(true)}
            className="flex items-center gap-2 bg-[#16324F] hover:bg-[#1a3d61] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 active:scale-95"
          >
            <QrCode className="w-4 h-4 text-[#CCFBF1]" />
            <span>Scan QR / Check-in</span>
          </button>
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition"
          >
            <UserPlus className="w-4 h-4 text-slate-600" />
            <span>Full Profile</span>
          </button>
        </div>
      </div>

      {/* ─── Main Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left: Patient Finder */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="p-4 border-b border-slate-100">
            <SectionHeader
              icon={<Search className="w-4 h-4 text-[#0F766E]" />}
              title="Find Patient"
              subtitle={`${patients.length} registered patients`}
            />
            <div className="relative mt-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Name, Phone, NIC or Patient ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#243746] focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E] transition"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              Family members can share one phone number — each has their own Patient ID.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-50 max-h-[520px]">
            {filteredPatients.length === 0 ? (
              <EmptyState
                icon={<Search className="w-7 h-7" />}
                title="No patients found"
                description="Try searching by a different name, phone number or patient ID."
                action={
                  <button
                    onClick={() => setIsRegisterModalOpen(true)}
                    className="text-xs bg-[#0F766E] text-white px-3 py-1.5 rounded-lg font-medium"
                  >
                    Register New Patient
                  </button>
                }
              />
            ) : filteredPatients.map(patient => {
              const activeVisit = visits.find(v => v.patientId === patient.id && v.status !== 'COMPLETED' && v.status !== 'MISSED');
              return (
                <div key={patient.id} className="p-3.5 hover:bg-slate-50/60 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-[#16324F] text-sm truncate">{patient.name}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded whitespace-nowrap">
                          {patient.id}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2">
                        <span>{patient.age}y</span>
                        <span>•</span>
                        <span>{patient.gender}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Phone className="w-2.5 h-2.5 text-slate-400" />
                          {patient.phone}
                        </span>
                      </div>
                      {patient.guardianOrFamilyRelation && (
                        <div className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded mt-1 w-fit">
                          {patient.guardianOrFamilyRelation}
                        </div>
                      )}
                      {patient.allergies.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                          <span className="text-[10px] text-red-700 font-bold">
                            ⚠ Allergic: {patient.allergies.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="shrink-0">
                      {activeVisit ? (
                        <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-200 px-2 py-1 rounded-lg font-bold block whitespace-nowrap">
                          Token #{activeVisit.tokenNumber}
                        </span>
                      ) : (
                        <button
                          onClick={() => setSelectedPatientForBooking(patient)}
                          className="text-[11px] bg-[#0F766E] hover:bg-[#0c5c56] text-white px-2.5 py-1 rounded-lg font-semibold transition active:scale-95 whitespace-nowrap"
                        >
                          Book Token
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Live Queue Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="p-4 border-b border-slate-100">
            <SectionHeader
              icon={<CalendarCheck className="w-4 h-4 text-[#0F766E]" />}
              title="Live Session Queue — Dr. K. Perera (Room 01)"
              subtitle="Patients are called in check-in order. Booking number is shown separately."
            />
          </div>

          <div className="overflow-x-auto flex-1">
            {visits.length === 0 ? (
              <EmptyState
                icon={<Ticket className="w-7 h-7" />}
                title="No tokens issued yet"
                description="Book walk-in tokens or phone appointments to build today's queue."
              />
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wide border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Token</th>
                    <th className="py-3 px-4">Patient Details</th>
                    <th className="py-3 px-4">Booking Ref</th>
                    <th className="py-3 px-4">Queue Status</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {visits.map(visit => (
                    <tr
                      key={visit.id}
                      className={`transition hover:bg-slate-50/50 ${
                        visit.status === 'IN_CONSULTATION' ? 'bg-teal-50/30' :
                        visit.status === 'CALLED' ? 'bg-indigo-50/20' : ''
                      }`}
                    >
                      {/* Token Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base font-mono shadow-sm ${
                            visit.status === 'IN_CONSULTATION' || visit.status === 'CALLED'
                              ? 'bg-[#0F766E] text-white'
                              : visit.status === 'WAITING'
                              ? 'bg-[#CCFBF1] text-[#0F766E] border border-teal-300'
                              : visit.status === 'COMPLETED'
                              ? 'bg-slate-100 text-slate-500'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {visit.tokenNumber}
                          </span>
                          {visit.isWalkIn && (
                            <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                              Walk-in
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Patient Column */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#16324F] text-sm">{visit.patientName}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {visit.patientAge}y • {visit.patientGender} • {visit.patientId}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-2.5 h-2.5 text-slate-400" />
                          {visit.patientPhone}
                        </div>
                      </td>

                      {/* Booking Ref */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[11px] bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg text-slate-700">
                          {visit.bookingRef}
                        </span>
                        {visit.bookedAt && (
                          <div className="text-[10px] text-slate-400 mt-1">Booked {visit.bookedAt}</div>
                        )}
                      </td>

                      {/* Status Column */}
                      <td className="py-3.5 px-4">
                        <StatusChip status={visit.status} />
                        {visit.checkedInAt && visit.status !== 'NOT_CHECKED_IN' && (
                          <div className="text-[10px] text-slate-400 mt-1">Arrived {visit.checkedInAt}</div>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          {visit.status === 'NOT_CHECKED_IN' && (
                            <button
                              onClick={() => handleManualCheckIn(visit.id, visit.patientName, visit.tokenNumber)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition active:scale-95"
                            >
                              <UserCheck className="w-3 h-3" />
                              Check In
                            </button>
                          )}
                          {(visit.status === 'WAITING' || visit.status === 'IN_CONSULTATION') && (
                            <button
                              onClick={() => {
                                setSelectedVisitIdForMobile(visit.id);
                                setActiveView('patient-mobile');
                              }}
                              className="text-[#0F766E] hover:text-[#0c5c56] bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition"
                            >
                              <Smartphone className="w-3 h-3" />
                              Mobile
                            </button>
                          )}
                          <button
                            onClick={() => setSmsPreviewVisit(visit)}
                            className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-lg transition"
                            title="Preview SMS that was sent to patient"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ════ MODAL: REGISTER NEW PATIENT ════ */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-[#16324F] text-white px-5 py-4 rounded-t-2xl flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#CCFBF1]" />
                Register New Clinic Patient
              </h3>
              <button onClick={() => setIsRegisterModalOpen(false)} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Duplicate Phone Warning */}
              {duplicateWarning && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-800 text-xs">Existing Record on This Phone Number</span>
                    <p className="text-amber-700 text-[11px] mt-0.5">
                      <strong>{duplicateWarning.name}</strong> ({duplicateWarning.id}) is already registered under {duplicateWarning.phone}.
                      If this is a family member, specify their relationship below.
                    </p>
                  </div>
                </div>
              )}

              {/* Name & Age/Gender Row */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1.5">Full Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kasun Chamara Fernando"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E] outline-none text-sm text-[#16324F] transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1.5">Age <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={120}
                    placeholder="e.g. 34"
                    value={formData.age}
                    onChange={e => setFormData({ ...formData, age: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E] outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1.5">Gender <span className="text-red-500">*</span></label>
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E] outline-none transition"
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1.5">Contact Phone <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    required
                    placeholder="077 123 4567"
                    value={formData.phone}
                    onChange={e => handlePhoneChange(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E] outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1.5">NIC / Passport</label>
                  <input
                    type="text"
                    placeholder="e.g. 199012345678"
                    value={formData.nic}
                    onChange={e => setFormData({ ...formData, nic: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E] outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1.5">Family Relationship / Guardian</label>
                <input
                  type="text"
                  placeholder="e.g. Son of Nimal Senanayake (MF-2026-0042)"
                  value={formData.guardianOrFamilyRelation}
                  onChange={e => setFormData({ ...formData, guardianOrFamilyRelation: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E] outline-none transition"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1.5 flex items-center gap-1.5 text-red-700">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  Known Allergies <span className="text-xs font-normal text-slate-500">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Sulfa, Aspirin — Leave blank if none"
                  value={formData.allergies}
                  onChange={e => setFormData({ ...formData, allergies: e.target.value })}
                  className="w-full px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl focus:ring-2 focus:ring-red-300 outline-none transition text-red-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1.5">Chronic Conditions <span className="text-xs font-normal text-slate-500">(comma-separated)</span></label>
                <input
                  type="text"
                  placeholder="e.g. Hypertension, Type 2 Diabetes, Asthma"
                  value={formData.chronicConditions}
                  onChange={e => setFormData({ ...formData, chronicConditions: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E] outline-none transition"
                />
              </div>
            </form>

            <div className="px-5 pb-5 pt-3 border-t border-slate-100 flex justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(false)}
                className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const form = document.querySelector('form');
                  form?.requestSubmit();
                }}
                className="px-5 py-2.5 bg-[#0F766E] hover:bg-[#0c5c56] text-white rounded-xl font-bold text-xs shadow-sm transition active:scale-95"
              >
                Save Patient & Assign Token →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL: BOOK TOKEN ════ */}
      {selectedPatientForBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-[#16324F] text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Ticket className="w-4 h-4 text-[#CCFBF1]" />
                Issue Clinic Token
              </h3>
              <button onClick={() => setSelectedPatientForBooking(null)} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Patient Summary */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0F766E] flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {selectedPatientForBooking.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-[#16324F] text-sm">{selectedPatientForBooking.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {selectedPatientForBooking.id} • {selectedPatientForBooking.age}y • {selectedPatientForBooking.phone}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    Doctor: <strong>Dr. K. Perera</strong> — Evening GP Session
                  </div>
                  {selectedPatientForBooking.allergies.length > 0 && (
                    <div className="text-[10px] text-red-700 font-bold mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                      ⚠ Allergic to: {selectedPatientForBooking.allergies.join(', ')}
                    </div>
                  )}
                </div>
              </div>

              {/* Token Type Choice */}
              <p className="text-xs font-semibold text-slate-700">Select visit type:</p>
              <div className="space-y-2.5">
                <button
                  onClick={() => handleQuickBook(selectedPatientForBooking, true)}
                  className="w-full p-4 rounded-2xl border-2 border-[#0F766E] bg-teal-50 hover:bg-teal-100/60 text-left transition active:scale-[0.99] flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-[#0F766E] text-sm">Walk-In — Patient is Here Now</div>
                    <div className="text-[11px] text-teal-800 mt-0.5">Mark as Checked-In immediately and join the waiting queue.</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#0F766E] group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={() => handleQuickBook(selectedPatientForBooking, false)}
                  className="w-full p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-left transition active:scale-[0.99] flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-[#16324F] text-sm">Phone Booking — Patient Coming Later</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Issues a token and sends an SMS with QR code and live queue link.</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL: QR SCANNER ════ */}
      {isQRScannerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden">
            <div className="bg-[#16324F] text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#CCFBF1]" />
                Clinic QR Scanner / Check-in
              </h3>
              <button
                onClick={() => { setIsQRScannerOpen(false); setQrScanResult(null); setQrInput(''); }}
                className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Fake scanner viewfinder */}
              <div className="w-44 h-44 mx-auto border-4 border-[#0F766E] rounded-2xl flex flex-col items-center justify-center bg-teal-50 relative overflow-hidden">
                <QrCode className="w-24 h-24 text-[#0F766E] opacity-50" />
                <div className="absolute inset-x-0 top-0 h-0.5 bg-[#0F766E]/60 animate-[scan_2s_ease-in-out_infinite]"></div>
                <span className="absolute bottom-3 text-[9px] text-teal-700 font-semibold tracking-wider uppercase">Point camera at QR</span>
              </div>

              {/* Result feedback */}
              {qrScanResult && (
                <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  qrScanResult.ok
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {qrScanResult.ok
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    : <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
                  {qrScanResult.message}
                </div>
              )}

              {!qrScanResult && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1.5">Or enter Booking Reference manually:</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. BK-8817"
                        value={qrInput}
                        onChange={e => setQrInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSimulateQRScan()}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E] outline-none transition"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSimulateQRScan()}
                        className="bg-[#0F766E] text-white px-3 py-2 rounded-xl font-semibold text-xs hover:bg-[#0c5c56] transition active:scale-95"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 mb-2 font-medium uppercase tracking-wide">Quick demo scans:</p>
                    <div className="flex flex-wrap gap-2">
                      {visits.filter(v => v.status === 'NOT_CHECKED_IN').map(v => (
                        <button
                          key={v.id}
                          onClick={() => handleSimulateQRScan(v.bookingRef)}
                          className="text-[11px] bg-teal-50 border border-teal-200 text-teal-800 px-2.5 py-1 rounded-lg font-semibold hover:bg-teal-100 transition"
                        >
                          #{v.tokenNumber} — {v.patientName.split(' ')[0]}
                        </button>
                      ))}
                      {visits.filter(v => v.status === 'NOT_CHECKED_IN').length === 0 && (
                        <span className="text-[11px] text-slate-400">All booked patients have checked in.</span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL: SMS PREVIEW ════ */}
      {smsPreviewVisit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden">
            <div className="bg-emerald-700 text-white px-4 py-3.5 flex items-center justify-between">
              <h3 className="font-bold text-xs flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5" />
                SMS Dispatched to {smsPreviewVisit.patientPhone}
              </h3>
              <button onClick={() => setSmsPreviewVisit(null)} className="w-6 h-6 rounded hover:bg-white/10 flex items-center justify-center">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5">
              {/* SMS Bubble */}
              <div className="bg-slate-100 rounded-2xl rounded-tl-sm p-4 space-y-2 text-xs text-slate-800 shadow-inner">
                <div className="font-bold text-[#16324F] text-sm">MediFlow Clinic</div>
                <p className="leading-relaxed">
                  Dear <strong>{smsPreviewVisit.patientName}</strong>, your appointment with{' '}
                  <strong>{smsPreviewVisit.doctorName}</strong> is confirmed.
                </p>
                <div className="bg-white rounded-xl p-2.5 border border-slate-200 font-mono text-[11px] space-y-0.5">
                  <div>Token: <strong>#{smsPreviewVisit.tokenNumber}</strong></div>
                  <div>Ref: <strong>{smsPreviewVisit.bookingRef}</strong></div>
                </div>
                <div className="bg-teal-50 rounded-lg p-2 border border-teal-200 text-teal-800 text-[11px]">
                  🔗 Track live queue & show QR on arrival:
                  <div className="font-mono text-[10px] mt-0.5 break-all text-teal-700">
                    https://mediflow.lk/q/{smsPreviewVisit.id}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedVisitIdForMobile(smsPreviewVisit.id);
                  setActiveView('patient-mobile');
                  setSmsPreviewVisit(null);
                }}
                className="w-full mt-4 bg-[#0F766E] hover:bg-[#0c5c56] text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <Smartphone className="w-4 h-4" />
                Open Patient's Phone View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL: QUICK WALK-IN TOKEN (10 SECONDS!) ════ */}
      {isQuickWalkInModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden">
            <div className="bg-[#0F766E] text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Ticket className="w-4 h-4 text-[#CCFBF1]" />
                ⚡ Instant Walk-In Token
              </h3>
              <button
                onClick={() => setIsQuickWalkInModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickWalkInSubmit} className="p-5 space-y-3.5 text-xs">
              <p className="text-slate-500 text-[11px]">
                Quick registration for immediate clinic walk-in. Takes 5 seconds!
              </p>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Patient Name *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Kasun Fernando"
                  value={quickWalkInData.name}
                  onChange={e => setQuickWalkInData({ ...quickWalkInData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-[#16324F] focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Age</label>
                  <input
                    type="number"
                    placeholder="30"
                    value={quickWalkInData.age}
                    onChange={e => setQuickWalkInData({ ...quickWalkInData, age: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0F766E]/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Gender</label>
                  <select
                    value={quickWalkInData.gender}
                    onChange={e => setQuickWalkInData({ ...quickWalkInData, gender: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0F766E]/20 outline-none"
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  placeholder="077 123 4567"
                  value={quickWalkInData.phone}
                  onChange={e => setQuickWalkInData({ ...quickWalkInData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0F766E]/20 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickWalkInModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0F766E] hover:bg-[#0c5c56] text-white rounded-xl text-xs font-bold shadow-md transition active:scale-95 flex items-center gap-1.5"
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span>Issue Token Now →</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(168px); }
        }
      `}</style>
    </div>
  );
};
