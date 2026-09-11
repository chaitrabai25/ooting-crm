import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Sparkles, User, MapPin, Calendar, Clock } from 'lucide-react';
import { api } from '../../api/client.js';

export const QuotationBuilder: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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
  const [basePrice, setBasePrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [termsAndConditions, setTermsAndConditions] = useState(
    `1. 50% advance payment required to confirm booking.\n2. Balance payment to be cleared 7 days prior to travel date.\n3. Cancellations within 48 hours of travel are non-refundable.\n4. Itinerary sequence may change based on local weather conditions.`
  );

  const [customers, setCustomers] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get('/customers?limit=100').then((res) => setCustomers(res.data.data || []));
    api.get('/packages?limit=100').then((res) => setPackages(res.data.data || []));

    if (leadIdParam) {
      api.get(`/leads/${leadIdParam}`).then((res) => {
        const l = res.data.lead;
        if (l) {
          setCustomerId(l.customerId);
          setDestination(l.destination);
          if (l.travelStartDate) setTravelStartDate(l.travelStartDate.split('T')[0]);
          if (l.travelEndDate) setTravelEndDate(l.travelEndDate.split('T')[0]);
          setAdults(l.adults);
          setChildren(l.children);
          if (l.packageId) {
            setPackageId(l.packageId);
            if (l.package?.price) setBasePrice(l.package.price * l.adults);
          } else if (l.budget) {
            setBasePrice(l.budget);
          }
        }
      });
    }
  }, [leadIdParam]);

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

  const finalAmount = Math.max(0, Number(basePrice) - Number(discount) + Number(tax));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setError('Please select a customer.');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await api.post('/quotations', {
        leadId: leadId || null,
        customerId,
        packageId: packageId || null,
        destination,
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
        basePrice: Number(basePrice),
        discount: Number(discount),
        tax: Number(tax),
        termsAndConditions,
      });

      navigate(`/quotations/${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create quotation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/quotations')}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Create Branded Quotation
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Draft a quotation complete with Ooting branding, pricing, and terms.
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
          <span>{isSubmitting ? 'Generating...' : 'Save & Preview Quotation'}</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs">
          {error}
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-5 text-xs">
        {/* Customer & Package Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-semibold text-slate-700">Customer *</label>
            <select
              required
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white font-medium"
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
            <label className="font-semibold text-slate-700">Select Travel Package (Optional)</label>
            <select
              value={packageId}
              onChange={(e) => handlePackageChange(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white font-medium"
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
            <label className="font-semibold text-slate-700">Destination *</label>
            <input
              type="text"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Ooty, Mysore, Coorg"
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700">Start Date</label>
            <input
              type="date"
              value={travelStartDate}
              onChange={(e) => setTravelStartDate(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700">End Date</label>
            <input
              type="date"
              value={travelEndDate}
              onChange={(e) => setTravelEndDate(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white"
            />
          </div>
        </div>

        {/* Travellers count */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="font-semibold text-slate-700">Adults *</label>
            <input
              type="number"
              min="1"
              required
              value={adults}
              onChange={(e) => setAdults(Number(e.target.value))}
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none font-semibold"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700">Children</label>
            <input
              type="number"
              min="0"
              value={children}
              onChange={(e) => setChildren(Number(e.target.value))}
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700">Infants</label>
            <input
              type="number"
              min="0"
              value={infants}
              onChange={(e) => setInfants(Number(e.target.value))}
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Accommodation, Transport & Activities */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="font-semibold text-slate-700">Accommodation</label>
            <textarea
              rows={2}
              value={accommodation}
              onChange={(e) => setAccommodation(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700">Transport & Vehicle</label>
            <textarea
              rows={2}
              value={transport}
              onChange={(e) => setTransport(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700">Activities</label>
            <textarea
              rows={2}
              value={activities}
              onChange={(e) => setActivities(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Inclusions & Exclusions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-semibold text-slate-700">Inclusions</label>
            <textarea
              rows={3}
              value={inclusions}
              onChange={(e) => setInclusions(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700">Exclusions</label>
            <textarea
              rows={3}
              value={exclusions}
              onChange={(e) => setExclusions(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Financial Calculation Section */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
            Quotation Financials
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="font-semibold text-slate-700">Base Package Cost (₹) *</label>
              <input
                type="number"
                min="0"
                required
                value={basePrice}
                onChange={(e) => setBasePrice(Number(e.target.value))}
                className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">Special Discount (₹)</label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700">GST / Taxes (₹)</label>
              <input
                type="number"
                min="0"
                value={tax}
                onChange={(e) => setTax(Number(e.target.value))}
                className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <span className="font-bold text-slate-800 text-sm">Final Quotation Amount:</span>
            <span className="font-bold text-brand-600 text-lg">
              ₹{finalAmount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div>
          <label className="font-semibold text-slate-700">Terms & Conditions</label>
          <textarea
            rows={3}
            value={termsAndConditions}
            onChange={(e) => setTermsAndConditions(e.target.value)}
            className="mt-1 w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
          />
        </div>
      </form>
    </div>
  );
};
