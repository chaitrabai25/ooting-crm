import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Printer,
  FileSpreadsheet,
  Copy,
  Edit2,
  Trash2,
  AlertTriangle,
  FileText,
  Calendar,
  X,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { downloadExcel } from '../../utils/exportHelper.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { Badge } from '../../components/ui/Badge.js';
import { Quotation } from '../../types/index.js';

export const QuotationList: React.FC = () => {
  const navigate = useNavigate();

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination (10 per page default)
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Quotation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchQuotations = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (search.trim()) params.append('search', search.trim());
      if (selectedStatus) params.append('status', selectedStatus);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await api.get(`/quotations?${params.toString()}`);
      setQuotations(res.data.data || []);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error('Failed to fetch quotations:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();

    // Multi-user 5-second live sync
    const pollInterval = setInterval(() => {
      fetchQuotations(true);
    }, 5000);
    return () => clearInterval(pollInterval);
  }, [page, selectedStatus, startDate, endDate]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchQuotations();
  };

  const handleDuplicate = async (quotation: Quotation) => {
    try {
      const res = await api.post(`/quotations/${quotation.id}/duplicate`);
      setActionMessage({
        type: 'success',
        text: `Duplicated into new quotation ${res.data.quotationNumber}!`,
      });
      fetchQuotations();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Failed to duplicate quotation.',
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await api.delete(`/quotations/${deleteTarget.id}`);
      setActionMessage({
        type: 'success',
        text: `Quotation ${deleteTarget.quotationNumber} deleted successfully.`,
      });
      setDeleteTarget(null);
      fetchQuotations();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Failed to delete quotation.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportExcel = async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.append('search', search.trim());
    if (selectedStatus) params.append('status', selectedStatus);

    await downloadExcel(
      `/quotations/export/excel?${params.toString()}`,
      `ooting-quotations-${Date.now()}.xlsx`
    );
  };

  const columns: Column<Quotation>[] = [
    {
      header: 'Quotation Reference',
      render: (q) => (
        <span
          onClick={() => navigate(`/quotations/${q.id}`)}
          className="font-bold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer text-xs"
        >
          {q.quotationNumber}
        </span>
      ),
    },
    {
      header: 'Customer',
      render: (q) => (
        <div>
          <span className="font-semibold text-slate-800 dark:text-slate-100 text-xs block">
            {q.customer?.fullName || 'N/A'}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            {q.customer?.phone}
          </span>
        </div>
      ),
    },
    {
      header: 'Destination & Package',
      render: (q) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-800 dark:text-slate-100 block">
            {q.destination}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {q.package?.packageName || 'Custom Itinerary'}
          </span>
        </div>
      ),
    },
    {
      header: 'Dates & Guests',
      render: (q) => (
        <div className="text-xs text-slate-600 dark:text-slate-300">
          <span>{q.adults} Adults {q.children > 0 ? `, ${q.children} Ch` : ''}</span>
          {q.travelStartDate && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-mono">
              {new Date(q.travelStartDate).toLocaleDateString('en-IN')}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Amount',
      render: (q) => (
        <div className="text-xs">
          <span className="font-bold text-slate-900 dark:text-white block">
            ₹{Number(q.finalAmount).toLocaleString('en-IN')}
          </span>
          {Number(q.additionalCharges || 0) > 0 && (
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              +₹{Number(q.additionalCharges).toLocaleString('en-IN')} add.
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      render: (q) => <Badge status={q.status} />,
    },
    {
      header: 'Created Date',
      render: (q) => (
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          {new Date(q.createdAt).toLocaleDateString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (q) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => navigate(`/quotations/${q.id}`)}
            title="View & Print Voucher"
            className="p-1.5 text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate(`/quotations/${q.id}/edit`)}
            title="Edit Quotation"
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDuplicate(q)}
            title="Duplicate Quotation"
            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(q)}
            title="Delete Quotation"
            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 pb-12">
      {/* Alert banner */}
      {actionMessage && (
        <div
          className={`px-4 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between shadow-xs ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/40 dark:text-red-300'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Quotations
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Prepare, customize, and print client proposals with Ooting branding.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 rounded-lg shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/quotations/new')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Quotation</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quotation #, customer, phone, destination..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-900 dark:text-white"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
            <option value="EXPIRED">Expired</option>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            title="Start Date"
            className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            title="End Date"
            className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200"
          />

          {(search || selectedStatus || startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedStatus('');
                setStartDate('');
                setEndDate('');
                setPage(1);
              }}
              className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-medium"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Table (Responsive with Continuous S.No.) */}
      <DataTable
        columns={columns}
        data={quotations}
        isLoading={isLoading}
        emptyTitle="No quotations generated"
        emptyDescription="Click '+ New Quotation' to create a comprehensive proposal for your client."
        pagination={{
          page,
          limit,
          total,
          totalPages,
          onPageChange: (newPage) => setPage(newPage),
        }}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Delete Quotation
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              Are you sure you want to delete quotation{' '}
              <strong className="text-slate-900 dark:text-white">
                {deleteTarget.quotationNumber}
              </strong>{' '}
              for {deleteTarget.customer?.fullName}? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
