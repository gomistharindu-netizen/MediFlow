'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useClinic } from '@/contexts/ClinicContext';
import { ApiClient } from '@/lib/api';
import { useQueueEcho } from '@/hooks/useQueueEcho';
import {
  CreditCard,
  Banknote,
  QrCode,
  ArrowLeft,
  Search,
  RefreshCw,
  Printer,
  CheckCircle2,
  AlertCircle,
  Building2,
  Receipt,
  Clock,
  TrendingUp,
  FileSpreadsheet,
  X,
  Wallet,
  ShieldCheck,
  Sparkles,
  Calendar,
  Layers,
  CircleDollarSign,
  LogOut
} from 'lucide-react';

interface InvoicePayment {
  id: number;
  receipt_number: string;
  amount: string | number;
  payment_method: 'CASH' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'QR_PAY';
  charge_type: string;
  cashier?: {
    name: string;
  };
  created_at: string;
}

interface InvoiceRecord {
  id: number;
  invoice_number: string;
  visit_id: number;
  patient_id: number;
  consultation_fee: string | number;
  pharmacy_fee: string | number;
  other_procedures_fee: string | number;
  discount_amount: string | number;
  total_amount: string | number;
  paid_amount: string | number;
  balance_due: string | number;
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'VOID';
  created_at: string;
  patient?: {
    id: number;
    patient_id?: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    phone: string;
    age?: number;
    gender?: string;
  };
  visit?: {
    id: number;
    token_number: number;
    status: string;
    patient?: {
      id: number;
      patient_id?: string;
      first_name?: string;
      last_name?: string;
      full_name?: string;
      phone: string;
      age?: number;
      gender?: string;
    };
    doctor?: {
      user?: {
        name: string;
      };
    };
    prescription?: {
      id: number;
      dispense_status: 'PENDING' | 'DISPENSED' | 'EXTERNAL' | 'PARTIALLY_DISPENSED';
      items: Array<{
        id: number;
        medicine_name: string;
        dosage: string;
        frequency: string;
        duration: string;
        instructions?: string;
        quantity_prescribed: number;
        quantity_dispensed: number;
        unit_price: number | string;
        total_price: number | string;
      }>;
    };
  };
  payments?: InvoicePayment[];
}

interface QueueVisit {
  id: number;
  token_number: number;
  status: string;
  patient: {
    id: number;
    full_name: string;
    phone: string;
    age: number;
    gender: string;
  };
  doctor?: {
    user?: {
      name: string;
    };
  };
  invoice?: InvoiceRecord;
}

interface ReconciliationReport {
  date: string;
  total_collected: number;
  payment_breakdown: {
    cash: number;
    card: number;
    qr_pay: number;
    bank_transfer: number;
  };
  invoices_summary: {
    total_generated: number;
    fully_paid: number;
    unpaid: number;
    partially_paid: number;
  };
  transactions: Array<{
    id: number;
    receipt_number: string;
    invoice_number: string;
    patient_name: string;
    amount: number;
    payment_method: string;
    charge_type: string;
    cashier_name: string;
    time: string;
  }>;
}

function getPatientDisplayName(patient?: any, visitPatient?: any): string {
  const p = patient || visitPatient;
  if (!p) return 'Patient';
  if (p.full_name && typeof p.full_name === 'string' && p.full_name.trim()) {
    return p.full_name.trim();
  }
  const combined = `${p.first_name || ''} ${p.last_name || ''}`.trim();
  if (combined) return combined;
  if (p.patient_id) return `Patient (${p.patient_id})`;
  return 'Patient';
}

