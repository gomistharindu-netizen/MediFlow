'use client';

import React, { useState } from 'react';
import { useMediFlow } from '@/context/MediFlowContext';
import { Visit, PaymentMethod } from '@/types/mediflow';
import { useToast } from '@/components/ui/Toast';
import { SectionHeader, EmptyState, StatCard } from '@/components/ui/MedicalUI';
import {
  CreditCard,
  Receipt,
  CheckCircle2,
  Printer,
  FileText,
  User,
  ShieldCheck,
  X,
  Banknote,
  Smartphone,
  Building2,
  DollarSign,
  AlertCircle
} from 'lucide-react';

export const BillingView: React.FC = () => {
  const { settings, visits, collectConsultationFee, collectPharmacyFee, collectAllFees } = useMediFlow();
  const { showToast } = useToast();

  const [selectedVisitId, setSelectedVisitId] = useState<string>(
    visits.find(v => !v.billing.consultationPaid || (!v.billing.pharmacyPaid && v.billing.pharmacyFee > 0))?.id ||
    visits[0]?.id || ''
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const selectedVisit = visits.find(v => v.id === selectedVisitId);

  const pendingAmount = selectedVisit
    ? (!selectedVisit.billing.consultationPaid ? selectedVisit.billing.consultationFee : 0)
      + (!selectedVisit.billing.pharmacyPaid ? selectedVisit.billing.pharmacyFee : 0)
    : 0;

  const handleCollectConsultation = () => {
    if (!selectedVisit) return;
    collectConsultationFee(selectedVisit.id, paymentMethod);
    showToast('success', 'Consultation Fee Collected', `Rs. ${selectedVisit.billing.consultationFee} received via ${paymentMethod}.`);
  };

  const handleCollectPharmacy = () => {
    if (!selectedVisit) return;
    collectPharmacyFee(selectedVisit.id, paymentMethod);
    showToast('success', 'Pharmacy Bill Collected', `Rs. ${selectedVisit.billing.pharmacyFee} received via ${paymentMethod}.`);
  };

  const handleCollectAll = () => {
    if (!selectedVisit) return;
    collectAllFees(selectedVisit.id, paymentMethod);
    showToast('success', `Full Payment Received — Rs. ${selectedVisit.billing.consultationFee + selectedVisit.billing.pharmacyFee}`, `Receipt issued. Payment method: ${paymentMethod}.`);
    setIsReceiptOpen(true);
  };

  // Summary stats
  const paidConsultation = visits.filter(v => v.billing.consultationPaid).reduce((s, v) => s + v.billing.consultationFee, 0);
  const paidPharmacy = visits.filter(v => v.billing.pharmacyPaid).reduce((s, v) => s + v.billing.pharmacyFee, 0);
  const pendingTotal = visits.reduce((s, v) => {
    return s + (!v.billing.consultationPaid ? v.billing.consultationFee : 0) + (!v.billing.pharmacyPaid ? v.billing.pharmacyFee : 0);
  }, 0);

  const paymentIcons: Record<PaymentMethod, React.ReactNode> = {
    'Cash': <Banknote className="w-4 h-4" />,
    'Card': <CreditCard className="w-4 h-4" />,
    'Bank Transfer': <Building2 className="w-4 h-4" />
  };

  return (
    <div className="space-y-5">
      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard
          label="Total Collected Today"
          value={`Rs. ${(paidConsultation + paidPharmacy).toLocaleString()}`}
          subLabel="Consultation + Pharmacy"
          accent="emerald"
          icon={<DollarSign className="w-5 h-5 text-emerald-700" />}
        />
        <StatCard
          label="Consultation Revenue"
          value={`Rs. ${paidConsultation.toLocaleString()}`}
          subLabel={`${visits.filter(v => v.billing.consultationPaid).length} visits settled`}
          accent="teal"
          icon={<User className="w-5 h-5 text-teal-700" />}
        />
        <StatCard
          label="Outstanding Balance"
          value={`Rs. ${pendingTotal.toLocaleString()}`}
          subLabel="Across all unpaid visits"
          accent={pendingTotal > 0 ? 'amber' : 'slate'}
          icon={<AlertCircle className="w-5 h-5 text-amber-700" />}
        />
      </div>

      {/* ── Top Bar ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-[#16324F] flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#0F766E]" />
              Cashier & Patient Billing
            </h1>
            <span className="text-[10px] bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full font-bold">
              {settings.consultationFeeMode === 'BEFORE' ? 'Pre-Pay Mode' : 'Post-Consultation Mode'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Separate consultation and pharmacy invoices with individual or combined collection.</p>
        </div>

        {/* Payment Method Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Pay via:</span>
          <div className="flex items-center gap-1">
            {(['Cash', 'Card', 'Bank Transfer'] as PaymentMethod[]).map(method => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  paymentMethod === method
                    ? 'bg-[#0F766E] text-white shadow-sm'
                    : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {paymentIcons[method]}
                {method}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left: Patient Invoice List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="p-4 border-b border-slate-100">
            <SectionHeader
              icon={<Receipt className="w-4 h-4 text-[#0F766E]" />}
              title="Session Invoices"
              subtitle={`${visits.length} visits today`}
            />
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-50 max-h-[580px]">
            {visits.map(visit => {
              const isSelected = visit.id === selectedVisitId;
              const consultPaid = visit.billing.consultationPaid;
              const pharmacyPaid = !visit.billing.pharmacyFee || visit.billing.pharmacyPaid;
              const isFullyPaid = consultPaid && pharmacyPaid;
              const totalAmt = visit.billing.consultationFee + visit.billing.pharmacyFee;

              return (
                <div
                  key={visit.id}
                  onClick={() => setSelectedVisitId(visit.id)}
                  className={`p-3.5 cursor-pointer transition hover:bg-slate-50/50 ${
                    isSelected ? 'bg-teal-50/40 border-l-4 border-l-[#0F766E]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-black font-mono text-sm shrink-0 ${
                        isFullyPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {visit.tokenNumber}
                      </span>
                      <div>
                        <div className="font-semibold text-[#16324F] text-sm">{visit.patientName}</div>
                        <div className="text-[10px] text-slate-400">{visit.bookingRef}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-[#16324F] font-mono text-sm">Rs. {totalAmt}</div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        isFullyPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isFullyPaid ? '✓ Paid' : 'Due'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      consultPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}>
                      Consult: {consultPaid ? 'Paid' : `Rs.${visit.billing.consultationFee} Due`}
                    </span>
                    {visit.billing.pharmacyFee > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        pharmacyPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
                      }`}>
                        Rx: {pharmacyPaid ? 'Paid' : `Rs.${visit.billing.pharmacyFee} Due`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Invoice Detail & Payment */}
        {selectedVisit ? (
          <div className="lg:col-span-2 space-y-4">
            {/* Patient Invoice Header */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-[#16324F] text-lg">{selectedVisit.patientName}</h2>
                    <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">Token #{selectedVisit.tokenNumber}</span>
                    <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">{selectedVisit.patientId}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Doctor: <strong>{selectedVisit.doctorName}</strong> · {selectedVisit.sessionName}</p>
                </div>

                {selectedVisit.billing.receiptNumber && (
                  <button
                    onClick={() => setIsReceiptOpen(true)}
                    className="border border-teal-500 text-[#0F766E] hover:bg-teal-50 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    View Receipt
                  </button>
                )}
              </div>

              {/* Dual Invoice Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {/* Consultation Invoice */}
                <div className={`rounded-xl border p-4 space-y-3 ${
                  selectedVisit.billing.consultationPaid
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : 'border-slate-200 bg-slate-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#16324F] text-sm flex items-center gap-1.5">
                      <User className="w-4 h-4 text-[#0F766E]" />
                      Consultation Fee
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedVisit.billing.consultationPaid
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedVisit.billing.consultationPaid ? '✓ PAID' : 'UNPAID'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px] text-slate-600">
                    <div className="flex justify-between"><span>Doctor:</span><strong className="text-slate-800">{selectedVisit.doctorName}</strong></div>
                    <div className="flex justify-between"><span>Session:</span><span>General GP</span></div>
                    {selectedVisit.billing.consultationPaymentTime && (
                      <div className="flex justify-between text-emerald-700 font-medium">
                        <span>Paid at:</span><span>{selectedVisit.billing.consultationPaymentTime}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-600">Charge:</span>
                    <span className="text-2xl font-black font-mono text-[#16324F]">Rs. {selectedVisit.billing.consultationFee}</span>
                  </div>

                  {!selectedVisit.billing.consultationPaid && (
                    <button
                      onClick={handleCollectConsultation}
                      className="w-full bg-[#0F766E] hover:bg-[#0c5c56] text-white py-2.5 rounded-xl font-bold text-xs transition active:scale-95"
                    >
                      Collect Consultation Fee
                    </button>
                  )}
                </div>

                {/* Pharmacy Invoice */}
                <div className={`rounded-xl border p-4 space-y-3 ${
                  selectedVisit.billing.pharmacyFee === 0
                    ? 'border-slate-100 bg-slate-50/30'
                    : selectedVisit.billing.pharmacyPaid
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : 'border-slate-200 bg-slate-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#16324F] text-sm flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#0F766E]" />
                      Pharmacy Bill
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedVisit.billing.pharmacyFee === 0
                        ? 'bg-slate-100 text-slate-500'
                        : selectedVisit.billing.pharmacyPaid
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {selectedVisit.billing.pharmacyFee === 0 ? 'N/A' : selectedVisit.billing.pharmacyPaid ? '✓ PAID' : 'PENDING'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[11px] text-slate-600">
                    <div className="flex justify-between">
                      <span>Prescription:</span>
                      <span className="font-mono">{selectedVisit.prescription?.id || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span>{selectedVisit.prescription?.isDispensed ? 'Dispensed ✓' : 'Not yet dispensed'}</span>
                    </div>
                    {selectedVisit.billing.pharmacyPaymentTime && (
                      <div className="flex justify-between text-emerald-700 font-medium">
                        <span>Paid at:</span><span>{selectedVisit.billing.pharmacyPaymentTime}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-600">Charge:</span>
                    <span className={`text-2xl font-black font-mono ${selectedVisit.billing.pharmacyFee === 0 ? 'text-slate-400' : 'text-[#16324F]'}`}>
                      Rs. {selectedVisit.billing.pharmacyFee}
                    </span>
                  </div>

                  {selectedVisit.billing.pharmacyFee > 0 && !selectedVisit.billing.pharmacyPaid && (
                    <button
                      onClick={handleCollectPharmacy}
                      className="w-full bg-[#16324F] hover:bg-[#1a3d61] text-white py-2.5 rounded-xl font-bold text-xs transition active:scale-95"
                    >
                      Collect Medicine Bill
                    </button>
                  )}
                </div>
              </div>

              {/* Combined Settle All */}
              {pendingAmount > 0 && (
                <div className="mt-4 p-4 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl border border-teal-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-slate-600 block font-medium">Total Outstanding Balance</span>
                    <span className="text-3xl font-black text-[#16324F] font-mono">Rs. {pendingAmount}</span>
                    <span className="text-xs text-slate-500 block mt-0.5">via <strong>{paymentMethod}</strong></span>
                  </div>
                  <button
                    onClick={handleCollectAll}
                    className="bg-[#0F766E] hover:bg-[#0c5c56] text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg flex items-center gap-2.5 transition active:scale-95 whitespace-nowrap"
                  >
                    <ShieldCheck className="w-5 h-5 text-[#CCFBF1]" />
                    Settle All & Issue Receipt
                  </button>
                </div>
              )}

              {pendingAmount === 0 && (
                <div className="mt-4 p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  All charges for this visit have been settled. Receipt: {selectedVisit.billing.receiptNumber || 'Issued'}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <EmptyState
              icon={<Receipt className="w-8 h-8" />}
              title="No visit selected"
              description="Click on a patient from the invoice list on the left to view charges and collect payment."
            />
          </div>
        )}
      </div>

      {/* ════ MODAL: RECEIPT ════ */}
      {isReceiptOpen && selectedVisit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#16324F] text-white px-5 py-4 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#CCFBF1]" />
                Official Payment Receipt
              </h3>
              <button onClick={() => setIsReceiptOpen(false)} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 font-sans text-slate-800 space-y-4">
              {/* Letterhead */}
              <div className="text-center border-b-2 border-dashed border-slate-300 pb-4">
                <h2 className="text-lg font-black text-teal-800 uppercase tracking-wider">MediFlow Clinic</h2>
                <p className="text-[10px] text-slate-500">No. 45, Kynsey Road, Colombo 08 · Tel: 011 269 8812</p>
                <div className="mt-2 inline-block bg-emerald-100 text-emerald-800 font-bold text-xs px-3 py-1 rounded-full">
                  {selectedVisit.billing.receiptNumber || 'Receipt Issued'}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>

              {/* Patient Details */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-slate-500">Patient:</span><strong>{selectedVisit.patientName}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">Patient ID:</span><span className="font-mono">{selectedVisit.patientId}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Token / Ref:</span><span className="font-mono">#{selectedVisit.tokenNumber} ({selectedVisit.bookingRef})</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Doctor:</span><span>{selectedVisit.doctorName}</span></div>
              </div>

              {/* Itemized Charges */}
              <div className="border-t border-b border-dashed border-slate-300 py-3 space-y-2.5">
                <div className="flex justify-between text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  <span>Item</span><span>Amount (LKR)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700">Doctor Consultation</span>
                  <span className="font-mono font-semibold">{selectedVisit.billing.consultationFee.toFixed(2)}</span>
                </div>
                {selectedVisit.billing.pharmacyFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-700">Pharmacy — Medicines Dispensed</span>
                    <span className="font-mono font-semibold">{selectedVisit.billing.pharmacyFee.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center">
                <span className="font-black text-sm text-slate-700">TOTAL PAID</span>
                <span className="font-black text-2xl text-teal-800 font-mono">
                  Rs. {(selectedVisit.billing.consultationFee + selectedVisit.billing.pharmacyFee).toFixed(2)}
                </span>
              </div>
              <div className="text-xs text-slate-500 text-right">
                Payment via: <strong>{selectedVisit.billing.paymentMethod || paymentMethod}</strong>
              </div>

              <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                Thank you for visiting MediFlow Clinic. We wish you good health!
              </div>
            </div>

            <div className="px-5 pb-5 shrink-0">
              <button
                onClick={() => window.print()}
                className="w-full bg-[#0F766E] text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[#0c5c56] transition"
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
