import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Plus,
  Receipt,
  User,
  Users,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  MapPin,
  FileText,
  Trash2,
  Building2,
  Sparkles,
  Award,
  FileSpreadsheet,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.js';
import { StatCard } from '../../components/ui/StatCard.js';
import { Modal } from '../../components/ui/Modal.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { BookingInvoiceModal } from './BookingInvoiceModal.js';
import { PaymentOcrModal } from '../../components/payments/PaymentOcrModal.js';
import { PassengerImportModal } from '../../components/passengers/PassengerImportModal.js';

export const BookingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<any>(null);
  const [financials, setFinancials] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPassengerImportOpen, setIsPassengerImportOpen] = useState(false);

  // Add Payment Modal
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Add Expense Modal
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState('HOTEL_BOOKING');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  const fetchBooking = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/bookings/${id}`);
      setBooking(res.data);
      setFinancials(res.data.financials || {});
      setPaymentAmount(String(res.data.financials?.balanceDue || ''));
    } catch (err) {
      console.error('Failed to load booking:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchBooking();
  }, [id]);

  const formatCurrency = (val: number) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN');
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await api.patch(`/bookings/${id}/status`, { status: newStatus });
      fetchBooking();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDeleteBooking = async () => {
    if (!booking) return;
    try {
      setIsDeleting(true);
      await api.delete(`/bookings/${booking.id}`);
      navigate('/bookings');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete booking.');
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);
    setIsSavingPayment(true);

    try {
      await api.post('/payments', {
        bookingId: id,
        amount: Number(paymentAmount),
        paymentMethod,
        transactionReference: paymentRef || null,
        notes: paymentNotes || null,
        paymentStatus: 'SUCCESS',
      });
      setIsPaymentOpen(false);
      setPaymentRef('');
      setPaymentNotes('');
      fetchBooking();
    } catch (err: any) {
      setPaymentError(err.response?.data?.message || 'Failed to record payment.');
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingExpense(true);

    try {
      await api.post('/expenses', {
        bookingId: id,
        category: expenseCategory,
        amount: Number(expenseAmount),
        description: expenseDesc,
      });
      setIsExpenseOpen(false);
      setExpenseAmount('');
      setExpenseDesc('');
      fetchBooking();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record expense.');
    } finally {
      setIsSavingExpense(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-40" />
        <div className="h-48 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-slate-500">Booking record not found.</p>
        <button
          onClick={() => navigate('/bookings')}
          className="mt-3 text-xs font-semibold text-brand-600 hover:underline"
        >
          Return to Bookings
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/bookings')}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">{booking.bookingNumber}</h1>
              <Badge status={booking.bookingStatus} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customer: {booking.customer?.fullName} • Trip:{' '}
              {new Date(booking.travelStartDate).toLocaleDateString()} to{' '}
              {new Date(booking.travelEndDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status selector */}
          <select
            value={booking.bookingStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="CONFIRMED">Confirmed</option>
            <option value="HOLD">Hold</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <button
            type="button"
            onClick={() => setIsInvoiceOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Generate Invoice</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPaymentOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpenseOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Add Expense</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Delete Booking"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Financial Health Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Booking Total"
          value={formatCurrency(financials.finalAmount)}
          subtitle={financials.discount > 0 ? `Saved: ₹${financials.discount}` : 'Net trip value'}
          icon={CreditCard}
          iconBg="bg-blue-50 dark:bg-blue-950/50"
          iconColor="text-blue-600 dark:text-blue-400"
        />

        <StatCard
          title="Amount Paid"
          value={formatCurrency(financials.amountPaid)}
          subtitle="Settled receipts"
          icon={CheckCircle2}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />

        <StatCard
          title="Balance Due"
          value={formatCurrency(financials.balanceDue)}
          subtitle="Pending receivable"
          icon={AlertCircle}
          iconBg="bg-rose-50 dark:bg-rose-950/50"
          iconColor={financials.balanceDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}
        />

        <StatCard
          title="Direct Expenses"
          value={formatCurrency(financials.totalExpenses)}
          subtitle="Hotels, cabs & vendors"
          icon={Receipt}
          iconBg="bg-amber-50 dark:bg-amber-950/50"
          iconColor="text-amber-600 dark:text-amber-400"
        />

        <StatCard
          title="Gross Profit"
          value={formatCurrency(financials.grossProfit)}
          subtitle="Revenue minus expenses"
          icon={CreditCard}
          iconBg="bg-purple-50 dark:bg-purple-950/50"
          iconColor="text-purple-600 dark:text-purple-400"
        />
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customer & Itinerary info */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-3 text-xs">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
              Customer Information
            </h3>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              <span
                onClick={() => navigate(`/customers/${booking.customer?.id}`)}
                className="font-semibold text-slate-900 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer"
              >
                {booking.customer?.fullName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700 dark:text-slate-300">{booking.customer?.phone}</span>
            </div>
            {booking.customer?.city && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="text-slate-700 dark:text-slate-300">{booking.customer?.city}</span>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-2.5 text-xs">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
              Tour Summary
            </h3>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Package:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {booking.package?.packageName || 'Custom Package'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Trip Type:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {booking.tripType === 'GROUP' ? 'Group Trip' : 'Single / Individual'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Duration:</span>
              <span className="font-bold text-[#C91F28] dark:text-rose-400">
                {booking.durationDays || 1} {booking.durationDays === 1 ? 'Day' : 'Days'} / {booking.durationNights || 0} {booking.durationNights === 1 ? 'Night' : 'Nights'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Travellers:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{booking.travellers} Pax</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Travel Start:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {new Date(booking.travelStartDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Travel End:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {new Date(booking.travelEndDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 dark:text-slate-400">Assigned Staff:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {booking.assignedUser?.name || 'Unassigned'}
              </span>
            </div>
          </div>

          {/* B2B Agent Card */}
          {booking.agentBooking && (
            <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-xs space-y-2">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span className="font-bold text-slate-800 dark:text-slate-200">B2B Agent Partnership</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300">
                Partner: <span className="font-semibold text-slate-900 dark:text-slate-100">{booking.agentBooking.agent?.companyName}</span>
              </p>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Commission ({booking.agentBooking.commissionRate}%):</span>
                <span className="font-semibold text-brand-600 dark:text-brand-400">
                  {formatCurrency(booking.agentBooking.commissionAmount)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Payout Status:</span>
                <Badge status={booking.agentBooking.payoutStatus} />
              </div>
            </div>
          )}

          {/* Linked B2B Service Providers */}
          {(() => {
            let providers: any[] = [];
            if (Array.isArray(booking.serviceProviders)) {
              providers = booking.serviceProviders;
            } else if (typeof booking.serviceProviders === 'string' && booking.serviceProviders) {
              try {
                providers = JSON.parse(booking.serviceProviders);
              } catch {
                providers = [];
              }
            }
            if (!providers || providers.length === 0) return null;

            return (
              <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-4 rounded-xl text-xs space-y-2.5">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#C91F28] dark:text-rose-400" />
                  <span className="font-bold text-slate-800 dark:text-slate-200">Linked Service Providers ({providers.length})</span>
                </div>
                <div className="space-y-2">
                  {providers.map((p: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{p.supplierName}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                          {p.category}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                        <span>Tier: <strong>{p.tier || 'Silver'}</strong></span>
                        {p.rate > 0 && <span className="font-bold text-slate-900 dark:text-slate-100">Cost: ₹{Number(p.rate).toLocaleString('en-IN')}</span>}
                      </div>
                      {p.notes && <p className="text-[10px] text-slate-500 dark:text-slate-400 italic mt-0.5">Notes: {p.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Right 2 Columns: Travellers, Payment Ledger & Expense Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* Passengers & Travellers Roster */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-red-50 dark:bg-red-950/50 text-[#C91F28] dark:text-rose-400 rounded-lg">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Passengers & Travellers Roster ({booking.travellersList?.length || booking.travellers} Pax)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Verified travellers and contact information for this trip</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPassengerImportOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
                title="Bulk import group passengers from Excel (.xlsx) or CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Import Excel / CSV</span>
              </button>
            </div>

            {(!booking.travellersList || booking.travellersList.length === 0) ? (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 rounded-xl text-center text-xs text-slate-500 dark:text-slate-400">
                <p>Primary booker: <span className="font-semibold text-slate-800 dark:text-slate-200">{booking.customer?.fullName}</span> ({booking.customer?.phone})</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {booking.travellersList.map((t: any, idx: number) => (
                  <div key={t.id || idx} className="p-3 bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-950/80 text-[#C91F28] dark:text-rose-400 font-bold text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{t.name}</span>
                      </div>
                      {t.isPrimary && (
                        <span className="text-[10px] bg-red-100 dark:bg-red-950/80 text-[#C91F28] dark:text-rose-400 font-semibold px-2 py-0.5 rounded-full">
                          Primary Booker
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                      <span>Age: {t.age ?? '—'}</span>
                      <span>•</span>
                      <span className="capitalize">{t.gender ? t.gender.toLowerCase() : 'Not specified'}</span>
                    </div>
                    {(t.phone || t.email) && (
                      <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                        {t.phone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-400" /> {t.phone}</div>}
                        {t.email && <div className="flex items-center gap-1.5">✉️ {t.email}</div>}
                      </div>
                    )}
                    {(t.idNumber || t.address) && (
                      <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                        {t.idNumber && <div>🪪 ID/Passport: <strong className="text-slate-900 dark:text-slate-100">{t.idNumber}</strong></div>}
                        {t.address && <div>📍 {t.address}</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Receipts Ledger */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Payments & Receipts</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Settled client payments towards this trip</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Payment</span>
              </button>
            </div>

            {booking.payments?.length === 0 ? (
              <EmptyState
                title="No payments recorded"
                description="Click '+ Record Payment' to log an advance or full payment."
                className="py-6 border-none bg-slate-50/50 dark:bg-slate-850/50"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                      <th className="pb-2 font-semibold">Date</th>
                      <th className="pb-2 font-semibold">Method</th>
                      <th className="pb-2 font-semibold">Reference</th>
                      <th className="pb-2 font-semibold">Amount</th>
                      <th className="pb-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {booking.payments.map((p: any) => (
                      <tr key={p.id}>
                        <td className="py-2.5 text-slate-700 dark:text-slate-300">
                          {new Date(p.paymentDate).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200">{p.paymentMethod}</td>
                        <td className="py-2.5 text-slate-500 dark:text-slate-400">{p.transactionReference || '—'}</td>
                        <td className="py-2.5 font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="py-2.5">
                          <Badge status={p.paymentStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Operating Expenses Ledger */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Trip Expenses</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Hotel vouchers, transport, safari permits, etc.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsExpenseOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Expense</span>
              </button>
            </div>

            {booking.expenses?.length === 0 ? (
              <EmptyState
                title="No expenses logged"
                description="Record vendor disbursements to monitor actual trip profit."
                className="py-6 border-none bg-slate-50/50 dark:bg-slate-850/50"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                      <th className="pb-2 font-semibold">Date</th>
                      <th className="pb-2 font-semibold">Category</th>
                      <th className="pb-2 font-semibold">Description</th>
                      <th className="pb-2 font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {booking.expenses.map((e: any) => (
                      <tr key={e.id}>
                        <td className="py-2.5 text-slate-700 dark:text-slate-300">
                          {new Date(e.expenseDate).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                          {e.category.replace('_', ' ')}
                        </td>
                        <td className="py-2.5 text-slate-600 dark:text-slate-300">{e.description}</td>
                        <td className="py-2.5 font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(e.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Record Payment Modal with OCR */}
      {isPaymentOpen && (
        <PaymentOcrModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          onSuccess={() => {
            fetchBooking();
          }}
          bookingId={id || ''}
          bookingNumber={booking.bookingNumber || 'OOT'}
          customerName={booking.customer?.fullName || 'Guest'}
          expectedAmount={Number(financials.balanceDue || 0)}
        />
      )}

      {/* Record Expense Modal */}
      <Modal
        isOpen={isExpenseOpen}
        onClose={() => setIsExpenseOpen(false)}
        title="Add Operating Expense"
        subtitle={`Link vendor expense to booking ${booking.bookingNumber}`}
        maxWidth="sm"
      >
        <form onSubmit={handleRecordExpense} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Expense Category *</label>
            <select
              value={expenseCategory}
              onChange={(e) => setExpenseCategory(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="HOTEL_BOOKING">Hotel Booking</option>
              <option value="TRANSPORT">Transport & Cab</option>
              <option value="GUIDE">Local Tour Guide</option>
              <option value="FLIGHT_TICKETS">Flight Tickets</option>
              <option value="ENTRY_FEES">Monument / Park Entry</option>
              <option value="MISC">Miscellaneous</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Amount (₹) *</label>
            <input
              type="number"
              min="1"
              required
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Description *</label>
            <textarea
              rows={2}
              required
              value={expenseDesc}
              onChange={(e) => setExpenseDesc(e.target.value)}
              placeholder="e.g. Paid advance to hotel resort for 3 nights..."
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsExpenseOpen(false)}
              className="px-3 py-1.5 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingExpense}
              className="px-4 py-1.5 font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isSavingExpense ? 'Saving...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Booking Tax Invoice Modal */}
      {isInvoiceOpen && (
        <BookingInvoiceModal
          isOpen={isInvoiceOpen}
          booking={booking}
          onClose={() => setIsInvoiceOpen(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteBooking}
        title={`Delete Booking: ${booking?.bookingNumber}`}
        message={`Are you sure you want to permanently delete this booking for ${booking?.customer?.fullName || 'Guest'}? This action cannot be undone.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Booking'}
        isDanger={true}
      />

      {/* Passenger Excel / CSV Import Modal */}
      {isPassengerImportOpen && (
        <PassengerImportModal
          isOpen={isPassengerImportOpen}
          onClose={() => setIsPassengerImportOpen(false)}
          bookingId={booking?.id}
          bookingNumber={booking?.bookingNumber}
          onSuccess={fetchBooking}
        />
      )}
    </div>
  );
};
