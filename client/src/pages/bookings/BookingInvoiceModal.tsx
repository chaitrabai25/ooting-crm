import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import { Booking } from '../../types/index.js';
import { generateA4Pdf } from '../../utils/pdfGenerator.js';

interface BookingInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | any;
  company?: {
    name?: string;
    tagline?: string;
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
    gstNumber?: string;
  };
}

export const BookingInvoiceModal: React.FC<BookingInvoiceModalProps> = ({
  isOpen,
  onClose,
  booking,
  company = {
    name: 'OOTING HOLIDAYS',
    tagline: 'Journeys Beyond Ordinary',
    phone: '+91 80000 00000',
    email: 'bookings@ooting.com',
    website: 'https://ooting.in',
    address: 'Nilgiri Commercial Complex, Commercial Road, Ooty, The Nilgiris, Tamil Nadu - 643001',
    gstNumber: '33AABCO1234F1Z5',
  },
}) => {
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
  const cgstAmount = Math.round((subtotal * (Number(cgstPercent) || 0)) / 100 * 100) / 100;
  const sgstAmount = Math.round((subtotal * (Number(sgstPercent) || 0)) / 100 * 100) / 100;
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
  const paymentStatus =
    balanceDue === 0
      ? 'PAID'
      : amountPaid > 0
      ? 'PARTIALLY PAID'
      : 'UNPAID';

  // Dedicated Print: Isolates #invoice-document only
  const handlePrint = () => {
    document.body.classList.add('printing-dedicated');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-dedicated');
    }, 1000);
  };

  // Dedicated PDF Download: Targets #invoice-document only
  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const cleanGuest = (booking.customer?.fullName || 'Guest').replace(/[^a-zA-Z0-9]/g, '_');
      const cleanBooking = (booking.bookingNumber || 'OOT').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Invoice_${cleanBooking}_${cleanGuest}.pdf`;

      const { download } = await generateA4Pdf({
        elementId: 'invoice-document',
        filename,
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

      // Trigger instant PDF download so the staff has the exact PDF ready to attach
      const { download, pdfBlob } = await generateA4Pdf({
        elementId: 'invoice-document',
        filename,
      });
      download();

      const phone = (booking.customer?.phone || '').replace(/[^0-9]/g, '');
      const text = encodeURIComponent(
        `*OOTING HOLIDAYS - OFFICIAL TAX INVOICE*\n\n` +
        `Dear ${booking.customer?.fullName || 'Guest'},\n` +
        `Your Tax Invoice *${invoiceNumber}* for Booking *${booking.bookingNumber}* is ready.\n\n` +
        `• Tour: ${booking.package?.packageName || 'Custom Holiday Itinerary'}\n` +
        `• Travel Dates: ${travelStartDate} to ${travelEndDate}\n` +
        `• Subtotal: ₹${subtotal.toLocaleString('en-IN')}\n` +
        `• CGST (${cgstPercent}%): ₹${cgstAmount.toLocaleString('en-IN')}\n` +
        `• SGST (${sgstPercent}%): ₹${sgstAmount.toLocaleString('en-IN')}\n` +
        `• Grand Total: ₹${grandTotal.toLocaleString('en-IN')}\n` +
        `• Amount Paid: ₹${amountPaid.toLocaleString('en-IN')}\n` +
        `• *Balance Due: ₹${balanceDue.toLocaleString('en-IN')}*\n` +
        `• *Payment Due Date: ${formattedDueDate}*\n` +
        `• Status: ${paymentStatus}\n\n` +
        `📄 The official A4 Tax Invoice PDF has been downloaded to your system to share directly as a WhatsApp Document.\n\n` +
        `Thank you for traveling with Ooting Holidays!`
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors disabled:opacity-50"
                title="Send PDF Invoice to customer via WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp PDF</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors disabled:opacity-50"
                title="Download A4 PDF of invoice only"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>{isGeneratingPdf ? 'Generating...' : 'Download Invoice (PDF)'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#C91F28] hover:bg-[#a81920] text-white shadow-xs transition-all"
                title="Print invoice document only"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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

            {/* Due Date Controls */}
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#C91F28]" />
                Due Date:
              </span>
              <div className="flex items-center gap-1">
                {(['7', '10', '15'] as const).map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setDueOption(days)}
                    className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
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
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
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
            </div>
          </div>
        </div>

        {/* Dedicated Printable Invoice Container */}
        {/* Strictly targeted by PDF generator and print stylesheet */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 dark:bg-slate-950 flex justify-center print:p-0 print:bg-white">
          <div
            id="invoice-document"
            className="w-full max-w-[800px] bg-white text-slate-800 font-sans p-8 sm:p-10 shadow-lg print:shadow-none border border-slate-200 print:border-none print:p-6"
            style={{ minHeight: '1050px' }}
          >
            {/* Top Brand Accent */}
            <div className="w-full h-2.5 bg-[#C91F28] mb-6 rounded-full print:rounded-none"></div>

            {/* Letterhead Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-200">
              {/* Ooting Logo & Business Details */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center p-1 bg-white shadow-2xs">
                    <img
                      src="/assets/ooting-logo.jpg"
                      alt="Ooting"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                      OOTING
                    </h1>
                    <span className="text-[11px] font-bold text-[#C91F28] uppercase tracking-wider block mt-0.5">
                      Journeys Beyond Ordinary
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Licensed Tour Operator & Destination Specialist
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 max-w-xs leading-relaxed">
                  {company.address}
                </p>
                <div className="text-[11px] text-slate-600 space-y-0.5">
                  <p>Phone: <strong>{company.phone}</strong> | Email: <strong>{company.email}</strong></p>
                  <p>GSTIN: <strong className="font-mono">{company.gstNumber}</strong> | Web: <strong>{company.website}</strong></p>
                </div>
              </div>

              {/* Invoice Meta Banner */}
              <div className="text-left sm:text-right space-y-1.5">
                <span className="inline-block px-3.5 py-1 bg-slate-900 text-amber-400 font-black text-xs uppercase tracking-widest rounded-lg">
                  TAX INVOICE
                </span>
                <div className="pt-2">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                    Invoice Number
                  </span>
                  <span className="font-mono font-bold text-sm text-slate-900 tracking-wide">
                    {invoiceNumber}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                    Invoice Date
                  </span>
                  <span className="text-xs font-semibold text-slate-800">
                    {invoiceDateStr}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#C91F28] font-bold block uppercase tracking-wider">
                    Payment Due Date
                  </span>
                  <span className="text-xs font-bold text-slate-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                    {formattedDueDate}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                    Payment Status
                  </span>
                  <span
                    className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full mt-0.5 ${
                      paymentStatus === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : paymentStatus === 'PARTIALLY PAID'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {paymentStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer & Booking Details Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 py-5 border-b border-slate-200 text-xs">
              {/* Billed To Customer */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <span className="text-[10px] font-bold text-[#C91F28] uppercase tracking-wider block mb-1">
                  Billed To (Guest Customer)
                </span>
                <p className="font-bold text-slate-900 text-sm">{booking.customer?.fullName || 'Guest Customer'}</p>
                {booking.customer?.phone && (
                  <p className="text-slate-600 flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{booking.customer.phone}</span>
                  </p>
                )}
                {booking.customer?.email && (
                  <p className="text-slate-600 flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{booking.customer.email}</span>
                  </p>
                )}
                {booking.customer?.city && (
                  <p className="text-slate-600 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{booking.customer.city}{booking.customer.state ? `, ${booking.customer.state}` : ''}</span>
                  </p>
                )}
              </div>

              {/* Booking & Journey Information */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <span className="text-[10px] font-bold text-[#C91F28] uppercase tracking-wider block mb-1">
                  Booking & Journey Overview
                </span>
                <p className="font-bold text-slate-900 text-sm">
                  {booking.package?.packageName || 'Custom Nilgiri Holiday Tour'}
                </p>
                <div className="flex justify-between text-slate-600">
                  <span>Booking Reference:</span>
                  <span className="font-mono font-semibold text-slate-900">{booking.bookingNumber}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Travel Dates:</span>
                  <span className="font-semibold text-slate-900">{travelStartDate} to {travelEndDate}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Guests:</span>
                  <span className="font-bold text-slate-900">{booking.travellers || 1} Traveller(s)</span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="py-5 border-b border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-slate-700 bg-slate-50 font-bold">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Service Description</th>
                    <th className="py-2.5 px-3 w-28 text-center">Travellers / Qty</th>
                    <th className="py-2.5 px-3 w-32 text-right">Rate (₹)</th>
                    <th className="py-2.5 px-3 w-32 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3 px-3 text-center text-slate-400 font-semibold">1</td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900 block">
                        {booking.package?.packageName || 'Holiday Travel Package & Tour Services'}
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Comprehensive holiday arrangements, sightseeing planning, logistics & coordination
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-700">
                      {booking.travellers || 1}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-700">
                      ₹{(rawTotal / (booking.travellers || 1)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      ₹{rawTotal.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Financial Calculations Breakdown */}
            <div className="py-5 flex justify-end">
              <div className="w-full max-w-sm space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-900">₹{rawTotal.toLocaleString('en-IN')}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Promotional Discount:</span>
                    <span>- ₹{discount.toLocaleString('en-IN')}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>Taxable Amount:</span>
                  <span className="font-semibold text-slate-900">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>

                {/* CGST */}
                <div className="flex justify-between text-slate-600">
                  <span>CGST ({cgstPercent}%):</span>
                  <span className="font-medium text-slate-800">
                    ₹{cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* SGST */}
                <div className="flex justify-between text-slate-600">
                  <span>SGST ({sgstPercent}%):</span>
                  <span className="font-medium text-slate-800">
                    ₹{sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Grand Total */}
                <div className="flex justify-between pt-2 border-t-2 border-slate-300 text-sm font-black text-slate-900">
                  <span>Grand Total:</span>
                  <span className="text-[#C91F28] text-base">
                    ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Amount Paid */}
                <div className="flex justify-between text-emerald-700 font-bold pt-1 border-t border-slate-100">
                  <span>Amount Paid:</span>
                  <span>₹{amountPaid.toLocaleString('en-IN')}</span>
                </div>

                {/* Balance Due */}
                <div className="flex justify-between text-slate-800 font-black pt-1 border-t border-slate-200">
                  <span>Balance Due:</span>
                  <span className={balanceDue > 0 ? 'text-rose-600' : 'text-slate-700'}>
                    ₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Due Date Note */}
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 mt-2">
                  <span className="font-bold">Payment Due Date: </span>
                  <span>{formattedDueDate}</span>
                </div>
              </div>
            </div>

            {/* Official Terms & Authorization Notice */}
            <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
              <div className="flex items-center justify-center gap-2 text-slate-900 font-black text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-[#C91F28]" />
                <span>Officially Authorized by Ooting Holidays</span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium">
                Payments can be made via UPI, Bank Transfer (NEFT/RTGS), or authorized company payment channels.
              </p>
              <p className="text-[10px] text-slate-400">
                This is a computer-generated tax invoice verified by Ooting CRM. Valid without physical signature.
              </p>
            </div>

            {/* Bottom Wave Footer */}
            <div className="w-full h-2.5 bg-[#C91F28] mt-6 rounded-full print:rounded-none"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
