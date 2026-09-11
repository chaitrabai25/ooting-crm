import React, { useState } from 'react';
import { ExternalLink, Star, MessageSquare } from 'lucide-react';
import { api } from '../../api/client.js';
import { Modal } from '../../components/ui/Modal.js';
import { Agent } from '../../types/index.js';

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Agent | null;
}

export const AgentModal: React.FC<AgentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [companyName, setCompanyName] = useState(initialData?.companyName || '');
  const [contactPerson, setContactPerson] = useState(initialData?.contactPerson || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [city, setCity] = useState(initialData?.city || '');
  const [state, setState] = useState(initialData?.state || '');
  const [gstNumber, setGstNumber] = useState(initialData?.gstNumber || '');
  const [status, setStatus] = useState(initialData?.status || 'ACTIVE');

  // Google Review Details
  const [googleReviewUrl, setGoogleReviewUrl] = useState(initialData?.googleReviewUrl || '');
  const [googleReviewRating, setGoogleReviewRating] = useState<number | ''>(
    initialData?.googleReviewRating ?? ''
  );
  const [googleReviewNotes, setGoogleReviewNotes] = useState(initialData?.googleReviewNotes || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (googleReviewUrl && !googleReviewUrl.startsWith('http://') && !googleReviewUrl.startsWith('https://')) {
      setError('Google Review URL must start with http:// or https://');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        companyName: companyName.trim(),
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        email: email ? email.trim() : null,
        city: city ? city.trim() : null,
        state: state ? state.trim() : null,
        gstNumber: gstNumber ? gstNumber.trim() : null,
        status,
        googleReviewUrl: googleReviewUrl ? googleReviewUrl.trim() : null,
        googleReviewRating: googleReviewRating !== '' ? Number(googleReviewRating) : null,
        googleReviewNotes: googleReviewNotes ? googleReviewNotes.trim() : null,
      };

      if (initialData?.id) {
        await api.put('/agents/' + initialData.id, payload);
      } else {
        await api.post('/agents', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save agent.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit B2B Agent' : 'Register B2B Travel Agent'}
      subtitle="Partner agency details, credentials, and Google Review profile"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs max-h-[80vh] overflow-y-auto pr-1">
        {error && (
          <div className="p-3 bg-red-50 text-[#C91F28] border border-red-200 rounded-xl font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="font-semibold text-slate-700">Agency / Company Name *</label>
          <input
            type="text"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Skyline Travels Private Limited"
            className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none font-semibold"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-700">Key Contact Person *</label>
            <input
              type="text"
              required
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="e.g. Vikram Sethi"
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700">Contact Phone *</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 11223"
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-700">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@skylinetravels.com"
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700">GSTIN / Registration</label>
            <input
              type="text"
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value)}
              placeholder="29AAAAA0000A1Z5"
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none uppercase"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="font-semibold text-slate-700">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Bangalore"
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700">State</label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="Karnataka"
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none bg-white"
            >
              <option value="ACTIVE">Active Partner</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>

        {/* Google Review Section */}
        <div className="p-4 bg-amber-50/50 border border-amber-200/80 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-white border border-amber-200 rounded-md shadow-2xs">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              </div>
              <span className="font-bold text-slate-900 text-xs">Google Review & Reputation</span>
            </div>
            {googleReviewUrl && (
              <a
                href={googleReviewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#C91F28] hover:underline bg-white px-2.5 py-1 rounded-lg border border-red-200"
              >
                <span>Test Link</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700">Google Review URL</label>
              <input
                type="url"
                value={googleReviewUrl}
                onChange={(e) => setGoogleReviewUrl(e.target.value)}
                placeholder="https://g.page/r/... or https://maps.app.goo.gl/..."
                className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none bg-white"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Rating (1-5)</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={googleReviewRating}
                onChange={(e) => setGoogleReviewRating(e.target.value ? Number(e.target.value) : '')}
                placeholder="4.8"
                className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none bg-white font-bold"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700">Review Highlights / Testimonial</label>
            <input
              type="text"
              value={googleReviewNotes}
              onChange={(e) => setGoogleReviewNotes(e.target.value)}
              placeholder="e.g. Highly trusted B2B partner with 100+ 5-star Google reviews"
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none bg-white"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 font-semibold text-white bg-[#C91F28] hover:bg-[#a81920] rounded-xl shadow-sm disabled:opacity-50 transition-all"
          >
            {isSubmitting ? 'Saving...' : initialData ? 'Update Agent' : 'Register Agent'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
