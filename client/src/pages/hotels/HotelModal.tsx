import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Star,
  MapPin,
  Clock,
  Phone,
  Mail,
  Camera,
  Upload,
  Link as LinkIcon,
  X,
  Loader2,
  CheckCircle2,
  Coffee,
  Wifi,
  Plus,
  Trash2,
  Globe,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal.js';
import { Hotel } from '../../types/index.js';
import { INDIA_STATES_AND_DISTRICTS } from '../../data/indiaLocations.js';
import { api } from '../../api/client.js';

interface HotelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (hotel: Hotel) => void;
  hotel?: Hotel | null;
  defaultState?: string;
  defaultDistrict?: string;
}

const STAR_CATEGORIES = [
  '5 Star Luxury',
  '4 Star Premium',
  '3 Star Comfort',
  '2 Star Standard',
  'Boutique Resort',
  'Heritage Villa',
  'Eco Lodge / Treehouse',
  'Premium Homestay',
];

const COMMON_AMENITIES = [
  'Free High-Speed Wi-Fi',
  'Multi-cuisine Restaurant',
  'Swimming Pool',
  'Mountain / Lake View',
  'Complimentary Breakfast',
  'Ayurvedic Spa & Wellness',
  'Evening Campfire & Music',
  'Valet & Secure Parking',
  '24/7 Room Service',
  'Travel Desk & Transfers',
];

export interface HotelPhotoItem {
  url: string;
  caption?: string;
}

const PHOTO_CAPTION_PRESETS = [
  'Deluxe Room',
  'Dining Hall',
  'Swimming Pool',
  'Lobby & Reception',
  'Exterior & Lawn',
  'Balcony View',
  'Suite Room',
  'Restaurant / Bar',
];

