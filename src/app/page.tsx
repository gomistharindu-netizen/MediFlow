'use client';

import React from 'react';
import { useMediFlow } from '@/context/MediFlowContext';
import { Header } from '@/components/Header';
import { ReceptionView } from '@/components/reception/ReceptionView';
import { DoctorView } from '@/components/doctor/DoctorView';
import { PharmacyView } from '@/components/pharmacy/PharmacyView';
import { BillingView } from '@/components/cashier/BillingView';
import { WaitingDisplayView } from '@/components/display/WaitingDisplayView';
import { PatientMobileView } from '@/components/patient/PatientMobileView';
import { AdminSettingsView } from '@/components/admin/AdminSettingsView';

export default function Home() {
  const { activeView } = useMediFlow();

  const renderActiveView = () => {
    switch (activeView) {
      case 'reception':
        return <ReceptionView />;
      case 'doctor':
        return <DoctorView />;
      case 'pharmacy':
        return <PharmacyView />;
      case 'cashier':
        return <BillingView />;
      case 'display':
        return <WaitingDisplayView />;
      case 'patient-mobile':
        return <PatientMobileView />;
      case 'admin':
        return <AdminSettingsView />;
      default:
        return <ReceptionView />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Header />
      <main className="flex-1 w-full px-3 sm:px-5 lg:px-7 py-4">
        {renderActiveView()}
      </main>
      <footer className="bg-white border-t border-slate-200/70 py-3 text-center text-xs text-slate-500">
        <div className="w-full px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>MediFlow</strong> — Clinic & Patient Management System
          </span>
          <span>
            Crafted by <strong>TM Digital Solution</strong> (<a href="https://tmgomis.online" target="_blank" rel="noreferrer" className="text-[#0F766E] hover:underline font-medium">tmgomis.online</a>)
          </span>
        </div>
      </footer>
    </div>
  );
}
