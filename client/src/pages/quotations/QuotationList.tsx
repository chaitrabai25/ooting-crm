import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Printer, FileText, Phone } from 'lucide-react';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { Badge } from '../../components/ui/Badge.js';
import { Quotation } from '../../types/index.js';

export const QuotationList: React.FC = () => {
  const navigate = useNavigate();

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const fetchQuotations = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '15');
      if (search) params.append('search', search);
      if (selectedStatus) params.append('status', selectedStatus);

      const res = await api.get(`/quotations?${params.toString()}`);
      setQuotations(res.data.data || []);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error('Failed to fetch quotations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [page, selectedStatus]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchQuotations();
  };

  const columns: Column<Quotation>[] = [
    {
      header: 'Quotation #',
      render: (q) => (
        <span
          onClick={() => navigate(`/quotations/${q.id}`)}
          className="font-bold text-brand-600 hover:underline cursor-pointer text-xs"
        >
          {q.quotationNumber}
        </span>
      ),
    },
    {
      header: 'Customer',
      render: (q) => (
        <div>
          <span className="font-semibold text-slate-800 text-xs block">{q.customer?.fullName}</span>
          <span className="text-[11px] text-slate-500">{q.customer?.phone}</span>
        </div>
      ),
    },
    {
      header: 'Destination & Package',
      render: (q) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-800 block">{q.destination}</span>
          <span className="text-[11px] text-slate-500">{q.package?.packageName || 'Custom Package'}</span>
        </div>
      ),
    },
    {
      header: 'Dates & Travellers',
      render: (q) => (
        <div className="text-xs text-slate-600">
          <span>{q.adults} Adults {q.children > 0 ? `, ${q.children} Children` : ''}</span>
          {q.travelStartDate && (
            <span className="text-[11px] text-slate-500 block">
              {new Date(q.travelStartDate).toLocaleDateString()}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Final Amount',
      render: (q) => (
        <span className="font-bold text-slate-900 text-xs">
          ₹{Number(q.finalAmount).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (q) => <Badge status={q.status} />,
    },
    {
      header: 'Created Date',
      render: (q) => (
        <span className="text-xs text-slate-500">
          {new Date(q.createdAt).toLocaleDateString()}
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
            title="View & Print Quotation"
            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Quotations</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Prepare, customize, and print client proposals with Ooting branding.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/quotations/builder')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Quotation</span>
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
            placeholder="Search quotation #, customer, destination..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={quotations}
        isLoading={isLoading}
        emptyTitle="No quotations generated"
        emptyDescription="Draft a quotation for any client or convert an enquiry directly."
        pagination={{
          page,
          limit: 15,
          total,
          totalPages,
          onPageChange: (newPage) => setPage(newPage),
        }}
      />
    </div>
  );
};
