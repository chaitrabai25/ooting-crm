import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Phone,
  MessageCircle,
  Mail,
  Users,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  FileSpreadsheet,
  RotateCcw,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { Modal } from '../../components/ui/Modal.js';
import { CopyButton } from '../../components/ui/CopyButton.js';
import { WhatsAppModal } from '../../components/whatsapp/WhatsAppModal.js';
import { downloadExcel } from '../../utils/exportHelper.js';
import { ModuleSubNav } from '../../components/ui/ModuleSubNav.js';
import { Sparkles, UserCheck } from 'lucide-react';

export const FollowUpList: React.FC = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'today' | 'overdue' | 'upcoming' | 'all' | 'custom'>('today');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [counts, setCounts] = useState({ today: 0, overdue: 0, upcoming: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Pagination (10 per page default)
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // WhatsApp Modal state
  const [whatsAppModalData, setWhatsAppModalData] = useState<{
    isOpen: boolean;
    customerName: string;
    customerPhone: string;
  }>({
    isOpen: false,
    customerName: '',
    customerPhone: '',
  });

  // Reschedule Modal
  const [rescheduleItem, setRescheduleItem] = useState<any>(null);
  const [newDate, setNewDate] = useState('');
  const [rescheduleNotes, setRescheduleNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Complete Modal
  const [completeItem, setCompleteItem] = useState<any>(null);
  const [completeNotes, setCompleteNotes] = useState('');

  const fetchFollowUps = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));

      if (activeTab === 'custom' && selectedDate) {
        params.append('date', selectedDate);
      } else if (activeTab !== 'custom') {
        params.append('filter', activeTab);
      }

      const [listRes, countRes] = await Promise.all([
        api.get(`/followups?${params.toString()}`),
        api.get('/followups/counts'),
      ]);

      setFollowUps(listRes.data.data || []);
      setTotal(listRes.data.pagination?.total || (listRes.data.data || []).length);
      setTotalPages(listRes.data.pagination?.totalPages || 1);
      setCounts(countRes.data);
    } catch (err) {
      console.error('Failed to load follow-ups:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowUps();

    // Multi-user 5-second live sync
    const pollInterval = setInterval(() => {
      fetchFollowUps(true);
    }, 5000);
    return () => clearInterval(pollInterval);
  }, [activeTab, selectedDate, page]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSelectedDate(val);
    if (val) {
      setActiveTab('custom');
      setPage(1);
    }
  };

  const clearDateFilter = () => {
    setSelectedDate('');
    setActiveTab('today');
    setPage(1);
  };

  const handleExportExcel = async () => {
    const params = new URLSearchParams();
    if (activeTab) params.append('status', activeTab);
    if (selectedDate) params.append('date', selectedDate);
    await downloadExcel(`/followups/export/excel?${params.toString()}`, `ooting-followups-${Date.now()}.xlsx`);
  };

  const handleComplete = async () => {
    if (!completeItem) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/followups/${completeItem.id}/complete`, { notes: completeNotes });
      setCompleteItem(null);
      setCompleteNotes('');
      fetchFollowUps();
    } catch (err) {
      console.error('Failed to complete follow-up:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleItem || !newDate) return;
    setIsSubmitting(true);
    try {
      // Ensure local browser time is accurately preserved as ISO
      const isoDate = new Date(newDate).toISOString();
      await api.patch(`/followups/${rescheduleItem.id}/reschedule`, {
        scheduledAt: isoDate,
        notes: rescheduleNotes,
      });
      setRescheduleItem(null);
      setNewDate('');
      setRescheduleNotes('');
      fetchFollowUps();
    } catch (err) {
      console.error('Failed to reschedule:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CALL':
        return <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'WHATSAPP':
        return <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'EMAIL':
        return <Mail className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'MEETING':
        return <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Group Sub-Navigation */}
      <ModuleSubNav
        items={[
          {
            name: 'Leads',
            path: '/leads?tab=all',
            icon: UserCheck,
            matchQuery: { param: 'tab', value: 'all' },
          },
          {
            name: 'New Enquiries',
            path: '/leads?tab=new',
            icon: Sparkles,
            matchQuery: { param: 'tab', value: 'new' },
          },
          {
            name: 'Follow-ups',
            path: '/followups',
            icon: CalendarCheck,
            count: counts.today + counts.overdue + counts.upcoming,
          },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Follow-up Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Never miss client touchpoints, inquiries, and quotation closures.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Excel Export */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Tabs & Calendar Single-Day Date Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('today');
              setSelectedDate('');
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'today'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <span>Today's</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'today'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {counts.today}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('overdue');
              setSelectedDate('');
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'overdue'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Overdue</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'overdue'
                  ? 'bg-white/20 text-white'
                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
              }`}
            >
              {counts.overdue}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('upcoming');
              setSelectedDate('');
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'upcoming'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <span>Upcoming</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'upcoming'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {counts.upcoming}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('all');
              setSelectedDate('');
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            All Records
          </button>
        </div>

        {/* Calendar-Wise Date Filter (Single-Day Selection) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hidden sm:inline">
              Filter by Date:
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            />
          </div>

          {selectedDate && (
            <button
              type="button"
              onClick={clearDateFilter}
              title="Reset date filter"
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Follow-up Cards List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-20 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : followUps.length === 0 ? (
        <EmptyState
          title={
            selectedDate
              ? `No follow-ups for ${selectedDate}`
              : `No ${activeTab} follow-ups`
          }
          description={
            activeTab === 'overdue'
              ? 'Outstanding! You have no overdue follow-ups.'
              : 'No scheduled touchpoints found for this selection.'
          }
          className="my-6"
        />
      ) : (
        <div className="space-y-3">
          {followUps.map((item, idx) => {
            const isOverdue =
              new Date(item.scheduledAt) < new Date() && item.status === 'PENDING';
            const sNo = (page - 1) * limit + idx + 1;
            const customerPhone = item.lead?.customer?.phone || '';
            const customerName = item.lead?.customer?.fullName || 'Client';

            return (
              <div
                key={item.id}
                className={`bg-white dark:bg-slate-900 rounded-xl border p-4 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isOverdue
                    ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20'
                    : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  {/* S.No. Badge */}
                  <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 mt-1">
                    {sNo}
                  </span>

                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex-shrink-0 mt-0.5">
                    {getTypeIcon(item.type)}
                  </div>

                  <div className="min-w-0 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        onClick={() => navigate(`/leads/${item.leadId}`)}
                        className="font-bold text-slate-900 dark:text-slate-100 text-sm hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer"
                      >
                        {customerName}
                      </span>

                      {customerPhone && (
                        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium">
                          <span>({customerPhone})</span>
                          <CopyButton text={customerPhone} title="Copy phone" />
                        </div>
                      )}

                      <Badge status={item.status} />

                      {isOverdue && (
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 rounded-md uppercase tracking-wider">
                          Overdue
                        </span>
                      )}
                    </div>

                    <p className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Trip:
                      </span>{' '}
                      <span>{item.lead?.destination || 'Tour'}</span>
                      <span>•</span>
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {new Date(item.scheduledAt).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </span>
                      {item.assignedUser?.name && (
                        <>
                          <span>•</span>
                          <span className="text-slate-400">Staff: {item.assignedUser.name}</span>
                        </>
                      )}
                    </p>

                    {item.notes && (
                      <p className="text-slate-600 dark:text-slate-300 mt-1.5 italic bg-slate-50 dark:bg-slate-800/60 p-2 rounded-md border border-slate-100 dark:border-slate-800 max-w-xl">
                        "{item.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center text-xs">
                  {/* WhatsApp Launcher */}
                  {customerPhone && (
                    <button
                      type="button"
                      onClick={() =>
                        setWhatsAppModalData({
                          isOpen: true,
                          customerName,
                          customerPhone,
                        })
                      }
                      title="Send WhatsApp Message"
                      className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-800"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  )}

                  {item.status === 'PENDING' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setCompleteItem(item);
                          setCompleteNotes('');
                        }}
                        className="px-3 py-1.5 rounded-lg font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Complete</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRescheduleItem(item);
                          setNewDate('');
                          setRescheduleNotes('');
                        }}
                        className="px-3 py-1.5 rounded-lg font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors"
                      >
                        Reschedule
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => navigate(`/leads/${item.leadId}`)}
                    className="p-2 rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Bar */}
      {total > 0 && (
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-4 px-2 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{(page - 1) * limit + 1}</span> to{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.min(page * limit, total)}</span> of{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">{total}</span> follow-ups
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      <WhatsAppModal
        isOpen={whatsAppModalData.isOpen}
        recipientName={whatsAppModalData.customerName}
        recipientPhone={whatsAppModalData.customerPhone}
        onClose={() =>
          setWhatsAppModalData({ isOpen: false, customerName: '', customerPhone: '' })
        }
      />

      {/* Complete Follow-up Modal */}
      <Modal
        isOpen={!!completeItem}
        onClose={() => setCompleteItem(null)}
        title="Mark Follow-up Complete"
        subtitle={`Completed touchpoint with ${completeItem?.lead?.customer?.fullName}`}
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Completion Notes
            </label>
            <textarea
              rows={3}
              value={completeNotes}
              onChange={(e) => setCompleteNotes(e.target.value)}
              placeholder="e.g. Customer agreed to package itinerary, awaiting family discussion on travel dates..."
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCompleteItem(null)}
              className="px-3 py-1.5 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleComplete}
              className="px-4 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
            >
              {isSubmitting ? 'Saving...' : 'Confirm Completed'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        isOpen={!!rescheduleItem}
        onClose={() => setRescheduleItem(null)}
        title="Reschedule Follow-up"
        subtitle={`Choose new touchpoint time for ${rescheduleItem?.lead?.customer?.fullName}`}
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              New Scheduled Date & Time *
            </label>
            <input
              type="datetime-local"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Reschedule Reason
            </label>
            <textarea
              rows={2}
              value={rescheduleNotes}
              onChange={(e) => setRescheduleNotes(e.target.value)}
              placeholder="e.g. Client requested call back after 6 PM..."
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRescheduleItem(null)}
              className="px-3 py-1.5 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting || !newDate}
              onClick={handleReschedule}
              className="px-4 py-1.5 font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Reschedule'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
