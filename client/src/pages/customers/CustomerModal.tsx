import React, { useState } from 'react';
import { api } from '../../api/client.js';
import { Modal } from '../../components/ui/Modal.js';
import { Customer, CustomerType } from '../../types/index.js';
import { LocationSelector } from '../../components/common/LocationSelector.js';
import { Building2, School, GraduationCap, Users, User, Trophy } from 'lucide-react';

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
  const [customerType, setCustomerType] = useState<CustomerType>(
    initialData?.customerType || 'INDIVIDUAL'
  );
  const [fullName, setFullName] = useState(initialData?.fullName || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [alternatePhone, setAlternatePhone] = useState(initialData?.alternatePhone || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [city, setCity] = useState(initialData?.city || '');
  const [state, setState] = useState(initialData?.state || '');
  const [source, setSource] = useState(initialData?.source || 'DIRECT');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [status, setStatus] = useState(initialData?.status || 'ACTIVE');

  // Multi-Category Organization Fields
  const [organizationName, setOrganizationName] = useState(initialData?.organizationName || '');
  const [organizationCode, setOrganizationCode] = useState(
    initialData?.organizationCode || (initialData as any)?.udid || ''
  );
  const [category, setCategory] = useState(initialData?.category || '');
  const [website, setWebsite] = useState(initialData?.website || '');
  const [gstin, setGstin] = useState(initialData?.gstin || '');
  const [billingAddress, setBillingAddress] = useState(initialData?.billingAddress || '');
  const [primaryContactName, setPrimaryContactName] = useState(
    initialData?.primaryContactName || ''
  );
  const [primaryContactPhone, setPrimaryContactPhone] = useState(
    initialData?.primaryContactPhone || ''
  );
  const [primaryContactEmail, setPrimaryContactEmail] = useState(
    initialData?.primaryContactEmail || ''
  );
  const [primaryContactDesignation, setPrimaryContactDesignation] = useState(
    initialData?.primaryContactDesignation || ''
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOrganization = customerType !== 'INDIVIDUAL';

  const customerTypeOptions: { type: CustomerType; label: string; icon: React.ElementType }[] = [
    { type: 'INDIVIDUAL', label: 'Individual', icon: User },
    { type: 'GROUP', label: 'Group Departures', icon: Users },
    { type: 'SCHOOL', label: 'School', icon: School },
    { type: 'INSTITUTE', label: 'College / Institute', icon: GraduationCap },
    { type: 'CLUB', label: 'Tour Club', icon: Trophy },
    { type: 'CORPORATE', label: 'Organization / Corporate', icon: Building2 },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const finalFullName = isOrganization
        ? (organizationName.trim() || fullName.trim())
        : fullName.trim();

      const finalPhone = isOrganization
        ? (primaryContactPhone.trim() || phone.trim())
        : phone.trim();

      if (!finalFullName) {
        setError(isOrganization ? 'Organization Name is required' : 'Full Name is required');
        setIsSubmitting(false);
        return;
      }

      if (!finalPhone) {
        setError(isOrganization ? 'Primary Contact Phone is required' : 'Phone Number is required');
        setIsSubmitting(false);
        return;
      }

      const payload: any = {
        fullName: finalFullName,
        phone: finalPhone,
        alternatePhone: alternatePhone || null,
        email: (isOrganization ? primaryContactEmail : email) || null,
        city: city || null,
        state: state || null,
        source,
        notes: notes || null,
        status,
        customerType,
        organizationCode: organizationCode.trim() || null,
        udid: organizationCode.trim() || null,
      };

      if (isOrganization) {
        payload.organizationName = organizationName.trim();
        payload.category = category.trim() || null;
        payload.website = website.trim() || null;
        payload.gstin = gstin.trim() || null;
        payload.billingAddress = billingAddress.trim() || null;
        payload.primaryContactName = primaryContactName.trim() || null;
        payload.primaryContactPhone = primaryContactPhone.trim() || null;
        payload.primaryContactEmail = primaryContactEmail.trim() || null;
        payload.primaryContactDesignation = primaryContactDesignation.trim() || null;
      }

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
      title={initialData ? 'Edit Customer' : 'Add New Customer / Organization'}
      subtitle="Multi-category customer profile: Individual, Corporate, School, Institute or Group"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg">
            {error}
          </div>
        )}

        {/* Customer Type Selector */}
        <div>
          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
            Customer Category *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {customerTypeOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = customerType === opt.type;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => {
                    setCustomerType(opt.type);
                    if (opt.type !== 'INDIVIDUAL' && !organizationName && fullName) {
                      setOrganizationName(fullName);
                    }
                  }}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'border-brand-600 bg-brand-50/70 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-bold ring-1 ring-brand-500'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-brand-600' : 'text-slate-400'}`} />
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* INDIVIDUAL FORM FIELDS */}
        {!isOrganization ? (
          <>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Full Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Anand Kumar"
                className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98450 12345"
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Alternate Phone</label>
                <input
                  type="tel"
                  value={alternatePhone}
                  onChange={(e) => setAlternatePhone(e.target.value)}
                  placeholder="e.g. +91 98450 67890"
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="anand@example.com"
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  UDID / Directory ID (Optional)
                </label>
                <input
                  type="text"
                  value={organizationCode}
                  onChange={(e) => setOrganizationCode(e.target.value)}
                  placeholder="e.g. UDID-9042 / CUST-01"
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-brand-500 font-mono"
                />
              </div>
            </div>
          </>
        ) : (
          /* ORGANIZATION FORM FIELDS */
          <div className="space-y-3.5 bg-slate-50/70 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  {customerType === 'SCHOOL'
                    ? 'School Name *'
                    : customerType === 'INSTITUTE'
                    ? 'College / Institute Name *'
                    : customerType === 'CORPORATE'
                    ? 'Company / Corporate Name *'
                    : customerType === 'GROUP'
                    ? 'Group / Departure Name *'
                    : 'Organization / Club Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder={
                    customerType === 'SCHOOL'
                      ? 'e.g. Delhi Public School'
                      : customerType === 'CORPORATE'
                      ? 'e.g. Infosys Ltd'
                      : customerType === 'GROUP'
                      ? 'e.g. Himalayan Trek Departure 2026'
                      : 'e.g. Rotary Club Bangalore'
                  }
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-brand-500 font-medium"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  UDID / Org Code
                </label>
                <input
                  type="text"
                  value={organizationCode}
                  onChange={(e) => setOrganizationCode(e.target.value)}
                  placeholder="e.g. UDID-9042 / DPS-BLR"
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-brand-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Industry / Domain</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder={
                    customerType === 'SCHOOL' || customerType === 'INSTITUTE'
                      ? 'e.g. K-12 Education / Engineering'
                      : 'e.g. IT & Software / Banking'
                  }
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">GSTIN Number</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="29AAAAA0000A1Z5"
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-mono uppercase"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Website</label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
                />
              </div>
            </div>

            {/* Primary Contact Person */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80">
              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block mb-2">
                Primary Contact Person / Tour Coordinator
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Contact Person Name *</label>
                  <input
                    type="text"
                    required
                    value={primaryContactName}
                    onChange={(e) => setPrimaryContactName(e.target.value)}
                    placeholder="e.g. Rajesh Kumar"
                    className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Designation / Role</label>
                  <input
                    type="text"
                    value={primaryContactDesignation}
                    onChange={(e) => setPrimaryContactDesignation(e.target.value)}
                    placeholder={
                      customerType === 'SCHOOL' ? 'e.g. Vice Principal / Tour Lead' : 'e.g. Head of HR'
                    }
                    className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2.5">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Contact Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={primaryContactPhone}
                    onChange={(e) => setPrimaryContactPhone(e.target.value)}
                    placeholder="e.g. 98450 12345"
                    className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Official Email</label>
                  <input
                    type="email"
                    value={primaryContactEmail}
                    onChange={(e) => setPrimaryContactEmail(e.target.value)}
                    placeholder="rajesh@company.org"
                    className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Billing Address</label>
              <textarea
                rows={2}
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                placeholder="Full registered address for tax invoices..."
                className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
              />
            </div>
          </div>
        )}

        {/* Searchable State & City/District Selector */}
        <LocationSelector
          selectedState={state}
          onStateChange={(s) => setState(s)}
          selectedDistrict={city}
          onDistrictChange={(d) => setCity(d)}
          showPlace={false}
          stateLabel="State"
          districtLabel="City / District"
          statePlaceholder="Select State..."
          districtPlaceholder="Select City / District..."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Lead Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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
            <label className="font-semibold text-slate-700 dark:text-slate-300">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        <div>
          <label className="font-semibold text-slate-700 dark:text-slate-300">Notes</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special preferences, group requirements, billing terms..."
            className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting
              ? 'Saving...'
              : initialData
              ? 'Update Profile'
              : isOrganization
              ? 'Create Organization'
              : 'Save Customer'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
