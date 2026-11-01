'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useClinic } from '@/contexts/ClinicContext';
import { ApiClient } from '@/lib/api';
import {
  Stethoscope,
  Users,
  Pill,
  Receipt,
  ShieldCheck,
  Building2,
  Lock,
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  KeyRound,
} from 'lucide-react';

const CLINIC_PRESETS = [
  { id: 'nawaloka', name: 'Nawaloka Outpatient Care', tagline: 'Leading Healthcare Excellence & Diagnostics' },
  { id: 'asiri', name: 'Asiri Health Outpatient', tagline: 'Caring for Your Health, Everyday' },
  { id: 'arogya', name: 'Arogya Medical Centre', tagline: 'Compassionate & Modern Outpatient Care' },
  { id: 'suwapiyasa', name: 'Suwa Piyasa Family Clinic', tagline: 'Quality Primary Healthcare for the Whole Family' },
];

export default function LoginPage() {
  const router = useRouter();
  const { tenantId, settings, setTenantId } = useClinic();

  const [email, setEmail] = useState<string>('doctor@clinic.com');
  const [password, setPassword] = useState<string>('password123');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Safely resolve clinic tenant from URL parameters or subdomain
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const clinicParam = urlParams.get('clinic') || urlParams.get('tenant');
      const hostname = window.location.hostname.toLowerCase();
      const parts = hostname.split('.');
      const isKnownSubdomain = CLINIC_PRESETS.some(c => c.id === parts[0]);

      if (clinicParam && CLINIC_PRESETS.some(c => c.id === clinicParam.toLowerCase())) {
        setTenantId(clinicParam.toLowerCase());
      } else if (isKnownSubdomain) {
        setTenantId(parts[0]);
      } else {
        const stored = localStorage.getItem('mediflow_tenant_id');
        if (stored && CLINIC_PRESETS.some(c => c.id === stored)) {
          setTenantId(stored);
        } else {
          setTenantId('nawaloka');
        }
      }
    }
  }, [setTenantId]);

  const activeClinic = CLINIC_PRESETS.find(c => c.id === tenantId) || CLINIC_PRESETS[0];

  // Core Login Execution Routine (Authenticates against selected Clinic Tenant)
  const executeLogin = async (targetEmail: string, targetPass: string) => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await ApiClient.post<{
        success: boolean;
        token: string;
        user: {
          id: number;
          name: string;
          email: string;
          roles: string[];
          doctor_profile?: any;
        };
        tenant: string;
      }>('/auth/login', {
        email: targetEmail,
        password: targetPass,
      });

      if (response?.success && response.token) {
        const primaryRole = (response.user.roles && response.user.roles.length > 0) ? response.user.roles[0] : 'Staff';
        const activeTenant = response.tenant || tenantId;
        ApiClient.setToken(response.token, activeTenant, primaryRole);
        if (typeof window !== 'undefined') {
          localStorage.setItem('mediflow_user', JSON.stringify(response.user));
        }

        setSuccessMsg(`Welcome, ${response.user.name}! Redirecting to workstation...`);

        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const redirectParam = urlParams ? urlParams.get('redirect') : null;

        setTimeout(() => {
          const roles = response.user.roles || [];
          if (roles.includes('Doctor')) {
            window.location.href = '/doctor';
          } else if (roles.includes('Receptionist')) {
            window.location.href = '/reception';
          } else if (roles.includes('Cashier')) {
            window.location.href = '/cashier';
          } else if (roles.includes('Pharmacist')) {
            window.location.href = '/pharmacy';
          } else if (roles.includes('ClinicAdmin') || roles.includes('Admin')) {
            const safeRedirect = (redirectParam && !redirectParam.startsWith('/admin') && redirectParam !== '/login') 
              ? redirectParam 
              : (window.location.hostname.includes('.') ? '/' : `/?clinic=${activeTenant}`);
            window.location.href = safeRedirect;
          } else {
            window.location.href = '/';
          }
        }, 350);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid credentials or tenant mismatch.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick 1-Click Login Helper for demo/testing
  const handleQuickLogin = (quickEmail: string, quickPass: string = 'password123') => {
    setEmail(quickEmail);
    setPassword(quickPass);
    executeLogin(quickEmail, quickPass);
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await executeLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-teal-500 selection:text-white">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-teal-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Header Branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-600 text-white shadow-xl shadow-teal-900/50 mb-3 border border-teal-400/30">
          <ShieldCheck className="w-8 h-8 text-teal-100" />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-white">
          {activeClinic.name}
        </h2>
        <p className="text-xs text-teal-300 mt-1">
          {activeClinic.tagline}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/90 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl border border-slate-800 sm:px-10">
          
          {/* Clinic Station Badge */}
          <div className="mb-6 p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold flex-shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-white tracking-wide truncate">
                {activeClinic.name}
              </h3>
              <p className="text-[11px] text-teal-300 truncate">
                Clinical Workstation Authentication
              </p>
            </div>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form className="space-y-4" onSubmit={handleLogin}>
            {/* Hospital / Clinic Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Selected Hospital / Clinic
              </label>
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-teal-300 font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {CLINIC_PRESETS.map((c) => (
                  <option key={c.id} value={c.id}>
                    🏥 {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@clinic.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg text-sm shadow-lg shadow-teal-900/40 flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4 text-teal-200" />
              )}
              <span>Sign In to Clinic Workstation</span>
            </button>
          </form>

          {/* Quick Staff 1-Click Role Switcher */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-2.5 text-center">
              1-Click Demo Staff Logins (Clinic Accounts)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('doctor@clinic.com')}
                className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-teal-500 text-left transition flex items-center gap-2"
              >
                <div className="w-7 h-7 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                  <Stethoscope className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-slate-200">Doctor</div>
                  <div className="text-[10px] text-slate-400">Dr. Sanath</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('reception@clinic.com')}
                className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-teal-500 text-left transition flex items-center gap-2"
              >
                <div className="w-7 h-7 rounded bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-slate-200">Reception</div>
                  <div className="text-[10px] text-slate-400">Check-in desk</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('pharmacy@clinic.com')}
                className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-teal-500 text-left transition flex items-center gap-2"
              >
                <div className="w-7 h-7 rounded bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                  <Pill className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-slate-200">Pharmacist</div>
                  <div className="text-[10px] text-slate-400">Nadeesha</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('cashier@clinic.com')}
                className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-teal-500 text-left transition flex items-center gap-2"
              >
                <div className="w-7 h-7 rounded bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                  <Receipt className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-slate-200">Cashier</div>
                  <div className="text-[10px] text-slate-400">Billing desk</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin@clinic.com')}
                className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-teal-500 text-left transition flex items-center gap-2 sm:col-span-2 md:col-span-1"
              >
                <div className="w-7 h-7 rounded bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-slate-200">Admin</div>
                  <div className="text-[10px] text-slate-400">Clinic settings</div>
                </div>
              </button>
            </div>
          </div>

          {/* Clean Hospital Footer */}
          <div className="mt-6 text-center border-t border-slate-800/80 pt-4 flex items-center justify-between text-xs text-slate-500">
            <span>MediFlow Clinical Suite</span>
            <Link
              href="/admin"
              className="text-[11px] text-slate-600 hover:text-slate-400 transition"
              title="System Administration"
            >
              Control Panel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
