'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useClinic } from '@/contexts/ClinicContext';
import { ApiClient } from '@/lib/api';
import { useQueueEcho } from '@/hooks/useQueueEcho';
import {
  Pill,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Printer,
  Search,
  RefreshCw,
  ShieldAlert,
  Boxes,
  Calendar,
  AlertCircle,
  CalendarCheck,
  Building2,
  UserCheck,
  Check,
  X,
  FileText,
  BadgeAlert,
  Sparkles,
  LogOut
} from 'lucide-react';

interface MedicineBatchInfo {
  id: number;
  batch_number: string;
  expiry_date: string;
  quantity_available: number;
  selling_unit_price: string | number;
}

interface MedicineInfo {
  id: number;
  name: string;
  generic_name: string;
  dosage_form: string;
  strength: string;
  unit: string;
  total_stock: number;
  reorder_level: number;
  usable_batches?: MedicineBatchInfo[];
}

interface PrescriptionItemData {
  id: number;
  medicine_id?: number;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity_prescribed: number;
  quantity_dispensed: number;
  unit_price: number | string;
  total_price: number | string;
  dispensed_batch?: MedicineBatchInfo;
  medicine?: MedicineInfo;
}

interface PrescriptionRecord {
  id: number;
  visit_id: number;
  patient_id: number;
  doctor_id: number;
  dispense_status: 'PENDING' | 'PARTIALLY_DISPENSED' | 'DISPENSED' | 'EXTERNAL';
  created_at: string;
  items: PrescriptionItemData[];
  visit?: {
    id: number;
    token_number: number;
    patient?: {
      id: number;
      full_name: string;
      phone: string;
      age: number;
      gender: string;
      allergies?: string | string[];
    };
  };
  doctor?: {
    id: number;
    user?: {
      name: string;
    };
  };
}

interface InventoryAlerts {
  nearing_expiry_batches: Array<{
    id: number;
    batch_number: string;
    expiry_date: string;
    quantity_available: number;
    medicine?: MedicineInfo;
  }>;
  low_stock_medicines: Array<MedicineInfo>;
}

