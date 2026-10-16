import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  Database,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Mail,
  Phone,
  Globe,
  FileText,
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.js';
import { Modal } from '../../components/ui/Modal.js';
import { notifyError, notifySuccess } from '../../utils/sweetalert.js';

export const OrganizationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [org, setOrg] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'database' | 'audit'>('overview');

  // Action states
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [newStaffLimit, setNewStaffLimit] = useState(1);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ success: boolean; latencyMs?: number; message?: string } | null>(null);

  const fetchOrganization = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/saas/organizations/${id}`);
      setOrg(res.data.organization);
      setNewStaffLimit(res.data.organization.maxStaffLimit ?? (res.data.organization.isOoting ? 9999 : 1));
    } catch (err: any) {
      notifyError('Failed to Load Organization', err.response?.data?.message || 'Organization not found.');
      navigate('/saas/organizations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchOrganization();
  }, [id]);

  const handleConfirmSuspend = async () => {
    if (!org) return;
    try {
      setIsActionLoading(true);
      await api.post(`/saas/organizations/${org.id}/suspend`, {
        reason: suspensionReason || 'Administrative suspension',
      });
      notifySuccess('Organization Suspended', `${org.name} has been suspended immediately. All staff tokens revoked.`);
      setIsSuspendModalOpen(false);
      fetchOrganization();
    } catch (err: any) {
      notifyError('Suspension Failed', err.response?.data?.message || 'Could not suspend organization.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    if (!org) return;
    try {
      setIsActionLoading(true);
      await api.post(`/saas/organizations/${org.id}/reactivate`);
      notifySuccess('Organization Reactivated', `${org.name} access restored to active status.`);
      fetchOrganization();
    } catch (err: any) {
      notifyError('Reactivation Failed', err.response?.data?.message || 'Could not reactivate organization.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSaveStaffLimit = async () => {
    if (!org) return;
    try {
      setIsActionLoading(true);
      await api.put(`/saas/organizations/${org.id}/staff-limit`, {
        maxStaffLimit: Number(newStaffLimit),
        reason: 'Master Admin direct seat quota update',
      });
      notifySuccess('Staff Limit Updated', `Staff limit for ${org.name} set to ${newStaffLimit}.`);
      setIsStaffModalOpen(false);
      fetchOrganization();
    } catch (err: any) {
      notifyError('Update Failed', err.response?.data?.message || 'Could not update staff limit.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePingDatabase = async () => {
    if (!org) return;
    try {
      setIsPinging(true);
      setPingResult(null);
      const res = await api.post(`/saas/databases/${org.id}/ping`);
      setPingResult({
        success: true,
        latencyMs: res.data.latencyMs,
        message: 'Database responded successfully to heartbeat ping.',
      });
      fetchOrganization();
    } catch (err: any) {
      setPingResult({
        success: false,
        message: err.response?.data?.message || 'Database ping connection failed.',
      });
    } finally {
      setIsPinging(false);
    }
  };

  if (isLoading || !org) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading Organization Profile...</p>
        </div>
      </div>
    );
  }

  const staffCount = org.users?.length || 0;
  const limit = org.maxStaffLimit ?? (org.isOoting ? 9999 : 1);
  const isSuspended = org.status === 'SUSPENDED';
  const isLimitReached = !org.isOoting && staffCount >= limit;

  return (
    <div className="space-y-6">
      {/* Back button and quick actions */}
      <div className="flex items-center justify-between">
        <Link
          to="/saas/organizations"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Organizations Directory
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsStaffModalOpen(true)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Adjust Staff Limit ({staffCount}/{limit})
          </button>

          {!org.isOoting && (
            isSuspended ? (
              <button
                onClick={handleReactivate}
                disabled={isActionLoading}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                Reactivate Workspace
              </button>
            ) : (
              <button
                onClick={() => {
                  setSuspensionReason('Violation of Terms / Overdue Payment / Administrative Hold');
                  setIsSuspendModalOpen(true);
                }}
                disabled={isActionLoading}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                Immediate Suspend
              </button>
            )
          )}
        </div>
      </div>

      {/* Main Banner / Header Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        {isSuspended && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-red-700 dark:text-red-300">
              <span className="font-bold">THIS ORGANIZATION IS CURRENTLY SUSPENDED.</span>
              <p className="mt-0.5">
                Reason: {org.suspensionReason || 'Administrative hold'}. All user sessions are locked.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-xl text-slate-700 dark:text-slate-200 uppercase">
              {org.name.substring(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  {org.name}
                </h1>
                {org.isOoting && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-500/10 text-brand-500 border border-brand-500/20">
                    OOTING ROOT
                  </span>
                )}
                {isSuspended ? (
                  <Badge variant="danger" size="sm">SUSPENDED</Badge>
                ) : (
                  <Badge variant="success" size="sm">ACTIVE</Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-semibold text-slate-700 dark:text-slate-300">
                  {org.orgCode || 'ORG-UNASSIGNED'}
                </span>
                <span>&bull;</span>
                <span>Slug: <strong className="font-mono text-slate-700 dark:text-slate-300">{org.slug}</strong></span>
                <span>&bull;</span>
                <span>Tier: <strong className="text-slate-700 dark:text-slate-300">{org.subscriptionTier || 'STANDARD'}</strong></span>
                <span>&bull;</span>
                <span>Created: {new Date(org.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Seat Quota Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 min-w-[200px]">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Staff Seat Usage
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-bold font-mono ${isLimitReached ? 'text-amber-500' : 'text-slate-900 dark:text-white'}`}>
                {staffCount}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                / {org.isOoting ? 'Unlimited' : `${limit} allowed`}
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full ${isLimitReached ? 'bg-amber-500' : 'bg-brand-500'}`}
                style={{ width: `${org.isOoting ? 100 : Math.min(100, (staffCount / limit) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-4 mt-6 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 border-b-2 transition cursor-pointer ${
              activeTab === 'overview'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Overview & Telemetry
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`pb-3 border-b-2 transition cursor-pointer ${
              activeTab === 'staff'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Staff Accounts ({staffCount})
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`pb-3 border-b-2 transition cursor-pointer ${
              activeTab === 'database'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Tenant Database (Layer C)
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-3 border-b-2 transition cursor-pointer ${
              activeTab === 'audit'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Audit Trail
          </button>
        </div>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Corporate & Contact Information
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Official Email</span>
                <span className="font-semibold text-slate-900 dark:text-white">{org.email || 'None'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Official Phone</span>
                <span className="font-semibold text-slate-900 dark:text-white">{org.phone || 'None'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Website</span>
                <span className="font-semibold text-slate-900 dark:text-white">{org.website || 'None'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">GSTIN</span>
                <span className="font-semibold text-slate-900 dark:text-white font-mono">{org.gstin || 'None'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Registered Address</span>
                <span className="font-semibold text-slate-900 dark:text-white text-right max-w-xs">{org.address || 'None'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tenancy Statistics & Counts
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="text-[11px] text-slate-500">Total Leads</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {org._count?.leads || 0}
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="text-[11px] text-slate-500">Total Bookings</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {org._count?.bookings || 0}
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="text-[11px] text-slate-500">Total Customers</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {org._count?.customers || 0}
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="text-[11px] text-slate-500">Packages</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {org._count?.packages || 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Staff */}
      {activeTab === 'staff' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Tenant Staff Members</h3>
              <p className="text-xs text-slate-500">Staff accounts authorized to access this organization's workspace.</p>
            </div>
            <button
              onClick={() => setIsStaffModalOpen(true)}
              className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              Update Quota Limit
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Staff Name</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Last Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {org.users?.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                      {u.name}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-mono">
                      {u.email}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {u.phone || '—'}
                    </td>
                    <td className="py-3 px-3">
                      {u.status === 'ACTIVE' ? (
                        <Badge variant="success" size="sm">ACTIVE</Badge>
                      ) : (
                        <Badge variant="danger" size="sm">{u.status}</Badge>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Database */}
      {activeTab === 'database' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Layer C &bull; Tenant Database Registry</h3>
              <p className="text-xs text-slate-500">Dynamic routing parameters and connection health monitoring.</p>
            </div>
            <button
              onClick={handlePingDatabase}
              disabled={isPinging}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
              {isPinging ? 'Pinging Host...' : 'Ping Database'}
            </button>
          </div>

          {pingResult && (
            <div className={`p-3 rounded-lg text-xs font-medium ${pingResult.success ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'}`}>
              {pingResult.success ? `Heartbeat successful: Latency ${pingResult.latencyMs}ms` : pingResult.message}
            </div>
          )}

          {org.tenantDatabase ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-slate-500 font-semibold uppercase text-[10px]">Database Endpoint</div>
                <div className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                  {org.tenantDatabase.dbHost}:{org.tenantDatabase.dbPort}
                </div>
                <div className="text-slate-500">
                  Database Schema: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{org.tenantDatabase.dbName}</span>
                </div>
                <div className="text-slate-500">
                  Database User: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{org.tenantDatabase.dbUser}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-slate-500 font-semibold uppercase text-[10px]">Health & Telemetry</div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${org.tenantDatabase.status === 'READY' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className="font-bold text-slate-900 dark:text-white uppercase">
                    {org.tenantDatabase.status}
                  </span>
                </div>
                <div className="text-slate-500">
                  Latency: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{org.tenantDatabase.lastPingMs ? `${org.tenantDatabase.lastPingMs} ms` : 'Not pinged'}</span>
                </div>
                <div className="text-slate-500">
                  Schema Migration: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{org.tenantDatabase.schemaVersion || '1.0.0-saas'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <Database className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Operating on Central High-Availability Cluster
              </p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                This organization is logically isolated within the primary TiDB Cloud cluster via <code className="font-mono text-brand-500">companyId</code> boundaries.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Audit */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Audit Log for {org.name}</h3>
          <p className="text-xs text-slate-500">Historical administrative events and seat adjustments.</p>

          <div className="p-4 text-center text-xs text-slate-400 italic">
            Check the <Link to="/saas/audit-logs" className="text-brand-500 hover:underline">Platform Audit Logs</Link> module for full cryptographic cross-tenant event history.
          </div>
        </div>
      )}

      {/* Suspend Confirmation Modal */}
      {isSuspendModalOpen && (
        <Modal
          isOpen={isSuspendModalOpen}
          onClose={() => setIsSuspendModalOpen(false)}
          title={`Immediate Suspension: ${org.name}`}
        >
          <div className="space-y-4">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-red-700 dark:text-red-300 space-y-1">
                <p className="font-bold">Instant Server-Side Kill-Switch Enforcement</p>
                <p>
                  Executing this action will immediately revoke all JWT session tokens for this company's staff members. Subsequent API requests will immediately return HTTP 403 Forbidden with support contact instructions.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Suspension Reason (Visible to Tenant on Suspension Screen)
              </label>
              <textarea
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                rows={3}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSuspendModalOpen(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                disabled={isActionLoading || !suspensionReason.trim()}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow transition disabled:opacity-50 cursor-pointer"
              >
                {isActionLoading ? 'Terminating Sessions...' : 'Confirm Immediate Suspension'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Adjust Staff Limit Modal */}
      {isStaffModalOpen && (
        <Modal
          isOpen={isStaffModalOpen}
          onClose={() => setIsStaffModalOpen(false)}
          title={`Adjust Staff Seat Limit: ${org.name}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Set the maximum number of staff accounts allowed for {org.name}. Default SaaS policy is strictly 1 staff.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Allowed Staff Seat Capacity
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={newStaffLimit}
                onChange={(e) => setNewStaffLimit(parseInt(e.target.value) || 1)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStaffLimit}
                disabled={isActionLoading || newStaffLimit < 1}
                className="px-4 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-lg shadow transition disabled:opacity-50 cursor-pointer"
              >
                {isActionLoading ? 'Saving...' : 'Update Staff Limit'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default OrganizationDetail;
