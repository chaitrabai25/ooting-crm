import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Briefcase,
  Phone,
  Mail,
  Eye,
  Star,
  ExternalLink,
  FileSpreadsheet,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { Badge } from '../../components/ui/Badge.js';
import { CopyButton } from '../../components/ui/CopyButton.js';
import { WhatsAppModal } from '../../components/whatsapp/WhatsAppModal.js';
import { AgentModal } from './AgentModal.js';
import { AgentImportModal } from './AgentImportModal.js';
import { Agent } from '../../types/index.js';
import { downloadExcel } from '../../utils/exportHelper.js';

export const AgentList: React.FC = () => {
  const navigate = useNavigate();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  // WhatsApp modal state
  const [whatsAppModalData, setWhatsAppModalData] = useState<{
    isOpen: boolean;
    customerName: string;
    customerPhone: string;
  }>({
    isOpen: false,
    customerName: '',
    customerPhone: '',
  });

  // Default limit 10
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchAgents = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (search.trim()) params.append('search', search.trim());
      if (sortBy) params.append('sortBy', sortBy);
      if (sortOrder) params.append('sortOrder', sortOrder);

      const res = await api.get(`/agents?${params.toString()}`);
      setAgents(res.data.data || []);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [page, sortBy, sortOrder]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAgents();
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleExportExcel = async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.append('search', search.trim());
    await downloadExcel(`/agents/export/excel?${params.toString()}`, `ooting-b2b-agents-${Date.now()}.xlsx`);
  };

  const formatCurrency = (val: number) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN');
  };

  const columns: Column<Agent>[] = [
    {
      header: 'S.No.',
      accessor: 'sNo',
      className: 'w-16 text-center',
    },
    {
      header: 'Agency / Company',
      sortKey: 'companyName',
      render: (a) => (
        <div>
          <span
            onClick={() => navigate(`/agents/${a.id}`)}
            className="font-bold text-slate-900 dark:text-slate-100 hover:text-[#C91F28] dark:hover:text-brand-400 cursor-pointer block text-xs sm:text-sm"
          >
            {a.companyName}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Contact: {a.contactPerson}
          </span>
        </div>
      ),
    },
    {
      header: 'Contact Info',
      render: (a) => (
        <div className="text-xs space-y-0.5">
          <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
            <Phone className="w-3 h-3 text-slate-400" />
            <span>{a.phone}</span>
            <CopyButton text={a.phone} title="Copy agent phone" />
          </div>
          {a.email && (
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
              <Mail className="w-3 h-3 text-slate-400" />
              <span>{a.email}</span>
              <CopyButton text={a.email} title="Copy agent email" />
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'City & GST',
      sortKey: 'city',
      render: (a) => (
        <div className="text-xs text-slate-600 dark:text-slate-300">
          <span>{a.city || '—'}</span>
          {a.gstNumber && (
            <span className="text-[10px] text-slate-400 block font-mono">
              {a.gstNumber}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Google Review',
      render: (a) => (
        <div>
          {a.googleReviewUrl ? (
            <a
              href={a.googleReviewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-[11px] font-semibold transition-colors group"
            >
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>{a.googleReviewRating ? `${a.googleReviewRating}★` : 'Review'}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
            </a>
          ) : (
            <span className="text-slate-400 text-[11px]">—</span>
          )}
        </div>
      ),
    },
    {
      header: 'Bookings',
      render: (a) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
          {a.totalBookings || 0} Bookings
        </span>
      ),
    },
    {
      header: 'Total Revenue',
      render: (a) => (
        <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
          {formatCurrency(a.totalRevenue || 0)}
        </span>
      ),
    },
    {
      header: 'Commission',
      render: (a) => (
        <div className="text-xs">
          <span className="font-bold text-emerald-600 dark:text-emerald-400 block">
            {formatCurrency(a.totalCommission || 0)}
          </span>
          {(a.pendingCommission || 0) > 0 && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 block">
              Pending: {formatCurrency(a.pendingCommission || 0)}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      sortKey: 'status',
      render: (a) => <Badge status={a.status} />,
    },
    {
      header: 'Actions',
      className: 'text-right w-28',
      render: (a) => (
        <div className="flex items-center justify-end gap-1">
          {a.phone && (
            <button
              type="button"
              onClick={() =>
                setWhatsAppModalData({
                  isOpen: true,
                  customerName: a.contactPerson || a.companyName,
                  customerPhone: a.phone,
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
            onClick={() => navigate('/agents/' + a.id)}
            title="View Agent Profile"
            className="p-1.5 text-slate-500 hover:text-[#C91F28] hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            B2B Travel Agents
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage partner agencies, wholesale travel bookings, and Google Review reputations
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Export Excel</span>
          </button>

          {/* Import Excel */}
          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            <span>Import Excel</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingAgent(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#C91F28] hover:bg-[#a81920] rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register B2B Agent</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agency name, contact person, phone, city..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#C91F28] transition-colors"
          />
        </form>

        <button
          type="button"
          onClick={() => fetchAgents()}
          className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#C91F28]' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={agents}
        isLoading={isLoading}
        sortField={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        emptyTitle="No B2B agents found"
        emptyDescription="Register your first wholesale travel agency partner or import via Excel."
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
        onClose={() =>
          setWhatsAppModalData({ isOpen: false, customerName: '', customerPhone: '' })
        }
      />

      {/* Register / Edit Modal */}
      {isModalOpen && (
        <AgentModal
          isOpen={isModalOpen}
          initialData={editingAgent}
          onClose={() => {
            setIsModalOpen(false);
            setEditingAgent(null);
          }}
          onSuccess={() => {
            fetchAgents();
          }}
        />
      )}

      {/* Excel Import Modal */}
      {isImportOpen && (
        <AgentImportModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          onSuccess={() => {
            fetchAgents();
          }}
        />
      )}
    </div>
  );
};
