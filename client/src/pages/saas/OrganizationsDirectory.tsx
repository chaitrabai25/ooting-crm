import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Search,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Edit2,
  Users,
  Database,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  X,
  CreditCard,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.js';
import { Modal } from '../../components/ui/Modal.js';
import { notifyError, notifySuccess } from '../../utils/sweetalert.js';

export const OrganizationsDirectory: React.FC = () => {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');

  // Modals state
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [isStaffLimitModalOpen, setIsStaffLimitModalOpen] = useState(false);
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<any | null>(null);

  // Form states
  const [suspensionReason, setSuspensionReason] = useState('');
  const [newStaffLimit, setNewStaffLimit] = useState<number>(1);
  const [newTier, setNewTier] = useState('STANDARD');
  const [tierExpiryDays, setTierExpiryDays] = useState(30);

  // Provisioning form
  const [provisionForm, setProvisionForm] = useState({
    name: '',
    slug: '',
    email: '',
    phone: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    subscriptionTier: 'STANDARD',
    maxStaffLimit: 1,
    externalDbHost: '',
    externalDbPort: 3306,
    externalDbName: '',
    externalDbUser: '',
    externalDbPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOrganizations = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '15');
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (tierFilter) params.append('tier', tierFilter);

      const res = await api.get(`/saas/organizations?${params.toString()}`);
      setOrganizations(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err: any) {
      notifyError('Failed to Fetch Organizations', err.response?.data?.message || 'Unable to load organizations directory.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, [page, statusFilter, tierFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrganizations();
  };

  const handleOpenSuspendModal = (org: any) => {
    setSelectedOrg(org);
    setSuspensionReason('Violation of Terms / Overdue Subscription / Security Review');
    setIsSuspendModalOpen(true);
  };

  const handleConfirmSuspend = async () => {
    if (!selectedOrg) return;
    try {
      setIsSubmitting(true);
      await api.post(`/saas/organizations/${selectedOrg.id}/suspend`, {
        reason: suspensionReason,
      });
      notifySuccess('Organization Suspended', `${selectedOrg.name} has been suspended immediately. All active user sessions revoked.`);
      setIsSuspendModalOpen(false);
      setSelectedOrg(null);
      fetchOrganizations();
    } catch (err: any) {
      notifyError('Suspension Failed', err.response?.data?.message || 'Could not suspend organization.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivate = async (org: any) => {
    try {
      setIsLoading(true);
      await api.post(`/saas/organizations/${org.id}/reactivate`);
      notifySuccess('Organization Reactivated', `${org.name} workspace has been restored to active status.`);
      fetchOrganizations();
    } catch (err: any) {
      notifyError('Reactivation Failed', err.response?.data?.message || 'Could not reactivate organization.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenStaffLimitModal = (org: any) => {
    setSelectedOrg(org);
    setNewStaffLimit(org.maxStaffLimit ?? (org.isOoting ? 9999 : 1));
    setIsStaffLimitModalOpen(true);
  };

  const handleSaveStaffLimit = async () => {
    if (!selectedOrg) return;
    try {
      setIsSubmitting(true);
      await api.put(`/saas/organizations/${selectedOrg.id}/staff-limit`, {
        maxStaffLimit: Number(newStaffLimit),
        reason: 'Platform Admin manual seat adjustment',
      });
      notifySuccess('Staff Limit Updated', `Max staff limit for ${selectedOrg.name} set to ${newStaffLimit}.`);
      setIsStaffLimitModalOpen(false);
      setSelectedOrg(null);
      fetchOrganizations();
    } catch (err: any) {
      notifyError('Update Failed', err.response?.data?.message || 'Could not update staff limit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenTierModal = (org: any) => {
    setSelectedOrg(org);
    setNewTier(org.subscriptionTier || 'STANDARD');
    setTierExpiryDays(30);
    setIsTierModalOpen(true);
  };

  const handleSaveTier = async () => {
    if (!selectedOrg) return;
    try {
      setIsSubmitting(true);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Number(tierExpiryDays));

      await api.put(`/saas/organizations/${selectedOrg.id}/subscription`, {
        subscriptionTier: newTier,
        subscriptionExpiresAt: expiresAt.toISOString(),
      });
      notifySuccess('Subscription Updated', `${selectedOrg.name} updated to ${newTier} tier.`);
      setIsTierModalOpen(false);
      setSelectedOrg(null);
      fetchOrganizations();
    } catch (err: any) {
      notifyError('Update Failed', err.response?.data?.message || 'Could not update subscription.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload: any = {
        name: provisionForm.name.trim(),
        slug: provisionForm.slug.trim(),
        email: provisionForm.email.trim() || undefined,
        phone: provisionForm.phone.trim() || undefined,
        adminName: provisionForm.adminName.trim(),
        adminEmail: provisionForm.adminEmail.trim(),
        adminPassword: provisionForm.adminPassword,
        subscriptionTier: provisionForm.subscriptionTier,
        maxStaffLimit: Number(provisionForm.maxStaffLimit),
      };

      if (provisionForm.externalDbHost.trim() && provisionForm.externalDbName.trim()) {
        payload.externalDbHost = provisionForm.externalDbHost.trim();
        payload.externalDbPort = Number(provisionForm.externalDbPort) || 3306;
        payload.externalDbName = provisionForm.externalDbName.trim();
        payload.externalDbUser = provisionForm.externalDbUser.trim();
        payload.externalDbPassword = provisionForm.externalDbPassword;
      }

      const res = await api.post('/saas/organizations', payload);
      notifySuccess('Organization Provisioned', `Company ${res.data.organization.name} (${res.data.organization.orgCode}) successfully created.`);
      setIsProvisionModalOpen(false);
      setProvisionForm({
        name: '',
        slug: '',
        email: '',
        phone: '',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        subscriptionTier: 'STANDARD',
        maxStaffLimit: 1,
        externalDbHost: '',
        externalDbPort: 3306,
        externalDbName: '',
        externalDbUser: '',
        externalDbPassword: '',
      });
      fetchOrganizations();
    } catch (err: any) {
      notifyError('Provisioning Error', err.response?.data?.message || 'Failed to provision organization.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-500/10 text-brand-500 border border-brand-500/20 uppercase tracking-wider">
              Layer A Directory
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Organizations & Tenant Governance
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Full directory of customer companies, staff quota controls, and instant kill-switch session termination.
          </p>
        </div>

        <button
          onClick={() => setIsProvisionModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs rounded-lg shadow-sm transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Provision New Organization
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearch} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by company name, org code (e.g. ORG-XXXXXX), or slug..."
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
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <select
            value={tierFilter}
            onChange={(e) => {
              setTierFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Tiers</option>
            <option value="STANDARD">Standard</option>
            <option value="PROFESSIONAL">Professional</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/20">
                <th className="py-3 px-4">Organization</th>
                <th className="py-3 px-4">Org Code</th>
                <th className="py-3 px-4">Subscription</th>
                <th className="py-3 px-4">Staff Seats</th>
                <th className="py-3 px-4">Tenant Database</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {organizations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                    No organizations matching query.
                  </td>
                </tr>
              ) : (
                organizations.map((org) => {
                  const staffCount = org._count?.users || 0;
                  const limit = org.maxStaffLimit ?? (org.isOoting ? 9999 : 1);
                  const isSuspended = org.status === 'SUSPENDED';
                  const isLimitReached = !org.isOoting && staffCount >= limit;

                  return (
                    <tr key={org.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <Link to={`/saas/organizations/${org.id}`} className="hover:underline text-brand-600 dark:text-brand-400">
                            {org.name}
                          </Link>
                          {org.isOoting && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-brand-500/10 text-brand-500">
                              ROOT
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {org.email || org.phone || 'No direct contact registered'}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {org.orgCode || 'ORG-UNASSIGNED'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {org.subscriptionTier || 'STANDARD'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {org.subscriptionExpiresAt
                            ? `Renews: ${new Date(org.subscriptionExpiresAt).toLocaleDateString()}`
                            : 'Ongoing'}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`font-mono font-bold ${isLimitReached ? 'text-amber-500' : 'text-slate-800 dark:text-slate-200'}`}>
                            {staffCount} / {org.isOoting ? 'Unlimited' : limit}
                          </div>
                          {isLimitReached && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                              CAP REACHED
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {org.tenantDatabase ? (
                          <div>
                            <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                              <span className={`w-2 h-2 rounded-full ${org.tenantDatabase.status === 'READY' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                              <span>{org.tenantDatabase.dbName}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {org.tenantDatabase.dbHost}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Central TiDB Shared DB</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {isSuspended ? (
                          <Badge variant="danger" size="sm">SUSPENDED</Badge>
                        ) : org.status === 'ACTIVE' ? (
                          <Badge variant="success" size="sm">ACTIVE</Badge>
                        ) : (
                          <Badge variant="warning" size="sm">{org.status}</Badge>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/saas/organizations/${org.id}`}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded transition"
                            title="Organization Deep-Dive"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            onClick={() => handleOpenStaffLimitModal(org)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded transition cursor-pointer"
                            title="Adjust Staff Seat Limit"
                          >
                            <Users className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenTierModal(org)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded transition cursor-pointer"
                            title="Change Subscription Tier"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>

                          {/* Kill-switch / Reactivate */}
                          {!org.isOoting && (
                            isSuspended ? (
                              <button
                                onClick={() => handleReactivate(org)}
                                className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded font-semibold text-[11px] transition cursor-pointer"
                              >
                                Reactivate
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenSuspendModal(org)}
                                className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 rounded font-semibold text-[11px] transition cursor-pointer"
                              >
                                Suspend
                              </button>
                            )
                          )}
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

      {/* Suspend Confirmation Modal */}
      {isSuspendModalOpen && selectedOrg && (
        <Modal
          isOpen={isSuspendModalOpen}
          onClose={() => {
            setIsSuspendModalOpen(false);
            setSelectedOrg(null);
          }}
          title={`Immediate Suspension: ${selectedOrg.name}`}
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
                placeholder="e.g. Account suspended due to overdue invoice INV-2026-081..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsSuspendModalOpen(false);
                  setSelectedOrg(null);
                }}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                disabled={isSubmitting || !suspensionReason.trim()}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Terminating Sessions...' : 'Confirm Immediate Suspension'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Adjust Staff Seat Limit Modal */}
      {isStaffLimitModalOpen && selectedOrg && (
        <Modal
          isOpen={isStaffLimitModalOpen}
          onClose={() => {
            setIsStaffLimitModalOpen(false);
            setSelectedOrg(null);
          }}
          title={`Adjust Staff Limit: ${selectedOrg.name}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Set the maximum number of active staff accounts allowed for this customer organization. Default SaaS policy is strictly 1 staff.
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
                onClick={() => {
                  setIsStaffLimitModalOpen(false);
                  setSelectedOrg(null);
                }}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStaffLimit}
                disabled={isSubmitting || newStaffLimit < 1}
                className="px-4 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-lg shadow transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : 'Update Staff Limit'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Subscription Tier Modal */}
      {isTierModalOpen && selectedOrg && (
        <Modal
          isOpen={isTierModalOpen}
          onClose={() => {
            setIsTierModalOpen(false);
            setSelectedOrg(null);
          }}
          title={`Update Subscription: ${selectedOrg.name}`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Subscription Plan Tier
              </label>
              <select
                value={newTier}
                onChange={(e) => setNewTier(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="STANDARD">Standard (Default 1 Staff Seat)</option>
                <option value="PROFESSIONAL">Professional (Multi-Agent & Advanced Analytics)</option>
                <option value="ENTERPRISE">Enterprise (Dedicated Tenant DB & Unlimited Scale)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Extend Validity (Days from Today)
              </label>
              <input
                type="number"
                min="1"
                value={tierExpiryDays}
                onChange={(e) => setTierExpiryDays(parseInt(e.target.value) || 30)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsTierModalOpen(false);
                  setSelectedOrg(null);
                }}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTier}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-lg shadow transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Updating...' : 'Save Subscription'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Provision New Organization Modal */}
      {isProvisionModalOpen && (
        <Modal
          isOpen={isProvisionModalOpen}
          onClose={() => setIsProvisionModalOpen(false)}
          title="Provision New SaaS Customer Organization"
          size="lg"
        >
          <form onSubmit={handleProvisionSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Company Legal Name *
                </label>
                <input
                  type="text"
                  required
                  value={provisionForm.name}
                  onChange={(e) => setProvisionForm({ ...provisionForm, name: e.target.value })}
                  placeholder="e.g. Skyline Travel Holidays Pvt Ltd"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Unique Slug *
                </label>
                <input
                  type="text"
                  required
                  value={provisionForm.slug}
                  onChange={(e) => setProvisionForm({ ...provisionForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  placeholder="e.g. skyline-travels"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Company Official Email
                </label>
                <input
                  type="email"
                  value={provisionForm.email}
                  onChange={(e) => setProvisionForm({ ...provisionForm, email: e.target.value })}
                  placeholder="contact@skylinetravels.com"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Phone
                </label>
                <input
                  type="text"
                  value={provisionForm.phone}
                  onChange={(e) => setProvisionForm({ ...provisionForm, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Initial Admin Account */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                Initial Tenant Super Admin Credentials
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Admin Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={provisionForm.adminName}
                    onChange={(e) => setProvisionForm({ ...provisionForm, adminName: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Admin Login Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={provisionForm.adminEmail}
                    onChange={(e) => setProvisionForm({ ...provisionForm, adminEmail: e.target.value })}
                    placeholder="ramesh@skylinetravels.com"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Temporary Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={provisionForm.adminPassword}
                    onChange={(e) => setProvisionForm({ ...provisionForm, adminPassword: e.target.value })}
                    placeholder="Min 6 characters"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Plan & Staff Quota */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subscription Tier
                </label>
                <select
                  value={provisionForm.subscriptionTier}
                  onChange={(e) => setProvisionForm({ ...provisionForm, subscriptionTier: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="STANDARD">Standard Tier</option>
                  <option value="PROFESSIONAL">Professional Tier</option>
                  <option value="ENTERPRISE">Enterprise Tier</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Staff Seat Quota (Default: 1)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={provisionForm.maxStaffLimit}
                  onChange={(e) => setProvisionForm({ ...provisionForm, maxStaffLimit: parseInt(e.target.value) || 1 })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Optional External Tenant DB Config */}
            <details className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <summary className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer hover:text-brand-500">
                Optional: Configure Dedicated Tenant Database (Layer C)
              </summary>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg mt-2 space-y-3">
                <p className="text-[11px] text-slate-500">
                  Leave blank to use the default isolated schema in the central TiDB Cloud cluster. Credentials entered below are securely encrypted with AES-256-GCM.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Database Host (e.g. db.customer.com)"
                    value={provisionForm.externalDbHost}
                    onChange={(e) => setProvisionForm({ ...provisionForm, externalDbHost: e.target.value })}
                    className="text-xs p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    placeholder="Database Name"
                    value={provisionForm.externalDbName}
                    onChange={(e) => setProvisionForm({ ...provisionForm, externalDbName: e.target.value })}
                    className="text-xs p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    placeholder="Database User"
                    value={provisionForm.externalDbUser}
                    onChange={(e) => setProvisionForm({ ...provisionForm, externalDbUser: e.target.value })}
                    className="text-xs p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <input
                    type="password"
                    placeholder="Database Password"
                    value={provisionForm.externalDbPassword}
                    onChange={(e) => setProvisionForm({ ...provisionForm, externalDbPassword: e.target.value })}
                    className="text-xs p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
            </details>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setIsProvisionModalOpen(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-lg shadow transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Provisioning...' : 'Provision Organization'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default OrganizationsDirectory;
