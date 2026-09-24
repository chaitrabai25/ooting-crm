import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  Eye,
  Edit2,
  Trash2,
  FileSpreadsheet,
  RefreshCw,
  MessageSquare,
  MapPin,
  Hotel,
  Car,
  Bus,
  CheckCircle2,
  CreditCard,
  Award,
  Sparkles,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { Badge } from '../../components/ui/Badge.js';
import { CopyButton } from '../../components/ui/CopyButton.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { WhatsAppModal } from '../../components/whatsapp/WhatsAppModal.js';
import { SupplierModal } from './SupplierModal.js';
import { Supplier, SupplierType } from '../../types/index.js';
import { downloadExcel } from '../../utils/exportHelper.js';
import { useAuth } from '../../context/AuthContext.js';
import { ALL_INDIAN_STATES } from '../../data/indiaLocations.js';
import { ModuleSubNav } from '../../components/ui/ModuleSubNav.js';
import { Briefcase } from 'lucide-react';

const SUPPLIER_TYPE_LABELS: Record<string, string> = {
  HOTEL: 'Hotels & Resorts',
  CAB_VENDOR: 'Cab & Fleet Vendor',
  TRANSPORT: 'Transport & Coach',
  ACTIVITY_PROVIDER: 'Activity Provider',
  TOUR_GUIDE: 'Tour Guide',
  HOUSEBOAT: 'Houseboat Operator',
  CRUISE: 'Cruise Line',
  VISA_AGENT: 'Visa / Forex Agent',
  OTHER: 'Other Partner',
};

const SUPPLIER_TYPE_BADGES: Record<string, string> = {
  HOTEL: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  CAB_VENDOR: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  TRANSPORT: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
  ACTIVITY_PROVIDER: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  TOUR_GUIDE: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
  HOUSEBOAT: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
  CRUISE: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
  VISA_AGENT: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800',
  OTHER: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700',
};

const getCategoryBadgeClass = (category: string) => {
  switch (category) {
    case 'Hotel':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
    case 'Bus':
      return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';
    case 'Cab':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    case 'Flight':
      return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800';
    case 'Guide':
      return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800';
    case 'Adventure Activity':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
    case 'Entry Ticket':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
    case 'Food/Restaurant':
      return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }
};

