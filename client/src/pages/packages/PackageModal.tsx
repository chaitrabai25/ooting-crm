import React, { useState } from 'react';
import { api } from '../../api/client.js';
import { Modal } from '../../components/ui/Modal.js';
import { Package } from '../../types/index.js';

interface PackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Package | null;
}

export const PackageModal: React.FC<PackageModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [packageName, setPackageName] = useState(initialData?.packageName || '');
  const [destination, setDestination] = useState(initialData?.destination || '');
  const [duration, setDuration] = useState(initialData?.duration || '3 Days / 2 Nights');
  const [price, setPrice] = useState(initialData?.price || 0);
  const [packageType, setPackageType] = useState(initialData?.packageType || 'HOLIDAY');
  const [description, setDescription] = useState(initialData?.description || '');
  const [inclusions, setInclusions] = useState(initialData?.inclusions || '');
  const [exclusions, setExclusions] = useState(initialData?.exclusions || '');
  const [status, setStatus] = useState(initialData?.status || 'ACTIVE');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        packageName,
        destination,
        duration,
        price: Number(price),
        packageType,
        description,
        inclusions: inclusions || null,
        exclusions: exclusions || null,
        status,
      };

      if (initialData?.id) {
        await api.put(`/packages/${initialData.id}`, payload);
      } else {
        await api.post('/packages', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save package.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Travel Package' : 'Create Travel Package'}
      subtitle="Define destinations, duration, and baseline pricing"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="font-semibold text-slate-700">Package Name *</label>
          <input
            type="text"
            required
            value={packageName}
            onChange={(e) => setPackageName(e.target.value)}
            placeholder="e.g. Royal Mysore & Coorg Serenity"
            className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none font-semibold text-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-700">Destination *</label>
            <input
              type="text"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Ooty, Mysore, Coorg, Andaman"
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700">Duration *</label>
            <input
              type="text"
              required
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 4 Days / 3 Nights"
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="font-semibold text-slate-700">Base Price per Pax (₹) *</label>
            <input
              type="number"
              required
              min="0"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none font-bold"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700">Category</label>
            <select
              value={packageType}
              onChange={(e) => setPackageType(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white"
            >
              <option value="HOLIDAY">Holiday Tour</option>
              <option value="FLIGHT">Flight + Hotel</option>
              <option value="HOTEL">Hotel Stay</option>
              <option value="BUS">Bus Tour</option>
              <option value="CUSTOM">Custom Itinerary</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
        </div>

        <div>
          <label className="font-semibold text-slate-700">Package Overview & Description *</label>
          <textarea
            rows={3}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the travel experience, major sightseeing spots, and highlights..."
            className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-700">Key Inclusions</label>
            <textarea
              rows={3}
              value={inclusions}
              onChange={(e) => setInclusions(e.target.value)}
              placeholder="Accommodation, Breakfast, AC Cab, Sightseeing transfers, Entry tickets..."
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700">Key Exclusions</label>
            <textarea
              rows={3}
              value={exclusions}
              onChange={(e) => setExclusions(e.target.value)}
              placeholder="Airfare, Personal shopping, Meals outside plan, Laundry..."
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : initialData ? 'Update Package' : 'Save Package'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
