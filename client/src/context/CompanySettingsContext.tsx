import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';
import { CompanySettings } from '../types/index.js';

const defaultSettings: CompanySettings = {
  name: 'Ooting',
  tagline: 'Journeys Beyond Ordinary',
  email: 'support@ooting.in',
  phone: '+91 8884845595',
  address: 'Ooting 3rd Cross, Malavagoppa, BH Road, Shivamogga, Karnataka, India',
  website: 'https://ooting.in',
  gstin: 'NIL',
  logoUrl: '/assets/ooting-logo.jpg',
  bankName: 'Canara Bank',
  accountHolderName: 'Jeevan',
  accountNumber: '2891101013983',
  accountType: 'Current Account',
  ifsc: 'CNRB0005237',
  branch: 'Shivmogga',
  upiId: '',
  paymentNotes: 'Please quote your booking or quotation reference number during bank fund transfer.',
};

export const NEUTRAL_TENANT_LOGO = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="%232563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>';

export const getEffectiveLogoUrl = (company: CompanySettings): string => {
  if (company.logoUrl && company.logoUrl.trim() !== '') {
    if (!company.isOoting && company.logoUrl.includes('ooting')) {
      return NEUTRAL_TENANT_LOGO;
    }
    return company.logoUrl;
  }
  if (company.isOoting) {
    return '/assets/ooting-logo.jpg';
  }
  return NEUTRAL_TENANT_LOGO;
};

interface CompanySettingsContextType {
  company: CompanySettings;
  effectiveLogoUrl: string;
  isLoading: boolean;
  refreshCompany: () => Promise<void>;
  updateCompany: (updates: Partial<CompanySettings>) => void;
}

const CompanySettingsContext = createContext<CompanySettingsContextType | undefined>(undefined);

export const CompanySettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [company, setCompany] = useState<CompanySettings>(() => {
    const saved = localStorage.getItem('ooting_company_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...defaultSettings, ...parsed };
      } catch (e) {
        console.error('Failed to parse saved company settings:', e);
      }
    }
    return defaultSettings;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshCompany = useCallback(async () => {
    try {
      const res = await api.get('/settings/company');
      if (res.data?.company) {
        const fetched = { ...defaultSettings, ...res.data.company };
        setCompany(fetched);
        localStorage.setItem('ooting_company_settings', JSON.stringify(fetched));
      }
    } catch (err) {
      console.warn('Could not fetch latest company settings, using defaults or cache:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateCompany = (updates: Partial<CompanySettings>) => {
    setCompany(prev => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('ooting_company_settings', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    refreshCompany();
  }, [refreshCompany]);

  // Synchronize document title, favicon, and brand accents dynamically
  useEffect(() => {
    if (company?.name) {
      document.title = `${company.name} - CRM`;
    }
    if (company?.faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = company.faviconUrl;
    }
    if (company?.primaryColor) {
      document.documentElement.style.setProperty('--tenant-primary', company.primaryColor);
    }
  }, [company?.name, company?.faviconUrl, company?.primaryColor]);

  const effectiveLogoUrl = getEffectiveLogoUrl(company);

  return (
    <CompanySettingsContext.Provider value={{ company, effectiveLogoUrl, isLoading, refreshCompany, updateCompany }}>
      {children}
    </CompanySettingsContext.Provider>
  );
};

export const useCompanySettings = () => {
  const context = useContext(CompanySettingsContext);
  if (!context) {
    throw new Error('useCompanySettings must be used within a CompanySettingsProvider');
  }
  return context;
};
