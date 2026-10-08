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
  Briefcase,
  BookmarkCheck,
  CheckCircle,
  XCircle,
  Edit,
  ExternalLink,
  Crown,
  Palette,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Company } from '../../types/index.js';
import { useAuth } from '../../context/AuthContext.js';
import { CompanyModal } from './CompanyModal.js';
import { notifySuccess, notifyError, notifyWarning } from '../../utils/sweetalert.js';

export const CompanyList: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();

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
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl max-w-lg mx-auto mt-12 text-slate-300">
        <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
        <p className="text-sm text-slate-400">
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Companies & Tenants</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              SaaS Multi-Tenancy
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Provision, monitor, and manage white-label organizations with strictly isolated data boundaries.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingCompany(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-blue-600/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Provision New Tenant
        </button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="text-xs text-slate-400 font-medium">Total Organizations</div>
          <div className="text-2xl font-bold text-white mt-1">{companies.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Multi-tenant active instances</div>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="text-xs text-slate-400 font-medium">Active Tenants</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {companies.filter((c) => c.status === 'ACTIVE').length}
          </div>
          <div className="text-[11px] text-emerald-500/80 mt-1">Operational with full access</div>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="text-xs text-slate-400 font-medium">Primary Tenant</div>
          <div className="text-lg font-bold text-amber-400 mt-1.5 flex items-center gap-1.5">
            <Crown className="w-4 h-4" /> Ooting Travels
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Master core instance</div>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="text-xs text-slate-400 font-medium">Total Staff Users</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">
            {companies.reduce((sum, c) => sum + (c._count?.users || 0), 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Across all organizations</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenant by company name, slug identifier, or email..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Company Cards Grid */}
      {isLoading ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl">
          <div className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-slate-400">Loading organizations...</p>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No companies found</h3>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria or create a new tenant.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCompanies.map((c) => (
            <div
              key={c.id}
              className={`flex flex-col bg-slate-900/80 border rounded-2xl p-5 shadow-lg transition-all hover:border-slate-700 ${
                c.isOoting
                  ? 'border-amber-500/40 shadow-amber-500/5'
                  : c.status === 'SUSPENDED'
                  ? 'border-red-500/40 opacity-75'
                  : 'border-slate-800'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center p-1 bg-white border border-slate-700 flex-shrink-0 overflow-hidden shadow-sm"
                    style={{
                      borderTopColor: c.primaryColor || '#2563eb',
                      borderTopWidth: '3px',
                    }}
                  >
                    <img
                      src={c.logoUrl || (c.isOoting ? '/assets/ooting-logo.jpg' : '')}
                      alt={c.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-bold text-white text-base truncate">{c.name}</h3>
                      {c.isOoting && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <Crown className="w-3 h-3 text-amber-400" /> Primary
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-slate-400 block truncate">
                      tag: <span className="text-blue-400 font-semibold">{c.slug}</span>
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                    c.status === 'ACTIVE'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-red-500/15 text-red-400 border border-red-500/30'
                  }`}
                >
                  {c.status}
                </span>
              </div>

              {/* Contact info */}
              <div className="space-y-1.5 text-xs text-slate-300 border-t border-slate-800/80 pt-3 mb-4">
                {c.email && (
                  <div className="truncate">
                    <span className="text-slate-500">Email:</span> {c.email}
                  </div>
                )}
                {c.phone && (
                  <div className="truncate">
                    <span className="text-slate-500">Phone:</span> {c.phone}
                  </div>
                )}
                {c.website && (
                  <div className="truncate">
                    <span className="text-slate-500">Web:</span>{' '}
                    <a
                      href={c.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline inline-flex items-center gap-0.5"
                    >
                      {c.website.replace(/^https?:\/\//, '')} <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                )}
              </div>

              {/* Data counts */}
              <div className="grid grid-cols-4 gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 mb-4 text-center">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Users</div>
                  <div className="text-sm font-bold text-white mt-0.5">{c._count?.users || 0}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Leads</div>
                  <div className="text-sm font-bold text-blue-400 mt-0.5">{c._count?.leads || 0}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Bookings</div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">{c._count?.bookings || 0}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Clients</div>
                  <div className="text-sm font-bold text-purple-400 mt-0.5">{c._count?.customers || 0}</div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-auto pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingCompany(c);
                    setIsModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit Profile
                </button>

                {!c.isOoting ? (
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                      c.status === 'ACTIVE'
                        ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20'
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
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
                  <span className="text-[11px] text-slate-500 font-medium">Core Master Protected</span>
                )}
              </div>
            </div>
          ))}
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
