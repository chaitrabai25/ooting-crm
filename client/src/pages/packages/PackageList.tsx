/**
 * Travel Packages & Master Itineraries Directory
 * Catalogs curated travel packages, day-wise itineraries, inclusions,
 * pricing, and custom itinerary generation. All package data is persisted in the database.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  MapPin,
  Clock,
  ArrowRight,
  Edit2,
  Calendar,
  FileSpreadsheet,
  Trash2,
  Sparkles,
  LayoutGrid,
  List,
  FileText,
  Compass,
  CheckCircle2,
  Tag,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { PackageModal } from './PackageModal.js';
import { CustomItineraryModal } from '../../components/packages/CustomItineraryModal.js';
import { Package } from '../../types/index.js';
import { downloadExcel } from '../../utils/exportHelper.js';
import { useAuth } from '../../context/AuthContext.js';
import { useLiveSync } from '../../utils/useLiveSync.js';
import { notifyError } from '../../utils/sweetalert.js';

const DESTINATION_FALLBACKS: Record<string, string> = {
  ooty: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=800&auto=format&fit=crop&q=80',
  coorg: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&auto=format&fit=crop&q=80',
  mysore: 'https://images.unsplash.com/photo-1600100397608-f010f444f434?w=800&auto=format&fit=crop&q=80',
  kerala: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&auto=format&fit=crop&q=80',
  wayanad: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&auto=format&fit=crop&q=80',
  trivandrum: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&auto=format&fit=crop&q=80',
  kanyakumari: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&auto=format&fit=crop&q=80',
  rameshwaram: 'https://images.unsplash.com/photo-1605649487212-47bdab064df8?w=800&auto=format&fit=crop&q=80',
  tirupati: 'https://images.unsplash.com/photo-1620619767323-b95a89183081?w=800&auto=format&fit=crop&q=80',
  srisailam: 'https://images.unsplash.com/photo-1590766940554-634a7ed41450?w=800&auto=format&fit=crop&q=80',
  hyderabad: 'https://images.unsplash.com/photo-1605649487212-47bdab064df8?w=800&auto=format&fit=crop&q=80',
  mahabalipuram: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&auto=format&fit=crop&q=80',
  andaman: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80',
  goa: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&auto=format&fit=crop&q=80',
  gokarna: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
  shivamogga: 'https://images.unsplash.com/photo-1511497584788-87676104235f?w=800&auto=format&fit=crop&q=80',
  chikmagalur: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&auto=format&fit=crop&q=80',
  south: 'https://images.unsplash.com/photo-1600100397608-f010f444f434?w=800&auto=format&fit=crop&q=80',
  default: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&auto=format&fit=crop&q=80',
};

function getPackageCoverImage(pkg: any): string {
  if (pkg.imageUrl && pkg.imageUrl.trim() && pkg.imageUrl !== 'null' && pkg.imageUrl !== 'undefined') {
    return pkg.imageUrl.trim();
  }
  if (pkg.itineraries?.[0]?.imageUrl && pkg.itineraries[0].imageUrl.trim()) {
    return pkg.itineraries[0].imageUrl.trim();
  }
  if (pkg.itineraries?.[0]?.images) {
    try {
      const parsed = JSON.parse(pkg.itineraries[0].images);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = parsed[0];
        const url = typeof first === 'string' ? first : first?.url || first?.imageUrl;
        if (url && url.trim()) return url.trim();
      }
    } catch {}
  }
  const nameAndDest = `${pkg.packageName || ''} ${pkg.destination || ''}`.toLowerCase();
  for (const [key, url] of Object.entries(DESTINATION_FALLBACKS)) {
    if (key !== 'default' && nameAndDest.includes(key)) return url;
  }
  return DESTINATION_FALLBACKS.default;
}

export const PackageList: React.FC = () => {
  const navigate = useNavigate();
  const { can, isSuperAdmin } = useAuth();

  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCustomItineraryOpen, setIsCustomItineraryOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [deletingPackage, setDeletingPackage] = useState<Package | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const fetchPackages = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const params = new URLSearchParams();
      params.append('limit', '100');
      if (search) params.append('search', search);
      if (selectedType) params.append('packageType', selectedType);
      if (selectedStatus) params.append('status', selectedStatus);

      const res = await api.get(`/packages?${params.toString()}`);
      setPackages(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch packages:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Visibility-aware live synchronization (refreshes on focus and relaxed 60s background cycle)
  useLiveSync(fetchPackages, [selectedType, selectedStatus], { intervalMs: 60000 });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPackages();
  };

  const handleExportExcel = async () => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (selectedType) params.append('type', selectedType);
    if (selectedStatus) params.append('status', selectedStatus);
    await downloadExcel(`/packages/export/excel?${params.toString()}`, `ooting-packages-${Date.now()}.xlsx`);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPackage) return;
    try {
      setIsDeleting(true);
      await api.delete(`/packages/${deletingPackage.id}`);
      setDeletingPackage(null);
      fetchPackages();
    } catch (err: any) {
      notifyError('Failed to Delete Package', err.response?.data?.message || 'Failed to delete package.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Travel Packages & Itineraries
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Curate verified destinations, day-by-day itineraries, pricing, and inclusions.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Excel Export */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingPackage(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#C91F28] hover:bg-[#a81920] rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Package</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCustomItineraryOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-500 rounded-lg shadow-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950" />
            <span>Custom Itinerary</span>
          </button>
        </div>
      </div>

      {/* Quick Metrics Bar for Immediate Package Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Total Packages</span>
          <span className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 block">{packages.length}</span>
        </div>
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Active Tours</span>
          <span className="text-2xl font-black text-emerald-600 mt-0.5 block">
            {packages.filter((p) => p.status === 'ACTIVE').length}
          </span>
        </div>
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Destinations</span>
          <span className="text-2xl font-black text-[#C91F28] mt-0.5 block">
            {new Set(packages.map((p) => (p.destination || '').trim().toLowerCase()).filter(Boolean)).size}
          </span>
        </div>
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Avg Starting Rate</span>
          <span className="text-2xl font-black text-amber-600 mt-0.5 block">
            ₹
            {packages.length > 0
              ? Math.round(
                  packages.reduce((sum, p) => sum + Number(p.price || 0), 0) / packages.length
                ).toLocaleString('en-IN')
              : '0'}
          </span>
        </div>
      </div>

      {/* Filters and View Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search package name, destination, route..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#C91F28]/20 focus:border-[#C91F28] transition-colors"
          />
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#C91F28]"
          >
            <option value="">All Categories</option>
            <option value="HOLIDAY">Holiday Tour</option>
            <option value="FLIGHT">Flight + Hotel</option>
            <option value="HOTEL">Hotel Stay</option>
            <option value="BUS">Bus Tour</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#C91F28]"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="DRAFT">Draft</option>
          </select>

          {/* View Mode Switcher */}
          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 p-0.5 ml-auto">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-[#C91F28] shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
              title="Grid Card View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-[#C91F28] shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
              title="Table Directory View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Package Content Presentation */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-80 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : packages.length === 0 ? (
        <EmptyState
          title="No travel packages found"
          description="Create your first destination tour or holiday package to use in enquiries and quotations."
          className="my-8"
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => {
            const daysCount = pkg._count?.itineraries || (pkg as any).itineraries?.length || 0;

            return (
              <div
                key={pkg.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xl transition-all flex flex-col justify-between overflow-hidden group shadow-2xs"
              >
                {/* Major Package Hero Image Banner */}
                <div
                  onClick={() => navigate(`/packages/${pkg.id}`)}
                  className="relative h-52 w-full overflow-hidden bg-slate-900/5 cursor-pointer"
                >
                  <img
                    src={getPackageCoverImage(pkg)}
                    alt={pkg.packageName}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                    onError={(e) => {
                      const fallback = DESTINATION_FALLBACKS.default;
                      if ((e.target as HTMLImageElement).src !== fallback) {
                        (e.target as HTMLImageElement).src = fallback;
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-slate-950/40" />

                  {/* Floating Top Destination & Status Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md text-white text-xs font-black shadow-md border border-white/10">
                      <MapPin className="w-3.5 h-3.5 text-[#C91F28]" />
                      <span className="truncate max-w-[170px]">{pkg.destination}</span>
                    </span>
                    <Badge status={pkg.status} />
                  </div>

                  {/* Floating Bottom Duration & Days Badges */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-sm font-bold text-white shadow-xs">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>{pkg.duration}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#C91F28] font-black text-[11px] uppercase tracking-wider text-white shadow-md">
                      <Calendar className="w-3 h-3" />
                      <span>{daysCount > 0 ? `${daysCount} Days Planned` : 'Custom Days'}</span>
                    </span>
                  </div>
                </div>

                {/* Package Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-50 text-[#C91F28] border border-red-200">
                        {pkg.packageType || 'HOLIDAY TOUR'}
                      </span>
                    </div>

                    <h3
                      onClick={() => navigate(`/packages/${pkg.id}`)}
                      className="font-display font-black text-slate-950 dark:text-slate-100 text-base group-hover:text-[#C91F28] dark:group-hover:text-red-400 transition-colors cursor-pointer leading-snug line-clamp-1"
                    >
                      {pkg.packageName}
                    </h3>

                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {pkg.description || 'Exclusive curated itinerary featuring verified attractions, comfortable transit, and premium stays.'}
                    </p>
                  </div>
                </div>

                {/* Card Action & Price Footer */}
                <div className="px-4 py-3 bg-slate-50/90 dark:bg-slate-850/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Starting Price</span>
                    <span className="text-base sm:text-lg font-black text-[#C91F28] block">
                      ₹{Number(pkg.price).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* View PDF Button */}
                    <button
                      type="button"
                      onClick={() => navigate(`/packages/${pkg.id}/pdf`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-2xs transition-all cursor-pointer"
                      title="Open & Download Official PDF Itinerary"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span>PDF</span>
                    </button>

                    {/* Manage Details Button */}
                    <button
                      type="button"
                      onClick={() => navigate(`/packages/${pkg.id}`)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-[#C91F28] bg-red-50 hover:bg-red-100 rounded-xl border border-red-200/80 transition-all cursor-pointer"
                      title="View & Edit Schedule"
                    >
                      <span>Manage</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingPackage(pkg);
                        setIsModalOpen(true);
                      }}
                      title="Edit Details"
                      className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {(isSuperAdmin || can('packages', 'delete')) && (
                      <button
                        type="button"
                        onClick={() => setDeletingPackage(pkg)}
                        title="Delete Package"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Impressive Table Directory View */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10.5px]">
                <tr>
                  <th className="py-3 px-4">Package & Destination</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Schedule</th>
                  <th className="py-3 px-4">Starting Price</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {packages.map((pkg) => {
                  const daysCount = pkg._count?.itineraries || (pkg as any).itineraries?.length || 0;
                  return (
                    <tr
                      key={pkg.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={getPackageCoverImage(pkg)}
                            alt=""
                            className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200 shadow-2xs"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = DESTINATION_FALLBACKS.default;
                            }}
                          />
                          <div>
                            <span
                              onClick={() => navigate(`/packages/${pkg.id}`)}
                              className="font-black text-slate-950 dark:text-white text-sm hover:text-[#C91F28] cursor-pointer block leading-snug"
                            >
                              {pkg.packageName}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                              <MapPin className="w-3 h-3 text-[#C91F28]" />
                              <span>{pkg.destination}</span>
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-[10px] uppercase text-slate-700 dark:text-slate-300">
                          {pkg.packageType}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{pkg.duration}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-[#C91F28] font-bold text-[11px]">
                          <Calendar className="w-3 h-3" />
                          <span>{daysCount} Days</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-black text-sm text-[#C91F28]">
                          ₹{Number(pkg.price).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge status={pkg.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/packages/${pkg.id}/pdf`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-2xs"
                            title="Open PDF"
                          >
                            <FileText className="w-3 h-3 text-amber-400" />
                            <span>PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/packages/${pkg.id}`)}
                            className="p-1.5 text-slate-600 hover:text-[#C91F28] hover:bg-red-50 rounded-lg"
                            title="Manage Itinerary"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPackage(pkg);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Package Modal */}
      {isModalOpen && (
        <PackageModal
          isOpen={isModalOpen}
          initialData={editingPackage}
          onClose={() => {
            setIsModalOpen(false);
            setEditingPackage(null);
          }}
          onSuccess={() => fetchPackages()}
        />
      )}

      {/* Custom Itinerary Modal */}
      {isCustomItineraryOpen && (
        <CustomItineraryModal
          isOpen={isCustomItineraryOpen}
          onClose={() => setIsCustomItineraryOpen(false)}
          onSuccess={() => fetchPackages()}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingPackage}
        onClose={() => setDeletingPackage(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Travel Package"
        message={`Are you sure you want to delete the package "${deletingPackage?.packageName}"? This will remove the package and its day itineraries. Packages with confirmed bookings cannot be deleted.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Package'}
        isDanger={true}
      />
    </div>
  );
};
