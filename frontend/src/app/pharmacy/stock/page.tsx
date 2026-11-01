'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useClinic } from '@/contexts/ClinicContext';
import { ApiClient } from '@/lib/api';
import {
  Pill,
  ArrowLeft,
  Plus,
  RefreshCw,
  Search,
  AlertTriangle,
  CheckCircle2,
  Package,
  Calendar,
  Edit,
  X,
  Boxes,
  LogOut,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface MedicineBatch {
  id: number;
  batch_number: string;
  expiry_date: string;
  quantity_received: number;
  quantity_available: number;
  purchase_unit_price: string | number;
  selling_unit_price: string | number;
  supplier_name?: string;
  created_at: string;
}

interface MedicineRecord {
  id: number;
  name: string;
  generic_name: string;
  dosage_form: string;
  strength: string;
  unit: string;
  reorder_level: number;
  is_active: boolean;
  total_stock: number;
  batches?: MedicineBatch[];
}

const DOSAGE_FORMS = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drops', 'Inhaler', 'Patch', 'Suppository', 'Other'];

export default function MedicineStockPage() {
  const { tenantId } = useClinic();
  const [medicines, setMedicines] = useState<MedicineRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Add Medicine Modal
  const [showAddMedicine, setShowAddMedicine] = useState(false);
  const [medicineForm, setMedicineForm] = useState({
    name: '', generic_name: '', dosage_form: 'Tablet',
    strength: '', unit: 'tablets', reorder_level: 50,
  });

  // Add Batch Modal
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [batchTargetMedicine, setBatchTargetMedicine] = useState<MedicineRecord | null>(null);
  const [batchForm, setBatchForm] = useState({
    batch_number: '', expiry_date: '', quantity_received: 100,
    purchase_unit_price: 0, selling_unit_price: 0, supplier_name: '',
  });

  // Edit Medicine Modal
  const [showEditMedicine, setShowEditMedicine] = useState(false);
  const [editTarget, setEditTarget] = useState<MedicineRecord | null>(null);
  const [editForm, setEditForm] = useState({ name: '', generic_name: '', strength: '', reorder_level: 50, is_active: true });

  // Expanded rows (show batches)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [batchDetails, setBatchDetails] = useState<Record<number, MedicineBatch[]>>({});

  const fetchMedicines = useCallback(async (search = '') => {
    setIsLoading(true);
    try {
      const res = await ApiClient.get<{ success: boolean; data: MedicineRecord[] }>(`/medicines?search=${encodeURIComponent(search)}&show_all=1`);
      if (res?.success && Array.isArray(res.data)) {
        setMedicines(res.data);
      }
    } catch {
      // Demo fallback
      setMedicines([
        { id: 1, name: 'Panadol 500mg', generic_name: 'Paracetamol', dosage_form: 'Tablet', strength: '500mg', unit: 'tablets', reorder_level: 100, is_active: true, total_stock: 450 },
        { id: 2, name: 'Cetirizine 10mg', generic_name: 'Cetirizine HCl', dosage_form: 'Tablet', strength: '10mg', unit: 'tablets', reorder_level: 50, is_active: true, total_stock: 30 },
        { id: 3, name: 'Omeprazole 20mg', generic_name: 'Omeprazole', dosage_form: 'Capsule', strength: '20mg', unit: 'capsules', reorder_level: 60, is_active: true, total_stock: 0 },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchMedicines(searchQuery); }, [tenantId, searchQuery, fetchMedicines]);

  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await ApiClient.post<{ success: boolean; data: MedicineRecord }>('/medicines', medicineForm);
      if (res?.success) {
        setSuccessMsg(`Medicine "${res.data.name}" added to catalog!`);
        setShowAddMedicine(false);
        setMedicineForm({ name: '', generic_name: '', dosage_form: 'Tablet', strength: '', unit: 'tablets', reorder_level: 50 });
        fetchMedicines(searchQuery);
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add medicine.');
      setTimeout(() => setErrorMsg(null), 5000);
    }
  };

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchTargetMedicine) return;
    try {
      const res = await ApiClient.post<{ success: boolean; data: MedicineBatch }>(`/medicines/${batchTargetMedicine.id}/batches`, batchForm);
      if (res?.success) {
        setSuccessMsg(`Batch ${res.data.batch_number} added — ${batchForm.quantity_received} units stocked for ${batchTargetMedicine.name}!`);
        setShowAddBatch(false);
        setBatchForm({ batch_number: '', expiry_date: '', quantity_received: 100, purchase_unit_price: 0, selling_unit_price: 0, supplier_name: '' });
        fetchMedicines(searchQuery);
        setTimeout(() => setSuccessMsg(null), 5000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add batch.');
      setTimeout(() => setErrorMsg(null), 5000);
    }
  };

  const handleEditMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    try {
      const res = await ApiClient.put<{ success: boolean; data: MedicineRecord }>(`/medicines/${editTarget.id}`, editForm);
      if (res?.success) {
        setSuccessMsg(`Medicine "${res.data.name}" updated!`);
        setShowEditMedicine(false);
        fetchMedicines(searchQuery);
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch {
      setMedicines(prev => prev.map(m => m.id === editTarget.id ? { ...m, ...editForm } : m));
      setSuccessMsg('Medicine updated locally!');
      setShowEditMedicine(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const toggleExpand = async (med: MedicineRecord) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(med.id)) {
      newSet.delete(med.id);
    } else {
      newSet.add(med.id);
      if (!batchDetails[med.id]) {
        try {
          const res = await ApiClient.get<{ success: boolean; data: MedicineRecord }>(`/medicines/${med.id}`);
          if (res?.success && res.data?.batches) {
            setBatchDetails(prev => ({ ...prev, [med.id]: res.data.batches || [] }));
          }
        } catch {}
      }
    }
    setExpandedIds(newSet);
  };

  const isExpiringSoon = (dateStr: string) => {
    const days = (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days <= 90;
  };

  const filtered = medicines.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.generic_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F4F9F8] text-[#243746]">
      <header className="bg-white border-b border-teal-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/pharmacy" className="p-2 rounded-xl hover:bg-teal-50 text-teal-700 transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-teal-700 flex items-center justify-center text-white">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg text-teal-950">Medicine Stock Management</h1>
              <p className="text-xs text-slate-500">Pharmacy Catalog & FIFO Inventory</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchMedicines(searchQuery)} disabled={isLoading}
              className="text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-200 flex items-center gap-1.5 transition">
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button onClick={() => setShowAddMedicine(true)}
              className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm px-4 py-2 rounded-xl flex items-center gap-1.5 shadow transition">
              <Plus className="w-4 h-4" /> Add Medicine
            </button>
            <button onClick={() => { ApiClient.clearSession(); window.location.href = '/login'; }}
              className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />{successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />{errorMsg}
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-2xl p-4 border border-teal-100 shadow-sm mb-4">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input type="text" placeholder="Search by brand name or generic name..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-white rounded-xl p-4 border border-teal-100 shadow-sm">
            <div className="text-2xl font-black text-teal-800">{medicines.length}</div>
            <div className="text-xs text-slate-500 font-semibold mt-1">Total Medicines</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm">
            <div className="text-2xl font-black text-amber-700">{medicines.filter(m => m.total_stock <= m.reorder_level && m.total_stock > 0).length}</div>
            <div className="text-xs text-slate-500 font-semibold mt-1">Low Stock (≤ Reorder Level)</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-rose-100 shadow-sm">
            <div className="text-2xl font-black text-rose-700">{medicines.filter(m => m.total_stock === 0).length}</div>
            <div className="text-xs text-slate-500 font-semibold mt-1">Out of Stock</div>
          </div>
        </div>

        {/* Medicine Table */}
        <div className="bg-white rounded-2xl border border-teal-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-teal-50/60 border-b border-teal-100 text-teal-950 font-bold">
                  <th className="py-3 px-4 w-6"></th>
                  <th className="py-3 px-4">Medicine</th>
                  <th className="py-3 px-4">Form / Strength</th>
                  <th className="py-3 px-4 text-center">Stock</th>
                  <th className="py-3 px-4 text-center">Reorder At</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((med) => {
                  const isLow = med.total_stock > 0 && med.total_stock <= med.reorder_level;
                  const isOut = med.total_stock === 0;
                  const isExpanded = expandedIds.has(med.id);
                  return (
                    <React.Fragment key={med.id}>
                      <tr className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4">
                          <button onClick={() => toggleExpand(med)}
                            className="text-slate-400 hover:text-teal-700 transition">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{med.name}</div>
                          <div className="text-[11px] text-slate-500">{med.generic_name}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[11px] font-semibold">{med.dosage_form}</span>
                          {med.strength && <span className="ml-1 text-[11px] text-slate-500">{med.strength}</span>}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-black text-base ${isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-teal-800'}`}>
                            {med.total_stock}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1">{med.unit}</span>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-500 text-xs">{med.reorder_level}</td>
                        <td className="py-3 px-4 text-center">
                          {isOut ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                              <AlertTriangle className="w-3 h-3" /> Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              ⚠️ Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> In Stock
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => {
                              setBatchTargetMedicine(med);
                              setShowAddBatch(true);
                            }}
                              className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition">
                              <Plus className="w-3 h-3" /> Add Stock
                            </button>
                            <button onClick={() => {
                              setEditTarget(med);
                              setEditForm({ name: med.name, generic_name: med.generic_name, strength: med.strength, reorder_level: med.reorder_level, is_active: med.is_active });
                              setShowEditMedicine(true);
                            }}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 transition flex items-center gap-1">
                              <Edit className="w-3 h-3" /> Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="bg-slate-50/80 px-6 py-3 border-b border-slate-200">
                            <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                              <Package className="w-3.5 h-3.5 text-teal-700" /> Stock Batches (FIFO Order — Earliest Expiry First)
                            </div>
                            {(batchDetails[med.id] || []).length === 0 ? (
                              <p className="text-xs text-slate-400 italic">No batch data — click "Add Stock" to add a batch.</p>
                            ) : (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-slate-500 font-semibold border-b border-slate-200">
                                    <th className="py-1.5 text-left">Batch #</th>
                                    <th className="py-1.5 text-left">Expiry</th>
                                    <th className="py-1.5 text-center">Received</th>
                                    <th className="py-1.5 text-center">Available</th>
                                    <th className="py-1.5 text-left">Supplier</th>
                                    <th className="py-1.5 text-right">Selling Price</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {(batchDetails[med.id] || []).map(batch => (
                                    <tr key={batch.id} className={isExpiringSoon(batch.expiry_date) ? 'bg-amber-50/60' : ''}>
                                      <td className="py-1.5 font-mono font-bold text-teal-800">{batch.batch_number}</td>
                                      <td className="py-1.5">
                                        <span className={`font-semibold ${isExpiringSoon(batch.expiry_date) ? 'text-amber-700' : 'text-slate-700'}`}>
                                          {isExpiringSoon(batch.expiry_date) && '⚠️ '}{batch.expiry_date}
                                        </span>
                                      </td>
                                      <td className="py-1.5 text-center text-slate-600">{batch.quantity_received}</td>
                                      <td className="py-1.5 text-center font-bold text-teal-800">{batch.quantity_available}</td>
                                      <td className="py-1.5 text-slate-500">{batch.supplier_name || '—'}</td>
                                      <td className="py-1.5 text-right font-semibold text-slate-800">Rs. {Number(batch.selling_unit_price).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {filtered.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                      No medicines found. <button onClick={() => setShowAddMedicine(true)} className="text-teal-700 font-bold underline ml-1">Add the first medicine →</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add Medicine Modal */}
      {showAddMedicine && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-teal-100">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-lg text-teal-950 flex items-center gap-2"><Pill className="w-5 h-5 text-teal-700" /> Add New Medicine</h3>
              <button onClick={() => setShowAddMedicine(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>
            <form onSubmit={handleAddMedicine} className="space-y-3 text-sm">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Brand Name *</label>
                <input type="text" required value={medicineForm.name}
                  onChange={e => setMedicineForm({ ...medicineForm, name: e.target.value })}
                  placeholder="e.g. Panadol 500mg"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Generic Name</label>
                <input type="text" value={medicineForm.generic_name}
                  onChange={e => setMedicineForm({ ...medicineForm, generic_name: e.target.value })}
                  placeholder="e.g. Paracetamol"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Dosage Form *</label>
                  <select value={medicineForm.dosage_form}
                    onChange={e => setMedicineForm({ ...medicineForm, dosage_form: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none">
                    {DOSAGE_FORMS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Strength</label>
                  <input type="text" value={medicineForm.strength}
                    onChange={e => setMedicineForm({ ...medicineForm, strength: e.target.value })}
                    placeholder="e.g. 500mg"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Unit *</label>
                  <input type="text" required value={medicineForm.unit}
                    onChange={e => setMedicineForm({ ...medicineForm, unit: e.target.value })}
                    placeholder="e.g. tablets"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Reorder Level</label>
                  <input type="number" min={0} value={medicineForm.reorder_level}
                    onChange={e => setMedicineForm({ ...medicineForm, reorder_level: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddMedicine(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-semibold text-slate-600 hover:bg-slate-100 transition">Cancel</button>
                <button type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold shadow transition">
                  <Plus className="w-4 h-4 inline mr-1" />Add Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Batch Modal */}
      {showAddBatch && batchTargetMedicine && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-teal-100">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-lg text-teal-950 flex items-center gap-2"><Package className="w-5 h-5 text-teal-700" /> Add Stock Batch</h3>
                <p className="text-xs text-slate-500">{batchTargetMedicine.name} ({batchTargetMedicine.generic_name})</p>
              </div>
              <button onClick={() => setShowAddBatch(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>
            <form onSubmit={handleAddBatch} className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Batch Number *</label>
                  <input type="text" required value={batchForm.batch_number}
                    onChange={e => setBatchForm({ ...batchForm, batch_number: e.target.value })}
                    placeholder="e.g. BT-2026-001"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Expiry Date *</label>
                  <input type="date" required value={batchForm.expiry_date}
                    onChange={e => setBatchForm({ ...batchForm, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Quantity Received *</label>
                <input type="number" required min={1} value={batchForm.quantity_received}
                  onChange={e => setBatchForm({ ...batchForm, quantity_received: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Purchase Price (Rs.)</label>
                  <input type="number" min={0} step="0.01" value={batchForm.purchase_unit_price}
                    onChange={e => setBatchForm({ ...batchForm, purchase_unit_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Selling Price (Rs.) *</label>
                  <input type="number" required min={0} step="0.01" value={batchForm.selling_unit_price}
                    onChange={e => setBatchForm({ ...batchForm, selling_unit_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Supplier Name</label>
                <input type="text" value={batchForm.supplier_name}
                  onChange={e => setBatchForm({ ...batchForm, supplier_name: e.target.value })}
                  placeholder="e.g. CIC Pharmaceuticals"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none" />
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddBatch(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-semibold text-slate-600 hover:bg-slate-100 transition">Cancel</button>
                <button type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold shadow transition">
                  Add Stock Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Medicine Modal */}
      {showEditMedicine && editTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-teal-100">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-lg text-teal-950 flex items-center gap-2"><Edit className="w-5 h-5 text-teal-700" /> Edit Medicine</h3>
              <button onClick={() => setShowEditMedicine(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>
            <form onSubmit={handleEditMedicine} className="space-y-3 text-sm">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Brand Name *</label>
                <input type="text" required value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Generic Name</label>
                <input type="text" value={editForm.generic_name}
                  onChange={e => setEditForm({ ...editForm, generic_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Strength</label>
                  <input type="text" value={editForm.strength}
                    onChange={e => setEditForm({ ...editForm, strength: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Reorder Level</label>
                  <input type="number" min={0} value={editForm.reorder_level}
                    onChange={e => setEditForm({ ...editForm, reorder_level: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_active_edit" checked={editForm.is_active}
                  onChange={e => setEditForm({ ...editForm, is_active: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded" />
                <label htmlFor="is_active_edit" className="text-sm text-slate-700 font-medium">Active in catalog</label>
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowEditMedicine(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-semibold text-slate-600 hover:bg-slate-100 transition">Cancel</button>
                <button type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold shadow transition">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
