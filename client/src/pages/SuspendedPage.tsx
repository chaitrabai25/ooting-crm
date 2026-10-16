import React, { useEffect, useState } from 'react';
import { AlertTriangle, Mail, Phone, RefreshCw, LogOut, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';

interface SuspensionDetails {
  code?: string;
  message?: string;
  reason?: string;
  suspendedAt?: string;
  support?: {
    email?: string;
    phone?: string;
  };
}

export const SuspendedPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [details, setDetails] = useState<SuspensionDetails>(() => {
    try {
      const stored = sessionStorage.getItem('ooting_crm_suspension');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // If not set from interceptor, populate from user context if available
    if (!details.reason && user?.company?.suspensionReason) {
      setDetails({
        message: 'This organization account has been temporarily suspended by the platform administrator.',
        reason: user.company.suspensionReason,
        suspendedAt: user.company.suspendedAt || undefined,
        support: {
          email: 'support@ooting.com',
          phone: '+91 99999 99999',
        },
      });
    }
  }, [user]);

  const handleCheckStatus = async () => {
    setIsChecking(true);
    try {
      await api.get('/auth/me');
      // If /auth/me succeeds without 403, account was reactivated!
      sessionStorage.removeItem('ooting_crm_suspension');
      window.location.href = '/';
    } catch (err: any) {
      if (err.response?.data) {
        setDetails(err.response.data);
      }
    } finally {
      setIsChecking(false);
    }
  };

  const supportEmail = details.support?.email || 'support@ooting.com';
  const supportPhone = details.support?.phone || '+91 99999 99999';
  const reasonText = details.reason || user?.company?.suspensionReason || 'Account suspended pending billing verification or administrative review.';
  const orgName = user?.company?.name || 'Your Organization';
  const orgCode = user?.company?.orgCode || 'ORG-UNKNOWN';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Background glow effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-xl w-full bg-slate-900 border border-red-900/40 rounded-2xl p-8 shadow-2xl relative z-10 text-center">
        {/* Warning Icon Badge */}
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-400">
          <ShieldAlert className="w-9 h-9" />
        </div>

        {/* Title & Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-xs font-semibold mb-3">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          ORGANIZATION WORKSPACE SUSPENDED
        </div>

        <h1 className="text-2xl font-bold text-white tracking-tight">
          Access Restricted
        </h1>
        <p className="text-sm text-slate-400 mt-2">
          The workspace for <span className="font-semibold text-slate-200">{orgName}</span> ({orgCode}) has been suspended by the platform administration.
        </p>

        {/* Suspension Reason Card */}
        <div className="mt-6 bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-left">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Administrative Reason
              </div>
              <div className="text-sm font-medium text-amber-200">
                {reasonText}
              </div>
              {details.suspendedAt && (
                <div className="text-xs text-slate-500">
                  Suspension Effective: {new Date(details.suspendedAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Resolution Steps & Contact */}
        <div className="mt-6 bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 text-left space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Next Steps for Resolution
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            All database operations, staff logins, and API access are temporarily halted for security and data compliance. Please reach out to your Ooting SaaS account representative to reactivate your workspace:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <a
              href={`mailto:${supportEmail}?subject=Reactivation%20Request%20-%20${encodeURIComponent(orgName)}%20(${encodeURIComponent(orgCode)})`}
              className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-900 border border-slate-700 hover:border-brand-500 text-slate-200 hover:text-white transition text-xs font-medium"
            >
              <Mail className="w-4 h-4 text-brand-400 flex-shrink-0" />
              <div className="truncate">
                <div className="text-[10px] text-slate-500">Email Support</div>
                <div className="truncate">{supportEmail}</div>
              </div>
            </a>

            <a
              href={`tel:${supportPhone}`}
              className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-900 border border-slate-700 hover:border-emerald-500 text-slate-200 hover:text-white transition text-xs font-medium"
            >
              <Phone className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div className="truncate">
                <div className="text-[10px] text-slate-500">Phone Support</div>
                <div className="truncate">{supportPhone}</div>
              </div>
            </a>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            onClick={handleCheckStatus}
            disabled={isChecking}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-lg transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking Workspace...' : 'Check Status'}
          </button>

          <button
            onClick={() => {
              logout();
              sessionStorage.removeItem('ooting_crm_suspension');
              window.location.href = '/login';
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-slate-500">
        Ooting CRM SaaS Platform &copy; {new Date().getFullYear()}. All Rights Reserved.
      </div>
    </div>
  );
};

export default SuspendedPage;
