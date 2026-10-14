'use client';

import React from 'react';
import { Visit, QueueStatus } from '@/types/mediflow';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  Activity,
  Stethoscope
} from 'lucide-react';

interface StatusChipProps {
  status: QueueStatus;
  size?: 'sm' | 'md';
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, size = 'sm' }) => {
  const sz = size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[10px]';

  const configs: Record<QueueStatus, { label: string; color: string; icon: React.ReactNode; dot?: string }> = {
    NOT_CHECKED_IN: {
      label: 'SMS Sent — Awaiting Arrival',
      color: 'bg-amber-50 text-amber-800 border border-amber-200',
      icon: <Clock className="w-3 h-3 text-amber-600" />
    },
    WAITING: {
      label: 'Checked In — Waiting',
      color: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
      icon: <CheckCircle2 className="w-3 h-3 text-emerald-600" />
    },
    CALLED: {
      label: 'Called — Proceeding to Room',
      color: 'bg-indigo-50 text-indigo-800 border border-indigo-200',
      icon: <Activity className="w-3 h-3 text-indigo-600" />,
      dot: 'bg-indigo-500'
    },
    IN_CONSULTATION: {
      label: 'In Consultation',
      color: 'bg-teal-50 text-teal-800 border border-teal-200',
      icon: <Stethoscope className="w-3 h-3 text-teal-600" />,
      dot: 'bg-teal-500'
    },
    COMPLETED: {
      label: 'Visit Completed',
      color: 'bg-slate-100 text-slate-600 border border-slate-200',
      icon: <CheckCircle2 className="w-3 h-3 text-slate-500" />
    },
    MISSED: {
      label: 'Missed — Turn Lapsed',
      color: 'bg-red-50 text-red-700 border border-red-200',
      icon: <XCircle className="w-3 h-3 text-red-600" />
    }
  };

  const { label, color, icon, dot } = configs[status];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${sz} ${color}`}>
      {dot ? <span className={`w-1.5 h-1.5 rounded-full ${dot} animate-pulse`} /> : icon}
      {label}
    </span>
  );
};

interface AllergyBannerProps {
  allergies: string[];
  conditions: string[];
  className?: string;
}

export const AllergyBanner: React.FC<AllergyBannerProps> = ({ allergies, conditions, className = '' }) => {
  if (allergies.length === 0 && conditions.length === 0) return null;

  return (
    <div className={`rounded-xl border-l-4 border-red-500 bg-red-50 p-3.5 flex flex-col sm:flex-row sm:items-start gap-3 ${className}`}>
      <div className="flex items-center gap-2 shrink-0">
        <AlertTriangle className="w-5 h-5 text-red-600" />
        <span className="text-xs font-bold text-red-800 uppercase tracking-wide">Clinical Alerts</span>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {allergies.map(a => (
          <span key={a} className="bg-red-600 text-white font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm">
            <AlertTriangle className="w-3 h-3" />
            ALLERGY: {a}
          </span>
        ))}
        {conditions.map(c => (
          <span key={c} className="bg-amber-500 text-white font-semibold px-2.5 py-1 rounded-lg">
            {c}
          </span>
        ))}
      </div>
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  accent?: 'teal' | 'emerald' | 'amber' | 'red' | 'blue' | 'slate';
  icon: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, subLabel, accent = 'teal', icon }) => {
  const accentMap = {
    teal: 'bg-teal-50 border-teal-200 text-teal-800',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    slate: 'bg-slate-50 border-slate-200 text-slate-700'
  };
  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3.5 ${accentMap[accent]}`}>
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div>
        <div className="text-2xl font-black font-mono leading-none">{value}</div>
        <div className="text-xs font-semibold mt-1 leading-tight">{label}</div>
        {subLabel && <div className="text-[11px] opacity-75 mt-0.5">{subLabel}</div>}
      </div>
    </div>
  );
};

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title, subtitle, action }) => (
  <div className="flex items-start justify-between gap-3">
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-[#CCFBF1] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h2 className="text-sm font-bold text-[#16324F] leading-tight">{title}</h2>
        {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
      {icon}
    </div>
    <h3 className="text-sm font-semibold text-slate-700 mb-1">{title}</h3>
    <p className="text-xs text-slate-400 max-w-xs leading-relaxed">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);
