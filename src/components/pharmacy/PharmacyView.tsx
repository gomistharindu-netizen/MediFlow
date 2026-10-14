'use client';

import React, { useState } from 'react';
import { useMediFlow } from '@/context/MediFlowContext';
import { useToast } from '@/components/ui/Toast';
import { SectionHeader, EmptyState } from '@/components/ui/MedicalUI';
import {
  Pill,
  Package,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Layers,
  CreditCard,
  X,
  ChevronRight,
  FlaskConical,
  TrendingDown
} from 'lucide-react';

export const PharmacyView: React.FC = () => {
  const { settings, visits, medicines, dispensePrescription, setActiveView } = useMediFlow();
  const { showToast } = useToast();

  const rxVisits = visits.filter(v => v.prescription && !v.prescription.isDispensed);
  const dispensedVisits = visits.filter(v => v.prescription && v.prescription.isDispensed);

  const [selectedVisitId, setSelectedVisitId] = useState<string>(rxVisits[0]?.id || '');
  const [batchSelections, setBatchSelections] = useState<{ [itemId: string]: { batchNumber: string; quantity: number } }>({});
  const [stockSearch, setStockSearch] = useState('');

  const selectedVisit = visits.find(v => v.id === selectedVisitId);

  React.useEffect(() => {
    if (!selectedVisit?.prescription?.items) return;
    const map: { [itemId: string]: { batchNumber: string; quantity: number } } = {};
    selectedVisit.prescription.items.forEach(item => {
      if (item.dispensedBatch) {
        map[item.id] = { batchNumber: item.dispensedBatch, quantity: item.dispensedQuantity || item.quantityToDispense };
        return;
      }
      const med = medicines.find(m => m.name.toLowerCase().includes(item.medicine.toLowerCase()));
      if (med?.batches.length) {
        const sorted = [...med.batches].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
        map[item.id] = { batchNumber: sorted[0].batchNumber, quantity: item.quantityToDispense };
      } else {
        map[item.id] = { batchNumber: 'STD-BATCH', quantity: item.quantityToDispense };
      }
    });
    setBatchSelections(map);
  }, [selectedVisit?.id]);

  const handleDispense = () => {
    if (!selectedVisit?.prescription) return;
    const assignments = Object.entries(batchSelections).map(([itemId, val]) => ({
      itemId, batchNumber: val.batchNumber, quantity: val.quantity
    }));
    dispensePrescription(selectedVisit.id, assignments);
    showToast('success', `Prescription Dispensed — Token #${selectedVisit.tokenNumber}`, `Stock updated. Bill of Rs. ${selectedVisit.billing.pharmacyFee} forwarded to Cashier.`);
  };

  const filteredMedicines = medicines.filter(m =>
    m.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
    m.category.toLowerCase().includes(stockSearch.toLowerCase())
  );

  const lowStockMeds = medicines.filter(m => m.batches.reduce((s, b) => s + b.stockQuantity, 0) < 100);
  const nearExpiryMeds = medicines.filter(m => m.batches.some(b => b.isNearExpiry));

  return (
    <div className="space-y-5">
      {/* ── Header Bar ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-[#16324F] flex items-center gap-2">
              <Pill className="w-5 h-5 text-[#0F766E]" />
              In-House Pharmacy & Dispensing
            </h1>
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide ${
              settings.pharmacyEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {settings.pharmacyEnabled ? 'Module Active' : 'External Rx Mode'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">FEFO batch tracking · expiry monitoring · automatic stock deduction.</p>
        </div>

        {/* Alerts Strip */}
        <div className="flex items-center gap-2">
          {lowStockMeds.length > 0 && (
            <span className="text-[11px] bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" />
              {lowStockMeds.length} Low Stock
            </span>
          )}
          {nearExpiryMeds.length > 0 && (
            <span className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {nearExpiryMeds.length} Near Expiry
            </span>
          )}
          <span className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-xl font-semibold">
            {rxVisits.length} Pending Rx
          </span>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left: Dispensing Queue */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="p-4 border-b border-slate-100">
            <SectionHeader
              icon={<Clock className="w-4 h-4 text-[#0F766E]" />}
              title="Pending Prescriptions"
              subtitle="Prescriptions from Doctor awaiting dispensing"
            />
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-50 max-h-[580px]">
            {rxVisits.length === 0 && dispensedVisits.length === 0 && (
              <EmptyState
                icon={<Pill className="w-7 h-7" />}
                title="No active prescriptions"
                description="Doctor-issued prescriptions will appear here when patients complete their consultation."
              />
            )}

            {/* Pending */}
            {rxVisits.map(visit => {
              const isSelected = visit.id === selectedVisitId;
              return (
                <div
                  key={visit.id}
                  onClick={() => setSelectedVisitId(visit.id)}
                  className={`p-3.5 cursor-pointer transition hover:bg-amber-50/30 ${
                    isSelected ? 'bg-amber-50/50 border-l-4 border-l-amber-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-sm font-mono">
                        {visit.tokenNumber}
                      </span>
                      <div>
                        <div className="font-semibold text-[#16324F] text-sm">{visit.patientName}</div>
                        <div className="text-[10px] text-slate-400">{visit.prescription?.id} • {visit.prescription?.items.length} meds</div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                      Pending
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Issued at {visit.prescription?.issuedAt}</span>
                    <span className="font-bold text-[#0F766E]">Rs. {visit.billing.pharmacyFee}</span>
                  </div>
                </div>
              );
            })}

            {/* Dispensed */}
            {dispensedVisits.length > 0 && (
              <div className="p-3 bg-slate-50/50">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Already Dispensed</p>
                {dispensedVisits.map(visit => (
                  <div
                    key={visit.id}
                    onClick={() => setSelectedVisitId(visit.id)}
                    className={`p-2.5 rounded-xl mb-1.5 cursor-pointer transition border ${
                      visit.id === selectedVisitId ? 'border-teal-300 bg-teal-50/40' : 'border-transparent hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-mono font-bold text-sm">#{visit.tokenNumber}</span>
                        <span className="font-medium text-slate-700 text-xs">{visit.patientName}</span>
                      </div>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Done {visit.prescription?.dispensedAt}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Dispense Action Area + Inventory */}
        <div className="lg:col-span-2 space-y-5">

          {/* Dispense Card */}
          {selectedVisit?.prescription ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-[#16324F] text-base">Dispense: {selectedVisit.patientName}</h2>
                    <span className="text-xs bg-slate-100 font-mono text-slate-600 px-2 py-0.5 rounded-lg">
                      Token #{selectedVisit.tokenNumber}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Prescribed by {selectedVisit.doctorName} at {selectedVisit.prescription.issuedAt}
                  </p>
                </div>

                {selectedVisit.prescription.isDispensed ? (
                  <span className="shrink-0 bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Dispensed {selectedVisit.prescription.dispensedAt}
                  </span>
                ) : (
                  <button
                    onClick={handleDispense}
                    className="shrink-0 bg-[#0F766E] hover:bg-[#0c5c56] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition active:scale-95"
                  >
                    <Package className="w-4 h-4 text-[#CCFBF1]" />
                    Confirm & Deduct Stock
                  </button>
                )}
              </div>

              <div className="p-4 space-y-3">
                {selectedVisit.prescription.items.map((item, idx) => {
                  const matchedMed = medicines.find(m => m.name.toLowerCase().includes(item.medicine.toLowerCase()));
                  const sel = batchSelections[item.id];
                  const selectedBatch = matchedMed?.batches.find(b => b.batchNumber === sel?.batchNumber);
                  const isDispensed = !!item.dispensedBatch;

                  return (
                    <div key={item.id} className={`rounded-xl border p-4 ${isDispensed ? 'bg-emerald-50/30 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-[#16324F] text-sm">
                            {idx + 1}. {item.medicine} {item.strength && `(${item.strength})`}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {item.dosage} · {item.frequency} · {item.duration}
                          </div>
                          <div className="text-[10px] text-teal-700 font-medium mt-0.5">
                            Patient note: {item.instructions}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[10px] text-slate-500">Required</div>
                          <div className="font-black text-lg font-mono text-[#16324F]">{item.quantityToDispense}</div>
                          <div className="text-[10px] text-slate-400">{matchedMed?.unit || 'units'}</div>
                        </div>
                      </div>

                      {/* Batch Selector Row */}
                      {!isDispensed ? (
                        <div className="mt-3 pt-3 border-t border-slate-200/60 flex flex-col sm:flex-row gap-3 items-start">
                          <div className="flex-1">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                              Batch (FEFO — Earliest Expiry First)
                            </label>
                            {matchedMed?.batches.length ? (
                              <select
                                value={sel?.batchNumber || ''}
                                onChange={e => setBatchSelections({ ...batchSelections, [item.id]: { batchNumber: e.target.value, quantity: sel?.quantity || item.quantityToDispense } })}
                                className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                              >
                                {matchedMed.batches.map(b => (
                                  <option key={b.batchNumber} value={b.batchNumber}>
                                    {b.batchNumber} · Exp {b.expiryDate} · {b.stockQuantity} in stock · Rs.{b.unitPrice}/unit
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-xs text-slate-400">Standard dispense pack</span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            {selectedBatch?.isNearExpiry && (
                              <span className="text-[10px] bg-red-100 text-red-800 border border-red-200 px-2 py-1 rounded-lg font-bold flex items-center gap-1 whitespace-nowrap">
                                <AlertTriangle className="w-3 h-3" />
                                Near Expiry!
                              </span>
                            )}
                            <div className="text-right whitespace-nowrap">
                              <div className="text-[10px] text-slate-400">Line total</div>
                              <div className="font-bold text-[#0F766E] text-sm">
                                Rs. {(selectedBatch?.unitPrice || 0) * item.quantityToDispense}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 text-[11px] text-emerald-700 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3" />
                          Dispensed from batch {item.dispensedBatch} · Qty: {item.dispensedQuantity}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Invoice Total */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500">Pharmacy Invoice Total</div>
                    <div className="text-2xl font-black text-[#16324F] font-mono">Rs. {selectedVisit.billing.pharmacyFee}</div>
                  </div>
                  <button
                    onClick={() => setActiveView('cashier')}
                    className="text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Go to Cashier
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs">
              <EmptyState
                icon={<Pill className="w-8 h-8" />}
                title="No prescription selected"
                description="Select a pending prescription from the left panel to begin dispensing."
              />
            </div>
          )}

          {/* Stock Inventory Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <SectionHeader
                icon={<Layers className="w-4 h-4 text-[#0F766E]" />}
                title="Medicine Stock & Batch Inventory"
                subtitle="Live stock levels with FEFO expiry monitoring"
              />
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter medicines..."
                  value={stockSearch}
                  onChange={e => setStockSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0F766E]/20"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wide border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Medicine</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Batches (Expiry)</th>
                    <th className="py-2.5 px-4 text-right">Stock</th>
                    <th className="py-2.5 px-4 text-right">Unit Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredMedicines.map(med => {
                    const totalStock = med.batches.reduce((s, b) => s + b.stockQuantity, 0);
                    const hasNearExpiry = med.batches.some(b => b.isNearExpiry);
                    const isLowStock = totalStock < 100;

                    return (
                      <tr key={med.id} className={`hover:bg-slate-50/60 transition ${hasNearExpiry || isLowStock ? 'bg-amber-50/20' : ''}`}>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#16324F]">{med.name}</div>
                          {isLowStock && (
                            <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase">Low Stock</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500">{med.category}</td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {med.batches.map(b => (
                              <div key={b.batchNumber} className="flex items-center gap-1.5 text-[11px]">
                                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{b.batchNumber}</span>
                                <span className={b.isNearExpiry ? 'text-red-600 font-bold' : 'text-slate-400'}>
                                  {b.isNearExpiry ? '⚠ ' : ''}Exp: {b.expiryDate}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`font-black font-mono text-sm ${isLowStock ? 'text-red-600' : 'text-emerald-700'}`}>
                            {totalStock}
                          </span>
                          <div className="text-[10px] text-slate-400">{med.unit}s</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          Rs. {med.batches[0]?.unitPrice || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
