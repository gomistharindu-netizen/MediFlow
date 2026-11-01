'use client';

import React, { useState, useEffect, useCallback, use, Suspense } from 'react';
import Link from 'next/link';
import { useClinic } from '@/contexts/ClinicContext';
import { ApiClient } from '@/lib/api';
import { useQueueEcho, PatientCalledPayload, QueueUpdatedPayload } from '@/hooks/useQueueEcho';
import { 
  Clock, 
  Stethoscope, 
  BellRing, 
  CheckCircle2, 
  MapPin, 
  ArrowLeft, 
  Sparkles, 
  Wifi, 
  AlertCircle 
} from 'lucide-react';

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

function TrackerContent({ params }: PageProps) {
  const resolvedParams = use(params);
  const myToken = parseInt(resolvedParams.token, 10) || 16;
  const { tenantId, settings } = useClinic();

  const [servingToken, setServingToken] = useState<number>(15);
  const [servingRoom, setServingRoom] = useState<string>('Room 01');
  const [waitingPosition, setWaitingPosition] = useState<number>(1);
  const [status, setStatus] = useState<'WAITING' | 'CALLED' | 'IN_CONSULTATION' | 'COMPLETED'>('WAITING');
  const [isCalled, setIsCalled] = useState<boolean>(false);

  // Play audio alert and device vibration when called
  const notifyPatient = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([300, 150, 300, 150, 500]);
      }
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.0);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 1.0);
      }
    } catch {}
  }, []);

  // Fetch initial queue status
  const fetchQueueStatus = useCallback(async () => {
    try {
      const res = await ApiClient.get<{ success: boolean; data: any }>('/queue?doctor_id=1');
      if (res.success && res.data) {
        const q = res.data;
        if (q.called) {
          setServingToken(q.called.token_number);
          setServingRoom(q.called.doctor?.room_number || 'Room 01');
          if (q.called.token_number === myToken) {
            setIsCalled(true);
            setStatus('CALLED');
          }
        } else if (q.in_consultation) {
          setServingToken(q.in_consultation.token_number);
          setServingRoom(q.in_consultation.doctor?.room_number || 'Room 01');
          if (q.in_consultation.token_number === myToken) {
            setStatus('IN_CONSULTATION');
          }
        }

        if (Array.isArray(q.waiting_list)) {
          const found = q.waiting_list.find((v: any) => v.token_number === myToken);
          if (found && found.waiting_position) {
            setWaitingPosition(found.waiting_position);
          }
        }
      }
    } catch {
      // Fallback relative position
      if (myToken > servingToken) {
        setWaitingPosition(myToken - servingToken);
      }
    }
  }, [myToken, servingToken]);

  useEffect(() => {
    fetchQueueStatus();
  }, [fetchQueueStatus]);

  // Connect to Reverb Realtime WebSockets
  const { isConnected } = useQueueEcho({
    tenantId,
    onPatientCalled: (payload: PatientCalledPayload) => {
      setServingToken(payload.token_number);
      setServingRoom(payload.room_number);

      if (payload.token_number === myToken) {
        setIsCalled(true);
        setStatus('CALLED');
        notifyPatient();
      }
    },
    onQueueUpdated: (payload: QueueUpdatedPayload) => {
      if (payload.queue && Array.isArray(payload.queue.waiting_list)) {
        const found = payload.queue.waiting_list.find((v: any) => v.token_number === myToken);
        if (found && found.waiting_position) {
          setWaitingPosition(found.waiting_position);
        }
      }
    },
  });

  const estimatedWaitMins = Math.max(0, (waitingPosition - 1) * 6);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between font-sans p-4 sm:p-6 max-w-md mx-auto">
      {/* Top Clinic Header */}
      <div>
        <header className="flex items-center justify-between py-3 border-b border-slate-800 mb-6">
          <Link href="/" className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="text-center">
            <h1 className="font-extrabold text-base text-white">
              {settings.clinic_branding?.clinic_name || 'Medical Centre'}
            </h1>
            <p className="text-[11px] text-teal-400 font-semibold tracking-wide uppercase">
              Live Patient Token Tracker
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold text-teal-300">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            {isConnected ? 'LIVE' : 'SYNC'}
          </div>
        </header>

        {/* TURN ALERT POPUP (If Called) */}
        {isCalled && (
          <div className="mb-6 p-5 rounded-3xl bg-amber-400 text-slate-950 shadow-2xl animate-bounce border-2 border-amber-300 text-center">
            <BellRing className="w-10 h-10 mx-auto mb-2 text-slate-900 animate-spin" />
            <div className="text-xl font-black uppercase tracking-tight">IT IS YOUR TURN!</div>
            <div className="text-sm font-bold mt-1">
              Please enter <span className="underline font-black">{servingRoom}</span> now.
            </div>
            <div className="text-xs font-semibold text-slate-800 mt-2">
              කරුණාකර දැන් {servingRoom} කාමරය වෙත යන්න.
            </div>
          </div>
        )}

        {/* Main Token Card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-850 rounded-3xl p-6 border border-slate-700 shadow-xl text-center relative overflow-hidden mb-6">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
            Your Token Number
          </div>
          <div className="text-7xl font-black tracking-tight text-teal-300 my-2">
            #{myToken}
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-950/80 border border-teal-500/40 text-teal-300 text-xs font-bold mt-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isCalled ? 'Called • ඇතුල්වන්න' : 'Checked In • පෝලිමේ රැඳෙන්න'}
          </div>

          {/* Waiting Position vs Estimated Time */}
          <div className="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-slate-700/80 text-left">
            <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-700/60">
              <div className="text-[10px] uppercase font-bold text-slate-400">Your Queue Position</div>
              <div className="text-2xl font-black text-white mt-0.5">
                {isCalled ? 'Now!' : `#${waitingPosition} in Line`}
              </div>
            </div>

            <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-700/60">
              <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-teal-400" /> Est. Wait Time
              </div>
              <div className="text-2xl font-black text-teal-300 mt-0.5">
                {isCalled ? '0 mins' : `~${estimatedWaitMins} mins`}
              </div>
            </div>
          </div>
        </div>

        {/* Current Live Serving Board */}
        <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/80 flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Currently Inside Room
            </div>
            <div className="text-lg font-black text-white mt-0.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Token #{servingToken}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Consulting Room
            </div>
            <div className="text-sm font-black text-teal-300 bg-teal-950/80 px-3 py-1 rounded-xl border border-teal-500/30 mt-0.5">
              {servingRoom}
            </div>
          </div>
        </div>

        {/* Clinic Guidance Alert */}
        <div className="bg-teal-950/40 rounded-2xl p-4 border border-teal-500/30 text-xs text-teal-200 flex items-start gap-3">
          <Stethoscope className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-white mb-0.5">Automated Fair Sequencing</div>
            Patients with earlier tokens who checked in before their turn are served in natural token order. Keep this screen open for live instant alerts.
          </div>
        </div>
      </div>

      {/* Footer Instructions */}
      <footer className="text-center text-[11px] text-slate-500 py-4 border-t border-slate-800 mt-6">
        MediFlow Realtime Clinic Network • Auto-refreshing via Laravel Reverb
      </footer>
    </div>
  );
}

export default function PatientMobileQueueTracker(props: PageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center font-sans p-6">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-sm font-bold text-slate-200">Connecting to MediFlow Live Queue...</div>
          <div className="text-xs text-slate-500 mt-1">Real-time sync via WebSockets</div>
        </div>
      </div>
    }>
      <TrackerContent {...props} />
    </Suspense>
  );
}
