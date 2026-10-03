import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  Search,
  Calendar,
  Phone,
  Mail,
  Eye,
  FileSpreadsheet,
  Package as PackageIcon,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { Badge } from '../../components/ui/Badge.js';
import { CopyButton } from '../../components/ui/CopyButton.js';
import { WhatsAppModal } from '../../components/whatsapp/WhatsAppModal.js';
import { PassengerItem, Package } from '../../types/index.js';

export const PassengerList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [passengers, setPassengers] = useState<PassengerItem[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination (Default 10 per page)
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedPackageId, setSelectedPackageId] = useState(searchParams.get('packageId') || '');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || '');
  const [sortBy, setSortBy] = useState('bookingDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // WhatsApp Modal state
  const [whatsAppModalData, setWhatsAppModalData] = useState<{
    isOpen: boolean;
    customerName: string;
    customerPhone: string;
    bookingNumber?: string;
  }>({
    isOpen: false,
    customerName: '',
    customerPhone: '',
  });

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
      const rawData = res.data.data || [];
      const flattened: PassengerItem[] = [];

      rawData.forEach((b: any) => {
        const travellers = (b.travellersList && b.travellersList.length > 0)
          ? b.travellersList
          : [{
              name: b.name || b.customerName || 'Primary Traveller',
              isPrimary: true,
              phone: b.phone || b.customerPhone || null,
              age: b.age ?? null,
              gender: b.gender ?? null,
            }];

        travellers.forEach((t: any, idx: number) => {
          flattened.push({
            id: t.id || `${b.bookingId || b.id}-${idx}`,
            bookingId: b.bookingId || b.id,
            bookingNumber: b.bookingNumber,
            packageId: b.packageId,
            packageName: b.packageName || 'Custom Package',
            bookingDate: b.bookingDate,
            travelStartDate: b.travelStartDate,
            travelEndDate: b.travelEndDate,
            bookingStatus: b.bookingStatus,
            paymentStatus: b.paymentStatus,
            totalAmount: b.totalAmount || b.finalAmount || 0,
            amountPaid: b.amountPaid || 0,
            balanceDue: b.balanceDue || 0,
            customerName: b.customerName || 'Primary Customer',
            customerPhone: b.customerPhone || '',
            customerEmail: b.customerEmail || null,
            // Guaranteed Passenger Name and Details
            name: t.name || b.name || b.customerName || 'Primary Traveller',
            age: t.age ?? b.age ?? null,
            gender: t.gender ?? b.gender ?? null,
            phone: t.phone || b.phone || b.customerPhone || null,
            isPrimary: t.isPrimary !== undefined ? t.isPrimary : (idx === 0),
          });
        });
      });

      setPassengers(flattened);
      setTotal(res.data.pagination?.total || flattened.length);
      setTotalPages(res.data.pagination?.totalPages || 1);
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

  // Strictly Excel (.xlsx) Export
  const handleExportExcel = () => {
    const params = new URLSearchParams();
    if (selectedPackageId) params.append('packageId', selectedPackageId);
    window.open('/api/bookings/export/passengers/excel?' + params.toString(), '_blank');
  };

  const formatCurrency = (val: number) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN');
  };

  const columns: Column<PassengerItem>[] = [
    {
      header: 'Traveler Details',
      sortKey: 'name',
      render: (p) => {
        const phone = p.phone || p.customerPhone;
        return (
          <div className="space-y-1 py-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm block">
                {p.name}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 text-[9.5px] font-bold rounded-full border shadow-2xs ${
                  p.isPrimary
                    ? 'bg-red-50 text-[#C91F28] border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60'
                    : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                }`}
              >
                {p.isPrimary ? 'Primary' : 'Guest'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {(p.age || p.gender) && (
                <span>
                  {p.age ? `${p.age} yrs` : ''}
                  {p.age && p.gender ? ' • ' : ''}
                  <span className="capitalize">{p.gender ? p.gender.toLowerCase() : ''}</span>
                </span>
              )}
              {phone && (
                <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300">
                  <Phone className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                  <span>{phone}</span>
                  <CopyButton text={phone} title="Copy phone" />
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Package & Schedule',
      sortKey: 'packageName',
      render: (p) => (
        <div className="space-y-0.5 max-w-[220px]">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
            <PackageIcon className="w-3.5 h-3.5 text-[#C91F28] shrink-0" />
            <span className="truncate">{p.packageName}</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
            <span>
              {new Date(p.travelStartDate).toLocaleDateString()} – {new Date(p.travelEndDate).toLocaleDateString()}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Booking & Customer',
      sortKey: 'bookingNumber',
      render: (p) => (
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => navigate('/bookings/' + p.bookingId)}
            className="font-mono font-bold text-xs text-[#C91F28] hover:underline block text-left"
          >
            {p.bookingNumber}
          </button>
          <div className="text-[11px] text-slate-600 dark:text-slate-400">
            <span>Customer: <strong className="text-slate-800 dark:text-slate-200">{p.customerName}</strong></span>
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      sortKey: 'bookingStatus',
      render: (p) => <Badge status={p.bookingStatus} />,
    },
    {
      header: 'Payment',
      render: (p) => (
        <div className="text-xs">
          <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(p.totalAmount)}</span>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Paid: {formatCurrency(p.amountPaid)}</span>
            {p.balanceDue > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">(Due: {formatCurrency(p.balanceDue)})</span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">(Paid)</span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Action',
      className: 'text-right w-24',
      render: (p) => {
        const phone = p.phone || p.customerPhone;
        return (
          <div className="flex items-center justify-end gap-1.5">
            {phone && (
              <button
                type="button"
                onClick={() =>
                  setWhatsAppModalData({
                    isOpen: true,
                    customerName: p.name || p.customerName,
                    customerPhone: phone,
                    bookingNumber: p.bookingNumber,
                  })
                }
                title="Send WhatsApp Message"
                className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/bookings/' + p.bookingId)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#C91F28] hover:border-red-200 dark:hover:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors inline-flex items-center gap-1 text-xs font-medium cursor-pointer"
              title="View Booking"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-[#C91F28] rounded-xl">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Passenger List — Package-Wise Customer Details
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Live traveller roster and package breakdowns directly mapped from bookings
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchPassengers()}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className={'w-3.5 h-3.5 ' + (isLoading ? 'animate-spin text-[#C91F28]' : '')} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/bookings')}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
          >
            All Bookings
          </button>

          {/* Strictly Excel (.xlsx) Export */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white shadow-sm transition-all flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between flex-wrap max-w-full">
        <form onSubmit={handleSearch} className="relative flex-1 min-w-[240px] max-w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by passenger, customer name, phone, or booking #..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100/70 dark:hover:bg-slate-700 focus:bg-white dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#C91F28] focus:border-transparent outline-none transition-all"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 flex-1 sm:flex-initial max-w-full sm:max-w-[240px]">
            <PackageIcon className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedPackageId}
              onChange={(e) => {
                setSelectedPackageId(e.target.value);
                setPage(1);
              }}
              title="Filter by travel package"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#C91F28] truncate cursor-pointer"
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
            title="Filter by booking status"
            className="w-full sm:w-auto shrink-0 min-w-[130px] px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#C91F28] cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Roster Table: Optimized 6 columns fit 100% desktop zoom with clean mobile scroll */}
      <div className="w-full max-w-full overflow-x-auto rounded-xl">
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

      {/* WhatsApp Modal */}
      <WhatsAppModal
        isOpen={whatsAppModalData.isOpen}
        recipientName={whatsAppModalData.customerName}
        recipientPhone={whatsAppModalData.customerPhone}
        bookingNumber={whatsAppModalData.bookingNumber}
        onClose={() =>
          setWhatsAppModalData({ isOpen: false, customerName: '', customerPhone: '' })
        }
      />
    </div>
  );
};
