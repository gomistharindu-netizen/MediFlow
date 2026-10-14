'use client';

import React from 'react';
import { useMediFlow } from '@/context/MediFlowContext';
import { FeeMode } from '@/types/mediflow';
import { 
  Settings, 
  BarChart3, 
  Users, 
  CreditCard, 
  Pill, 
  Clock, 
  DollarSign, 
  ShieldCheck, 
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

export const AdminSettingsView: React.FC = () => {
  const { 
    settings, 
    updateSettings, 
    visits, 
    medicines, 
    doctors, 
    resetDemoData 
  } = useMediFlow();

  // Statistics calculation
  const totalVisitsToday = visits.length;
  const completedVisits = visits.filter(v => v.status === 'COMPLETED').length;
  const waitingVisits = visits.filter(v => v.status === 'WAITING' || v.status === 'IN_CONSULTATION').length;
  
  const totalConsultationCollections = visits
    .filter(v => v.billing.consultationPaid)
    .reduce((sum, v) => sum + v.billing.consultationFee, 0);

  const totalPharmacyCollections = visits
    .filter(v => v.billing.pharmacyPaid)
    .reduce((sum, v) => sum + v.billing.pharmacyFee, 0);

  const totalRevenue = totalConsultationCollections + totalPharmacyCollections;

  const lowStockCount = medicines.filter(m => 
    m.batches.reduce((sum, b) => sum + b.stockQuantity, 0) < 100
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#16324F] flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#0F766E]" />
            Clinic Setup & Operations Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure payment rules, pharmacy modes, doctor session capacities, and monitor daily revenue.
          </p>
        </div>

        <button
          onClick={() => {
            if (confirm('Reset all demo data back to default initial state?')) {
              resetDemoData();
            }
          }}
          className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold transition"
        >
          <RotateCcw className="w-4 h-4 text-slate-500" />
          <span>Reset All Demo Data</span>
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Total Patients Today</span>
            <Users className="w-4 h-4 text-[#0F766E]" />
          </div>
          <div className="text-2xl font-bold text-[#16324F] mt-2 font-mono">
            {totalVisitsToday} / 60
          </div>
          <span className="text-[10px] text-teal-700 font-medium">{completedVisits} visits completed</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Avg Wait Time</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-[#16324F] mt-2 font-mono">
            12 mins
          </div>
          <span className="text-[10px] text-emerald-700 font-medium">Within target SLA</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Total Collections</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2 font-mono">
            Rs. {totalRevenue.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400">Consultation + Meds</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Pharmacy Low Stock</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2 font-mono">
            {lowStockCount} items
          </div>
          <span className="text-[10px] text-amber-700 font-medium">Reorder alerts triggered</span>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Setting 1: Clinic Rules & Billing Timing */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 space-y-4">
          <h2 className="text-xs font-bold text-[#16324F] uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <CreditCard className="w-4 h-4 text-[#0F766E]" />
            Consultation Fee Payment Rule (Section 11)
          </h2>

          <div className="space-y-3 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Choose when patients pay their consultation fee. Configurable during clinic onboarding without rewriting historical invoices:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div 
                onClick={() => updateSettings({ consultationFeeMode: 'BEFORE' })}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition ${
                  settings.consultationFeeMode === 'BEFORE'
                    ? 'border-[#0F766E] bg-teal-50/60'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="font-bold text-[#16324F] flex items-center justify-between">
                  <span>Pre-Pay Mode</span>
                  {settings.consultationFeeMode === 'BEFORE' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E]"></span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Collect consultation fee immediately at Reception / Check-in before doctor enters room.
                </p>
              </div>

              <div 
                onClick={() => updateSettings({ consultationFeeMode: 'AFTER' })}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition ${
                  settings.consultationFeeMode === 'AFTER'
                    ? 'border-[#0F766E] bg-teal-50/60'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="font-bold text-[#16324F] flex items-center justify-between">
                  <span>Post-Pay Mode (Default)</span>
                  {settings.consultationFeeMode === 'AFTER' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E]"></span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Collect at Cashier after consultation together with in-house pharmacy medicines.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Setting 2: Optional Pharmacy Module */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 space-y-4">
          <h2 className="text-xs font-bold text-[#16324F] uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <Pill className="w-4 h-4 text-[#0F766E]" />
            Pharmacy Module Setting (Section 10)
          </h2>

          <div className="space-y-3 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Enable full in-house dispensary inventory and batch tracking, or disable to print external prescriptions:
            </p>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <div className="font-bold text-[#16324F]">In-House Pharmacy Operations</div>
                <p className="text-[11px] text-slate-500">
                  {settings.pharmacyEnabled 
                    ? 'Dispensing queue, batch FEFO tracking and medicine invoices active.' 
                    : 'Prescriptions will be marked for external private pharmacies.'}
                </p>
              </div>

              <button
                onClick={() => updateSettings({ pharmacyEnabled: !settings.pharmacyEnabled })}
                className={`px-4 py-2 rounded-lg font-bold text-xs shadow-sm transition ${
                  settings.pharmacyEnabled
                    ? 'bg-[#0F766E] text-white hover:bg-[#0c5c56]'
                    : 'bg-slate-300 text-slate-700 hover:bg-slate-400'
                }`}
              >
                {settings.pharmacyEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>
        </div>

        {/* Doctor Sessions Setup */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 space-y-4">
          <h2 className="text-xs font-bold text-[#16324F] uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <Users className="w-4 h-4 text-[#0F766E]" />
            Doctor Rosters & Session Timetable
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {doctors.map(doc => (
              <div key={doc.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm text-[#16324F]">{doc.name}</h3>
                    <p className="text-[11px] text-teal-800 font-medium">{doc.specialty}</p>
                  </div>
                  <span className="bg-teal-100 text-teal-800 font-mono font-bold px-2 py-0.5 rounded text-[10px]">
                    {doc.room}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200/60 text-slate-600 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span>Consultation Fee:</span>
                    <strong className="font-mono text-slate-800">Rs. {doc.consultationFee}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Session:</span>
                    <span>{doc.sessions[0]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Capacity:</span>
                    <span>25 patients / session</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
