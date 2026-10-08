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
import { Building2, Mail, Phone, MapPin, FileText, CheckCircle2, ShieldAlert, Sparkles, Image, Save, Database, Download, Globe, Landmark, CreditCard, Upload, Loader2, RotateCcw } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.js';
import { useCompanySettings } from '../../context/CompanySettingsContext.js';
import { CompanySettings } from '../../types/index.js';
import { BrandLoader } from '../../components/ui/BrandLoader.js';

interface MasterData {
  leadStatuses: string[];
  bookingStatuses: string[];
  paymentMethods: string[];
  followUpTypes: string[];
  expenseCategories: string[];
}

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { updateCompany: syncGlobalCompany, refreshCompany } = useCompanySettings();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [company, setCompany] = useState<CompanySettings>({
    name: 'Ooting',
    tagline: 'Journeys Beyond Ordinary',
    email: 'support@ooting.in',
    phone: '+91 8884845595',
    address: 'Ooting 3rd Cross, Malavagoppa, BH Road, Shivamogga, Karnataka, India',
    website: 'https://ooting.in',
    gstin: 'NIL',
    logoUrl: '/assets/ooting-logo.jpg',
    bankName: 'canara',
    accountHolderName: 'Jeevan',
    accountNumber: '2891101013983',
    accountType: 'Current Account',
    ifsc: 'CNRB0005237',
    branch: 'Shivmogga',
    upiId: '',
    paymentNotes: '',
  });

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

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleDownloadDump}
              disabled={isDumping || !isAdmin}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isDumping ? 'Generating Database Dump...' : 'Download Complete Database Dump (.json)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
