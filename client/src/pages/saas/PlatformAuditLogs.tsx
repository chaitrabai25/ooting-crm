import React, { useEffect, useState } from 'react';
import {
  History,
  Search,
  Filter,
  ShieldCheck,
  RefreshCw,
  Clock,
  User,
  Building2,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.js';
import { notifyError } from '../../utils/sweetalert.js';

export const PlatformAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '25');
      if (search) params.append('search', search);
      if (actionFilter) params.append('action', actionFilter);

      const res = await api.get(`/saas/audit-logs?${params.toString()}`);
      setLogs(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err: any) {
      notifyError('Failed to Load Audit Logs', err.response?.data?.message || 'Unable to retrieve audit events.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('SUSPEND')) return 'danger';
    if (action.includes('REACTIVATE') || action.includes('APPROVED')) return 'success';
    if (action.includes('LIMIT') || action.includes('REQUEST')) return 'warning';
    return 'default';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 uppercase tracking-wider">
              Layer A Immutable Audit
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Platform Infrastructure Audit Logs
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Immutable cryptographic audit trail of all cross-tenant provisioning, instant suspensions, and seat adjustments.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition cursor-pointer self-start sm:self-auto"
          title="Refresh Audit Logs"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearch} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by details, admin email, or target ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg transition cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Administrative Actions</option>
            <option value="SUSPEND_ORGANIZATION">SUSPEND_ORGANIZATION</option>
            <option value="REACTIVATE_ORGANIZATION">REACTIVATE_ORGANIZATION</option>
            <option value="UPDATE_STAFF_LIMIT">UPDATE_STAFF_LIMIT</option>
            <option value="APPROVE_STAFF_REQUEST">APPROVE_STAFF_REQUEST</option>
            <option value="REJECT_STAFF_REQUEST">REJECT_STAFF_REQUEST</option>
            <option value="PROVISION_ORGANIZATION">PROVISION_ORGANIZATION</option>
            <option value="UPDATE_SUBSCRIPTION">UPDATE_SUBSCRIPTION</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/20">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Platform Admin Actor</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Audit Details</th>
                <th className="py-3 px-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-brand-500" />
                    Fetching platform audit records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                    No platform audit log records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>

                    <td className="py-3 px-4">
                      <Badge variant={getActionBadgeVariant(log.action)} size="sm">
                        {log.action}
                      </Badge>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {log.adminEmail}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {log.adminId?.substring(0, 8)}...
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-mono text-slate-700 dark:text-slate-300 font-semibold">
                        {log.targetType}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {log.targetId?.substring(0, 12)}...
                      </div>
                    </td>

                    <td className="py-3 px-4 max-w-sm">
                      <p className="text-slate-700 dark:text-slate-300 leading-tight">
                        {log.details}
                      </p>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Showing page {page} of {totalPages} ({total} events)</span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlatformAuditLogs;
