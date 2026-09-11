import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Download,
  Search,
  Eye,
  BookmarkCheck,
  Calendar,
  Phone,
  CreditCard,
  Users,
  Package as PackageIcon,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { Badge } from '../../components/ui/Badge.js';
import { BookingModal } from './BookingModal.js';
import { Booking, Package } from '../../types/index.js';

export const BookingList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [bookings, setBookings] = useState<any[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('action') === 'create');
  const [editingBooking, setEditingBooking] = useState<any | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [sortBy, setSortBy] = useState('bookingDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load packages for filter
  useEffect(() => {
    api.get('/packages?limit=100').then((res) => {
      setPackages(res.data.data || []);
    }).catch(console.error);
  }, []);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '15');
      if (search.trim()) params.append('search', search.trim());
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedPackageId) params.append('packageId', selectedPackageId);
      if (sortBy) params.append('sortBy', sortBy);
      if (sortOrder) params.append('sortOrder', sortOrder);

      const res = await api.get(`/bookings?${params.toString()}`);
      setBookings(res.data.data || []);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [page, selectedStatus, selectedPackageId, sortBy, sortOrder]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchBookings();
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (selectedPackageId) params.append('packageId', selectedPackageId);
    if (selectedStatus) params.append('status', selectedStatus);
    window.open(`/api/bookings/export/csv?${params.toString()}`, '_blank');
  };

  const formatCurrency = (val: number) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN');
  };

  const columns: Column<any>[] = [
    {
      header: 'Booking #',
      sortKey: 'bookingNumber',
      render: (b) => (
        <div>
          <span
            onClick={() => navigate(`/bookings/${b.id}`)}
            className="font-bold text-[#C91F28] hover:underline cursor-pointer block text-xs"
          >
            {b.bookingNumber}
          </span>
          <span className="text-[11px] text-slate-500">
            {new Date(b.bookingDate).toLocaleDateString()}
          </span>
        </div>
      ),
    },
    {
      header: 'Customer',
      render: (b) => (
        <div>
          <span
            onClick={() => navigate(`/customers/${b.customer?.id}`)}
            className="font-semibold text-slate-900 hover:text-[#C91F28] cursor-pointer block text-xs"
          >
            {b.customer?.fullName}
          </span>
          <span className="text-[11px] text-slate-500">{b.customer?.phone}</span>
        </div>
      ),
    },
    {
      header: 'Package & Dates',
      sortKey: 'travelStartDate',
      render: (b) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-800 block">
            {b.package?.packageName || 'Customized Tour'}
          </span>
          <span className="text-[11px] text-slate-500">
            {new Date(b.travelStartDate).toLocaleDateString()} – {new Date(b.travelEndDate).toLocaleDateString()} ({b.travellers} Pax)
          </span>
        </div>
      ),
    },
    {
      header: 'Total Value',
      sortKey: 'finalAmount',
      render: (b) => (
        <div className="text-xs">
          <span className="font-bold text-slate-900">{formatCurrency(b.finalAmount)}</span>
          {b.discount > 0 && (
            <span className="text-[10px] text-emerald-600 block">
              Disc: {formatCurrency(b.discount)}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Paid Amount',
      render: (b) => (
        <span className="text-xs font-semibold text-emerald-600">
          {formatCurrency(b.amountPaid)}
        </span>
      ),
    },
    {
      header: 'Balance Due',
      render: (b) => (
        <span
          className={`text-xs font-bold ${b.balanceDue > 0 ? 'text-rose-600' : 'text-slate-400'}`}
        >
          {formatCurrency(b.balanceDue)}
        </span>
      ),
    },
    {
      header: 'Status',
      sortKey: 'bookingStatus',
      render: (b) => <Badge status={b.bookingStatus} />,
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (b) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => navigate(`/bookings/${b.id}`)}
            title="View Booking"
            className="p-1.5 text-slate-500 hover:text-[#C91F28] hover:bg-red-50 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Bookings Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Confirmed travel operations, multi-traveller rosters, and financial balances
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/passengers')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#C91F28] bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Passenger List</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingBooking(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#C91F28] hover:bg-[#a81920] rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Booking</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search booking #, customer, package..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C91F28] transition-colors"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Package filter */}
          <div className="flex items-center gap-1">
            <PackageIcon className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedPackageId}
              onChange={(e) => {
                setSelectedPackageId(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#C91F28]"
            >
              <option value="">All Travel Packages</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.packageName}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#C91F28]"
          >
            <option value="">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="HOLD">Hold</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <button
            type="button"
            onClick={() => fetchBookings()}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#C91F28]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={bookings}
        isLoading={isLoading}
        sortField={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        emptyTitle="No bookings recorded"
        emptyDescription="Convert an enquiry or record a new confirmed customer booking."
        pagination={{
          page,
          limit: 15,
          total,
          totalPages,
          onPageChange: (newPage) => setPage(newPage),
        }}
      />

      {/* Booking Modal */}
      {isModalOpen && (
        <BookingModal
          isOpen={isModalOpen}
          initialData={editingBooking}
          onClose={() => {
            setIsModalOpen(false);
            setEditingBooking(null);
          }}
          onSuccess={() => {
            fetchBookings();
          }}
        />
      )}
    </div>
  );
};
