import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  FileSpreadsheet,
  Search,
  Eye,
  Calendar,
  Phone,
  MessageSquare,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { Badge } from '../../components/ui/Badge.js';
import { CopyButton } from '../../components/ui/CopyButton.js';
import { WhatsAppModal } from '../../components/whatsapp/WhatsAppModal.js';
import { LeadModal } from './LeadModal.js';
import { Lead } from '../../types/index.js';

export const LeadList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('action') === 'create');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

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

  // Filters & Pagination (Default 10 per page)
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
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
      params.append('limit', String(limit));
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

  const handleExportExcel = () => {
    window.open('/api/leads/export/excel', '_blank');
  };

  const columns: Column<Lead>[] = [
    {
      header: 'S.No.',
      accessor: 'sNo',
      className: 'w-16 text-center',
    },
    {
      header: 'Customer',
      render: (lead) => (
        <div>
          <span
            onClick={() => navigate(`/leads/${lead.id}`)}
            className="font-semibold text-slate-900 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer block text-xs sm:text-sm"
          >
            {lead.customer?.fullName}
          </span>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
            <Phone className="w-3 h-3 text-slate-400" />
            <span>{lead.customer?.phone}</span>
            {lead.customer?.phone && (
              <CopyButton text={lead.customer.phone} title="Copy phone" />
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Destination',
      render: (lead) => (
        <div>
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
            {lead.destination}
          </span>
          {lead.package && (
            <span className="text-[11px] text-brand-600 dark:text-brand-400 block truncate max-w-[180px]">
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
          <span className="text-slate-700 dark:text-slate-300 font-medium">
            {lead.adults}A {lead.children > 0 ? `, ${lead.children}C` : ''}
          </span>
          {lead.travelStartDate && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
              {new Date(lead.travelStartDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Budget',
      render: (lead) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
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
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {lead.assignedUser?.name || <span className="text-slate-400 italic">Unassigned</span>}
        </span>
      ),
    },
    {
      header: 'Next Follow-up',
      render: (lead) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">
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
      className: 'text-right w-24',
      render: (lead) => (
        <div className="flex items-center justify-end gap-1">
          {lead.customer?.phone && (
            <button
              type="button"
              onClick={() =>
                setWhatsAppModalData({
                  isOpen: true,
                  customerName: lead.customer?.fullName || 'Client',
                  customerPhone: lead.customer?.phone,
                  customerId: lead.customerId,
                })
              }
              title="Send WhatsApp Message"
              className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate(`/leads/${lead.id}`)}
            title="View Lead Details"
            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-brand-400 rounded-lg transition-colors"
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
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Leads & Enquiries
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Capture, qualify, follow-up, and convert travel enquiries into confirmed bookings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Strictly Excel (.xlsx) Export */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Export Excel</span>
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

      {/* Search and Priority filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search destination, name, phone..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedPriority}
            onChange={(e) => {
              setSelectedPriority(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
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
