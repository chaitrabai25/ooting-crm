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
      setImageUrl(hotel.imageUrl || '');
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await api.post('/upload/image?folder=hotels', formData);
      if (res.data?.url) {
        setImageUrl(res.data.url);
      }
    } catch (err: any) {
      console.error('Hotel image upload failed:', err);
      setError(err.response?.data?.message || 'Failed to upload and optimize hotel photo.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
      imageUrl: imageUrl.trim() || null,
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

        {/* Hotel Photo Upload (WebP) */}
        <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-[#C91F28]" />
              Hotel Feature Photo (Auto-optimized to WebP)
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
                <img src={imageUrl} alt="Hotel Preview" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-28 h-20 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center text-slate-400 text-[10px] flex-shrink-0">
                <Building2 className="w-5 h-5 mb-0.5" />
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
                  <span>{isUploading ? 'Optimizing WebP...' : 'Upload Hotel Photo'}</span>
                </button>
                <span className="text-[11px] text-slate-400">or enter image URL below</span>
              </div>

              <div className="relative">
                <LinkIcon className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="url"
                  placeholder="https://... or /uploads/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                />
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
