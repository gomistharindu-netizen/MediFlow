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

export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenantId, setTenantIdState] = useState<string>('arogya');
  const [settings, setSettings] = useState<ClinicSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const setTenantId = (id: string) => {
    setTenantIdState(id);
    ApiClient.setTenant(id);
  };

  // Automatic Subdomain & URL Tenant Resolution (Zero tenant exposure)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');

      let resolvedTenant = 'arogya';

      // Subdomain resolution (e.g. suwapiyasa.mediflow.lk or nawaloka.lvh.me)
      if (parts.length > 1 && parts[0] !== 'www' && parts[0] !== 'localhost' && parts[0] !== 'admin') {
        resolvedTenant = parts[0];
      } else {
        // Query param resolution (?clinic=suwapiyasa)
        const urlParams = new URLSearchParams(window.location.search);
        const queryTenant = urlParams.get('clinic') || urlParams.get('tenant');
        if (queryTenant) {
          resolvedTenant = queryTenant;
        } else {
          const stored = localStorage.getItem('mediflow_tenant_id');
          if (stored) resolvedTenant = stored;
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
      // Fallback to default / mock values if API offline
      if (tenantId === 'suwapiyasa') {
        setSettings({
          ...defaultSettings,
          consultation_payment_timing: 'BEFORE',
          pharmacy_enabled: false,
          clinic_branding: {
            clinic_name: 'Suwa Piyasa Family Clinic',
            tagline: 'Quality Primary Healthcare for the Whole Family',
            registration_no: 'PHSRC/KAN/2026/142',
            address: 'No. 88, Peradeniya Road, Kandy',
            phone: '+94 81 223 4567',
          },
        });
      } else {
        setSettings({
          ...defaultSettings,
          consultation_payment_timing: 'AFTER',
          pharmacy_enabled: true,
          clinic_branding: {
            clinic_name: 'Arogya Medical Centre',
            tagline: 'Compassionate & Modern Outpatient Care',
            registration_no: 'PHSRC/COL/2026/89',
            address: 'No. 142, Galle Road, Colombo 03',
            phone: '+94 11 258 9632',
          },
        });
      }
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
