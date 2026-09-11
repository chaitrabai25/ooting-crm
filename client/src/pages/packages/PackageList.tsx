import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  Plus,
  Search,
  MapPin,
  Clock,
  ArrowRight,
  Edit2,
  Calendar,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { PackageModal } from './PackageModal.js';
import { Package } from '../../types/index.js';

export const PackageList: React.FC = () => {
  const navigate = useNavigate();

  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const fetchPackages = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedType) params.append('packageType', selectedType);
      if (selectedStatus) params.append('status', selectedStatus);

      const res = await api.get(`/packages?${params.toString()}`);
      setPackages(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch packages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, [selectedType, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPackages();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Travel Packages & Itineraries</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Curate verified destinations, day-by-day itineraries, pricing, and inclusions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingPackage(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Package</span>
        </button>
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
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
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
            className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
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
            <div key={i} className="h-64 bg-white rounded-xl border border-slate-200 animate-pulse" />
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
              className="bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1 text-xs font-semibold text-brand-600">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{pkg.destination}</span>
                  </div>
                  <Badge status={pkg.status} />
                </div>

                <h3
                  onClick={() => navigate(`/packages/${pkg.id}`)}
                  className="font-bold text-slate-900 text-base group-hover:text-brand-600 transition-colors cursor-pointer"
                >
                  {pkg.packageName}
                </h3>

                <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                  {pkg.description}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium">{pkg.duration}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{pkg.itineraries?.length || 0} Days Plan</span>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3.5 bg-slate-50/75 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Starting from</span>
                  <span className="text-base font-bold text-slate-900">
                    ₹{Number(pkg.price).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal"> / person</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPackage(pkg);
                      setIsModalOpen(true);
                    }}
                    title="Edit Details"
                    className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/packages/${pkg.id}`)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
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
    </div>
  );
};
