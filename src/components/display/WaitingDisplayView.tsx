'use client';

import React, { useState, useEffect } from 'react';
import { useMediFlow } from '@/context/MediFlowContext';
import { Tv, Volume2, Clock, Activity, ArrowRight, UserCheck } from 'lucide-react';

export const WaitingDisplayView: React.FC = () => {
  const { visits, settings, doctors } = useMediFlow();
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Currently called or in-consultation patient
  const activeCallingVisit = visits.find(v => v.status === 'CALLED') || 
                             visits.find(v => v.status === 'IN_CONSULTATION') || 
                             visits.find(v => v.status === 'WAITING');

  // Waiting list (Checked in and waiting for their turn)
  const waitingPatients = visits.filter(
    v => v.status === 'WAITING' && v.id !== activeCallingVisit?.id
  );

  return (
    <div className="bg-[#142D4E] min-h-[640px] rounded-2xl shadow-2xl p-6 text-white flex flex-col justify-between border-4 border-slate-700/50">
      
      {/* TV Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-[#0F766E] flex items-center justify-center shadow-lg">
            <Activity className="w-7 h-7 text-[#CCFBF1]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-black tracking-tight text-white">MediFlow</span>
              <span className="text-xs bg-[#0F766E] text-[#CCFBF1] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Waiting Lobby
              </span>
            </div>
            <p className="text-xs text-slate-300">Dr. K. Perera (Room 01) • General Practice & Specialist Clinic</p>
          </div>
        </div>

        {/* Live Clock */}
        <div className="text-right">
          <div className="text-2xl font-mono font-bold text-teal-300">{currentTime || '05:30:00 PM'}</div>
          <div className="text-xs text-slate-400">Wednesday, 14 October 2026</div>
        </div>
      </div>

      {/* Main Display Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6 items-stretch">
        
        {/* Left 2 Cols: NOW SERVING (Big Prominent Calling Card) */}
        <div className="lg:col-span-2 bg-gradient-to-br from-[#0F766E] to-[#115E59] rounded-2xl p-8 flex flex-col justify-between shadow-xl border border-teal-400/30 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-teal-100 font-bold uppercase tracking-widest text-sm">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
              <span>NOW SERVING / දැන් අංකය</span>
            </div>
            <div className="flex items-center gap-1.5 bg-teal-900/60 text-teal-200 px-3 py-1 rounded-full text-xs font-semibold">
              <Volume2 className="w-4 h-4" />
              <span>Room 01</span>
            </div>
          </div>

          <div className="my-6 text-center">
            {activeCallingVisit ? (
              <div>
                <span className="text-slate-300 text-sm font-semibold uppercase tracking-wider block mb-1">
                  TOKEN NUMBER
                </span>
                <div className="text-8xl md:text-9xl font-black text-white font-mono tracking-tighter drop-shadow-md">
                  #{activeCallingVisit.tokenNumber}
                </div>
                <div className="text-2xl md:text-3xl font-bold text-[#CCFBF1] mt-2">
                  {activeCallingVisit.patientName}
                </div>
                <div className="inline-block mt-3 bg-white/10 backdrop-blur-xs text-white text-xs px-4 py-1.5 rounded-full font-medium border border-white/20">
                  Please proceed to Consultation Room 01
                </div>
              </div>
            ) : (
              <div className="text-teal-200 text-lg">Doctor preparing for next patient...</div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-teal-100 pt-4 border-t border-teal-500/30">
            <span>Doctor: <strong>Dr. K. Perera</strong></span>
            <span>Session: <strong>Evening Clinic</strong></span>
          </div>
        </div>

        {/* Right 1 Col: UP NEXT QUEUE */}
        <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-700">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-teal-400" />
                Up Next In Line
              </span>
              <span className="text-xs font-mono bg-slate-700 text-teal-300 px-2 py-0.5 rounded">
                {waitingPatients.length} Waiting
              </span>
            </div>

            <div className="space-y-3">
              {waitingPatients.slice(0, 5).map((p, idx) => (
                <div
                  key={p.id}
                  className={`p-3 rounded-xl border flex items-center justify-between transition ${
                    idx === 0 
                      ? 'bg-teal-900/40 border-teal-500/50 text-white' 
                      : 'bg-slate-700/40 border-slate-600/40 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center font-bold font-mono text-sm">
                      #{p.tokenNumber}
                    </span>
                    <div>
                      <div className="font-semibold text-xs text-white">{p.patientName}</div>
                      <div className="text-[10px] text-slate-400">Ref: {p.bookingRef}</div>
                    </div>
                  </div>

                  <div>
                    {idx === 0 ? (
                      <span className="text-[10px] bg-amber-400 text-slate-900 px-2 py-0.5 rounded font-bold uppercase">
                        Next
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono">
                        ~{(idx + 1) * 8} mins
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {waitingPatients.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No other patients waiting.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-700 text-[11px] text-slate-400 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-teal-400 shrink-0" />
            <span>Please inform reception if your contact number or details need updating.</span>
          </div>
        </div>
      </div>

      {/* TV Bottom Announcements Ticker */}
      <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-700/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
          <span className="bg-[#0F766E] text-white text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider shrink-0">
            Clinic Notice
          </span>
          <span className="text-slate-300 animate-pulse">
            Welcome to MediFlow Family Health Care • Visiting specialists available by prior appointment • Please show your digital SMS QR code at reception upon arrival.
          </span>
        </div>
        <div className="shrink-0 pl-4 font-mono text-slate-400 text-[11px]">
          Free Wi-Fi: <strong className="text-slate-200">MediFlow-Guest</strong>
        </div>
      </div>
    </div>
  );
};