export default function CashierPage() {
  const { tenantId, settings, setTenantId } = useClinic();
  const [activeTab, setActiveTab] = useState<'queue' | 'history' | 'reconciliation'>('queue');
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [queueVisits, setQueueVisits] = useState<QueueVisit[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationReport | null>(null);
  const [reconDate, setReconDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSettling, setIsSettling] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Payment form state
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CREDIT_CARD' | 'QR_PAY' | 'BANK_TRANSFER'>('CASH');
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [referenceNote, setReferenceNote] = useState<string>('');
  const [lastPaymentReceipt, setLastPaymentReceipt] = useState<{
    receipt_number: string;
    invoice_number: string;
    patient_name: string;
    token_number: number;
    total: number;
    paid: number;
    change: number;
    method: string;
    date: string;
  } | null>(null);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch Invoices, Queue & Reconciliation data
  const loadCashierData = useCallback(async () => {
    try {
      setIsLoading(true);

      // 1. Invoices
      try {
        const invRes = await ApiClient.get<{ success: boolean; data: InvoiceRecord[] }>('/invoices');
        if (invRes?.success && Array.isArray(invRes.data)) {
          setInvoices(invRes.data);
        }
      } catch (e) {
        console.warn('Could not load invoices:', e);
      }

      // 2. Queue Visits
      try {
        const queueRes = await ApiClient.get<{ success: boolean; data: any }>('/queue');
        if (queueRes?.success && queueRes.data) {
          if (Array.isArray(queueRes.data)) {
            setQueueVisits(queueRes.data);
          } else if (Array.isArray(queueRes.data.waiting_list)) {
            setQueueVisits(queueRes.data.waiting_list);
          }
        }
      } catch (e) {
        console.warn('Could not load queue:', e);
      }

      // 3. Reconciliation Report
      try {
        const reconRes = await ApiClient.get<{ success: boolean; data: ReconciliationReport }>('/reports/reconciliation');
        if (reconRes?.success && reconRes.data) {
          setReconciliation(reconRes.data);
        }
      } catch (e) {
        console.warn('Could not load reconciliation:', e);
      }
    } catch (err: any) {
      console.error('Failed to load cashier billing data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchReconciliationForDate = async (dateStr: string) => {
    try {
      const res = await ApiClient.get<{ success: boolean; data: ReconciliationReport }>(`/reports/reconciliation?date=${dateStr}`);
      if (res?.success && res.data) {
        setReconciliation(res.data);
      }
    } catch (e) {
      console.warn('Could not load reconciliation for date:', e);
    }
  };

  const handleExportReconciliationCsv = () => {
    if (!reconciliation || !reconciliation.transactions) return;

    const headers = ['Time', 'Receipt Number', 'Invoice Number', 'Patient Name', 'Payment Method', 'Cashier', 'Amount (LKR)'];
    const rows = reconciliation.transactions.map(t => [
      t.time,
      t.receipt_number,
      t.invoice_number,
      `"${(t.patient_name || '').replace(/"/g, '""')}"`,
      t.payment_method,
      `"${(t.cashier_name || '').replace(/"/g, '""')}"`,
      Number(t.amount).toFixed(2),
    ]);

    rows.push([]);
    rows.push(['SUMMARY BREAKDOWN', '', '', '', '', '', '']);
    rows.push(['Gross Revenue Total', '', '', '', '', '', Number(reconciliation.total_collected).toFixed(2)]);
    rows.push(['Cash in Drawer', '', '', '', '', '', Number(reconciliation.payment_breakdown.cash).toFixed(2)]);
    rows.push(['Card POS Total', '', '', '', '', '', Number(reconciliation.payment_breakdown.card).toFixed(2)]);
    rows.push(['LankaQR / Online', '', '', '', '', '', Number(reconciliation.payment_breakdown.qr_pay).toFixed(2)]);
    rows.push(['Bank Transfer', '', '', '', '', '', Number(reconciliation.payment_breakdown.bank_transfer).toFixed(2)]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MediFlow_Financial_Report_${reconciliation.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    loadCashierData();
  }, [loadCashierData, tenantId]);

  // WebSocket Live Updates
  useQueueEcho({
    tenantId,
    onQueueUpdated: () => {
      loadCashierData();
    },
    onPatientCalled: () => {},
  });

  // When selecting an invoice or visit
  const handleSelectVisit = async (visitId: number) => {
    try {
      setIsLoading(true);
      const res = await ApiClient.get<{ success: boolean; data: InvoiceRecord }>(`/invoices/visit/${visitId}`);
      if (res?.success && res.data) {
        setSelectedInvoice(res.data);
        setAmountTendered(Number(res.data.balance_due).toString());
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Could not generate bill for this visit.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Change calculator
  const balanceDue = Number(selectedInvoice?.balance_due ?? 0);
  const tenderedNum = parseFloat(amountTendered) || 0;
  const changeDue = Math.max(0, tenderedNum - balanceDue);

  // Settle Payment
  const handleSettle = async () => {
    if (!selectedInvoice) return;

    if (paymentMethod === 'CASH' && tenderedNum < balanceDue) {
      setNotification({
        type: 'error',
        message: 'Amount tendered is less than balance due.',
      });
      return;
    }

    try {
      setIsSettling(true);
      const res = await ApiClient.post<{
        success: boolean;
        message: string;
        data: { invoice: InvoiceRecord; payment: InvoicePayment };
      }>(`/invoices/${selectedInvoice.id}/settle`, {
        payment_method: paymentMethod,
        amount: balanceDue,
        reference_note: referenceNote || undefined,
      });

      if (res?.success) {
        const payment = res.data.payment;
        setLastPaymentReceipt({
          receipt_number: payment.receipt_number,
          invoice_number: selectedInvoice.invoice_number,
          patient_name: getPatientDisplayName(selectedInvoice.patient, selectedInvoice.visit?.patient),
          token_number: selectedInvoice.visit?.token_number || 0,
          total: balanceDue,
          paid: tenderedNum || balanceDue,
          change: changeDue,
          method: paymentMethod,
          date: new Date().toLocaleString(),
        });

        setNotification({
          type: 'success',
          message: `Payment of LKR ${balanceDue.toFixed(2)} settled! Receipt #${payment.receipt_number}`,
        });

        // Trigger thermal receipt print
        setTimeout(() => {
          window.print();
        }, 300);

        setSelectedInvoice(null);
        setAmountTendered('');
        setReferenceNote('');
        await loadCashierData();
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Payment settlement failed.',
      });
    } finally {
      setIsSettling(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  // Waive Pharmacy Fee (Patient buying outside)
  const [isWaivingPharmacy, setIsWaivingPharmacy] = useState<boolean>(false);

  const handleWaivePharmacyFee = async (visitId: number) => {
    if (!confirm('Mark prescription as External & remove pharmacy charges? Patient will buy medicines outside. In-house stock will be restored/untouched, and only Doctor Consultation fee will be charged.')) {
      return;
    }
    try {
      setIsWaivingPharmacy(true);
      const res = await ApiClient.post<{
        success: boolean;
        message: string;
        data: { invoice: InvoiceRecord };
      }>(`/pharmacy/external-visit/${visitId}`);

      if (res?.success) {
        setNotification({
          type: 'success',
          message: 'Pharmacy fee waived! Patient marked for outside pharmacy.',
        });
        if (res.data?.invoice) {
          setSelectedInvoice(res.data.invoice);
          setAmountTendered(Number(res.data.invoice.balance_due).toString());
        }
        await loadCashierData();
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to waive pharmacy fee.',
      });
    } finally {
      setIsWaivingPharmacy(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  // Filtered Invoices
  const unpaidInvoices = useMemo(() => {
    return invoices.filter((inv) => inv.status === 'UNPAID' || inv.status === 'PARTIALLY_PAID');
  }, [invoices]);

  const settledInvoices = useMemo(() => {
    return invoices.filter((inv) => inv.status === 'PAID');
  }, [invoices]);

  const filteredUnpaid = useMemo(() => {
    if (!searchQuery.trim()) return unpaidInvoices;
    const q = searchQuery.toLowerCase();
    return unpaidInvoices.filter((inv) => {
      const invNum = inv.invoice_number.toLowerCase();
      const patient = getPatientDisplayName(inv.patient, inv.visit?.patient).toLowerCase();
      const phone = inv.patient?.phone || inv.visit?.patient?.phone || '';
      const token = inv.visit?.token_number?.toString() || '';
      return invNum.includes(q) || patient.includes(q) || phone.includes(q) || token.includes(q);
    });
  }, [unpaidInvoices, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Thermal Receipt Print Layout (80mm width standard) */}
      <div className="hidden print:block print:w-[80mm] print:p-2 print:text-black print:font-mono print:text-xs">
        {lastPaymentReceipt && (
          <div className="space-y-2">
            <div className="text-center border-b pb-2">
              <h2 className="font-bold text-sm tracking-wide">{settings.clinic_branding.clinic_name}</h2>
              <p className="text-[10px]">{settings.clinic_branding.address || 'Colombo, Sri Lanka'}</p>
              <p className="text-[10px]">Tel: {settings.clinic_branding.phone || '+94 11 234 5678'}</p>
              <div className="mt-1 font-bold border border-black inline-block px-2 py-0.5 text-xs">
                OFFICIAL PAYMENT RECEIPT
              </div>
            </div>

            <div className="border-b pb-1 text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span>Receipt #:</span>
                <strong>{lastPaymentReceipt.receipt_number}</strong>
              </div>
              <div className="flex justify-between">
                <span>Invoice #:</span>
                <span>{lastPaymentReceipt.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Token #:</span>
                <strong>#{lastPaymentReceipt.token_number}</strong>
              </div>
              <div className="flex justify-between">
                <span>Patient:</span>
                <span>{lastPaymentReceipt.patient_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Date/Time:</span>
                <span>{lastPaymentReceipt.date}</span>
              </div>
            </div>

            <div className="border-b pb-2 text-[11px] space-y-1">
              <div className="flex justify-between font-bold">
                <span>Description</span>
                <span>Amount (LKR)</span>
              </div>
              <div className="flex justify-between">
                <span>Medical Consultation & Services</span>
                <span>{lastPaymentReceipt.total.toFixed(2)}</span>
              </div>
              <div className="border-t border-dotted pt-1 flex justify-between font-bold text-xs">
                <span>TOTAL PAID:</span>
                <span>LKR {lastPaymentReceipt.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-700">
                <span>Payment Mode:</span>
                <span>{lastPaymentReceipt.method}</span>
              </div>
              {lastPaymentReceipt.method === 'CASH' && (
                <>
                  <div className="flex justify-between text-[10px]">
                    <span>Amount Tendered:</span>
                    <span>LKR {lastPaymentReceipt.paid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span>Change Returned:</span>
                    <span>LKR {lastPaymentReceipt.change.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="text-[10px] text-center pt-2 space-y-1">
              <p>*** Thank You for Choosing Our Clinic ***</p>
              <p>MediFlow Cashier Settlement Audit System</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Cashier Header */}
      <header className="bg-teal-800 text-white shadow-md print:hidden sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center font-bold text-white shadow-inner">
                <Receipt className="w-5 h-5 text-teal-200" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight flex items-center gap-2">
                  Cashier & Billing Desk
                  <span className="text-[10px] bg-teal-600/80 uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full border border-teal-500">
                    Dual-Mode Engine
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
                {settings.clinic_branding?.clinic_name || 'Clinic Billing'}
              </span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={loadCashierData}
              disabled={isLoading}
              className="p-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-teal-100 transition"
              title="Refresh Billing Queue"
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
              title="Log Out of Billing Workstation"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mode Indicator Banner */}
      <div className="bg-teal-900 text-teal-100 px-4 py-2 border-b border-teal-700 text-xs flex items-center justify-between print:hidden">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-bold uppercase tracking-wider bg-teal-800 text-teal-200 px-2 py-0.5 rounded border border-teal-600">
              Policy: {settings.consultation_payment_timing}
            </span>
            <span>
              {settings.consultation_payment_timing === 'BEFORE' ? (
                <>
                  <strong>Pay-Before Mode:</strong> Collect registration/consultation fee upfront when patient arrives at reception.
                </>
              ) : (
                <>
                  <strong>Pay-After Mode:</strong> Settle combined invoice (Doctor Consultation + Prescribed FIFO Pharmacy Medicines) at patient discharge.
                </>
              )}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-3 py-1 rounded text-xs font-semibold transition ${
                activeTab === 'queue' ? 'bg-teal-600 text-white' : 'text-teal-300 hover:text-white'
              }`}
            >
              Pending Invoices ({unpaidInvoices.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1 rounded text-xs font-semibold transition ${
                activeTab === 'history' ? 'bg-teal-600 text-white' : 'text-teal-300 hover:text-white'
              }`}
            >
              Settled Today ({settledInvoices.length})
            </button>
            <button
              onClick={() => setActiveTab('reconciliation')}
              className={`px-3 py-1 rounded text-xs font-semibold transition ${
                activeTab === 'reconciliation' ? 'bg-teal-600 text-white' : 'text-teal-300 hover:text-white'
              }`}
            >
              Day-End Z-Report
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 print:hidden transition">
          <div
            className={`flex items-center space-x-2 px-4 py-3 rounded-lg shadow-xl text-sm font-medium ${
              notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-80">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Cashier Workspace */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex-1 flex flex-col print:hidden">
        {/* TAB 1: Pending Billing Queue */}
        {activeTab === 'queue' && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Queue List */}
            <div className="w-full lg:w-5/12 flex flex-col space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-teal-700" />
                    Unpaid Invoices Queue
                  </h2>
                  <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                    {unpaidInvoices.length} Unpaid
                  </span>
                </div>

                {/* Search Bar */}
                <div className="relative mb-3">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search token #, invoice #, patient..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                {/* Queue Cards */}
                <div className="space-y-2 max-h-[calc(100vh-290px)] overflow-y-auto pr-1">
                  {filteredUnpaid.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p>All active invoices are settled! No outstanding bills.</p>
                      {queueVisits.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <p className="font-semibold text-slate-600 mb-2">Or select an active visit to generate bill:</p>
                          <div className="flex flex-wrap gap-1.5 justify-center">
                            {queueVisits.slice(0, 5).map((v) => (
                              <button
                                key={v.id}
                                onClick={() => handleSelectVisit(v.id)}
                                className="px-2.5 py-1 bg-teal-50 border border-teal-200 text-teal-800 rounded text-xs font-bold hover:bg-teal-100"
                              >
                                Token #{v.token_number} ({v.patient?.full_name})
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    filteredUnpaid.map((inv) => {
                      const isSelected = selectedInvoice?.id === inv.id;
                      return (
                        <button
                          key={inv.id}
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setAmountTendered(Number(inv.balance_due).toString());
                          }}
                          className={`w-full text-left p-3 rounded-lg border transition ${
                            isSelected
                              ? 'border-teal-600 bg-teal-50/70 shadow-sm ring-1 ring-teal-600'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="w-7 h-7 rounded-md bg-teal-800 text-white font-bold text-xs flex items-center justify-center">
                                #{inv.visit?.token_number || '—'}
                              </span>
                              <div>
                                <div className="font-bold text-xs text-slate-900">
                                  {getPatientDisplayName(inv.patient, inv.visit?.patient)}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  {inv.invoice_number} • {(inv.patient?.patient_id || inv.visit?.patient?.patient_id) ? `${inv.patient?.patient_id || inv.visit?.patient?.patient_id} • ` : ''}{inv.patient?.phone || inv.visit?.patient?.phone || 'No phone'}
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="font-mono font-bold text-xs text-rose-700">
                                LKR {Number(inv.balance_due).toFixed(2)}
                              </span>
                              <div className="text-[10px] text-amber-700 font-semibold uppercase">
                                {inv.status}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Right Settlement Panel */}
            <div className="w-full lg:w-7/12 flex flex-col space-y-4">
              {selectedInvoice ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col space-y-5">
                  {/* Bill Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-xl bg-teal-800 text-white font-black text-xl flex items-center justify-center shadow">
                        #{selectedInvoice.visit?.token_number || '—'}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <span>{getPatientDisplayName(selectedInvoice.patient, selectedInvoice.visit?.patient)}</span>
                          {(selectedInvoice.patient?.patient_id || selectedInvoice.visit?.patient?.patient_id) && (
                            <span className="text-xs font-mono font-bold bg-teal-50 text-teal-800 px-2 py-0.5 rounded border border-teal-200">
                              {selectedInvoice.patient?.patient_id || selectedInvoice.visit?.patient?.patient_id}
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-slate-500">
                          Invoice: <span className="font-mono font-semibold text-teal-800">{selectedInvoice.invoice_number}</span> • Phone: {selectedInvoice.patient?.phone || selectedInvoice.visit?.patient?.phone || '—'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs bg-rose-100 text-rose-800 font-bold px-2.5 py-1 rounded-md border border-rose-200">
                        Balance: LKR {balanceDue.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Bill Itemized Breakdown */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-teal-700" />
                      Invoice Itemized Breakdown
                    </h4>

                    <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 text-xs">
                      <div className="p-3 flex items-center justify-between bg-slate-50/50">
                        <div>
                          <div className="font-semibold text-slate-900">Medical Doctor Consultation</div>
                          <div className="text-[11px] text-slate-500">
                            Dr. {selectedInvoice.visit?.doctor?.user?.name || 'General Practitioner'}
                          </div>
                        </div>
                        <span className="font-mono font-bold text-slate-900">
                          LKR {Number(selectedInvoice.consultation_fee).toFixed(2)}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-2">
                              <span>In-house Pharmacy FIFO Medicines</span>
                              {selectedInvoice.visit?.prescription?.dispense_status === 'EXTERNAL' ? (
                                <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">
                                  External / Outside Rx
                                </span>
                              ) : Number(selectedInvoice.pharmacy_fee) > 0 ? (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded">
                                  {selectedInvoice.visit?.prescription?.dispense_status === 'DISPENSED' ? 'Dispensed' : 'Prescribed (Ready)'}
                                </span>
                              ) : null}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {selectedInvoice.visit?.prescription?.dispense_status === 'EXTERNAL'
                                ? 'Prescription marked external (LKR 0.00)'
                                : Number(selectedInvoice.pharmacy_fee) > 0
                                ? `${selectedInvoice.visit?.prescription?.items?.length || 0} prescribed medicine(s) itemized below`
                                : 'No medicines prescribed or external (LKR 0.00)'}
                            </div>
                          </div>
                          <span className="font-mono font-bold text-slate-900">
                            LKR {Number(selectedInvoice.pharmacy_fee).toFixed(2)}
                          </span>
                        </div>

                        {/* Itemized Medicine List */}
                        {selectedInvoice.visit?.prescription?.items && selectedInvoice.visit.prescription.items.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-slate-200/80 space-y-1.5">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Prescribed Medicines Breakdown:
                            </div>
                            <div className="divide-y divide-slate-200/60 bg-white rounded border border-slate-200 overflow-hidden">
                              {selectedInvoice.visit.prescription.items.map((item, idx) => (
                                <div key={item.id || idx} className="p-2 flex items-center justify-between text-xs hover:bg-slate-50">
                                  <div>
                                    <span className="font-bold text-slate-800">{idx + 1}. {item.medicine_name}</span>
                                    <div className="text-[10px] text-slate-500">
                                      {item.dosage} • {item.frequency} • {item.duration} {item.instructions ? `(${item.instructions})` : ''}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-mono font-semibold text-slate-800">
                                      {item.quantity_prescribed} {item.quantity_prescribed === 1 ? 'unit' : 'units'}
                                      {Number(item.unit_price) > 0 && ` × LKR ${Number(item.unit_price).toFixed(2)}`}
                                    </span>
                                    {Number(item.total_price) > 0 && (
                                      <div className="font-mono font-bold text-teal-800 text-[11px]">
                                        = LKR {Number(item.total_price).toFixed(2)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Option to Waive Pharmacy Fee if buying outside */}
                        {Number(selectedInvoice.pharmacy_fee) > 0 && selectedInvoice.visit_id && (
                          <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between">
                            <span className="text-[11px] text-amber-800 font-medium">
                              Patient taking medicines outside?
                            </span>
                            <button
                              type="button"
                              onClick={() => handleWaivePharmacyFee(selectedInvoice.visit_id)}
                              disabled={isWaivingPharmacy}
                              className="px-2.5 py-1 text-[11px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 rounded border border-amber-300 transition flex items-center gap-1 disabled:opacity-50"
                            >
                              {isWaivingPharmacy ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <X className="w-3 h-3 text-amber-700" />
                              )}
                              <span>Waive Pharmacy Fee (Buying Outside)</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {Number(selectedInvoice.discount_amount) > 0 && (
                        <div className="p-3 flex items-center justify-between text-emerald-700 bg-emerald-50/40">
                          <span>Special Clinic Discount</span>
                          <span className="font-mono font-bold">- LKR {Number(selectedInvoice.discount_amount).toFixed(2)}</span>
                        </div>
                      )}

                      <div className="p-3 flex items-center justify-between bg-teal-50/60 font-bold text-sm">
                        <span className="text-teal-900">Total Payable Amount</span>
                        <span className="font-mono text-teal-900">LKR {balanceDue.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Select Payment Mode
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('CASH')}
                        className={`p-3 rounded-lg border flex flex-col items-center justify-center space-y-1 transition ${
                          paymentMethod === 'CASH'
                            ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold ring-2 ring-teal-600/30'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Banknote className="w-5 h-5 text-emerald-600" />
                        <span className="text-xs">Cash Pay</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('CREDIT_CARD')}
                        className={`p-3 rounded-lg border flex flex-col items-center justify-center space-y-1 transition ${
                          paymentMethod === 'CREDIT_CARD'
                            ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold ring-2 ring-teal-600/30'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <CreditCard className="w-5 h-5 text-blue-600" />
                        <span className="text-xs">Credit/Debit Card</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('QR_PAY')}
                        className={`p-3 rounded-lg border flex flex-col items-center justify-center space-y-1 transition ${
                          paymentMethod === 'QR_PAY'
                            ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold ring-2 ring-teal-600/30'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <QrCode className="w-5 h-5 text-purple-600" />
                        <span className="text-xs">LankaQR Pay</span>
                      </button>
                    </div>
                  </div>

                  {/* Cash Tendered & Immediate Change Calculator */}
                  {paymentMethod === 'CASH' && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">Cash Tendered by Patient (LKR)</label>
                        <div className="flex space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setAmountTendered(balanceDue.toString())}
                            className="px-2 py-0.5 text-[11px] font-bold bg-white border border-slate-300 rounded hover:bg-slate-100"
                          >
                            Exact
                          </button>
                          <button
                            type="button"
                            onClick={() => setAmountTendered((Math.ceil(balanceDue / 500) * 500).toString())}
                            className="px-2 py-0.5 text-[11px] font-bold bg-white border border-slate-300 rounded hover:bg-slate-100"
                          >
                            Round 500
                          </button>
                          <button
                            type="button"
                            onClick={() => setAmountTendered((Math.ceil(balanceDue / 1000) * 1000).toString())}
                            className="px-2 py-0.5 text-[11px] font-bold bg-white border border-slate-300 rounded hover:bg-slate-100"
                          >
                            Round 1000
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <input
                            type="number"
                            step="any"
                            value={amountTendered}
                            onChange={(e) => setAmountTendered(e.target.value)}
                            placeholder="Amount received..."
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-base font-bold font-mono focus:ring-2 focus:ring-teal-600"
                          />
                        </div>

                        <div className="bg-teal-50 border border-teal-200 rounded-lg p-2.5 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-teal-800 font-semibold uppercase tracking-wider block">
                              Change to Return:
                            </span>
                            <span className="text-lg font-black font-mono text-teal-900">
                              LKR {changeDue.toFixed(2)}
                            </span>
                          </div>
                          <CircleDollarSign className="w-6 h-6 text-teal-600 opacity-60" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Settle Action Buttons */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setSelectedInvoice(null)}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleSettle}
                      disabled={isSettling}
                      className="px-6 py-2.5 bg-teal-800 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg flex items-center space-x-2 transition disabled:opacity-50"
                    >
                      {isSettling ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-teal-300" />
                      )}
                      <span>Settle & Print Thermal Receipt (80mm)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-400">
                  <Wallet className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <h3 className="text-sm font-bold text-slate-600">No Invoice Selected</h3>
                  <p className="text-xs mt-1">Select an unpaid invoice or patient visit from the queue to process payment.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Settled Invoices History */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-teal-700" />
                Invoices Settled Today ({settledInvoices.length})
              </h3>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Invoice #</th>
                    <th className="px-4 py-3">Token</th>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Consultation</th>
                    <th className="px-4 py-3">Pharmacy</th>
                    <th className="px-4 py-3">Total Paid</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {settledInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">
                        No invoices settled today yet.
                      </td>
                    </tr>
                  ) : (
                    settledInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-mono font-bold text-teal-900">{inv.invoice_number}</td>
                        <td className="px-4 py-3 font-bold">#{inv.visit?.token_number || '—'}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{getPatientDisplayName(inv.patient, inv.visit?.patient)}</td>
                        <td className="px-4 py-3 font-mono">LKR {Number(inv.consultation_fee).toFixed(2)}</td>
                        <td className="px-4 py-3 font-mono">LKR {Number(inv.pharmacy_fee).toFixed(2)}</td>
                        <td className="px-4 py-3 font-mono font-bold text-emerald-700">
                          LKR {Number(inv.paid_amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                            PAID
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              setLastPaymentReceipt({
                                receipt_number: inv.payments?.[0]?.receipt_number || 'RCP-REPRINT',
                                invoice_number: inv.invoice_number,
                                patient_name: getPatientDisplayName(inv.patient, inv.visit?.patient),
                                token_number: inv.visit?.token_number || 0,
                                total: Number(inv.paid_amount),
                                paid: Number(inv.paid_amount),
                                change: 0,
                                method: inv.payments?.[0]?.payment_method || 'CASH',
                                date: new Date(inv.created_at).toLocaleString(),
                              });
                              setTimeout(() => window.print(), 200);
                            }}
                            className="p-1.5 text-teal-700 hover:bg-teal-50 rounded"
                            title="Reprint Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Day-End Cashier Financial Reconciliation (Z-Report) */}
        {activeTab === 'reconciliation' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Total Gross Revenue
                </span>
                <span className="text-2xl font-black font-mono text-teal-900 mt-1 block">
                  LKR {Number(reconciliation?.total_collected || 0).toFixed(2)}
                </span>
                <span className="text-[11px] text-teal-700 mt-1 block font-medium">
                  {reconciliation?.invoices_summary.fully_paid || 0} Invoices Settled
                </span>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Physical Cash in Drawer
                </span>
                <span className="text-2xl font-black font-mono text-emerald-700 mt-1 block">
                  LKR {Number(reconciliation?.payment_breakdown.cash || 0).toFixed(2)}
                </span>
                <span className="text-[11px] text-emerald-600 mt-1 block font-medium">
                  Matches Physical Drawer Balance
                </span>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Credit / Debit Card Total
                </span>
                <span className="text-2xl font-black font-mono text-blue-700 mt-1 block">
                  LKR {Number(reconciliation?.payment_breakdown.card || 0).toFixed(2)}
                </span>
                <span className="text-[11px] text-blue-600 mt-1 block font-medium">
                  POS Machine Settlement
                </span>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  LankaQR / Online Pay
                </span>
                <span className="text-2xl font-black font-mono text-purple-700 mt-1 block">
                  LKR {Number(reconciliation?.payment_breakdown.qr_pay || 0).toFixed(2)}
                </span>
                <span className="text-[11px] text-purple-600 mt-1 block font-medium">
                  Direct Bank Settlement
                </span>
              </div>
            </div>

            {/* Transactions Journal */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    Cashier Financial Journal (Audit Trail)
                  </h3>
                  <p className="text-xs text-slate-500">Date: {reconciliation?.date || reconDate}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[11px] font-bold text-slate-600">Report Date:</span>
                    <input
                      type="date"
                      value={reconDate}
                      onChange={(e) => {
                        setReconDate(e.target.value);
                        fetchReconciliationForDate(e.target.value);
                      }}
                      className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                    />
                  </div>

                  <button
                    onClick={handleExportReconciliationCsv}
                    className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow transition"
                    title="Download complete transaction journal as CSV spreadsheet"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Export CSV</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="px-3.5 py-2 bg-teal-800 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow transition"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Z-Report</span>
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3">Receipt #</th>
                      <th className="px-4 py-3">Invoice #</th>
                      <th className="px-4 py-3">Patient</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3">Cashier</th>
                      <th className="px-4 py-3 text-right">Amount (LKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {reconciliation?.transactions && reconciliation.transactions.length > 0 ? (
                      reconciliation.transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-mono text-slate-500">{tx.time}</td>
                          <td className="px-4 py-3 font-mono font-bold text-teal-900">{tx.receipt_number}</td>
                          <td className="px-4 py-3 font-mono text-slate-600">{tx.invoice_number}</td>
                          <td className="px-4 py-3 font-medium text-slate-900">{tx.patient_name}</td>
                          <td className="px-4 py-3 font-bold text-[11px] text-slate-700">{tx.payment_method}</td>
                          <td className="px-4 py-3 text-slate-600">{tx.cashier_name}</td>
                          <td className="px-4 py-3 font-mono font-bold text-teal-900 text-right">
                            {Number(tx.amount).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400">
                          No transactions recorded for this reconciliation date.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
