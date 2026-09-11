import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  Calendar,
  Phone,
  Mail,
  Eye,
  Download,
  Package as PackageIcon,
  CheckCircle,
  Clock,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { Badge } from '../../components/ui/Badge.js';
import { PassengerItem, Package } from '../../types/index.js';

export const PassengerList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [passengers, setPassengers] = useState<PassengerItem[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedPackageId, setSelectedPackageId] = useState(searchParams.get('packageId') || '');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || '');
  const [sortBy, setSortBy] = useState('bookingDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const res = await api.get('/packages?limit=100');
        setPackages(res.data.data || []);
      } catch (err) {
        console.error('Failed to load packages:', err);
      }
    };
    fetchPackages();
  }, []);

  const fetchPassengers = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (search.trim()) params.append('search', search.trim());
      if (selectedPackageId) params.append('packageId', selectedPackageId);
      if (selectedStatus) params.append('status', selectedStatus);
      if (sortBy) params.append('sortBy', sortBy);
      if (sortOrder) params.append('sortOrder', sortOrder);

      const res = await api.get('/bookings/passengers?' + params.toString());
      setPassengers(res.data.data || []);
      setTotal(res.data.pagination.total || 0);
      setTotalPages(res.data.pagination.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch passengers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPassengers();
  }, [page, limit, selectedPackageId, selectedStatus, sortBy, sortOrder]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPassengers();
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
    window.open('/api/bookings/export/passengers?' + params.toString(), '_blank');
  };

  const formatCurrency = (val: number) => {
    return '?' + Number(val || 0).toLocaleString('en-IN');
  };

  const columns: Column<PassengerItem>[] = [
    {
      header: 'Passenger Details',
      sortKey: 'name',
      render: (p) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm">{p.name}</span>
            {p.isPrimary && (
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-100 text-[#C91F28] rounded-full">
                Primary
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {p.age ? <span>{p.age} yrs</span> : <span>Age: �</span>}
            <span>�</span>
            <span className="capitalize">{p.gender ? p.gender.toLowerCase() : 'Not specified'}</span>
            {p.phone && (
              <>
                <span>�</span>
                <span className="inline-flex items-center gap-1 text-slate-600">
                  <Phone className="w-3 h-3 text-slate-400" /> {p.phone}
                </span>
              </>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Package Name',
      sortKey: 'packageName',
      render: (p) => (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <PackageIcon className="w-3.5 h-3.5 text-[#C91F28] flex-shrink-0" />
            <span className="truncate max-w-[200px]">{p.packageName}</span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>
              {new Date(p.travelStartDate).toLocaleDateString()} � {new Date(p.travelEndDate).toLocaleDateString()}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Booking Ref',
      sortKey: 'bookingNumber',
      render: (p) => (
        <div>
          <button
            type="button"
            onClick={() => navigate('/bookings/' + p.bookingId)}
            className="font-mono font-semibold text-xs text-[#C91F28] hover:underline block text-left"
          >
            {p.bookingNumber}
          </button>
          <span className="text-[11px] text-slate-500">
            Booked: {new Date(p.bookingDate).toLocaleDateString()}
          </span>
        </div>
      ),
    },
    {
      header: 'Primary Customer',
      render: (p) => (
        <div className="text-xs">
          <span className="font-medium text-slate-900 block">{p.customerName}</span>
          <span className="text-slate-500 flex items-center gap-1">
            <Phone className="w-3 h-3 text-slate-400" /> {p.customerPhone}
          </span>
        </div>
      ),
    },
    {
      header: 'Booking Status',
      sortKey: 'bookingStatus',
      render: (p) => <Badge status={p.bookingStatus} />,
    },
    {
      header: 'Payment Status',
      render: (p) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-900">{formatCurrency(p.totalAmount)}</span>
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <span>Paid: {formatCurrency(p.amountPaid)}</span>
            {p.balanceDue > 0 ? (
              <span className="text-amber-600 font-medium">(Due: {formatCurrency(p.balanceDue)})</span>
            ) : (
              <span className="text-emerald-600 font-medium">(Paid)</span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Action',
      className: 'text-right',
      render: (p) => (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => navigate('/bookings/' + p.bookingId)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-[#C91F28] hover:border-red-200 hover:bg-red-50 transition-colors inline-flex items-center gap-1 text-xs font-medium"
            title="View Booking"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-50 text-[#C91F28] rounded-xl">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Passenger List � Package-Wise Customer Details
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Live traveller roster and package breakdowns directly mapped from bookings
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchPassengers()}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className={'w-3.5 h-3.5 ' + (isLoading ? 'animate-spin text-[#C91F28]' : '')} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/bookings')}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
          >
            All Bookings
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearch} className="relative flex-1 w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by passenger, customer name, phone, or booking #..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#C91F28] focus:border-transparent outline-none transition-all"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <PackageIcon className="w-4 h-4 text-slate-400" />
            <select
              value={selectedPackageId}
              onChange={(e) => {
                setSelectedPackageId(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#C91F28]"
            >
              <option value="">All Travel Packages</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.packageName} ({pkg.destination})
                </option>
              ))}
            </select>
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#C91F28]"
          >
            <option value="">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Roster Table */}
      <DataTable<PassengerItem>
        columns={columns}
        data={passengers}
        isLoading={isLoading}
        sortField={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        emptyTitle="No passengers found"
        emptyDescription="No traveller records match the selected package or search criteria."
        pagination={{
          page,
          limit,
          total,
          totalPages,
          onPageChange: (newPage) => setPage(newPage),
        }}
      />
    </div>
  );
};
