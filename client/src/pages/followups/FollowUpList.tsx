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
  Plus,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { Modal } from '../../components/ui/Modal.js';

export const FollowUpList: React.FC = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'today' | 'overdue' | 'upcoming' | 'all'>('today');
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [counts, setCounts] = useState({ today: 0, overdue: 0, upcoming: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Reschedule Modal
  const [rescheduleItem, setRescheduleItem] = useState<any>(null);
  const [newDate, setNewDate] = useState('');
  const [rescheduleNotes, setRescheduleNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Complete Modal
  const [completeItem, setCompleteItem] = useState<any>(null);
  const [completeNotes, setCompleteNotes] = useState('');

  const fetchFollowUps = async () => {
    try {
      setIsLoading(true);
      const [listRes, countRes] = await Promise.all([
        api.get(`/followups?filter=${activeTab}&limit=50`),
        api.get('/followups/counts'),
      ]);
      setFollowUps(listRes.data.data || []);
      setCounts(countRes.data);
    } catch (err) {
      console.error('Failed to load follow-ups:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, [activeTab]);

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
      await api.patch(`/followups/${rescheduleItem.id}/reschedule`, {
        scheduledAt: newDate,
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
        return <Phone className="w-4 h-4 text-blue-600" />;
      case 'WHATSAPP':
        return <MessageCircle className="w-4 h-4 text-emerald-600" />;
      case 'EMAIL':
        return <Mail className="w-4 h-4 text-purple-600" />;
      case 'MEETING':
        return <Users className="w-4 h-4 text-amber-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Follow-up Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Never miss client touchpoints, inquiries, and quotation closures.
          </p>
        </div>
      </div>

      {/* Tabs with Count Badges */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('today')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'today'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Today's Follow-ups</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'today' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {counts.today}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('overdue')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'overdue'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Overdue</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'overdue' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
            }`}
          >
            {counts.overdue}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'upcoming'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Upcoming</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'upcoming' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {counts.upcoming}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'all'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          All Records
        </button>
      </div>

      {/* Follow-up Cards List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : followUps.length === 0 ? (
        <EmptyState
          title={`No ${activeTab} follow-ups`}
          description={
            activeTab === 'overdue'
              ? 'Outstanding! You have no overdue follow-ups.'
              : 'No scheduled touchpoints found for this filter.'
          }
          className="my-6"
        />
      ) : (
        <div className="space-y-3">
          {followUps.map((item) => {
            const isOverdue = new Date(item.scheduledAt) < new Date() && item.status === 'PENDING';

            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl border p-4 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isOverdue ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex-shrink-0 mt-0.5">
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="min-w-0 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        onClick={() => navigate(`/leads/${item.leadId}`)}
                        className="font-bold text-slate-900 text-sm hover:text-brand-600 cursor-pointer"
                      >
                        {item.lead?.customer?.fullName}
                      </span>
                      <span className="text-slate-500 font-medium">
                        ({item.lead?.customer?.phone})
                      </span>
                      <Badge status={item.status} />
                      {isOverdue && (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                          Overdue
                        </span>
                      )}
                    </div>

                    <p className="text-slate-500 mt-1 flex items-center gap-2">
                      <span className="font-semibold text-slate-700">Trip Destination:</span>{' '}
                      <span>{item.lead?.destination}</span>
                      <span>•</span>
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium text-slate-800">
                        {new Date(item.scheduledAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </p>

                    {item.notes && (
                      <p className="text-slate-600 mt-1.5 italic bg-slate-50 p-2 rounded-md border border-slate-100 max-w-xl">
                        "{item.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center text-xs">
                  {item.status === 'PENDING' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setCompleteItem(item);
                          setCompleteNotes('');
                        }}
                        className="px-3 py-1.5 rounded-lg font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1.5"
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
                        className="px-3 py-1.5 rounded-lg font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                      >
                        Reschedule
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => navigate(`/leads/${item.leadId}`)}
                    className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
            <label className="font-semibold text-slate-700">Completion Notes</label>
            <textarea
              rows={3}
              value={completeNotes}
              onChange={(e) => setCompleteNotes(e.target.value)}
              placeholder="e.g. Customer agreed to package itinerary, awaiting family discussion on travel dates..."
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCompleteItem(null)}
              className="px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
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
            <label className="font-semibold text-slate-700">New Scheduled Date & Time *</label>
            <input
              type="datetime-local"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700">Reschedule Reason</label>
            <textarea
              rows={2}
              value={rescheduleNotes}
              onChange={(e) => setRescheduleNotes(e.target.value)}
              placeholder="e.g. Client requested call back after 6 PM..."
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRescheduleItem(null)}
              className="px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
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
