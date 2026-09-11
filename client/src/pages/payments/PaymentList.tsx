import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CreditCard, Download, CheckCircle2, ArrowRight } from 'lucide-react';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { Badge } from '../../components/ui/Badge.js';
import { Payment } from '../../types/index.js';

export const PaymentList: React.FC = () => {
  const navigate = useNavigate();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '20');
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
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, selectedMethod, selectedStatus]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPayments();
  };

  const formatCurrency = (val: number) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN');
  };

  const columns: Column<Payment>[] = [
    {
      header: 'Booking Number',
      render: (p) => (
        <span
          onClick={() => navigate(`/bookings/${p.bookingId}`)}
          className="font-bold text-brand-600 hover:underline cursor-pointer text-xs"
        >
          {p.booking?.bookingNumber || 'View Booking'}
        </span>
      ),
    },
    {
      header: 'Customer',
      render: (p) => (
        <span className="font-semibold text-slate-900 text-xs">
          {p.booking?.customer?.fullName || '—'}
        </span>
      ),
    },
    {
      header: 'Amount Paid',
      render: (p) => (
        <span className="font-bold text-emerald-600 text-xs">
          {formatCurrency(p.amount)}
        </span>
      ),
    },
    {
      header: 'Payment Method',
      render: (p) => (
        <span className="text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
          {p.paymentMethod}
        </span>
      ),
    },
    {
      header: 'Transaction Ref / UTR',
      render: (p) => (
        <span className="text-xs text-slate-600 font-mono">
          {p.transactionReference || '—'}
        </span>
      ),
    },
    {
      header: 'Date',
      render: (p) => (
        <span className="text-xs text-slate-500">
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
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Payments & Receipts</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified financial receipts, payment channels, and client settlements.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.open('/api/reports/payments?format=csv', '_blank')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Payments CSV</span>
        </button>
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
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedMethod}
            onChange={(e) => {
              setSelectedMethod(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
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
            className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
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
          limit: 20,
          total,
          totalPages,
          onPageChange: (newPage) => setPage(newPage),
        }}
      />
    </div>
  );
};
