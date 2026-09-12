import React from 'react';
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { EmptyState } from './EmptyState.js';

export interface Column<T> {
  header: string;
  accessor?: keyof T | 'sNo' | string;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
  sortKey?: string;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    onPageChange: (newPage: number) => void;
  };
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  isLoading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There are currently no records matching your criteria.',
  sortField,
  sortOrder,
  onSort,
  pagination,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm animate-pulse">
        <div className="h-12 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 border-b border-slate-100 dark:border-slate-800/40 px-6 flex items-center gap-4">
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} className="my-4" />;
  }

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm transition-colors">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-850 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">
              {columns.map((col, idx) => {
                const key = col.sortKey || (col.sortable && col.accessor && col.accessor !== 'sNo' ? String(col.accessor) : undefined);
                const isCurrentSort = !!key && sortField === key;

                return (
                  <th key={idx} className={`px-5 py-3.5 ${col.className || ''}`}>
                    {key && onSort ? (
                      <button
                        type="button"
                        onClick={() => onSort(key)}
                        className="inline-flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors group cursor-pointer"
                      >
                        <span>{col.header}</span>
                        <span className="p-0.5 rounded group-hover:bg-red-50 dark:group-hover:bg-red-950/40">
                          {isCurrentSort ? (
                            sortOrder === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100" />
                          )}
                        </span>
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
            {data.map((item, rowIdx) => (
              <tr
                key={item.id ? String(item.id) : rowIdx}
                className="hover:bg-slate-50/70 dark:hover:bg-slate-850/60 transition-colors"
              >
                {columns.map((col, colIdx) => {
                  let cellContent: React.ReactNode = null;

                  if (col.render) {
                    cellContent = col.render(item, rowIdx);
                  } else if (col.accessor === 'sNo' || col.header === 'S.No.' || col.header === 'S. No.') {
                    // Universal Serial Number Calculation with real pagination offset
                    const pageOffset = pagination ? (pagination.page - 1) * pagination.limit : 0;
                    cellContent = (
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400 font-semibold">
                        {pageOffset + rowIdx + 1}
                      </span>
                    );
                  } else if (col.accessor) {
                    cellContent = (item as any)[col.accessor];
                  }

                  return (
                    <td key={colIdx} className={`px-5 py-3.5 text-slate-700 dark:text-slate-300 ${col.className || ''}`}>
                      {cellContent}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.total > 0 && (
        <div className="flex flex-wrap items-center justify-between border-t border-slate-200 dark:border-slate-800 px-6 py-3 bg-white dark:bg-slate-900 text-xs text-slate-500 dark:text-slate-400 gap-3">
          <div>
            Showing{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {(pagination.page - 1) * pagination.limit + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {pagination.total}
            </span>{' '}
            records
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2 font-medium text-slate-700 dark:text-slate-300">
              Page <span className="font-bold text-brand-600 dark:text-brand-400">{pagination.page}</span> of {Math.max(1, pagination.totalPages)}
            </span>

            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
