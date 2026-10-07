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
  Building2,
  Car,
  Compass,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.js';
import { generateA4Pdf } from '../../utils/pdfGenerator.js';
import { printElement } from '../../utils/printDocument.js';
import { BrandLoader } from '../../components/ui/BrandLoader.js';
import { confirmAction, notifyError, notifySuccess } from '../../utils/sweetalert.js';

const parseListItems = (text: string | undefined | null, fallback: string[]): string[] => {
  if (!text || !text.trim()) return fallback;
  if (text.includes('\n')) {
    const lines = text.split('\n').map(s => s.replace(/^[-•*✓✕x\s]+/, '').trim()).filter(Boolean);
    if (lines.length > 0) return lines;
  }
  const items = text.split(',').map(s => s.trim()).filter(Boolean);
  return items.length > 0 ? items : fallback;
};

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
      notifyError('PDF Generation Notice', 'Could not generate PDF directly. Please use the Print button to export as PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!quotation) return;

    // Normalize phone number to international format (India: +91)
    const rawPhone = quotation.customer?.phone || quotation.lead?.phone || '';
    const digits = rawPhone.replace(/\D/g, '');
    let formattedPhone = digits;
    if (digits.length === 10) {
      formattedPhone = `91${digits}`;
    } else if (digits.length === 11 && digits.startsWith('0')) {
      formattedPhone = `91${digits.slice(1)}`;
    }

    const dates = quotation.travelStartDate
      ? `${new Date(quotation.travelStartDate).toLocaleDateString('en-IN')} to ${quotation.travelEndDate ? new Date(quotation.travelEndDate).toLocaleDateString('en-IN') : 'TBD'}`
      : 'TBD';

    const messageText =
      `Hello *${quotation.customer?.fullName || 'Valued Client'}*,\n\n` +
      `Here is your travel quotation from *${company?.name || 'Ooting'} - ${company?.tagline || 'Journeys Beyond Ordinary'}*:\n\n` +
      `📋 *Quotation #:* ${quotation.quotationNumber}\n` +
      `📍 *Destination:* ${quotation.destination}\n` +
      `🗓 *Travel Dates:* ${dates}\n` +
      `👥 *Guests:* ${quotation.adults} Adults${quotation.children > 0 ? `, ${quotation.children} Children` : ''}\n` +
      `🚗 *Transport:* ${quotation.cabDetails || quotation.transport || 'Dedicated AC Vehicle'}\n` +
      `💰 *Total Amount:* ₹${Number(quotation.finalAmount).toLocaleString('en-IN')}\n\n` +
      `📄 *Your official Quotation PDF has been downloaded to your device.* Please find it attached.\n\n` +
      `Warm regards,\n*${company?.name || 'Ooting'} Tours & Travels*\n${company?.phone ? `📞 ${company.phone}` : ''}`;

    const waUrl = formattedPhone
      ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`
      : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

    // Open WhatsApp synchronously in user click gesture to prevent browser popup blocking
    window.open(waUrl, '_blank');
    showToast('Opening WhatsApp with customer... PDF downloading simultaneously.');

    try {
      setIsGeneratingPdf(true);
      const filename = `Quotation-${quotation.quotationNumber}.pdf`;
      const { download } = await generateA4Pdf({
        elementId: 'quotation-document',
        filename,
        title: `Travel Quotation — ${quotation.quotationNumber}`,
        onePageOnly: true,
        margin: 8,
      });

      // Always download PDF to device
      await download();
    } catch (err) {
      console.error('WhatsApp quotation share error:', err);
      showToast('Failed to generate PDF for WhatsApp share.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const [isApproving, setIsApproving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleApprove = async () => {
    if (!quotation) return;
    const confirmed = await confirmAction({
      title: 'Approve Quotation & Confirm Booking?',
      text: `Are you sure you want to approve Quotation #${quotation.quotationNumber} and create a confirmed booking for ${quotation.customer?.fullName || 'this client'}?`,
      confirmText: 'Yes, Approve & Book',
      cancelText: 'Cancel',
      icon: 'question',
    });
    if (!confirmed) {
      return;
    }

    try {
      setIsApproving(true);
      const res = await api.post(`/quotations/${id}/approve`);
      showToast(res.data.message || 'Quotation approved and booking created successfully!');

      const bookingId = res.data.booking?.id;
      if (bookingId) {
        setTimeout(() => {
          navigate(`/bookings/${bookingId}`);
        }, 1200);
      } else {
        fetchQuotation();
      }
    } catch (err: any) {
      console.error('Failed to approve quotation:', err);
      showToast(err.response?.data?.message || 'Failed to approve quotation.', 'error');
    } finally {
      setIsApproving(false);
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
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`no-print fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-2.5 text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950 dark:text-rose-100 dark:border-rose-800'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

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
          {quotation.status !== 'ACCEPTED' ? (
            <button
              type="button"
              onClick={handleApprove}
              disabled={isApproving}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              title="Approve quotation and create confirmed booking"
            >
              {isApproving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>{isApproving ? 'Approving...' : 'Approve & Confirm Booking'}</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Booking Confirmed</span>
            </span>
          )}

          {quotation.status === 'DRAFT' && (
            <button
              type="button"
              onClick={() => handleStatusUpdate('SENT')}
              className="px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 cursor-pointer"
            >
              Mark Sent
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
        className="w-[794px] max-w-[794px] h-[1050px] max-h-[1050px] mx-auto bg-white flex flex-col justify-between text-slate-800 font-sans antialiased shadow-xl rounded-2xl overflow-hidden border border-slate-200 print:shadow-none print:rounded-none print:border-none print:m-0 print:w-full print:max-w-full print:h-[280mm] print:max-h-[280mm] print:overflow-hidden"
        style={{
          width: '794px',
          maxWidth: '794px',
          minWidth: '794px',
          height: '1050px',
          maxHeight: '1050px',
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
        <div className="px-8 pt-3 pb-2 border-b border-slate-200 shrink-0">
          <div className="flex justify-between items-start gap-4">
            {/* LEFT SIDE: Brand Logo & Company Identity */}
            <div className="flex items-center gap-3">
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
                <span className="text-[10px] font-bold text-[#C91F28] uppercase tracking-wider block mt-0.5">
                  {company?.tagline || 'Journeys Beyond Ordinary'}
                </span>
                <span className="text-[9.5px] text-slate-500 block mt-0.5">
                  Licensed Tour Operator & Destination Specialist
                </span>
              </div>
            </div>

            {/* RIGHT SIDE: Company Contact Details with clean sheet margin */}
            <div className="w-fit ml-auto shrink-0 flex flex-col space-y-0.5 text-xs text-slate-700 max-w-[320px]">
              {company?.website && (
                <div className="flex items-center">
                  <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0 text-[#C91F28] mr-2">
                    <Globe className="w-3 h-3" />
                  </span>
                  <span className="font-semibold text-[11px] text-slate-800 break-all">{company.website}</span>
                </div>
              )}
              {company?.email && (
                <div className="flex items-center">
                  <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0 text-[#C91F28] mr-2">
                    <Mail className="w-3 h-3" />
                  </span>
                  <span className="font-semibold text-[11px] text-slate-800 break-all">{company.email}</span>
                </div>
              )}
              {company?.phone && (
                <div className="flex items-center">
                  <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0 text-[#C91F28] mr-2">
                    <Phone className="w-3 h-3" />
                  </span>
                  <span className="font-semibold text-[11px] text-slate-800">{company.phone}</span>
                </div>
              )}
              <div className="flex items-center">
                <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0 text-[#C91F28] mr-2">
                  <FileText className="w-3 h-3" />
                </span>
                <span className="font-bold text-[11px] text-slate-800">
                  GSTIN: {company?.gstin && company.gstin !== 'NULL' ? company.gstin.replace(/^GSTIN:\s*/i, '') : 'NILL'}
                </span>
              </div>
              {company?.address && (
                <div className="flex items-start pt-0.5">
                  <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0 text-[#C91F28] mt-0.5 mr-2">
                    <MapPin className="w-3 h-3" />
                  </span>
                  <div className="text-[9.5px] font-bold text-slate-800 leading-snug whitespace-pre-line">
                    {company.address}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Official Document Meta Banner */}
        <div
          className="bg-slate-900 text-white px-8 py-2.5 flex items-center justify-between shrink-0 min-h-[44px] h-11"
          style={{ minHeight: '44px', height: '44px', boxSizing: 'border-box' }}
        >
          <div className="flex items-center gap-3">
            <span className="inline-block px-2.5 py-0.5 bg-[#C91F28] text-white text-[10px] font-black uppercase tracking-wider rounded">
              QUOTATION
            </span>
            <span className="font-mono text-xs font-bold text-amber-300 tracking-wide">
              {quotation.quotationNumber}
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center text-xs mr-4">
              <Calendar className="w-3.5 h-3.5 text-amber-400 mr-1.5 shrink-0" />
              <span className="text-[10px] text-slate-400 mr-1">Date:</span>
              <span className="text-[11px] font-bold text-white">
                {new Date(quotation.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>

            <div className="flex items-center text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-400 mr-1.5 shrink-0" />
              <span className="text-[10px] text-slate-400 mr-1">Validity:</span>
              <span className="text-[11px] font-bold text-white">15 Days</span>
            </div>
          </div>
        </div>

        {/* Main Body (Strict 1-Page A4 Height, Perfectly Balanced & Formal) */}
        <div className="flex-1 px-8 py-3 flex flex-col justify-start space-y-3.5 text-xs">
          {/* Row 1: Client & Journey Summary Grid with Vertical Divider Line */}
          <div className="grid grid-cols-2 p-3 bg-slate-50/90 rounded-lg border border-slate-200">
            {/* Left Column: Client Details */}
            <div className="pr-4 border-r border-slate-200">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 block pb-1 mb-1.5 border-b border-slate-200">
                Prepared For (Client Details)
              </span>
              <p className="font-bold text-slate-900 text-xs mb-1.5">{quotation.customer?.fullName || 'Valued Client'}</p>
              <div className="space-y-1.5 text-[11px] text-slate-600">
                {quotation.customer?.phone && (
                  <div className="flex items-center">
                    <Phone className="w-3 h-3 text-[#C91F28] shrink-0 mr-2" />
                    <span className="font-mono text-slate-800 font-medium">{quotation.customer.phone}</span>
                  </div>
                )}
                {quotation.customer?.email && (
                  <div className="flex items-center">
                    <Mail className="w-3 h-3 text-[#C91F28] shrink-0 mr-2" />
                    <span className="text-slate-800 break-all">{quotation.customer.email}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <MapPin className="w-3 h-3 text-[#C91F28] shrink-0 mr-2" />
                  <span className="text-slate-800">
                    {quotation.customer?.city || 'India'}{quotation.customer?.state ? `, ${quotation.customer.state}` : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Tour Specifications */}
            <div className="pl-4 space-y-1 text-[11px]">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 block pb-1 mb-1.5 border-b border-slate-200">
                Tour & Package Specifications
              </span>
              <div className="flex justify-between pb-0.5 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Holiday Package:</span>
                <span className="font-bold text-slate-900 text-right">{quotation.package?.packageName || 'Custom Holiday Itinerary'}</span>
              </div>
              <div className="flex justify-between pb-0.5 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Travel Dates:</span>
                <span className="font-semibold text-slate-900 font-mono text-right">
                  {quotation.travelStartDate ? new Date(quotation.travelStartDate).toLocaleDateString('en-IN') : 'TBD'} to{' '}
                  {quotation.travelEndDate ? new Date(quotation.travelEndDate).toLocaleDateString('en-IN') : 'TBD'}
                </span>
              </div>
              <div className="flex justify-between pb-0.5 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Guests / Travelers:</span>
                <span className="font-bold text-slate-900 text-right">
                  {quotation.adults} Adults{quotation.children > 0 ? `, ${quotation.children} Children` : ''}{quotation.infants > 0 ? `, ${quotation.infants} Infants` : ''}
                </span>
              </div>
              <div className="pt-0.5">
                <span className="text-slate-500 font-medium block text-[10px]">Itinerary Routing:</span>
                <div className="mt-0.5 p-1 bg-white rounded border border-slate-200 text-[10px] font-semibold text-slate-800 leading-tight">
                  {quotation.destination}
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Key Trip Arrangements Strip */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center text-[#C91F28] mb-1">
                <Building2 className="w-3.5 h-3.5 shrink-0 mr-1.5" />
                <span className="font-bold text-[10px] uppercase tracking-wider text-slate-900">
                  Accommodation
                </span>
              </div>
              <p className="text-[10px] text-slate-700 leading-snug">
                {quotation.accommodation || '3-Star / 4-Star Premium Resorts with Breakfast'}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center text-[#C91F28] mb-1">
                <Car className="w-3.5 h-3.5 shrink-0 mr-1.5" />
                <span className="font-bold text-[10px] uppercase tracking-wider text-slate-900">
                  Vehicle & Transfers
                </span>
              </div>
              <p className="text-[10px] text-slate-700 leading-snug">
                {quotation.cabDetails || quotation.transport || 'Dedicated AC Tourist Vehicle for all transfers'}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center text-[#C91F28] mb-1">
                <Compass className="w-3.5 h-3.5 shrink-0 mr-1.5" />
                <span className="font-bold text-[10px] uppercase tracking-wider text-slate-900">
                  Sightseeing & Activities
                </span>
              </div>
              <p className="text-[10px] text-slate-700 leading-snug">
                {quotation.activities || 'All key sightseeing & scenic viewpoint excursions'}
              </p>
            </div>
          </div>

          {/* Row 3: Commercial Package Cost Breakdown (Pricing Table) */}
          <div className="rounded-lg border border-slate-200 overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider">
                    Package Description / Passenger Category
                  </th>
                  <th className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-center w-28">
                    Guests / Qty
                  </th>
                  <th className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-right w-32">
                    Rate / Person (₹)
                  </th>
                  <th className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-right w-32">
                    Amount (₹)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                <tr className="bg-slate-50/40">
                  <td className="py-2 px-3">
                    <span className="font-bold text-slate-900 text-xs block">Adult Package Arrangements</span>
                    <span className="text-[10px] text-slate-500">
                      Resort stay, dedicated vehicle & customized tour logistics
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center font-bold text-slate-800 text-xs">
                    {quotation.adults || 1}
                  </td>
                  <td className="py-2 px-3 text-right font-medium text-slate-700 text-xs tabular-nums font-mono">
                    ₹{Number(quotation.adultUnitPrice || (quotation.adults ? Math.round(quotation.basePrice / quotation.adults) : quotation.basePrice)).toLocaleString('en-IN')}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900 text-xs tabular-nums font-mono">
                    ₹{((quotation.adults || 1) * Number(quotation.adultUnitPrice || (quotation.adults ? Math.round(quotation.basePrice / quotation.adults) : quotation.basePrice))).toLocaleString('en-IN')}
                  </td>
                </tr>

                {(Number(quotation.children || 0) > 0 || Number(quotation.childUnitPrice || 0) > 0) && (
                  <tr>
                    <td className="py-1.5 px-3">
                      <span className="font-semibold text-slate-800 text-xs block">Child Package Arrangements</span>
                      <span className="text-[10px] text-slate-500">Child with bed/sharing as requested</span>
                    </td>
                    <td className="py-1.5 px-3 text-center font-semibold text-slate-700 text-xs">
                      {quotation.children || 0}
                    </td>
                    <td className="py-1.5 px-3 text-right text-slate-700 text-xs tabular-nums font-mono">
                      ₹{Number(quotation.childUnitPrice || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-1.5 px-3 text-right font-bold text-slate-900 text-xs tabular-nums font-mono">
                      ₹{(Number(quotation.children || 0) * Number(quotation.childUnitPrice || 0)).toLocaleString('en-IN')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Financial Summary Strip */}
            <div className="bg-slate-50 px-3.5 py-2 border-t border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-4 text-[11px] text-slate-600">
                <span>Subtotal: <strong className="text-slate-900 font-mono">₹{Number(quotation.basePrice).toLocaleString('en-IN')}</strong></span>
                {Number(quotation.discount || 0) > 0 && (
                  <span className="text-emerald-700 font-semibold font-mono">Discount: -₹{Number(quotation.discount).toLocaleString('en-IN')}</span>
                )}
                {Number(quotation.tax || 0) > 0 && (
                  <span className="font-mono">Taxes/GST: +₹{Number(quotation.tax).toLocaleString('en-IN')}</span>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] uppercase font-black text-slate-800 tracking-wider">
                  Total Net Amount:
                </span>
                <span className="text-base font-black text-[#C91F28] font-mono tabular-nums">
                  ₹{Number(quotation.finalAmount).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Row 4: Package Inclusions & Exclusions (Placed Below Pricing Table) */}
          <div className="grid grid-cols-2 gap-3.5">
            {/* Inclusions */}
            <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-200/80">
              <div className="flex items-center gap-1.5 pb-1 mb-1 border-b border-emerald-200/60">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="font-black text-[10px] uppercase tracking-wider text-emerald-950">
                  Inclusions & Arrangements
                </span>
              </div>
              <ul className="space-y-1">
                {parseListItems(quotation.inclusions, [
                  'Hotel accommodation as per selected category',
                  'Daily breakfast at resort/hotel',
                  'Dedicated AC vehicle for all sightseeing & transfers',
                  'All toll taxes, parking fees, fuel & driver allowances',
                  'Detailed sightseeing itinerary as agreed',
                ]).slice(0, 5).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-[10.5px] text-slate-800 leading-tight">
                    <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Exclusions */}
            <div className="p-2.5 rounded-lg bg-rose-50/40 border border-rose-200/70">
              <div className="flex items-center gap-1.5 pb-1 mb-1 border-b border-rose-200/50">
                <XCircle className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                <span className="font-black text-[10px] uppercase tracking-wider text-rose-950">
                  Exclusions & Extra Charges
                </span>
              </div>
              <ul className="space-y-1">
                {parseListItems(quotation.exclusions, [
                  'Airfare / Train tickets unless explicitly included',
                  'Personal shopping, laundry, phone calls & room service',
                  'Monument entry tickets, camera fees & activities',
                  'Meals other than specified in inclusions',
                  'Any item not explicitly stated under inclusions',
                ]).slice(0, 5).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-[10.5px] text-slate-800 leading-tight">
                    <span className="text-rose-500 font-bold shrink-0 mt-0.5">✕</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Row 5: Bank Remittance Details (Left) & Payment Milestones / Policy (Right) */}
          <div className="grid grid-cols-2 gap-3.5 text-[10px]">
            {/* Bank Details */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider block border-b border-slate-200 pb-0.5 mb-1">
                Bank & Remittance Details (Official Account)
              </span>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-slate-600 text-[10.5px]">
                <div><span className="text-slate-500">Beneficiary:</span> <strong className="text-slate-900">{company?.accountHolderName || company?.name || 'Jeevan'}</strong></div>
                <div><span className="text-slate-500">Bank Name:</span> <strong className="text-slate-900">{company?.bankName || 'Canara Bank'}</strong></div>
                <div><span className="text-slate-500">Account No:</span> <span className="font-mono font-bold text-slate-900">{company?.accountNumber || '2891101013983'}</span></div>
                <div><span className="text-slate-500">IFSC Code:</span> <span className="font-mono font-bold text-slate-900 uppercase">{company?.ifsc || 'CNRB0005237'}</span></div>
                <div><span className="text-slate-500">Account Type:</span> <span className="text-slate-800">{company?.accountType || 'Current Account'}</span></div>
                {company?.upiId && (
                  <div><span className="text-slate-500">UPI ID:</span> <strong className="font-mono text-[#C91F28]">{company.upiId}</strong></div>
                )}
              </div>
              <p className="text-[9.5px] text-slate-500 pt-0.5 border-t border-slate-200">
                Please quote Quotation Ref <strong>{quotation.quotationNumber}</strong> during bank fund transfer.
              </p>
            </div>

            {/* Payment Milestones & Verification Note */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-1">
              <div>
                <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider block border-b border-slate-200 pb-0.5 mb-1">
                  Payment Terms & Cancellation Policy
                </span>
                <p className="text-slate-700 leading-snug text-[10.5px]">
                  {quotation.paymentTerms || '50% advance for booking confirmation, balance payable prior to trip departure.'}
                </p>
                {quotation.cancellationTerms && (
                  <p className="text-slate-600 text-[9.5px] mt-0.5 leading-tight">
                    {quotation.cancellationTerms}
                  </p>
                )}
              </div>
              <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-[8.5px] text-slate-500">
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#C91F28] shrink-0" />
                  <span>Verified by {company?.name || 'Ooting'} CRM</span>
                </div>
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[9px]">Authorized Signatory</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer Wave Accent */}
        <div
          className="w-full bg-[#C91F28] overflow-hidden relative shrink-0 mt-auto"
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
