import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Car,
  Plus,
  FileSpreadsheet,
  Upload,
  Search,
  Eye,
  Edit2,
  Trash2,
  Phone,
  Printer,
  Calendar,
  Share2,
  DollarSign,
  Clock,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { Badge } from '../../components/ui/Badge.js';
import { CopyButton } from '../../components/ui/CopyButton.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { WhatsAppModal } from '../../components/whatsapp/WhatsAppModal.js';
import { CabModal } from './CabModal.js';
import { CabImportModal } from './CabImportModal.js';
import { CabBooking } from '../../types/index.js';
import { downloadExcel } from '../../utils/exportHelper.js';
import { ModuleSubNav } from '../../components/ui/ModuleSubNav.js';
import { BookmarkCheck } from 'lucide-react';

export const CabList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cabs, setCabs] = useState<CabBooking[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('action') === 'create');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingCab, setEditingCab] = useState<CabBooking | null>(null);
  const [deletingCab, setDeletingCab] = useState<CabBooking | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // WhatsApp modal state
  const [whatsAppModalData, setWhatsAppModalData] = useState<{
    isOpen: boolean;
    customerName: string;
    customerPhone: string;
    customerId?: string;
  }>({
    isOpen: false,
    customerName: '',
    customerPhone: '',
  });

  // Import State
  const [importStatus, setImportStatus] = useState<{
    loading: boolean;
    message: string | null;
    isError: boolean;
  }>({
    loading: false,
    message: null,
    isError: false,
  });

  // Pagination & Filters (Default 10 per page)
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedVehicleType, setSelectedVehicleType] = useState('');
  const [selectedTripType, setSelectedTripType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const statusTabs = [
    { label: 'All Cabs', value: '' },
    { label: 'Confirmed', value: 'CONFIRMED' },
    { label: 'On Trip', value: 'ON_TRIP' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  const fetchStats = async () => {
    try {
      const res = await api.get('/cabs/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch cab stats:', err);
    }
  };

  const fetchCabs = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (search.trim()) params.append('search', search.trim());
      if (selectedStatus) params.append('bookingStatus', selectedStatus);
      if (selectedVehicleType) params.append('vehicleType', selectedVehicleType);
      if (selectedTripType) params.append('tripType', selectedTripType);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await api.get(`/cabs?${params.toString()}`);
      setCabs(res.data.data || []);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error('Failed to fetch cab bookings:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchCabs();

    // Multi-user 5-second live sync
    const pollTimer = setInterval(() => {
      fetchCabs(true);
      fetchStats();
    }, 5000);
    return () => clearInterval(pollTimer);
  }, [page, selectedStatus, selectedVehicleType, selectedTripType, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCabs();
  };

  // Safe Excel Export (.xlsx)
  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedStatus) params.append('bookingStatus', selectedStatus);
      if (selectedVehicleType) params.append('vehicleType', selectedVehicleType);

      await downloadExcel(`/cabs/export/excel?${params.toString()}`, `ooting-cabs-${Date.now()}.xlsx`);
    } catch (err) {
      console.error('Failed to export cabs to excel:', err);
    }
  };

  // Excel (.xlsx only) Import Handling
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setImportStatus({
        loading: false,
        message: 'Invalid file format. Please upload an Excel spreadsheet (.xlsx or .xls) only.',
        isError: true,
      });
      return;
    }

    try {
      setImportStatus({ loading: true, message: 'Parsing Excel spreadsheet...', isError: false });
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      if (!rows || rows.length === 0) {
        setImportStatus({
          loading: false,
          message: 'The selected Excel file is empty.',
          isError: true,
        });
        return;
      }

      // Map common Excel column aliases
      const items = rows.map((r: any) => ({
        customerName: r['Customer Name'] || r['customerName'] || r['Guest Name'] || r['Name'],
        customerPhone: String(r['Customer Phone'] || r['customerPhone'] || r['Phone'] || r['Mobile'] || ''),
        customerEmail: r['Customer Email'] || r['customerEmail'] || r['Email'] || null,
        pickupDate: r['Pickup Date'] || r['pickupDate'] || new Date().toISOString(),
        pickupTime: r['Pickup Time'] || r['pickupTime'] || '08:00 AM',
        pickupPlace: r['Pickup Place'] || r['pickupPlace'] || r['Pickup Location'] || r['From'] || '',
        dropPlace: r['Drop Place'] || r['dropPlace'] || r['Drop Location'] || r['To'] || '',
        travelRoute: r['Route'] || r['travelRoute'] || null,
        carNumber: r['Car Number'] || r['carNumber'] || r['Vehicle No'] || null,
        vehicleType: r['Vehicle Type'] || r['vehicleType'] || 'SEDAN',
        passengerCount: Number(r['Passengers'] || r['passengerCount'] || 1),
        driverName: r['Driver Name'] || r['driverName'] || null,
        driverPhone: String(r['Driver Phone'] || r['driverPhone'] || ''),
        cabProvider: r['Cab Provider'] || r['cabProvider'] || null,
        tripType: r['Trip Type'] || r['tripType'] || 'OUTSTATION',
        cabAmount: Number(r['Cab Amount (INR)'] || r['cabAmount'] || r['Amount'] || 0),
        advanceAmount: Number(r['Advance (INR)'] || r['advanceAmount'] || 0),
        specialInstructions: r['Special Instructions'] || r['specialInstructions'] || null,
        internalNotes: r['Notes'] || r['internalNotes'] || null,
      }));

      const res = await api.post('/cabs/import', { items });
      setImportStatus({
        loading: false,
        message: res.data.message || `Successfully imported ${res.data.imported} records.`,
        isError: false,
      });

      fetchCabs();
      fetchStats();
    } catch (err: any) {
      console.error('Import error:', err);
      setImportStatus({
        loading: false,
        message: err.response?.data?.message || 'Failed to import cab bookings from Excel.',
        isError: true,
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCab) return;
    try {
      setIsDeleting(true);
      await api.delete(`/cabs/${deletingCab.id}`);
      setDeletingCab(null);
      fetchCabs();
      fetchStats();
    } catch (err) {
      console.error('Failed to delete cab booking:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Table Columns
  const columns: Column<CabBooking>[] = [
    {
      header: 'S.No.',
      accessor: 'sNo',
      className: 'w-14 text-center',
      render: (_, index) => (
        <span className="font-mono text-xs text-slate-500">
          {(page - 1) * limit + (index !== undefined ? index + 1 : 1)}
        </span>
      ),
    },
    {
      header: 'Booking Reference',
      render: (cab) => (
        <div>
          <span
            onClick={() => navigate(`/cabs/${cab.id}`)}
            className="font-mono font-bold text-slate-900 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer block text-xs"
          >
            {cab.bookingReference}
          </span>
          <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
            <Calendar className="w-3 h-3" />
            {new Date(cab.pickupDate).toLocaleDateString('en-IN', {
              month: 'short',
              day: 'numeric',
            })}{' '}
            at {cab.pickupTime}
          </span>
        </div>
      ),
    },
    {
      header: 'Customer Details',
      render: (cab) => (
        <div>
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs block">
            {cab.customerName}
          </span>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
            <Phone className="w-3 h-3 text-slate-400" />
            <span>{cab.customerPhone}</span>
            <CopyButton text={cab.customerPhone} title="Copy phone" />
          </div>
        </div>
      ),
    },
    {
      header: 'Trip Route',
      render: (cab) => (
        <div className="max-w-[200px]">
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
            {cab.pickupPlace} → {cab.dropPlace}
          </div>
          <span className="text-[10px] text-slate-500 block">
            {cab.tripType} • {cab.passengerCount} Pax
          </span>
        </div>
      ),
    },
    {
      header: 'Vehicle & Driver',
      render: (cab) => (
        <div className="text-xs">
          <div className="flex items-center gap-1 font-semibold text-slate-900 dark:text-slate-100">
            <span>{cab.vehicleType}</span>
            <span className="text-[10px] text-slate-500 font-normal">({cab.requiredCabType})</span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-[10px]">
              {cab.carNumber || 'Unassigned'}
            </span>
            {cab.carNumber && <CopyButton text={cab.carNumber} title="Copy Car No." />}
          </div>
          {cab.driverName && (
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
              Driver: {cab.driverName}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Fare & Payment',
      render: (cab) => (
        <div className="text-xs">
          <div className="font-bold text-slate-900 dark:text-slate-100">
            ₹{Number(cab.cabAmount).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-500 flex items-center gap-1">
            <span>Bal: ₹{Number(cab.balanceAmount).toLocaleString('en-IN')}</span>
            <Badge status={cab.paymentStatus} className="text-[9px] px-1 py-0" />
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      render: (cab) => <Badge status={cab.bookingStatus} />,
    },
    {
      header: 'Actions',
      className: 'text-right w-36',
      render: (cab) => (
        <div className="flex items-center justify-end gap-1">
          {/* Duty Slip / Voucher Button */}
          <button
            type="button"
            onClick={() => navigate(`/cabs/${cab.id}/voucher`)}
            title="Print Duty Slip / Voucher"
            className="p-1.5 text-slate-600 hover:text-[#C91F28] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4" />
          </button>

          {/* WhatsApp Direct */}
          <button
            type="button"
            onClick={() =>
              setWhatsAppModalData({
                isOpen: true,
                customerName: cab.customerName,
                customerPhone: cab.customerPhone,
                customerId: cab.customerId || undefined,
              })
            }
            title="Send WhatsApp Message"
            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* View Details */}
          <button
            type="button"
            onClick={() => navigate(`/cabs/${cab.id}`)}
            title="View Booking Details"
            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Edit */}
          <button
            type="button"
            onClick={() => {
              setEditingCab(cab);
              setIsModalOpen(true);
            }}
            title="Edit Cab Booking"
            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={() => setDeletingCab(cab)}
            title="Delete Cab Booking"
            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Group Sub-Navigation */}
      <ModuleSubNav
        items={[
          {
            name: 'Tour Bookings',
            path: '/bookings',
            icon: BookmarkCheck,
          },
          {
            name: 'Cab Bookings',
            path: '/cabs',
            icon: Car,
            count: cabs.length,
          },
        ]}
      />

      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Car className="w-5 h-5 text-[#C91F28]" />
            Cab Bookings & Tourist Transfers
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage tourist cab transfers, outstation tours, driver assignments, and vehicle duty slips.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Excel Import Input (Hidden) */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-brand-600" />
            <span>Import Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingCab(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Cab Booking</span>
          </button>
        </div>
      </div>

      {/* Import Notification Banner */}
      {importStatus.message && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
            importStatus.isError
              ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 text-rose-700 dark:text-rose-300'
              : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {importStatus.isError ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{importStatus.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setImportStatus({ loading: false, message: null, isError: false })}
            className="font-bold underline text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <span className="text-[11px] text-slate-500 font-medium block">Total Bookings</span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 block">
              {stats.total || 0}
            </span>
          </div>
          <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium block">Confirmed</span>
            <span className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1 block">
              {stats.confirmed || 0}
            </span>
          </div>
          <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium block">On Trip</span>
            <span className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-1 block">
              {stats.onTrip || 0}
            </span>
          </div>
          <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium block">Completed</span>
            <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1 block">
              {stats.completed || 0}
            </span>
          </div>
          <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <span className="text-[11px] text-[#C91F28] font-medium block">Balance Due</span>
            <span className="text-xl font-bold text-[#C91F28] mt-1 block">
              ₹{Number(stats.balanceDue || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      )}

      {/* Filter Tabs & Toolbar */}
      <div className="space-y-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setSelectedStatus(tab.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                selectedStatus === tab.value
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search, Vehicle Type, Trip Type & Date Range */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference, guest, phone, car no..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
            />
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <select
              value={selectedVehicleType}
              onChange={(e) => {
                setSelectedVehicleType(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">All Vehicles</option>
              <option value="SEDAN">Sedan</option>
              <option value="SUV">SUV</option>
              <option value="INNOVA">Innova / Crysta</option>
              <option value="TEMPO_TRAVELLER">Tempo Traveller</option>
              <option value="HATCHBACK">Hatchback</option>
              <option value="LUXURY">Luxury</option>
            </select>

            <select
              value={selectedTripType}
              onChange={(e) => {
                setSelectedTripType(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">All Trip Types</option>
              <option value="OUTSTATION">Outstation</option>
              <option value="LOCAL">Local</option>
              <option value="ONE_WAY">One-Way</option>
              <option value="ROUND_TRIP">Round Trip</option>
            </select>

            <div className="flex items-center gap-1">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Contained Responsive Data Table */}
      <DataTable
        columns={columns}
        data={cabs}
        isLoading={isLoading}
        emptyTitle="No cab bookings found"
        emptyDescription="Schedule a new tourist transfer or adjust filters to view records."
        pagination={{
          page,
          limit: 10,
          total,
          totalPages,
          onPageChange: (newPage) => setPage(newPage),
        }}
      />

      {/* WhatsApp Modal */}
      <WhatsAppModal
        isOpen={whatsAppModalData.isOpen}
        recipientName={whatsAppModalData.customerName}
        recipientPhone={whatsAppModalData.customerPhone}
        customerId={whatsAppModalData.customerId}
        onClose={() =>
          setWhatsAppModalData({ isOpen: false, customerName: '', customerPhone: '' })
        }
      />

      {/* Cab Create / Edit Modal */}
      {isModalOpen && (
        <CabModal
          isOpen={isModalOpen}
          initialData={editingCab}
          onClose={() => {
            setIsModalOpen(false);
            setEditingCab(null);
            if (searchParams.get('action') === 'create') {
              searchParams.delete('action');
              setSearchParams(searchParams);
            }
          }}
          onSuccess={() => {
            fetchCabs();
            fetchStats();
          }}
        />
      )}

      {/* Excel Import Modal */}
      {isImportOpen && (
        <CabImportModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          onSuccess={() => {
            fetchCabs();
            fetchStats();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!deletingCab}
        onClose={() => setDeletingCab(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Cab Booking"
        message={`Are you sure you want to delete cab booking ${deletingCab?.bookingReference}? This will permanently remove the record.`}
        confirmLabel="Delete Booking"
        isDanger
      />
    </div>
  );
};
