'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Stethoscope,
  Users,
  CreditCard,
  Pill,
  Tv,
  Smartphone,
  ShieldCheck,
  Building2,
  ExternalLink,
  Play,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Clock,
  Infinity as InfinityIcon,
  Calendar,
  PenTool,
  Mic,
  Printer,
  ChevronRight,
  X
} from 'lucide-react';

interface WorkstationDemo {
  id: string;
  role: 'Doctor' | 'Receptionist' | 'Cashier' | 'Pharmacist' | 'SuperAdmin' | 'Guest';
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  path: string;
  icon: any;
  color: string;
  features: string[];
  screenshotPreviewText: string;
}

const WORKSTATIONS: WorkstationDemo[] = [
  {
    id: 'doctor',
    role: 'Doctor',
    title: 'Doctor Consultation Desk',
    subtitle: 'High-speed clinical EMR, digital prescriptions, and stylus touch support',
    badge: 'Touch & Pen Enabled',
    badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
    path: '/doctor',
    icon: Stethoscope,
    color: 'from-teal-600 to-emerald-600',
    features: [
      '✍️ Apple Pencil, Surface Pen, Touch stylus & anatomy body outlines',
      '🎤 Live Voice Dictation for lightning-fast clinical notes',
      '⚡ 1-Click Clinical Rx bundles (Cold, Gastritis, Viral Fever)',
      '⚠️ Real-time drug allergy conflict warnings & overrides',
      '🖨️ A5 Prescription slip & 80mm thermal receipt printing',
    ],
    screenshotPreviewText: 'Doctor EMR Workspace with live patient queue, vital signs card, and digital prescription builder.',
  },
  {
    id: 'reception',
    role: 'Receptionist',
    title: 'Reception & Triage Counter',
    subtitle: 'Instant patient check-in, token dispenser, and advance booking',
    badge: 'Zero-Queue Bottleneck',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    path: '/reception',
    icon: Users,
    color: 'from-blue-600 to-indigo-600',
    features: [
      '🎫 Instant Token Generation for walk-in patients with 1 click',
      '📅 Advance & Phone Appointment booking with live check-in arrival',
      '🛡️ Duplicate token prevention guard for already checked-in patients',
      '🔍 Global National ID & Phone search across patient records',
      '🌡️ Triage vital recording (BP, Pulse, Temperature, Weight, Blood Sugar)',
    ],
    screenshotPreviewText: 'Reception queue manager displaying today waiting patients, booked appointments, and token generator.',
  },
  {
    id: 'cashier',
    role: 'Cashier',
    title: 'Cashier & Billing Desk',
    subtitle: 'Dual-mode billing, real-time pharmacy sync, and thermal receipts',
    badge: 'Auto-Sync Invoicing',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    path: '/cashier',
    icon: CreditCard,
    color: 'from-emerald-600 to-teal-700',
    features: [
      '🔄 Auto-sync consultation charges with pharmacy medicine dispensed',
      '⚙️ Dual payment timing: Pay-After (combined) or Pay-Before (upfront)',
      '🧾 80mm / 58mm Thermal Receipt printing with doctor and itemized breakdown',
      '💵 Cash, Card, and Insurance payment mode tracking',
      '📊 Daily cashier cash-drawer settlement reconciliation',
    ],
    screenshotPreviewText: 'Cashier register with active invoices, breakdown of doctor fee + dispensed pharmacy medicine.',
  },
  {
    id: 'pharmacy',
    role: 'Pharmacist',
    title: 'In-House Pharmacy & Inventory',
    subtitle: 'Earliest-expiry FIFO dispensing with batch tracking',
    badge: 'FIFO Earliest-Expiry',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    path: '/pharmacy',
    icon: Pill,
    color: 'from-purple-600 to-indigo-700',
    features: [
      '⚡ Prescriptions appear in pharmacy desk in real time as doctor signs',
      '📦 Automated FIFO Earliest-Expiry batch allocation to prevent waste',
      '🛑 Strict safety guard against over-dispensing or out-of-stock items',
      '🏷️ Medicine inventory tracking with low-stock alerts',
    ],
    screenshotPreviewText: 'Pharmacy dispensing desk showing pending prescriptions and batch allocation with expiry dates.',
  },
  {
    id: 'tv',
    role: 'Guest',
    title: 'Waiting Room Live TV Display',
    subtitle: 'Full-screen high-contrast queue board with audio chime',
    badge: 'Reverb Live Chime',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    path: '/tv',
    icon: Tv,
    color: 'from-amber-600 to-orange-600',
    features: [
      '📢 Audible chime sound when doctor calls the next patient',
      '📺 High-contrast token numbers readable from 25 feet away',
      '🛋️ Doctor room indicator (Room 01, Room 02, Room 03)',
      '📡 Instant WebSockets sync via Laravel Reverb (< 50ms latency)',
    ],
    screenshotPreviewText: 'Full-screen waiting room TV display with patient token number and doctor room chime.',
  },
  {
    id: 'mobile-tracker',
    role: 'Guest',
    title: 'Zero-Install Patient Smartphone Tracker',
    subtitle: 'Patients watch queue progress on their phone without downloading an app',
    badge: 'Mobile Live Link',
    badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    path: '/q/MF-2026-00001',
    icon: Smartphone,
    color: 'from-rose-600 to-pink-600',
    features: [
      '📲 SMS link sent upon token issuance (e.g. mediflow.lk/q/token)',
      '⏱️ Live "Patients ahead of you" countdown',
      '🔔 Patient can wait in car or nearby cafe and return when called',
      '🔒 Fully encrypted, zero medical data exposed to patient phone',
    ],
    screenshotPreviewText: 'Mobile-optimized queue progress screen showing token position and estimated waiting time.',
  },
  {
    id: 'admin',
    role: 'SuperAdmin',
    title: 'Landlord & Multi-Tenant SuperAdmin',
    subtitle: 'Manage client clinics, 14-day trials, monthly and lifetime subscriptions',
    badge: 'SaaS Platform Hub',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    path: '/admin',
    icon: Building2,
    color: 'from-slate-700 to-slate-900',
    features: [
      '⏳ 14-Day Free Trial management with +7d/+14d extension tools',
      '♾️ Perpetual Lifetime license generation & certificate issuance',
      '🏢 Instant 100% isolated physical database provisioning per clinic',
      '🌐 Subdomain (*.mediflow.lk) and custom branded domain routing',
    ],
    screenshotPreviewText: 'Landlord SuperAdmin dashboard showing all active clinics, trial expiration countdown, and MRR.',
  },
];

