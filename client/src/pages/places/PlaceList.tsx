import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Plus,
  Search,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Clock,
  Compass,
  Sparkles,
  Camera,
  Layers,
  Filter,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Place } from '../../types/index.js';
import { INDIA_STATES_AND_DISTRICTS } from '../../data/indiaLocations.js';
import { PlaceModal } from './PlaceModal.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';

export const PlaceList: React.FC = () => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [deletingPlace, setDeletingPlace] = useState<Place | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync available districts
  useEffect(() => {
    if (selectedState) {
      const found = INDIA_STATES_AND_DISTRICTS.find((s) => s.state === selectedState);
      setAvailableDistricts(found ? found.districts : []);
      setSelectedDistrict('');
    } else {
      setAvailableDistricts([]);
      setSelectedDistrict('');
    }
  }, [selectedState]);

  // Fetch places
  const fetchPlaces = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedState) params.append('state', selectedState);
      if (selectedDistrict) params.append('district', selectedDistrict);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const res = await api.get(`/places?${params.toString()}`);
      setPlaces(res.data.places || []);
    } catch (err) {
      console.error('Failed to fetch places:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPlaces();
    }, 250);
    return () => clearTimeout(timer);
  }, [selectedState, selectedDistrict, searchTerm]);

  // Delete place handler
  const handleDeleteConfirm = async () => {
    if (!deletingPlace) return;
    setIsDeleting(true);
    try {
      await api.delete(`/places/${deletingPlace.id}`);
      setPlaces((prev) => prev.filter((p) => p.id !== deletingPlace.id));
      showToast(`Place "${deletingPlace.name}" removed successfully.`);
      setDeletingPlace(null);
    } catch (err: any) {
      console.error('Failed to delete place:', err);
      alert(err.response?.data?.message || 'Failed to remove place.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const rawApiUrl = (import.meta as any).env?.VITE_API_URL;
    const baseUrl = rawApiUrl ? String(rawApiUrl).replace(/\/$/, '') : '';
    const token = localStorage.getItem('ooting_crm_token');
    
    // Direct browser download
    const exportUrl = `${baseUrl}/api/places/export/excel`;
    const anchor = document.createElement('a');
    anchor.href = exportUrl;
    anchor.target = '_blank';
    // For protected route headers, we trigger with fetch blob
    api.get('/places/export/excel', { responseType: 'blob' })
      .then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `ooting-places-master-${Date.now()}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        showToast('Places master exported to Excel.');
      })
      .catch((err) => {
        console.error('Export failed:', err);
        alert('Failed to export places to Excel.');
      });
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#C91F28]">
              <MapPin className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Places Master</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {places.length} Places
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Central repository of sightseeing spots, attractions, landmarks, and timings used across all itineraries
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingPlace(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#C91F28] hover:bg-[#a81920] rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Place</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        {/* Search */}
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by place name, activity, highlights, or landmarks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
          />
        </div>

        {/* State Filter */}
        <div>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="w-full p-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
          >
            <option value="">All States</option>
            {INDIA_STATES_AND_DISTRICTS.map((s) => (
              <option key={s.state} value={s.state}>
                {s.state}
              </option>
            ))}
          </select>
        </div>

        {/* District Filter */}
        <div>
          <select
            disabled={!selectedState}
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="w-full p-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none disabled:opacity-50"
          >
            <option value="">All Districts</option>
            {availableDistricts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Places Grid */}
      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#C91F28] mb-2" />
          <p className="text-xs text-slate-500 font-medium">Loading places catalog...</p>
        </div>
      ) : places.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <MapPin className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No places found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm || selectedState
              ? 'Try clearing your search filters to view all places.'
              : 'Start by clicking "+ Add Place" to register tourist destinations into your database.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingPlace(null);
              setIsModalOpen(true);
            }}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#C91F28] hover:bg-[#a81920] rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Place</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {places.map((place) => (
            <div
              key={place.id}
              className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col"
            >
              {/* Image banner */}
              <div className="relative h-44 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <img
                  src={
                    place.imageUrl ||
                    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80'
                  }
                  alt={place.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />

                {/* Category Pill */}
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-black/60 text-white backdrop-blur-md border border-white/20">
                    {place.category || 'Sightseeing'}
                  </span>
                </div>

                {/* Duration */}
                {place.suggestedDuration && (
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-white/90 text-slate-800 backdrop-blur-md flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#C91F28]" />
                      {place.suggestedDuration}
                    </span>
                  </div>
                )}

                {/* Name & Location on image */}
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <h3 className="font-bold text-base line-clamp-1 text-white shadow-xs drop-shadow-sm">
                    {place.name}
                  </h3>
                  <div className="flex items-center gap-1 text-[11px] text-slate-200 mt-0.5">
                    <MapPin className="w-3 h-3 text-red-400 flex-shrink-0" />
                    <span className="truncate">
                      {place.district}, {place.state}
                    </span>
                  </div>
                </div>
              </div>

              {/* Details Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3 text-xs">
                <div className="space-y-2">
                  {/* Description */}
                  <p className="text-slate-600 dark:text-slate-300 text-xs line-clamp-2 leading-relaxed">
                    {place.description || place.famousReason || 'No detailed description provided.'}
                  </p>

                  {/* Highlights */}
                  {place.highlights && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                      <span className="line-clamp-1 font-medium">{place.highlights}</span>
                    </div>
                  )}

                  {/* Activities */}
                  {place.activities && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {place.activities
                        .split(',')
                        .slice(0, 3)
                        .map((act, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 text-[10px] rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
                          >
                            {act.trim()}
                          </span>
                        ))}
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-slate-400 text-xs">
                  <span className="text-[11px] text-slate-500">
                    {place.distanceFromCenter || 'Nearby Town'}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPlace(place);
                        setIsModalOpen(true);
                      }}
                      title="Edit Place"
                      className="p-1.5 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingPlace(place)}
                      title="Remove Place"
                      className="p-1.5 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Place Modal */}
      <PlaceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPlace(null);
        }}
        place={editingPlace}
        defaultState={selectedState || 'Tamil Nadu'}
        defaultDistrict={selectedDistrict || 'The Nilgiris (Ooty)'}
        onSuccess={(savedPlace) => {
          fetchPlaces();
          showToast(`Place "${savedPlace.name}" saved successfully.`);
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingPlace)}
        title="Delete Place from Master Library"
        message={`Are you sure you want to remove "${deletingPlace?.name}"? It will no longer appear in destination suggestions.`}
        confirmLabel="Remove Place"
        isDanger={true}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeletingPlace(null)}
      />
    </div>
  );
};
