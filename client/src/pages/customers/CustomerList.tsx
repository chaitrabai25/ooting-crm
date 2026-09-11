import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Download,
  Upload,
  Search,
  Users,
  Eye,
  Phone,
  Mail,
  MapPin,
  Calendar,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { Badge } from '../../components/ui/Badge.js';
import { CustomerModal } from './CustomerModal.js';
import { CustomerImportModal } from './CustomerImportModal.js';
import { Customer } from '../../types/index.js';

export const CustomerList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('action') === 'create');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Filters & Pagination
  const [page, setPage] = useState(1);
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
      params.append('limit', '15');
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

  const handleExportCSV = () => {
    window.open('/api/customers/export/csv', '_blank');
  };

  const columns: Column<Customer>[] = [
    {
      header: 'Customer Name',
      render: (c) => (
        <div>
          <span
            onClick={() => navigate(`/customers/${c.id}`)}
            className="font-semibold text-slate-900 hover:text-brand-600 cursor-pointer block"
          >
            {c.fullName}
          </span>
          <span className="text-[11px] text-slate-500">Added {new Date(c.createdAt).toLocaleDateString()}</span>
        </div>
      ),
    },
    {
      header: 'Contact Info',
      render: (c) => (
        <div className="text-xs space-y-0.5">
          <div className="flex items-center gap-1 text-slate-800 font-medium">
            <Phone className="w-3 h-3 text-slate-400" />
            <span>{c.phone}</span>
          </div>
          {c.email && (
            <div className="flex items-center gap-1 text-slate-500 text-[11px]">
              <Mail className="w-3 h-3 text-slate-400" />
              <span>{c.email}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Location',
      render: (c) => (
        <span className="text-xs text-slate-600">
          {c.city ? `${c.city}${c.state ? `, ${c.state}` : ''}` : '—'}
        </span>
      ),
    },
    {
      header: 'Source',
      render: (c) => (
        <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
          {c.source || 'DIRECT'}
        </span>
      ),
    },
    {
      header: 'Enquiries / Bookings',
      render: (c) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-800">{c._count?.leads ?? 0}</span> Leads /{' '}
          <span className="font-semibold text-brand-600">{c._count?.bookings ?? 0}</span> Bookings
        </div>
      ),
    },
    {
      header: 'Assigned To',
      render: (c) => (
        <span className="text-xs text-slate-600">
          {c.assignedTo?.name || <span className="text-slate-400 italic">Unassigned</span>}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (c) => <Badge status={c.status} />,
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => navigate(`/customers/${c.id}`)}
            title="View 360° Profile"
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
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Customers</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete database of travellers, enquiry history, and lifetime bookings.
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
            onClick={() => setIsImportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingCustomer(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, email, city..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedSource}
            onChange={(e) => {
              setSelectedSource(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
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
            className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
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
        emptyDescription="Add your first customer contact or import from CSV."
        pagination={{
          page,
          limit: 15,
          total,
          totalPages,
          onPageChange: (newPage) => setPage(newPage),
        }}
      />

      {/* Customer Modal */}
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
    </div>
  );
};
