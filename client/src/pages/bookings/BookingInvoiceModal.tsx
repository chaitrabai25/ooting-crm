import React, { useRef } from 'react';
import {
  Printer,
  X,
  Share2,
  Building2,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import { Booking } from '../../types/index.js';

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
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !booking) return null;

  const invoiceNumber = `INV-${booking.bookingNumber || booking.id?.slice(0, 8).toUpperCase()}`;
  const invoiceDate = new Date().toLocaleDateString('en-IN', {
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

  const totalAmount = Number(booking.totalAmount || 0);
  const discount = Number(booking.discount || 0);
  const finalAmount = Math.max(0, totalAmount - discount);

  // Parse paid amount from financials or payments
  const amountPaid = Number(
    booking.financials?.amountPaid ??
      (booking.payments?.reduce(
        (acc: number, p: any) =>
          p.paymentStatus === 'SUCCESS' ? acc + Number(p.amount) : acc,
        0
      ) || 0)
  );

  const balanceDue = Math.max(0, finalAmount - amountPaid);
  const paymentStatus =
    balanceDue === 0
      ? 'PAID'
      : amountPaid > 0
      ? 'PARTIALLY PAID'
      : 'UNPAID';

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const phone = (booking.customer?.phone || '').replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `*OOTING HOLIDAYS - TRAVEL INVOICE*\n` +
      `Invoice #: ${invoiceNumber}\n` +
      `Booking Ref: ${booking.bookingNumber}\n` +
      `Guest Name: ${booking.customer?.fullName}\n` +
      `Package: ${booking.package?.packageName || 'Custom Holiday Itinerary'}\n` +
      `Travel Dates: ${travelStartDate} to ${travelEndDate}\n` +
      `Total Amount: ₹${finalAmount.toLocaleString('en-IN')}\n` +
      `Amount Paid: ₹${amountPaid.toLocaleString('en-IN')}\n` +
      `Balance Due: ₹${balanceDue.toLocaleString('en-IN')}\n` +
      `Status: ${paymentStatus}\n\n` +
      `Thank you for traveling with Ooting!`
    );
    window.open(`https://wa.me/${phone.length === 10 ? '91' + phone : phone}?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Container */}
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Floating Top Controls (Hidden when printing) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 print:hidden flex-shrink-0">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#C91F28]" />
            <h2 className="font-black text-slate-900 dark:text-white text-sm sm:text-base tracking-tight">
              Tax Invoice & Booking Statement
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp Invoice</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#C91F28] hover:bg-[#a81920] text-white shadow-xs transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
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

        {/* Printable Invoice Body */}
        <div
          ref={printRef}
          className="flex-1 overflow-y-auto p-6 sm:p-10 text-slate-800 font-sans print:overflow-visible print:p-6 bg-white"
        >
          {/* Header Wave Accent */}
          <div className="w-full h-2.5 bg-[#C91F28] mb-6 rounded-full print:rounded-none"></div>

          {/* Letterhead Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-200">
            {/* Ooting Logo & Business Details */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center p-1 bg-white shadow-2xs">
                  <img
                    src="/assets/ooting-logo.jpg"
                    alt="Ooting"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                    OOTING
                  </h1>
                  <span className="text-[10px] font-bold text-[#C91F28] uppercase tracking-wider block mt-0.5">
                    Journeys Beyond Ordinary
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                {company.address}
              </p>
              <div className="text-[11px] text-slate-600 space-y-0.5">
                <p>Phone: <strong>{company.phone}</strong> | Email: <strong>{company.email}</strong></p>
                <p>GSTIN: <strong className="font-mono">{company.gstNumber}</strong></p>
              </div>
            </div>

            {/* Invoice Meta Banner */}
            <div className="text-left sm:text-right space-y-1">
              <span className="inline-block px-3 py-1 bg-slate-900 text-amber-400 font-black text-xs uppercase tracking-widest rounded-lg">
                TAX INVOICE
              </span>
              <div className="pt-2">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                  Invoice Number
                </span>
                <span className="font-mono font-bold text-sm text-slate-900 tracking-wide">
                  {invoiceNumber}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                  Invoice Date
                </span>
                <span className="text-xs font-semibold text-slate-800">
                  {invoiceDate}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">
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

          {/* Billing & Travel Itinerary Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-200 text-xs">
            {/* Billed To */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <span className="text-[10px] font-bold text-[#C91F28] uppercase tracking-wider block mb-1">
                Billed To (Customer / Booker)
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

            {/* Travel Summary */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <span className="text-[10px] font-bold text-[#C91F28] uppercase tracking-wider block mb-1">
                Tour & Journey Details
              </span>
              <p className="font-bold text-slate-900 text-sm">
                {booking.package?.packageName || 'Custom Nilgiri Tour Itinerary'}
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
                <span>Total Travellers:</span>
                <span className="font-bold text-slate-900">{booking.travellers || 1} Person(s)</span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-6 border-b border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 text-slate-600 bg-slate-50 font-bold">
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th className="py-3 px-3">Service Description</th>
                  <th className="py-3 px-3 w-28 text-center">Travellers / Qty</th>
                  <th className="py-3 px-3 w-32 text-right">Rate (₹)</th>
                  <th className="py-3 px-3 w-32 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3.5 px-3 text-center text-slate-400 font-semibold">1</td>
                  <td className="py-3.5 px-3">
                    <span className="font-bold text-slate-900 block">
                      {booking.package?.packageName || 'Holiday Travel Package & Coordination'}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Includes tour planning, customer support, and Nilgiri coordination
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-center font-semibold text-slate-700">
                    {booking.travellers || 1}
                  </td>
                  <td className="py-3.5 px-3 text-right font-medium text-slate-700">
                    ₹{((totalAmount) / (booking.travellers || 1)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Financial Calculation Summary */}
          <div className="py-6 flex justify-end">
            <div className="w-full max-w-sm space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-900">₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Special Discount:</span>
                  <span>- ₹{discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Taxes & Service Fees (Included):</span>
                <span className="font-medium text-slate-700">₹0.00</span>
              </div>
              <div className="flex justify-between pt-2 border-t-2 border-slate-200 text-sm font-black text-slate-900">
                <span>Grand Total:</span>
                <span className="text-[#C91F28] text-base">₹{finalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold pt-1 border-t border-slate-100">
                <span>Amount Paid:</span>
                <span>₹{amountPaid.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-800 font-black pt-1 border-t border-slate-200">
                <span>Balance Due:</span>
                <span className={balanceDue > 0 ? 'text-rose-600' : 'text-slate-700'}>
                  ₹{balanceDue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Official Authorization Notice */}
          <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
            <div className="flex items-center justify-center gap-2 text-slate-900 font-black text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-[#C91F28]" />
              <span>Officially Authorized by Ooting</span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium">
              This tax invoice is issued by Ooting for official travel service coordination.
            </p>
            <p className="text-[10px] text-slate-400">
              Computer-generated invoice. Valid without physical signature or rubber stamp.
            </p>
          </div>

          {/* Bottom Wave Footer */}
          <div className="w-full h-2.5 bg-[#C91F28] mt-8 rounded-full print:rounded-none"></div>
        </div>
      </div>
    </div>
  );
};
