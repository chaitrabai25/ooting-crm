import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CreditCard, FileSpreadsheet, CheckCircle2, ArrowRight, Plus } from 'lucide-react';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { Badge } from '../../components/ui/Badge.js';
import { Modal } from '../../components/ui/Modal.js';
import { PaymentOcrModal } from '../../components/payments/PaymentOcrModal.js';
import { Payment } from '../../types/index.js';
import { downloadExcel } from '../../utils/exportHelper.js';

export const PaymentList: React.FC = () => {
  const navigate = useNavigate();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Default limit 10
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Record Payment on Booking State
  const [isSelectBookingOpen, setIsSelectBookingOpen] = useState(false);
  const [bookingsList, setBookingsList] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [isOcrOpen, setIsOcrOpen] = useState(false);

  const fetchPayments = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (search) params.append('search', search);
      if (selectedMethod) params.append('method', selectedMethod);
      if (selectedStatus) params.append('status', selectedStatus);

      const res = await api.get(`/payments?${params.toString()}`);
      setPayments(res.data.data || []);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error('Failed to fetch payments:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();

    // Multi-user 5-second live sync
    const pollInterval = setInterval(() => {
      fetchPayments(true);
    }, 5000);
    return () => clearInterval(pollInterval);
  }, [page, selectedMethod, selectedStatus]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPayments();
  };

  const handleExportExcel = async () => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (selectedMethod) params.append('method', selectedMethod);
    if (selectedStatus) params.append('status', selectedStatus);
    await downloadExcel(`/payments/export/excel?${params.toString()}`, `ooting-payments-${Date.now()}.xlsx`);
  };

  const handleOpenRecordPayment = async () => {
    setIsSelectBookingOpen(true);
    setLoadingBookings(true);
    try {
      const res = await api.get('/bookings?limit=100');
      setBookingsList(res.data.data || []);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleProceedToOcr = (b: any) => {
    setSelectedBooking(b);
    setIsSelectBookingOpen(false);
    setIsOcrOpen(true);
  };

  const formatCurrency = (val: number) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN');
  };

  const columns: Column<Payment>[] = [
    {
      header: 'S.No.',
      accessor: 'sNo',
      className: 'w-16 text-center',
    },
    {
      header: 'Booking Number',
      render: (p) => (
        <span
          onClick={() => navigate(`/bookings/${p.bookingId}`)}
          className="font-bold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer text-xs"
        >
          {p.booking?.bookingNumber || 'View Booking'}
        </span>
      ),
    },
    {
      header: 'Customer',
      render: (p) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
          {p.booking?.customer?.fullName || '—'}
        </span>
      ),
    },
    {
      header: 'Amount Paid',
      render: (p) => (
        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
          {formatCurrency(p.amount)}
        </span>
      ),
    },
    {
      header: 'Payment Method',
      render: (p) => (
        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
          {p.paymentMethod}
        </span>
      ),
    },
    {
      header: 'Transaction Ref / UTR',
      render: (p) => (
        <span className="text-xs text-slate-600 dark:text-slate-300 font-mono">
          {p.transactionReference || '—'}
        </span>
      ),
    },
    {
      header: 'Date',
      render: (p) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {new Date(p.paymentDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (p) => <Badge status={p.paymentStatus} />,
    },
  ];

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Payments & Receipts
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Verified financial receipts, payment channels, and client settlements.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={handleOpenRecordPayment}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search booking #, ref, customer..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedMethod}
            onChange={(e) => {
              setSelectedMethod(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Payment Methods</option>
            <option value="UPI">UPI</option>
            <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
            <option value="CARD">Card</option>
            <option value="CASH">Cash</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={payments}
        isLoading={isLoading}
        emptyTitle="No payments recorded"
        emptyDescription="Logged customer payments for confirmed bookings will appear here."
        pagination={{
          page,
          limit: 10,
          total,
          totalPages,
          onPageChange: (newPage) => setPage(newPage),
        }}
      />

      {/* Select Booking Modal for Recording Payment */}
      <Modal
        isOpen={isSelectBookingOpen}
        onClose={() => setIsSelectBookingOpen(false)}
        title="Select Booking to Record Payment"
        subtitle="Choose a travel booking to record payment and verify bank UTR receipt"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          {loadingBookings ? (
            <div className="p-8 text-center text-slate-500">Loading bookings...</div>
          ) : bookingsList.length === 0 ? (
            <div className="p-6 text-center text-slate-500">No active bookings found.</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {bookingsList.map((b) => {
                const totalAmt = Number(b.totalAmount || 0);
                const paidAmt = Number(b.paidAmount || 0);
                const dueAmt = Math.max(0, totalAmt - paidAmt);
                return (
                  <div
                    key={b.id}
                    onClick={() => handleProceedToOcr(b)}
                    className="p-3 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 rounded-xl cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>{b.bookingNumber}</span>
                        <span className="text-slate-400 font-normal">•</span>
                        <span>{b.customer?.fullName || 'Guest'}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Total: ₹{totalAmt.toLocaleString('en-IN')} | Paid: ₹{paidAmt.toLocaleString('en-IN')} | Due: ₹{dueAmt.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex items-center gap-1">
                      Select <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* Payment OCR Modal */}
      {selectedBooking && isOcrOpen && (
        <PaymentOcrModal
          isOpen={isOcrOpen}
          onClose={() => {
            setIsOcrOpen(false);
            setSelectedBooking(null);
          }}
          onSuccess={() => {
            fetchPayments();
          }}
          bookingId={selectedBooking.id}
          bookingNumber={selectedBooking.bookingNumber || 'OOT'}
          customerName={selectedBooking.customer?.fullName || 'Guest'}
          expectedAmount={Math.max(0, Number(selectedBooking.totalAmount || 0) - Number(selectedBooking.paidAmount || 0))}
        />
      )}
    </div>
  );
};
