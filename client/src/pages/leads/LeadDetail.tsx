import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Plus,
  BookmarkCheck,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Trash2,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.js';
import { Modal } from '../../components/ui/Modal.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { useAuth } from '../../context/AuthContext.js';

export const LeadDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can, isSuperAdmin } = useAuth();

  const [leadData, setLeadData] = useState<any>(null);
  const [timelineLogs, setTimelineLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Delete Lead state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Conversion to Booking Modal
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [bookingAmount, setBookingAmount] = useState('');
  const [bookingDiscount, setBookingDiscount] = useState('0');
  const [isConverting, setIsConverting] = useState(false);

  // Quick Schedule Follow-up Modal
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpType, setFollowUpType] = useState('CALL');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);
      await api.delete(`/leads/${id}`);
      navigate('/leads');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete lead.');
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  };

  const fetchLead = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/leads/${id}`);
      setLeadData(res.data.lead);
      setTimelineLogs(res.data.timelineLogs || []);
      setBookingAmount(String(res.data.lead.budget || res.data.lead.package?.price || ''));
    } catch (err) {
      console.error('Failed to load lead details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchLead();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      await api.patch(`/leads/${id}/status`, { status: newStatus });
      fetchLead();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleConvertBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConverting(true);
    try {
      const res = await api.post(`/leads/${id}/convert-booking`, {
        totalAmount: Number(bookingAmount),
        discount: Number(bookingDiscount),
        travelStartDate: leadData.travelStartDate,
        travelEndDate: leadData.travelEndDate,
        travellers: leadData.adults + leadData.children,
      });
      setIsConvertOpen(false);
      navigate(`/bookings/${res.data.id}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to convert lead to booking.');
    } finally {
      setIsConverting(false);
    }
  };

  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsScheduling(true);
    try {
      await api.post('/followups', {
        leadId: id,
        scheduledAt: followUpDate,
        type: followUpType,
        notes: followUpNotes,
      });
      setIsFollowUpOpen(false);
      setFollowUpNotes('');
      setFollowUpDate('');
      fetchLead();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to schedule follow-up.');
    } finally {
      setIsScheduling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-40" />
        <div className="h-32 bg-white rounded-xl border border-slate-200" />
      </div>
    );
  }

  if (!leadData) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-slate-500">Lead record not found.</p>
        <button
          onClick={() => navigate('/leads')}
          className="mt-3 text-xs font-semibold text-brand-600 hover:underline"
        >
          Return to Leads
        </button>
      </div>
    );
  }

  const pipelineStages = ['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTATION_SENT', 'FOLLOW_UP', 'WON'];
  const isLostOrCancelled = ['LOST', 'CANCELLED'].includes(leadData.enquiryStatus);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar with back button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/leads')}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {leadData.customer?.fullName} — {leadData.destination}
              </h1>
              <Badge status={leadData.enquiryStatus} />
              <Badge status={leadData.priority} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Enquiry created on {new Date(leadData.createdAt).toLocaleDateString()} via {leadData.source}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsFollowUpOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Schedule Follow-up</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/quotations?action=create&leadId=${leadData.id}`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Create Quotation</span>
          </button>

          <button
            type="button"
            onClick={() => setIsConvertOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors"
          >
            <BookmarkCheck className="w-3.5 h-3.5" />
            <span>Convert to Booking</span>
          </button>

          {(isSuperAdmin || can('leads', 'delete')) && (
            <button
              type="button"
              onClick={() => setIsDeleteOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 rounded-lg shadow-xs transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Visual Pipeline Progression */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
          Pipeline Progression
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          {pipelineStages.map((stage, idx) => {
            const currentIdx = pipelineStages.indexOf(leadData.enquiryStatus);
            const isCompleted = currentIdx >= idx && !isLostOrCancelled;
            const isCurrent = leadData.enquiryStatus === stage;

            return (
              <button
                key={stage}
                onClick={() => handleStatusChange(stage)}
                className={`p-2.5 rounded-lg border text-center transition-all ${
                  isCurrent
                    ? 'bg-brand-600 text-white border-brand-600 shadow-sm font-bold'
                    : isCompleted
                    ? 'bg-brand-50/60 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-800 font-semibold'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium'
                }`}
              >
                <span className="text-[11px] block">{stage.replace('_', ' ')}</span>
              </button>
            );
          })}
        </div>

        {/* Alternative End States */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={() => handleStatusChange('LOST')}
            className={`px-3 py-1 rounded-md font-semibold transition-colors ${
              leadData.enquiryStatus === 'LOST'
                ? 'bg-rose-600 text-white'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900'
            }`}
          >
            Mark as Lost
          </button>
          <button
            type="button"
            onClick={() => handleStatusChange('CANCELLED')}
            className={`px-3 py-1 rounded-md font-semibold transition-colors ${
              leadData.enquiryStatus === 'CANCELLED'
                ? 'bg-slate-600 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
            }`}
          >
            Cancelled
          </button>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customer & Travel Specs */}
        <div className="space-y-6">
          {/* Customer Profile Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">
              Customer Details
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span
                  onClick={() => navigate(`/customers/${leadData.customer.id}`)}
                  className="font-semibold text-slate-900 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer"
                >
                  {leadData.customer.fullName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                <span className="text-slate-700 dark:text-slate-300">{leadData.customer.phone}</span>
              </div>
              {leadData.customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-700 dark:text-slate-300">{leadData.customer.email}</span>
                </div>
              )}
              {leadData.customer.city && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-700 dark:text-slate-300">{leadData.customer.city}</span>
                </div>
              )}
            </div>
          </div>

          {/* Travel Specifications Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">
              Enquiry Requirements
            </h3>
            <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Destination</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{leadData.destination}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Package</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {leadData.package?.packageName || 'Custom Itinerary'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Travellers</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {leadData.adults} Adults {leadData.children > 0 ? `, ${leadData.children} Children` : ''}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Travel Start</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {leadData.travelStartDate
                    ? new Date(leadData.travelStartDate).toLocaleDateString()
                    : 'Flexible'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Estimated Budget</span>
                <span className="font-semibold text-brand-600 dark:text-brand-400">
                  {leadData.budget ? `₹${Number(leadData.budget).toLocaleString('en-IN')}` : 'Not Specified'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Assigned Staff</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {leadData.assignedUser?.name || 'Unassigned'}
                </span>
              </div>
            </div>

            {leadData.notes && (
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Client Notes
                </span>
                <p className="text-slate-700 dark:text-slate-200 whitespace-pre-line bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  {leadData.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right 2 Columns: Scheduled Follow-ups & Activity History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Scheduled Follow-ups Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Follow-up Schedule</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Planned phone calls, WhatsApp check-ins, and meetings</p>
              </div>
              <button
                type="button"
                onClick={() => setIsFollowUpOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Follow-up</span>
              </button>
            </div>

            {leadData.followUps?.length === 0 ? (
              <EmptyState
                title="No follow-ups scheduled"
                description="Schedule a call or message follow-up to keep the enquiry warm."
                className="py-6 border-none bg-slate-50/50 dark:bg-slate-800/40"
              />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {leadData.followUps.map((f: any) => (
                  <div key={f.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{f.type}</span>
                        <Badge status={f.status} />
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{new Date(f.scheduledAt).toLocaleString()}</span>
                        {f.assignedUser && <span>• Assigned: {f.assignedUser.name}</span>}
                      </p>
                      {f.notes && <p className="text-slate-600 dark:text-slate-300 mt-1 italic">{f.notes}</p>}
                    </div>

                    {f.status === 'PENDING' && (
                      <button
                        type="button"
                        onClick={async () => {
                          const note = prompt('Completion notes (optional):');
                          await api.patch(`/followups/${f.id}/complete`, { notes: note });
                          fetchLead();
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-md transition-colors"
                      >
                        Mark Done
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Timeline Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">Activity & Audit Timeline</h3>
            {timelineLogs.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">No recorded timeline events yet.</p>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                {timelineLogs.map((log: any) => (
                  <div key={log.id} className="relative text-xs">
                    <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-brand-600 ring-4 ring-brand-50 dark:ring-brand-950" />
                    <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-200/70 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{log.details}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Performed by {log.userName || 'System'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Convert to Booking Modal */}
      <Modal
        isOpen={isConvertOpen}
        onClose={() => setIsConvertOpen(false)}
        title="Convert Lead to Booking"
        subtitle="Confirm pricing and initiate the travel booking"
        maxWidth="md"
      >
        <form onSubmit={handleConvertBooking} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Gross Package Amount (₹) *</label>
            <input
              type="number"
              required
              min="0"
              value={bookingAmount}
              onChange={(e) => setBookingAmount(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none text-sm font-semibold"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Discount (₹)</label>
            <input
              type="number"
              min="0"
              value={bookingDiscount}
              onChange={(e) => setBookingDiscount(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="p-3 bg-brand-50 dark:bg-brand-950/40 rounded-lg border border-brand-200 dark:border-brand-800 text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200">Final Amount Payable: </span>
            <span className="text-brand-700 dark:text-brand-300 font-bold text-sm">
              ₹{(Math.max(0, Number(bookingAmount) - Number(bookingDiscount))).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsConvertOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isConverting}
              className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {isConverting ? 'Converting...' : 'Confirm & Create Booking'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Schedule Follow-up Modal */}
      <Modal
        isOpen={isFollowUpOpen}
        onClose={() => setIsFollowUpOpen(false)}
        title="Schedule Follow-up"
        maxWidth="md"
      >
        <form onSubmit={handleScheduleFollowUp} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Follow-up Date & Time *</label>
            <input
              type="datetime-local"
              required
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Method *</label>
            <select
              value={followUpType}
              onChange={(e) => setFollowUpType(e.target.value)}
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            >
              <option value="CALL">Phone Call</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="EMAIL">Email</option>
              <option value="MEETING">In-Person Meeting</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Notes & Objective</label>
            <textarea
              rows={3}
              value={followUpNotes}
              onChange={(e) => setFollowUpNotes(e.target.value)}
              placeholder="e.g. Call to discuss hotel upgrades and confirm travel dates..."
              className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsFollowUpOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isScheduling}
              className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {isScheduling ? 'Scheduling...' : 'Schedule Follow-up'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Lead Enquiry"
        message={`Are you sure you want to delete this enquiry for "${leadData?.customer?.fullName || 'this client'}" (${leadData?.destination || 'Destination'})? Unbooked quotations and follow-ups will be permanently deleted. This cannot be undone.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Lead'}
        isDanger={true}
      />
    </div>
  );
};
