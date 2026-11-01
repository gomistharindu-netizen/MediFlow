'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useClinic } from '@/contexts/ClinicContext';
import { ApiClient } from '@/lib/api';
import {
  Calendar,
  Clock,
  ArrowLeft,
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
  Users,
  LogOut,
  Check,
  X,
} from 'lucide-react';

interface DoctorUser {
  id: number;
  name: string;
  email?: string;
}

interface DoctorRecord {
  id: number;
  user_id: number;
  slmc_reg_no: string;
  specialization: string;
  room_number: string;
  consultation_fee: string | number;
  user?: DoctorUser;
}

interface DoctorSessionRecord {
  id: number;
  doctor_id: number;
  session_title: string;
  day_of_week: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  start_time: string;
  end_time: string;
  max_patients: number;
  is_active: boolean;
  doctor?: DoctorRecord;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export default function DoctorSessionsPage() {
  const { tenantId, settings } = useClinic();
  const [sessions, setSessions] = useState<DoctorSessionRecord[]>([]);
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | 'ALL'>('ALL');
  const [selectedDay, setSelectedDay] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Add Session Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    doctor_id: 1,
    session_title: 'Morning Consultation',
    day_of_week: 'Monday' as typeof DAYS_OF_WEEK[number],
    start_time: '08:30',
    end_time: '12:30',
    max_patients: 30,
    is_active: true,
  });

  // Edit Session Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSession, setEditingSession] = useState<DoctorSessionRecord | null>(null);
  const [editForm, setEditForm] = useState({
    session_title: '',
    day_of_week: 'Monday' as typeof DAYS_OF_WEEK[number],
    start_time: '',
    end_time: '',
    max_patients: 30,
    is_active: true,
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [docsRes, sessRes] = await Promise.all([
        ApiClient.get<{ success: boolean; data: DoctorRecord[] }>('/doctors'),
        ApiClient.get<{ success: boolean; data: DoctorSessionRecord[] }>('/doctor-sessions'),
      ]);

      if (docsRes?.success && Array.isArray(docsRes.data)) {
        setDoctors(docsRes.data);
        if (docsRes.data.length > 0) {
          setSessionForm(prev => ({ ...prev, doctor_id: docsRes.data[0].id }));
        }
      }

      if (sessRes?.success && Array.isArray(sessRes.data)) {
        setSessions(sessRes.data);
      }
    } catch {
      // Demo fallback
      setDoctors([
        {
          id: 1,
          user_id: 1,
          slmc_reg_no: 'SLMC-34821',
          specialization: 'Family Medicine / GP',
          room_number: 'Room 01',
          consultation_fee: 1500,
          user: { id: 1, name: 'Dr. Sanath Silva' },
        },
        {
          id: 2,
          user_id: 2,
          slmc_reg_no: 'SLMC-49812',
          specialization: 'Paediatrics',
          room_number: 'Room 02',
          consultation_fee: 2000,
          user: { id: 2, name: 'Dr. Anusha Perera' },
        },
      ]);
      setSessions([
        {
          id: 1,
          doctor_id: 1,
          session_title: 'Morning OPD Clinic',
          day_of_week: 'Monday',
          start_time: '08:30',
          end_time: '12:30',
          max_patients: 30,
          is_active: true,
        },
        {
          id: 2,
          doctor_id: 1,
          session_title: 'Evening Follow-up Session',
          day_of_week: 'Monday',
          start_time: '16:30',
          end_time: '20:00',
          max_patients: 25,
          is_active: true,
        },
        {
          id: 3,
          doctor_id: 1,
          session_title: 'Morning OPD Clinic',
          day_of_week: 'Wednesday',
          start_time: '08:30',
          end_time: '12:30',
          max_patients: 30,
          is_active: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [tenantId, fetchData]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await ApiClient.post<{ success: boolean; data: DoctorSessionRecord }>('/doctor-sessions', sessionForm);
      if (res?.success) {
        setSuccessMsg('Doctor consultation session created successfully!');
        setShowAddModal(false);
        fetchData();
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create session.');
      setTimeout(() => setErrorMsg(null), 5000);
    }
  };

  const handleUpdateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;
    try {
      const res = await ApiClient.put<{ success: boolean; data: DoctorSessionRecord }>(`/doctor-sessions/${editingSession.id}`, editForm);
      if (res?.success) {
        setSuccessMsg('Session updated successfully!');
        setShowEditModal(false);
        fetchData();
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch {
      // Local update fallback
      setSessions(prev => prev.map(s => s.id === editingSession.id ? { ...s, ...editForm } : s));
      setSuccessMsg('Session updated locally!');
      setShowEditModal(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const handleToggleDeactivate = async (session: DoctorSessionRecord) => {
    if (!confirm(`Are you sure you want to deactivate session "${session.session_title}"?`)) return;
    try {
      await ApiClient.delete(`/doctor-sessions/${session.id}`);
      setSuccessMsg('Session deactivated.');
      fetchData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch {
      setSessions(prev => prev.map(s => s.id === session.id ? { ...s, is_active: false } : s));
      setSuccessMsg('Session deactivated locally.');
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const filteredSessions = sessions.filter(s => {
    if (selectedDoctorId !== 'ALL' && s.doctor_id !== selectedDoctorId) return false;
    if (selectedDay !== 'ALL' && s.day_of_week !== selectedDay) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F4F9F8] text-[#243746]">
      {/* Header */}
      <header className="bg-white border-b border-teal-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/doctor" className="p-2 rounded-xl hover:bg-teal-50 text-teal-700 transition" title="Back to Doctor Desk">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-teal-700 flex items-center justify-center text-white">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg text-teal-950">Doctor Session Management</h1>
              <p className="text-xs text-slate-500">{settings.clinic_branding?.clinic_name || 'Clinic'} — Weekly Roster & Slot Capacity</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-200 flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm px-4 py-2 rounded-xl flex items-center gap-1.5 shadow transition"
            >
              <Plus className="w-4 h-4" /> Add Session
            </button>
            <button
              onClick={() => {
                ApiClient.clearSession();
                window.location.href = '/login';
              }}
              className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            {errorMsg}
          </div>
        )}

        {/* Filter Controls */}
        <div className="bg-white rounded-2xl p-4 border border-teal-100 shadow-sm mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">Doctor:</label>
              <select
                value={selectedDoctorId}
                onChange={e => setSelectedDoctorId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="ALL">All Doctors ({doctors.length})</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.user?.name || `Doctor #${d.id}`} ({d.specialization})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">Day of Week:</label>
              <select
                value={selectedDay}
                onChange={e => setSelectedDay(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="ALL">All Days</option>
                {DAYS_OF_WEEK.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-teal-900">{filteredSessions.length}</strong> active scheduled sessions
          </div>
        </div>

        {/* Weekly Timetable Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {DAYS_OF_WEEK.map(day => {
            const daySessions = filteredSessions.filter(s => s.day_of_week === day);
            return (
              <div key={day} className="bg-white rounded-2xl border border-teal-100 shadow-sm overflow-hidden flex flex-col">
                <div className="bg-teal-50/70 border-b border-teal-100 px-4 py-2.5 flex items-center justify-between">
                  <span className="font-extrabold text-sm text-teal-950">{day}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                    {daySessions.length} {daySessions.length === 1 ? 'session' : 'sessions'}
                  </span>
                </div>

                <div className="p-3 space-y-2.5 flex-1">
                  {daySessions.map(session => {
                    const doc = doctors.find(d => d.id === session.doctor_id) || session.doctor;
                    return (
                      <div
                        key={session.id}
                        className={`p-3 rounded-xl border transition ${
                          session.is_active
                            ? 'bg-slate-50/60 border-slate-200 hover:border-teal-300'
                            : 'bg-slate-100/60 border-slate-300 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <h4 className="font-bold text-xs text-slate-900 leading-tight">
                            {session.session_title}
                          </h4>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${session.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                            {session.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <div className="text-[11px] text-teal-800 font-semibold flex items-center gap-1 mb-1">
                          <Stethoscope className="w-3 h-3 text-teal-600" />
                          {doc?.user?.name || `Doctor #${session.doctor_id}`}
                        </div>

                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mb-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {session.start_time.slice(0, 5)} – {session.end_time.slice(0, 5)}
                        </div>

                        <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1.5 border-t border-slate-200/60">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-slate-400" />
                            Max: <strong>{session.max_patients}</strong>
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingSession(session);
                                setEditForm({
                                  session_title: session.session_title,
                                  day_of_week: session.day_of_week,
                                  start_time: session.start_time.slice(0, 5),
                                  end_time: session.end_time.slice(0, 5),
                                  max_patients: session.max_patients,
                                  is_active: session.is_active,
                                });
                                setShowEditModal(true);
                              }}
                              className="p-1 rounded text-slate-500 hover:text-teal-700 hover:bg-teal-50 transition"
                              title="Edit Session"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            {session.is_active && (
                              <button
                                onClick={() => handleToggleDeactivate(session)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                title="Deactivate Session"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {daySessions.length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-xs italic">
                      No sessions scheduled
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Add Session Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-teal-100">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-lg text-teal-950 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-700" /> Add Doctor Session
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>
            <form onSubmit={handleCreateSession} className="space-y-3 text-sm">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Doctor *</label>
                <select
                  value={sessionForm.doctor_id}
                  onChange={e => setSessionForm({ ...sessionForm, doctor_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.user?.name || `Doctor #${d.id}`} — {d.specialization} ({d.room_number || 'Room 01'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Session Title *</label>
                <input
                  type="text"
                  required
                  value={sessionForm.session_title}
                  onChange={e => setSessionForm({ ...sessionForm, session_title: e.target.value })}
                  placeholder="e.g. Morning OPD Consultation"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Day of Week *</label>
                <select
                  value={sessionForm.day_of_week}
                  onChange={e => setSessionForm({ ...sessionForm, day_of_week: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  {DAYS_OF_WEEK.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Start Time (HH:MM) *</label>
                  <input
                    type="time"
                    required
                    value={sessionForm.start_time}
                    onChange={e => setSessionForm({ ...sessionForm, start_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">End Time (HH:MM) *</label>
                  <input
                    type="time"
                    required
                    value={sessionForm.end_time}
                    onChange={e => setSessionForm({ ...sessionForm, end_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Max Patients Allowed *</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  required
                  value={sessionForm.max_patients}
                  onChange={e => setSessionForm({ ...sessionForm, max_patients: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold shadow transition"
                >
                  Save Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Session Modal */}
      {showEditModal && editingSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-teal-100">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-lg text-teal-950 flex items-center gap-2">
                <Edit className="w-5 h-5 text-teal-700" /> Edit Session
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>
            <form onSubmit={handleUpdateSession} className="space-y-3 text-sm">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Session Title *</label>
                <input
                  type="text"
                  required
                  value={editForm.session_title}
                  onChange={e => setEditForm({ ...editForm, session_title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Day of Week *</label>
                <select
                  value={editForm.day_of_week}
                  onChange={e => setEditForm({ ...editForm, day_of_week: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  {DAYS_OF_WEEK.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={editForm.start_time}
                    onChange={e => setEditForm({ ...editForm, start_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={editForm.end_time}
                    onChange={e => setEditForm({ ...editForm, end_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Max Patients Allowed</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  required
                  value={editForm.max_patients}
                  onChange={e => setEditForm({ ...editForm, max_patients: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="session_is_active"
                  checked={editForm.is_active}
                  onChange={e => setEditForm({ ...editForm, is_active: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded"
                />
                <label htmlFor="session_is_active" className="text-xs font-semibold text-slate-700">
                  Active session
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold shadow transition"
                >
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
