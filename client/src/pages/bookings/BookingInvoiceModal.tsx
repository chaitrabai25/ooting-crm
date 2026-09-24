import React, { useState } from 'react';
import {
  Printer,
  X,
  Share2,
  Download,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  CreditCard,
  Percent,
  Clock,
  CheckCircle2,
  Loader2,
  Globe,
  FileText,
} from 'lucide-react';
import { Booking } from '../../types/index.js';
import { generateA4Pdf } from '../../utils/pdfGenerator.js';
import { useCompanySettings } from '../../context/CompanySettingsContext.js';

interface BookingInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | any;
}

export const BookingInvoiceModal: React.FC<BookingInvoiceModalProps> = ({
  isOpen,
  onClose,
  booking,
}) => {
  const { company } = useCompanySettings();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Manual staff controls for GST
  const [cgstPercent, setCgstPercent] = useState<number>(2.5);
  const [sgstPercent, setSgstPercent] = useState<number>(2.5);

  // Due Date configuration
  const [dueOption, setDueOption] = useState<'7' | '10' | '15' | 'custom'>('7');
  const today = new Date();

  const calculateDefaultDue = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const [customDueDate, setCustomDueDate] = useState<string>(calculateDefaultDue(7));

  if (!isOpen || !booking) return null;

  const invoiceNumber = `INV-${booking.bookingNumber || booking.id?.slice(0, 8).toUpperCase()}`;
  const invoiceDateStr = today.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // Calculate actual due date object
  let resolvedDueDate = new Date();
  if (dueOption === '7') {
    resolvedDueDate.setDate(today.getDate() + 7);
  } else if (dueOption === '10') {
    resolvedDueDate.setDate(today.getDate() + 10);
  } else if (dueOption === '15') {
    resolvedDueDate.setDate(today.getDate() + 15);
  } else {
    resolvedDueDate = customDueDate ? new Date(customDueDate) : new Date(today.getTime() + 7 * 86400000);
  }

  const formattedDueDate = resolvedDueDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const travelStartDate = booking.travelStartDate
    ? new Date(booking.travelStartDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  const travelEndDate = booking.travelEndDate
    ? new Date(booking.travelEndDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  const rawTotal = Number(booking.totalAmount || 0);
  const discount = Number(booking.discount || 0);
  const subtotal = Math.max(0, rawTotal - discount);

  // Accurate GST Calculations
  const cgstAmount = Math.round(((subtotal * (Number(cgstPercent) || 0)) / 100) * 100) / 100;
  const sgstAmount = Math.round(((subtotal * (Number(sgstPercent) || 0)) / 100) * 100) / 100;
  const totalTax = cgstAmount + sgstAmount;
  const grandTotal = Math.round((subtotal + totalTax) * 100) / 100;

  // Amount Paid
  const amountPaid = Number(
    booking.financials?.amountPaid ??
      (booking.payments?.reduce(
        (acc: number, p: any) =>
          p.paymentStatus === 'SUCCESS' ? acc + Number(p.amount) : acc,
        0
      ) || 0)
  );

  const balanceDue = Math.max(0, Math.round((grandTotal - amountPaid) * 100) / 100);
  const isFullyPaid = balanceDue === 0;

  const paymentStatus = isFullyPaid
    ? 'PAID'
    : amountPaid > 0
    ? 'PARTIALLY PAID'
    : 'UNPAID';

  // Dedicated Print: Isolates #invoice-document only in a clean A4 print frame
  const handlePrint = () => {
    const invoiceEl = document.getElementById('invoice-document');
    if (!invoiceEl) return;

    // Create an isolated print iframe to print ONLY the invoice document
    const iframe = document.createElement('iframe');
    iframe.id = 'print-invoice-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    // Copy all style tags and stylesheet links from parent document
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((el) => el.outerHTML)
      .join('\n');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${invoiceNumber}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          ${styles}
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: 210mm !important;
              background: #ffffff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #invoice-document {
              width: 210mm !important;
              max-width: 210mm !important;
              box-sizing: border-box !important;
              margin: 0 !important;
              border: none !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
            }
          </style>
        </head>
        <body class="bg-white">
          ${invoiceEl.outerHTML}
        </body>
      </html>
    `);
    doc.close();

    // Give iframe time to parse styles and images
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Print iframe error, fallback to window.print():', e);
        document.body.classList.add('printing-dedicated');
        window.print();
        setTimeout(() => {
          document.body.classList.remove('printing-dedicated');
        }, 1000);
      } finally {
        setTimeout(() => {
          iframe.remove();
        }, 3000);
      }
    }, 400);
  };

  // Dedicated PDF Download: Targets #invoice-document only with guaranteed 1-page fit
  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const cleanGuest = (booking.customer?.fullName || 'Guest').replace(/[^a-zA-Z0-9]/g, '_');
      const cleanBooking = (booking.bookingNumber || 'OOT').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Invoice_${cleanBooking}_${cleanGuest}.pdf`;

      const { download } = await generateA4Pdf({
        elementId: 'invoice-document',
        filename,
        onePageOnly: true,
      });
      download();
    } catch (err) {
      console.error('Failed to generate invoice PDF:', err);
      alert('Failed to generate PDF. Please try again or use the Print button.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // WhatsApp Document Share: Shares exact invoice PDF and details
  const handleShareWhatsApp = async () => {
    try {
      setIsGeneratingPdf(true);
      const cleanGuest = (booking.customer?.fullName || 'Guest').replace(/[^a-zA-Z0-9]/g, '_');
      const cleanBooking = (booking.bookingNumber || 'OOT').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Invoice_${cleanBooking}_${cleanGuest}.pdf`;

      // Trigger PDF download
      const { download } = await generateA4Pdf({
        elementId: 'invoice-document',
        filename,
        onePageOnly: true,
      });
      download();

      const phone = (booking.customer?.phone || '').replace(/[^0-9]/g, '');
      const paymentSummaryText = isFullyPaid
        ? `• *Payment Status: Payment Completed / Fully Paid* (Balance: ₹0)\n`
        : `• *Balance Due: ₹${balanceDue.toLocaleString('en-IN')}*\n• *Payment Due Date: ${formattedDueDate}*\n• Status: ${paymentStatus}\n`;

      const text = encodeURIComponent(
        `*${(company.name || 'OOTING').toUpperCase()} - OFFICIAL TAX INVOICE*\n\n` +
        `Dear ${booking.customer?.fullName || 'Guest'},\n` +
        `Your Tax Invoice *${invoiceNumber}* for Booking *${booking.bookingNumber}* is generated.\n\n` +
        `• Tour: ${booking.package?.packageName || 'Custom Holiday Itinerary'}\n` +
        `• Travel Dates: ${travelStartDate} to ${travelEndDate}\n` +
        `• Subtotal: ₹${rawTotal.toLocaleString('en-IN')}\n` +
        (discount > 0 ? `• Promotional Discount: - ₹${discount.toLocaleString('en-IN')}\n` : '') +
        `• Amount: ₹${subtotal.toLocaleString('en-IN')}\n` +
        `• CGST (${cgstPercent}%): ₹${cgstAmount.toLocaleString('en-IN')}\n` +
        `• SGST (${sgstPercent}%): ₹${sgstAmount.toLocaleString('en-IN')}\n` +
        `• Grand Total: ₹${grandTotal.toLocaleString('en-IN')}\n` +
        `• Amount Paid: ₹${amountPaid.toLocaleString('en-IN')}\n` +
        paymentSummaryText + '\n' +
        `📄 The official A4 Tax Invoice PDF has been downloaded to attach as a document.\n\n` +
        `Thank you for choosing ${company.name || 'Ooting'}!`
      );

      const waUrl = `https://wa.me/${phone.length === 10 ? '91' + phone : phone}?text=${text}`;
      window.open(waUrl, '_blank');
    } catch (err) {
      console.error('WhatsApp invoice share error:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Container */}
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[96vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Floating Top Controls (Hidden when printing) */}
        <div className="flex flex-col gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 print:hidden flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#C91F28]" />
              <div>
                <h2 className="font-black text-slate-900 dark:text-white text-sm sm:text-base tracking-tight">
                  Tax Invoice & Booking Statement
                </h2>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Ref: {booking.bookingNumber} | Customer: {booking.customer?.fullName}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                disabled={isGeneratingPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                title="Send PDF Invoice to customer via WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp PDF</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                title="Download A4 PDF of invoice only"
              >
                {isGeneratingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>{isGeneratingPdf ? 'Generating...' : 'Download Invoice (PDF)'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#C91F28] hover:bg-[#a81920] text-white shadow-xs transition-all cursor-pointer"
                title="Print invoice document only"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Interactive Staff Controls: CGST / SGST & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
            {/* Tax Adjustments */}
            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-[#C91F28]" />
                Tax Rate:
              </span>
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-slate-600 dark:text-slate-400">CGST %:</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="28"
                  value={cgstPercent}
                  onChange={(e) => setCgstPercent(parseFloat(e.target.value) || 0)}
                  className="w-16 p-1 text-center font-bold border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-slate-600 dark:text-slate-400">SGST %:</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="28"
                  value={sgstPercent}
                  onChange={(e) => setSgstPercent(parseFloat(e.target.value) || 0)}
                  className="w-16 p-1 text-center font-bold border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Due Date Controls (Disabled/informative if balance is 0) */}
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#C91F28]" />
                Due Date:
              </span>
              {isFullyPaid ? (
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Fully Paid — No Due Date Needed
                </span>
              ) : (
                <>
                  <div className="flex items-center gap-1">
                    {(['7', '10', '15'] as const).map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setDueOption(days)}
                        className={`px-2 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                          dueOption === days
                            ? 'bg-[#C91F28] text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {days}D
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setDueOption('custom')}
                      className={`px-2 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                        dueOption === 'custom'
                          ? 'bg-[#C91F28] text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      Custom
                    </button>
                  </div>

                  {dueOption === 'custom' && (
                    <input
                      type="date"
                      value={customDueDate}
                      onChange={(e) => setCustomDueDate(e.target.value)}
                      className="p-1 border border-slate-300 dark:border-slate-600 rounded text-[11px] bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Dedicated Printable Invoice Container */}
        {/* Strictly targeted by PDF generator and print stylesheet */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-100 dark:bg-slate-950 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          <div
            id="invoice-document"
            className="w-[794px] max-w-[794px] mx-auto bg-white flex flex-col justify-between text-slate-800 font-sans shadow-xl rounded-2xl overflow-hidden border border-slate-200 print:shadow-none print:rounded-none print:border-none print:m-0"
            style={{
              width: '794px',
              maxWidth: '794px',
              boxSizing: 'border-box',
              backgroundColor: '#ffffff',
            }}
          >
            {/* Top Brand Accent */}
            <div className="w-full h-2.5 bg-[#C91F28] overflow-hidden relative shrink-0">
              <img
                src="/assets/ooting-header-wave.png"
                alt=""
                className="w-full h-full object-cover opacity-90"
              />
            </div>

            {/* Letterhead Header Section */}
            <div className="px-7 pt-3.5 pb-2.5 border-b border-slate-200">
              <div className="flex justify-between items-start gap-4">
                {/* LEFT SIDE: Smaller, Proportional Logo & Company Identity */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center bg-white p-1 border border-slate-200 shadow-2xs shrink-0">
                    <img
                      src={company.logoUrl || '/assets/ooting-logo.jpg'}
                      alt={company.name || 'Ooting'}
                      className="max-w-full max-h-full object-contain"
                      style={{ objectFit: 'contain' }}
                      crossOrigin="anonymous"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/ooting-logo.jpg';
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="text-base font-black tracking-tight text-slate-900 block leading-tight uppercase">
                      {(company.name || 'OOTING').toUpperCase()}
                    </span>
                    {company.tagline && (
                      <span className="text-[10px] font-bold text-[#C91F28] uppercase tracking-wide block mt-0.5">
                        {company.tagline}
                      </span>
                    )}
                    <span className="text-[9px] text-slate-500 block mt-0.5">
                      Licensed Tour Operator & Destination Specialist
                    </span>
                  </div>
                </div>

                {/* RIGHT SIDE: Company Contact Details (Moved ~1-2cm further right, flush with right margin, left-aligned internally) */}
                <div className="text-left text-xs space-y-1 text-slate-700 max-w-[290px] shrink-0">
                  {company.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-[#C91F28] shrink-0" />
                      <span className="font-medium text-[11px] text-slate-800 break-all leading-normal">{company.website}</span>
                    </div>
                  )}
                  {company.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#C91F28] shrink-0" />
                      <span className="font-medium text-[11px] text-slate-800 leading-normal">{company.phone}</span>
                    </div>
                  )}
                  {company.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#C91F28] shrink-0" />
                      <span className="font-medium text-[11px] text-slate-800 break-all leading-normal">{company.email}</span>
                    </div>
                  )}
                  {company.gstin && company.gstin.trim() !== '' && company.gstin.toLowerCase() !== 'nill' && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-[#C91F28] shrink-0" />
                      <span className="font-mono font-bold text-[11px] text-slate-900 leading-normal">
                        {company.gstin.toUpperCase().startsWith('GSTIN') ? company.gstin : `GSTIN: ${company.gstin}`}
                      </span>
                    </div>
                  )}
                  {company.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#C91F28] shrink-0 mt-[1.5px]" />
                      <span className="text-[10.5px] text-slate-600 leading-snug break-words flex-1">{company.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Document Title & Meta Banner */}
            <div className="bg-slate-900 text-white px-7 py-2 flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold text-amber-400 block tracking-widest leading-tight">
                  OFFICIAL COMMERCIAL DOCUMENT
                </span>
                <h2 className="text-xs font-black tracking-wide leading-tight">
                  TAX INVOICE & BOOKING STATEMENT
                </h2>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 block uppercase font-semibold tracking-wider">Invoice #</span>
                  <span className="font-mono text-[11px] font-bold text-amber-300 leading-tight block">{invoiceNumber}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 block uppercase font-semibold tracking-wider">Invoice Date</span>
                  <span className="text-[11px] font-bold text-white leading-tight block">{invoiceDateStr}</span>
                </div>
                <div className="text-center min-w-[105px]">
                  <span className="text-[9px] text-slate-400 block uppercase font-semibold tracking-wider mb-0.5">Payment Status</span>
                  <div className="flex items-center justify-center">
                    <span
                      className={`inline-flex items-center justify-center px-2.5 py-0.5 text-[9.5px] font-black uppercase tracking-wider rounded-md border leading-none ${
                        isFullyPaid
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : paymentStatus === 'PARTIALLY PAID'
                          ? 'bg-amber-400/20 text-amber-300 border-amber-400/50'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      }`}
                    >
                      {isFullyPaid ? 'FULLY PAID' : paymentStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Invoice Body Content */}
            <div className="flex-1 px-7 py-3 space-y-2.5">
              {/* Customer & Booking Details Section */}
              <div className="grid grid-cols-2 gap-3 py-1 border-b border-slate-200 text-xs">
                {/* Billed To Customer */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-0.5">
                  <span className="text-[9px] font-bold text-[#C91F28] uppercase tracking-wider block mb-0.5">
                    Billed To (Customer Details)
                  </span>
                  <p className="font-bold text-slate-900 text-xs">{booking.customer?.fullName || 'Guest Customer'}</p>
                  {booking.customer?.phone && (
                    <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
                      <Phone className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                      <span>{booking.customer.phone}</span>
                    </p>
                  )}
                  {booking.customer?.email && (
                    <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
                      <Mail className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                      <span>{booking.customer.email}</span>
                    </p>
                  )}
                  {booking.customer?.city && (
                    <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
                      <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                      <span>{booking.customer.city}{booking.customer.state ? `, ${booking.customer.state}` : ''}</span>
                    </p>
                  )}
                </div>

                {/* Booking & Journey Information */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-0.5">
                  <span className="text-[9px] font-bold text-[#C91F28] uppercase tracking-wider block mb-0.5">
                    Booking & Journey Overview
                  </span>
                  <p className="font-bold text-slate-900 text-xs">
                    {booking.package?.packageName || 'Custom Holiday Tour'}
                  </p>
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Booking Reference:</span>
                    <span className="font-mono font-semibold text-slate-900">{booking.bookingNumber}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Travel Dates:</span>
                    <span className="font-semibold text-slate-900">{travelStartDate} to {travelEndDate}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Total Guests:</span>
                    <span className="font-bold text-slate-900">{booking.travellers || 1} Traveller(s)</span>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="py-1.5 border-b border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-700 bg-slate-50 font-bold">
                      <th className="py-1.5 px-2.5 w-10 text-center text-[10px]">#</th>
                      <th className="py-1.5 px-2.5 text-[10px]">Service Description</th>
                      <th className="py-1.5 px-2.5 w-28 text-center text-[10px]">Travellers / Qty</th>
                      <th className="py-1.5 px-2.5 w-32 text-right text-[10px]">Rate (₹)</th>
                      <th className="py-1.5 px-2.5 w-32 text-right text-[10px]">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2 px-2.5 text-center text-slate-400 font-semibold text-[11px]">1</td>
                      <td className="py-2 px-2.5">
                        <span className="font-bold text-slate-900 text-xs block">
                          {booking.package?.packageName || 'Holiday Travel Package & Tour Services'}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          Comprehensive holiday arrangements, sightseeing planning, logistics & co-ordination
                        </span>
                      </td>
                      <td className="py-2 px-2.5 text-center font-semibold text-slate-700 text-xs">
                        {booking.travellers || 1}
                      </td>
                      <td className="py-2 px-2.5 text-right font-medium text-slate-700 text-xs">
                        ₹{(rawTotal / (booking.travellers || 1)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-2.5 text-right font-bold text-slate-900 text-xs">
                        ₹{rawTotal.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Balanced 2-Column Section: Banking on Left, Financial Calculations on Right */}
              <div className="grid grid-cols-2 gap-4 py-1.5 border-b border-slate-200">
                {/* Left: Banking / Remittance Details & Policy Notes */}
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[9px] font-bold text-[#C91F28] uppercase tracking-wider block">
                      Bank & Remittance Details
                    </span>
                    <div className="space-y-0.5 text-[10.5px] text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Beneficiary:</span>
                        <span className="font-bold text-slate-900">{company.name || 'Ooting'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Bank Name:</span>
                        <span className="font-medium text-slate-800">Authorized Commercial Bank</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">UPI ID / VPA:</span>
                        <span className="font-mono font-semibold text-slate-800">ooting@upi</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Account Type:</span>
                        <span className="font-medium text-slate-800">Current Account</span>
                      </div>
                    </div>
                    <p className="text-[9.5px] text-slate-500 pt-1 border-t border-slate-200/80">
                      Please quote Booking Ref <strong>{booking.bookingNumber}</strong> during bank fund transfer.
                    </p>
                  </div>

                  <div className="p-2 rounded-lg bg-amber-50/50 border border-amber-200/60 text-[9.5px] text-amber-950 space-y-0.5">
                    <span className="font-bold text-amber-900 block text-[9px] uppercase tracking-wider">
                      Payment Terms & Cancellation Policy
                    </span>
                    <p className="text-slate-600 leading-tight">
                      Standard cancellation charges apply as per booking itinerary policy. Peak season & holiday bookings are non-refundable within 7 days of departure.
                    </p>
                  </div>
                </div>

                {/* Right: Financial Breakdown */}
                <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-200 flex flex-col justify-between space-y-1.5 text-xs">
                  <div className="space-y-1">
                    {/* Subtotal */}
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-semibold text-slate-900 tabular-nums text-right">
                        ₹{rawTotal.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {discount > 0 && (
                      <div className="flex items-center justify-between text-[11px] text-emerald-600 font-semibold">
                        <span>Promotional Discount:</span>
                        <span className="tabular-nums text-right">- ₹{discount.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span>Amount:</span>
                      <span className="font-semibold text-slate-900 tabular-nums text-right">
                        ₹{subtotal.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* CGST */}
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span>CGST ({cgstPercent}%):</span>
                      <span className="font-medium text-slate-800 tabular-nums text-right">
                        ₹{cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* SGST */}
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span>SGST ({sgstPercent}%):</span>
                      <span className="font-medium text-slate-800 tabular-nums text-right">
                        ₹{sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Grand Total */}
                    <div className="flex items-center justify-between pt-1 border-t-2 border-slate-300 text-xs font-black text-slate-900">
                      <span>Grand Total:</span>
                      <span className="text-[#C91F28] text-sm tabular-nums text-right">
                        ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Amount Paid */}
                    <div className="flex items-center justify-between text-[11px] text-emerald-700 font-bold pt-0.5 border-t border-slate-200">
                      <span>Amount Paid:</span>
                      <span className="tabular-nums text-right">₹{amountPaid.toLocaleString('en-IN')}</span>
                    </div>

                    {/* Balance Due */}
                    <div className="flex items-center justify-between text-[11px] text-slate-900 font-black pt-0.5 border-t border-slate-200">
                      <span>Balance Due:</span>
                      <span className={`tabular-nums text-right ${balanceDue > 0 ? 'text-rose-600 font-bold' : 'text-emerald-700'}`}>
                        ₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Due Date Note or Paid Badge (Crisp Full-Width Aligned Box) */}
                  {isFullyPaid ? (
                    <div className="w-full mt-2 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-md text-[10.5px] text-emerald-800 font-bold flex items-center justify-center gap-1.5 box-border">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Payment Completed in Full. Thank you!</span>
                    </div>
                  ) : (
                    <div className="w-full mt-2 px-3 py-1.5 bg-amber-50/90 border border-amber-300 rounded-md text-[10.5px] flex items-center justify-between box-border">
                      <span className="font-bold text-amber-950">Payment Due Date:</span>
                      <span className="font-black font-mono text-slate-900 tabular-nums">{formattedDueDate}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Official Verification Notice (NO SIGNATURES) */}
              <div className="border border-slate-200 rounded-lg p-2 bg-slate-50/80 text-center space-y-0.5">
                <div className="flex items-center justify-center gap-1.5 text-slate-900 font-bold text-[10.5px] uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#C91F28] shrink-0 inline-block align-middle" />
                  <span className="inline-block align-middle leading-none">Official Tax Invoice • {company.name || 'Ooting'}</span>
                </div>
                <p className="text-[9.5px] text-slate-500">
                  This is a computer-generated commercial tax invoice verified by {company.name || 'Ooting'} CRM. Valid without physical signature.
                </p>
              </div>
            </div>

            {/* Bottom Wave Footer - INSIDE #invoice-document */}
            <div className="w-full h-2.5 bg-[#C91F28] overflow-hidden relative shrink-0">
              <img
                src="/assets/ooting-header-wave.png"
                alt=""
                className="w-full h-full object-cover opacity-90 rotate-180"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
