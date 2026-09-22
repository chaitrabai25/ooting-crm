import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { Modal } from '../../components/ui/Modal.js';
import { Sparkles, UserCheck, Package as PackageIcon, Calendar, Users, AlertCircle } from 'lucide-react';

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
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerCity, setCustomerCity] = useState('');

  // Travel Requirement & Preferred Package Mode
  // 'EXISTING' | 'OWN' | 'CUSTOM'
  const [packageMode, setPackageMode] = useState<'EXISTING' | 'OWN' | 'CUSTOM'>('EXISTING');
  const [destination, setDestination] = useState('');
  const [customPackageName, setCustomPackageName] = useState('');
  const [customDuration, setCustomDuration] = useState('');
  const [travelStartDate, setTravelStartDate] = useState('');
  const [travelEndDate, setTravelEndDate] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [budget, setBudget] = useState('');
  const [packageId, setPackageId] = useState('');
  const [source, setSource] = useState('WEBSITE');
  const [priority, setPriority] = useState('MEDIUM');
  const [enquiryStatus, setEnquiryStatus] = useState('NEW');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [nextFollowUpAt, setNextFollowUpAt] = useState('');
  const [notes, setNotes] = useState('');

  // Options
  const [packages, setPackages] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [existingCustomers, setExistingCustomers] = useState<any[]>([]);

  // Synchronize state when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsSubmitting(false);

      // Fetch options in parallel
      api.get('/packages?limit=100').then((res) => setPackages(res.data.data || [])).catch(() => {});
      api.get('/users/staff').then((res) => setStaffList(res.data || [])).catch(() => {});
      api.get('/customers?limit=100').then((res) => setExistingCustomers(res.data.data || [])).catch(() => {});

      if (initialData) {
        setIsNewCustomer(false);
        setCustomerId(initialData.customerId || initialData.customer?.id || '');
        setCustomerName(initialData.customer?.fullName || '');
        setCustomerPhone(initialData.customer?.phone || '');
        setCustomerEmail(initialData.customer?.email || '');
        setCustomerCity(initialData.customer?.city || '');

        setDestination(initialData.destination || '');
        setTravelStartDate(initialData.travelStartDate ? initialData.travelStartDate.split('T')[0] : '');
        setTravelEndDate(initialData.travelEndDate ? initialData.travelEndDate.split('T')[0] : '');
        setAdults(initialData.adults ?? 2);
        setChildren(initialData.children ?? 0);
        setBudget(initialData.budget ? String(initialData.budget) : '');
        setPackageId(initialData.packageId || '');
        setPackageMode(initialData.packageId ? 'EXISTING' : 'CUSTOM');
        setSource(initialData.source || 'WEBSITE');
        setPriority(initialData.priority || 'MEDIUM');
        setEnquiryStatus(initialData.enquiryStatus || 'NEW');

        // Preserve staff assignment from initialData
        const initialStaffId = initialData.assignedUserId || initialData.assignedUser?.id || '';
        setAssignedUserId(initialStaffId);

        setNotes(initialData.notes || '');
        setNextFollowUpAt('');
      } else {
        // Reset to clean defaults
        setIsNewCustomer(true);
        setCustomerId('');
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setCustomerCity('');
        setDestination('');
        setCustomPackageName('');
        setCustomDuration('');
        setTravelStartDate('');
        setTravelEndDate('');
        setAdults(2);
        setChildren(0);
        setBudget('');
        setPackageId('');
        setPackageMode('EXISTING');
        setSource('WEBSITE');
        setPriority('MEDIUM');
        setEnquiryStatus('NEW');
        setAssignedUserId('');
        setNotes('');
        setNextFollowUpAt('');
      }
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const destToSave = destination.trim() || customPackageName.trim();
    if (!destToSave) {
      setError('Destination or Package Name is required.');
      return;
    }

    if (!initialData && isNewCustomer) {
      if (!customerName.trim() || !customerPhone.trim()) {
        setError('Customer Name and Phone Number are required.');
        return;
      }
    } else if (!initialData && !isNewCustomer && !customerId) {
      setError('Please select an existing customer.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Build notes including custom package info if in custom mode
      let combinedNotes = notes.trim();
      if (packageMode === 'CUSTOM' && (customPackageName || customDuration)) {
        const customDetails = `[Custom Package: ${customPackageName || 'Tailor-made'}${customDuration ? ` | Duration: ${customDuration}` : ''}]`;
        combinedNotes = combinedNotes ? `${customDetails}\n${combinedNotes}` : customDetails;
      }

      const payload: any = {
        destination: destToSave,
        travelStartDate: travelStartDate || null,
        travelEndDate: travelEndDate || null,
        adults: Number(adults) || 2,
        children: Number(children) || 0,
        budget: budget ? Number(budget) : null,
        packageId: packageMode === 'EXISTING' || packageMode === 'OWN' ? (packageId || null) : null,
        source,
        priority,
        enquiryStatus,
        assignedUserId: assignedUserId || null,
        notes: combinedNotes || null,
        nextFollowUpAt: nextFollowUpAt || null,
      };

      if (initialData?.id) {
        await api.put(`/leads/${initialData.id}`, payload);
      } else {
        if (!isNewCustomer && customerId) {
          payload.customerId = customerId;
        } else {
          payload.customerName = customerName.trim();
          payload.customerPhone = customerPhone.trim();
          payload.customerEmail = customerEmail.trim() || null;
          payload.customerCity = customerCity.trim() || null;
        }
        await api.post('/leads', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      const respMsg = err.response?.data?.message;
      const respErrors = err.response?.data?.errors;
      if (respErrors && typeof respErrors === 'object') {
        const detailedErr = Object.entries(respErrors)
          .map(([f, msgs]) => `${f}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join(' | ');
        setError(detailedErr || respMsg || 'Failed to save lead.');
      } else {
        setError(respMsg || 'Failed to save lead. Please check all fields and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Lead & Travel Enquiry' : 'Create New Lead / Enquiry'}
      subtitle="Enter customer travel preferences, select package type, and assign staff"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-2 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
            <div>
              <p className="font-bold">Error saving lead:</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Customer Information Block */}
        {!initialData && (
          <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#C91F28]" />
                Customer Information
              </span>
              <div className="flex items-center gap-1.5 bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setIsNewCustomer(true)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    isNewCustomer ? 'bg-[#C91F28] text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  + New Customer
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewCustomer(false)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    !isNewCustomer ? 'bg-[#C91F28] text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Existing Customer
                </button>
              </div>
            </div>

            {isNewCustomer ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Ramesh Kulkarni"
                    className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 9845012345"
                    className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="ramesh@example.com"
                    className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">City / State</label>
                  <input
                    type="text"
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    placeholder="e.g. Bangalore, Karnataka"
                    className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Select Existing Customer <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                >
                  <option value="">-- Choose Existing Customer from CRM --</option>
                  {existingCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.phone}) {c.city ? `- ${c.city}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Preferred Travel Package Mode Selector */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <PackageIcon className="w-3.5 h-3.5 text-[#C91F28]" />
              Preferred Travel Package
            </span>
            <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setPackageMode('EXISTING')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                  packageMode === 'EXISTING' ? 'bg-[#C91F28] text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Existing Package
              </button>
              <button
                type="button"
                onClick={() => setPackageMode('OWN')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                  packageMode === 'OWN' ? 'bg-[#C91F28] text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Own Package
              </button>
              <button
                type="button"
                onClick={() => setPackageMode('CUSTOM')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                  packageMode === 'CUSTOM' ? 'bg-[#C91F28] text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Custom Package
              </button>
            </div>
          </div>

          {/* Existing Package Selector */}
          {(packageMode === 'EXISTING' || packageMode === 'OWN') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Select CRM Package</label>
                <select
                  value={packageId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    setPackageId(selId);
                    const selectedPkg = packages.find((p) => p.id === selId);
                    if (selectedPkg) {
                      setDestination(selectedPkg.destination || selectedPkg.packageName);
                      if (selectedPkg.price && !budget) {
                        setBudget(String(selectedPkg.price));
                      }
                    }
                  }}
                  className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                >
                  <option value="">-- Choose from CRM Package Catalog --</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.packageName} ({p.duration || 'N/A'} - ₹{Number(p.price || 0).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Destination <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Ooty, Coorg, Wayanad"
                  className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Custom Package Inputs */}
          {packageMode === 'CUSTOM' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Custom Package Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customPackageName}
                  onChange={(e) => {
                    setCustomPackageName(e.target.value);
                    if (!destination) setDestination(e.target.value);
                  }}
                  placeholder="e.g. Nilgiri Hills Family Escape"
                  className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Destination <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Ooty - Coonoor - Pykara"
                  className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Duration</label>
                <input
                  type="text"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                  placeholder="e.g. 3 Days / 2 Nights"
                  className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Travel Dates & Travellers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Start Date</label>
            <input
              type="date"
              value={travelStartDate}
              onChange={(e) => setTravelStartDate(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">End Date</label>
            <input
              type="date"
              value={travelEndDate}
              onChange={(e) => setTravelEndDate(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Adults (12+ yrs)</label>
            <input
              type="number"
              min="1"
              value={adults}
              onChange={(e) => setAdults(Number(e.target.value))}
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none font-bold"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Children (0-11 yrs)</label>
            <input
              type="number"
              min="0"
              value={children}
              onChange={(e) => setChildren(Number(e.target.value))}
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
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
              placeholder="e.g. 45000"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Lead Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
            >
              <option value="WEBSITE">Website Form</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="PHONE">Phone Call</option>
              <option value="INSTAGRAM">Instagram / Social</option>
              <option value="B2B_AGENT">B2B Agent</option>
              <option value="REFERRAL">Referral / Word of Mouth</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High Priority</option>
              <option value="URGENT">🔥 Urgent</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Assign Staff Member
            </label>
            <select
              value={assignedUserId}
              onChange={(e) => setAssignedUserId(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none font-medium"
            >
              <option value="">-- Assign to Me (Auto) --</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Schedule First Follow-up (Optional) */}
        {!initialData && (
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Schedule First Follow-up (Optional)
            </label>
            <input
              type="datetime-local"
              value={nextFollowUpAt}
              onChange={(e) => setNextFollowUpAt(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
            />
          </div>
        )}

        {/* Notes & Special Requirements */}
        <div>
          <label className="font-semibold text-slate-700 dark:text-slate-300">
            Requirements, Preferences & Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Honeymoon couple, requested candle-light dinner, pickup from Coimbatore airport..."
            className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
          />
        </div>

        {/* Footer Actions */}
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
            className="px-5 py-2 text-xs font-semibold text-white bg-[#C91F28] hover:bg-[#a81920] rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSubmitting ? 'Saving...' : initialData ? 'Update Lead' : 'Save Enquiry'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
