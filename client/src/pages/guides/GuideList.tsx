import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Eye,
  Edit2,
  Trash2,
  Star,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  Globe,
  FileSpreadsheet,
  Download,
  Calendar,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { Badge } from '../../components/ui/Badge.js';
import { CopyButton } from '../../components/ui/CopyButton.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { GuideModal } from './GuideModal.js';
import { TourGuide, GuideType } from '../../types/index.js';
import { notifyError } from '../../utils/sweetalert.js';

export const GuideList: React.FC = () => {
  const navigate = useNavigate();

  const [guides, setGuides] = useState<TourGuide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<TourGuide | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Delete Dialog
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    guide: TourGuide | null;
  }>({
    isOpen: false,
    guide: null,
  });

  const fetchGuides = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (search) params.append('search', search);
      if (selectedType && selectedType !== 'ALL') params.append('guideType', selectedType);
      if (selectedStatus && selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (selectedLanguage) params.append('language', selectedLanguage);

      const res = await api.get(`/guides?${params.toString()}`);
      setGuides(res.data.data || []);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error('Failed to fetch guides:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGuides();
  }, [page, selectedType, selectedStatus, selectedLanguage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchGuides();
  };

  const handleDeleteGuide = async () => {
    if (!deleteDialog.guide) return;
    try {
      await api.delete(`/guides/${deleteDialog.guide.id}`);
      setDeleteDialog({ isOpen: false, guide: null });
      fetchGuides();
    } catch (err: any) {
      notifyError('Failed to Delete Guide', err.response?.data?.message || 'Failed to remove guide.');
    }
  };

  const parseLanguages = (raw?: string | null): string[] => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return raw.split(',').map((s) => s.trim());
    }
    return [];
  };

  const columns: Column<TourGuide>[] = [
    {
      header: 'Guide Info',
      render: (g) => (
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-brand-50 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 font-bold flex items-center justify-center text-xs shrink-0 border border-brand-200 dark:border-brand-800">
            {g.fullName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span
                onClick={() => navigate(`/guides/${g.id}`)}
                className="font-bold text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer text-xs"
              >
                {g.fullName}
              </span>
              <span className="font-mono text-[10px] font-bold text-brand-600 dark:text-brand-400 px-1 rounded bg-brand-50 dark:bg-brand-950/60">
                {g.guideCode}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
              <span>{g.experienceYears || 0} yrs exp</span>
              {g.rating && (
                <span className="inline-flex items-center gap-0.5 text-amber-500 font-bold">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {g.rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Guide Type',
      render: (g) => (
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            g.guideType === 'INTERNAL'
              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
              : g.guideType === 'FREELANCE'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
          }`}
        >
          {g.guideType}
        </span>
      ),
    },
    {
      header: 'Contact Info',
      render: (g) => (
        <div className="text-xs space-y-0.5">
          <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
            <Phone className="w-3 h-3 text-slate-400" />
            <span>{g.phone}</span>
            <CopyButton text={g.phone} title="Copy phone" />
          </div>
          {g.email && (
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
              <Mail className="w-3 h-3 text-slate-400" />
              <span className="truncate max-w-[130px]">{g.email}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Languages',
      render: (g) => {
        const langs = parseLanguages(g.languages);
        if (langs.length === 0) return <span className="text-slate-400 text-xs">—</span>;
        return (
          <div className="flex flex-wrap gap-1 max-w-[180px]">
            {langs.slice(0, 3).map((l, i) => (
              <span
                key={i}
                className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
              >
                {l}
              </span>
            ))}
            {langs.length > 3 && (
              <span className="text-[10px] text-slate-400 font-semibold">+{langs.length - 3}</span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Daily Rate',
      render: (g) => (
        <span className="text-xs font-bold text-slate-900 dark:text-white">
          ₹{Number(g.dailyRate || 0).toLocaleString('en-IN')}{' '}
          <span className="text-[10px] text-slate-400 font-normal">/ day</span>
        </span>
      ),
    },
    {
      header: 'Status',
      render: (g) => (
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
            g.status === 'ACTIVE'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
              : g.status === 'SUSPENDED'
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
              : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          {g.status}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right w-28',
      render: (g) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => navigate(`/guides/${g.id}`)}
            className="p-1.5 text-slate-500 hover:text-brand-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            title="View 360° Profile"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingGuide(g);
              setIsModalOpen(true);
            }}
            className="p-1.5 text-slate-500 hover:text-brand-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Edit Guide"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteDialog({ isOpen: true, guide: g })}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
            title="Delete Guide"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-50 dark:bg-brand-950/50 text-brand-600 rounded-lg">
              <Compass className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Tour Guide Directory</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage certified field guides, freelance escorts, language fluencies, and assignments
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => navigate('/guides/dashboard')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs"
          >
            <Compass className="w-3.5 h-3.5 text-brand-600" />
            <span>Operations Dashboard</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingGuide(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Guide</span>
          </button>
        </div>
      </div>

      {/* Guide Type Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'ALL', label: 'All Guides' },
          { id: 'INTERNAL', label: 'Internal Staff' },
          { id: 'FREELANCE', label: 'Freelancers' },
          { id: 'CONTRACT', label: 'Contractual' },
        ].map((tab) => {
          const isActive = selectedType === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setSelectedType(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guide name, code, phone, destination..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="p-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>

          <input
            type="text"
            value={selectedLanguage}
            onChange={(e) => {
              setSelectedLanguage(e.target.value);
              setPage(1);
            }}
            placeholder="Language filter..."
            className="p-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white w-32"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <DataTable
          columns={columns}
          data={guides}
          isLoading={isLoading}
          emptyTitle="No guides registered yet"
          emptyDescription="Click 'Register Guide' to add your first tour guide profile."
          pagination={{
            page,
            limit,
            total,
            totalPages,
            onPageChange: (newPage) => setPage(newPage),
          }}
        />
      </div>

      {/* Register / Edit Modal */}
      {isModalOpen && (
        <GuideModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchGuides}
          initialData={editingGuide}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, guide: null })}
        onConfirm={handleDeleteGuide}
        title="Delete Tour Guide"
        message={`Are you sure you want to remove ${deleteDialog.guide?.fullName} (${deleteDialog.guide?.guideCode})? Past tour assignment records will be retained for audit integrity.`}
        confirmLabel="Delete Guide"
        isDanger={true}
      />
    </div>
  );
};
