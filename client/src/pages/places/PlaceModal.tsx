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
  const [images, setImages] = useState<string[]>([]);
  const [manualImageUrl, setManualImageUrl] = useState('');
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
      setNotes(place.notes || '');

      let parsedImages: string[] = [];
      if (place.gallery) {
        try {
          const parsed = JSON.parse(place.gallery);
          if (Array.isArray(parsed)) parsedImages = parsed.filter(Boolean);
        } catch {
          parsedImages = place.gallery.split(',').map((s) => s.trim()).filter(Boolean);
        }
      }
      if (place.imageUrl && !parsedImages.includes(place.imageUrl)) {
        parsedImages = [place.imageUrl, ...parsedImages];
      }
      setImages(parsedImages);
      setImageUrl(parsedImages[0] || place.imageUrl || '');
      setManualImageUrl('');
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
      setImages([]);
      setManualImageUrl('');
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

  const compressImage = (file: File): Promise<{ blob: Blob; dataUrl: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1600;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
            canvas.toBlob(
              (blob) => resolve({ blob: blob || file, dataUrl }),
              'image/jpeg',
              0.82
            );
          } else {
            resolve({ blob: file, dataUrl: (reader.result as string) || '' });
          }
        };
        img.onerror = () => resolve({ blob: file, dataUrl: (reader.result as string) || '' });
        img.src = (reader.result as string) || '';
      };
      reader.onerror = () => resolve({ blob: file, dataUrl: '' });
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      const uploaded: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 25 * 1024 * 1024) {
          setError(`File "${file.name}" exceeds 25 MB and was skipped.`);
          continue;
        }

        const { blob, dataUrl } = await compressImage(file);
        let finalUrl = '';

        try {
          const formData = new FormData();
          const safeName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_') + '.jpg';
          formData.append('image', blob, safeName);
          formData.append('folder', 'places');

          const res = await api.post('/upload/image?folder=places', formData);
          if (res.data?.url) {
            finalUrl = res.data.url;
          }
        } catch (serverErr) {
          console.warn('Server upload fallback to optimized image data URL:', serverErr);
          finalUrl = dataUrl;
        }

        if (finalUrl) {
          uploaded.push(finalUrl);
        }
      }

      if (uploaded.length > 0) {
        setImages((prev) => {
          const combined = [...prev, ...uploaded];
          setImageUrl(combined[0] || '');
          return combined;
        });
      }
    } catch (err: any) {
      console.error('Place images upload failed:', err);
      setError(err.response?.data?.message || 'Failed to upload place photo(s).');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSetCoverImage = (index: number) => {
    if (index === 0 || index >= images.length) return;
    setImages((prev) => {
      const copy = [...prev];
      const [picked] = copy.splice(index, 1);
      copy.unshift(picked);
      setImageUrl(copy[0] || '');
      return copy;
    });
  };

  const handleAddManualImage = () => {
    const trimmed = manualImageUrl.trim();
    if (!trimmed) return;
    setImages((prev) => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed];
      if (!imageUrl) setImageUrl(next[0]);
      return next;
    });
    setManualImageUrl('');
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => {
      const next = prev.filter((_, idx) => idx !== indexToRemove);
      setImageUrl(next[0] || '');
      return next;
    });
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

    const primaryImage = images[0] || imageUrl.trim() || null;
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
      imageUrl: primaryImage,
      gallery: images.length > 0 ? JSON.stringify(images) : null,
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

        {/* Place Photos Upload (WebP) & Multi-Image Gallery */}
        <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-[#C91F28]" />
              Place Photos & Gallery (Auto-optimized to WebP)
            </label>
            {images.length > 0 && (
              <span className="text-[11px] text-slate-500 font-medium">
                {images.length} photo{images.length > 1 ? 's' : ''} added
              </span>
            )}
          </div>

          {/* Photo Previews Grid */}
          {images.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1 pb-1">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="relative group rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 aspect-video bg-slate-100 dark:bg-slate-900 shadow-2xs"
                >
                  <img
                    src={img}
                    alt={`Place photo ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {idx === 0 ? (
                    <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[9px] px-1 py-0.5 rounded font-medium">
                      Cover
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetCoverImage(idx)}
                      className="absolute bottom-1 left-1 bg-black/75 hover:bg-[#C91F28] text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-semibold cursor-pointer"
                    >
                      Make Cover
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 p-0.5 bg-rose-600/90 text-white rounded-full opacity-90 group-hover:opacity-100 hover:bg-rose-700 transition-opacity cursor-pointer shadow-xs"
                    title="Remove Photo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center text-slate-400 text-xs">
              <Camera className="w-6 h-6 mb-1 text-slate-400" />
              <span>No photos uploaded yet (supports JPG, PNG, WebP)</span>
            </div>
          )}

          {/* Upload and URL Inputs */}
          <div className="space-y-2 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                multiple
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
                <span>{isUploading ? 'Optimizing WebP...' : 'Upload Photos (Select Multiple)'}</span>
              </button>
              <span className="text-[11px] text-slate-400">or add photo URL below</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <LinkIcon className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="url"
                  placeholder="https://... photo link (Unsplash, external URL, etc.)"
                  value={manualImageUrl}
                  onChange={(e) => setManualImageUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddManualImage();
                    }
                  }}
                  className="w-full pl-8 pr-2.5 py-1.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleAddManualImage}
                disabled={!manualImageUrl.trim()}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-40"
              >
                + Add URL
              </button>
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
