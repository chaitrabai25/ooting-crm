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
  Download,
  Loader2,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.js';
import { generateA4Pdf } from '../../utils/pdfGenerator.js';

export const QuotationView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [quotation, setQuotation] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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
    document.body.classList.add('printing-dedicated');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-dedicated');
    }, 1000);
  };

  const handleDownloadPdf = async () => {
    if (!quotation) return;
    try {
      setIsGeneratingPdf(true);
      const { download } = await generateA4Pdf({
        elementId: 'quotation-document',
        filename: `Quotation-${quotation.quotationNumber}.pdf`,
        onePageOnly: false,
      });
      download();
    } catch (err) {
      console.error('Failed to generate Quotation PDF:', err);
      alert('Could not generate PDF. Please try the Print button.');
    } finally {
      setIsGeneratingPdf(false);
    }
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
    <div className="space-y-6 pb-16 max-w-4xl mx-auto print:max-w-none print:w-full print:p-0 print:m-0 print:space-y-0 print:pb-0">
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
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Download PDF</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Branded Official Quotation Document Canvas */}
      <div
        id="quotation-document"
        className="bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden print:border-none print:shadow-none print:rounded-none"
      >
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
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="w-36 h-14 flex items-center justify-start flex-shrink-0">
                <img
                  src="/assets/ooting-logo.jpg"
                  alt="Ooting Logo"
                  className="h-full w-auto object-contain"
                />
              </div>
              <div className="border-l-0 sm:border-l sm:border-slate-200 sm:pl-4 space-y-1">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  {company?.name || 'OOTING JOURNEYS'}
                </h3>
                <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                  <span>{company?.address || 'Bangalore, Karnataka, India'}</span>
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                    <span>{company?.email || 'contact@ooting.com'}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                    <span>{company?.phone || '+91 98765 43210'}</span>
                  </span>
                </div>
                {company?.gstin && (
                  <p className="text-[11px] text-slate-500 font-medium">
                    GSTIN: <span className="font-semibold text-slate-800">{company.gstin}</span>
                  </p>
                )}
              </div>
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

          {/* Transparent 4-Column Pricing Table */}
          <div className="pt-4 border-t border-slate-200">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block mb-3">
              Cost Calculation & Passenger Breakdown
            </span>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-2.5 px-3.5 font-semibold text-slate-700">Category</th>
                    <th className="py-2.5 px-3.5 font-semibold text-slate-700">Price / Person</th>
                    <th className="py-2.5 px-3.5 font-semibold text-slate-700 text-center">Quantity</th>
                    <th className="py-2.5 px-3.5 font-semibold text-slate-700 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Adults */}
                  <tr>
                    <td className="py-2.5 px-3.5 font-medium text-slate-800">
                      <div className="font-semibold">Adults</div>
                      <span className="text-[10px] text-slate-400">Base package rate per adult</span>
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-600">
                      ₹{Number(quotation.adultUnitPrice || (quotation.adults ? Math.round(quotation.basePrice / quotation.adults) : quotation.basePrice)).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3.5 text-center text-slate-700 font-semibold">{quotation.adults || 1}</td>
                    <td className="py-2.5 px-3.5 text-right font-bold text-slate-900">
                      ₹{((quotation.adults || 1) * Number(quotation.adultUnitPrice || (quotation.adults ? Math.round(quotation.basePrice / quotation.adults) : quotation.basePrice))).toLocaleString('en-IN')}
                    </td>
                  </tr>

                  {/* Children */}
                  {(Number(quotation.children || 0) > 0 || Number(quotation.childUnitPrice || 0) > 0) && (
                    <tr>
                      <td className="py-2.5 px-3.5 font-medium text-slate-800">
                        <div className="font-semibold">Children</div>
                        <span className="text-[10px] text-slate-400">Child rate per person</span>
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600">
                        ₹{Number(quotation.childUnitPrice || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3.5 text-center text-slate-700 font-semibold">{quotation.children || 0}</td>
                      <td className="py-2.5 px-3.5 text-right font-bold text-slate-900">
                        ₹{(Number(quotation.children || 0) * Number(quotation.childUnitPrice || 0)).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  )}

                  {/* Infants */}
                  {(Number(quotation.infants || 0) > 0 || Number(quotation.infantUnitPrice || 0) > 0) && (
                    <tr>
                      <td className="py-2.5 px-3.5 font-medium text-slate-800">
                        <div className="font-semibold">Infants</div>
                        <span className="text-[10px] text-slate-400">Infant rate per person</span>
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600">
                        ₹{Number(quotation.infantUnitPrice || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3.5 text-center text-slate-700 font-semibold">{quotation.infants || 0}</td>
                      <td className="py-2.5 px-3.5 text-right font-bold text-slate-900">
                        ₹{(Number(quotation.infants || 0) * Number(quotation.infantUnitPrice || 0)).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Subtotal, Discount, Tax, Addl, Grand Total Summary */}
              <div className="bg-slate-50/80 p-4 border-t border-slate-200 text-xs space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span className="font-medium">Subtotal (Base Total):</span>
                  <span className="font-semibold text-slate-800">
                    ₹{Number(quotation.basePrice).toLocaleString('en-IN')}
                  </span>
                </div>
                {Number(quotation.discount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Special Discount:</span>
                    <span className="font-semibold">- ₹{Number(quotation.discount).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {Number(quotation.tax || 0) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>GST / Taxes:</span>
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
                  <span className="font-bold text-slate-900">Net Total Amount:</span>
                  <span className="font-extrabold text-brand-600 text-lg">
                    ₹{Number(quotation.finalAmount).toLocaleString('en-IN')}
                  </span>
                </div>
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
