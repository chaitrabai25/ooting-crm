import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Download,
  Search,
  Filter,
  Eye,
  Calendar,
  Sparkles,
  Phone,
  BookmarkCheck,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { Badge } from '../../components/ui/Badge.js';
import { LeadModal } from './LeadModal.js';
import { Lead, LeadStatus } from '../../types/index.js';

export const LeadList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('action') === 'create');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');

  const statusTabs: { label: string; value: string }[] = [
    { label: 'All Leads', value: '' },
    { label: 'New', value: 'NEW' },
    { label: 'Contacted', value: 'CONTACTED' },
    { label: 'Qualified', value: 'QUALIFIED' },
    { label: 'Quotation Sent', value: 'QUOTATION_SENT' },
    { label: 'Follow-up', value: 'FOLLOW_UP' },
    { label: 'Won', value: 'WON' },
    { label: 'Lost', value: 'LOST' },
  ];

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '15');
      if (search) params.append('search', search);
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedPriority) params.append('priority', selectedPriority);

      const res = await api.get(`/leads?${params.toString()}`);
      setLeads(res.data.data || []);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [page, selectedStatus, selectedPriority]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLeads();
  };

  const handleExportCSV = () => {
    window.open('/api/leads/export/csv', '_blank');
  };

  const columns: Column<Lead>[] = [
    {
      header: 'Customer',
      render: (lead) => (
        <div>
          <span
            onClick={() => navigate(`/leads/${lead.id}`)}
            className="font-semibold text-slate-900 hover:text-brand-600 cursor-pointer block"
          >
            {lead.customer?.fullName}
          </span>
          <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
            <Phone className="w-3 h-3 text-slate-400" />
            <span>{lead.customer?.phone}</span>
          </span>
        </div>
      ),
    },
    {
      header: 'Destination',
      render: (lead) => (
        <div>
          <span className="font-semibold text-slate-800">{lead.destination}</span>
          {lead.package && (
            <span className="text-[11px] text-brand-600 block truncate max-w-[180px]">
              {lead.package.packageName}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Travellers & Dates',
      render: (lead) => (
        <div className="text-xs">
          <span className="text-slate-700 font-medium">
            {lead.adults}A {lead.children > 0 ? `, ${lead.children}C` : ''}
          </span>
          {lead.travelStartDate && (
            <span className="text-[11px] text-slate-500 block">
              {new Date(lead.travelStartDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Budget',
      render: (lead) => (
        <span className="font-semibold text-slate-900">
          {lead.budget ? `₹${Number(lead.budget).toLocaleString('en-IN')}` : '—'}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (lead) => <Badge status={lead.enquiryStatus} />,
    },
    {
      header: 'Priority',
      render: (lead) => <Badge status={lead.priority} />,
    },
    {
      header: 'Assigned To',
      render: (lead) => (
        <span className="text-xs text-slate-600">
          {lead.assignedUser?.name || <span className="text-slate-400 italic">Unassigned</span>}
        </span>
      ),
    },
    {
      header: 'Next Follow-up',
      render: (lead) => (
        <span className="text-xs text-slate-600">
          {lead.nextFollowUpAt ? (
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              {new Date(lead.nextFollowUpAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </span>
          ) : (
            '—'
          )}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (lead) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => navigate(`/leads/${lead.id}`)}
            title="View Lead Details"
            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Leads & Enquiries</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Capture, qualify, follow-up, and convert travel enquiries into confirmed bookings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingLead(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Lead</span>
          </button>
        </div>
      </div>

      {/* Pipeline Status Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200">
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
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search and Priority filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search destination, name, phone..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedPriority}
            onChange={(e) => {
              setSelectedPriority(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="HIGH">High Priority</option>
            <option value="URGENT">Urgent Priority</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <DataTable
        columns={columns}
        data={leads}
        isLoading={isLoading}
        emptyTitle="No leads found"
        emptyDescription="Start adding enquiries or adjust your search filters to view records."
        pagination={{
          page,
          limit: 15,
          total,
          totalPages,
          onPageChange: (newPage) => setPage(newPage),
        }}
      />

      {/* Lead Create / Edit Modal */}
      {isModalOpen && (
        <LeadModal
          isOpen={isModalOpen}
          initialData={editingLead}
          onClose={() => {
            setIsModalOpen(false);
            setEditingLead(null);
            if (searchParams.get('action') === 'create') {
              searchParams.delete('action');
              setSearchParams(searchParams);
            }
          }}
          onSuccess={() => {
            fetchLeads();
          }}
        />
      )}
    </div>
  );
};
