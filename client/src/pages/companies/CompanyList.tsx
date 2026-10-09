/**
 * @file CompanyList.tsx
 * @description Super Admin SaaS Multi-Tenant Organization Management.
 * Features:
 *  - Provision new white-label tenant companies with dedicated Company Admin
 *  - Edit company profiles and white-label branding assets (logo, colors, domains)
 *  - Activate / Suspend tenant access with strict protection for the primary Ooting tenant
 *  - Live metrics for tenants (staff, leads, bookings, customers)
 *  - Card Grid & Enterprise Table views with search & status filters
 */

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Shield,
  Users,
  CheckCircle,
  XCircle,
  Edit,
  ExternalLink,
  Crown,
  Mail,
  Phone,
  Globe,
  Lock,
  LayoutGrid,
  List,
  RotateCw,
  Sparkles,
  BookmarkCheck,
  TrendingUp,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Company } from '../../types/index.js';
import { useAuth } from '../../context/AuthContext.js';
import { CompanyModal } from './CompanyModal.js';
import { notifySuccess, notifyError, notifyWarning } from '../../utils/sweetalert.js';

export const CompanyList: React.FC = () => {
  const { isSuperAdmin } = useAuth();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/companies');
      setCompanies(res.data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch companies:', err);
      notifyError('Failed to Load Companies', err.response?.data?.message || 'Access denied.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchCompanies();
    }
  }, [isSuperAdmin]);

  const handleToggleStatus = async (company: Company) => {
    if (company.isOoting) {
      notifyWarning('Protected Organization', 'The primary Ooting tenant cannot be suspended.');
      return;
    }

    const nextStatus = company.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.put(`/companies/${company.id}`, { status: nextStatus });
      notifySuccess('Status Updated', `Tenant status changed to ${nextStatus}.`);
      fetchCompanies();
    } catch (err: any) {
      notifyError('Status Update Failed', err.response?.data?.message || 'Failed to update status.');
    }
  };

  const filteredCompanies = companies.filter((c) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === 'ALL' || c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalUsers = companies.reduce((sum, c) => sum + (c._count?.users || 0), 0);
  const activeCount = companies.filter((c) => c.status === 'ACTIVE').length;

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg mx-auto mt-12 shadow-sm text-slate-700 dark:text-slate-300">
        <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Restricted</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Tenant organization management is exclusively reserved for the platform Super Administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-2xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Companies & Tenants
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900">
                  <Sparkles className="w-3 h-3 text-blue-500" /> SaaS Multi-Tenancy
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Super Admin Console — Provision, monitor, and manage white-label organizations with strictly isolated data boundaries.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            type="button"
            onClick={fetchCompanies}
            disabled={isLoading}
            title="Refresh organizations"
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs transition-colors cursor-pointer"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingCompany(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Provision New Tenant
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Organizations */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Organizations
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            {companies.length}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            <span>Multi-tenant active instances</span>
          </div>
        </div>

        {/* Active Tenants */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Tenants
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
            {activeCount}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Operational with full access</span>
          </div>
        </div>

        {/* Primary Tenant */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Primary Tenant
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Crown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-2.5 flex items-center gap-1.5 truncate">
            Ooting Travels
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            <span>Master core engine</span>
          </div>
        </div>

        {/* Total Staff Users */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Staff Users
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-2">
            {totalUsers}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
            <span>Across all tenant organizations</span>
          </div>
        </div>
      </div>

      {/* Filter, Search & View Controls Bar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenant by company name, slug identifier, or email..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 justify-between md:justify-end">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">All Statuses ({companies.length})</option>
            <option value="ACTIVE">Active Only ({activeCount})</option>
            <option value="SUSPENDED">Suspended Only ({companies.length - activeCount})</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title="Grid View"
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              title="Table Directory View"
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-1 hidden sm:inline">
            <span className="text-slate-900 dark:text-white font-bold">{filteredCompanies.length}</span> tenants
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="inline-block w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Loading tenant organizations...</p>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white">No organizations found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Try adjusting your search criteria or provision a new tenant.</p>
        </div>
      ) : viewMode === 'table' ? (
        /* ========================================================================= */
        /* ENTERPRISE TABLE DIRECTORY VIEW                                           */
        /* ========================================================================= */
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Organization</th>
                  <th className="py-3.5 px-4">Tenant Status</th>
                  <th className="py-3.5 px-4">Contact Details</th>
                  <th className="py-3.5 px-4 text-center">Staff</th>
                  <th className="py-3.5 px-4 text-center">Leads</th>
                  <th className="py-3.5 px-4 text-center">Bookings</th>
                  <th className="py-3.5 px-4 text-center">Clients</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCompanies.map((c) => {
                  const effectiveLogo = c.logoUrl || (c.isOoting ? '/assets/ooting-logo.jpg' : '');

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Organization Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              minWidth: '42px',
                              minHeight: '42px',
                              maxWidth: '42px',
                              maxHeight: '42px',
                            }}
                            className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs"
                          >
                            {effectiveLogo ? (
                              <img
                                src={effectiveLogo}
                                alt={c.name}
                                style={{
                                  maxWidth: '34px',
                                  maxHeight: '34px',
                                  width: 'auto',
                                  height: 'auto',
                                  objectFit: 'contain',
                                  display: 'block',
                                }}
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Building2 className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-white text-sm">
                                {c.name}
                              </span>
                              {c.isOoting && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300">
                                  <Crown className="w-3 h-3 text-amber-500" /> Master
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 block mt-0.5">
                              slug: {c.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            c.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
                              : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              c.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                          />
                          {c.status}
                        </span>
                      </td>

                      {/* Contact Details */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        <div className="space-y-0.5">
                          {c.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[180px]">{c.email}</span>
                            </div>
                          )}
                          {c.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{c.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Metrics Cells */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-900 dark:text-white">
                        {c._count?.users || 0}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-blue-600 dark:text-blue-400">
                        {c._count?.leads || 0}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {c._count?.bookings || 0}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-purple-600 dark:text-purple-400">
                        {c._count?.customers || 0}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCompany(c);
                              setIsModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit
                          </button>

                          {!c.isOoting ? (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(c)}
                              className={`px-2.5 py-1.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                                c.status === 'ACTIVE'
                                  ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 dark:bg-red-950/40 dark:text-red-400'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                              }`}
                            >
                              {c.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                            </button>
                          ) : (
                            <span className="p-1.5 text-amber-600" title="Core Engine Protected">
                              <Lock className="w-4 h-4 inline" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* STANDARDIZED EXECUTIVE CARDS GRID VIEW                                    */
        /* ========================================================================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCompanies.map((c) => {
            const effectiveLogo = c.logoUrl || (c.isOoting ? '/assets/ooting-logo.jpg' : '');

            return (
              <div
                key={c.id}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between group relative overflow-hidden ${
                  c.isOoting
                    ? 'border-amber-300 dark:border-amber-500/40 ring-1 ring-amber-300/40 shadow-amber-500/5'
                    : c.status === 'SUSPENDED'
                    ? 'border-red-200 dark:border-red-500/40 opacity-85'
                    : 'border-slate-200/90 dark:border-slate-800 hover:border-blue-400 dark:hover:border-slate-700'
                }`}
              >
                {/* Top Brand Color Accent Line */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: c.primaryColor || (c.isOoting ? '#f59e0b' : '#2563eb') }}
                />

                {/* Card Header */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Fixed Dimension Logo Box with Hard Inline Constraints */}
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          minWidth: '48px',
                          minHeight: '48px',
                          maxWidth: '48px',
                          maxHeight: '48px',
                        }}
                        className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs"
                      >
                        {effectiveLogo ? (
                          <img
                            src={effectiveLogo}
                            alt={c.name}
                            style={{
                              maxWidth: '40px',
                              maxHeight: '40px',
                              width: 'auto',
                              height: 'auto',
                              objectFit: 'contain',
                              display: 'block',
                            }}
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Building2 className="w-5 h-5 text-slate-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3
                            className="font-bold text-slate-900 dark:text-white text-base leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate"
                            title={c.name}
                          >
                            {c.name}
                          </h3>
                          {c.isOoting && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30 shrink-0">
                              <Crown className="w-3 h-3 text-amber-500" /> Primary
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                          <span>tag:</span>
                          <span className="text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 rounded border border-blue-100 dark:border-blue-900/50 truncate max-w-[130px]">
                            {c.slug}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shrink-0 ${
                        c.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
                          : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          c.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                      />
                      {c.status}
                    </span>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-1.5 text-xs border-t border-slate-100 dark:border-slate-800 pt-3 mb-4">
                    {c.email ? (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </div>
                    ) : null}
                    {c.phone ? (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{c.phone}</span>
                      </div>
                    ) : null}
                    {c.website ? (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <a
                          href={c.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline inline-flex items-center gap-1 truncate font-medium"
                        >
                          {c.website.replace(/^https?:\/\//, '')} <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Live Activity Metrics Strip */}
                <div>
                  <div className="grid grid-cols-4 gap-1.5 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 mb-3.5 text-center">
                    <div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
                        Staff
                      </div>
                      <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                        {c._count?.users || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
                        Leads
                      </div>
                      <div className="text-sm font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                        {c._count?.leads || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
                        Bookings
                      </div>
                      <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {c._count?.bookings || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
                        Clients
                      </div>
                      <div className="text-sm font-extrabold text-purple-600 dark:text-purple-400 mt-0.5">
                        {c._count?.customers || 0}
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCompany(c);
                        setIsModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit Profile
                    </button>

                    {!c.isOoting ? (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(c)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                          c.status === 'ACTIVE'
                            ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 dark:bg-red-950/40 dark:hover:bg-red-900/40 dark:text-red-400 dark:border-red-900/50'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-900/50'
                        }`}
                      >
                        {c.status === 'ACTIVE' ? (
                          <>
                            <XCircle className="w-3.5 h-3.5" /> Suspend
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" /> Activate
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded font-semibold border border-amber-200 dark:border-amber-900/50">
                        <Lock className="w-3 h-3 text-amber-500" /> Core Protected
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <CompanyModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCompany(null);
        }}
        onSuccess={fetchCompanies}
        company={editingCompany}
      />
    </div>
  );
};

export default CompanyList;
