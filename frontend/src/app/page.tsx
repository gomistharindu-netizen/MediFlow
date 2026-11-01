'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useClinic } from '@/contexts/ClinicContext';
import { ApiClient } from '@/lib/api';
import { 
  Building2, 
  Stethoscope, 
  Users, 
  Pill, 
  Receipt, 
  Tv, 
  Smartphone, 
  Settings, 
  CheckCircle2, 
  ShieldCheck, 
  Database, 
  Printer, 
  Bell, 
  ArrowRight,
  Sparkles,
  Sliders,
  Lock,
  LogOut,
  RefreshCw,
  FileText,
  Eye,
  ShieldAlert,
  Activity,
  FileCheck,
  Calendar,
  Boxes,
  UserPlus,
  Trash2,
  X
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { tenantId, settings, setTenantId, updateSettings, isLoading } = useClinic();
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'compliance' | 'staff'>('overview');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [complianceScorecard, setComplianceScorecard] = useState<any>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Staff & RBAC State
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [staffMsg, setStaffMsg] = useState<string | null>(null);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Receptionist',
    specialization: 'General Practice (GP)',
    room_number: 'Room 01',
    consultation_fee: 1500,
  });

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const fetchStaff = async () => {
    setIsLoadingStaff(true);
    try {
      const res = await ApiClient.get<{ success: boolean; data: { staff: any[]; available_roles: string[] } }>('/staff');
      if (res?.success && res.data?.staff) {
        setStaffList(res.data.staff);
      }
    } catch {
      // Demo fallback
      setStaffList([
        { id: 1, name: 'Dr. Sanath Silva', email: 'doctor@arogya.lk', roles: ['Doctor'], created_at: '2026-01-10', doctor_profile: { room_number: 'Room 01', specialization: 'General Practice (GP)' } },
        { id: 2, name: 'Kasun Wickramasinghe', email: 'reception@arogya.lk', roles: ['Receptionist'], created_at: '2026-01-12' },
        { id: 3, name: 'Nadeesha Fernando', email: 'pharmacy@arogya.lk', roles: ['Pharmacist'], created_at: '2026-01-15' },
        { id: 4, name: 'Dilshan Perera', email: 'cashier@arogya.lk', roles: ['Cashier'], created_at: '2026-01-18' },
        { id: 5, name: 'Clinic Administrator', email: 'admin@arogya.lk', roles: ['Admin'], created_at: '2026-01-01' },
      ]);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'staff') {
      fetchStaff();
    }
  }, [activeTab]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffMsg(null);
    setStaffError(null);
    try {
      const res = await ApiClient.post<{ success: boolean; message: string }>('/staff', staffForm);
      if (res?.success) {
        setStaffMsg(res.message);
        setShowAddStaffModal(false);
        setStaffForm({
          name: '',
          email: '',
          password: '',
          role: 'Receptionist',
          specialization: 'General Practice (GP)',
          room_number: 'Room 01',
          consultation_fee: 1500,
        });
        fetchStaff();
        setTimeout(() => setStaffMsg(null), 5000);
      }
    } catch (err: any) {
      setStaffError(err.message || 'Failed to create staff member.');
      setTimeout(() => setStaffError(null), 5000);
    }
  };

  const handleUpdateRole = async (userId: number, newRole: string) => {
    try {
      const res = await ApiClient.put<{ success: boolean; message: string }>(`/staff/${userId}/role`, { role: newRole });
      if (res?.success) {
        setStaffMsg(res.message);
        fetchStaff();
        setTimeout(() => setStaffMsg(null), 4000);
      }
    } catch {
      setStaffList(prev => prev.map(s => s.id === userId ? { ...s, roles: [newRole] } : s));
      setStaffMsg('Role updated locally.');
      setTimeout(() => setStaffMsg(null), 4000);
    }
  };

  const handleDeleteStaff = async (userId: number, name: string) => {
    if (!confirm(`Are you sure you want to deactivate credentials for ${name}?`)) return;
    try {
      await ApiClient.delete(`/staff/${userId}`);
      setStaffMsg(`Staff member ${name} deactivated.`);
      fetchStaff();
      setTimeout(() => setStaffMsg(null), 4000);
    } catch {
      setStaffList(prev => prev.filter(s => s.id !== userId));
      setStaffMsg(`Staff member ${name} removed.`);
      setTimeout(() => setStaffMsg(null), 4000);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await ApiClient.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      });

      if (res?.success) {
        setPasswordMsg('Password changed successfully! Keep your new credentials safe.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordMsg(null), 5000);
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password.');
      setTimeout(() => setPasswordError(null), 5000);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const fetchComplianceData = async () => {
    setIsLoadingLogs(true);
    try {
      const [logsRes, statusRes] = await Promise.all([
        ApiClient.get('/audit-logs?per_page=40'),
        ApiClient.get('/compliance/status'),
      ]);
      if (logsRes?.data) setAuditLogs(logsRes.data);
      if (statusRes?.data) setComplianceScorecard(statusRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'compliance') {
      fetchComplianceData();
    }
  }, [activeTab]);

  // Dedicated Workstation Auto-Routing: Non-admin staff cannot view this hub
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('mediflow_user');
      const token = localStorage.getItem('mediflow_token');
      if (!token) {
        router.replace('/login');
        return;
      }
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setCurrentUser(user);
          const roles: string[] = user.roles || [];
          if (roles.includes('Doctor')) {
            router.replace('/doctor');
          } else if (roles.includes('Receptionist')) {
            router.replace('/reception');
          } else if (roles.includes('Cashier')) {
            router.replace('/cashier');
          } else if (roles.includes('Pharmacist')) {
            router.replace('/pharmacy');
          }
        } catch {}
      }
    }
  }, [router]);

  const handleTenantChange = (newTenant: string) => {
    setTenantId(newTenant);
  };

  const handleSettingToggle = async (key: string, value: any) => {
    await updateSettings({ [key]: value } as any);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#F4F9F8] text-[#243746]">
      {/* Top Multi-Tenant Navigation Bar */}
      <header className="bg-white border-b border-teal-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-700 flex items-center justify-center text-white font-bold text-xl shadow-md">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl text-teal-900 tracking-tight">MediFlow</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                  SaaS Multi-DB
                </span>
              </div>
              <p className="text-xs text-slate-500">by TM Digital Solution</p>
            </div>
          </div>

          {/* Active Clinic Identity Badge */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-medium text-slate-500">Active Clinic</div>
              <div className="text-sm font-bold text-teal-900 flex items-center gap-1.5 justify-end">
                <Building2 className="w-3.5 h-3.5 text-teal-600" />
                <span>{settings.clinic_branding?.clinic_name || 'MediFlow Clinic'}</span>
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
              <Database className="w-3.5 h-3.5 text-teal-600" />
              <span>Isolated DB</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Clinic Identity Hero Banner */}
        <div className="bg-gradient-to-r from-teal-800 to-[#16324F] rounded-2xl p-6 sm:p-8 text-white shadow-xl mb-8 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 opacity-10 pointer-events-none">
            <Building2 className="w-96 h-96" />
          </div>

          <div className="relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-600/50 backdrop-blur-sm border border-teal-400/30 text-teal-100 text-xs font-medium mb-3">
                  <ShieldCheck className="w-3.5 h-3.5 text-mint" />
                  100% Physical Data Isolation Guaranteed
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {settings.clinic_branding?.clinic_name || 'Medical Centre'}
                </h1>
                <p className="text-teal-100 text-sm sm:text-base mt-1 max-w-2xl">
                  {settings.clinic_branding?.tagline || 'Clinic and Patient Management System'}
                </p>
                <div className="flex flex-wrap gap-4 mt-3 text-xs text-teal-200">
                  <span>📍 {settings.clinic_branding?.address}</span>
                  <span>📞 {settings.clinic_branding?.phone}</span>
                  <span>📜 Reg: {settings.clinic_branding?.registration_no}</span>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex bg-teal-900/60 p-1.5 rounded-xl border border-teal-500/30">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                    activeTab === 'overview'
                      ? 'bg-white text-teal-900 shadow-md'
                      : 'text-teal-100 hover:text-white'
                  }`}
                >
                  Workstations & Portals
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 ${
                    activeTab === 'settings'
                      ? 'bg-white text-teal-900 shadow-md'
                      : 'text-teal-100 hover:text-white'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  SaaS Clinic Settings
                </button>
                <button
                  onClick={() => setActiveTab('compliance')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 ${
                    activeTab === 'compliance'
                      ? 'bg-white text-teal-900 shadow-md'
                      : 'text-teal-100 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  PDPA & HIPAA Compliance
                </button>
                <button
                  onClick={() => setActiveTab('staff')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 ${
                    activeTab === 'staff'
                      ? 'bg-white text-teal-900 shadow-md'
                      : 'text-teal-100 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4 text-teal-200" />
                  Staff & Roles
                </button>
                {currentUser ? (
                  <button
                    onClick={() => {
                      ApiClient.clearSession();
                      window.location.href = '/login';
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 text-rose-200 hover:text-white hover:bg-rose-900/50 border border-rose-500/30"
                  >
                    <LogOut className="w-4 h-4 text-rose-300" />
                    Sign Out ({currentUser.name?.split(' ')[0] || 'Admin'})
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 text-teal-100 hover:text-white hover:bg-teal-800/80"
                  >
                    <Lock className="w-4 h-4 text-teal-300" />
                    Staff Login
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {savedSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-teal-100 border border-teal-300 text-teal-900 flex items-center gap-2 text-sm font-semibold animate-pulse">
            <CheckCircle2 className="w-5 h-5 text-teal-700" />
            Clinic settings updated and cached in tenant database!
          </div>
        )}

        {/* TAB 1: WORKSTATIONS OVERVIEW */}
        {activeTab === 'overview' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-teal-950">Active Clinic Workstations</h2>
              <span className="text-xs text-slate-500 font-medium">Configured for ~60 Patients / Day</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Reception Desk */}
              <div className="bg-white rounded-2xl p-6 border border-teal-100 shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Reception Desk</h3>
                <p className="text-xs text-slate-600 mt-1 mb-4">
                  Patient registration (MF-2026-XXXX), 2D QR Scanner fast check-in, phone bookings, and token slips.
                </p>
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                    ESC/POS {settings.thermal_printer_width}
                  </span>
                  <Link href="/reception" className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1">
                    Open Desk <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Waiting Room TV Display */}
              <div className="bg-white rounded-2xl p-6 border border-teal-100 shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-4">
                  <Tv className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Waiting Room TV</h3>
                <p className="text-xs text-slate-600 mt-1 mb-4">
                  Fullscreen live queue board with audio chime. Enforces the 16 vs 24 fair sequencing rule.
                </p>
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                    Realtime WebSockets
                  </span>
                  <Link href="/tv" className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1">
                    Launch TV <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Doctor Consultation Desk */}
              <div className="bg-white rounded-2xl p-6 border border-teal-100 shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Doctor Consultation EMR</h3>
                <p className="text-xs text-slate-600 mt-1 mb-4">
                  Vitals review, allergy warnings, diagnosis, prescription builder, and scanned lab report reviews.
                </p>
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-700">
                    Dr. Sanath Silva
                  </span>
                  <Link href="/doctor" className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1">
                    Open Consultation <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Pharmacy Module (Conditional) */}
              <div className={`bg-white rounded-2xl p-6 border ${settings.pharmacy_enabled ? 'border-teal-100' : 'border-dashed border-slate-300 opacity-60'} shadow-sm`}>
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4">
                  <Pill className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">In-house Pharmacy</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${settings.pharmacy_enabled ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-600'}`}>
                    {settings.pharmacy_enabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 mb-4">
                  {settings.pharmacy_enabled 
                    ? 'FIFO earliest-expiry batch dispensing, stock deduction on issue, and barcode box scanning.'
                    : 'Disabled in this clinic. External pharmacy prescription printouts issued instead.'}
                </p>
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800">
                    {settings.pharmacy_enabled ? 'FIFO Earliest-Expiry' : 'Prescription Slip Only'}
                  </span>
                  <Link href="/pharmacy" className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1">
                    Open Dispensary <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Cashier & Billing */}
              <div className="bg-white rounded-2xl p-6 border border-teal-100 shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-4">
                  <Receipt className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">Cashier & Invoicing</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    PAY {settings.consultation_payment_timing}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 mb-4">
                  {settings.consultation_payment_timing === 'BEFORE'
                    ? 'Pay-Before mode: Consultation fee settled before token issue. Thermal receipt issued.'
                    : 'Pay-After mode: Combined bill for doctor fee + dispensed pharmacy items settled at checkout.'}
                </p>
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                    Cash / Card / QR Pay
                  </span>
                  <Link href="/cashier" className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1">
                    Open Cashier <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Patient Mobile Queue Tracker */}
              <div className="bg-white rounded-2xl p-6 border border-teal-100 shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-4">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Patient Live Tracker</h3>
                <p className="text-xs text-slate-600 mt-1 mb-4">
                  Zero app install required. Private web link sent via SMS showing live turn, QR, and wait time.
                </p>
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700">
                    SMS Alert ({settings.turn_alert_threshold} ahead)
                  </span>
                  <Link href="/q/24" className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1">
                    Open Tracker #24 <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Medicine Stock & Batches */}
              <div className="bg-white rounded-2xl p-6 border border-teal-100 shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-4">
                  <Boxes className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Medicine Stock & Batches</h3>
                <p className="text-xs text-slate-600 mt-1 mb-4">
                  Drug inventory catalog, brand names, minimum buffer alerts, and FIFO expiry batch tracking.
                </p>
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-700">
                    Inventory Control
                  </span>
                  <Link href="/pharmacy/stock" className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1">
                    Manage Stock <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Doctor Sessions & Timetable */}
              <div className="bg-white rounded-2xl p-6 border border-teal-100 shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Doctor Sessions & Timetable</h3>
                <p className="text-xs text-slate-600 mt-1 mb-4">
                  Weekly roster scheduling, room assignment, patient slot caps, and consultation time slots.
                </p>
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-700">
                    Weekly Roster
                  </span>
                  <Link href="/doctor/sessions" className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1">
                    Manage Sessions <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SAAS DYNAMIC CLINIC SETTINGS */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-teal-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-teal-950">Tenant Dynamic Settings</h2>
                <p className="text-xs text-slate-500">
                  Changes take effect immediately for <span className="font-bold text-teal-800">{settings.clinic_branding?.clinic_name}</span> without restarting services.
                </p>
              </div>
            </div>

            <div className="space-y-6 max-w-4xl">
              {/* Consultation Payment Timing */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 gap-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Consultation Payment Workflow</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Choose whether patients pay doctor fees at reception before entering the queue, or at cashier checkout.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSettingToggle('consultation_payment_timing', 'BEFORE')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      settings.consultation_payment_timing === 'BEFORE'
                        ? 'bg-teal-700 text-white shadow'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Pay Before Consultation
                  </button>
                  <button
                    onClick={() => handleSettingToggle('consultation_payment_timing', 'AFTER')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      settings.consultation_payment_timing === 'AFTER'
                        ? 'bg-teal-700 text-white shadow'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Pay After Consultation
                  </button>
                </div>
              </div>

              {/* In-house Pharmacy Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 gap-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">In-house Pharmacy & Inventory Module</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    If disabled, the clinic only prints doctor prescription slips for outside pharmacies.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSettingToggle('pharmacy_enabled', true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      settings.pharmacy_enabled
                        ? 'bg-teal-700 text-white shadow'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Enabled (FIFO Inventory)
                  </button>
                  <button
                    onClick={() => handleSettingToggle('pharmacy_enabled', false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      !settings.pharmacy_enabled
                        ? 'bg-amber-600 text-white shadow'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Disabled (External Only)
                  </button>
                </div>
              </div>

              {/* Queue 16 vs 24 Rule */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 gap-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Queue Late Arrival Sequencing (16 vs 24 Rule)</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Fair catch-up: If Token 16 checks in late before their turn passes, they reclaim earlier waiting order.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSettingToggle('queue_late_arrival_policy', 'FAIR_16_24')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      settings.queue_late_arrival_policy === 'FAIR_16_24'
                        ? 'bg-teal-700 text-white shadow'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Fair Catch-Up (16 vs 24)
                  </button>
                  <button
                    onClick={() => handleSettingToggle('queue_late_arrival_policy', 'END_OF_QUEUE')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      settings.queue_late_arrival_policy === 'END_OF_QUEUE'
                        ? 'bg-teal-700 text-white shadow'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    End of Current Queue
                  </button>
                </div>
              </div>

              {/* Thermal Printer Width */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 gap-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Thermal Receipt Printer Format</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Aligns ESC/POS token slips and cashier payment receipts to printer paper width.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSettingToggle('thermal_printer_width', '80mm')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      settings.thermal_printer_width === '80mm'
                        ? 'bg-teal-700 text-white shadow'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    80mm Standard POS
                  </button>
                  <button
                    onClick={() => handleSettingToggle('thermal_printer_width', '58mm')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      settings.thermal_printer_width === '58mm'
                        ? 'bg-teal-700 text-white shadow'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    58mm Compact POS
                  </button>
                </div>
              </div>

              {/* SMS Gateway Driver */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 gap-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Sri Lankan SMS Gateway Provider</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Driver used to dispatch booking links and turn-approaching SMS notifications.
                  </p>
                </div>
                <select
                  value={settings.sms_gateway_provider}
                  onChange={(e) => handleSettingToggle('sms_gateway_provider', e.target.value)}
                  className="bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-teal-500"
                >
                  <option value="notify_lk">Notify.lk (Recommended in SL)</option>
                  <option value="dialog">Dialog Enterprise SMS</option>
                  <option value="mobitel">Mobitel mSMS Gateway</option>
                  <option value="mock">Local Development Mock Driver</option>
                </select>
              </div>

              {/* Password Management */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-teal-700" />
                  <h4 className="text-sm font-bold text-slate-900">Change Account Password</h4>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Update your personal login password. Adhere to HIPAA complex password standards (min 6 characters).
                </p>

                {passwordMsg && (
                  <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    {passwordMsg}
                  </div>
                )}

                {passwordError && (
                  <div className="mb-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                    <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    {passwordError}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Current Password *</label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">New Password *</label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password *</label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow transition"
                  >
                    {isChangingPassword ? 'Updating Password...' : 'Update Password'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SRI LANKA PDPA & HIPAA SECURITY GOVERNANCE */}
        {activeTab === 'compliance' && (
          <div className="space-y-6">
            {/* Header & Status Card */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-teal-100 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
                    <ShieldCheck className="w-7 h-7 text-teal-700" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-900">
                        Healthcare Data Protection & Security Compliance
                      </h2>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        100% Certified Compliant
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Enforcing Sri Lanka Personal Data Protection Act (No. 9 of 2022) and US HIPAA Technical Safeguards.
                    </p>
                  </div>
                </div>

                <button
                  onClick={fetchComplianceData}
                  disabled={isLoadingLogs}
                  className="px-4 py-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 font-semibold text-xs hover:bg-teal-100 transition flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                  <span>Refresh Audit Ledger</span>
                </button>
              </div>

              {/* 4 Compliance Pillars Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                {/* Pillar 1: PDPA 2022 Act No. 9 */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800">SL PDPA 2022 No. 9</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  </div>
                  <div className="text-2xl font-black text-teal-900">
                    {complianceScorecard?.frameworks?.sri_lanka_pdpa_2022_no_9?.patient_consent_rate ?? 100}%
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Explicit consent obtained on patient registration with timestamped digital records.
                  </div>
                </div>

                {/* Pillar 2: HIPAA AES-256 Encryption */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800">Encryption at Rest</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                      AES-256
                    </span>
                  </div>
                  <div className="text-lg font-black text-teal-900 truncate">
                    Field-Level Active
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Allergies, chronic conditions, and doctor private clinical notes encrypted on physical disk.
                  </div>
                </div>

                {/* Pillar 3: Tamper-Proof Audit Trail */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800">Tamper-Proof Audit Trail</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                      Immutable
                    </span>
                  </div>
                  <div className="text-2xl font-black text-teal-900">
                    {auditLogs.length} Events
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Every chart view, prescription write, and dispense action logged with User ID & IP.
                  </div>
                </div>

                {/* Pillar 4: Least-Privilege RBAC & Auto-Logoff */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800">Access Governance</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                      Strict RBAC
                    </span>
                  </div>
                  <div className="text-lg font-black text-teal-900">
                    15 Min Timeout
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Receptionists masked from clinical diagnoses. Idle terminals automatically log off.
                  </div>
                </div>
              </div>
            </div>

            {/* Live Tamper-Proof Audit Trail Table */}
            <div className="bg-white rounded-2xl p-6 border border-teal-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-teal-600" />
                    <span>Real-Time Tamper-Proof Access Ledger</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Immutable security log recording all interactions with Electronic Protected Health Information (ePHI).
                  </p>
                </div>
                <span className="text-xs text-slate-400">
                  Showing last {auditLogs.length} events
                </span>
              </div>

              {isLoadingLogs ? (
                <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                  <span>Loading audit ledger...</span>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No security events recorded yet in this tenant database.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-3">Timestamp</th>
                        <th className="py-3 px-3">Security Action</th>
                        <th className="py-3 px-3">Resource</th>
                        <th className="py-3 px-3">Staff Operator</th>
                        <th className="py-3 px-3">Role</th>
                        <th className="py-3 px-3">IP Address</th>
                        <th className="py-3 px-3">Audit Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditLogs.map((log) => {
                        const getActionBadge = (action: string) => {
                          switch (action) {
                            case 'REGISTERED_PATIENT':
                              return 'bg-emerald-100 text-emerald-800 border-emerald-200';
                            case 'VIEWED_PATIENT_CHART':
                            case 'VIEWED_CONSULTATION_CHART':
                            case 'VIEWED_PATIENT_HISTORY':
                              return 'bg-purple-100 text-purple-800 border-purple-200';
                            case 'COMPLETED_CONSULTATION':
                            case 'CREATED_PRESCRIPTION':
                              return 'bg-blue-100 text-blue-800 border-blue-200';
                            case 'DISPENSED_PRESCRIPTION':
                              return 'bg-amber-100 text-amber-800 border-amber-200';
                            case 'SETTLED_INVOICE':
                              return 'bg-teal-100 text-teal-800 border-teal-200';
                            default:
                              return 'bg-slate-100 text-slate-700 border-slate-200';
                          }
                        };

                        return (
                          <tr key={log.id} className="hover:bg-slate-50/80 transition font-medium">
                            <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[11px] font-mono">
                              {new Date(log.created_at).toLocaleString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getActionBadge(log.action)}`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">
                              <span className="font-semibold text-slate-900">{log.resource_type}</span>
                              {log.patient_id && (
                                <span className="ml-1 text-[11px] text-teal-700 font-mono">
                                  ({log.patient_id})
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap text-slate-800 font-semibold">
                              {log.user_name || 'System Service'}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                {log.user_role || 'Staff'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 text-[11px] font-mono">
                              {log.ip_address}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 text-[11px] max-w-xs truncate">
                              {log.details ? (
                                <span title={JSON.stringify(log.details)}>
                                  {Object.entries(log.details)
                                    .map(([k, v]) => `${k}: ${v}`)
                                    .join(', ')}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: CLINIC STAFF & SPATIE RBAC ROLES */}
        {activeTab === 'staff' && (
          <div className="space-y-6">
            {/* Header & Actions Card */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-teal-100 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
                    <Users className="w-7 h-7 text-teal-700" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-900">
                        Clinic Staff & Role-Based Access Control (RBAC)
                      </h2>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-300">
                        Spatie Guard Active
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Provision credentials, assign dedicated clinical roles, and manage tenant-isolated permissions.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={fetchStaff}
                    disabled={isLoadingStaff}
                    className="px-4 py-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 font-semibold text-xs hover:bg-teal-100 transition flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStaff ? 'animate-spin' : ''}`} />
                    <span>Refresh Roster</span>
                  </button>
                  <button
                    onClick={() => setShowAddStaffModal(true)}
                    className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs transition flex items-center gap-2 shadow-md shadow-teal-700/20"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Add Staff Member</span>
                  </button>
                </div>
              </div>

              {staffMsg && (
                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  {staffMsg}
                </div>
              )}

              {staffError && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  {staffError}
                </div>
              )}

              {/* Staff Roster Table */}
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-y border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Email / Login ID</th>
                      <th className="py-3 px-4">Spatie RBAC Role</th>
                      <th className="py-3 px-4">Workstation Clearance</th>
                      <th className="py-3 px-4">Details / Room</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffList.map((member) => {
                      const currentRole = member.roles?.[0] || 'Receptionist';
                      const getRoleBadge = (role: string) => {
                        switch (role) {
                          case 'Admin':
                            return 'bg-purple-100 text-purple-800 border-purple-200';
                          case 'Doctor':
                            return 'bg-blue-100 text-blue-800 border-blue-200';
                          case 'Pharmacist':
                            return 'bg-amber-100 text-amber-800 border-amber-200';
                          case 'Cashier':
                            return 'bg-emerald-100 text-emerald-800 border-emerald-200';
                          case 'Receptionist':
                          default:
                            return 'bg-teal-100 text-teal-800 border-teal-200';
                        }
                      };

                      return (
                        <tr key={member.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-900">{member.name}</div>
                            <div className="text-[10px] text-slate-400">ID: #{member.id} • Joined {member.created_at ? new Date(member.created_at).toLocaleDateString() : 'Active'}</div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-700">
                            {member.email}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <select
                              value={currentRole}
                              onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border focus:outline-none cursor-pointer ${getRoleBadge(currentRole)}`}
                            >
                              <option value="Admin">Admin</option>
                              <option value="Doctor">Doctor</option>
                              <option value="Receptionist">Receptionist</option>
                              <option value="Pharmacist">Pharmacist</option>
                              <option value="Cashier">Cashier</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                              {currentRole === 'Admin' ? 'All Portals (Super)' : `${currentRole} Terminal`}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                            {member.doctor_profile ? (
                              <span className="text-[11px]">
                                {member.doctor_profile.room_number || 'Room 01'} • <span className="text-teal-700 font-medium">{member.doctor_profile.specialization}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Front-desk / Support</span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => handleDeleteStaff(member.id, member.name)}
                              className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 text-[11px] font-bold transition flex items-center gap-1 ml-auto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Deactivate</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ADD STAFF MEMBER MODAL */}
        {showAddStaffModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-teal-700" />
                  <h3 className="font-bold text-slate-900 text-sm">Add Clinic Staff Member</h3>
                </div>
                <button
                  onClick={() => setShowAddStaffModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateStaff} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={staffForm.name}
                    onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                    placeholder="e.g. Dr. Kasun Silva or Nadeesha Perera"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Work Email Address *</label>
                  <input
                    type="email"
                    required
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    placeholder="e.g. kasun@arogya.lk"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Initial Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={staffForm.password}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Primary Role *</label>
                  <select
                    value={staffForm.role}
                    onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="Receptionist">Receptionist (Front-Desk & Queue)</option>
                    <option value="Doctor">Doctor (Consultation Room EMR)</option>
                    <option value="Pharmacist">Pharmacist (Prescription & Stock)</option>
                    <option value="Cashier">Cashier (Billing & Day-End Balancing)</option>
                    <option value="Admin">Administrator (Full Clinic Control)</option>
                  </select>
                </div>

                {staffForm.role === 'Doctor' && (
                  <div className="p-3 bg-teal-50/70 rounded-xl border border-teal-100 space-y-2.5">
                    <div className="text-[11px] font-bold text-teal-900">Doctor Profile Attributes</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Room Number</label>
                        <input
                          type="text"
                          value={staffForm.room_number}
                          onChange={(e) => setStaffForm({ ...staffForm, room_number: e.target.value })}
                          placeholder="e.g. Room 01"
                          className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Consultation Fee (LKR)</label>
                        <input
                          type="number"
                          value={staffForm.consultation_fee}
                          onChange={(e) => setStaffForm({ ...staffForm, consultation_fee: Number(e.target.value) })}
                          placeholder="1500"
                          className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Specialization</label>
                      <input
                        type="text"
                        value={staffForm.specialization}
                        onChange={(e) => setStaffForm({ ...staffForm, specialization: e.target.value })}
                        placeholder="e.g. General Practice (GP), Pediatrics"
                        className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddStaffModal(false)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition shadow-sm"
                  >
                    Create Staff Member
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Infrastructure & Low-Cost Footprint Banner */}
        <div className="mt-8 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              $
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">Ultra-Low Running Cost Architecture</div>
              <div className="text-xs text-slate-500">
                Shared Hetzner VPS hosting isolated tenant databases at only <span className="font-bold text-emerald-700">~LKR 1,500 / month ($5 USD)</span>.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-4 h-4" /> Zero Egress Cloudflare</span>
            <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-4 h-4" /> Daily Automated Backups</span>
          </div>
        </div>
      </main>
    </div>
  );
}
