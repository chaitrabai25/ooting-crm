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
  andaman: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80',
  kerala: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&auto=format&fit=crop&q=80',
  wayanad: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&auto=format&fit=crop&q=80',
  haridwar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80',
  gokarna: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
  shivamogga: 'https://images.unsplash.com/photo-1511497584788-87676104235f?w=800&auto=format&fit=crop&q=80',
  solapur: 'https://images.unsplash.com/photo-1566837945700-30057527ade0?w=800&auto=format&fit=crop&q=80',
  default: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&auto=format&fit=crop&q=80',
};

function getPackageCoverImage(pkg: any): string {
  if (pkg.imageUrl && pkg.imageUrl.trim()) return pkg.imageUrl.trim();
  if (pkg.itineraries?.[0]?.imageUrl && pkg.itineraries[0].imageUrl.trim()) {
    return pkg.itineraries[0].imageUrl.trim();
  }
  if (pkg.itineraries?.[0]?.images) {
    try {
      const parsed = JSON.parse(pkg.itineraries[0].images);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = parsed[0];
        const url = typeof first === 'string' ? first : first?.url || first?.imageUrl;
        if (url) return url;
      }
    } catch {}
  }
  const destLower = (pkg.destination || '').toLowerCase();
  for (const [key, url] of Object.entries(DESTINATION_FALLBACKS)) {
    if (key !== 'default' && destLower.includes(key)) return url;
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

  const fetchPackages = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const params = new URLSearchParams();
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search package name, destination..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
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
            className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>
      </div>

      {/* Package Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : packages.length === 0 ? (
        <EmptyState
          title="No travel packages found"
          description="Create your first destination tour or holiday package to use in enquiries and quotations."
          className="my-8"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden group"
            >
              {/* Major Package Hero Image Banner */}
              <div
                onClick={() => navigate(`/packages/${pkg.id}`)}
                className="relative h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer"
              >
                <img
                  src={getPackageCoverImage(pkg)}
                  alt={pkg.packageName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    const fallback = DESTINATION_FALLBACKS.default;
                    if ((e.target as HTMLImageElement).src !== fallback) {
                      (e.target as HTMLImageElement).src = fallback;
                    }
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />

                {/* Floating Top Destination & Status Badges */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs text-[11px] font-bold text-slate-900 dark:text-white shadow-xs">
                    <MapPin className="w-3.5 h-3.5 text-[#C91F28]" />
                    <span className="truncate max-w-[150px]">{pkg.destination}</span>
                  </span>
                  <Badge status={pkg.status} />
                </div>

                {/* Floating Bottom Duration & Type Badges */}
                <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-[11px]">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs font-semibold text-white">
                    <Clock className="w-3 h-3 text-amber-300" />
                    <span>{pkg.duration}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#C91F28] font-bold text-[10px] uppercase tracking-wider text-white shadow-xs">
                    {pkg.packageType || 'Tour'}
                  </span>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3
                    onClick={() => navigate(`/packages/${pkg.id}`)}
                    className="font-display font-bold text-slate-900 dark:text-slate-100 text-base group-hover:text-[#C91F28] dark:group-hover:text-red-400 transition-colors cursor-pointer leading-snug line-clamp-2"
                  >
                    {pkg.packageName}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {pkg.description}
                  </p>
                </div>
              </div>

              <div className="px-5 py-3.5 bg-slate-50/75 dark:bg-slate-850/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Starting from</span>
                  <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                    ₹{Number(pkg.price).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal"> / person</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPackage(pkg);
                      setIsModalOpen(true);
                    }}
                    title="Edit Details"
                    className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-md transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {(isSuperAdmin || can('packages', 'delete')) && (
                    <button
                      type="button"
                      onClick={() => setDeletingPackage(pkg)}
                      title="Delete Package"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => navigate(`/packages/${pkg.id}`)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 bg-brand-50 dark:bg-brand-950/40 hover:bg-brand-100 dark:hover:bg-brand-900/50 rounded-lg transition-colors"
                  >
                    <span>Itinerary</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
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
