import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  FileSpreadsheet,
  Upload,
  Search,
  Users,
  Eye,
  Phone,
  Mail,
  Trash2,
  Copy,
  MessageSquare,
  ArrowRight,
  CheckSquare,
  Square,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { Badge } from '../../components/ui/Badge.js';
import { CopyButton } from '../../components/ui/CopyButton.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { WhatsAppModal } from '../../components/whatsapp/WhatsAppModal.js';
import { CustomerModal } from './CustomerModal.js';
import { CustomerImportModal } from './CustomerImportModal.js';
import { ForwardCustomerModal } from './ForwardCustomerModal.js';
import { Customer } from '../../types/index.js';

export const CustomerList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('action') === 'create');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isForwardOpen, setIsForwardOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // WhatsApp Modal state
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

  // Delete Customer state
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    customer: Customer | null;
  }>({
    isOpen: false,
    customer: null,
  });

  // Action feedback alert
  const [feedback, setFeedback] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  // Selection Checkbox State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filters & Pagination (Default 10 per page)
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (search) params.append('search', search);
      if (selectedSource) params.append('source', selectedSource);
      if (selectedStatus) params.append('status', selectedStatus);

      const res = await api.get(`/customers?${params.toString()}`);
      setCustomers(res.data.data || []);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, selectedSource, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  // Excel (.xlsx) Export
  const handleExportExcel = () => {
    window.open('/api/customers/export/excel', '_blank');
  };

  // Row selection toggle
  const toggleSelectAll = () => {
    if (selectedIds.length === customers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(customers.map((c) => c.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Copy Row Handler
  const handleCopyRow = (c: Customer) => {
    const formatted = `Customer: ${c.fullName} | Phone: ${c.phone}${c.email ? ` | Email: ${c.email}` : ''}${c.city ? ` | City: ${c.city}` : ''} | Status: ${c.status}`;
    navigator.clipboard.writeText(formatted);
    setFeedback({ type: 'success', message: `Copied details for ${c.fullName} to clipboard!` });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Delete Customer Handler
  const confirmDeleteCustomer = async () => {
    if (!deleteDialog.customer) return;
    const target = deleteDialog.customer;

    try {
      const res = await api.delete(`/customers/${target.id}`);
      setFeedback({
        type: res.data.action === 'ARCHIVED' ? 'info' : 'success',
        message: res.data.message || `Customer ${target.fullName} processed successfully.`,
      });
      fetchCustomers();
      setSelectedIds((prev) => prev.filter((id) => id !== target.id));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete customer.');
    } finally {
      setDeleteDialog({ isOpen: false, customer: null });
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const isAllSelected = customers.length > 0 && selectedIds.length === customers.length;

  const columns: Column<Customer>[] = [
    {
      header: '',
      className: 'w-10 text-center',
      render: (c) => (
        <button
          type="button"
          onClick={() => toggleSelectRow(c.id)}
          className="p-1 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
        >
          {selectedIds.includes(c.id) ? (
            <CheckSquare className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          ) : (
            <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />
          )}
        </button>
      ),
    },
    {
      header: 'S.No.',
      accessor: 'sNo',
      className: 'w-16 text-center',
    },
    {
      header: 'Customer Name',
      render: (c) => (
        <div>
          <span
            onClick={() => navigate(`/customers/${c.id}`)}
            className="font-semibold text-slate-900 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer block text-xs sm:text-sm"
          >
            {c.fullName}
          </span>
          <span className="text-[11px] text-slate-400">
            Added {new Date(c.createdAt).toLocaleDateString()}
          </span>
        </div>
      ),
    },
    {
      header: 'Contact Info',
      render: (c) => (
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium">
            <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <span>{c.phone}</span>
            <CopyButton text={c.phone} title="Copy phone number" />
          </div>
          {c.email && (
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
              <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <span className="truncate max-w-[140px]">{c.email}</span>
              <CopyButton text={c.email} title="Copy email" />
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Location',
      render: (c) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {c.city ? `${c.city}${c.state ? `, ${c.state}` : ''}` : '—'}
        </span>
      ),
    },
    {
      header: 'Source',
      render: (c) => (
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
          {c.source || 'DIRECT'}
        </span>
      ),
    },
    {
      header: 'Enquiries / Bookings',
      render: (c) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {c._count?.leads ?? 0}
          </span>{' '}
          Leads /{' '}
          <span className="font-semibold text-brand-600 dark:text-brand-400">
            {c._count?.bookings ?? 0}
          </span>{' '}
          Bookings
        </div>
      ),
    },
    {
      header: 'Assigned To',
      render: (c) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {c.assignedTo?.name || (
            <span className="text-slate-400 italic">Unassigned</span>
          )}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (c) => <Badge status={c.status} />,
    },
    {
      header: 'Actions',
      className: 'text-right w-36',
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          {/* WhatsApp action */}
          <button
            type="button"
            onClick={() =>
              setWhatsAppModalData({
                isOpen: true,
                customerName: c.fullName,
                customerPhone: c.phone,
                customerId: c.id,
              })
            }
            title="Send WhatsApp Message"
            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* Copy Row action */}
          <button
            type="button"
            onClick={() => handleCopyRow(c)}
            title="Copy Customer Details"
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>

          {/* View Profile */}
          <button
            type="button"
            onClick={() => navigate(`/customers/${c.id}`)}
            title="View 360° Profile"
            className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-brand-400 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Delete Customer */}
          <button
            type="button"
            onClick={() => setDeleteDialog({ isOpen: true, customer: c })}
            title="Delete or Archive Customer"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const selectedCustomerNames = customers
    .filter((c) => selectedIds.includes(c.id))
    .map((c) => c.fullName);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Customers
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Complete database of travellers, enquiry history, and lifetime bookings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Excel (.xlsx) Export Only */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Export Excel</span>
          </button>

          {/* Excel Import Only */}
          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            <span>Import Excel</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingCustomer(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-medium animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
              : 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Bulk Action Bar (When rows selected) */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-brand-50/80 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-900 animate-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-brand-800 dark:text-brand-300">
              {selectedIds.length} customer(s) selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsForwardOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-xs transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Forward to User</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, email, city..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedSource}
            onChange={(e) => {
              setSelectedSource(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Sources</option>
            <option value="DIRECT">Direct</option>
            <option value="WEBSITE">Website</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="REFERRAL">Referral</option>
            <option value="B2B_AGENT">B2B Agent</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Customer Table */}
      <DataTable
        columns={columns}
        data={customers}
        isLoading={isLoading}
        emptyTitle="No customers in database"
        emptyDescription="Add your first customer contact or import from Excel."
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

      {/* Customer Create/Edit Modal */}
      {isModalOpen && (
        <CustomerModal
          isOpen={isModalOpen}
          initialData={editingCustomer}
          onClose={() => {
            setIsModalOpen(false);
            setEditingCustomer(null);
            if (searchParams.get('action') === 'create') {
              searchParams.delete('action');
              setSearchParams(searchParams);
            }
          }}
          onSuccess={() => {
            fetchCustomers();
          }}
        />
      )}

      {/* Import Modal */}
      {isImportOpen && (
        <CustomerImportModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          onSuccess={() => {
            fetchCustomers();
          }}
        />
      )}

      {/* Forward Selected Customers Modal */}
      {isForwardOpen && (
        <ForwardCustomerModal
          isOpen={isForwardOpen}
          customerIds={selectedIds}
          customerNames={selectedCustomerNames}
          onClose={() => setIsForwardOpen(false)}
          onSuccess={() => {
            setSelectedIds([]);
            setFeedback({
              type: 'success',
              message: `Successfully reassigned ${selectedIds.length} customer(s)!`,
            });
            fetchCustomers();
            setTimeout(() => setFeedback(null), 4000);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, customer: null })}
        onConfirm={confirmDeleteCustomer}
        title="Delete Customer"
        message={`Are you sure you want to delete "${deleteDialog.customer?.fullName}"? If the customer has existing bookings, their record will be safely archived (marked INACTIVE) to preserve accounting and travel history.`}
        confirmLabel="Delete / Archive"
        isDanger={true}
      />
    </div>
  );
};
