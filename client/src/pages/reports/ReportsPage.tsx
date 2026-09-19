import React, { useState, useEffect } from 'react';
import {
  Download,
  Filter,
  FileSpreadsheet,
  Calendar,
  TrendingUp,
  RefreshCw,
  DollarSign,
  CreditCard,
  Sparkles,
  BookmarkCheck,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { Badge } from '../../components/ui/Badge.js';
import { StatCard } from '../../components/ui/StatCard.js';
import { downloadExcel, downloadCsv } from '../../utils/exportHelper.js';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'bookings' | 'leads' | 'payments' | 'revenue'>('bookings');
  const [reportData, setReportData] = useState<any[]>([]);
  const [revenueSummary, setRevenueSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchReport = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (filterStatus) params.append('status', filterStatus);

      if (activeTab === 'revenue') {
        const res = await api.get('/reports/revenue');
        setRevenueSummary(res.data.summary || {});
      } else {
        const res = await api.get(`/reports/${activeTab}?${params.toString()}`);
        setReportData(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab, filterStatus]);

  const handleApplyDates = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReport();
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setFilterStatus('');
    setTimeout(() => {
      fetchReport();
    }, 0);
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (filterStatus) params.append('status', filterStatus);
      params.append('format', 'xlsx');

      const filename = `ooting-${activeTab}-report-${Date.now()}.xlsx`;
      await downloadExcel(`/reports/${activeTab}?${params.toString()}`, filename);
    } catch (err) {
      console.error('Export Excel error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (filterStatus) params.append('status', filterStatus);
      params.append('format', 'csv');

      const filename = `ooting-${activeTab}-report-${Date.now()}.csv`;
      await downloadCsv(`/reports/${activeTab}?${params.toString()}`, filename);
    } catch (err) {
      console.error('Export CSV error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-[#C91F28] dark:text-brand-400" />
            Business Reports & Financial Statements
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Exportable operational audits, lead pipelines, booking registers, and financial P&L statements.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeTab !== 'revenue' && (
            <>
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={isExporting}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Export Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                disabled={isExporting}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span>Export CSV</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => {
            setActiveTab('bookings');
            setFilterStatus('');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'bookings'
              ? 'bg-[#C91F28] text-white shadow-sm font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BookmarkCheck className="w-4 h-4" />
          <span>Bookings Register</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('leads');
            setFilterStatus('');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'leads'
              ? 'bg-[#C91F28] text-white shadow-sm font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Leads & Enquiries</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('payments');
            setFilterStatus('');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'payments'
              ? 'bg-[#C91F28] text-white shadow-sm font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Payment Collections</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('revenue');
            setFilterStatus('');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'revenue'
              ? 'bg-[#C91F28] text-white shadow-sm font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Financial Profit & Loss</span>
        </button>
      </div>

      {/* Date & Status Filters Bar (for tabular reports) */}
      {activeTab !== 'revenue' && (
        <form
          onSubmit={handleApplyDates}
          className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs shadow-sm"
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#C91F28]"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#C91F28]"
              />
            </div>

            {activeTab === 'bookings' && (
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-[#C91F28]"
              >
                <option value="">All Booking Statuses</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            )}

            {activeTab === 'leads' && (
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-[#C91F28]"
              >
                <option value="">All Lead Statuses</option>
                <option value="NEW">New</option>
                <option value="CONTACTED">Contacted</option>
                <option value="QUALIFIED">Qualified</option>
                <option value="QUOTATION_SENT">Quotation Sent</option>
                <option value="WON">Won</option>
                <option value="LOST">Lost</option>
              </select>
            )}

            <button
              type="submit"
              className="px-4 py-1.5 bg-[#C91F28] hover:bg-[#A8171F] text-white font-bold rounded-xl shadow-xs transition-colors"
            >
              Apply Filter
            </button>

            {(startDate || endDate || filterStatus) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-semibold rounded-xl transition-colors"
              >
                Reset
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={fetchReport}
            className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
            title="Refresh Report Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Tab Contents */}
      {activeTab === 'revenue' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <StatCard
              title="Total Confirmed Trip Value"
              value={formatCurrency(revenueSummary?.totalBookingValue || 0)}
              subtitle="Sum of valid confirmed bookings"
              icon={TrendingUp}
              iconBg="bg-blue-50 dark:bg-blue-950/40"
              iconColor="text-blue-600 dark:text-blue-400"
            />

            <StatCard
              title="Actual Received Receipts"
              value={formatCurrency(revenueSummary?.totalCollected || 0)}
              subtitle="Successful payment receipts"
              icon={TrendingUp}
              iconBg="bg-emerald-50 dark:bg-emerald-950/40"
              iconColor="text-emerald-600 dark:text-emerald-400"
            />

            <StatCard
              title="Outstanding Balances"
              value={formatCurrency(revenueSummary?.outstanding || 0)}
              subtitle="Trip value minus receipts"
              icon={TrendingUp}
              iconBg="bg-rose-50 dark:bg-rose-950/40"
              iconColor="text-rose-600 dark:text-rose-400"
            />

            <StatCard
              title="Recorded Operating Expenses"
              value={formatCurrency(revenueSummary?.totalExpenses || 0)}
              subtitle="Hotels, transport & tour expenses"
              icon={TrendingUp}
              iconBg="bg-amber-50 dark:bg-amber-950/40"
              iconColor="text-amber-600 dark:text-amber-400"
            />

            <StatCard
              title="Recorded Operating Profit"
              value={formatCurrency(revenueSummary?.recordedProfit || 0)}
              subtitle="Collected receipts minus expenses"
              icon={TrendingUp}
              iconBg="bg-purple-50 dark:bg-purple-950/40"
              iconColor="text-purple-600 dark:text-purple-400"
            />
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-600 dark:text-slate-300 space-y-1.5 shadow-sm">
            <p className="font-bold text-slate-900 dark:text-white">Accounting Accuracy Notice:</p>
            <p>• Total Confirmed Trip Value represents the contract amount for all CONFIRMED and COMPLETED trips.</p>
            <p>
              • Operating Profit is calculated strictly as:{' '}
              <span className="font-mono font-bold text-[#C91F28] dark:text-brand-400">
                Total Collected Receipts - Total Recorded Expenses
              </span>
              .
            </p>
          </div>
        </div>
      ) : activeTab === 'bookings' ? (
        <DataTable
          columns={[
            { header: 'Booking #', accessor: 'bookingNumber', className: 'font-mono text-xs' },
            { header: 'Customer', accessor: 'customerName', className: 'font-semibold text-slate-900 dark:text-slate-100' },
            { header: 'Phone', accessor: 'customerPhone' },
            { header: 'Package', accessor: 'packageName' },
            { header: 'Travel Date', accessor: 'startDate' },
            { header: 'Final (₹)', render: (b: any) => formatCurrency(b.finalAmount), className: 'font-bold' },
            { header: 'Paid (₹)', render: (b: any) => formatCurrency(b.amountPaid), className: 'text-emerald-600 dark:text-emerald-400 font-semibold' },
            { header: 'Due (₹)', render: (b: any) => formatCurrency(b.balanceDue), className: 'text-rose-600 dark:text-rose-400 font-semibold' },
            { header: 'Status', render: (b: any) => <Badge status={b.status} /> },
          ]}
          data={reportData}
          isLoading={isLoading}
          emptyTitle="No bookings found in report"
        />
      ) : activeTab === 'leads' ? (
        <DataTable
          columns={[
            { header: 'Customer', render: (l: any) => <span className="font-semibold text-slate-900 dark:text-slate-100">{l.customer?.fullName}</span> },
            { header: 'Phone', render: (l: any) => l.customer?.phone },
            { header: 'Destination', accessor: 'destination' },
            { header: 'Source', accessor: 'source' },
            { header: 'Budget', render: (l: any) => formatCurrency(l.budget) },
            { header: 'Staff', render: (l: any) => l.assignedUser?.name || '—' },
            { header: 'Status', render: (l: any) => <Badge status={l.enquiryStatus} /> },
            { header: 'Date', render: (l: any) => new Date(l.createdAt).toLocaleDateString('en-IN') },
          ]}
          data={reportData}
          isLoading={isLoading}
          emptyTitle="No leads found in report"
        />
      ) : (
        <DataTable
          columns={[
            { header: 'Booking #', accessor: 'bookingNumber', className: 'font-mono text-xs' },
            { header: 'Customer', accessor: 'customerName', className: 'font-semibold text-slate-900 dark:text-slate-100' },
            { header: 'Method', accessor: 'method' },
            { header: 'Reference', accessor: 'reference', className: 'font-mono text-[11px]' },
            { header: 'Amount', render: (p: any) => <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(p.amount)}</span> },
            { header: 'Status', render: (p: any) => <Badge status={p.status} /> },
            { header: 'Date', accessor: 'paymentDate' },
          ]}
          data={reportData}
          isLoading={isLoading}
          emptyTitle="No payments found in report"
        />
      )}
    </div>
  );
};
export default ReportsPage;
