'use client';

import React from 'react';
import { useMediFlow } from '@/context/MediFlowContext';
import { useToast } from '@/components/ui/Toast';
import { 
  Users, 
  Stethoscope, 
  Pill, 
  CreditCard, 
  Tv, 
  Smartphone, 
  Settings, 
  RotateCcw,
  Activity,
  Sparkles,
  Clock
} from 'lucide-react';

export const Header: React.FC = () => {
  const { 
    settings, 
    visits, 
    activeView, 
    setActiveView, 
    resetDemoData 
  } = useMediFlow();

  const { showToast } = useToast();

  const waitingCount = visits.filter(v => v.status === 'WAITING').length;
  const inConsultCount = visits.filter(v => v.status === 'IN_CONSULTATION').length;
  const pendingRxCount = visits.filter(v => v.prescription && !v.prescription.isDispensed).length;
  const pendingBillingCount = visits.filter(
    v => (v.billing.consultationFee > 0 && !v.billing.consultationPaid) ||
         (v.billing.pharmacyFee > 0 && !v.billing.pharmacyPaid)
  ).length;

  const navItems = [
    {
      id: 'reception',
      label: 'Reception & Bookings',
      icon: Users,
      badge: waitingCount > 0 ? `${waitingCount} Waiting` : undefined,
      badgeColor: 'bg-emerald-100 text-emerald-800'
    },
    {
      id: 'doctor',
      label: 'Doctor Consultation',
      icon: Stethoscope,
      badge: inConsultCount > 0 ? 'Active' : undefined,
      badgeColor: 'bg-teal-100 text-teal-800'
    },
    {
      id: 'pharmacy',
      label: 'Pharmacy Station',
      icon: Pill,
      badge: pendingRxCount > 0 ? `${pendingRxCount} Rx` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    {
      id: 'cashier',
      label: 'Cashier & Billing',
      icon: CreditCard,
      badge: pendingBillingCount > 0 ? `${pendingBillingCount} Due` : undefined,
      badgeColor: 'bg-blue-100 text-blue-800'
    },
    {
      id: 'display',
      label: 'Waiting Room TV',
      icon: Tv,
      badge: 'Live',
      badgeColor: 'bg-purple-100 text-purple-800'
    },
    {
      id: 'patient-mobile',
      label: 'Patient Mobile View',
      icon: Smartphone,
      badge: 'SMS Link',
      badgeColor: 'bg-sky-100 text-sky-800'
    },
    {
      id: 'admin',
      label: 'Clinic Settings',
      icon: Settings,
      badge: undefined
    }
  ];

  return (
    <header className="bg-[#16324F] text-white shadow-md sticky top-0 z-50">
      {/* Brand & Clinic Status Strip */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 border-b border-slate-700/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F766E] flex items-center justify-center shadow-inner">
              <Activity className="w-6 h-6 text-[#CCFBF1]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-white">MediFlow</span>
                <span className="text-[10px] font-semibold bg-[#0F766E] text-[#CCFBF1] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Clinic System
                </span>
              </div>
              <p className="text-xs text-slate-300">by TM Digital Solution</p>
            </div>
          </div>

          {/* Active Clinic Session Status */}
          <div className="hidden md:flex items-center space-x-4 bg-slate-800/80 px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs">
            <div className="flex items-center space-x-2 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-teal-400" />
              <span>{settings.currentSession}</span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-emerald-300 font-medium">Dr. K. Perera (Room 01)</span>
            </div>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              Billing: <strong className="text-white">{settings.consultationFeeMode === 'BEFORE' ? 'Pre-Pay' : 'Post-Consultation'}</strong>
            </span>
          </div>

          {/* Reset Demo Button */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                resetDemoData();
                showToast('info', 'Demo data reset', 'All clinic records restored to default sample state.');
              }}
              className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 px-3 py-1.5 rounded-md border border-slate-700 transition"
              title="Reset sample patients, queue, and inventory"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Demo</span>
            </button>
          </div>
        </div>

        {/* Role Navigation Bar */}
        <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-none">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-[#0F766E] text-white shadow-sm ring-1 ring-[#CCFBF1]/30 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#CCFBF1]' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      isActive ? 'bg-[#CCFBF1] text-[#0F766E]' : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
