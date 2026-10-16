import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Users,
  Database,
  ShieldCheck,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  RefreshCw,
  Clock,
  Activity,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.js';
import { notifyError } from '../../utils/sweetalert.js';

interface DashboardData {
  metrics: {
    totalOrganizations: number;
    activeOrganizations: number;
    suspendedOrganizations: number;
    totalStaff: number;
    pendingRequests: number;
    healthyDatabases: number;
    totalDatabases: number;
  };
  recentOrganizations: any[];
  recentAuditLogs: any[];
}

export const SaaSDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/saas/dashboard');
      setData(res.data);
    } catch (err: any) {
      notifyError('Failed to Load Dashboard', err.response?.data?.message || 'Unable to retrieve SaaS metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading SaaS Platform Telemetry...</p>
        </div>
      </div>
    );
  }

  const { metrics, recentOrganizations, recentAuditLogs } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider">
              Layer A &bull; Platform Root Admin
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            SaaS Infrastructure & Tenancy Hub
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time multi-tenant telemetry, database cluster health, strict seat quota governance, and immediate suspension controls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboard}
            className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Refresh Metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/saas/organizations"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Provision Customer Org
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Organizations */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Organizations
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-3">
            {metrics.totalOrganizations}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              {metrics.activeOrganizations} Active
            </span>
            <span>&bull;</span>
            <span className="text-red-500 font-medium">
              {metrics.suspendedOrganizations} Suspended
            </span>
          </div>
        </div>

        {/* Database Clusters */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tenant Databases
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-3">
            {metrics.totalDatabases}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {metrics.healthyDatabases} Healthy & Online
          </div>
        </div>

        {/* Total Staff Users */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Staff Accounts
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-3">
            {metrics.totalStaff}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Governed by 1-Staff Default Limit
          </div>
        </div>

        {/* Pending Seat Requests */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Staff Seat Requests
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-3">
            {metrics.pendingRequests}
          </div>
          <div className="mt-1">
            {metrics.pendingRequests > 0 ? (
              <Link
                to="/saas/staff-requests"
                className="text-xs text-amber-600 dark:text-amber-400 font-medium hover:underline inline-flex items-center gap-1"
              >
                Requires approval action <ArrowUpRight className="w-3 h-3" />
              </Link>
            ) : (
              <span className="text-xs text-slate-500 dark:text-slate-400">Queue is clear</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid: Organizations & Platform Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Organizations Summary */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Active Organizations Directory</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Companies using Ooting CRM multi-tenant software</p>
            </div>
            <Link
              to="/saas/organizations"
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium inline-flex items-center gap-1"
            >
              View All ({metrics.totalOrganizations}) <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Organization</th>
                  <th className="py-2.5 px-3">Tier</th>
                  <th className="py-2.5 px-3">Staff Seats</th>
                  <th className="py-2.5 px-3">Tenant DB</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {recentOrganizations.map((org) => {
                  const staffCount = org._count?.users || 0;
                  const limit = org.maxStaffLimit ?? (org.isOoting ? 9999 : 1);
                  const isSuspended = org.status === 'SUSPENDED';

                  return (
                    <tr key={org.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          {org.name}
                          {org.isOoting && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-brand-500/10 text-brand-500">
                              OOTING ROOT
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {org.orgCode || 'ORG-UNKNOWN'}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {org.subscriptionTier || 'STANDARD'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className={staffCount >= limit && !org.isOoting ? 'text-amber-500 font-bold' : 'text-slate-700 dark:text-slate-300'}>
                            {staffCount}
                          </span>
                          <span className="text-slate-400">/</span>
                          <span className="text-slate-500">{org.isOoting ? '∞' : limit}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {org.tenantDatabase ? (
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${org.tenantDatabase.status === 'READY' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                              {org.tenantDatabase.status}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Central TiDB</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {isSuspended ? (
                          <Badge variant="danger" size="sm">SUSPENDED</Badge>
                        ) : org.status === 'ACTIVE' ? (
                          <Badge variant="success" size="sm">ACTIVE</Badge>
                        ) : (
                          <Badge variant="warning" size="sm">{org.status}</Badge>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          to={`/saas/organizations/${org.id}`}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-medium text-[11px] transition inline-flex items-center gap-1"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Platform Audit Logs */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Security & Audit Log</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Platform administrative events</p>
            </div>
            <Link
              to="/saas/audit-logs"
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium inline-flex items-center gap-1"
            >
              All Logs <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentAuditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">No platform audit logs recorded yet.</p>
            ) : (
              recentAuditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px]">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                    {log.details}
                  </p>
                  <div className="text-[10px] text-slate-400 pt-0.5 font-mono">
                    By: {log.adminEmail}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaaSDashboard;