function getAllergiesList(allergies: any): string[] {
  if (!allergies) return [];
  if (Array.isArray(allergies)) return allergies.filter(Boolean);
  if (typeof allergies === 'string') {
    try {
      const parsed = JSON.parse(allergies);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {}
    return allergies.split(',').map((s: string) => s.trim()).filter(Boolean);
  }
  return [];
}

export default function PharmacyPage() {
  const { tenantId, settings, setTenantId } = useClinic();
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlerts | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<PrescriptionRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDispensing, setIsDispensing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAlertModal, setShowAlertModal] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<{ name?: string; email?: string } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('mediflow_user');
        if (stored) {
          setCurrentUser(JSON.parse(stored));
        }
      } catch {}
    }
  }, []);

  // Load Pending Prescriptions & Alerts
  const fetchPharmacyData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [pendingRes, alertsRes] = await Promise.all([
        ApiClient.get<{ success: boolean; data: PrescriptionRecord[] }>('/pharmacy/pending'),
        ApiClient.get<{ success: boolean; data: InventoryAlerts }>('/pharmacy/alerts?days=90'),
      ]);

      if (pendingRes?.success && Array.isArray(pendingRes.data)) {
        setPrescriptions(pendingRes.data);
        if (pendingRes.data.length > 0 && !selectedPrescription) {
          setSelectedPrescription(pendingRes.data[0]);
        }
      }

      if (alertsRes?.success && alertsRes.data) {
        setAlerts(alertsRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load pharmacy data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPrescription]);

  useEffect(() => {
    fetchPharmacyData();
  }, [fetchPharmacyData, tenantId]);

  // WebSocket Live Sync for Queue & Prescriptions
  useQueueEcho({
    tenantId,
    onQueueUpdated: () => {
      fetchPharmacyData();
    },
    onPatientCalled: () => {},
  });

  // Filtered Queue
  const filteredPrescriptions = useMemo(() => {
    if (!searchQuery.trim()) return prescriptions;
    const q = searchQuery.toLowerCase();
    return prescriptions.filter((p) => {
      const token = p.visit?.token_number?.toString() || '';
      const patientName = p.visit?.patient?.full_name?.toLowerCase() || '';
      const phone = p.visit?.patient?.phone || '';
      const drugNames = p.items.map((i) => i.medicine_name.toLowerCase()).join(' ');
      return token.includes(q) || patientName.includes(q) || phone.includes(q) || drugNames.includes(q);
    });
  }, [prescriptions, searchQuery]);

  // Dispense Prescription with FIFO Stock Deduction
  const handleDispense = async (prescriptionId: number) => {
    try {
      setIsDispensing(true);
      const res = await ApiClient.post<{ success: boolean; message: string; data: PrescriptionRecord }>(
        `/pharmacy/dispense/${prescriptionId}`
      );

      if (res?.success) {
        setNotification({
          type: 'success',
          message: `Prescription #${prescriptionId} dispensed with FIFO earliest-expiry deduction!`,
        });

        // Trigger thermal bag slip print
        setTimeout(() => {
          window.print();
        }, 300);

        await fetchPharmacyData();
        setSelectedPrescription(null);
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Dispensing failed. Please check batch stocks.',
      });
    } finally {
      setIsDispensing(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  // Mark Prescription as External (Patient buying medicine outside)
  const [isMarkingExternal, setIsMarkingExternal] = useState<boolean>(false);

  const handleMarkExternal = async (prescriptionId: number) => {
    if (!confirm('Mark this prescription as External? Patient will buy medicines outside. In-house stock will NOT be deducted, and Cashier will bill Consultation fee only.')) {
      return;
    }
    try {
      setIsMarkingExternal(true);
      const res = await ApiClient.post<{ success: boolean; message: string }>(
        `/pharmacy/external/${prescriptionId}`
      );

      if (res?.success) {
        setNotification({
          type: 'success',
          message: `Prescription #${prescriptionId} marked as External. Stock untouched & Cashier bill updated!`,
        });

        // Trigger thermal external slip print
        setTimeout(() => {
          window.print();
        }, 300);

        await fetchPharmacyData();
        setSelectedPrescription(null);
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to mark prescription as external.',
      });
    } finally {
      setIsMarkingExternal(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const alertCount = (alerts?.nearing_expiry_batches?.length || 0) + (alerts?.low_stock_medicines?.length || 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Printable Thermal Dispense Slip (Only rendered during window.print) */}
      <div className="hidden print:block print:w-[80mm] print:p-2 print:text-black print:font-mono print:text-xs">
        {selectedPrescription && (
          <div className="space-y-2">
            <div className="text-center border-b pb-2">
              <h2 className="font-bold text-sm tracking-wide">{settings.clinic_branding.clinic_name}</h2>
              <p className="text-[10px]">{settings.clinic_branding.address || 'Colombo, Sri Lanka'}</p>
              <p className="text-[10px]">Tel: {settings.clinic_branding.phone || '+94 11 234 5678'}</p>
              <div className="mt-1 font-bold border border-black inline-block px-2 py-0.5 text-sm">
                TOKEN #{selectedPrescription.visit?.token_number}
              </div>
              {selectedPrescription.dispense_status === 'EXTERNAL' && (
                <div className="text-[10px] font-bold text-black border border-black mt-1 px-1 py-0.5">
                  EXTERNAL PRESCRIPTION (BUY OUTSIDE)
                </div>
              )}
            </div>

            <div className="border-b pb-1 text-[11px]">
              <div><strong>Patient:</strong> {selectedPrescription.visit?.patient?.full_name}</div>
              <div><strong>Age/Gender:</strong> {selectedPrescription.visit?.patient?.age}Y / {selectedPrescription.visit?.patient?.gender}</div>
              <div><strong>Doctor:</strong> Dr. {selectedPrescription.doctor?.user?.name || 'Consultant'}</div>
              <div><strong>Date:</strong> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>

            <div className="border-b pb-2">
              <div className="font-bold uppercase mb-1">
                {selectedPrescription.dispense_status === 'EXTERNAL' ? 'Prescribed Medicines (External Slip):' : 'Prescription Items (FIFO Dispensed):'}
              </div>
              {selectedPrescription.items.map((item, idx) => (
                <div key={idx} className="mb-1.5 pb-1 border-b border-dotted">
                  <div className="font-bold text-[11px]">{idx + 1}. {item.medicine_name}</div>
                  <div className="text-[10px]">{item.dosage} • {item.frequency} • {item.duration}</div>
                  <div className="text-[10px] text-slate-600">Qty: {item.quantity_prescribed} | {item.instructions || 'Take as instructed'}</div>
                </div>
              ))}
            </div>

            <div className="text-[10px] space-y-1 text-center pt-1">
              <p>*** Please keep medicines out of reach of children ***</p>
              <p>Store in a cool, dry place below 25°C</p>
              <p className="text-[9px] pt-1">MediFlow Pharmacist Verification: Verified & Dispensed</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Pharmacy Application Header */}
      <header className="bg-teal-800 text-white shadow-md print:hidden sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center font-bold text-white shadow-inner">
                <Pill className="w-5 h-5 text-teal-200" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight flex items-center gap-2">
                  In-house Pharmacy Dispensary
                  <span className="text-[10px] bg-teal-600/80 uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full border border-teal-500">
                    FIFO Earliest-Expiry
                  </span>
                </h1>
                <p className="text-xs text-teal-200">{settings.clinic_branding.clinic_name}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Active Clinic Identity Badge */}
            <div className="flex items-center bg-teal-900/60 rounded-lg px-3 py-1.5 border border-teal-700">
              <Building2 className="w-3.5 h-3.5 text-teal-300 mr-2" />
              <span className="text-xs font-bold text-white tracking-wide">
                {settings.clinic_branding?.clinic_name || 'Dispensary & Pharmacy'}
              </span>
            </div>

            {/* Logged-in Pharmacist Identity Badge */}
            <div className="hidden sm:flex items-center bg-teal-900/60 rounded-lg px-3 py-1.5 border border-teal-700">
              <UserCheck className="w-3.5 h-3.5 text-teal-300 mr-2" />
              <div className="text-left">
                <span className="text-[10px] text-teal-300 block leading-none font-semibold">Pharmacist</span>
                <span className="text-xs font-bold text-white tracking-wide">
                  {currentUser?.name || 'Nadeesha Fernando'}
                </span>
              </div>
            </div>

            {/* Inventory Alerts Pill */}
            <button
              onClick={() => setShowAlertModal(true)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                alertCount > 0
                  ? 'bg-amber-500/20 text-amber-200 border-amber-400 hover:bg-amber-500/30 animate-pulse'
                  : 'bg-teal-700 text-teal-200 border-teal-600 hover:bg-teal-600'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Stock Alerts ({alertCount})</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={fetchPharmacyData}
              disabled={isLoading}
              className="p-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-teal-100 transition"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* Logout Button */}
            <button
              onClick={() => {
                ApiClient.clearSession();
                window.location.href = '/login';
              }}
              className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 hover:text-white transition flex items-center gap-1 text-xs font-bold"
              title="Log Out of Pharmacy Dispensary"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* External Pharmacy Notification Banner if Disabled */}
      {!settings.pharmacy_enabled && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 print:hidden">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-800 text-sm">
              <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span>
                <strong>External Pharmacy Mode Active:</strong> This clinic ({settings.clinic_branding.clinic_name}) operates
                with external dispensing. Prescriptions will be marked as <code>EXTERNAL</code> and stock will not be deducted.
              </span>
            </div>
            <span className="text-xs font-mono font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
              pharmacy_enabled = false
            </span>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 print:hidden transition transform duration-300">
          <div
            className={`flex items-center space-x-2 px-4 py-3 rounded-lg shadow-xl text-sm font-medium ${
              notification.type === 'success'
                ? 'bg-emerald-600 text-white'
                : notification.type === 'error'
                ? 'bg-rose-600 text-white'
                : 'bg-teal-700 text-white'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-80">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Workspace Split Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex-1 flex flex-col lg:flex-row gap-6 print:hidden">
        {/* Left Column: Pending Prescriptions Queue */}
        <div className="w-full lg:w-5/12 flex flex-col space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-teal-700" />
                Prescription Dispense Queue
              </h2>
              <span className="bg-teal-50 text-teal-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-teal-200">
                {prescriptions.length} Pending
              </span>
            </div>

            {/* Queue Search Filter */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search token #, patient name, drug..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            {/* Prescriptions Queue List */}
            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {filteredPrescriptions.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <Pill className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>No pending prescriptions awaiting dispensary.</p>
                </div>
              ) : (
                filteredPrescriptions.map((rx) => {
                  const isSelected = selectedPrescription?.id === rx.id;
                  const patient = rx.visit?.patient;
                  const allergyList = getAllergiesList(patient?.allergies);
                  const hasAllergies = allergyList.length > 0;

                  return (
                    <button
                      key={rx.id}
                      onClick={() => setSelectedPrescription(rx)}
                      className={`w-full text-left p-3 rounded-lg border transition ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50/70 shadow-sm ring-1 ring-teal-600'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="w-7 h-7 rounded-md bg-teal-800 text-white font-bold text-xs flex items-center justify-center">
                            #{rx.visit?.token_number || '—'}
                          </span>
                          <div>
                            <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                              {patient?.full_name || 'Patient'}
                              {hasAllergies && (
                                <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-1.5 py-0.2 rounded border border-rose-300 flex items-center gap-0.5">
                                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                                  <span>Allergy: {allergyList.join(', ')}</span>
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {patient?.age || '—'}Y • {patient?.gender || '—'} • {patient?.phone}
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(rx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                        <span>
                          <strong>{rx.items.length}</strong> items prescribed
                        </span>
                        <span className="text-teal-700 font-medium">Dr. {rx.doctor?.user?.name || 'Doctor'}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Prescription Details & FIFO Batch Verification */}
        <div className="w-full lg:w-7/12 flex flex-col space-y-4">
          {selectedPrescription ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col space-y-5">
              {/* Patient Banner */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-teal-800 text-white font-black text-xl flex items-center justify-center shadow">
                    #{selectedPrescription.visit?.token_number}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {selectedPrescription.visit?.patient?.full_name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Age: {selectedPrescription.visit?.patient?.age} • Gender: {selectedPrescription.visit?.patient?.gender} • Phone: {selectedPrescription.visit?.patient?.phone}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs bg-teal-100 text-teal-800 font-bold px-2.5 py-1 rounded-md border border-teal-200">
                    Rx #{selectedPrescription.id}
                  </span>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Dr. {selectedPrescription.doctor?.user?.name || 'Physician'}
                  </div>
                </div>
              </div>

              {/* Allergy Warning Alert if Present */}
              {(() => {
                const allergies = getAllergiesList(selectedPrescription.visit?.patient?.allergies);
                if (allergies.length === 0) return null;
                return (
                  <div className="bg-rose-50 border border-rose-300 rounded-lg p-3 flex items-start space-x-2.5">
                    <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-rose-800">DOCUMENTED DRUG ALLERGIES:</h4>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {allergies.map((a, idx) => (
                          <span key={idx} className="bg-rose-100 text-rose-800 font-bold text-xs px-2 py-0.5 rounded border border-rose-300">
                            ⚠️ {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Medicine Items & FIFO Batch Allocation List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-teal-700" />
                    FIFO Earliest-Expiry Batch Allocation
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    {selectedPrescription.items.length} items to dispense
                  </span>
                </div>

                <div className="border border-slate-200 rounded-lg divide-y divide-slate-200 overflow-hidden">
                  {selectedPrescription.items.map((item, idx) => {
                    const usableBatches = item.medicine?.usable_batches || [];
                    const earliestBatch = usableBatches[0];
                    const isStockLow = (item.medicine?.total_stock ?? 0) < item.quantity_prescribed;

                    return (
                      <div key={item.id} className="p-3 bg-slate-50/50 hover:bg-slate-50 transition">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                              <span>{idx + 1}. {item.medicine_name}</span>
                              {item.medicine?.generic_name && (
                                <span className="text-[10px] text-slate-500 font-normal italic">
                                  ({item.medicine.generic_name})
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-600 mt-0.5">
                              <strong>Dosage:</strong> {item.dosage} • <strong>Frequency:</strong> {item.frequency} • <strong>Duration:</strong> {item.duration}
                            </div>
                            {item.instructions && (
                              <div className="text-[11px] text-teal-800 bg-teal-50/80 px-2 py-0.5 rounded mt-1 inline-block border border-teal-100">
                                <strong>Instructions:</strong> {item.instructions}
                              </div>
                            )}
                          </div>

                          <div className="text-right">
                            <span className="font-mono font-bold text-xs text-teal-900 bg-teal-100 px-2.5 py-1 rounded border border-teal-200">
                              Qty: {item.quantity_prescribed}
                            </span>
                          </div>
                        </div>

                        {/* FIFO Batch Allocation Card */}
                        <div className="mt-2.5 bg-white p-2.5 rounded border border-slate-200 text-[11px]">
                          <div className="flex items-center justify-between text-slate-500 text-[10px] font-semibold uppercase tracking-wider mb-1">
                            <span>Allocated Batch (EEFO)</span>
                            <span>Batch Expiry</span>
                            <span>Available Stock</span>
                            <span>Unit Price</span>
                          </div>

                          {earliestBatch ? (
                            <div className="flex items-center justify-between font-mono text-xs">
                              <span className="font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                                {earliestBatch.batch_number}
                              </span>
                              <span className="text-slate-700 font-medium">
                                {earliestBatch.expiry_date}
                              </span>
                              <span className={`font-semibold ${isStockLow ? 'text-rose-600' : 'text-emerald-700'}`}>
                                {earliestBatch.quantity_available} units
                              </span>
                              <span className="text-slate-900 font-bold">
                                LKR {Number(earliestBatch.selling_unit_price).toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between text-amber-700 text-xs">
                              <span>Standard Catalog Batch</span>
                              <span className="italic">Earliest available</span>
                              <span className="font-semibold text-slate-600">Stock ok</span>
                              <span className="font-bold">LKR 10.00</span>
                            </div>
                          )}

                          {/* Multiple Batches Split Alert */}
                          {earliestBatch && earliestBatch.quantity_available < item.quantity_prescribed && (
                            <div className="mt-1.5 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>
                                Split deduction required: Batch {earliestBatch.batch_number} has {earliestBatch.quantity_available} units. Balance {item.quantity_prescribed - earliestBatch.quantity_available} units will deduct from next earliest batch.
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons: Dispense & Print Thermal Slip & Mark External */}
              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Slip (80mm)</span>
                  </button>

                  <button
                    onClick={() => handleMarkExternal(selectedPrescription.id)}
                    disabled={isMarkingExternal || isDispensing}
                    className="px-3.5 py-2 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition disabled:opacity-50"
                    title="Patient prefers to buy medicine from an outside pharmacy. Stock will not be deducted."
                  >
                    <FileText className="w-4 h-4 text-amber-700" />
                    <span>{isMarkingExternal ? 'Updating...' : 'Patient Buying Outside (External Rx)'}</span>
                  </button>
                </div>

                <button
                  onClick={() => handleDispense(selectedPrescription.id)}
                  disabled={isDispensing || isMarkingExternal}
                  className="px-5 py-2.5 bg-teal-800 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg flex items-center space-x-2 transition disabled:opacity-50"
                >
                  {isDispensing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-teal-300" />
                  )}
                  <span>
                    {settings.pharmacy_enabled ? 'Dispense & Deduct FIFO Stock' : 'Mark External Prescription Complete'}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-400">
              <Pill className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <h3 className="text-sm font-bold text-slate-600">No Prescription Selected</h3>
              <p className="text-xs mt-1">Select a patient from the queue to verify batch stocks and dispense.</p>
            </div>
          )}
        </div>
      </div>

      {/* Stock Alerts Modal (Expiring Batches & Low Stock) */}
      {showAlertModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 bg-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-sm">Pharmacy Stock & Expiry Alerts (90-Day Horizon)</h3>
              </div>
              <button
                onClick={() => setShowAlertModal(false)}
                className="text-teal-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {/* Earliest Expiry Batches */}
              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  Batches Nearing Expiry ({alerts?.nearing_expiry_batches?.length || 0})
                </h4>
                {alerts?.nearing_expiry_batches && alerts.nearing_expiry_batches.length > 0 ? (
                  <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                    {alerts.nearing_expiry_batches.map((b) => (
                      <div key={b.id} className="p-2.5 flex items-center justify-between bg-amber-50/40">
                        <div>
                          <span className="font-bold text-slate-900">{b.medicine?.name || 'Medicine'}</span>
                          <div className="text-[11px] text-slate-500 font-mono">
                            Batch: <span className="font-bold text-teal-800">{b.batch_number}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-rose-700 font-bold font-mono">Expires: {b.expiry_date}</span>
                          <div className="text-[11px] text-slate-600 font-semibold">{b.quantity_available} units remaining</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No batches expiring within the 90-day threshold.</p>
                )}
              </div>

              {/* Low Stock Medicines */}
              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <BadgeAlert className="w-4 h-4 text-rose-600" />
                  Low Stock Medicines ({alerts?.low_stock_medicines?.length || 0})
                </h4>
                {alerts?.low_stock_medicines && alerts.low_stock_medicines.length > 0 ? (
                  <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                    {alerts.low_stock_medicines.map((m) => (
                      <div key={m.id} className="p-2.5 flex items-center justify-between bg-rose-50/40">
                        <div>
                          <span className="font-bold text-slate-900">{m.name}</span>
                          <div className="text-[11px] text-slate-500">
                            Reorder Level: {m.reorder_level} {m.unit}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold font-mono text-rose-700">{m.total_stock} {m.unit} left</span>
                          <div className="text-[10px] text-rose-600 font-medium">Reorder required</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">All active medicines maintain healthy buffer stock.</p>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowAlertModal(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs"
              >
                Close Alerts
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
