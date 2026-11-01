'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ApiClient } from '@/lib/api';
import { ShieldAlert, RefreshCw, LogOut } from 'lucide-react';

interface IdleTimeoutTrackerProps {
  timeoutMinutes?: number; // Total idle limit before auto-logout (default 15 mins)
  warningSeconds?: number; // Warning countdown duration (default 60 seconds)
}

export const IdleTimeoutTracker: React.FC<IdleTimeoutTrackerProps> = ({
  timeoutMinutes = 15,
  warningSeconds = 60,
}) => {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(warningSeconds);
  const lastActivityRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showWarning) {
      setShowWarning(false);
      setSecondsRemaining(warningSeconds);
    }
  }, [showWarning, warningSeconds]);

  const handleLogout = useCallback(() => {
    ApiClient.clearSession();
    window.location.href = '/login?reason=idle_timeout';
  }, []);

  useEffect(() => {
    lastActivityRef.current = Date.now();
    // Only track if user is logged in
    const token = typeof window !== 'undefined' ? localStorage.getItem('mediflow_token') : null;
    if (!token) return;

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const handleActivity = () => {
      // Throttle activity updates
      if (Date.now() - lastActivityRef.current > 1000) {
        lastActivityRef.current = Date.now();
      }
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    const checkInterval = setInterval(() => {
      const now = Date.now();
      const idleTimeMs = now - lastActivityRef.current;
      const totalTimeoutMs = timeoutMinutes * 60 * 1000;
      const warningThresholdMs = totalTimeoutMs - warningSeconds * 1000;

      if (idleTimeMs >= totalTimeoutMs) {
        clearInterval(checkInterval);
        handleLogout();
      } else if (idleTimeMs >= warningThresholdMs) {
        setShowWarning(true);
        const remaining = Math.max(0, Math.ceil((totalTimeoutMs - idleTimeMs) / 1000));
        setSecondsRemaining(remaining);
      } else if (showWarning) {
        setShowWarning(false);
      }
    }, 1000);

    return () => {
      clearInterval(checkInterval);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [timeoutMinutes, warningSeconds, showWarning, handleLogout]);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl border border-amber-300 shadow-2xl max-w-md w-full p-6 text-center text-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center mb-4">
          <ShieldAlert className="w-6 h-6 animate-pulse" />
        </div>

        <h3 className="text-lg font-bold text-slate-900">
          Inactivity Warning (PDPA & HIPAA Security)
        </h3>

        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
          Your workstation has been idle. In accordance with the{' '}
          <strong className="text-slate-800">Sri Lanka PDPA 2022 Act No. 9</strong> and{' '}
          <strong className="text-slate-800">HIPAA Automatic Logoff Rule</strong>, your session will be closed automatically to prevent unauthorized access to sensitive patient health records.
        </p>

        <div className="my-5 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <div className="text-xs font-semibold text-amber-900">Logging off in</div>
          <div className="text-3xl font-black text-amber-700 font-mono mt-0.5">
            {secondsRemaining}s
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={resetTimer}
            className="flex-1 py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 shadow"
          >
            <RefreshCw className="w-4 h-4" />
            Stay Logged In
          </button>
          <button
            onClick={handleLogout}
            className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 font-semibold text-xs sm:text-sm transition flex items-center gap-1"
          >
            <LogOut className="w-4 h-4" />
            Sign Out Now
          </button>
        </div>
      </div>
    </div>
  );
};
