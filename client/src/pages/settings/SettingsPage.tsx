/**
 * @file SettingsPage.tsx
 * @description Ooting CRM Organization Configuration & Master Data Control Center.
 * Features:
 *  - Company profile management: legal name, branding tagline, support email, phone, physical address.
 *  - Official banking credentials: bank name, beneficiary name, account number, IFSC, branch, UPI.
 *  - Master data dictionary view (statuses, categories, payment methods).
 *  - Database backup snapshot generation & export.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Building2, Mail, Phone, MapPin, FileText, CheckCircle2, ShieldAlert, Sparkles, Image, Save, Database, Download, Globe, Landmark, CreditCard, Upload, Loader2, RotateCcw, Compass, FileSpreadsheet } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.js';
import { useCompanySettings } from '../../context/CompanySettingsContext.js';
import { CompanySettings } from '../../types/index.js';
import { BrandLoader } from '../../components/ui/BrandLoader.js';

export const ALL_CRM_MODULES = [
  { id: 'dashboard', name: 'Dashboard', desc: 'CRM executive overview & live operational stats', category: 'General' },
  { id: 'calendar', name: 'CRM Calendar', desc: 'Operations departures and tour schedule calendar', category: 'General' },
  { id: 'leads', name: 'Leads & Enquiries', desc: 'Inquiry capture, pipeline stages & follow-ups', category: 'Sales' },
  { id: 'followups', name: 'Follow-ups', desc: 'Client follow-up tracking & call schedules', category: 'Sales' },
  { id: 'quotations', name: 'Quotations', desc: 'PDF quotation builder, margin calculator & estimates', category: 'Sales' },
  { id: 'bookings', name: 'Bookings & Tours', desc: 'Confirmed group & FIT tour bookings', category: 'Sales' },
  { id: 'customers', name: 'Customer Directory', desc: 'Client database, history, and passenger records', category: 'Operations' },
  { id: 'packages', name: 'Tour Packages', desc: 'Curated itineraries, sightseeing plans & pricing', category: 'Operations' },
  { id: 'places', name: 'Places Master', desc: 'Destinations, tourist attractions & sightseeing library', category: 'Operations' },
  { id: 'guides', name: 'Tour Guides & Field Ops', desc: 'Guide assignments, safety roll-calls & expenses', category: 'Operations' },
  { id: 'cabs', name: 'Tourist Cabs & Transport', desc: 'Vehicle fleet, chauffeur logistics & bookings', category: 'Operations' },
  { id: 'hotels', name: 'Hotels & Accommodation', desc: 'B2B hotel rates, meal plans & room bookings', category: 'Operations' },
  { id: 'agents', name: 'Travel Agents (B2B)', desc: 'B2B agent partnerships, commission rates & accounts', category: 'Operations' },
  { id: 'suppliers', name: 'B2B Suppliers & Vendors', desc: 'Transport operators, guides & hotel contacts', category: 'Operations' },
  { id: 'payments', name: 'Payments & Collections', desc: 'Client payments, transaction receipts & ledger', category: 'Finance' },
  { id: 'expenses', name: 'Tour Expenses & Settlement', desc: 'Passenger extras, shared pools & P&L accounting', category: 'Finance' },
  { id: 'whatsapp', name: 'WhatsApp Business Messaging', desc: 'Automated WhatsApp messaging & templates (Disable if WhatsApp is temporarily offline)', category: 'Communication', isAttention: true },
  { id: 'reports', name: 'Reports', desc: 'Executive P&L summaries, lead sources & conversions', category: 'Finance' },
  { id: 'analytics', name: 'Analytics', desc: 'Interactive visual analytics, revenue trends & booking metrics', category: 'Finance' },
];

interface MasterData {
  leadStatuses: string[];
  bookingStatuses: string[];
  paymentMethods: string[];
  followUpTypes: string[];
  expenseCategories: string[];
}

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { company: contextCompany, updateCompany: syncGlobalCompany, refreshCompany } = useCompanySettings();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [company, setCompany] = useState<CompanySettings>(() => ({ ...contextCompany }));

  const [masterData, setMasterData] = useState<MasterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDumping, setIsDumping] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Logo image exceeds 10 MB limit. Please select a smaller file.');
      return;
    }

    setIsUploadingLogo(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      const safeName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_') + '.webp';
      formData.append('image', file, safeName);
      formData.append('folder', 'company');

      const res = await api.post('/upload/image?folder=company', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.url) {
        setCompany((prev) => ({ ...prev, logoUrl: res.data.url }));
        setSuccessMessage('Brand logo uploaded successfully! Click "Save Settings" below to apply across all documents.');
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (err: any) {
      console.warn('Server upload failed, converting to local data URL:', err);
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setCompany((prev) => ({ ...prev, logoUrl: dataUrl }));
        setSuccessMessage('Logo loaded locally! Click "Save Settings" below to apply across all documents.');
        setTimeout(() => setSuccessMessage(null), 5000);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
    }
  };

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/settings');
      if (res.data.company) {
        setCompany(res.data.company);
      }
      if (res.data.masterData) {
        setMasterData(res.data.masterData);
      }
    } catch (err: any) {
      console.error('Failed to load settings:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to load company settings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await api.put('/settings', company);
      syncGlobalCompany(company);
      await refreshCompany();
      setSuccessMessage('Company profile settings saved successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const isModuleActive = (moduleId: string): boolean => {
    if (!company.enabledModules) return true;
    try {
      const parsed = JSON.parse(company.enabledModules);
      if (Array.isArray(parsed)) return parsed.includes(moduleId);
    } catch {
      const list = company.enabledModules.split(',').map((s) => s.trim());
      return list.includes(moduleId);
    }
    return true;
  };

  const toggleModule = async (moduleId: string) => {
    let currentList: string[] = [];
    if (!company.enabledModules) {
      currentList = ALL_CRM_MODULES.map((m) => m.id);
    } else {
      try {
        const parsed = JSON.parse(company.enabledModules);
        if (Array.isArray(parsed)) {
          currentList = [...parsed];
        } else {
          currentList = company.enabledModules.split(',').map((s) => s.trim()).filter(Boolean);
        }
      } catch {
        currentList = company.enabledModules.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }

    if (currentList.includes(moduleId)) {
      currentList = currentList.filter((id) => id !== moduleId);
    } else {
      currentList.push(moduleId);
    }

    const updated = { ...company, enabledModules: JSON.stringify(currentList) };
    setCompany(updated);
    syncGlobalCompany(updated);

    // Immediate autosave to backend
    try {
      await api.put('/settings', updated);
      await refreshCompany();
      setSuccessMessage('Sidebar navigation updated & autosaved.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to autosave module settings:', err);
    }
  };

  const handleBatchModules = async (modulesList: string[], msg: string) => {
    const updated = { ...company, enabledModules: JSON.stringify(modulesList) };
    setCompany(updated);
    syncGlobalCompany(updated);

    try {
      await api.put('/settings', updated);
      await refreshCompany();
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to autosave batch module settings:', err);
    }
  };

  const handleDownloadDump = async () => {
    try {
      setIsDumping(true);
      const res = await api.get('/settings/backup/dump', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ooting-crm-full-dump-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccessMessage('Full CRM database dump downloaded successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to download dump:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to download database dump.');
    } finally {
      setIsDumping(false);
    }
  };

  const handleDownloadQAReport = () => {
    const link = document.createElement('a');
    link.href = '/reports/Ooting_CRM_Comprehensive_QA_Testing_Report.xlsx';
    link.setAttribute('download', 'Ooting_CRM_Comprehensive_QA_Testing_Report.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    setSuccessMessage('Comprehensive QA Testing Report (.xlsx) downloaded successfully.');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <BrandLoader size="lg" text="Loading System Settings..." subtext="Retrieving company profile and configuration" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">System & Company Settings</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure business profile, quotation letterhead details, duty slips, and tax invoices
        </p>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Company Profile Form */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-50 dark:bg-brand-950/40 text-brand-600 rounded-lg">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Company Information & Single Source of Truth</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Updating these values automatically updates all documents (Duty Slips, Invoices, Quotations, Itineraries, and Navigation)
              </p>
            </div>
          </div>
          {!isAdmin && (
            <span className="text-[11px] bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200 font-medium">
              Read-only (Admin access required to edit)
            </span>
          )}
        </div>

        <form onSubmit={handleSaveCompany} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Company Name *</label>
              <input
                type="text"
                required
                disabled={!isAdmin}
                value={company.name}
                onChange={(e) => setCompany({ ...company, name: e.target.value })}
                placeholder="Ooting"
                className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Tagline / Subtitle</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={company.tagline}
                onChange={(e) => setCompany({ ...company, tagline: e.target.value })}
                placeholder="Journeys Beyond Ordinary"
                className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Official Email *</label>
              <input
                type="email"
                required
                disabled={!isAdmin}
                value={company.email}
                onChange={(e) => setCompany({ ...company, email: e.target.value })}
                placeholder="contact@ooting.com"
                className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Contact Phone Number *</label>
              <input
                type="text"
                required
                disabled={!isAdmin}
                value={company.phone}
                onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Website URL</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={company.website || ''}
                onChange={(e) => setCompany({ ...company, website: e.target.value })}
                placeholder="https://ooting.in"
                className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">GSTIN / Registration No.</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={company.gstin}
                onChange={(e) => setCompany({ ...company, gstin: e.target.value })}
                placeholder="29AABCO1234F1Z5"
                className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 uppercase"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Registered Office Address</label>
              <textarea
                rows={2}
                disabled={!isAdmin}
                value={company.address}
                onChange={(e) => setCompany({ ...company, address: e.target.value })}
                placeholder="Ooting Holidays Private Limited, Bangalore, Karnataka, India"
                className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Brand Logo</label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Used across Quotations, Invoices, Cab Duty Slips, Itineraries & CRM Navigation
                </span>
              </div>

              {/* Hidden file input for manual upload */}
              <input
                type="file"
                ref={logoInputRef}
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleLogoUpload}
                className="hidden"
                disabled={!isAdmin || isUploadingLogo}
              />

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Upload Button */}
                {isAdmin && (
                  <button
                    type="button"
                    disabled={isUploadingLogo}
                    onClick={() => logoInputRef.current?.click()}
                    className="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50 cursor-pointer shrink-0"
                    title="Upload custom logo file from your computer (for B2B, white-label, or brand updates)"
                  >
                    {isUploadingLogo ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Logo File</span>
                      </>
                    )}
                  </button>
                )}

                {/* Direct URL input */}
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={company.logoUrl}
                  onChange={(e) => setCompany({ ...company, logoUrl: e.target.value })}
                  placeholder="/assets/ooting-logo.jpg or https://..."
                  className="flex-1 min-w-[240px] p-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 text-xs"
                />

                {/* Quick Presets (Only displayed for master instance) */}
                {isAdmin && (company as any).isOoting && (
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setCompany({ ...company, logoUrl: '/assets/ooting-logo.jpg' })}
                      className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-[11px] font-medium transition cursor-pointer text-slate-700 dark:text-slate-300"
                    >
                      Default Logo
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompany({ ...company, logoUrl: '/assets/ooting-icon-white.jpg' })}
                      className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-[11px] font-medium transition cursor-pointer text-slate-700 dark:text-slate-300"
                    >
                      White Icon
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompany({ ...company, logoUrl: '/assets/ooting-banner.jpg' })}
                      className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-[11px] font-medium transition cursor-pointer text-slate-700 dark:text-slate-300"
                    >
                      Full Banner
                    </button>
                  </div>
                )}
              </div>

              {/* Logo Preview & Reset */}
              {company.logoUrl && (
                <div className="mt-2.5 p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0">Live Preview:</span>
                    <div className="p-1 bg-white/10 rounded-lg border border-white/10 flex items-center justify-center max-w-[160px] max-h-12 overflow-hidden">
                      <img
                        src={company.logoUrl}
                        alt="Logo Preview"
                        className="max-h-10 max-w-[150px] object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-300 truncate max-w-xs font-mono">
                      {company.logoUrl}
                    </span>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setCompany({ ...company, logoUrl: (company as any).isOoting ? '/assets/ooting-logo.jpg' : '' })}
                      className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition shrink-0 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* White-Label Customization (Favicon & Brand Colors) */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Favicon URL</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={company.faviconUrl || ''}
                  onChange={(e) => setCompany({ ...company, faviconUrl: e.target.value })}
                  placeholder="https://.../favicon.ico"
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Primary Brand Accent</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    disabled={!isAdmin}
                    value={company.primaryColor || '#2563eb'}
                    onChange={(e) => setCompany({ ...company, primaryColor: e.target.value })}
                    className="w-9 h-9 rounded border border-slate-300 dark:border-slate-700 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={company.primaryColor || '#2563eb'}
                    onChange={(e) => setCompany({ ...company, primaryColor: e.target.value })}
                    placeholder="#2563eb"
                    className="flex-1 p-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Secondary Accent</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    disabled={!isAdmin}
                    value={company.secondaryColor || '#1e40af'}
                    onChange={(e) => setCompany({ ...company, secondaryColor: e.target.value })}
                    className="w-9 h-9 rounded border border-slate-300 dark:border-slate-700 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={company.secondaryColor || '#1e40af'}
                    onChange={(e) => setCompany({ ...company, secondaryColor: e.target.value })}
                    placeholder="#1e40af"
                    className="flex-1 p-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bank & Payment Information Section (For Invoices) */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-md">
                <Landmark className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Bank Account & UPI Details (For Invoices)</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">These details will dynamically appear in all generated invoices and client payment slips</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Bank Name</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={company.bankName || ''}
                  onChange={(e) => setCompany({ ...company, bankName: e.target.value })}
                  placeholder="e.g. HDFC Bank / State Bank of India"
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Account Holder Name</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={company.accountHolderName || ''}
                  onChange={(e) => setCompany({ ...company, accountHolderName: e.target.value })}
                  placeholder="e.g. Ooting Holidays Private Limited"
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Account Number</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={company.accountNumber || ''}
                  onChange={(e) => setCompany({ ...company, accountNumber: e.target.value })}
                  placeholder="e.g. 50200088991122"
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Account Type</label>
                <select
                  disabled={!isAdmin}
                  value={company.accountType || 'Current Account'}
                  onChange={(e) => setCompany({ ...company, accountType: e.target.value })}
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <option value="Current Account">Current Account</option>
                  <option value="Savings Account">Savings Account</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">IFSC Code</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={company.ifsc || ''}
                  onChange={(e) => setCompany({ ...company, ifsc: e.target.value.toUpperCase() })}
                  placeholder="e.g. HDFC0001234"
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 font-mono uppercase"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Branch Name</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={company.branch || ''}
                  onChange={(e) => setCompany({ ...company, branch: e.target.value })}
                  placeholder="e.g. Indiranagar, Bangalore"
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">UPI ID / VPA</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={company.upiId || ''}
                  onChange={(e) => setCompany({ ...company, upiId: e.target.value })}
                  placeholder="e.g. ooting@upi or 9876543210@okhdfcbank"
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Payment Notes / Instructions</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={company.paymentNotes || ''}
                  onChange={(e) => setCompany({ ...company, paymentNotes: e.target.value })}
                  placeholder="e.g. Share transaction UTR screenshot after payment"
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>
          </div>

            {/* Sidebar Navigation & Active Modules Control */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-brand-50 dark:bg-brand-950/40 text-brand-600 rounded-lg">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>Sidebar Navigation & Active Modules Control</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border border-brand-200">
                        Admin Only
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Enable or disable CRM sidebar sections for your staff (e.g. toggle off WhatsApp while service is temporarily offline).
                    </p>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleBatchModules(
                          ALL_CRM_MODULES.map((m) => m.id),
                          'All CRM modules enabled & autosaved.'
                        )
                      }
                      className="px-2.5 py-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 dark:bg-brand-950/60 rounded-md border border-brand-200 transition-colors cursor-pointer"
                    >
                      Enable All
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleBatchModules(
                          ALL_CRM_MODULES.map((m) => m.id).filter((id) => id !== 'whatsapp'),
                          'WhatsApp disabled & preferences autosaved.'
                        )
                      }
                      className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/60 rounded-md border border-rose-200 transition-colors cursor-pointer"
                    >
                      Turn Off WhatsApp Only
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {ALL_CRM_MODULES.map((mod) => {
                  const isEnabled = isModuleActive(mod.id);
                  return (
                    <div
                      key={mod.id}
                      onClick={() => isAdmin && toggleModule(mod.id)}
                      className={`p-3 rounded-xl border transition-all select-none ${
                        isAdmin ? 'cursor-pointer hover:shadow-2xs' : 'opacity-70 cursor-not-allowed'
                      } ${
                        isEnabled
                          ? 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700'
                          : 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200/70 dark:border-rose-900/40 text-slate-500'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`font-bold text-xs ${
                                isEnabled ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {mod.name}
                            </span>
                            <span
                              className={`text-[9.5px] font-black uppercase px-1.5 py-0.2 rounded border ${
                                isEnabled
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                  : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                              }`}
                            >
                              {isEnabled ? 'Active' : 'Inactive'}
                            </span>
                            {mod.isAttention && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                WhatsApp
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {mod.desc}
                          </p>
                        </div>

                        {/* Toggle Pill Switch (Green for active, Red for inactive) */}
                        <div
                          className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors shrink-0 shadow-2xs ${
                            isEnabled ? 'bg-emerald-600' : 'bg-rose-500'
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                              isEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          {isAdmin && (
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving Changes...' : 'Save Settings'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* CRM Master Data Reference */}
      {masterData && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">CRM Workflow & Master Taxonomies</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Active CRM lifecycle stages and workflow categories enforced across the system
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            {/* Lead Statuses */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50/50 dark:bg-slate-850/50">
              <span className="font-bold text-slate-800 dark:text-slate-200 block mb-2">Lead Pipeline Stages</span>
              <div className="flex flex-wrap gap-1.5">
                {masterData.leadStatuses.map((st) => (
                  <span
                    key={st}
                    className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded text-[10px] font-medium"
                  >
                    {st}
                  </span>
                ))}
              </div>
            </div>

            {/* Booking Statuses */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50/50 dark:bg-slate-850/50">
              <span className="font-bold text-slate-800 dark:text-slate-200 block mb-2">Booking Statuses</span>
              <div className="flex flex-wrap gap-1.5">
                {masterData.bookingStatuses.map((st) => (
                  <span
                    key={st}
                    className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded text-[10px] font-medium"
                  >
                    {st}
                  </span>
                ))}
              </div>
            </div>

            {/* Payment Methods */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50/50 dark:bg-slate-850/50">
              <span className="font-bold text-slate-800 dark:text-slate-200 block mb-2">Payment Methods</span>
              <div className="flex flex-wrap gap-1.5">
                {masterData.paymentMethods.map((pm) => (
                  <span
                    key={pm}
                    className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded text-[10px] font-medium"
                  >
                    {pm}
                  </span>
                ))}
              </div>
            </div>

            {/* Follow-up Channels */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50/50 dark:bg-slate-850/50">
              <span className="font-bold text-slate-800 dark:text-slate-200 block mb-2">Follow-up Communication</span>
              <div className="flex flex-wrap gap-1.5">
                {masterData.followUpTypes.map((ft) => (
                  <span
                    key={ft}
                    className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded text-[10px] font-medium"
                  >
                    {ft}
                  </span>
                ))}
              </div>
            </div>

            {/* Expense Categories */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50/50 dark:bg-slate-850/50 md:col-span-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block mb-2">Expense Categories (P&L Ledger)</span>
              <div className="flex flex-wrap gap-1.5">
                {masterData.expenseCategories.map((ec) => (
                  <span
                    key={ec}
                    className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded text-[10px] font-medium"
                  >
                    {ec.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complete CRM Data Dump & Permanent Backup Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-lg">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Permanent Data Backup & Complete CRM Dump</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Download a complete, offline JSON archive of all customers, leads, bookings, quotations, payments, and cabs
              </p>
            </div>
          </div>
          <span className="text-[11px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-200 font-medium">
            Zero Data Loss Guarantee
          </span>
        </div>

        <div className="p-6 text-xs text-slate-600 dark:text-slate-300 space-y-4">
          <p>
            Your CRM records are stored with full relational integrity. Use this one-click feature anytime to download a full raw data dump. This file can be kept as a safe offline backup or imported into any new database or CRM system in the future.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleDownloadDump}
              disabled={isDumping || !isAdmin}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isDumping ? 'Generating Database Dump...' : 'Download Complete Database Dump (.json)'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadQAReport}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download Enterprise QA Testing Report (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