export const HotelModal: React.FC<HotelModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  hotel,
  defaultState,
  defaultDistrict,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [starCategory, setStarCategory] = useState('3 Star Comfort');
  const [state, setState] = useState('Tamil Nadu');
  const [district, setDistrict] = useState('The Nilgiris (Ooty)');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [checkInTime, setCheckInTime] = useState('12:00 PM');
  const [checkOutTime, setCheckOutTime] = useState('11:00 AM');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [images, setImages] = useState<HotelPhotoItem[]>([]);
  const [manualImageUrl, setManualImageUrl] = useState('');
  const [manualImageCaption, setManualImageCaption] = useState('');
  const [websiteUrls, setWebsiteUrls] = useState<string[]>(['']);

  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form values
  useEffect(() => {
    if (hotel) {
      setName(hotel.name || '');
      setStarCategory(hotel.starCategory || '3 Star Comfort');
      setState(hotel.state || 'Tamil Nadu');
      setDistrict(hotel.district || 'The Nilgiris (Ooty)');
      setCity(hotel.city || '');
      setAddress(hotel.address || '');
      setDescription(hotel.description || '');
      setContactPhone(hotel.contactPhone || '');
      setContactEmail(hotel.contactEmail || '');
      setCheckInTime(hotel.checkInTime || '12:00 PM');
      setCheckOutTime(hotel.checkOutTime || '11:00 AM');
      if (hotel.amenities) {
        setAmenities(
          hotel.amenities
            .split(',')
            .map((a) => a.trim())
            .filter(Boolean)
        );
      } else {
        setAmenities([]);
      }

      // Parse images and gallery with caption support
      let parsedImages: HotelPhotoItem[] = [];
      if (hotel.gallery) {
        try {
          const parsed = JSON.parse(hotel.gallery);
          if (Array.isArray(parsed)) {
            parsedImages = parsed
              .map((item: any) => {
                if (typeof item === 'string') return { url: item.trim(), caption: '' };
                return {
                  url: (item.url || item.imageUrl || '').trim(),
                  caption: item.caption || item.label || '',
                };
              })
              .filter((item) => Boolean(item.url));
          }
        } catch {
          parsedImages = hotel.gallery
            .split(',')
            .map((s) => ({ url: s.trim(), caption: '' }))
            .filter((item) => Boolean(item.url));
        }
      }
      if (hotel.imageUrl && !parsedImages.some((p) => p.url === hotel.imageUrl)) {
        parsedImages = [{ url: hotel.imageUrl, caption: 'Main Property / Exterior' }, ...parsedImages];
      }
      setImages(parsedImages);
      setImageUrl(parsedImages[0]?.url || hotel.imageUrl || '');
      setManualImageUrl('');
      setManualImageCaption('');

      // Parse multiple website URLs
      let parsedUrls: string[] = [];
      if (hotel.websiteUrls) {
        try {
          const p = JSON.parse(hotel.websiteUrls);
          if (Array.isArray(p)) parsedUrls = p.filter(Boolean);
        } catch {
          parsedUrls = hotel.websiteUrls.split('\n').map((u) => u.trim()).filter(Boolean);
        }
      }
      setWebsiteUrls(parsedUrls.length > 0 ? parsedUrls : ['']);
    } else {
      setName('');
      setStarCategory('3 Star Comfort');
      setState(defaultState || 'Tamil Nadu');
      setDistrict(defaultDistrict || 'The Nilgiris (Ooty)');
      setCity('');
      setAddress('');
      setDescription('');
      setContactPhone('');
      setContactEmail('');
      setCheckInTime('12:00 PM');
      setCheckOutTime('11:00 AM');
      setImageUrl('');
      setImages([]);
      setManualImageUrl('');
      setManualImageCaption('');
      setWebsiteUrls(['']);
      setAmenities(['Free High-Speed Wi-Fi', 'Complimentary Breakfast', 'Multi-cuisine Restaurant']);
    }
    setError(null);
  }, [hotel, isOpen, defaultState, defaultDistrict]);

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

  const toggleAmenity = (item: string) => {
    setAmenities((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  };

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
      const uploaded: HotelPhotoItem[] = [];
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
          formData.append('folder', 'hotels');

          const res = await api.post('/upload/image?folder=hotels', formData);
          if (res.data?.url) {
            finalUrl = res.data.url;
          }
        } catch (serverErr) {
          console.warn('Server upload fallback to optimized image data URL:', serverErr);
          finalUrl = dataUrl;
        }

        if (finalUrl) {
          uploaded.push({ url: finalUrl, caption: '' });
        }
      }

      if (uploaded.length > 0) {
        setImages((prev) => {
          const combined = [...prev, ...uploaded];
          setImageUrl(combined[0]?.url || '');
          return combined;
        });
      }
    } catch (err: any) {
      console.error('Hotel images upload failed:', err);
      setError(err.response?.data?.message || 'Failed to upload hotel photo(s).');
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
      setImageUrl(copy[0]?.url || '');
      return copy;
    });
  };

  const handleAddManualImage = () => {
    const trimmed = manualImageUrl.trim();
    if (!trimmed) return;
    setImages((prev) => {
      if (prev.some((p) => p.url === trimmed)) return prev;
      const next = [...prev, { url: trimmed, caption: manualImageCaption.trim() }];
      if (!imageUrl) setImageUrl(next[0].url);
      return next;
    });
    setManualImageUrl('');
    setManualImageCaption('');
  };

  const handleUpdateCaption = (index: number, caption: string) => {
    setImages((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], caption };
      }
      return copy;
    });
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => {
      const next = prev.filter((_, idx) => idx !== indexToRemove);
      setImageUrl(next[0]?.url || '');
      return next;
    });
  };

  const handleAddUrl = () => {
    setWebsiteUrls((prev) => [...prev, '']);
  };

  const handleUrlChange = (index: number, val: string) => {
    setWebsiteUrls((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleRemoveUrl = (index: number) => {
    setWebsiteUrls((prev) => {
      const copy = prev.filter((_, i) => i !== index);
      return copy.length === 0 ? [''] : copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Hotel name is required.');
      return;
    }
    if (!state.trim() || !district.trim()) {
      setError('State and District are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const cleanUrls = websiteUrls.map((u) => u.trim()).filter(Boolean);
    const primaryImage = images[0]?.url || imageUrl.trim() || null;

    const payload = {
      name: name.trim(),
      starCategory: starCategory.trim(),
      state: state.trim(),
      district: district.trim(),
      city: city.trim() || null,
      address: address.trim() || null,
      description: description.trim() || null,
      contactPhone: contactPhone.trim() || null,
      contactEmail: contactEmail.trim() || null,
      checkInTime: checkInTime.trim() || '12:00 PM',
      checkOutTime: checkOutTime.trim() || '11:00 AM',
      amenities: amenities.length > 0 ? amenities.join(', ') : null,
      imageUrl: primaryImage,
      gallery: images.length > 0 ? JSON.stringify(images) : null,
      websiteUrls: cleanUrls.length > 0 ? JSON.stringify(cleanUrls) : null,
    };

    try {
      let savedHotel: Hotel;
      if (hotel?.id) {
        const res = await api.put(`/hotels/${hotel.id}`, payload);
        savedHotel = res.data.hotel;
      } else {
        const res = await api.post('/hotels', payload);
        savedHotel = res.data.hotel;
      }

      onSuccess(savedHotel);
      onClose();
    } catch (err: any) {
      console.error('Failed to save hotel:', err);
      setError(err.response?.data?.message || 'Failed to save hotel to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={hotel ? `Edit Hotel: ${hotel.name}` : 'Add Hotel / Resort'}
      subtitle="Save accommodation property permanently to Hotel Master library"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs max-h-[80vh] overflow-y-auto pr-1">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-800 text-xs">
            {error}
          </div>
        )}

        {/* Hotel Name & Star Category */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Hotel / Resort Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sterling Ooty Fern Hill, Heritage Resort, Club Mahindra"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Star / Property Category
            </label>
            <select
              value={starCategory}
              onChange={(e) => setStarCategory(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
            >
              {STAR_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* State, District & City */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">State *</label>
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
            <label className="font-semibold text-slate-700 dark:text-slate-300">District *</label>
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

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">City / Town</label>
            <input
              type="text"
              placeholder="e.g. Ooty, Coonoor, Madikeri"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
            />
          </div>
        </div>

        {/* Address & Description */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Street Address</label>
            <textarea
              rows={2}
              placeholder="Full physical address or landmark..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Overview & Room Description
            </label>
            <textarea
              rows={2}
              placeholder="Atmosphere, room types, views, key guest experience..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
            />
          </div>
        </div>

        {/* Contact Info & Timings */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Contact Phone</label>
            <input
              type="text"
              placeholder="+91 98765 43210"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Reservation Email</label>
            <input
              type="email"
              placeholder="bookings@hotel.com"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Check-in Time</label>
            <input
              type="text"
              placeholder="12:00 PM"
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Check-out Time</label>
            <input
              type="text"
              placeholder="11:00 AM"
              value={checkOutTime}
              onChange={(e) => setCheckOutTime(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
            />
          </div>
        </div>

        {/* Amenities Selection */}
        <div>
          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
            Key Amenities & Features
          </label>
          <div className="flex flex-wrap gap-2">
            {COMMON_AMENITIES.map((amenity) => {
              const selected = amenities.includes(amenity);
              return (
                <button
                  type="button"
                  key={amenity}
                  onClick={() => toggleAmenity(amenity)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer ${
                    selected
                      ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-[#C91F28] font-bold shadow-2xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {amenity}
                </button>
              );
            })}
          </div>
        </div>

        {/* Hotel Multiple Website / Booking URLs */}
        <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#C91F28]" />
              Hotel Website & External Booking URLs
            </label>
            <button
              type="button"
              onClick={handleAddUrl}
              className="text-[11px] font-semibold text-[#C91F28] hover:text-[#a81920] flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              Add URL
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Add multiple links such as official hotel website, Booking.com, Agoda, or PDF brochure links.
          </p>

          <div className="space-y-2">
            {websiteUrls.map((url, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-2.5 text-[10px] font-bold text-slate-400">
                    URL {idx + 1}
                  </span>
                  <input
                    type="url"
                    placeholder="https://www.hotelwebsite.com or OTA link"
                    value={url}
                    onChange={(e) => handleUrlChange(idx, e.target.value)}
                    className="w-full pl-14 pr-2.5 py-1.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                  />
                </div>
                {websiteUrls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveUrl(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                    title="Remove URL"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Hotel Photos Upload (WebP) & Multi-Image Gallery with Captions */}
        <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#C91F28]" />
                Hotel Photos & Gallery (Auto-optimized to WebP)
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Add captions like "Deluxe Room", "Dining Hall", "Swimming Pool" to showcase features in itinerary PDF.
              </p>
            </div>
            {images.length > 0 && (
              <span className="text-[11px] font-bold text-[#C91F28] bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-md border border-red-200 dark:border-red-800 shrink-0">
                {images.length} photo{images.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Photo Previews Grid with Captions */}
          {images.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1 pb-1">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="flex flex-col bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xs group"
                >
                  <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <img
                      src={img.url}
                      alt={img.caption || `Hotel photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {idx === 0 ? (
                      <span className="absolute bottom-1 left-1 bg-black/75 text-white text-[9px] px-1.5 py-0.5 rounded font-semibold tracking-wide shadow-xs">
                        Cover Photo
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetCoverImage(idx)}
                        className="absolute bottom-1 left-1 bg-black/75 hover:bg-[#C91F28] text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-semibold cursor-pointer shadow-xs"
                      >
                        Make Cover
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-rose-600/90 text-white rounded-full opacity-90 group-hover:opacity-100 hover:bg-rose-700 transition-opacity cursor-pointer shadow-xs"
                      title="Remove Photo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Caption Input for each Photo */}
                  <div className="p-2 space-y-1.5 bg-slate-50/70 dark:bg-slate-800/70 border-t border-slate-200 dark:border-slate-700 flex-1 flex flex-col justify-between">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                        Photo Caption
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Deluxe Room, Dining Hall..."
                        value={img.caption || ''}
                        onChange={(e) => handleUpdateCaption(idx, e.target.value)}
                        className="w-full px-2 py-1 text-[11px] font-medium border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-md focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                      />
                    </div>
                    {/* Quick Preset Buttons */}
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {['Room', 'Dining', 'Pool', 'Lobby', 'Exterior'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            const full =
                              preset === 'Room'
                                ? 'Deluxe Room'
                                : preset === 'Dining'
                                ? 'Dining Hall'
                                : preset === 'Pool'
                                ? 'Swimming Pool'
                                : preset === 'Lobby'
                                ? 'Lobby & Reception'
                                : 'Exterior View';
                            handleUpdateCaption(idx, full);
                          }}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:text-[#C91F28] hover:border-[#C91F28] transition-colors cursor-pointer"
                        >
                          +{preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-5 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs">
              <Building2 className="w-6 h-6 mb-1 text-slate-400" />
              <span>No photos uploaded yet (supports JPG, PNG, WebP)</span>
            </div>
          )}

          {/* Upload and URL Inputs */}
          <div className="space-y-2.5 pt-1">
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
                className="px-3.5 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C91F28]" />
                ) : (
                  <Upload className="w-3.5 h-3.5 text-[#C91F28]" />
                )}
                <span>{isUploading ? 'Optimizing WebP...' : 'Upload Photos (Select Multiple)'}</span>
              </button>
              <span className="text-[11px] text-slate-400">or add web photo URL with caption below</span>
            </div>

            {/* Manual Image URL + Caption Box */}
            <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <LinkIcon className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="url"
                    placeholder="https://... photo URL"
                    value={manualImageUrl}
                    onChange={(e) => setManualImageUrl(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Caption (e.g. Deluxe Room, Dining Hall)"
                    value={manualImageCaption}
                    onChange={(e) => setManualImageCaption(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddManualImage();
                      }
                    }}
                    className="flex-1 px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddManualImage}
                    disabled={!manualImageUrl.trim()}
                    className="px-3 py-1.5 bg-[#C91F28] hover:bg-[#a81920] text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-40 shrink-0 shadow-2xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Caption Quick Chips for new URL */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-slate-400 font-medium">Quick caption:</span>
                {PHOTO_CAPTION_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setManualImageCaption(preset)}
                    className={`text-[10px] px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                      manualImageCaption === preset
                        ? 'bg-red-50 text-[#C91F28] border-red-300 font-bold'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>
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
            <span>{hotel ? 'Save Changes' : 'Add to Hotel Master'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