export default function DemoPage() {
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const [selectedPlanForTrial, setSelectedPlanForTrial] = useState<'TRIAL' | 'MONTHLY' | 'LIFETIME'>('TRIAL');

  // Fast 1-Click Demo Sandbox Launch
  const handleLaunchWorkstation = (demo: WorkstationDemo) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mediflow_token', 'demo-interactive-token-9988');
      localStorage.setItem('mediflow_role', demo.role === 'Guest' ? 'Doctor' : demo.role);
      localStorage.setItem('mediflow_tenant', 'nawaloka');
      localStorage.setItem(
        'mediflow_user',
        JSON.stringify({
          name:
            demo.role === 'Doctor'
              ? 'Dr. Sanath Silva (Demo)'
              : demo.role === 'Receptionist'
              ? 'Kasun Receptionist (Demo)'
              : demo.role === 'Cashier'
              ? 'Dilani Cashier (Demo)'
              : demo.role === 'Pharmacist'
              ? 'Nimal Pharmacist (Demo)'
              : 'SuperAdmin Landlord (Demo)',
          email: `${demo.role.toLowerCase()}@mediflow.demo`,
          roles: [demo.role === 'Guest' ? 'Doctor' : demo.role],
          doctor_profile: {
            room_number: 'Room 01',
            slmc_reg_no: 'SLMC-DEMO-2026',
          },
        })
      );
      window.open(demo.path, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B132B] text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-slate-950">
      {/* Top Banner: Public Interactive Demo Notice */}
      <div className="bg-gradient-to-r from-teal-900/60 via-slate-900 to-indigo-950/70 border-b border-teal-500/20 px-4 py-2.5 text-center text-xs font-semibold text-teal-300 flex items-center justify-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
        <span>
          <strong>Welcome to MediFlow Live Interactive Demo Sandbox.</strong> No registration or credit card required. Test any workstation below!
        </span>
        <button
          onClick={() => {
            setSelectedPlanForTrial('TRIAL');
            setTrialModalOpen(true);
          }}
          className="ml-2 px-2.5 py-0.5 rounded-full bg-teal-500 text-slate-950 font-bold text-[11px] hover:bg-teal-400 transition"
        >
          Start 14-Day Free Trial
        </button>
      </div>

      {/* Main Navigation Bar */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <ShieldCheck className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-white">MediFlow</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-500/30">
                  Interactive Demo
                </span>
              </div>
              <p className="text-[11px] text-slate-400">All-in-One Outpatient Clinic & Hospital OS</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedPlanForTrial('TRIAL');
                setTrialModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-extrabold text-xs shadow-lg shadow-teal-500/20 transition flex items-center gap-1.5 active:scale-95"
            >
              <span>Start 14-Day Free Trial</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 px-6 bg-gradient-to-b from-slate-900/50 via-[#0B132B] to-[#0B132B] border-b border-slate-800/60">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-300 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Interactive Sandbox Running on <strong>Nawaloka Outpatient Care</strong> Demo Database</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Experience the Future of Outpatient Healthcare.{' '}
            <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
              Live & Hands-On.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Click any workstation below to launch an instant live session. Try prescribing with Apple Pencil/Touch stylus, dispensing FIFO medicine, checking in patients, and ringing the TV waiting room chime!
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>No Password Needed (Auto-Login)</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Real-Time WebSocket Sync</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Full 14-Day Free Trial Available</span>
            </div>
          </div>
        </div>
      </section>

      {/* WORKSTATIONS GRID (1-Click Launchers) */}
      <section className="max-w-7xl mx-auto px-6 py-12 flex-1 w-full space-y-10">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-400" />
              <span>Interactive Clinical Workstations (Click to Test)</span>
            </h2>
            <span className="text-xs text-slate-400">7 Interactive Modules</span>
          </div>
          <p className="text-xs text-slate-400">
            Click "Launch Demo" on any card to test the real MediFlow production workstation in your browser.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {WORKSTATIONS.map((demo) => {
            const Icon = demo.icon;
            return (
              <div
                key={demo.id}
                className="bg-slate-900 rounded-2xl border border-slate-800 hover:border-teal-500/50 transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-lg hover:shadow-teal-500/10 group"
              >
                <div className="p-6 space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${demo.color} flex items-center justify-center text-white shadow-md group-hover:scale-105 transition`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${demo.badgeColor}`}
                    >
                      {demo.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base text-white group-hover:text-teal-300 transition">
                      {demo.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">{demo.subtitle}</p>
                  </div>

                  {/* Feature Highlights */}
                  <ul className="space-y-2 pt-2 border-t border-slate-800/80">
                    {demo.features.map((f, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-300 leading-snug">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Card Action Button */}
                <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-500">{demo.path}</span>
                  <button
                    type="button"
                    onClick={() => handleLaunchWorkstation(demo)}
                    className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs shadow-md transition flex items-center gap-1.5 active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-slate-950" />
                    <span>Launch Demo</span>
                    <ExternalLink className="w-3 h-3 text-slate-950" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* SUBSCRIPTION MODELS: 14-Day Free Trial vs Monthly vs Lifetime */}
        <div className="mt-16 bg-slate-900 rounded-3xl border border-slate-800 p-8 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl font-black text-white">Simple, Flexible Pricing for Any Clinic</h2>
            <p className="text-xs text-slate-400">
              Start with a 14-Day Full Free Trial, subscribe monthly, or choose our Perpetual Lifetime License.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 14-Day Free Trial */}
            <div className="bg-slate-950 rounded-2xl border border-amber-500/40 p-6 flex flex-col justify-between shadow-lg relative">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/40 font-bold text-[10px] uppercase">
                    Evaluation Period
                  </span>
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white">14-Day Free Trial</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Test MediFlow in your clinic for 2 weeks</p>
                </div>
                <div className="pt-2">
                  <span className="text-3xl font-black text-white font-mono">FREE</span>
                  <span className="text-xs text-slate-400 ml-1">/ 14 days</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
                  <li className="flex items-center gap-2">✓ Full Features (Doctor, Reception, Cashier, TV)</li>
                  <li className="flex items-center gap-2">✓ No Credit Card Required</li>
                  <li className="flex items-center gap-2">✓ Dedicated Isolated Database</li>
                  <li className="flex items-center gap-2">✓ Easily convert to Monthly or Lifetime</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedPlanForTrial('TRIAL');
                  setTrialModalOpen(true);
                }}
                className="mt-6 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition shadow"
              >
                Start 14-Day Free Trial
              </button>
            </div>

            {/* Monthly Subscription */}
            <div className="bg-slate-950 rounded-2xl border border-teal-500 p-6 flex flex-col justify-between shadow-xl relative ring-2 ring-teal-500/20">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-500/40 font-bold text-[10px] uppercase">
                    Most Flexible
                  </span>
                  <Calendar className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white">Monthly Subscription</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Cancel or upgrade anytime with zero lock-in</p>
                </div>
                <div className="pt-2">
                  <span className="text-3xl font-black text-white font-mono">LKR 9,500</span>
                  <span className="text-xs text-slate-400 ml-1">/ month</span>
                  <span className="block text-[11px] text-teal-400 font-semibold mt-0.5">Starter available at LKR 4,500/mo</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
                  <li className="flex items-center gap-2">✓ Up to 3 Doctors & 150 Patients/Day</li>
                  <li className="flex items-center gap-2">✓ In-House Pharmacy FIFO Inventory</li>
                  <li className="flex items-center gap-2">✓ Full-Screen TV Display with Reverb Chime</li>
                  <li className="flex items-center gap-2">✓ Stylus Pen & Anatomy Drawing Pad</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedPlanForTrial('MONTHLY');
                  setTrialModalOpen(true);
                }}
                className="mt-6 w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs transition shadow"
              >
                Subscribe Monthly
              </button>
            </div>

            {/* Perpetual Lifetime License */}
            <div className="bg-slate-950 rounded-2xl border border-emerald-500/60 p-6 flex flex-col justify-between shadow-lg relative">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold text-[10px] uppercase">
                    One-Time Purchase
                  </span>
                  <InfinityIcon className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white">Perpetual Lifetime License</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Pay once, own forever with zero monthly fees</p>
                </div>
                <div className="pt-2">
                  <span className="text-3xl font-black text-emerald-400 font-mono">LKR 185,000</span>
                  <span className="text-xs text-slate-400 ml-1">/ one-time</span>
                  <span className="block text-[11px] text-emerald-400 font-semibold mt-0.5">Zero monthly subscription fees forever</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
                  <li className="flex items-center gap-2">✓ Unlimited Patients, Doctors, & Staff forever</li>
                  <li className="flex items-center gap-2">✓ Deploy on Local Clinic Server or Cloud VPS</li>
                  <li className="flex items-center gap-2">✓ Perpetual License Certificate & License Key</li>
                  <li className="flex items-center gap-2">✓ 1 Year Free Updates & Technical Support</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedPlanForTrial('LIFETIME');
                  setTrialModalOpen(true);
                }}
                className="mt-6 w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition shadow"
              >
                Inquire Lifetime License
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-8 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">MediFlow Healthcare OS</span>
            <span>•</span>
            <span>Sri Lanka SLMC & PDPA Compliant Architecture</span>
          </div>
          <div>
            Built with Laravel 13, PostgreSQL / SQLite isolated tenancy & Next.js 16.
          </div>
        </div>
      </footer>

      {/* START 14-DAY TRIAL / INQUIRY MODAL */}
      {trialModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-400" />
                <h3 className="font-extrabold text-base text-white">
                  {selectedPlanForTrial === 'TRIAL'
                    ? 'Start 14-Day Free Clinic Trial'
                    : selectedPlanForTrial === 'LIFETIME'
                    ? 'Inquire Perpetual Lifetime License'
                    : 'Activate Monthly Subscription'}
                </h3>
              </div>
              <button
                onClick={() => setTrialModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-3">
              <p>
                Get your clinic onboarded on MediFlow in less than 5 minutes with an isolated database and custom subdomain:
              </p>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 font-mono text-[11px] text-teal-300">
                <div>✓ 14-Day Full Free Access</div>
                <div>✓ Isolated Database (tenant&lt;slug&gt;)</div>
                <div>✓ Subdomain: clinic.mediflow.lk</div>
                <div>✓ Doctor, Reception, Cashier & Pharmacy Desks</div>
              </div>

              <div className="pt-2 text-center">
                <p className="text-slate-400 text-[11px] mb-3">
                  To provision your clinic right now, use the <strong>Landlord SuperAdmin Portal</strong>:
                </p>
                <Link
                  href="/admin"
                  onClick={() => {
                    localStorage.setItem('mediflow_token', 'demo-admin-token');
                    localStorage.setItem('mediflow_role', 'SuperAdmin');
                  }}
                  className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs transition shadow flex items-center justify-center gap-1.5"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Open Landlord Portal to Provision Clinic</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
