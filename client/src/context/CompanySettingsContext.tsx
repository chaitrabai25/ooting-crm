import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';
import { CompanySettings } from '../types/index.js';

const defaultSettings: CompanySettings = {
  name: 'Ooting',
  tagline: 'Journeys Beyond Ordinary',
  email: 'contact@ooting.com',
  phone: '+91 98765 43210',
  address: 'Ooting Holidays Private Limited, Bangalore, Karnataka, India',
  website: 'https://ooting.in',
  gstin: '29AABCO1234F1Z5',
  logoUrl: '/assets/ooting-logo.jpg',
};

interface CompanySettingsContextType {
  company: CompanySettings;
  isLoading: boolean;
  refreshCompany: () => Promise<void>;
  updateCompany: (updates: Partial<CompanySettings>) => void;
}

const CompanySettingsContext = createContext<CompanySettingsContextType | undefined>(undefined);

export const CompanySettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [company, setCompany] = useState<CompanySettings>(() => {
    const saved = localStorage.getItem('ooting_company_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate away from banner if saved
      if (parsed.logoUrl === '/assets/ooting-banner.jpg') {
        parsed.logoUrl = '/assets/ooting-logo.jpg';
      }
      return { ...defaultSettings, ...parsed };
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

  return (
    <CompanySettingsContext.Provider value={{ company, isLoading, refreshCompany, updateCompany }}>
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
