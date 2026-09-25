import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Plus, Sparkles, Building, Loader2, Check } from 'lucide-react';
import { SearchableDropdown } from './SearchableDropdown.js';
import {
  INDIA_STATES_AND_DISTRICTS,
  ALL_INDIAN_STATES,
  getDistrictsForState,
} from '../../data/indiaLocations.js';
import { api } from '../../api/client.js';

interface LocationSelectorProps {
  selectedState: string;
  onStateChange: (state: string) => void;
  selectedDistrict: string;
  onDistrictChange: (district: string) => void;
  selectedPlace?: string;
  onPlaceChange?: (place: string) => void;
  showPlace?: boolean;
  layout?: 'grid' | 'stack';
  stateLabel?: string;
  districtLabel?: string;
  placeLabel?: string;
  statePlaceholder?: string;
  districtPlaceholder?: string;
  placePlaceholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  selectedState,
  onStateChange,
  selectedDistrict,
  onDistrictChange,
  selectedPlace,
  onPlaceChange,
  showPlace = true,
  layout = 'grid',
  stateLabel = 'State',
  districtLabel = 'District',
  placeLabel = 'Place / Tourist Attraction',
  statePlaceholder = 'Select Indian State / UT...',
  districtPlaceholder = 'Select District...',
  placePlaceholder = 'Search or select place...',
  required = false,
  disabled = false,
  className = '',
}) => {
  const [placesList, setPlacesList] = useState<any[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);

  // Quick Inline Add Custom Place Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceCategory, setNewPlaceCategory] = useState('Sightseeing');
  const [newPlaceDesc, setNewPlaceDesc] = useState('');
  const [isSavingPlace, setIsSavingPlace] = useState(false);

  // Available districts for the currently selected state
  const availableDistricts = useMemo(() => {
    return getDistrictsForState(selectedState);
  }, [selectedState]);

  // Load places whenever State or District changes
  useEffect(() => {
    if (!showPlace) return;

    let isMounted = true;
    const loadPlaces = async () => {
      try {
        setIsLoadingPlaces(true);
        const params: any = {};
        if (selectedState) params.state = selectedState;
        if (selectedDistrict) params.district = selectedDistrict;

        const res = await api.get('/places', { params });
        if (isMounted) {
          setPlacesList(res.data?.places || []);
        }
      } catch (err) {
        console.warn('Failed to fetch places for location:', err);
      } finally {
        if (isMounted) setIsLoadingPlaces(false);
      }
    };

    loadPlaces();
    return () => {
      isMounted = false;
    };
  }, [selectedState, selectedDistrict, showPlace]);

  // Handle State Change: clear district and place if no longer valid
  const handleStateSelect = (state: string) => {
    onStateChange(state);
    const districts = getDistrictsForState(state);
    if (!districts.includes(selectedDistrict)) {
      onDistrictChange('');
      if (onPlaceChange) onPlaceChange('');
    }
  };

  // Handle District Change
  const handleDistrictSelect = (dist: string) => {
    onDistrictChange(dist);
    if (onPlaceChange && selectedPlace) {
      // Keep place if user desires or allow re-selection
    }
  };

  // Save new place directly to database and auto-select it
  const handleSaveCustomPlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaceName.trim()) return;

    try {
      setIsSavingPlace(true);
      const res = await api.post('/places', {
        name: newPlaceName.trim(),
        state: selectedState || 'Karnataka',
        district: selectedDistrict || 'Bengaluru Urban',
        category: newPlaceCategory,
        description: newPlaceDesc.trim(),
      });

      const created = res.data?.place;
      if (created) {
        setPlacesList((prev) => [created, ...prev]);
        if (onPlaceChange) {
          onPlaceChange(created.name);
        }
      }
      setIsAddModalOpen(false);
      setNewPlaceName('');
      setNewPlaceDesc('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save place to database.');
    } finally {
      setIsSavingPlace(false);
    }
  };

  const placeOptions = useMemo(() => {
    return placesList.map((p) => ({
      value: p.name,
      label: p.name,
      subLabel: `${p.category || 'Sightseeing'} • ${p.district || ''}`,
    }));
  }, [placesList]);

  return (
    <div className={`space-y-3 ${className}`}>
      <div
        className={
          layout === 'grid'
            ? `grid gap-3 grid-cols-1 ${
                showPlace ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
              }`
            : 'space-y-3'
        }
      >
        {/* 1. STATE SELECTOR */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {stateLabel} {required && <span className="text-red-500">*</span>}
          </label>
          <SearchableDropdown
            options={ALL_INDIAN_STATES}
            value={selectedState}
            onChange={handleStateSelect}
            placeholder={statePlaceholder}
            searchPlaceholder="Type 'K' or state name..."
            disabled={disabled}
            allowClear
          />
        </div>

        {/* 2. DISTRICT SELECTOR */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {districtLabel} {required && <span className="text-red-500">*</span>}
          </label>
          <SearchableDropdown
            options={availableDistricts}
            value={selectedDistrict}
            onChange={handleDistrictSelect}
            placeholder={
              selectedState
                ? districtPlaceholder
                : 'Select State first...'
            }
            searchPlaceholder="Type district name..."
            disabled={disabled || !selectedState}
            allowClear
          />
        </div>

        {/* 3. PLACE / DESTINATION SELECTOR */}
        {showPlace && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {placeLabel} {required && <span className="text-red-500">*</span>}
              </label>
              {onPlaceChange && !disabled && (
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="text-[10px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-0.5 hover:underline"
                  title="Add custom place to database"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Place</span>
                </button>
              )}
            </div>

            <SearchableDropdown
              options={placeOptions}
              value={selectedPlace || ''}
              onChange={(val) => onPlaceChange && onPlaceChange(val)}
              placeholder={
                isLoadingPlaces
                  ? 'Loading places...'
                  : placePlaceholder
              }
              searchPlaceholder="Type place name or attraction..."
              disabled={disabled}
              allowClear
              allowCustom
              customButtonText="Use custom place"
              onCustomAdd={(val) => onPlaceChange && onPlaceChange(val)}
            />
          </div>
        )}
      </div>

      {/* Quick Add Custom Place Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Add New Place to Database
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustomPlace} className="space-y-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Location Scope
                </span>
                <span className="font-semibold text-slate-900 dark:text-white block">
                  {selectedDistrict || 'Any District'}, {selectedState || 'All India'}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Place Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newPlaceName}
                  onChange={(e) => setNewPlaceName(e.target.value)}
                  placeholder="e.g. Hebbe Falls / Mullayanagiri Peak"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={newPlaceCategory}
                  onChange={(e) => setNewPlaceCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="Sightseeing">Sightseeing</option>
                  <option value="Nature">Nature / Waterfalls</option>
                  <option value="Heritage">Heritage / Fort</option>
                  <option value="Temple">Temple / Pilgrimage</option>
                  <option value="Viewpoint">Viewpoint / Mountain</option>
                  <option value="Wildlife">Wildlife / Sanctuary</option>
                  <option value="Adventure">Adventure / Trekking</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Highlights
                </label>
                <textarea
                  rows={2}
                  value={newPlaceDesc}
                  onChange={(e) => setNewPlaceDesc(e.target.value)}
                  placeholder="Key scenic highlights, best time to visit, timings..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPlace || !newPlaceName.trim()}
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingPlace && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Place to DB</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
