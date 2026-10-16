import React, { useEffect, useState } from 'react';
import {
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Server,
  Activity,
  Zap,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.js';
import { notifyError, notifySuccess } from '../../utils/sweetalert.js';

export const TenantDatabaseStatus: React.FC = () => {
  const [databases, setDatabases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPingingAll, setIsPingingAll] = useState(false);
  const [pingingCompanyId, setPingingCompanyId] = useState<string | null>(null);

  const fetchDatabases = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/saas/databases');
      setDatabases(res.data.data || []);
    } catch (err: any) {
      notifyError('Failed to Load Databases', err.response?.data?.message || 'Unable to retrieve tenant databases.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabases();
  }, []);

  const handlePingSingle = async (companyId: string) => {
    try {
      setPingingCompanyId(companyId);
      const res = await api.post(`/saas/databases/${companyId}/ping`);
      notifySuccess('Database Ping Succeeded', `Latency: ${res.data.latencyMs} ms`);
      fetchDatabases();
    } catch (err: any) {
      notifyError('Ping Failed', err.response?.data?.message || 'Database connection unreachable.');
    } finally {
      setPingingCompanyId(null);
    }
  };

  const handleRetryProvision = async (companyId: string) => {
    try {
      setPingingCompanyId(companyId);
      await api.post(`/saas/databases/${companyId}/retry`);
      notifySuccess('Database Re-Initialized', 'Tenant database connection pool refreshed successfully.');
      fetchDatabases();
    } catch (err: any) {
      notifyError('Retry Failed', err.response?.data?.message || 'Unable to initialize database connection.');
    } finally {
      setPingingCompanyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
              Layer C Registry & Dynamic Routing
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Tenant Database Health & Cluster Monitor
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Dynamic connection pool health, latency telemetry, schema migration tracking, and fail-closed isolation security.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDatabases}
            className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition cursor-pointer"
            title="Refresh Database List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Security Guarantee Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 shadow-sm flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-bold text-white uppercase tracking-wider text-[11px]">
            Strict Fail-Closed Data Isolation Guarantee
          </div>
          <p className="text-slate-400 leading-relaxed">
            All database credentials stored in the tenant registry are encrypted using AES-256-GCM. In the event of an unreachable or misconfigured tenant database, the multi-tenant routing engine will immediately fail closed with an explicit error and will never fall back to Central Ooting production tables.
          </p>
        </div>
      </div>

      {/* Databases Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/20">
                <th className="py-3 px-4">Customer Organization</th>
                <th className="py-3 px-4">Database Schema & Host</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4">Schema Version</th>
                <th className="py-3 px-4">Last Verified</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-brand-500" />
                    Checking database registry...
                  </td>
                </tr>
              ) : databases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                    No custom external tenant databases provisioned. Customer organizations operate on logically isolated Central TiDB Cloud tables.
                  </td>
                </tr>
              ) : (
                databases.map((db) => {
                  const isHealthy = db.status === 'READY';
                  const isPinging = pingingCompanyId === db.companyId;

                  return (
                    <tr key={db.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {db.company?.name || 'Customer Organization'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {db.company?.orgCode || 'ORG-UNKNOWN'}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          {db.dbName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {db.dbHost}:{db.dbPort} (User: {db.dbUser})
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${isHealthy ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {db.status}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono">
                        {db.lastPingMs !== null && db.lastPingMs !== undefined ? (
                          <span className={db.lastPingMs < 100 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-amber-500 font-bold'}>
                            {db.lastPingMs} ms
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {db.schemaVersion || '1.0.0-saas'}
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {db.lastPingAt ? new Date(db.lastPingAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handlePingSingle(db.companyId)}
                            disabled={isPinging}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-semibold text-[11px] transition inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Activity className={`w-3 h-3 ${isPinging ? 'animate-spin' : ''}`} />
                            Ping
                          </button>
                          <button
                            onClick={() => handleRetryProvision(db.companyId)}
                            disabled={isPinging}
                            className="px-2.5 py-1 bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 border border-brand-500/20 rounded font-semibold text-[11px] transition inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw className="w-3 h-3" /> Retry Pool
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TenantDatabaseStatus;
