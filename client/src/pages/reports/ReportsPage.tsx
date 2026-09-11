import React, { useState, useEffect } from 'react';
import { Download, Filter, FileSpreadsheet, Calendar, TrendingUp } from 'lucide-react';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { Badge } from '../../components/ui/Badge.js';
import { StatCard } from '../../components/ui/StatCard.js';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'bookings' | 'leads' | 'payments' | 'revenue'>('bookings');
  const [reportData, setReportData] = useState<any[]>([]);
  const [revenueSummary, setRevenueSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleExport = () => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (filterStatus) params.append('status', filterStatus);
    params.append('format', 'csv');

    window.open(`/api/reports/${activeTab}?${params.toString()}`, '_blank');
  };

  const formatCurrency = (val: number) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Reports & Statements</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Exportable operational audits, lead pipelines, booking registers, and financial summaries.
          </p>
        </div>

        {activeTab !== 'revenue' && (
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-3.5 py-1.5 rounded-lg transition-colors ${
            activeTab === 'bookings' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Bookings Register
        </button>
        <button
          onClick={() => setActiveTab('leads')}
          className={`px-3.5 py-1.5 rounded-lg transition-colors ${
            activeTab === 'leads' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Leads & Enquiries
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-3.5 py-1.5 rounded-lg transition-colors ${
            activeTab === 'payments' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Payment Collections
        </button>
        <button
          onClick={() => setActiveTab('revenue')}
          className={`px-3.5 py-1.5 rounded-lg transition-colors ${
            activeTab === 'revenue' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Financial Profit & Loss
        </button>
      </div>

      {/* Date Filters Bar (for tabular reports) */}
      {activeTab !== 'revenue' && (
        <form onSubmit={handleApplyDates} className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
          >
            Apply Filter
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
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
            />

            <StatCard
              title="Actual Received Receipts"
              value={formatCurrency(revenueSummary?.totalCollected || 0)}
              subtitle="Successful payment receipts"
              icon={TrendingUp}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
            />

            <StatCard
              title="Outstanding Balances"
              value={formatCurrency(revenueSummary?.outstanding || 0)}
              subtitle="Trip value minus receipts"
              icon={TrendingUp}
              iconBg="bg-rose-50"
              iconColor="text-rose-600"
            />

            <StatCard
              title="Recorded Operating Expenses"
              value={formatCurrency(revenueSummary?.totalExpenses || 0)}
              subtitle="Hotels, transport & tour expenses"
              icon={TrendingUp}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
            />

            <StatCard
              title="Recorded Operating Profit"
              value={formatCurrency(revenueSummary?.recordedProfit || 0)}
              subtitle="Collected receipts minus expenses"
              icon={TrendingUp}
              iconBg="bg-purple-50"
              iconColor="text-purple-600"
            />
          </div>

          <div className="p-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">Accounting Accuracy Notice:</p>
            <p>• Total Confirmed Trip Value represents the contract amount for all CONFIRMED and COMPLETED trips.</p>
            <p>• Operating Profit is calculated strictly as: <span className="font-mono text-slate-900">Total Collected Receipts - Total Recorded Expenses</span>.</p>
          </div>
        </div>
      ) : activeTab === 'bookings' ? (
        <DataTable
          columns={[
            { header: 'Booking #', accessor: 'bookingNumber' },
            { header: 'Customer', accessor: 'customerName' },
            { header: 'Phone', accessor: 'customerPhone' },
            { header: 'Package', accessor: 'packageName' },
            { header: 'Travel Date', accessor: 'startDate' },
            { header: 'Final (₹)', render: (b: any) => formatCurrency(b.finalAmount) },
            { header: 'Paid (₹)', render: (b: any) => formatCurrency(b.amountPaid) },
            { header: 'Due (₹)', render: (b: any) => formatCurrency(b.balanceDue) },
            { header: 'Status', render: (b: any) => <Badge status={b.status} /> },
          ]}
          data={reportData}
          isLoading={isLoading}
          emptyTitle="No bookings found in report"
        />
      ) : activeTab === 'leads' ? (
        <DataTable
          columns={[
            { header: 'Customer', render: (l: any) => l.customer?.fullName },
            { header: 'Phone', render: (l: any) => l.customer?.phone },
            { header: 'Destination', accessor: 'destination' },
            { header: 'Source', accessor: 'source' },
            { header: 'Staff', render: (l: any) => l.assignedUser?.name || '—' },
            { header: 'Status', render: (l: any) => <Badge status={l.enquiryStatus} /> },
            { header: 'Date', render: (l: any) => new Date(l.createdAt).toLocaleDateString() },
          ]}
          data={reportData}
          isLoading={isLoading}
          emptyTitle="No leads found in report"
        />
      ) : (
        <DataTable
          columns={[
            { header: 'Booking #', accessor: 'bookingNumber' },
            { header: 'Customer', accessor: 'customerName' },
            { header: 'Method', accessor: 'method' },
            { header: 'Reference', accessor: 'reference' },
            { header: 'Amount', render: (p: any) => formatCurrency(p.amount) },
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
