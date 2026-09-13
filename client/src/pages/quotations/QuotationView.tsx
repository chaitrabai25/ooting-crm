import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  Share2,
  CheckCircle2,
  Calendar,
  MapPin,
  Clock,
  Phone,
  Mail,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.js';

export const QuotationView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [quotation, setQuotation] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQuotation = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/quotations/${id}`);
      setQuotation(res.data.quotation);
      setCompany(res.data.company);
    } catch (err) {
      console.error('Failed to load quotation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchQuotation();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleStatusUpdate = async (status: string) => {
    try {
      await api.patch(`/quotations/${id}/status`, { status });
      fetchQuotation();
    } catch (err) {
      console.error('Failed to update quotation status:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse max-w-4xl mx-auto">
        <div className="h-6 bg-slate-200 rounded w-40" />
        <div className="h-96 bg-white rounded-xl border border-slate-200" />
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-slate-500">Quotation not found.</p>
        <button
          onClick={() => navigate('/quotations')}
          className="mt-3 text-xs font-semibold text-brand-600 hover:underline"
        >
          Return to Quotations
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto">
      {/* Non-Printable Action Header */}
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/quotations')}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">
                {quotation.quotationNumber}
              </h1>
              <Badge status={quotation.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Prepared for {quotation.customer?.fullName} • {quotation.destination}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {quotation.status === 'DRAFT' && (
            <button
              type="button"
              onClick={() => handleStatusUpdate('SENT')}
              className="px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200"
            >
              Mark Sent
            </button>
          )}

          {quotation.status === 'SENT' && (
            <button
              type="button"
              onClick={() => handleStatusUpdate('ACCEPTED')}
              className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200"
            >
              Mark Accepted
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const phoneDigits = quotation.customer?.phone?.replace(/\D/g, '') || '';
              const dates = quotation.travelStartDate
                ? `${new Date(quotation.travelStartDate).toLocaleDateString('en-IN')} to ${quotation.travelEndDate ? new Date(quotation.travelEndDate).toLocaleDateString('en-IN') : 'TBD'}`
                : 'TBD';
              const text = `Hello *${quotation.customer?.fullName || 'Valued Client'}*,\n\nHere is your travel quotation from *Ooting - Journeys Beyond Ordinary*:\n\n📋 *Quotation #:* ${quotation.quotationNumber}\n📍 *Destination:* ${quotation.destination}\n🗓 *Travel Dates:* ${dates}\n👥 *Guests:* ${quotation.adults} Adults${quotation.children > 0 ? `, ${quotation.children} Children` : ''}\n🚗 *Cab / Transport:* ${quotation.cabDetails || quotation.transport || 'Dedicated AC Vehicle'}\n💰 *Total Amount:* ₹${Number(quotation.finalAmount).toLocaleString('en-IN')}\n\nPlease review the details and let us know if you would like to confirm your booking.\n\nWarm regards,\n*Ooting Team*`;
              const url = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(text)}`;
              window.open(url, '_blank');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Send on WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Branded Official Quotation Document Canvas */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden print:border-none print:shadow-none print:rounded-none">
        {/* Authentic Header Wave Accent */}
        <div className="w-full h-8 overflow-hidden bg-brand-600 relative">
          <img
            src="/assets/ooting-header-wave.png"
            alt=""
            className="w-full h-full object-cover opacity-80"
          />
        </div>

        <div className="p-8 sm:p-10 space-y-8">
          {/* Header Row with Official Ooting Logo & Quotation Title */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 pb-6 border-b border-slate-200">
            <div>
              <div className="w-36 h-14 mb-2 flex items-center">
                <img
                  src="/assets/ooting-logo.jpg"
                  alt="Ooting Logo"
                  className="h-full w-auto object-contain"
                />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {company?.address || 'Bangalore, Karnataka, India'}
              </p>
              <p className="text-[11px] text-slate-500">
                Email: {company?.email || 'contact@ooting.com'} • Phone: {company?.phone || '+91 98765 43210'}
              </p>
              {company?.gstin && (
                <p className="text-[11px] text-slate-500">GSTIN: {company.gstin}</p>
              )}
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs font-bold uppercase tracking-widest text-brand-600 block">
                Travel Itinerary & Quotation
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                {quotation.quotationNumber}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Date: {new Date(quotation.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <div className="mt-2 inline-block">
                <Badge status={quotation.status} />
              </div>
            </div>
          </div>

          {/* Client Details & Travel Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50/80 p-5 rounded-xl border border-slate-200/70 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Prepared For
              </span>
              <h3 className="text-sm font-bold text-slate-900">{quotation.customer?.fullName}</h3>
              <p className="text-slate-600 mt-1">{quotation.customer?.phone}</p>
              {quotation.customer?.email && <p className="text-slate-600">{quotation.customer.email}</p>}
              {quotation.customer?.city && <p className="text-slate-600">{quotation.customer.city}</p>}
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Trip Details
              </span>
              <div className="flex justify-between">
                <span className="text-slate-500">Destination:</span>
                <span className="font-semibold text-slate-800">{quotation.destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Package:</span>
                <span className="font-semibold text-slate-800">
                  {quotation.package?.packageName || 'Customized Holiday'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Travellers:</span>
                <span className="font-semibold text-slate-800">
                  {quotation.adults} Adults {quotation.children > 0 ? `, ${quotation.children} Children` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dates:</span>
                <span className="font-semibold text-slate-800">
                  {quotation.travelStartDate ? new Date(quotation.travelStartDate).toLocaleDateString() : 'TBD'} to{' '}
                  {quotation.travelEndDate ? new Date(quotation.travelEndDate).toLocaleDateString() : 'TBD'}
                </span>
              </div>
            </div>
          </div>

          {/* Inclusions & Highlights Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="font-bold text-slate-800 block mb-1 text-[11px] uppercase tracking-wide">
                Accommodation
              </span>
              <p className="text-slate-600">{quotation.accommodation || 'Standard Double/Triple Occupancy'}</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="font-bold text-slate-800 block mb-1 text-[11px] uppercase tracking-wide">
                Transport & Cab Details
              </span>
              <p className="text-slate-600">{quotation.cabDetails || quotation.transport || 'Dedicated AC Vehicle for transfers'}</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="font-bold text-slate-800 block mb-1 text-[11px] uppercase tracking-wide">
                Activities
              </span>
              <p className="text-slate-600">{quotation.activities || 'Sightseeing & Excursions as per itinerary'}</p>
            </div>
          </div>

          {/* Day-by-Day Itinerary if package attached */}
          {quotation.package?.itineraries?.length > 0 && (
            <div className="space-y-3 text-xs">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-2">
                Planned Daily Schedule
              </h3>
              <div className="space-y-2.5">
                {quotation.package.itineraries.map((day: any) => (
                  <div key={day.id} className="p-3 bg-slate-50/50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-brand-600">Day {day.dayNumber}:</span>
                      <span className="font-semibold text-slate-900">{day.title}</span>
                    </div>
                    <p className="text-slate-600 mt-1 leading-relaxed">{day.description}</p>
                    {day.places && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        <span className="font-medium">Sightseeing:</span> {day.places}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inclusions & Exclusions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div>
              <h4 className="font-bold text-emerald-800 uppercase tracking-wider mb-2 text-[11px]">
                Inclusions
              </h4>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line bg-emerald-50/40 p-3 rounded-xl border border-emerald-200/60">
                {quotation.inclusions || 'Hotel stay, Breakfast, Transfers'}
              </p>
            </div>
            <div>
              <h4 className="font-bold text-rose-800 uppercase tracking-wider mb-2 text-[11px]">
                Exclusions
              </h4>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line bg-rose-50/40 p-3 rounded-xl border border-rose-200/60">
                {quotation.exclusions || 'Personal expenses, items not mentioned'}
              </p>
            </div>
          </div>

          {/* Pricing Summary Box */}
          <div className="flex justify-end pt-4 border-t border-slate-200">
            <div className="w-full sm:w-80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Base Package Cost:</span>
                <span className="font-medium">₹{Number(quotation.basePrice).toLocaleString('en-IN')}</span>
              </div>
              {quotation.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Special Discount:</span>
                  <span className="font-medium">- ₹{Number(quotation.discount).toLocaleString('en-IN')}</span>
                </div>
              )}
              {quotation.tax > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Taxes / GST:</span>
                  <span className="font-medium">+ ₹{Number(quotation.tax).toLocaleString('en-IN')}</span>
                </div>
              )}
              {Number(quotation.additionalCharges || 0) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Additional Charges:</span>
                  <span className="font-medium">+ ₹{Number(quotation.additionalCharges).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2.5 border-t border-slate-200 text-sm">
                <span className="font-bold text-slate-900">Total Net Amount:</span>
                <span className="font-extrabold text-brand-600 text-lg">
                  ₹{Number(quotation.finalAmount).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Payment & Cancellation Policies */}
          {(quotation.paymentTerms || quotation.cancellationTerms) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200 text-[11px]">
              {quotation.paymentTerms && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                  <span className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Payment Milestones
                  </span>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-line">{quotation.paymentTerms}</p>
                </div>
              )}
              {quotation.cancellationTerms && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                  <span className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Cancellation Policy
                  </span>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-line">{quotation.cancellationTerms}</p>
                </div>
              )}
            </div>
          )}

          {/* Terms & Conditions */}
          {quotation.termsAndConditions && (
            <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
              <span className="font-bold text-slate-700 uppercase tracking-wider block">
                Terms & Conditions
              </span>
              <p className="whitespace-pre-line leading-relaxed">{quotation.termsAndConditions}</p>
            </div>
          )}
        </div>

        {/* Authentic Footer Wave Accent */}
        <div className="w-full h-6 overflow-hidden bg-brand-600 relative mt-4">
          <img
            src="/assets/ooting-footer-wave.png"
            alt=""
            className="w-full h-full object-cover opacity-80"
          />
        </div>
      </div>
    </div>
  );
};
