/**
 * @file CompanyList.tsx
 * @description Super Admin SaaS Multi-Tenant Management.
 * Features:
 *  - Provision new white-label tenant companies with dedicated Company Admin
 *  - Edit company profiles and white-label branding assets (logo, colors, domains)
 *  - Activate / Suspend tenant access with strict protection for the primary Ooting tenant
 *  - Live metrics for tenants (staff, leads, bookings, customers)
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
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

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
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Companies & Tenants
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900 shadow-2xs">
              SaaS Multi-Tenancy
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Provision, monitor, and manage white-label organizations with strictly isolated data boundaries.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingCompany(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Provision New Tenant
        </button>
      </div>

      {/* Metrics Banner (Stat Cards) */}
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
            {companies.filter((c) => c.status === 'ACTIVE').length}
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
          <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-3 flex items-center gap-1.5 truncate">
            Ooting Travels
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            <span>Master core instance</span>
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
            {companies.reduce((sum, c) => sum + (c._count?.users || 0), 0)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
            <span>Across all organizations</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenant by company name, slug identifier, or email..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all font-medium"
          />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 px-2 shrink-0">
          <span>
            Showing <span className="text-slate-900 dark:text-white font-bold">{filteredCompanies.length}</span> of {companies.length} tenants
          </span>
        </div>
      </div>

      {/* Company Cards Grid */}
      {isLoading ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="inline-block w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading organizations...</p>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white">No companies found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Try adjusting your search criteria or create a new tenant.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCompanies.map((c) => {
            const effectiveLogo = c.logoUrl || (c.isOoting ? '/assets/ooting-logo.jpg' : '');

            return (
              <div
                key={c.id}
                className={`flex flex-col bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-xs hover:shadow-xl transition-all duration-200 group relative ${
                  c.isOoting
                    ? 'border-amber-300 dark:border-amber-500/40 ring-1 ring-amber-300/40 shadow-amber-500/5'
                    : c.status === 'SUSPENDED'
                    ? 'border-red-200 dark:border-red-500/40 opacity-80'
                    : 'border-slate-200/90 dark:border-slate-800 hover:border-blue-400 dark:hover:border-slate-700'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="w-13 h-13 rounded-xl flex items-center justify-center p-1 bg-white border border-slate-200 dark:border-slate-700 flex-shrink-0 overflow-hidden shadow-xs"
                      style={{
                        borderTopColor: c.primaryColor || '#2563eb',
                        borderTopWidth: '3px',
                      }}
                    >
                      {effectiveLogo ? (
                        <img
                          src={effectiveLogo}
                          alt={c.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Building2 className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3
                          className="font-bold text-slate-900 dark:text-white text-base leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                          title={c.name}
                        >
                          {c.name}
                        </h3>
                        {c.isOoting && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30">
                            <Crown className="w-3 h-3 text-amber-500" /> Primary
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400 block truncate mt-0.5">
                        tag:{' '}
                        <span className="text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-900/50">
                          {c.slug}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shrink-0 ${
                      c.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
                        : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 text-xs border-t border-slate-100 dark:border-slate-800 pt-3.5 mb-4">
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

                {/* Data Counts Banner */}
                <div className="grid grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60 mb-4 text-center">
                  <div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
                      Users
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
                <div className="mt-auto pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
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
