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
  UserCheck,
  FileText,
  BookmarkCheck,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Upload,
  Trash2,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { Badge } from '../../components/ui/Badge.js';
import { CopyButton } from '../../components/ui/CopyButton.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { WhatsAppModal } from '../../components/whatsapp/WhatsAppModal.js';
import { LeadModal } from './LeadModal.js';
import { LeadImportModal } from './LeadImportModal.js';
import { Lead } from '../../types/index.js';
import { downloadExcel } from '../../utils/exportHelper.js';
import { useAuth } from '../../context/AuthContext.js';

export const LeadList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { can, isSuperAdmin } = useAuth();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('action') === 'create');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deletingLead, setDeletingLead] = useState<Lead | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Conversion status toast
  const [actionMessage, setActionMessage] = useState<{ text: string; isError?: boolean } | null>(null);

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

  // Dual Tabs & Filters (Default 'all' so all leads are visible immediately)
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'existing'>('all');
  const [leadCounts, setLeadCounts] = useState<{ new: number; existing: number }>({ new: 0, existing: 0 });

  // Pagination (Default 10 per page)
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');

  const statusOptions: { label: string; value: string }[] = [
    { label: 'All Sub-statuses', value: '' },
    { label: 'New', value: 'NEW' },
    { label: 'Contacted', value: 'CONTACTED' },
    { label: 'Qualified', value: 'QUALIFIED' },
    { label: 'Quotation Sent', value: 'QUOTATION_SENT' },
    { label: 'Follow-up', value: 'FOLLOW_UP' },
    { label: 'Won', value: 'WON' },
    { label: 'Lost', value: 'LOST' },
  ];

  const fetchLeads = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (search.trim()) params.append('search', search.trim());
      if (selectedPriority) params.append('priority', selectedPriority);

      // Tab logic
      if (activeTab === 'new') {
        params.append('tab', 'new');
      } else if (activeTab === 'existing') {
        params.append('tab', 'existing');
      }

      if (selectedStatus) {
        params.append('status', selectedStatus);
      }

      const res = await api.get(`/leads?${params.toString()}`);
      setLeads(res.data.data || []);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);

      if (res.data.counts) {
        setLeadCounts(res.data.counts);
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();

    // Silent background auto-refresh every 60 seconds
    const pollInterval = setInterval(() => {
      fetchLeads(true);
    }, 60000);
    return () => clearInterval(pollInterval);
  }, [page, activeTab, selectedStatus, selectedPriority]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLeads();
  };

  const handleExportExcel = async () => {
    const params = new URLSearchParams();
    if (activeTab !== 'all') params.append('tab', activeTab);
    if (selectedStatus) params.append('status', selectedStatus);
    if (search.trim()) params.append('search', search.trim());
    await downloadExcel(`/leads/export/excel?${params.toString()}`, `ooting-leads-${Date.now()}.xlsx`);
  };

  // Conversions
  const handleConvertToCustomer = async (lead: Lead) => {
    try {
      const res = await api.post(`/leads/${lead.id}/convert-customer`);
      setActionMessage({ text: 'Lead successfully linked as a customer!' });
      setTimeout(() => setActionMessage(null), 4000);
      if (res.data.customer?.id) {
        navigate(`/customers/${res.data.customer.id}`);
      } else {
        fetchLeads();
      }
    } catch (err: any) {
      setActionMessage({ text: err.response?.data?.message || 'Failed to convert to customer', isError: true });
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleConvertToQuotation = async (lead: Lead) => {
    try {
      const res = await api.post(`/leads/${lead.id}/convert-quotation`);
      setActionMessage({ text: 'Quotation created from lead details!' });
      setTimeout(() => setActionMessage(null), 4000);
      if (res.data.quotation?.id) {
        navigate(`/quotations/${res.data.quotation.id}/edit`);
      } else {
        navigate('/quotations/new?leadId=' + lead.id);
      }
    } catch (err: any) {
      setActionMessage({ text: err.response?.data?.message || 'Failed to generate quotation', isError: true });
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleConvertToBooking = async (lead: Lead) => {
    try {
      const res = await api.post(`/leads/${lead.id}/convert-booking`);
      setActionMessage({ text: 'Tour booking confirmed from lead!' });
      setTimeout(() => setActionMessage(null), 4000);
      if (res.data.booking?.id) {
        navigate(`/bookings/${res.data.booking.id}`);
      } else {
        fetchLeads();
      }
    } catch (err: any) {
      setActionMessage({ text: err.response?.data?.message || 'Failed to convert to booking', isError: true });
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingLead) return;
    try {
      setIsDeleting(true);
      await api.delete(`/leads/${deletingLead.id}`);
      setDeletingLead(null);
      setActionMessage({ text: 'Lead enquiry deleted successfully.' });
      fetchLeads();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete lead.');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<Lead>[] = [
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
      header: 'Customer',
      render: (lead) => (
        <div>
          <span
            onClick={() => navigate(`/leads/${lead.id}`)}
            className="font-semibold text-slate-900 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer block text-xs"
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
      header: 'Destination & Package',
      render: (lead) => (
        <div>
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs block">
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
            {lead.adults} Adults {lead.children > 0 ? `, ${lead.children} Child` : ''}
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
      header: 'Quick Conversion & Actions',
      className: 'text-right w-44',
      render: (lead) => (
        <div className="flex items-center justify-end gap-1">
          {/* Conversion Shortcuts */}
          <button
            type="button"
            onClick={() => handleConvertToCustomer(lead)}
            title="Convert to Customer"
            className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handleConvertToQuotation(lead)}
            title="Generate Quotation"
            className="p-1.5 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handleConvertToBooking(lead)}
            title="Convert to Confirmed Booking"
            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
          >
            <BookmarkCheck className="w-3.5 h-3.5" />
          </button>

          {/* WhatsApp Direct */}
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
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
          )}

          {/* View Details */}
          <button
            type="button"
            onClick={() => navigate(`/leads/${lead.id}`)}
            title="View Lead Details"
            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {/* Delete Lead */}
          {(isSuperAdmin || can('leads', 'delete')) && (
            <button
              type="button"
              onClick={() => setDeletingLead(lead)}
              title="Delete Enquiry"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
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
            onClick={() => setIsImportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Import Excel</span>
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
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionMessage && (
        <div
          className={`p-3 rounded-xl border flex items-center gap-2 text-xs ${
            actionMessage.isError
              ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 text-rose-700 dark:text-rose-300'
              : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          {actionMessage.isError ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Primary Tabs: All Enquiries, New Leads, Existing Leads */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab('all');
            setPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'all'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span>All Enquiries</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              activeTab === 'all'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {leadCounts.new + leadCounts.existing}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('new');
            setPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'new'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span>New Leads</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              activeTab === 'new'
                ? 'bg-white/20 text-white'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
            }`}
          >
            {leadCounts.new}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('existing');
            setPage(1);
          }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'existing'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span>In Progress / Follow-up</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              activeTab === 'existing'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {leadCounts.existing}
          </span>
        </button>
      </div>

      {/* Search and Sub-filters */}
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
          {activeTab === 'all' && (
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {statusOptions.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          )}

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

      {/* Lead Import Modal */}
      {isImportOpen && (
        <LeadImportModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          onSuccess={() => {
            fetchLeads();
            setActionMessage({ text: 'Leads successfully imported from Excel!' });
            setTimeout(() => setActionMessage(null), 4000);
          }}
        />
      )}

      {/* Delete Lead Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingLead}
        onClose={() => setDeletingLead(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Lead Enquiry"
        message={`Are you sure you want to delete lead enquiry for "${deletingLead?.customer?.fullName || 'this customer'}" (${deletingLead?.destination || 'Tour'})? Associated unbooked quotations and follow-ups will be removed. This cannot be undone.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Lead'}
        isDanger={true}
      />
    </div>
  );
};
