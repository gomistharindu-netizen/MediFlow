'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ApiClient } from '@/lib/api';
import {
  Building2,
  Globe,
  ShieldCheck,
  Plus,
  Search,
  RefreshCw,
  ExternalLink,
  Layers,
  TrendingUp,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  Server,
  Sliders,
  Database,
  Sparkles,
  LogOut,
  ArrowRight,
  ShieldAlert,
  CreditCard,
  Clock,
  Infinity as InfinityIcon,
  Calendar,
  Key,
  Edit,
  Zap,
  Play
} from 'lucide-react';

interface TenantRecord {
  id: string;
  clinic_name: string;
  contact_email: string;
  contact_phone: string;
  subscription_plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | 'TRIAL';
  subscription_type?: 'TRIAL' | 'MONTHLY' | 'LIFETIME';
  trial_ends_at?: string | null;
  trial_days_remaining?: number | null;
  is_trial_expired?: boolean;
  lifetime_license_key?: string | null;
  next_billing_date?: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';
  domains: string[];
  primary_domain: string;
  patient_count: number;
  db_status: string;
  created_at: string;
}

interface PlatformStats {
  total_tenants: number;
  active_tenants: number;
  trial_tenants?: number;
  monthly_tenants?: number;
  lifetime_tenants?: number;
  expiring_trials_count?: number;
  mrr_lkr: number;
  mrr_usd: number;
  platform_version: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price_lkr: number;
  price_usd: number;
  billing_cycle: string;
  badge?: string;
  is_popular?: boolean;
  features: string[];
}

