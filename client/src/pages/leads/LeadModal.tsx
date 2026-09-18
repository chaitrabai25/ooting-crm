import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { Modal } from '../../components/ui/Modal.js';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export const LeadModal: React.FC<LeadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isNewCustomer, setIsNewCustomer] = useState(!initialData);
  const [customerId, setCustomerId] = useState(initialData?.customerId || '');
  const [customerName, setCustomerName] = useState(initialData?.customer?.fullName || '');
  const [customerPhone, setCustomerPhone] = useState(initialData?.customer?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(initialData?.customer?.email || '');
  const [customerCity, setCustomerCity] = useState(initialData?.customer?.city || '');

  const [destination, setDestination] = useState(initialData?.destination || '');
  const [travelStartDate, setTravelStartDate] = useState(
    initialData?.travelStartDate ? initialData.travelStartDate.split('T')[0] : ''
  );
  const [travelEndDate, setTravelEndDate] = useState(
    initialData?.travelEndDate ? initialData.travelEndDate.split('T')[0] : ''
  );
  const [adults, setAdults] = useState(initialData?.adults || 2);
  const [children, setChildren] = useState(initialData?.children || 0);
  const [budget, setBudget] = useState(initialData?.budget || '');
  const [packageId, setPackageId] = useState(initialData?.packageId || '');
  const [source, setSource] = useState(initialData?.source || 'WEBSITE');
  const [priority, setPriority] = useState(initialData?.priority || 'MEDIUM');
  const [enquiryStatus, setEnquiryStatus] = useState(initialData?.enquiryStatus || 'NEW');
  const [assignedUserId, setAssignedUserId] = useState(initialData?.assignedUserId || '');
  const [nextFollowUpAt, setNextFollowUpAt] = useState('');
  const [notes, setNotes] = useState(initialData?.notes || '');

  // Options
  const [packages, setPackages] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [existingCustomers, setExistingCustomers] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      api.get('/packages?limit=50').then((res) => setPackages(res.data.data || []));
      api.get('/users/staff').then((res) => setStaffList(res.data || []));
      api.get('/customers?limit=50').then((res) => setExistingCustomers(res.data.data || []));
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload: any = {
        destination,
        travelStartDate: travelStartDate || null,
        travelEndDate: travelEndDate || null,
        adults: Number(adults),
        children: Number(children),
        budget: budget ? Number(budget) : null,
        packageId: packageId || null,
        source,
        priority,
        enquiryStatus,
        assignedUserId: assignedUserId || null,
        notes: notes || null,
        nextFollowUpAt: nextFollowUpAt || null,
      };

      if (initialData?.id) {
        await api.put(`/leads/${initialData.id}`, payload);
      } else {
        if (!isNewCustomer && customerId) {
          payload.customerId = customerId;
        } else {
          payload.customerName = customerName;
          payload.customerPhone = customerPhone;
          payload.customerEmail = customerEmail;
          payload.customerCity = customerCity;
        }
        await api.post('/leads', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save lead.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Lead' : 'Create New Enquiry / Lead'}
      subtitle="Enter customer travel preferences and requirements"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        {/* Customer Information Block */}
        {!initialData && (
          <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                Customer Details
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewCustomer(true)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    isNewCustomer ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  + New Customer
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewCustomer(false)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    !isNewCustomer ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  Existing Customer
                </button>
              </div>
            </div>

            {isNewCustomer ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Ramesh Kulkarni"
                    className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. +91 98450 12345"
                    className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="ramesh@example.com"
                    className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">City</label>
                  <input
                    type="text"
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    placeholder="e.g. Bangalore"
                    className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Select Customer *</label>
                <select
                  required
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
                >
                  <option value="">-- Choose Existing Customer --</option>
                  {existingCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.phone}) - {c.city || 'No City'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Destination & Package */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Destination *</label>
            <input
              type="text"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Ooty, Coorg, Andaman"
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Preferred Travel Package</label>
            <select
              value={packageId}
              onChange={(e) => {
                setPackageId(e.target.value);
                const pkg = packages.find((p) => p.id === e.target.value);
                if (pkg && !destination) setDestination(pkg.destination);
              }}
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            >
              <option value="">-- Custom / No Specific Package --</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.packageName} ({p.duration} - ₹{p.price})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Travel Dates & Travellers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Start Date</label>
            <input
              type="date"
              value={travelStartDate}
              onChange={(e) => setTravelStartDate(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">End Date</label>
            <input
              type="date"
              value={travelEndDate}
              onChange={(e) => setTravelEndDate(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Adults</label>
            <input
              type="number"
              min="1"
              value={adults}
              onChange={(e) => setAdults(Number(e.target.value))}
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Children</label>
            <input
              type="number"
              min="0"
              value={children}
              onChange={(e) => setChildren(Number(e.target.value))}
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Budget, Source, Priority, Assigned User */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Approx Budget (₹)</label>
            <input
              type="number"
              min="0"
              placeholder="e.g. 50000"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Enquiry Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            >
              <option value="WEBSITE">Website</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="PHONE">Phone Call</option>
              <option value="INSTAGRAM">Instagram</option>
              <option value="B2B_AGENT">B2B Agent</option>
              <option value="REFERRAL">Referral</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Assign Staff</label>
            <select
              value={assignedUserId}
              onChange={(e) => setAssignedUserId(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            >
              <option value="">-- Unassigned --</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Initial Follow-up & Notes */}
        {!initialData && (
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Schedule First Follow-up (Optional)</label>
            <input
              type="datetime-local"
              value={nextFollowUpAt}
              onChange={(e) => setNextFollowUpAt(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        )}

        <div>
          <label className="font-semibold text-slate-700 dark:text-slate-300">Notes & Special Requirements</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Client requested 4-star hotel with pure vegetarian breakfast, celebrating anniversary..."
            className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : initialData ? 'Update Lead' : 'Save Enquiry'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
