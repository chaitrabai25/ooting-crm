/**
 * @file UserList.tsx
 * @description Ooting CRM Team & RBAC User Management.
 * Features:
 *  - Super Admin & Admin management of staff accounts, roles, and status (ACTIVE / INACTIVE).
 *  - Role-based access control filters (SUPER_ADMIN, ADMIN, SALES, OPS, ACCOUNTS).
 *  - Modal user onboarding, credential generation, and profile editing.
 *  - Battery- & network-aware live sync (pauses when tab inactive; 60s background cycle).
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Shield, Phone, Mail, Edit, CheckCircle, XCircle, Trash2, AlertTriangle, Sparkles, Send } from 'lucide-react';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { Badge } from '../../components/ui/Badge.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { Modal } from '../../components/ui/Modal.js';
import { UserModal } from './UserModal.js';
import { User, Role } from '../../types/index.js';
import { useAuth } from '../../context/AuthContext.js';
import { useLiveSync } from '../../utils/useLiveSync.js';
import { notifyError, notifySuccess } from '../../utils/sweetalert.js';

export const UserList: React.FC = () => {
  const { user: currentUser, isSuperAdmin } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Staff limit and seat request state
  const [staffUsage, setStaffUsage] = useState<{
    currentStaff: number;
    maxStaffLimit: number;
    remainingSeats: number;
    isLimitReached: boolean;
    isOoting: boolean;
    pendingRequests: any[];
  } | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestSeats, setRequestSeats] = useState(1);
  const [requestReason, setRequestReason] = useState('New team member onboarding / expanding sales desk');
  const [requestJustification, setRequestJustification] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchStaffUsage = async () => {
    try {
      const res = await api.get('/users/staff-usage');
      setStaffUsage(res.data);
    } catch (err) {
      console.warn('Failed to fetch staff usage:', err);
    }
  };

  const fetchUsers = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '15');
      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('status', statusFilter);

      const [res] = await Promise.all([
        api.get(`/users?${params.toString()}`),
        fetchStaffUsage(),
      ]);
      setUsers(res.data.data || []);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const handleRequestStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingRequest(true);
      await api.post('/users/request-staff', {
        requestedSeats: Number(requestSeats),
        reason: requestReason.trim(),
        businessJustification: requestJustification.trim() || undefined,
      });
      notifySuccess('Request Submitted', 'Your request for additional staff seats has been submitted to the platform administrator for review.');
      setIsRequestModalOpen(false);
      fetchStaffUsage();
    } catch (err: any) {
      notifyError('Request Failed', err.response?.data?.message || 'Failed to submit staff seat request.');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Battery- & tab-aware live synchronization (60s background cycle, instant on tab focus)
  useLiveSync(fetchUsers, [page, roleFilter, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.put(`/users/${user.id}`, { status: newStatus });
      fetchUsers();
    } catch (err: any) {
      notifyError('Status Update Failed', err.response?.data?.message || 'Failed to update user status.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;
    try {
      setIsDeleting(true);
      await api.delete(`/users/${deletingUser.id}`);
      setDeletingUser(null);
      fetchUsers();
    } catch (err: any) {
      notifyError('Failed to Delete User', err.response?.data?.message || 'Failed to delete user.');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<User>[] = [
    {
      header: 'Staff Member',
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200 uppercase">
            {u.name.substring(0, 2)}
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-white block text-xs">{u.name}</span>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <Mail className="w-3 h-3" />
              <span>{u.email}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Role',
      render: (u) => (
        <Badge status={u.role} />
      ),
    },
    {
      header: 'Phone',
      render: (u) => (
        <div className="text-xs text-slate-700 dark:text-slate-300">
          {u.phone ? (
            <div className="flex items-center gap-1">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>{u.phone}</span>
            </div>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      render: (u) => (
        <Badge status={u.status} />
      ),
    },
    {
      header: 'Last Login',
      render: (u) => (
        <span className="text-[11px] text-slate-500">
          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (u) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => {
              setEditingUser(u);
              setIsModalOpen(true);
            }}
            title="Edit User"
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition cursor-pointer"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleToggleStatus(u)}
            title={u.status === 'ACTIVE' ? 'Deactivate User' : 'Activate User'}
            className={`p-1.5 rounded transition cursor-pointer ${
              u.status === 'ACTIVE'
                ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {u.status === 'ACTIVE' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          </button>
          {u.id !== currentUser?.id && (isSuperAdmin || currentUser?.role === 'ADMIN') && (
            <button
              onClick={() => setDeletingUser(u)}
              title="Delete Staff User"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Staff & User Management</h1>
            {staffUsage && (
              staffUsage.isOoting ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-500/10 text-brand-500 border border-brand-500/20">
                  Unlimited Seats (Ooting Master)
                </span>
              ) : (
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  staffUsage.isLimitReached
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                }`}>
                  Staff Seats: {staffUsage.currentStaff} / {staffUsage.maxStaffLimit} {staffUsage.isLimitReached ? '(Cap Reached)' : ''}
                </span>
              )
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage system users, access roles, and permissions ({total} total staff)
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isSuperAdmin && (
            <Link
              to="/saas/organizations"
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium text-xs rounded-lg transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              Adjust Staff Quotas
            </Link>
          )}

          {!staffUsage?.isOoting && !isSuperAdmin && (
            <button
              onClick={() => setIsRequestModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs rounded-lg transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Request More Seats
            </button>
          )}

          <button
            onClick={() => {
              if (staffUsage?.isLimitReached) {
                notifyError(
                  `${staffUsage?.maxStaffLimit || 1}-Staff Seat Limit Reached`,
                  `Your organization has reached its current limit of ${staffUsage?.maxStaffLimit || 1} staff account(s). Please submit a request or contact the platform administrator to increase your staff quota.`
                );
                setIsRequestModalOpen(true);
                return;
              }
              setEditingUser(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs rounded-lg shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Staff Member
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearch} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
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
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Admin</option>
            <option value="SALES">Sales</option>
            <option value="OPERATIONS">Operations</option>
            <option value="ACCOUNTANT">Accountant</option>
            <option value="AGENT">Agent</option>
          </select>

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
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <DataTable<User>
        columns={columns}
        data={users}
        isLoading={isLoading}
        pagination={{
          page,
          limit: 15,
          totalPages,
          total,
          onPageChange: (p) => setPage(p),
        }}
        emptyTitle="No staff members found"
        emptyDescription="No staff records matched your search or filters."
      />

      {/* Modal */}
      {isModalOpen && (
        <UserModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingUser(null);
          }}
          onSuccess={() => {
            fetchUsers();
          }}
          initialData={editingUser}
        />
      )}

      {/* Delete User Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Staff User"
        message={`Are you sure you want to delete staff account for "${deletingUser?.name}" (${deletingUser?.email})? Any assigned bookings and customer leads will be preserved and reassigned to you. This action cannot be undone.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Staff'}
        isDanger={true}
      />

      {/* Request Additional Staff Seats Modal */}
      {isRequestModalOpen && (
        <Modal
          isOpen={isRequestModalOpen}
          onClose={() => setIsRequestModalOpen(false)}
          title="Request Additional Staff Seats"
        >
          <form onSubmit={handleRequestStaffSubmit} className="space-y-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                <p className="font-bold">SaaS 1-Staff Seat Policy</p>
                <p>
                  Customer organizations are provisioned with 1 primary staff seat by default. Requests for additional staff seats are submitted to the platform administrator for approval.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Additional Seats Requested *
              </label>
              <input
                type="number"
                min="1"
                max="50"
                required
                value={requestSeats}
                onChange={(e) => setRequestSeats(parseInt(e.target.value) || 1)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Additional Staff *
              </label>
              <input
                type="text"
                required
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="e.g. Hiring new destination specialist..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Business Justification (Optional)
              </label>
              <textarea
                value={requestJustification}
                onChange={(e) => setRequestJustification(e.target.value)}
                rows={3}
                placeholder="Describe your current lead volume or expanding operations..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingRequest || requestSeats < 1}
                className="px-4 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-lg shadow transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {isSubmittingRequest ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
