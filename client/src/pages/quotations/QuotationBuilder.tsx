import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Sparkles, User, MapPin, Calendar, Clock, Car } from 'lucide-react';
import { api } from '../../api/client.js';

export const QuotationBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();

  const isEditMode = Boolean(id);
  const leadIdParam = searchParams.get('leadId') || '';

  const [leadId, setLeadId] = useState(leadIdParam);
  const [customerId, setCustomerId] = useState('');
  const [packageId, setPackageId] = useState('');
  const [destination, setDestination] = useState('');
  const [travelStartDate, setTravelStartDate] = useState('');
  const [travelEndDate, setTravelEndDate] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [accommodation, setAccommodation] = useState('3-Star / 4-Star Premium Resorts with Breakfast');
  const [transport, setTransport] = useState('Private Dedicated AC Sedan with Chauffeur');
  const [activities, setActivities] = useState('All major sightseeing, entry passes, and scenic viewpoint excursions');
  const [inclusions, setInclusions] = useState('Daily Breakfast & Dinner, AC Private Vehicle, Sightseeing Transfers, Toll & Parking charges');
  const [exclusions, setExclusions] = useState('Airfare / Train tickets, Personal expenses, Lunches, Adventure sports');
  const [cabDetails, setCabDetails] = useState('AC Sedan / Innova with verified professional chauffeur, all tolls and parking included');
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [basePrice, setBasePrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [status, setStatus] = useState('DRAFT');
  const [paymentTerms, setPaymentTerms] = useState(
    '50% advance to confirm booking. 50% balance cleared 7 days prior to travel departure.'
  );
  const [cancellationTerms, setCancellationTerms] = useState(
    'Free cancellation up to 15 days prior to travel. 50% refund between 7-14 days. Non-refundable within 7 days.'
  );
  const [notes, setNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState(
    `1. 50% advance payment required to confirm booking.\n2. Balance payment to be cleared 7 days prior to travel date.\n3. Cancellations within 48 hours of travel are non-refundable.\n4. Itinerary sequence may change based on local weather conditions.`
  );

  const [quotationNumber, setQuotationNumber] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get('/customers?limit=100').then((res) => setCustomers(res.data.data || []));
    api.get('/packages?limit=100').then((res) => setPackages(res.data.data || []));

    if (isEditMode && id) {
      setIsLoading(true);
      api.get(`/quotations/${id}`)
        .then((res) => {
          const q = res.data.quotation;
          if (q) {
            setQuotationNumber(q.quotationNumber);
            setCustomerId(q.customerId);
            setLeadId(q.leadId || '');
            setPackageId(q.packageId || '');
            setDestination(q.destination || '');
            if (q.travelStartDate) setTravelStartDate(q.travelStartDate.split('T')[0]);
            if (q.travelEndDate) setTravelEndDate(q.travelEndDate.split('T')[0]);
            setAdults(q.adults || 2);
            setChildren(q.children || 0);
            setInfants(q.infants || 0);
            setAccommodation(q.accommodation || '');
            setTransport(q.transport || '');
            setActivities(q.activities || '');
            setInclusions(q.inclusions || '');
            setExclusions(q.exclusions || '');
            setCabDetails(q.cabDetails || '');
            setAdditionalCharges(Number(q.additionalCharges || 0));
            setBasePrice(Number(q.basePrice || 0));
            setDiscount(Number(q.discount || 0));
            setTax(Number(q.tax || 0));
            setStatus(q.status || 'DRAFT');
            if (q.paymentTerms) setPaymentTerms(q.paymentTerms);
            if (q.cancellationTerms) setCancellationTerms(q.cancellationTerms);
            if (q.notes) setNotes(q.notes);
            if (q.termsAndConditions) setTermsAndConditions(q.termsAndConditions);
          }
        })
        .catch((err) => {
          console.error('Failed to load quotation for edit:', err);
          setError('Failed to load quotation.');
        })
        .finally(() => setIsLoading(false));
    } else if (leadIdParam) {
      api.get(`/leads/${leadIdParam}`).then((res) => {
        const l = res.data.lead;
        if (l) {
          setCustomerId(l.customerId);
          setDestination(l.destination);
          if (l.travelStartDate) setTravelStartDate(l.travelStartDate.split('T')[0]);
          if (l.travelEndDate) setTravelEndDate(l.travelEndDate.split('T')[0]);
          setAdults(l.adults || 2);
          setChildren(l.children || 0);
          if (l.packageId) {
            setPackageId(l.packageId);
            if (l.package?.price) setBasePrice(l.package.price * (l.adults || 2));
          } else if (l.budget) {
            setBasePrice(Number(l.budget));
          }
        }
      });
    }
  }, [id, isEditMode, leadIdParam]);

  const handlePackageChange = (selectedPkgId: string) => {
    setPackageId(selectedPkgId);
    const selected = packages.find((p) => p.id === selectedPkgId);
    if (selected) {
      if (!destination) setDestination(selected.destination);
      setBasePrice(selected.price * adults);
      if (selected.inclusions) setInclusions(selected.inclusions);
      if (selected.exclusions) setExclusions(selected.exclusions);
    }
  };

  const finalAmount = Math.max(
    0,
    Number(basePrice) - Number(discount) + Number(tax) + Number(additionalCharges)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setError('Please select a customer.');
      return;
    }
    if (!destination) {
      setError('Please provide a destination.');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    const payload = {
      leadId: leadId || null,
      customerId,
      packageId: packageId || null,
      destination: destination.trim(),
      travelStartDate: travelStartDate || null,
      travelEndDate: travelEndDate || null,
      adults: Number(adults),
      children: Number(children),
      infants: Number(infants),
      accommodation,
      transport,
      activities,
      inclusions,
      exclusions,
      cabDetails,
      additionalCharges: Number(additionalCharges),
      basePrice: Number(basePrice),
      discount: Number(discount),
      tax: Number(tax),
      status,
      paymentTerms,
      cancellationTerms,
      notes,
      termsAndConditions,
    };

    try {
      if (isEditMode && id) {
        const res = await api.put(`/quotations/${id}`, payload);
        navigate(`/quotations/${res.data.id}`);
      } else {
        const res = await api.post('/quotations', payload);
        navigate(`/quotations/${res.data.id}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save quotation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse max-w-4xl mx-auto py-8">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-64" />
        <div className="h-96 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/quotations')}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {isEditMode ? `Edit Quotation ${quotationNumber}` : 'Create Branded Quotation'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Draft a comprehensive proposal complete with Ooting branding, cabs, inclusions, and terms.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSubmit}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSubmitting ? 'Saving...' : isEditMode ? 'Update Quotation' : 'Save & Preview Quotation'}</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900 rounded-xl text-xs">
          {error}
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-5 text-xs text-slate-900 dark:text-slate-100">
        {/* Customer & Package Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-200">Customer *</label>
            <select
              required
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-800 font-medium text-slate-900 dark:text-white"
            >
              <option value="">-- Choose Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} ({c.phone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-200">Select Travel Package (Optional)</label>
            <select
              value={packageId}
              onChange={(e) => handlePackageChange(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-800 font-medium text-slate-900 dark:text-white"
            >
              <option value="">-- Custom Travel Package --</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.packageName} ({p.duration} - ₹{p.price})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Destination & Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-200">Destination *</label>
            <input
              type="text"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Ooty, Mysore, Coorg"
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-200">Start Date</label>
            <input
              type="date"
              value={travelStartDate}
              onChange={(e) => setTravelStartDate(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-200">End Date</label>
            <input
              type="date"
              value={travelEndDate}
              onChange={(e) => setTravelEndDate(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Travellers count & Status */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-200">Adults *</label>
            <input
              type="number"
              min="1"
              required
              value={adults}
              onChange={(e) => setAdults(Number(e.target.value))}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-200">Children</label>
            <input
              type="number"
              min="0"
              value={children}
              onChange={(e) => setChildren(Number(e.target.value))}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-200">Infants</label>
            <input
              type="number"
              min="0"
              value={infants}
              onChange={(e) => setInfants(Number(e.target.value))}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-200">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-800 font-medium text-slate-900 dark:text-white"
            >
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REJECTED">Rejected</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
        </div>

        {/* Transport & Dedicated Cab Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-200">Transport & Vehicle Details</label>
            <textarea
              rows={2}
              value={transport}
              onChange={(e) => setTransport(e.target.value)}
              placeholder="e.g. Dedicated AC Dzire / Ertiga / Innova Crysta for entire tour"
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-200">Dedicated Cab / Chauffeur Specifications</label>
            <textarea
              rows={2}
              value={cabDetails}
              onChange={(e) => setCabDetails(e.target.value)}
              placeholder="e.g. AC Sedan with verified driver, toll & parking inclusive, fuel included"
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Accommodation & Activities */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-200">Accommodation</label>
            <textarea
              rows={2}
              value={accommodation}
              onChange={(e) => setAccommodation(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-200">Activities & Sightseeing</label>
            <textarea
              rows={2}
              value={activities}
              onChange={(e) => setActivities(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Inclusions & Exclusions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-200">Inclusions</label>
            <textarea
              rows={3}
              value={inclusions}
              onChange={(e) => setInclusions(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-200">Exclusions</label>
            <textarea
              rows={3}
              value={exclusions}
              onChange={(e) => setExclusions(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Financial Calculation Section */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
          <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px] uppercase tracking-wider block">
            Quotation Financial Breakdown
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Base Cost (₹) *</label>
              <input
                type="number"
                min="0"
                required
                value={basePrice}
                onChange={(e) => setBasePrice(Number(e.target.value))}
                className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Discount (₹)</label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">GST / Tax (₹)</label>
              <input
                type="number"
                min="0"
                value={tax}
                onChange={(e) => setTax(Number(e.target.value))}
                className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Addl. Charges (₹)</label>
              <input
                type="number"
                min="0"
                value={additionalCharges}
                onChange={(e) => setAdditionalCharges(Number(e.target.value))}
                placeholder="Permits, entry fees, etc."
                className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">Final Quotation Amount:</span>
            <span className="font-bold text-brand-600 dark:text-brand-400 text-lg">
              ₹{finalAmount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Payment & Cancellation Terms */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-200">Payment Terms</label>
            <textarea
              rows={2}
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-200">Cancellation Policy</label>
            <textarea
              rows={2}
              value={cancellationTerms}
              onChange={(e) => setCancellationTerms(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Internal Notes & Terms and Conditions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-200">General Terms & Conditions</label>
            <textarea
              rows={3}
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-200">Internal Notes (Optional)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special customer preferences, driver instructions..."
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </form>
    </div>
  );
};
