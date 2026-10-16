import React, { useEffect, useState } from 'react';
import {
  Settings,
  ShieldAlert,
  Save,
  RefreshCw,
  Mail,
  Phone,
  Sliders,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { notifyError, notifySuccess } from '../../utils/sweetalert.js';

export const SaaSSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    platformName: 'Ooting CRM SaaS Platform',
    supportEmail: 'support@ooting.com',
    supportPhone: '+91 99999 99999',
    defaultStaffLimit: 1,
    strictStaffLimitEnforced: true,
    maintenanceMode: false,
    sessionTimeoutMinutes: 1440,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/saas/settings');
      if (res.data.settings) {
        setSettings((prev) => ({
          ...prev,
          ...res.data.settings,
        }));
      }
    } catch (err: any) {
      console.warn('Using default settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await api.put('/saas/settings', settings);
      notifySuccess('Platform Settings Saved', 'Global SaaS configurations and support details updated.');
    } catch (err: any) {
      notifyError('Failed to Save', err.response?.data?.message || 'Unable to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 uppercase tracking-wider">
            Layer A Configuration
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
          Global SaaS Platform Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure default staff quotas, customer support contact channels displayed on suspension notices, and security timeouts.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Support & Brand Details */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-brand-500" />
            Support Channels & Suspension Notice Metadata
          </h2>
          <p className="text-xs text-slate-500">
            These contact details are automatically rendered on the dedicated Suspension Notice Screen whenever a company workspace is halted.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Platform Name
              </label>
              <input
                type="text"
                required
                value={settings.platformName}
                onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Official Support Email
              </label>
              <input
                type="email"
                required
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Support Emergency Phone
              </label>
              <input
                type="text"
                required
                value={settings.supportPhone}
                onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Session Token Lifetime (Minutes)
              </label>
              <input
                type="number"
                min="15"
                value={settings.sessionTimeoutMinutes}
                onChange={(e) => setSettings({ ...settings, sessionTimeoutMinutes: parseInt(e.target.value) || 1440 })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Default Staff Limit & Strict Quota Policy */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-500" />
            Tenancy Quotas & Default Seat Governance
          </h2>
          <p className="text-xs text-slate-500">
            Rules governing new customer organizations onboarded to Ooting CRM.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Default Staff Limit for Customer Organizations
              </label>
              <input
                type="number"
                min="1"
                required
                value={settings.defaultStaffLimit}
                onChange={(e) => setSettings({ ...settings, defaultStaffLimit: parseInt(e.target.value) || 1 })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Standard policy is strictly 1 staff seat. Additional staff require formal approval.
              </span>
            </div>

            <div className="flex flex-col justify-center">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.strictStaffLimitEnforced}
                  onChange={(e) => setSettings({ ...settings, strictStaffLimitEnforced: e.target.checked })}
                  className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Enforce Concurrency-Safe Transactional Cap
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Rejects staff creation via API when seat limit is reached.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving Configurations...' : 'Save Platform Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SaaSSettings;