export const SupplierList: React.FC = () => {
  const navigate = useNavigate();
  const { can, isSuperAdmin } = useAuth();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // WhatsApp modal state
  const [whatsAppData, setWhatsAppData] = useState<{
    isOpen: boolean;
    customerName: string;
    customerPhone: string;
  }>({
    isOpen: false,
    customerName: '',
    customerPhone: '',
  });

  // Stats state
  const [stats, setStats] = useState<{
    total: number;
    hotels: number;
    cabs: number;
    transport: number;
    active: number;
    totalCreditLimit: number;
  }>({
    total: 0,
    hotels: 0,
    cabs: 0,
    transport: 0,
    active: 0,
    totalCreditLimit: 0,
  });

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchStats = async () => {
    try {
      const res = await api.get('/suppliers/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load supplier stats:', err);
    }
  };

  const fetchSuppliers = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (search.trim()) params.append('search', search.trim());
      if (typeFilter) params.append('serviceCategory', typeFilter);
      if (tierFilter) params.append('tier', tierFilter);
      if (stateFilter) params.append('state', stateFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (sortBy) params.append('sortBy', sortBy);
      if (sortOrder) params.append('sortOrder', sortOrder);

      const res = await api.get(`/suppliers?${params.toString()}`);
      setSuppliers(res.data.data || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchSuppliers();

    // Multi-user 5-second live sync
    const pollInterval = setInterval(() => {
      fetchSuppliers(true);
      fetchStats();
    }, 5000);
    return () => clearInterval(pollInterval);
  }, [page, typeFilter, tierFilter, stateFilter, statusFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSuppliers();
  };

  const handleResetFilters = () => {
    setSearch('');
    setTypeFilter('');
    setTierFilter('');
    setStateFilter('');
    setStatusFilter('');
    setPage(1);
    setTimeout(() => {
      fetchSuppliers();
    }, 0);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleExportExcel = async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.append('search', search.trim());
    if (typeFilter) params.append('serviceCategory', typeFilter);
    if (tierFilter) params.append('tier', tierFilter);
    if (stateFilter) params.append('state', stateFilter);
    if (statusFilter) params.append('status', statusFilter);
    await downloadExcel(
      `/suppliers/export/excel?${params.toString()}`,
      `ooting-b2b-service-providers-${Date.now()}.xlsx`
    );
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await api.delete(`/suppliers/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchSuppliers();
      fetchStats();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete supplier.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN');
  };

  const columns: Column<Supplier>[] = [
    {
      header: 'S.No.',
      accessor: 'sNo',
      className: 'w-16 text-center text-xs text-slate-500 dark:text-slate-400',
    },
    {
      header: 'Supplier / Company',
      sortKey: 'name',
      render: (s) => {
        let cats: string[] = [];
        if (Array.isArray(s.serviceCategories)) {
          cats = s.serviceCategories;
        } else if (typeof s.serviceCategories === 'string') {
          try {
            cats = JSON.parse(s.serviceCategories);
          } catch {
            cats = [s.serviceCategories];
          }
        }
        return (
          <div>
            <span
              onClick={() => navigate(`/suppliers/${s.id}`)}
              className="font-bold text-slate-900 dark:text-slate-100 hover:text-[#C91F28] dark:hover:text-brand-400 cursor-pointer block text-xs sm:text-sm"
            >
              {s.name}
            </span>
            <div className="flex flex-wrap items-center gap-1 mt-1">
              <span
                className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                  SUPPLIER_TYPE_BADGES[s.supplierType] || SUPPLIER_TYPE_BADGES.OTHER
                }`}
              >
                {SUPPLIER_TYPE_LABELS[s.supplierType] || s.supplierType}
              </span>
              {cats.length > 0 && cats.map((c) => (
                <span
                  key={c}
                  className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${getCategoryBadgeClass(c)}`}
                >
                  {c}
                </span>
              ))}
              {s.panNumber && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                  PAN: {s.panNumber}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Tier',
      sortKey: 'tier',
      className: 'w-28 text-center',
      render: (s) => {
        const tier = s.tier || 'Silver';
        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full border shadow-sm ${
              tier === 'Diamond'
                ? 'bg-cyan-50 text-cyan-700 border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800'
                : tier === 'Gold'
                ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
            }`}
          >
            {tier === 'Diamond' && <Sparkles className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />}
            {tier === 'Gold' && <Award className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
            {tier}
          </span>
        );
      },
    },
    {
      header: 'Contact Person & Info',
      sortKey: 'contactPerson',
      render: (s) => (
        <div className="text-xs space-y-1">
          {s.contactPerson && (
            <span className="font-medium text-slate-800 dark:text-slate-200 block">
              {s.contactPerson}
            </span>
          )}
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <Phone className="w-3 h-3 text-slate-400" />
            <span>{s.phone}</span>
            <CopyButton text={s.phone} title="Copy phone" />
            <button
              type="button"
              onClick={() =>
                setWhatsAppData({
                  isOpen: true,
                  customerName: s.contactPerson || s.name,
                  customerPhone: s.whatsapp || s.phone,
                })
              }
              title="Chat on WhatsApp"
              className="p-1 rounded bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 transition-colors"
            >
              <MessageSquare className="w-3 h-3" />
            </button>
          </div>
          {s.email && (
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
              <Mail className="w-3 h-3 text-slate-400" />
              <span className="truncate max-w-[140px]">{s.email}</span>
              <CopyButton text={s.email} title="Copy email" />
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Location & Coverage',
      sortKey: 'city',
      render: (s) => (
        <div className="text-xs text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <span className="font-semibold">{s.city || '—'}</span>
            {s.district && <span className="text-slate-600 dark:text-slate-300">({s.district})</span>}
          </div>
          {s.state && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 pl-4">
              {s.state} {s.pincode ? `• ${s.pincode}` : ''}
            </div>
          )}
          {s.destinationsCovered && (
            <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 pl-4">
              {s.destinationsCovered}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Terms & Credit',
      render: (s) => (
        <div className="text-xs">
          <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
            <CreditCard className="w-3 h-3 text-slate-400" />
            <span>{formatCurrency(s.creditLimit || 0)}</span>
          </div>
          {s.paymentTerms && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
              {s.paymentTerms.replace('_', ' ')}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      sortKey: 'status',
      render: (s) => <Badge status={s.status} />,
    },
    {
      header: 'Assigned Staff',
      render: (s) => (
        <div className="text-xs text-slate-700 dark:text-slate-300">
          {s.assignedUser ? (
            <span className="font-medium">{s.assignedUser.name}</span>
          ) : (
            <span className="text-slate-400 italic">Unassigned</span>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      className: 'w-28 text-right',
      render: (s) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => navigate(`/suppliers/${s.id}`)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          {(isSuperAdmin || can('suppliers', 'edit')) && (
            <button
              onClick={() => {
                setEditingSupplier(s);
                setIsModalOpen(true);
              }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-blue-950/40 transition-colors"
              title="Edit Supplier"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {(isSuperAdmin || can('suppliers', 'delete')) && (
            <button
              onClick={() => setDeleteTarget(s)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-950/40 transition-colors"
              title="Delete Supplier"
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
      {/* Group Sub-Navigation */}
      <ModuleSubNav
        items={[
          {
            name: 'Travel Agents',
            path: '/agents',
            icon: Briefcase,
          },
          {
            name: 'Service Providers',
            path: '/suppliers',
            icon: Building2,
            count: total,
          },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-[#C91F28] dark:text-brand-400" />
            B2B Service Providers
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage hoteliers, fleet vendors, transport coaches, activity providers, guides & verified partners
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(isSuperAdmin || can('suppliers', 'export')) && (
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Export Excel
            </button>
          )}

          {(isSuperAdmin || can('suppliers', 'create')) && (
            <button
              onClick={() => {
                setEditingSupplier(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#C91F28] hover:bg-[#A8171F] text-white shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Service Provider
            </button>
          )}
        </div>
      </div>

      {/* Top Stat Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Providers
            </span>
            <Building2 className="w-4 h-4 text-[#C91F28]" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
            {stats.total}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Hotels & Resorts
            </span>
            <Hotel className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
            {stats.hotels}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Cab & Fleet
            </span>
            <Car className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
            {stats.cabs}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Transport
            </span>
            <Bus className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
            {stats.transport}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Active Partners
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {stats.active}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by company name, contact, phone, city, services..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C91F28]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#C91F28]"
            >
              <option value="">All Service Types</option>
              {Object.entries(SUPPLIER_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={tierFilter}
              onChange={(e) => {
                setTierFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#C91F28]"
            >
              <option value="">All Tiers</option>
              <option value="Diamond">💎 Diamond</option>
              <option value="Gold">🥇 Gold</option>
              <option value="Silver">🥈 Silver</option>
            </select>

            <select
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#C91F28] max-w-[150px] truncate"
            >
              <option value="">All States</option>
              {ALL_INDIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#C91F28]"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="BLACKLISTED">Blacklisted</option>
            </select>

            {(search || typeFilter || tierFilter || stateFilter || statusFilter) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
              >
                Reset
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                fetchSuppliers();
                fetchStats();
              }}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
              title="Refresh list"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <DataTable
        data={suppliers}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="No B2B suppliers found"
        emptyDescription="No B2B suppliers found matching your query."
        sortField={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        pagination={{
          page,
          limit,
          total,
          totalPages,
          onPageChange: (p) => setPage(p),
        }}
      />

      {/* Supplier Modal (Create / Edit) */}
      <SupplierModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSupplier(null);
        }}
        supplier={editingSupplier}
        onSuccess={() => {
          fetchSuppliers();
          fetchStats();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Supplier Partner"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone and will permanently remove this supplier record.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Supplier'}
        isDanger={true}
      />

      {/* WhatsApp Chat Modal */}
      <WhatsAppModal
        isOpen={whatsAppData.isOpen}
        onClose={() =>
          setWhatsAppData({ isOpen: false, customerName: '', customerPhone: '' })
        }
        recipientName={whatsAppData.customerName}
        recipientPhone={whatsAppData.customerPhone}
      />
    </div>
  );
};
export default SupplierList;
