'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ApiClient } from '@/lib/api';

export interface ClinicBranding {
  clinic_name: string;
  tagline?: string;
  registration_no?: string;
  address?: string;
  phone?: string;
}

export interface ClinicSettings {
  consultation_payment_timing: 'BEFORE' | 'AFTER';
  pharmacy_enabled: boolean;
  queue_late_arrival_policy: 'FAIR_16_24' | 'END_OF_QUEUE';
  queue_missed_recall_penalty: 'END_OF_WAITING' | 'AFTER_3';
  sms_enabled: boolean;
  sms_gateway_provider: string;
  sms_sender_mask: string;
  turn_alert_threshold: number;
  thermal_printer_width: '80mm' | '58mm';
  clinic_branding: ClinicBranding;
}

const defaultSettings: ClinicSettings = {
  consultation_payment_timing: 'AFTER',
  pharmacy_enabled: true,
  queue_late_arrival_policy: 'FAIR_16_24',
  queue_missed_recall_penalty: 'END_OF_WAITING',
  sms_enabled: true,
  sms_gateway_provider: 'mock',
  sms_sender_mask: 'MEDIFLOW',
  turn_alert_threshold: 3,
  thermal_printer_width: '80mm',
  clinic_branding: {
    clinic_name: 'MediFlow Clinic',
    tagline: 'Modern Outpatient Healthcare',
  },
};

interface ClinicContextType {
  tenantId: string;
  settings: ClinicSettings;
  isLoading: boolean;
  setTenantId: (id: string) => void;
  updateSettings: (newSettings: Partial<ClinicSettings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const ClinicContext = createContext<ClinicContextType>({
  tenantId: 'arogya',
  settings: defaultSettings,
  isLoading: true,
  setTenantId: () => {},
  updateSettings: async () => {},
  refreshSettings: async () => {},
});

export const KNOWN_TENANTS = ['nawaloka', 'asiri', 'arogya', 'suwapiyasa'];

export const CLINIC_INFO_MAP: Record<string, ClinicBranding> = {
  nawaloka: {
    clinic_name: 'Nawaloka Outpatient Care',
    tagline: 'Leading Healthcare Excellence & Diagnostics',
    registration_no: 'PHSRC/COL/2026/01',
    address: 'No. 23, Deshamanya H.K. Dharmadasa Mw, Colombo 02',
    phone: '+94 11 557 7111',
  },
  asiri: {
    clinic_name: 'Asiri Health Outpatient',
    tagline: 'Caring for Your Health, Everyday',
    registration_no: 'PHSRC/COL/2026/02',
    address: 'No. 181, Kirula Road, Narahenpita, Colombo 05',
    phone: '+94 11 452 4400',
  },
  arogya: {
    clinic_name: 'Arogya Medical Centre',
    tagline: 'Compassionate & Modern Outpatient Care',
    registration_no: 'PHSRC/COL/2026/89',
    address: 'No. 142, Galle Road, Colombo 03',
    phone: '+94 11 258 9632',
  },
  suwapiyasa: {
    clinic_name: 'Suwa Piyasa Family Clinic',
    tagline: 'Quality Primary Healthcare for the Whole Family',
    registration_no: 'PHSRC/KAN/2026/142',
    address: 'No. 88, Peradeniya Road, Kandy',
    phone: '+94 81 223 4567',
  },
};

export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenantId, setTenantIdState] = useState<string>('nawaloka');
  const [settings, setSettings] = useState<ClinicSettings>(() => ({
    ...defaultSettings,
    clinic_branding: CLINIC_INFO_MAP['nawaloka'],
  }));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const setTenantId = (id: string) => {
    const validTenant = KNOWN_TENANTS.includes(id) ? id : 'nawaloka';
    setTenantIdState(validTenant);
    ApiClient.setTenant(validTenant);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mediflow_tenant_id', validTenant);
    }
    setSettings(prev => ({
      ...prev,
      clinic_branding: CLINIC_INFO_MAP[validTenant] || prev.clinic_branding,
    }));
  };

  // Automatic Subdomain & URL Tenant Resolution (Safe against Vercel/Render hostnames)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname.toLowerCase();
      const parts = hostname.split('.');

      let resolvedTenant = 'nawaloka';

      // 1. Explicit query parameter (?clinic=nawaloka or ?tenant=nawaloka)
      const urlParams = new URLSearchParams(window.location.search);
      const queryTenant = urlParams.get('clinic') || urlParams.get('tenant');
      if (queryTenant && KNOWN_TENANTS.includes(queryTenant.toLowerCase())) {
        resolvedTenant = queryTenant.toLowerCase();
      } 
      // 2. Multi-tenant subdomain (e.g. nawaloka.lvh.me, nawaloka.mediflow.lk, nawaloka.medi-flow-indol.vercel.app)
      else if (KNOWN_TENANTS.includes(parts[0])) {
        resolvedTenant = parts[0];
      } 
      // 3. Stored tenant from previous user selection
      else {
        const stored = localStorage.getItem('mediflow_tenant_id');
        if (stored && KNOWN_TENANTS.includes(stored)) {
          resolvedTenant = stored;
        }
      }

      setTenantIdState(resolvedTenant);
      ApiClient.setTenant(resolvedTenant);
    }
  }, []);

  const refreshSettings = async () => {
    setIsLoading(true);
    try {
      const response = await ApiClient.get<{ settings: ClinicSettings }>(`/settings`);
      if (response && response.settings) {
        setSettings(response.settings);
      }
    } catch {
      // Fallback to clinic preset branding if API offline
      const info = CLINIC_INFO_MAP[tenantId] || CLINIC_INFO_MAP['nawaloka'];
      setSettings({
        ...defaultSettings,
        consultation_payment_timing: tenantId === 'suwapiyasa' ? 'BEFORE' : 'AFTER',
        pharmacy_enabled: tenantId !== 'suwapiyasa',
        clinic_branding: info,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<ClinicSettings>) => {
    try {
      await ApiClient.post('/settings', newSettings);
      setSettings(prev => ({ ...prev, ...newSettings }));
    } catch {
      // Optimistic update locally
      setSettings(prev => ({ ...prev, ...newSettings }));
    }
  };

  useEffect(() => {
    const initialTenant = ApiClient.getTenant();
    setTenantIdState(initialTenant);
    refreshSettings();
  }, [tenantId]);

  return (
    <ClinicContext.Provider
      value={{
        tenantId,
        settings,
        isLoading,
        setTenantId,
        updateSettings,
        refreshSettings,
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
};

export const useClinic = () => useContext(ClinicContext);