export default function SuperAdminDashboard() {
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'tenants' | 'plans' | 'domains'>('tenants');

  // Guard: Only SuperAdmin is allowed on Landlord Portal
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('mediflow_role');
      const token = localStorage.getItem('mediflow_token');
      if (!token || role !== 'SuperAdmin') {
        if (role === 'Doctor') window.location.href = '/doctor';
        else if (role === 'Receptionist') window.location.href = '/reception';
        else if (role === 'Cashier') window.location.href = '/cashier';
        else if (role === 'Pharmacist') window.location.href = '/pharmacy';
        else window.location.href = '/login';
      }
    }
  }, []);

  // Modal State for New Clinic Provisioning
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [isProvisioning, setIsProvisioning] = useState<boolean>(false);
  const [newClinic, setNewClinic] = useState({
    clinic_name: '',
    tenant_id: '',
    subdomain: '',
    custom_domain: '',
    contact_email: '',
    contact_phone: '',
    subscription_type: 'TRIAL' as 'TRIAL' | 'MONTHLY' | 'LIFETIME',
    subscription_plan: 'PROFESSIONAL',
    trial_days: 14,
    admin_name: '',
    admin_password: 'password123',
    consultation_payment_timing: 'AFTER',
    pharmacy_enabled: true,
    thermal_printer_width: '80mm',
  });

  // Modal State for Subscription Editing / Trial Extension
  const [editingTenant, setEditingTenant] = useState<TenantRecord | null>(null);
  const [editSubType, setEditSubType] = useState<'TRIAL' | 'MONTHLY' | 'LIFETIME'>('TRIAL');
  const [editPlan, setEditPlan] = useState<string>('PROFESSIONAL');
  const [extendDays, setExtendDays] = useState<number>(14);
  const [editStatus, setEditStatus] = useState<string>('ACTIVE');
  const [isUpdatingSub, setIsUpdatingSub] = useState<boolean>(false);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch Central Platform Data
  const loadPlatformData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [tenantsRes, statsRes, plansRes] = await Promise.all([
        ApiClient.get<{ success: boolean; data: TenantRecord[] }>('/central/tenants'),
        ApiClient.get<{ success: boolean; data: PlatformStats }>('/central/stats'),
        ApiClient.get<{ success: boolean; data: SubscriptionPlan[] }>('/central/plans'),
      ]);

      if (tenantsRes?.success && Array.isArray(tenantsRes.data)) {
        setTenants(tenantsRes.data);
      }
      if (statsRes?.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (plansRes?.success && Array.isArray(plansRes.data)) {
        setPlans(plansRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load central platform data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlatformData();
  }, [loadPlatformData]);

  // Handle Provisioning New Tenant
  const handleProvisionTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProvisioning(true);
    setNotification(null);

    try {
      const res = await ApiClient.post<{
        success: boolean;
        message: string;
        data: any;
      }>('/central/tenants', newClinic);

      if (res?.success) {
        setNotification({
          type: 'success',
          message: `Client clinic '${newClinic.clinic_name}' provisioned with its own isolated database (${newClinic.subscription_type})!`,
        });
        setShowCreateModal(false);
        // Reset form
        setNewClinic({
          clinic_name: '',
          tenant_id: '',
          subdomain: '',
          custom_domain: '',
          contact_email: '',
          contact_phone: '',
          subscription_type: 'TRIAL',
          subscription_plan: 'PROFESSIONAL',
          trial_days: 14,
          admin_name: '',
          admin_password: 'password123',
          consultation_payment_timing: 'AFTER',
          pharmacy_enabled: true,
          thermal_printer_width: '80mm',
        });
        await loadPlatformData();
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Tenant provisioning failed.',
      });
    } finally {
      setIsProvisioning(false);
    }
  };

  // Open Edit Subscription Modal
  const handleOpenEditSub = (tenant: TenantRecord) => {
    setEditingTenant(tenant);
    setEditSubType(tenant.subscription_type || (tenant.subscription_plan === 'TRIAL' ? 'TRIAL' : 'MONTHLY'));
    setEditPlan(tenant.subscription_plan || 'PROFESSIONAL');
    setEditStatus(tenant.status || 'ACTIVE');
    setExtendDays(14);
  };

  // Save Subscription Updates (Change to Monthly, Lifetime, or Extend Trial)
  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    setIsUpdatingSub(true);
    try {
      const payload: any = {
        subscription_type: editSubType,
        subscription_plan: editPlan,
        status: editStatus,
      };

      if (editSubType === 'TRIAL' && extendDays > 0) {
        payload.extend_trial_days = extendDays;
      }

      await ApiClient.patch(`/central/tenants/${editingTenant.id}`, payload);
      setNotification({
        type: 'success',
        message: `Subscription for '${editingTenant.clinic_name}' updated successfully to ${editSubType}!`,
      });
      setEditingTenant(null);
      await loadPlatformData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to update subscription.',
      });
    } finally {
      setIsUpdatingSub(false);
    }
  };

  // Quick 1-Click Trial Extension (+7 Days)
  const handleQuickExtendTrial = async (tenantId: string, days: number = 7) => {
    try {
      await ApiClient.patch(`/central/tenants/${tenantId}`, {
        extend_trial_days: days,
        status: 'ACTIVE',
      });
      setNotification({
        type: 'success',
        message: `Extended 14-Day Trial for '${tenantId}' by +${days} days!`,
      });
      await loadPlatformData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Trial extension failed.',
      });
    }
  };

  // Toggle Tenant Status (Active / Suspended)
  const handleToggleStatus = async (tenantId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await ApiClient.patch(`/central/tenants/${tenantId}`, {
        status: newStatus,
      });
      setNotification({
        type: 'success',
        message: `Tenant '${tenantId}' status updated to ${newStatus}.`,
      });
      await loadPlatformData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Status update failed.',
      });
    }
  };

  // Filter Tenants
  const filteredTenants = tenants.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      t.clinic_name?.toLowerCase().includes(q) ||
      t.id?.toLowerCase().includes(q) ||
      t.primary_domain?.toLowerCase().includes(q) ||
      t.contact_email?.toLowerCase().includes(q) ||
      t.subscription_plan?.toLowerCase().includes(q) ||
      t.subscription_type?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Central SuperAdmin Top Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <ShieldCheck className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base tracking-tight text-white">MediFlow</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-500/30">
                  Landlord SuperAdmin
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Multi-Tenant Platform Control & Subscription Manager</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/demo"
              target="_blank"
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Public Demo Sandbox</span>
              <ExternalLink className="w-3 h-3 text-amber-400" />
            </Link>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-teal-500/10 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Onboard New Clinic</span>
            </button>

            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/login';
              }}
              className="p-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
              title="Logout from Central Landlord"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Flash Notifications */}
        {notification && (
          <div
            className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border ${
              notification.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              )}
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TOP STATS CARDS: Trial vs Monthly vs Lifetime */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800/90 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Clinics</span>
              <Building2 className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-3xl font-black text-white">{stats?.total_tenants ?? tenants.length}</div>
            <div className="text-[11px] text-teal-400 mt-1 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              {stats?.active_tenants ?? tenants.length} Active Isolated DBs
            </div>
          </div>

          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800/90 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">14-Day Free Trials</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-black text-amber-400">{stats?.trial_tenants ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">
              {stats?.expiring_trials_count ? (
                <span className="text-rose-400 font-bold">⚠️ {stats.expiring_trials_count} expiring soon</span>
              ) : (
                <span>Evaluation period active</span>
              )}
            </div>
          </div>

          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800/90 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Monthly Subscribers</span>
              <Calendar className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-3xl font-black text-purple-300">{stats?.monthly_tenants ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">
              Recurring Monthly Billing
            </div>
          </div>

          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800/90 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Lifetime Licenses</span>
              <InfinityIcon className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-black text-emerald-400">{stats?.lifetime_tenants ?? 0}</div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">
              Perpetual One-Time Licenses
            </div>
          </div>

          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800/90 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Estimated MRR</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              LKR {Number(stats?.mrr_lkr ?? 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">
              ~${stats?.mrr_usd ?? 0} USD Monthly
            </div>
          </div>
        </div>

        {/* View Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('tenants')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'tenants'
                ? 'bg-teal-600 text-white shadow'
                : 'text-slate-400 hover:text-white bg-slate-900/60'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Client Clinics ({tenants.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('plans')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'plans'
                ? 'bg-teal-600 text-white shadow'
                : 'text-slate-400 hover:text-white bg-slate-900/60'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>SaaS Subscription Plans ({plans.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('domains')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'domains'
                ? 'bg-teal-600 text-white shadow'
                : 'text-slate-400 hover:text-white bg-slate-900/60'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Domain & Routing Architecture</span>
          </button>
        </div>

        {/* TAB 1: Client Clinics Management */}
        {activeTab === 'tenants' && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800/90 shadow-sm p-6 space-y-4">
            {/* Search Filter & Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white tracking-wide">
                  Provisioned Clinic Clients (Tenants)
                </h2>
                <p className="text-xs text-slate-400">
                  Manage clinic subscriptions: 14-Day Free Trials, Monthly plans, and Lifetime licenses.
                </p>
              </div>

              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search clinic, tenant ID, plan, trial..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Tenants Data Table */}
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs divide-y divide-slate-800">
                <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">Clinic Name & ID</th>
                    <th className="px-4 py-3.5">Assigned Domain</th>
                    <th className="px-4 py-3.5">Subscription Model</th>
                    <th className="px-4 py-3.5">Plan Tier</th>
                    <th className="px-4 py-3.5">Patients</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900">
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-500">
                        No clients found matching your search. Click "Onboard New Clinic" to provision one.
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((t) => {
                      const subType = t.subscription_type || (t.subscription_plan === 'TRIAL' ? 'TRIAL' : 'MONTHLY');
                      return (
                        <tr key={t.id} className="hover:bg-slate-800/40 transition">
                          {/* Clinic Name & ID */}
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-sm text-white flex items-center gap-1.5">
                              {t.clinic_name}
                            </div>
                            <div className="text-[11px] font-mono text-teal-400 mt-0.5">
                              ID: <strong>{t.id}</strong> • {t.contact_email}
                            </div>
                          </td>

                          {/* Domain */}
                          <td className="px-4 py-3.5">
                            <div className="font-mono text-xs font-semibold text-slate-200 flex items-center gap-1">
                              <Globe className="w-3.5 h-3.5 text-purple-400" />
                              {t.primary_domain}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Database: <code>tenant{t.id}</code>
                            </div>
                          </td>

                          {/* Subscription Model (Trial vs Monthly vs Lifetime) */}
                          <td className="px-4 py-3.5">
                            {subType === 'TRIAL' ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-amber-950/80 text-amber-300 border border-amber-500/40">
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  14-Day Free Trial
                                </span>
                                <div className="text-[10px] mt-1 font-mono">
                                  {t.trial_days_remaining !== null && t.trial_days_remaining !== undefined ? (
                                    t.trial_days_remaining > 0 ? (
                                      <span className={t.trial_days_remaining <= 3 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                                        ⏳ {t.trial_days_remaining} Days Remaining
                                      </span>
                                    ) : (
                                      <span className="text-rose-400 font-bold bg-rose-950/50 px-1 py-0.5 rounded">
                                        ❌ Trial Expired
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-slate-500">14-Day Window</span>
                                  )}
                                </div>
                              </div>
                            ) : subType === 'LIFETIME' ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-950">
                                  <InfinityIcon className="w-3.5 h-3.5 text-emerald-400" />
                                  Perpetual Lifetime
                                </span>
                                {t.lifetime_license_key && (
                                  <div className="text-[10px] font-mono text-slate-400 mt-0.5" title="License Key">
                                    🔑 {t.lifetime_license_key}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-blue-950/80 text-blue-300 border border-blue-500/40">
                                  <Calendar className="w-3 h-3 text-blue-400" />
                                  Monthly Subscription
                                </span>
                                {t.next_billing_date && (
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    Next: {t.next_billing_date}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Plan Tier */}
                          <td className="px-4 py-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-black tracking-wide border ${
                                t.subscription_plan === 'ENTERPRISE'
                                  ? 'bg-purple-950/60 text-purple-300 border-purple-500/30'
                                  : t.subscription_plan === 'PROFESSIONAL'
                                  ? 'bg-teal-950/60 text-teal-300 border-teal-500/30'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {t.subscription_plan}
                            </span>
                          </td>

                          {/* Patients Count */}
                          <td className="px-4 py-3.5 font-mono font-bold text-slate-300">
                            {t.patient_count} records
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5">
                            <button
                              onClick={() => handleToggleStatus(t.id, t.status)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                                t.status === 'ACTIVE'
                                  ? 'bg-emerald-900/30 text-emerald-300 border-emerald-500/40 hover:bg-rose-950 hover:text-rose-300'
                                  : 'bg-rose-900/30 text-rose-300 border-rose-500/40 hover:bg-emerald-950 hover:text-emerald-300'
                              }`}
                              title="Click to Toggle Active / Suspended"
                            >
                              {t.status}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {subType === 'TRIAL' && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickExtendTrial(t.id, 7)}
                                  className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-[10px] transition"
                                  title="Add +7 days to trial"
                                >
                                  +7d
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenEditSub(t)}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-[11px] transition flex items-center gap-1"
                                title="Edit Subscription (Trial, Monthly, Lifetime)"
                              >
                                <Edit className="w-3 h-3 text-slate-400" />
                                <span>Edit Sub</span>
                              </button>

                              <a
                                href={`http://localhost:3005/?clinic=${t.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-teal-600/20 text-teal-300 hover:bg-teal-600 hover:text-white border border-teal-500/40 font-bold transition text-xs shadow"
                              >
                                <span>Open</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: SaaS Plans Showcase */}
        {activeTab === 'plans' && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800/90 shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                MediFlow SaaS Subscription Tiers & Pricing
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Configured subscription models: 14-Day Free Trial, Monthly subscriptions, and Perpetual Lifetime licenses.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {plans.map((p) => (
                <div
                  key={p.id}
                  className={`bg-slate-950 rounded-2xl border p-5 flex flex-col justify-between transition hover:border-teal-500/50 ${
                    p.is_popular
                      ? 'border-teal-500 shadow-xl shadow-teal-500/10'
                      : p.id === 'LIFETIME'
                      ? 'border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                      : p.id === 'TRIAL_14_DAYS'
                      ? 'border-amber-500/50 bg-amber-950/10'
                      : 'border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className="text-xs font-bold text-white">{p.name}</span>
                      {p.badge && (
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            p.id === 'LIFETIME'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : p.id === 'TRIAL_14_DAYS'
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                              : 'bg-teal-950 text-teal-300 border border-teal-500/40'
                          }`}
                        >
                          {p.badge}
                        </span>
                      )}
                    </div>

                    <div className="mt-3">
                      <span className="text-xl font-black text-white font-mono">
                        {p.price_lkr === 0 ? 'FREE' : `LKR ${p.price_lkr.toLocaleString()}`}
                      </span>
                      <span className="text-[11px] text-slate-400 ml-1">/{p.billing_cycle}</span>
                    </div>
                    {p.price_usd > 0 && (
                      <span className="text-[11px] text-teal-400 font-semibold block mt-0.5">
                        ~${p.price_usd} USD
                      </span>
                    )}

                    <ul className="mt-5 space-y-2 text-xs text-slate-300">
                      {p.features.map((f, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 flex-shrink-0 mt-0.5" />
                          <span className="text-[11px] leading-snug">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 pt-3 border-t border-slate-800">
                    <span className="text-[10px] text-slate-500 block text-center font-mono">
                      Plan ID: {p.id}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Domain & Routing Architecture */}
        {activeTab === 'domains' && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Multi-Tenant Subdomain Routing Architecture
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                How MediFlow isolates client clinics via subdomains and custom domains.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-teal-400 font-bold">
                  <Globe className="w-4 h-4" />
                  <span>Subdomain Strategy (Default)</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Every new clinic provisioned receives an instant subdomain under your master domain:
                </p>
                <div className="bg-slate-900 p-3 rounded font-mono text-[11px] text-purple-300 border border-slate-800 space-y-1">
                  <div>https://<strong>arogya</strong>.mediflow.lk</div>
                  <div>https://<strong>suwapiyasa</strong>.mediflow.lk</div>
                  <div>https://<strong>nawaloka</strong>.mediflow.lk</div>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Configured via Cloudflare Wildcard DNS: <code>*.mediflow.lk A &lt;VPS-IP&gt;</code>.
                </p>
              </div>

              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-blue-400 font-bold">
                  <Server className="w-4 h-4" />
                  <span>Custom Branded Domain (Enterprise & Lifetime)</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Enterprise clients can point their own clinic domain directly to MediFlow:
                </p>
                <div className="bg-slate-900 p-3 rounded font-mono text-[11px] text-blue-300 border border-slate-800 space-y-1">
                  <div>https://<strong>opd.asirihospitals.com</strong></div>
                  <div>https://<strong>care.durdans.lk</strong></div>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Client sets CNAME record to <code>custom.mediflow.lk</code>.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Onboard New Clinic Modal with Trial / Monthly / Lifetime Selector */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-sm text-white">Onboard & Provision New Clinic Client</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProvisionTenant} className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Subscription Model Choice */}
              <div>
                <label className="block text-slate-300 font-extrabold uppercase tracking-wider mb-2">
                  Select Subscription Type *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setNewClinic((prev) => ({
                        ...prev,
                        subscription_type: 'TRIAL',
                        subscription_plan: 'PROFESSIONAL',
                      }))
                    }
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      newClinic.subscription_type === 'TRIAL'
                        ? 'bg-amber-950/40 border-amber-500 text-white ring-2 ring-amber-500/20'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-950 text-amber-300">
                          Free
                        </span>
                      </div>
                      <div className="font-bold text-xs text-white">14-Day Free Trial</div>
                      <div className="text-[11px] text-slate-400 mt-1">Full access for 14 days, no card required</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setNewClinic((prev) => ({
                        ...prev,
                        subscription_type: 'MONTHLY',
                        subscription_plan: 'PROFESSIONAL',
                      }))
                    }
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      newClinic.subscription_type === 'MONTHLY'
                        ? 'bg-blue-950/40 border-blue-500 text-white ring-2 ring-blue-500/20'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-950 text-blue-300">
                          Recurring
                        </span>
                      </div>
                      <div className="font-bold text-xs text-white">Monthly Plan</div>
                      <div className="text-[11px] text-slate-400 mt-1">Billed monthly (Starter, Pro, Enterprise)</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setNewClinic((prev) => ({
                        ...prev,
                        subscription_type: 'LIFETIME',
                        subscription_plan: 'ENTERPRISE',
                      }))
                    }
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      newClinic.subscription_type === 'LIFETIME'
                        ? 'bg-emerald-950/40 border-emerald-500 text-white ring-2 ring-emerald-500/20'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <InfinityIcon className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300">
                          Perpetual
                        </span>
                      </div>
                      <div className="font-bold text-xs text-white">Lifetime License</div>
                      <div className="text-[11px] text-slate-400 mt-1">One-time payment, lifetime unlimited access</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Clinic Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                    Clinic Official Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newClinic.clinic_name}
                    onChange={(e) => {
                      const name = e.target.value;
                      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '');
                      setNewClinic((prev) => ({
                        ...prev,
                        clinic_name: name,
                        tenant_id: prev.tenant_id ? prev.tenant_id : slug,
                        subdomain: prev.subdomain ? prev.subdomain : slug,
                      }));
                    }}
                    placeholder="e.g. Asiri Outpatient Medical Centre"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                    Tenant Slug (Physical DB Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newClinic.tenant_id}
                    onChange={(e) =>
                      setNewClinic((prev) => ({ ...prev, tenant_id: e.target.value.toLowerCase() }))
                    }
                    placeholder="e.g. asiri"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-teal-300 font-mono font-bold focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Subdomain & Plan Tier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                    Assigned Subdomain
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={newClinic.subdomain}
                      onChange={(e) =>
                        setNewClinic((prev) => ({ ...prev, subdomain: e.target.value.toLowerCase() }))
                      }
                      placeholder="asiri"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-l-lg text-white font-mono"
                    />
                    <span className="px-3 py-2 bg-slate-800 text-slate-400 rounded-r-lg font-mono text-[11px] border border-l-0 border-slate-800">
                      .mediflow.lk
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                    {newClinic.subscription_type === 'TRIAL'
                      ? 'Trial Features Level'
                      : newClinic.subscription_type === 'LIFETIME'
                      ? 'Lifetime License Tier'
                      : 'Subscription Tier'}
                  </label>
                  <select
                    value={newClinic.subscription_plan}
                    onChange={(e: any) =>
                      setNewClinic((prev) => ({ ...prev, subscription_plan: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-bold focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="STARTER">Starter Plan (LKR 4,500/mo)</option>
                    <option value="PROFESSIONAL">Professional Plan (LKR 9,500/mo) - Recommended</option>
                    <option value="ENTERPRISE">Enterprise Plan (LKR 19,500/mo)</option>
                  </select>
                </div>
              </div>

              {/* Contact & Admin User */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                    Primary Clinic Admin Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={newClinic.contact_email}
                    onChange={(e) =>
                      setNewClinic((prev) => ({ ...prev, contact_email: e.target.value }))
                    }
                    placeholder="admin@asiri.lk"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                    Admin Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={newClinic.admin_password}
                    onChange={(e) =>
                      setNewClinic((prev) => ({ ...prev, admin_password: e.target.value }))
                    }
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Initial Settings */}
              <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1 text-[10px]">
                    Payment Timing
                  </label>
                  <select
                    value={newClinic.consultation_payment_timing}
                    onChange={(e) =>
                      setNewClinic((prev) => ({
                        ...prev,
                        consultation_payment_timing: e.target.value,
                      }))
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200"
                  >
                    <option value="AFTER">Pay-After (Combined)</option>
                    <option value="BEFORE">Pay-Before (Upfront)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1 text-[10px]">
                    In-House Pharmacy
                  </label>
                  <select
                    value={newClinic.pharmacy_enabled ? 'true' : 'false'}
                    onChange={(e) =>
                      setNewClinic((prev) => ({
                        ...prev,
                        pharmacy_enabled: e.target.value === 'true',
                      }))
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200"
                  >
                    <option value="true">Enabled (In-House FIFO)</option>
                    <option value="false">Disabled (External Rx)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1 text-[10px]">
                    Thermal Printer Width
                  </label>
                  <select
                    value={newClinic.thermal_printer_width}
                    onChange={(e) =>
                      setNewClinic((prev) => ({
                        ...prev,
                        thermal_printer_width: e.target.value,
                      }))
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200"
                  >
                    <option value="80mm">80mm Standard POS</option>
                    <option value="58mm">58mm Compact POS</option>
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProvisioning}
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold shadow-lg shadow-teal-500/20 flex items-center gap-2"
                >
                  {isProvisioning && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{isProvisioning ? 'Provisioning Physical DB...' : 'Create Clinic Database'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SUBSCRIPTION / EXTEND TRIAL MODAL */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">
                  Manage Subscription: {editingTenant.clinic_name}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">Tenant ID: {editingTenant.id}</p>
              </div>
              <button
                onClick={() => setEditingTenant(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubscription} className="p-6 space-y-4 text-xs">
              {/* Subscription Model */}
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">
                  Subscription Model
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditSubType('TRIAL')}
                    className={`py-2 px-3 rounded-lg border text-center font-bold text-xs transition ${
                      editSubType === 'TRIAL'
                        ? 'bg-amber-950 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    14-Day Trial
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditSubType('MONTHLY')}
                    className={`py-2 px-3 rounded-lg border text-center font-bold text-xs transition ${
                      editSubType === 'MONTHLY'
                        ? 'bg-blue-950 border-blue-500 text-blue-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditSubType('LIFETIME')}
                    className={`py-2 px-3 rounded-lg border text-center font-bold text-xs transition ${
                      editSubType === 'LIFETIME'
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Lifetime
                  </button>
                </div>
              </div>

              {/* If Trial: Option to extend trial */}
              {editSubType === 'TRIAL' && (
                <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-amber-300 font-bold">
                    <span>Extend Trial Duration:</span>
                    <span>{editingTenant.trial_days_remaining ?? 0} days remaining</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[7, 14, 30].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setExtendDays(d)}
                        className={`flex-1 py-1.5 rounded text-xs font-bold border transition ${
                          extendDays === d
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-950 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        +{d} Days
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Will add {extendDays} days to the trial and reactivate if expired.
                  </p>
                </div>
              )}

              {/* If Lifetime: Show License Key */}
              {editSubType === 'LIFETIME' && (
                <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3">
                  <div className="text-emerald-300 font-bold mb-1 flex items-center gap-1.5">
                    <InfinityIcon className="w-4 h-4" />
                    <span>Perpetual License Certificate</span>
                  </div>
                  <div className="font-mono text-xs text-white bg-slate-950 p-2 rounded border border-slate-800">
                    {editingTenant.lifetime_license_key || 'MF-LIFE-AUTO-GENERATE'}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Client clinic has full lifetime perpetual access. No monthly fees.
                  </p>
                </div>
              )}

              {/* Plan Tier */}
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">
                  Plan Tier
                </label>
                <select
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-bold"
                >
                  <option value="STARTER">Starter Plan (LKR 4,500/mo)</option>
                  <option value="PROFESSIONAL">Professional Plan (LKR 9,500/mo)</option>
                  <option value="ENTERPRISE">Enterprise Plan (LKR 19,500/mo)</option>
                </select>
              </div>

              {/* Account Status */}
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">
                  Account Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-bold"
                >
                  <option value="ACTIVE">ACTIVE (Access Allowed)</option>
                  <option value="SUSPENDED">SUSPENDED (Temporary Lock)</option>
                  <option value="EXPIRED">EXPIRED (Trial / Payment Expired)</option>
                </select>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingSub}
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold flex items-center gap-1.5"
                >
                  {isUpdatingSub && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
