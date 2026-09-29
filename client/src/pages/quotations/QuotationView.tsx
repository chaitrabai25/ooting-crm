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
import { printElement } from '../../utils/printDocument.js';
import { BrandLoader } from '../../components/ui/BrandLoader.js';

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

  const handlePrint = async () => {
    if (!quotation) return;
    await printElement('quotation-document', {
      title: `Quotation_${quotation.quotationNumber}`,
    });
  };

  const handleDownloadPdf = async () => {
    if (!quotation) return;
    try {
      setIsGeneratingPdf(true);
      const { download } = await generateA4Pdf({
        elementId: 'quotation-document',
        filename: `Quotation-${quotation.quotationNumber}.pdf`,
        title: `Travel Quotation — ${quotation.quotationNumber}`,
        onePageOnly: true,
        margin: 8,
      });
      await download();
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
      <div className="flex items-center justify-center min-h-[60vh] max-w-4xl mx-auto">
        <BrandLoader size="lg" text="Loading Quotation..." subtext="Retrieving official travel quotation" />
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
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                {quotation.quotationNumber}
              </h1>
              <Badge status={quotation.status} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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

      {/* Branded Official Quotation Document Canvas (Guaranteed 1-Page A4 Fit) */}
      <div
        id="quotation-document"
        className="w-[794px] max-w-[794px] h-[1050px] max-h-[1050px] mx-auto bg-white flex flex-col text-slate-800 font-serif shadow-xl rounded-2xl overflow-hidden border border-slate-200 print:shadow-none print:rounded-none print:border-none print:m-0 print:w-full print:max-w-full print:h-[280mm] print:max-h-[280mm] print:overflow-hidden"
        style={{
          width: '794px',
          maxWidth: '794px',
          minWidth: '794px',
          height: '1050px',
          maxHeight: '1050px',
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Top Header Wave Accent */}
        <div
          className="w-full bg-[#C91F28] overflow-hidden relative shrink-0"
          style={{ width: '100%', height: '8px', minHeight: '8px', maxHeight: '8px', backgroundColor: '#C91F28', overflow: 'hidden' }}
        >
          <img
            src="/assets/ooting-header-wave.png"
            alt=""
            className="w-full h-full object-cover opacity-90"
            style={{ width: '100%', height: '8px', objectFit: 'cover' }}
          />
        </div>

        {/* Letterhead Header Section */}
        <div className="px-8 pt-3.5 pb-2.5 border-b border-slate-200">
          <div className="flex justify-between items-start gap-4">
            {/* LEFT SIDE: Brand Logo, Company Identity & Quotation Meta */}
            <div className="flex items-start gap-3">
              <div
                className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center bg-white p-1 border border-slate-200 shadow-2xs shrink-0"
                style={{ width: '48px', height: '48px', minWidth: '48px', maxWidth: '48px', minHeight: '48px', maxHeight: '48px', overflow: 'hidden' }}
              >
                <img
                  src={company?.logoUrl || '/assets/ooting-logo.jpg'}
                  alt={company?.name || 'Ooting'}
                  className="max-w-full max-h-full object-contain"
                  style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  crossOrigin="anonymous"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/ooting-logo.jpg';
                  }}
                />
              </div>
              <div className="min-w-0">
                <span className="text-base font-black tracking-tight text-slate-900 block leading-tight uppercase">
                  {(company?.name || 'OOTING').toUpperCase()}
                </span>
                <span className="text-[10px] font-bold text-[#C91F28] uppercase tracking-wide block mt-0.5">
                  {company?.tagline || 'Journeys Beyond Ordinary'}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-block px-2 py-0.5 bg-[#C91F28] text-white text-[9px] font-bold uppercase tracking-wider rounded">
                    Official Quotation
                  </span>
                  <span className="font-bold text-xs text-slate-900">
                    {quotation.quotationNumber}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    • Date: {new Date(quotation.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: Company Contact Details with clean sheet margin */}
            <div className="w-fit ml-auto shrink-0 flex flex-col space-y-1 text-xs text-slate-700 max-w-[320px]">
              {company?.website && (
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0 text-[#C91F28]">
                    <Globe className="w-3 h-3" />
                  </span>
                  <span className="font-medium text-[11px] text-slate-800 break-all">{company.website}</span>
                </div>
              )}
              {company?.email && (
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0 text-[#C91F28]">
                    <Mail className="w-3 h-3" />
                  </span>
                  <span className="font-medium text-[11px] text-slate-800 break-all">{company.email}</span>
                </div>
              )}
              {company?.phone && (
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0 text-[#C91F28]">
                    <Phone className="w-3 h-3" />
                  </span>
                  <span className="font-medium text-[11px] text-slate-800">{company.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0 text-[#C91F28]">
                  <FileText className="w-3 h-3" />
                </span>
                <span className="font-bold text-[11px] text-slate-900">
                  GSTIN: {(() => {
                    const g = (company?.gstin || '').trim().toUpperCase();
                    return g && g !== 'NULL' && g !== 'NIL' ? g.replace(/^GSTIN:\s*/i, '') : 'NIL';
                  })()}
                </span>
              </div>
              {company?.address && (
                <div className="flex items-start gap-2 pt-0.5">
                  <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0 text-[#C91F28] mt-0.5">
                    <MapPin className="w-3 h-3" />
                  </span>
                  <div className="text-[10px] text-slate-600 leading-snug">
                    <div>Ooting 3rd Cross, Malavagoppa, BH Road,</div>
                    <div>Shivamogga, Karnataka, India</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Body (Balanced for Strict 1-Page Height without huge empty gaps) */}
        <div className="flex-1 px-8 py-3.5 flex flex-col justify-start space-y-3.5 text-xs">
          {/* Row 1: Client & Journey Summary Grid */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50/80 rounded-lg border border-slate-200/80">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 block mb-1">
                Prepared For (Client Details)
              </span>
              <p className="font-bold text-slate-900 text-xs">{quotation.customer?.fullName}</p>
              <div className="space-y-0.5 mt-0.5 text-[11px] text-slate-600">
                {quotation.customer?.phone && <p>Phone: {quotation.customer.phone}</p>}
                {quotation.customer?.email && <p>Email: {quotation.customer.email}</p>}
                {quotation.customer?.city && (
                  <p>Location: {quotation.customer.city}{quotation.customer?.state ? `, ${quotation.customer.state}` : ''}</p>
                )}
              </div>
            </div>

            <div className="space-y-0.5 text-[11px]">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 block mb-1">
                Tour & Package Overview
              </span>
              <div className="flex justify-between">
                <span className="text-slate-500">Destination:</span>
                <span className="font-bold text-slate-900">{quotation.destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Package:</span>
                <span className="font-semibold text-slate-800">{quotation.package?.packageName || 'Custom Holiday Itinerary'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Travellers:</span>
                <span className="font-bold text-slate-900">
                  {quotation.adults} Adults{quotation.children > 0 ? `, ${quotation.children} Children` : ''}{quotation.infants > 0 ? `, ${quotation.infants} Infants` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Travel Dates:</span>
                <span className="font-semibold text-slate-900">
                  {quotation.travelStartDate ? new Date(quotation.travelStartDate).toLocaleDateString('en-IN') : 'TBD'} to{' '}
                  {quotation.travelEndDate ? new Date(quotation.travelEndDate).toLocaleDateString('en-IN') : 'TBD'}
                </span>
              </div>
            </div>
          </div>

          {/* Row 2: Inclusions & Highlights Strip */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80">
              <span className="font-bold text-slate-900 block text-[10.5px] uppercase tracking-wide">
                Accommodation
              </span>
              <p className="text-[10.5px] text-slate-600 mt-0.5 leading-snug">
                {quotation.accommodation || 'Standard Double/Triple Occupancy Hotel/Resort'}
              </p>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80">
              <span className="font-bold text-slate-900 block text-[10.5px] uppercase tracking-wide">
                Vehicle & Transfers
              </span>
              <p className="text-[10.5px] text-slate-600 mt-0.5 leading-snug">
                {quotation.cabDetails || quotation.transport || 'Dedicated AC Tourist Vehicle for all transfers'}
              </p>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80">
              <span className="font-bold text-slate-900 block text-[10.5px] uppercase tracking-wide">
                Activities & Sightseeing
              </span>
              <p className="text-[10.5px] text-slate-600 mt-0.5 leading-snug">
                {quotation.activities || 'All key sightseeing & local excursions included'}
              </p>
            </div>
          </div>

          {/* Inclusions & Exclusions Split Banner */}
          <div className="grid grid-cols-2 gap-2.5 text-[10.5px]">
            <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-200/70">
              <span className="font-black text-emerald-950 uppercase tracking-wide block mb-0.5 text-[10px]">
                Inclusions
              </span>
              <p className="text-slate-700 leading-snug whitespace-pre-line">
                {quotation.inclusions || 'Hotel accommodation, Breakfast, Dedicated vehicle, Sightseeing arrangements, Tolls & driver charges.'}
              </p>
            </div>
            <div className="bg-rose-50/40 p-2 rounded-lg border border-rose-200/60">
              <span className="font-black text-rose-950 uppercase tracking-wide block mb-0.5 text-[10px]">
                Exclusions
              </span>
              <p className="text-slate-700 leading-snug whitespace-pre-line">
                {quotation.exclusions || 'Personal expenses, entry tickets/camera fees not specified, room service, items not listed in inclusions.'}
              </p>
            </div>
          </div>

          {/* Row 3: Transparent Pricing & Passenger Cost Calculation */}
          <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                  <th className="py-1.5 px-3 text-[10px] font-black uppercase tracking-wider">Passenger Category</th>
                  <th className="py-1.5 px-3 text-[10px] font-black uppercase tracking-wider text-center">Travellers / Qty</th>
                  <th className="py-1.5 px-3 text-[10px] font-black uppercase tracking-wider text-right">Rate / Person (₹)</th>
                  <th className="py-1.5 px-3 text-[10px] font-black uppercase tracking-wider text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                <tr>
                  <td className="py-1.5 px-3">
                    <span className="font-bold text-slate-900 block">Adults</span>
                    <span className="text-[10px] text-slate-400">Base package rate per adult</span>
                  </td>
                  <td className="py-1.5 px-3 text-center font-semibold text-slate-800">{quotation.adults || 1}</td>
                  <td className="py-1.5 px-3 text-right text-slate-700">
                    ₹{Number(quotation.adultUnitPrice || (quotation.adults ? Math.round(quotation.basePrice / quotation.adults) : quotation.basePrice)).toLocaleString('en-IN')}
                  </td>
                  <td className="py-1.5 px-3 text-right font-bold text-slate-900">
                    ₹{((quotation.adults || 1) * Number(quotation.adultUnitPrice || (quotation.adults ? Math.round(quotation.basePrice / quotation.adults) : quotation.basePrice))).toLocaleString('en-IN')}
                  </td>
                </tr>

                {(Number(quotation.children || 0) > 0 || Number(quotation.childUnitPrice || 0) > 0) && (
                  <tr>
                    <td className="py-1 px-3">
                      <span className="font-semibold text-slate-800">Children</span>
                    </td>
                    <td className="py-1 px-3 text-center text-slate-700">{quotation.children || 0}</td>
                    <td className="py-1 px-3 text-right text-slate-600">₹{Number(quotation.childUnitPrice || 0).toLocaleString('en-IN')}</td>
                    <td className="py-1 px-3 text-right font-bold text-slate-900">
                      ₹{(Number(quotation.children || 0) * Number(quotation.childUnitPrice || 0)).toLocaleString('en-IN')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Financial Summary & Net Total Banner */}
            <div className="bg-slate-50/90 px-3 py-1.5 border-t border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-4 text-[11px] text-slate-600">
                <span>Subtotal: <strong className="text-slate-900">₹{Number(quotation.basePrice).toLocaleString('en-IN')}</strong></span>
                {Number(quotation.discount || 0) > 0 && (
                  <span className="text-emerald-700">Discount: -₹{Number(quotation.discount).toLocaleString('en-IN')}</span>
                )}
                {Number(quotation.tax || 0) > 0 && (
                  <span>Taxes: +₹{Number(quotation.tax).toLocaleString('en-IN')}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase font-bold text-slate-700">Total Net Amount:</span>
                <span className="text-sm font-black text-[#C91F28]">
                  ₹{Number(quotation.finalAmount).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Row 4: Bank Remittance Details (Left) & Payment Milestones / Policy (Right) */}
          <div className="grid grid-cols-2 gap-3.5">
            {/* Bank Details */}
            <div className="p-3 rounded-xl bg-slate-50/90 border border-slate-200 text-[10.5px] space-y-1.5 shadow-2xs">
              <span className="text-[10.5px] font-black text-slate-900 uppercase tracking-wider block">
                Bank & Remittance Details (Official Account)
              </span>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-slate-600">
                <div><span className="text-slate-500">Beneficiary:</span> <strong className="text-slate-900">{company?.accountHolderName || company?.name || 'Jeevan'}</strong></div>
                <div><span className="text-slate-500">Bank:</span> <strong className="text-slate-900">{company?.bankName || 'Canara Bank'}</strong></div>
                <div><span className="text-slate-500">A/C No:</span> <span className="font-bold text-slate-900">{company?.accountNumber || '2891101013983'}</span></div>
                <div><span className="text-slate-500">IFSC:</span> <span className="font-bold text-slate-900">{company?.ifsc || 'CNRB0005237'}</span></div>
                <div><span className="text-slate-500">Type:</span> <span className="text-slate-800">{company?.accountType || 'Current Account'}</span></div>
                {company?.upiId && (
                  <div><span className="text-slate-500">UPI:</span> <strong className="text-[#C91F28]">{company.upiId}</strong></div>
                )}
              </div>
              <p className="text-[9.5px] text-slate-500 pt-1 border-t border-slate-200">
                Quote Quotation Ref <strong>{quotation.quotationNumber}</strong> during bank transfer.
              </p>
            </div>

            {/* Payment Milestones & Verification Note */}
            <div className="p-3 rounded-xl bg-slate-50/90 border border-slate-200 text-[10.5px] flex flex-col justify-between space-y-1.5 shadow-2xs">
              <div>
                <span className="text-[10.5px] font-black text-slate-900 uppercase tracking-wider block mb-1">
                  Payment Milestones & Policy
                </span>
                <p className="text-slate-700 leading-snug">
                  {quotation.paymentTerms || '50% advance for booking confirmation, balance payable prior to trip departure.'}
                </p>
                {quotation.cancellationTerms && (
                  <p className="text-slate-600 text-[10px] mt-1 leading-snug">
                    {quotation.cancellationTerms}
                  </p>
                )}
              </div>
              <div className="pt-1.5 border-t border-slate-200 text-center text-[9.5px] text-slate-500">
                Official quotation generated by {company?.name || 'Ooting'} CRM. Valid without physical signature.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer Wave Accent */}
        <div
          className="w-full bg-[#C91F28] overflow-hidden relative shrink-0"
          style={{ width: '100%', height: '8px', minHeight: '8px', maxHeight: '8px', backgroundColor: '#C91F28', overflow: 'hidden' }}
        >
          <img
            src="/assets/ooting-header-wave.png"
            alt=""
            className="w-full h-full object-cover opacity-90 rotate-180"
            style={{ width: '100%', height: '8px', objectFit: 'cover', transform: 'rotate(180deg)' }}
          />
        </div>
      </div>
    </div>
  );
};
