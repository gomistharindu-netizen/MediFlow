'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useClinic } from '@/contexts/ClinicContext';
import { ApiClient } from '@/lib/api';
import { useQueueEcho, PatientCalledPayload, QueueUpdatedPayload } from '@/hooks/useQueueEcho';
import { Tv, Volume2, ArrowLeft, Clock, Stethoscope, Wifi, WifiOff, BellRing, Sparkles } from 'lucide-react';

export default function WaitingRoomTvDisplay() {
  const { tenantId, settings } = useClinic();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  
  // Realtime Active Token
  const [servingToken, setServingToken] = useState<number | null>(null);
  const [servingDoctor, setServingDoctor] = useState<string>('Dr. Sanath Silva');
  const [servingRoom, setServingRoom] = useState<string>('Room 01');
  const [servingPatient, setServingPatient] = useState<string>('');
  const [isFlashing, setIsFlashing] = useState<boolean>(false);

  // Waiting & Missed Queues
  const [waitingTokens, setWaitingTokens] = useState<number[]>([]);
  const [missedTokens, setMissedTokens] = useState<number[]>([]);
  const [announcementText, setAnnouncementText] = useState<string | null>(null);

  // Audio Chime Generator using HTML5 Web Audio API
  const playChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      
      // Tone 1: E5 (659.25 Hz)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, audioCtx.currentTime);
      gain1.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.8);

      // Tone 2: C5 (523.25 Hz)
      setTimeout(() => {
        try {
          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(523.25, audioCtx.currentTime);
          gain2.gain.setValueAtTime(0.4, audioCtx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          osc2.start();
          osc2.stop(audioCtx.currentTime + 1.2);
        } catch {}
      }, 250);
    } catch {
      // Audio autoplay policy fallback
    }
  }, []);

  // Fetch initial queue from backend API
  const fetchQueue = useCallback(async () => {
    try {
      const res = await ApiClient.get<{ success: boolean; data: any }>('/queue?doctor_id=1');
      if (res.success && res.data) {
        const q = res.data;
        const activeVisit = q.called || q.in_consultation || (q.waiting_list && q.waiting_list.length > 0 ? q.waiting_list[0] : null);

        if (activeVisit) {
          setServingToken(activeVisit.token_number);
          setServingDoctor(activeVisit.doctor?.user?.name || 'Dr. Sanath Silva');
          setServingRoom(activeVisit.doctor?.room_number || 'Room 01');
          const pName = activeVisit.patient
            ? `${activeVisit.patient.first_name || ''} ${activeVisit.patient.last_name || ''}`.trim()
            : '';
          setServingPatient(pName);
        } else {
          setServingToken(null);
          setServingPatient('');
        }

        if (Array.isArray(q.waiting_list)) {
          const upcoming = q.waiting_list
            .filter((v: any) => !activeVisit || v.token_number !== activeVisit.token_number)
            .map((v: any) => v.token_number);
          setWaitingTokens(upcoming);
        } else {
          setWaitingTokens([]);
        }

        if (Array.isArray(q.missed_list)) {
          setMissedTokens(q.missed_list.map((v: any) => v.token_number));
        } else {
          setMissedTokens([]);
        }
      }
    } catch {
      // Fallback to initial display state
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue, tenantId]);

  // Hook into Laravel Reverb WebSockets
  const { isConnected, connectionState } = useQueueEcho({
    tenantId,
    onPatientCalled: (payload: PatientCalledPayload) => {
      setServingToken(payload.token_number);
      setServingDoctor(payload.doctor_name);
      setServingRoom(payload.room_number);
      setServingPatient(payload.patient_name);
      
      // Trigger chime and visual flash
      playChime();
      setIsFlashing(true);
      setAnnouncementText(`Token #${payload.token_number} - Please proceed to ${payload.room_number}`);
      setTimeout(() => setIsFlashing(false), 5000);
      setTimeout(() => setAnnouncementText(null), 8000);
    },
    onQueueUpdated: (payload: QueueUpdatedPayload) => {
      if (payload.queue) {
        const q = payload.queue;
        const activeVisit = q.called || q.in_consultation || (q.waiting_list && q.waiting_list.length > 0 ? q.waiting_list[0] : null);

        if (activeVisit) {
          setServingToken(activeVisit.token_number);
          setServingDoctor(activeVisit.doctor?.user?.name || servingDoctor);
          setServingRoom(activeVisit.doctor?.room_number || servingRoom);
          const pName = activeVisit.patient
            ? `${activeVisit.patient.first_name || ''} ${activeVisit.patient.last_name || ''}`.trim()
            : '';
          setServingPatient(pName);
        } else {
          setServingToken(null);
          setServingPatient('');
        }

        if (Array.isArray(q.waiting_list)) {
          const upcoming = q.waiting_list
            .filter((v: any) => !activeVisit || v.token_number !== activeVisit.token_number)
            .map((v: any) => v.token_number);
          setWaitingTokens(upcoming);
        } else {
          setWaitingTokens([]);
        }

        if (Array.isArray(q.missed_list)) {
          setMissedTokens(q.missed_list.map((v: any) => v.token_number));
        } else {
          setMissedTokens([]);
        }
      } else {
        fetchQueue();
      }
    },
  });

  // Clock interval
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A192F] text-white flex flex-col font-sans select-none overflow-hidden">
      {/* Realtime Announcement Banner */}
      {announcementText && (
        <div className="bg-amber-400 text-slate-950 font-black px-6 py-2.5 text-center text-lg flex items-center justify-center gap-3 animate-bounce shadow-xl z-50">
          <BellRing className="w-6 h-6 animate-spin" />
          <span>ATTENTION: {announcementText}</span>
        </div>
      )}

      {/* Header Bar */}
      <header className="bg-[#112240] px-6 py-4 flex items-center justify-between border-b border-teal-500/20 shadow-lg">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="w-12 h-12 rounded-xl bg-teal-500 flex items-center justify-center font-black text-2xl text-[#0A192F] shadow-lg">
            M
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
              {settings.clinic_branding?.clinic_name || 'Medical Centre'}
              <span className="text-xs px-2.5 py-1 rounded-md bg-white/10 font-mono text-teal-300 font-bold tracking-normal">
                {tenantId.toUpperCase()}
              </span>
            </h1>
            <p className="text-xs text-teal-400 font-semibold tracking-wide uppercase">
              Live Queue & Token Status Display
            </p>
          </div>
        </div>

        {/* Live Status, Clock & Audio Test */}
        <div className="flex items-center gap-6">
          {/* WebSocket Status Indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0A192F] border border-slate-700">
            {isConnected ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-semibold text-emerald-300">Live Reverb Sync</span>
              </>
            ) : connectionState === 'connecting' ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
                <span className="text-xs font-semibold text-amber-300">Connecting...</span>
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                <span className="text-xs font-semibold text-rose-300">Reconnecting</span>
              </>
            )}
          </div>

          <button
            onClick={playChime}
            className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg transition"
            title="Test Announcement Chime"
          >
            <Volume2 className="w-4 h-4" /> Test Chime
          </button>

          <div className="text-right">
            <div className="text-2xl font-mono font-black text-teal-300 tracking-wider">
              {currentTime || '00:00:00'}
            </div>
            <div className="text-xs text-slate-400">{currentDate}</div>
          </div>
        </div>
      </header>

      {/* Main Display Grid */}
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* NOW SERVING (Large Prominent Left Screen - 7 Cols) */}
        <div className={`lg:col-span-7 flex flex-col justify-between bg-gradient-to-br from-[#16324F] to-[#0D1F33] rounded-3xl p-8 border-2 transition-all duration-500 shadow-2xl relative overflow-hidden ${
          isFlashing ? 'border-amber-400 ring-8 ring-amber-400/30 scale-[1.01]' : 'border-teal-500/40'
        }`}>
          <div className="absolute right-0 top-0 -translate-y-8 translate-x-12 opacity-5 pointer-events-none">
            <Stethoscope className="w-96 h-96" />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/20 border border-teal-400/40 text-teal-300 text-sm font-bold uppercase tracking-widest mb-4">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping"></span>
                Now Serving • දැන් කැඳවන අංකය
              </div>
              {servingPatient && (
                <div className="text-sm font-bold text-slate-300 bg-slate-800/80 px-4 py-1 rounded-full border border-slate-700">
                  Patient: {servingPatient}
                </div>
              )}
            </div>

            <div className={`my-6 text-center py-8 rounded-2xl border transition-all duration-300 shadow-inner ${
              isFlashing ? 'bg-amber-950/60 border-amber-400' : 'bg-[#0B1A2E]/80 border-teal-500/30'
            }`}>
              <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">
                {servingToken ? 'Token Number • කැඳවන අංකය' : 'Queue Standby • පෝලිම සූදානම්'}
              </div>
              <div className="text-8xl sm:text-9xl font-black text-white tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-200 via-white to-teal-100">
                {servingToken ? `#${servingToken}` : '--'}
              </div>
              {!servingToken && (
                <div className="text-xs text-teal-300/80 font-medium mt-3">
                  {waitingTokens.length > 0 
                    ? `Next Token #${waitingTokens[0]} will be called shortly` 
                    : 'Waiting for consultations to begin'}
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#112240] p-6 rounded-2xl border border-slate-700/60 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Consulting Doctor</div>
              <div className="text-2xl font-black text-teal-300 mt-1">{servingDoctor}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Consultation Room</div>
              <div className="text-3xl font-black text-white mt-1 bg-teal-700 px-5 py-1.5 rounded-xl shadow-lg">
                {servingRoom}
              </div>
            </div>
          </div>
        </div>

        {/* UPCOMING & QUEUE LIST (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          
          {/* Upcoming Tokens */}
          <div className="flex-1 bg-[#112240] rounded-3xl p-6 border border-slate-700/80 shadow-xl flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700 mb-4">
              <h2 className="text-base font-black uppercase tracking-wider text-teal-300">
                Please Get Ready • ඊළඟට සූදානම් වන්න
              </h2>
              <span className="text-xs font-bold text-slate-400">
                {waitingTokens.length} Waiting
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 flex-1">
              {waitingTokens.length > 0 ? (
                waitingTokens.slice(0, 6).map((tok, idx) => (
                  <div
                    key={tok}
                    className={`p-4 rounded-2xl flex items-center justify-between border transition ${
                      idx === 0
                        ? 'bg-teal-900/40 border-teal-400 text-teal-200 shadow-md'
                        : 'bg-[#1D3557]/40 border-slate-700 text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Token</div>
                      <div className="text-3xl font-black text-white">#{tok}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/10 text-slate-300">
                        {servingRoom}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 flex flex-col items-center justify-center text-slate-400 py-12">
                  <Clock className="w-10 h-10 mb-2 opacity-40" />
                  <span className="text-sm font-semibold">No patients currently in waiting queue</span>
                </div>
              )}
            </div>
          </div>

          {/* Missed / Recall Notice */}
          <div className="bg-[#1D2A44] rounded-2xl p-4 border border-amber-500/30 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Missed / Late Arrival • ප්‍රමාද වූ රෝගීන්
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                Please contact Reception desk for fair queue re-entry.
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {missedTokens.length > 0 ? (
                missedTokens.map(m => (
                  <span key={m} className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 text-sm">
                    #{m}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">None</span>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Footer Marquee Banner */}
      <footer className="bg-[#0B1A2E] py-2.5 px-6 border-t border-slate-800 text-center text-xs text-slate-400">
        <span>✨ MediFlow Live Queue System • Automated 16 vs 24 Fair Catch-Up Sequencing Active • Please keep your mobile phone on loud for turn-alert SMS.</span>
      </footer>
    </div>
  );
}
