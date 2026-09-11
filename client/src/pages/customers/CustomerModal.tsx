import React, { useState } from 'react';
import { api } from '../../api/client.js';
import { Modal } from '../../components/ui/Modal.js';
import { Customer } from '../../types/index.js';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Customer | null;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [fullName, setFullName] = useState(initialData?.fullName || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [alternatePhone, setAlternatePhone] = useState(initialData?.alternatePhone || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [city, setCity] = useState(initialData?.city || '');
  const [state, setState] = useState(initialData?.state || '');
  const [source, setSource] = useState(initialData?.source || 'DIRECT');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [status, setStatus] = useState(initialData?.status || 'ACTIVE');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        fullName,
        phone,
        alternatePhone: alternatePhone || null,
        email: email || null,
        city: city || null,
        state: state || null,
        source,
        notes: notes || null,
        status,
      };

      if (initialData?.id) {
        await api.put(`/customers/${initialData.id}`, payload);
      } else {
        await api.post('/customers', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save customer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Customer' : 'Add New Customer'}
      subtitle="Customer profile and contact information"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="font-semibold text-slate-700">Full Name *</label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Anand Kumar"
            className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-700">Phone Number *</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98450 12345"
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700">Alternate Phone</label>
            <input
              type="tel"
              value={alternatePhone}
              onChange={(e) => setAlternatePhone(e.target.value)}
              placeholder="e.g. +91 98450 67890"
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="font-semibold text-slate-700">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="anand@example.com"
            className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-700">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Bangalore"
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700">State</label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="Karnataka"
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-700">Lead Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white"
            >
              <option value="DIRECT">Direct / Walk-in</option>
              <option value="WEBSITE">Website</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="REFERRAL">Referral</option>
              <option value="SOCIAL_MEDIA">Social Media</option>
              <option value="B2B_AGENT">B2B Agent</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        <div>
          <label className="font-semibold text-slate-700">Notes</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special preferences, preferred airlines, anniversary dates..."
            className="mt-1 w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : initialData ? 'Update Profile' : 'Save Customer'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
