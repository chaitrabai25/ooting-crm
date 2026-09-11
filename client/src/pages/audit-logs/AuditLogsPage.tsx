import React, { useState, useEffect } from 'react';
import { History, Shield, Filter, RefreshCw, Clock } from 'lucide-react';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { Badge } from '../../components/ui/Badge.js';

interface AuditLog {
  id: string;
  userId?: string | null;
  userName?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    role: string;
  } | null;
}

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '25');
      if (entityFilter) params.append('entity', entityFilter);
      if (actionFilter) params.append('action', actionFilter);

      const res = await api.get(`/settings/audit-logs?${params.toString()}`);
      setLogs(res.data.data || []);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, entityFilter, actionFilter]);

  const columns: Column<AuditLog>[] = [
    {
      header: 'Timestamp',
      render: (log) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-700">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono">
            {new Date(log.createdAt).toLocaleString('en-IN', {
              dateStyle: 'short',
              timeStyle: 'medium',
            })}
          </span>
        </div>
      ),
    },
    {
      header: 'Staff Member',
      render: (log) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-900 block">
            {log.user?.name || log.userName || 'System'}
          </span>
          {log.user?.role && (
            <span className="text-[10px] text-slate-500 block uppercase">
              {log.user.role.replace('_', ' ')}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Action',
      render: (log) => (
        <Badge status={log.action} />
      ),
    },
    {
      header: 'Entity',
      render: (log) => (
        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded text-[11px] font-mono font-medium">
          {log.entity}
        </span>
      ),
    },
    {
      header: 'Activity Details',
      render: (log) => (
        <div className="text-xs text-slate-800 max-w-md">
          <span>{log.details || '—'}</span>
          {log.entityId && (
            <span className="text-[10px] text-slate-400 block font-mono">
              ID: {log.entityId}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'IP Address',
      className: 'text-right',
      render: (log) => (
        <span className="font-mono text-[11px] text-slate-500">
          {log.ipAddress || '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-600" />
            Security & Audit Activity Trail
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of user actions, lead status changes, payments, and system events ({total} entries)
          </p>
        </div>
        <button
          onClick={() => fetchLogs()}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg shadow-sm transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Log
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">Filter By:</span>
        </div>

        <select
          value={entityFilter}
          onChange={(e) => {
            setEntityFilter(e.target.value);
            setPage(1);
          }}
          className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">All Entities</option>
          <option value="LEAD">Leads</option>
          <option value="CUSTOMER">Customers</option>
          <option value="BOOKING">Bookings</option>
          <option value="PAYMENT">Payments</option>
          <option value="QUOTATION">Quotations</option>
          <option value="EXPENSE">Expenses</option>
          <option value="AGENT">Agents</option>
          <option value="PACKAGE">Packages</option>
          <option value="USER">Users</option>
          <option value="SETTING">Settings</option>
        </select>

        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="CONVERT">Convert (Lead to Booking)</option>
          <option value="LOGIN">Login</option>
        </select>
      </div>

      {/* Table */}
      <DataTable<AuditLog>
        columns={columns}
        data={logs}
        isLoading={isLoading}
        pagination={{
          page,
          limit: 25,
          totalPages,
          total,
          onPageChange: (p) => setPage(p),
        }}
        emptyTitle="No audit logs recorded"
        emptyDescription="No system activities matching this criteria were found."
      />
    </div>
  );
};
