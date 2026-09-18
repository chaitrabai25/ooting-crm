import React, { useState, useEffect } from 'react';
import { Building2, Mail, Phone, MapPin, FileText, CheckCircle2, ShieldAlert, Sparkles, Image, Save, Database, Download } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.js';

interface CompanySettings {
  name: string;
  tagline: string;
  email: string;
  phone: string;
  address: string;
  gstin: string;
  logoUrl: string;
}

interface MasterData {
  leadStatuses: string[];
  bookingStatuses: string[];
  paymentMethods: string[];
  followUpTypes: string[];
  expenseCategories: string[];
}

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const [company, setCompany] = useState<CompanySettings>({
    name: '',
    tagline: '',
    email: '',
    phone: '',
    address: '',
    gstin: '',
    logoUrl: '',
  });

  const [masterData, setMasterData] = useState<MasterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDumping, setIsDumping] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">System & Company Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure business profile, quotation letterhead details, and view CRM master data
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
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-50 text-brand-600 rounded-lg">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Company Information & Letterhead</h2>
              <p className="text-[11px] text-slate-500">
                These details appear on official customer quotations, vouchers, and invoices
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
              <label className="font-semibold text-slate-700">Company Name *</label>
              <input
                type="text"
                required
                disabled={!isAdmin}
                value={company.name}
                onChange={(e) => setCompany({ ...company, name: e.target.value })}
                placeholder="Ooting"
                className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700">Tagline / Subtitle</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={company.tagline}
                onChange={(e) => setCompany({ ...company, tagline: e.target.value })}
                placeholder="Curating journeys, crafting memories"
                className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700">Official Email *</label>
              <input
                type="email"
                required
                disabled={!isAdmin}
                value={company.email}
                onChange={(e) => setCompany({ ...company, email: e.target.value })}
                placeholder="travel@ooting.com"
                className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700">Contact Phone Number *</label>
              <input
                type="text"
                required
                disabled={!isAdmin}
                value={company.phone}
                onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700">GSTIN / Registration No.</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={company.gstin}
                onChange={(e) => setCompany({ ...company, gstin: e.target.value })}
                placeholder="29AAAAA0000A1Z5"
                className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 uppercase"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700">Brand Logo Path / URL</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={company.logoUrl}
                onChange={(e) => setCompany({ ...company, logoUrl: e.target.value })}
                placeholder="/assets/ooting-logo.jpg"
                className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-semibold text-slate-700">Registered Office Address</label>
              <textarea
                rows={2}
                disabled={!isAdmin}
                value={company.address}
                onChange={(e) => setCompany({ ...company, address: e.target.value })}
                placeholder="Ooting Travels, Brigade Road, Bangalore, Karnataka, India"
                className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          {isAdmin && (
            <div className="pt-2 flex justify-end">
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900">CRM Workflow & Master Taxonomies</h2>
            <p className="text-[11px] text-slate-500">
              Active CRM lifecycle stages and workflow categories enforced across the system
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            {/* Lead Statuses */}
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
              <span className="font-bold text-slate-800 block mb-2">Lead Pipeline Stages</span>
              <div className="flex flex-wrap gap-1.5">
                {masterData.leadStatuses.map((st) => (
                  <span
                    key={st}
                    className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded text-[10px] font-medium"
                  >
                    {st}
                  </span>
                ))}
              </div>
            </div>

            {/* Booking Statuses */}
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
              <span className="font-bold text-slate-800 block mb-2">Booking Statuses</span>
              <div className="flex flex-wrap gap-1.5">
                {masterData.bookingStatuses.map((st) => (
                  <span
                    key={st}
                    className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded text-[10px] font-medium"
                  >
                    {st}
                  </span>
                ))}
              </div>
            </div>

            {/* Payment Methods */}
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
              <span className="font-bold text-slate-800 block mb-2">Payment Methods</span>
              <div className="flex flex-wrap gap-1.5">
                {masterData.paymentMethods.map((pm) => (
                  <span
                    key={pm}
                    className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded text-[10px] font-medium"
                  >
                    {pm}
                  </span>
                ))}
              </div>
            </div>

            {/* Follow-up Channels */}
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
              <span className="font-bold text-slate-800 block mb-2">Follow-up Communication</span>
              <div className="flex flex-wrap gap-1.5">
                {masterData.followUpTypes.map((ft) => (
                  <span
                    key={ft}
                    className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded text-[10px] font-medium"
                  >
                    {ft}
                  </span>
                ))}
              </div>
            </div>

            {/* Expense Categories */}
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 md:col-span-2">
              <span className="font-bold text-slate-800 block mb-2">Expense Categories (P&L Ledger)</span>
              <div className="flex flex-wrap gap-1.5">
                {masterData.expenseCategories.map((ec) => (
                  <span
                    key={ec}
                    className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded text-[10px] font-medium"
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
