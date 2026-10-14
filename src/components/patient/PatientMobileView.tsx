'use client';

import React from 'react';
import { useMediFlow } from '@/context/MediFlowContext';
import { 
  Smartphone, 
  QrCode, 
  Clock, 
  CheckCircle2, 
  MapPin, 
  User, 
  Calendar, 
  AlertCircle,
  Activity,
  ArrowRight
} from 'lucide-react';

export const PatientMobileView: React.FC = () => {
  const { 
    visits, 
    selectedVisitIdForMobile, 
    setSelectedVisitIdForMobile,
    checkInVisit 
  } = useMediFlow();

  const currentVisit = visits.find(v => v.id === selectedVisitIdForMobile) || visits[0];

  // Active serving token
  const currentlyServingVisit = visits.find(v => v.status === 'IN_CONSULTATION') || 
                               visits.find(v => v.status === 'CALLED');

  const currentlyServingToken = currentlyServingVisit ? currentlyServingVisit.tokenNumber : 15;
  const isMyTurn = currentVisit.status === 'CALLED' || currentVisit.status === 'IN_CONSULTATION';
  const tokensAhead = Math.max(0, currentVisit.tokenNumber - currentlyServingToken);

  return (
    <div className="space-y-6">
      {/* Top Controller Strip: Select Which Patient's Phone to Simulate */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-[#0F766E]" />
          <div>
            <h2 className="text-sm font-bold text-[#16324F]">Simulate Patient Mobile Web View</h2>
            <p className="text-[11px] text-slate-500">
              No App Install Required. Opened via SMS link: <code className="text-teal-700 bg-teal-50 px-1 py-0.5 rounded font-mono">https://mediflow.lk/q/{currentVisit?.id}</code>
            </p>
          </div>
        </div>

        {/* Patient Switcher Dropdown */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Switch Patient:</span>
          <select
            value={currentVisit?.id}
            onChange={e => setSelectedVisitIdForMobile(e.target.value)}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-[#16324F] focus:ring-1 focus:ring-[#0F766E]"
          >
            {visits.map(v => (
              <option key={v.id} value={v.id}>
                Token #{v.tokenNumber} — {v.patientName} ({v.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Smartphone Frame Simulation */}
      <div className="flex justify-center">
        <div className="w-full max-w-sm bg-slate-900 p-3.5 rounded-[42px] shadow-2xl border-4 border-slate-800">
          
          {/* Phone Screen Canvas */}
          <div className="bg-[#F4F9F8] rounded-[32px] overflow-hidden shadow-inner flex flex-col min-h-[620px] text-slate-800 font-sans">
            
            {/* Phone Notch & Status Bar */}
            <div className="bg-[#16324F] text-white px-5 pt-3 pb-2 flex justify-between items-center text-[11px]">
              <span className="font-mono font-bold">05:30</span>
              <div className="w-20 h-4 bg-slate-900 rounded-full mx-auto"></div>
              <div className="flex items-center space-x-1.5 text-[10px]">
                <span>5G</span>
                <span>100%</span>
              </div>
            </div>

            {/* Mobile Header */}
            <div className="bg-[#16324F] text-white px-5 pb-5 pt-1 text-center relative">
              <div className="w-9 h-9 rounded-xl bg-[#0F766E] mx-auto flex items-center justify-center mb-1 shadow-sm">
                <Activity className="w-5 h-5 text-[#CCFBF1]" />
              </div>
              <h1 className="text-base font-bold tracking-tight">MediFlow Clinic</h1>
              <p className="text-[10px] text-slate-300">Live Appointment & Queue Tracker</p>
            </div>

            {/* Scrollable Mobile Content */}
            <div className="p-4 space-y-4 flex-1 overflow-y-auto text-xs">
              
              {/* Token & Status Banner */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                  Your Queue Token
                </span>
                <div className="text-5xl font-black text-[#0F766E] font-mono tracking-tight">
                  #{currentVisit.tokenNumber}
                </div>
                <div className="text-xs font-semibold text-[#16324F] mt-1">
                  {currentVisit.patientName}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Currently Serving:</span>
                  <span className="font-bold text-[#16324F] font-mono text-sm bg-slate-100 px-2 py-0.5 rounded">
                    Token #{currentlyServingToken}
                  </span>
                </div>
              </div>

              {/* Real-time Status Card */}
              {isMyTurn ? (
                <div className="bg-emerald-600 text-white p-3.5 rounded-xl text-center shadow-md animate-pulse">
                  <div className="font-bold text-sm">🎉 IT'S YOUR TURN!</div>
                  <p className="text-[11px] text-emerald-100 mt-0.5">
                    Please proceed inside <strong>{currentVisit.doctorRoom}</strong> to see {currentVisit.doctorName}.
                  </p>
                </div>
              ) : currentVisit.status === 'NOT_CHECKED_IN' ? (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-900 text-center space-y-2">
                  <div className="flex items-center justify-center gap-1.5 font-bold text-xs text-amber-800">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Attendance Not Yet Confirmed</span>
                  </div>
                  <p className="text-[10px] text-amber-700 leading-relaxed">
                    Please show this QR code at the clinic reception or kiosk scanner upon your arrival.
                  </p>
                  <button
                    onClick={() => checkInVisit(currentVisit.id)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 rounded-lg font-bold text-[11px] shadow-sm"
                  >
                    Simulate "I have arrived at clinic"
                  </button>
                </div>
              ) : currentVisit.status === 'WAITING' ? (
                <div className="bg-teal-50 border border-teal-200 p-3 rounded-xl text-teal-900 text-center">
                  <div className="flex items-center justify-center gap-1 text-xs font-bold text-[#0F766E]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                    <span>Checked In & Waiting in Lobby</span>
                  </div>
                  <div className="text-[11px] text-teal-800 mt-1 font-medium">
                    {tokensAhead > 0 ? (
                      <span><strong>{tokensAhead}</strong> patient(s) ahead of you in line.</span>
                    ) : (
                      <span>You are next in line! Stay ready near Room 01.</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-100 p-3 rounded-xl text-slate-700 text-center">
                  <div className="font-bold text-xs">Consultation Completed</div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Thank you for visiting MediFlow Clinic.</p>
                </div>
              )}

              {/* QR Code Presentation Box */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 text-center">
                <div className="text-[11px] font-bold text-[#16324F] mb-1">Appointment Check-in QR</div>
                <div className="w-32 h-32 mx-auto bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center justify-center my-2 shadow-inner">
                  <QrCode className="w-24 h-24 text-slate-800" />
                </div>
                <div className="font-mono text-[10px] text-slate-400">
                  REF: <strong>{currentVisit.bookingRef}</strong>
                </div>
              </div>

              {/* Appointment Meta Info */}
              <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-200/80 space-y-2 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>Doctor:</span>
                  <strong className="text-slate-800">{currentVisit.doctorName}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Specialty:</span>
                  <span>{currentVisit.doctorSpecialty}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Session:</span>
                  <span>{currentVisit.sessionName}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Room:</span>
                  <span className="font-bold text-[#0F766E]">{currentVisit.doctorRoom}</span>
                </div>
              </div>

              {/* Live Connection Pulse */}
              <div className="text-center pt-1 text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live connection active • Updates automatically</span>
              </div>
            </div>

            {/* Phone Home Bar */}
            <div className="p-2 bg-white flex justify-center">
              <div className="w-28 h-1 bg-slate-300 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
