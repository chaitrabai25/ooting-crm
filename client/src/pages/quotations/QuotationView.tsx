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
  Globe,
  FileText,
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
        title: `Travel Quotation — ${quotation.quotationNumber}`,
        onePageOnly: false,
        margin: 8,
      });
      download();
    } catch (err) {
      console.error('Failed to generate Quotation PDF:', err);
      alert('Could not generate PDF. Please try the Print button.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!quotation) return;
    try {
      setIsGeneratingPdf(true);
      const filename = `Quotation-${quotation.quotationNumber}.pdf`;
      const { download, pdfBlob } = await generateA4Pdf({
        elementId: 'quotation-document',
        filename,
        title: `Travel Quotation — ${quotation.quotationNumber}`,
        onePageOnly: false,
        margin: 8,
      });

      const phoneDigits = quotation.customer?.phone?.replace(/\D/g, '') || '';
      const dates = quotation.travelStartDate
        ? `${new Date(quotation.travelStartDate).toLocaleDateString('en-IN')} to ${quotation.travelEndDate ? new Date(quotation.travelEndDate).toLocaleDateString('en-IN') : 'TBD'}`
        : 'TBD';

      const messageText =
        `Hello *${quotation.customer?.fullName || 'Valued Client'}*,\n\n` +
        `Here is your travel quotation from *Ooting - Journeys Beyond Ordinary*:\n\n` +
        `📋 *Quotation #:* ${quotation.quotationNumber}\n` +
        `📍 *Destination:* ${quotation.destination}\n` +
        `🗓 *Travel Dates:* ${dates}\n` +
        `👥 *Guests:* ${quotation.adults} Adults${quotation.children > 0 ? `, ${quotation.children} Children` : ''}\n` +
        `🚗 *Cab / Transport:* ${quotation.cabDetails || quotation.transport || 'Dedicated AC Vehicle'}\n` +
        `💰 *Total Amount:* ₹${Number(quotation.finalAmount).toLocaleString('en-IN')}\n\n` +
        `Please review the attached official Quotation PDF and let us know if you would like to confirm your booking.\n\n` +
        `Warm regards,\n*Ooting Team*`;

      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `Travel Quotation - ${quotation.quotationNumber}`,
          text: messageText,
        });
      } else {
        download();
        const url = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(
          messageText +
          `\n\n📄 Note: The official Travel Quotation PDF has been downloaded to your device. Please attach it here to send.`
        )}`;
        window.open(url, '_blank');
      }
    } catch (err) {
      console.error('WhatsApp quotation share error:', err);
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
            onClick={handleShareWhatsApp}
            disabled={isGeneratingPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            title="Send quotation PDF document directly to customer via WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp PDF</span>
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
        {/* Persistent Red Header Accent Line */}
        <div className="w-full h-1.5 bg-[#C91F28]" />

        {/* Authentic Header Wave Accent */}
        <div
          className="w-full bg-[#C91F28] overflow-hidden relative shrink-0"
          style={{ width: '100%', height: '8px', minHeight: '8px', maxHeight: '8px', backgroundColor: '#C91F28', overflow: 'hidden' }}
        >
          <img
            src="/assets/ooting-header-wave.png"
            alt=""
            className="w-full h-full object-cover opacity-80"
            style={{ width: '100%', height: '8px', objectFit: 'cover' }}
          />
        </div>

        <div className="p-6 sm:p-8 space-y-5 print:p-6 print:space-y-4">
          {/* Header Row with Official Ooting Logo, Quotation Reference & Right-Aligned Company Details */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 pb-5 border-b border-slate-200">
            {/* LEFT SIDE: Brand Logo, Company Title & Quotation Reference */}
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center bg-white p-1 border border-slate-200 shadow-2xs shrink-0"
                style={{ width: '56px', height: '56px', minWidth: '56px', maxWidth: '56px', minHeight: '56px', maxHeight: '56px', overflow: 'hidden' }}
              >
                <img
                  src={company?.logoUrl || '/assets/ooting-logo.jpg'}
                  alt={company?.name || 'Ooting'}
                  className="max-w-full max-h-full object-contain"
                  style={{ width: '100%', height: '100%', maxWidth: '56px', maxHeight: '56px', objectFit: 'contain' }}
                  crossOrigin="anonymous"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/ooting-logo.jpg';
                  }}
                />
              </div>
              <div className="space-y-1">
                <span className="text-xl font-black tracking-tight text-slate-900 block leading-tight uppercase">
                  {(company?.name || 'OOTING').toUpperCase()}
                </span>
                <span className="text-[11px] font-bold text-[#C91F28] uppercase tracking-wide block">
                  {company?.tagline || 'Journeys Beyond Ordinary'}
                </span>
                
                <div className="pt-2">
                  <span className="inline-block px-2.5 py-0.5 bg-[#C91F28] text-white text-[10px] font-bold uppercase tracking-wider rounded-md mb-1">
                    Official Travel Quotation
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-sm font-bold text-slate-900">
                      {quotation.quotationNumber}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Date: {new Date(quotation.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: Company Contact Details (Shifted right 2 tab spaces to align flush with document margin) */}
            <div className="flex justify-end ml-auto shrink-0 translate-x-6 sm:translate-x-8">
              <div className="w-fit ml-auto flex flex-col space-y-1.5 text-xs text-slate-700 max-w-[320px]">
                {company?.website && (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 flex items-center justify-center shrink-0 text-[#C91F28]">
                      <Globe className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
                    </span>
                    <span className="font-medium text-slate-800 tracking-tight break-all">{company.website}</span>
                  </div>
                )}
                {company?.email && (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 flex items-center justify-center shrink-0 text-[#C91F28]">
                      <Mail className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
                    </span>
                    <span className="font-medium text-slate-800 tracking-tight break-all">{company.email}</span>
                  </div>
                )}
                {company?.phone && (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 flex items-center justify-center shrink-0 text-[#C91F28]">
                      <Phone className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
                    </span>
                    <span className="font-medium text-slate-800 tracking-tight">{company.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 flex items-center justify-center shrink-0 text-[#C91F28]">
                    <FileText className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
                  </span>
                  <span className="font-mono font-bold text-slate-900 tracking-tight">
                    GSTIN: {(() => {
                      const g = (company?.gstin || '').trim().toUpperCase();
                      return g && g !== 'NULL' && g !== 'NIL' ? g.replace(/^GSTIN:\s*/i, '') : 'NIL';
                    })()}
                  </span>
                </div>
                {company?.address && (
                  <div className="flex items-start gap-2 pt-0.5">
                    <span className="w-4 h-4 flex items-center justify-center shrink-0 text-[#C91F28] mt-0.5">
                      <MapPin className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
                    </span>
                    <div className="text-slate-600 leading-snug">
                      <div>Ooting 3rd Cross, Malavagoppa, BH Road,</div>
                      <div>Shivamogga, Karnataka, India</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Client Details & Travel Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50/80 p-5 rounded-xl border border-slate-200/70 text-xs">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 block mb-1.5">
                Prepared For
              </span>
              <h3 className="text-sm font-bold text-slate-900">{quotation.customer?.fullName}</h3>
              <p className="text-slate-600 mt-1">{quotation.customer?.phone}</p>
              {quotation.customer?.email && <p className="text-slate-600">{quotation.customer.email}</p>}
              {quotation.customer?.city && <p className="text-slate-600">{quotation.customer.city}</p>}
            </div>

            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 block mb-1.5">
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
              <span className="font-black text-slate-900 block mb-1 text-xs uppercase tracking-wider">
                Accommodation
              </span>
              <p className="text-slate-600">{quotation.accommodation || 'Standard Double/Triple Occupancy'}</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="font-black text-slate-900 block mb-1 text-xs uppercase tracking-wider">
                Transport & Cab Details
              </span>
              <p className="text-slate-600">{quotation.cabDetails || quotation.transport || 'Dedicated AC Vehicle for transfers'}</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
              <span className="font-black text-slate-900 block mb-1 text-xs uppercase tracking-wider">
                Activities
              </span>
              <p className="text-slate-600">{quotation.activities || 'Sightseeing & Excursions as per itinerary'}</p>
            </div>
          </div>

          {/* Day-by-Day Itinerary if package attached */}
          {quotation.package?.itineraries?.length > 0 && (
            <div className="space-y-3 text-xs">
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider border-b border-slate-200 pb-2">
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
              <h4 className="font-black text-emerald-900 uppercase tracking-wider mb-2 text-xs">
                Inclusions
              </h4>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line bg-emerald-50/40 p-3 rounded-xl border border-emerald-200/60">
                {quotation.inclusions || 'Hotel stay, Breakfast, Transfers'}
              </p>
            </div>
            <div>
              <h4 className="font-black text-rose-900 uppercase tracking-wider mb-2 text-xs">
                Exclusions
              </h4>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line bg-rose-50/40 p-3 rounded-xl border border-rose-200/60">
                {quotation.exclusions || 'Personal expenses, items not mentioned'}
              </p>
            </div>
          </div>

          {/* Transparent 4-Column Pricing Table */}
          <div className="pt-4 border-t border-slate-200">
            <span className="font-black text-slate-900 uppercase tracking-wider text-xs block mb-3">
              Cost Calculation & Passenger Breakdown
            </span>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-2.5 px-3.5 font-bold text-slate-900">Category</th>
                    <th className="py-2.5 px-3.5 font-bold text-slate-900">Price / Person</th>
                    <th className="py-2.5 px-3.5 font-bold text-slate-900 text-center">Quantity</th>
                    <th className="py-2.5 px-3.5 font-bold text-slate-900 text-right">Total</th>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200 text-[11px] break-inside-avoid">
              {quotation.paymentTerms && (
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                  <span className="font-black text-slate-900 uppercase tracking-wider block mb-1 text-xs">
                    Payment Milestones
                  </span>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-line">{quotation.paymentTerms}</p>
                </div>
              )}
              {quotation.cancellationTerms && (
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                  <span className="font-black text-slate-900 uppercase tracking-wider block mb-1 text-xs">
                    Cancellation Policy
                  </span>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-line">{quotation.cancellationTerms}</p>
                </div>
              )}
            </div>
          )}

          {/* Official Bank & Remittance Details from Settings (Auto-populated for Advance / Milestone Payments) */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 break-inside-avoid page-break-avoid">
            <span className="font-black text-slate-900 uppercase tracking-wider block text-xs">
              Bank & Remittance Details (For Advance & Milestone Payments)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] text-slate-700">
              <div>
                <span className="text-slate-500 block text-[10px]">Beneficiary Name</span>
                <span className="font-bold text-slate-900">{company?.accountHolderName || company?.name || 'Jeevan'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Bank Name</span>
                <span className="font-semibold text-slate-800">{company?.bankName || 'Canara Bank'}</span>
              </div>
              {company?.accountNumber && (
                <div>
                  <span className="text-slate-500 block text-[10px]">Account Number</span>
                  <span className="font-mono font-bold text-slate-900">{company.accountNumber}</span>
                </div>
              )}
              {company?.ifsc && (
                <div>
                  <span className="text-slate-500 block text-[10px]">IFSC Code</span>
                  <span className="font-mono font-bold text-slate-900 uppercase">{company.ifsc}</span>
                </div>
              )}
              {company?.branch && (
                <div>
                  <span className="text-slate-500 block text-[10px]">Branch</span>
                  <span className="font-medium text-slate-800">{company.branch}</span>
                </div>
              )}
              {company?.accountType && (
                <div>
                  <span className="text-slate-500 block text-[10px]">Account Type</span>
                  <span className="font-medium text-slate-800">{company.accountType}</span>
                </div>
              )}
              {company?.upiId && (
                <div>
                  <span className="text-slate-500 block text-[10px]">UPI ID / VPA</span>
                  <span className="font-mono font-bold text-[#C91F28]">{company.upiId}</span>
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-200/80">
              {company?.paymentNotes || `Please quote Quotation Ref ${quotation.quotationNumber} during bank fund transfer.`}
            </p>
          </div>

          {/* Terms & Conditions */}
          {quotation.termsAndConditions && (
            <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-500 space-y-1 break-inside-avoid page-break-avoid">
              <span className="font-black text-slate-900 uppercase tracking-wider block text-xs">
                Terms & Conditions
              </span>
              <p className="whitespace-pre-line leading-relaxed">{quotation.termsAndConditions}</p>
            </div>
          )}

          {/* Professional Document Closure */}
          <div className="pt-2 text-center text-[10px] text-slate-400 break-inside-avoid">
            <p>Thank you for choosing {company?.name || 'Ooting'}. For reservations & inquiries, reach us at {company?.email || 'support@ooting.in'} or {company?.phone || '+91 8884845595'}.</p>
          </div>
        </div>

        {/* Persistent Red Footer Line */}
        <div className="w-full h-1 bg-[#C91F28]" />

        {/* Authentic Footer Wave Accent */}
        <div
          className="w-full bg-[#C91F28] overflow-hidden relative shrink-0"
          style={{ width: '100%', height: '8px', minHeight: '8px', maxHeight: '8px', backgroundColor: '#C91F28', overflow: 'hidden' }}
        >
          <img
            src="/assets/ooting-footer-wave.png"
            alt=""
            className="w-full h-full object-cover opacity-80"
            style={{ width: '100%', height: '8px', objectFit: 'cover' }}
          />
        </div>
      </div>
    </div>
  );
};
