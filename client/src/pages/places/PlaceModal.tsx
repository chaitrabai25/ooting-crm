import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Clock,
  Sparkles,
  Camera,
  Upload,
  Link as LinkIcon,
  X,
  Loader2,
  CheckCircle2,
  Calendar,
  Compass,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal.js';
import { Place } from '../../types/index.js';
import { INDIA_STATES_AND_DISTRICTS } from '../../data/indiaLocations.js';
import { api } from '../../api/client.js';

interface PlaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (place: Place) => void;
  place?: Place | null;
  defaultState?: string;
  defaultDistrict?: string;
}

const CATEGORIES = [
  'Sightseeing',
  'Nature & Landscapes',
  'Heritage & Culture',
  'Temple & Spiritual',
  'Viewpoint & Sunrise/Sunset',
  'Wildlife & Safari',
  'Adventure & Trekking',
  'Lakes & Waterfalls',
  'Beaches & Coastal',
  'Gardens & Parks',
  'Shopping & Local Craft',
];

export const PlaceModal: React.FC<PlaceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  place,
  defaultState,
  defaultDistrict,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [state, setState] = useState('Tamil Nadu');
  const [district, setDistrict] = useState('The Nilgiris (Ooty)');
  const [category, setCategory] = useState('Sightseeing');
  const [description, setDescription] = useState('');
  const [highlights, setHighlights] = useState('');
  const [bestTime, setBestTime] = useState('');
  const [suggestedDuration, setSuggestedDuration] = useState('2 Hours');
  const [distanceFromCenter, setDistanceFromCenter] = useState('');
  const [activities, setActivities] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [notes, setNotes] = useState('');

  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form
  useEffect(() => {
    if (place) {
      setName(place.name || '');
      setState(place.state || 'Tamil Nadu');
      setDistrict(place.district || 'The Nilgiris (Ooty)');
      setCategory(place.category || 'Sightseeing');
      setDescription(place.description || place.famousReason || '');
      setHighlights(place.highlights || '');
      setBestTime(place.bestTime || '');
      setSuggestedDuration(place.suggestedDuration || '2 Hours');
      setDistanceFromCenter(place.distanceFromCenter || '');
      setActivities(place.activities || '');
      setImageUrl(place.imageUrl || '');
      setNotes(place.notes || '');
    } else {
      setName('');
      setState(defaultState || 'Tamil Nadu');
      setDistrict(defaultDistrict || 'The Nilgiris (Ooty)');
      setCategory('Sightseeing');
      setDescription('');
      setHighlights('');
      setBestTime('');
      setSuggestedDuration('2 Hours');
      setDistanceFromCenter('');
      setActivities('');
      setImageUrl('');
      setNotes('');
    }
    setError(null);
  }, [place, isOpen, defaultState, defaultDistrict]);

  // Sync available districts
  useEffect(() => {
    const found = INDIA_STATES_AND_DISTRICTS.find((s) => s.state === state);
    if (found) {
      setAvailableDistricts(found.districts);
      if (!found.districts.includes(district)) {
        setDistrict(found.districts[0] || '');
      }
    } else {
      setAvailableDistricts([]);
    }
  }, [state]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      // Server converts to optimized .webp automatically via Sharp
      const res = await api.post('/upload/image?folder=places', formData);
      if (res.data?.url) {
        setImageUrl(res.data.url);
      }
    } catch (err: any) {
      console.error('Image upload failed:', err);
      setError(err.response?.data?.message || 'Failed to upload and optimize image. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Place name is required.');
      return;
    }
    if (!state.trim() || !district.trim()) {
      setError('State and District are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      name: name.trim(),
      state: state.trim(),
      district: district.trim(),
      category: category.trim(),
      description: description.trim(),
      famousReason: description.trim(),
      highlights: highlights.trim() || null,
      bestTime: bestTime.trim() || null,
      suggestedDuration: suggestedDuration.trim() || '2 Hours',
      distanceFromCenter: distanceFromCenter.trim() || null,
      activities: activities.trim() || null,
      imageUrl: imageUrl.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      let savedPlace: Place;
      if (place?.id && !place.isCurated) {
        const res = await api.put(`/places/${place.id}`, payload);
        savedPlace = res.data.place;
      } else {
        const res = await api.post('/places', payload);
        savedPlace = res.data.place;
      }

      onSuccess(savedPlace);
      onClose();
    } catch (err: any) {
      console.error('Failed to save place:', err);
      setError(err.response?.data?.message || 'Failed to save place to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={place ? `Edit Place: ${place.name}` : 'Add Destination Place'}
      subtitle="Save sightseeing attraction permanently to the Place Master database"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs max-h-[80vh] overflow-y-auto pr-1">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-800 text-xs">
            {error}
          </div>
        )}

        {/* Place Name & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Place / Attraction Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Doddabetta Peak, Abbey Falls, Mysore Palace"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* State & District */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              State *
            </label>
            <select
              required
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
            >
              {INDIA_STATES_AND_DISTRICTS.map((s) => (
                <option key={s.state} value={s.state}>
                  {s.state}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              District / Region *
            </label>
            <select
              required
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
            >
              {availableDistricts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description / Overview */}
        <div>
          <label className="font-semibold text-slate-700 dark:text-slate-300">
            Description & Highlights Overview
          </label>
          <textarea
            rows={3}
            placeholder="Key highlights, history, scenic appeal, why tourists visit this place..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
          />
        </div>

        {/* Highlights & Best Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Key Highlights (Comma-separated)
            </label>
            <input
              type="text"
              placeholder="e.g. 360° view, Telescope house, Tea gardens"
              value={highlights}
              onChange={(e) => setHighlights(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Best Time to Visit
            </label>
            <input
              type="text"
              placeholder="e.g. September to May, Early Morning (Sunrise)"
              value={bestTime}
              onChange={(e) => setBestTime(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
            />
          </div>
        </div>

        {/* Duration, Distance & Activities */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Suggested Duration
            </label>
            <input
              type="text"
              placeholder="e.g. 2 Hours, Half Day"
              value={suggestedDuration}
              onChange={(e) => setSuggestedDuration(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Distance from Center / Town
            </label>
            <input
              type="text"
              placeholder="e.g. 9 km from Ooty Town"
              value={distanceFromCenter}
              onChange={(e) => setDistanceFromCenter(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Activities (comma-separated)
            </label>
            <input
              type="text"
              placeholder="Boating, Trekking, Photography"
              value={activities}
              onChange={(e) => setActivities(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
            />
          </div>
        </div>

        {/* Photo Upload & Preview */}
        <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-[#C91F28]" />
              Place Feature Photo (Auto-optimized to WebP)
            </span>
            {imageUrl && (
              <button
                type="button"
                onClick={() => setImageUrl('')}
                className="text-[11px] text-rose-600 hover:underline flex items-center gap-0.5"
              >
                <X className="w-3 h-3" /> Clear Image
              </button>
            )}
          </label>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {imageUrl ? (
              <div className="w-28 h-20 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 flex-shrink-0 bg-slate-100">
                <img src={imageUrl} alt="Place Preview" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-28 h-20 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center text-slate-400 text-[10px] flex-shrink-0">
                <Camera className="w-5 h-5 mb-0.5" />
                No Photo
              </div>
            )}

            <div className="flex-1 w-full space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C91F28]" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-[#C91F28]" />
                  )}
                  <span>{isUploading ? 'Optimizing WebP...' : 'Upload Image File'}</span>
                </button>
                <span className="text-[11px] text-slate-400">or enter image URL below</span>
              </div>

              <div className="relative">
                <LinkIcon className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/... or /uploads/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Operational Notes */}
        <div>
          <label className="font-semibold text-slate-700 dark:text-slate-300">
            Internal Notes / Entry Ticket Info
          </label>
          <input
            type="text"
            placeholder="e.g. Entry fee ₹30/adult, camera ₹50, closed on Mondays"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
          />
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isUploading}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#C91F28] hover:bg-[#a81920] rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>{place ? 'Save Changes' : 'Add to Place Master'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
