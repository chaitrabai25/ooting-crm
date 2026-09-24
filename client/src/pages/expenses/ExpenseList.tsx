import React, { useState, useEffect } from 'react';
import { Plus, Receipt, FileSpreadsheet, Search, Filter, Trash2 } from 'lucide-react';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { StatCard } from '../../components/ui/StatCard.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { ExpenseModal } from './ExpenseModal.js';
import { Expense } from '../../types/index.js';
import { downloadExcel } from '../../utils/exportHelper.js';
import { useAuth } from '../../context/AuthContext.js';

export const ExpenseList: React.FC = () => {
  const { can, isSuperAdmin } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalExpense, setTotalExpense] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Default limit 10
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('');

  const fetchExpenses = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (selectedCategory) params.append('category', selectedCategory);

      const res = await api.get(`/expenses?${params.toString()}`);
      setExpenses(res.data.data || []);
      setTotalExpense(res.data.summary?.totalExpenseAmount || 0);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();

    // Multi-user 5-second live sync
    const pollInterval = setInterval(() => {
      fetchExpenses(true);
    }, 5000);
    return () => clearInterval(pollInterval);
  }, [page, selectedCategory]);

  const handleExportExcel = async () => {
    const params = new URLSearchParams();
    if (selectedCategory) params.append('category', selectedCategory);
    await downloadExcel(`/expenses/export/excel?${params.toString()}`, `ooting-expenses-${Date.now()}.xlsx`);
  };

  const formatCurrency = (val: number) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN');
  };

  const handleDeleteConfirm = async () => {
    if (!deletingExpense) return;
    try {
      setIsDeleting(true);
      await api.delete(`/expenses/${deletingExpense.id}`);
      setDeletingExpense(null);
      fetchExpenses();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete expense record.');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<Expense>[] = [
    {
      header: 'S.No.',
      accessor: 'sNo',
      className: 'w-16 text-center',
    },
    {
      header: 'Date',
      render: (e) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {new Date(e.expenseDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Category',
      render: (e) => (
        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
          {e.category.replace('_', ' ')}
        </span>
      ),
    },
    {
      header: 'Description',
      render: (e) => <span className="text-xs text-slate-700 dark:text-slate-300">{e.description}</span>,
    },
    {
      header: 'Related Booking',
      render: (e) => (
        <span className="text-xs text-brand-600 dark:text-brand-400 font-semibold">
          {e.booking ? e.booking.bookingNumber : <span className="text-slate-400 font-normal">General</span>}
        </span>
      ),
    },
    {
      header: 'Recorded By',
      render: (e) => <span className="text-xs text-slate-500 dark:text-slate-400">{e.createdBy?.name || 'Staff'}</span>,
    },
    {
      header: 'Amount',
      className: 'text-right',
      render: (e) => (
        <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
          {formatCurrency(e.amount)}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right w-20',
      render: (e) => (
        <div className="flex items-center justify-end">
          {(isSuperAdmin || can('expenses', 'delete')) && (
            <button
              type="button"
              onClick={() => setDeletingExpense(e)}
              title="Delete Expense"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Expense Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Log hotel disbursements, chauffeur fees, safari permits, and overheads to gauge actual profit.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Export Excel */}
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
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Expense Summary KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Recorded Expenses"
          value={formatCurrency(totalExpense)}
          subtitle="All operating disbursements"
          icon={Receipt}
          iconBg="bg-rose-50 dark:bg-rose-950/40"
          iconColor="text-rose-600 dark:text-rose-400"
        />
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2">
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setPage(1);
          }}
          className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">All Categories</option>
          <option value="HOTEL_BOOKING">Hotel Booking</option>
          <option value="TRANSPORT">Transport & Cab</option>
          <option value="GUIDE">Local Tour Guide</option>
          <option value="FLIGHT_TICKETS">Flight Tickets</option>
          <option value="ENTRY_FEES">Monument / Park Entry</option>
          <option value="MARKETING">Marketing & Advertising</option>
          <option value="OFFICE">Office & Administration</option>
          <option value="MISC">Miscellaneous</option>
        </select>
      </div>

      {/* Expenses Table */}
      <DataTable
        columns={columns}
        data={expenses}
        isLoading={isLoading}
        emptyTitle="No expenses recorded"
        emptyDescription="Log your hotel, travel, and operational vendor payments to compute exact trip profits."
        pagination={{
          page,
          limit: 10,
          total,
          totalPages,
          onPageChange: (newPage) => setPage(newPage),
        }}
      />

      {/* Modal */}
      {isModalOpen && (
        <ExpenseModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => fetchExpenses()}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingExpense}
        onClose={() => setDeletingExpense(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Expense Record"
        message={`Are you sure you want to delete this ${deletingExpense?.category?.replace('_', ' ')} expense record for ${formatCurrency(deletingExpense?.amount || 0)}? This action cannot be undone.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Expense'}
        isDanger={true}
      />
    </div>
  );
};
