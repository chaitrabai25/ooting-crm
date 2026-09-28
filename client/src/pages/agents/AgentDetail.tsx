import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  BookmarkCheck,
  CheckCircle2,
  Clock,
  Edit2,
  Percent,
  Star,
  ExternalLink,
  Trash2,
  Sparkles,
  Award,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.js';
import { StatCard } from '../../components/ui/StatCard.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { AgentModal } from './AgentModal.js';

export const AgentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [agent, setAgent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAgent = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/agents/${id}`);
      setAgent(res.data);
    } catch (err) {
      console.error('Failed to load agent profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchAgent();
  }, [id]);

  const handleDelete = async () => {
    if (!agent) return;
    try {
      setIsDeleting(true);
      await api.delete(`/agents/${agent.id}`);
      navigate('/agents');
    } catch (err: any) {
      console.error('Failed to delete agent:', err);
      alert(err.response?.data?.message || 'Failed to delete agent.');
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  };

  const handlePayoutChange = async (agentBookingId: string, status: string) => {
    try {
      await api.patch(`/agents/bookings/${agentBookingId}/payout`, { payoutStatus: status });
      fetchAgent();
    } catch (err) {
      console.error('Failed to update payout status:', err);
    }
  };

  const formatCurrency = (val: number) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN');
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-40" />
        <div className="h-48 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-slate-500">B2B Agent record not found.</p>
        <button
          onClick={() => navigate('/agents')}
          className="mt-3 text-xs font-semibold text-brand-600 hover:underline"
        >
          Return to Agents
        </button>
      </div>
    );
  }

  const metrics = agent.metrics || {};

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/agents')}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">{agent.companyName}</h1>
              <Badge status={agent.status} />
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full border shadow-2xs ${
                  agent.agentType === 'Diamond'
                    ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800'
                    : agent.agentType === 'Gold'
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                }`}
              >
                {agent.agentType === 'Diamond' && <Sparkles className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />}
                {agent.agentType === 'Gold' && <Award className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
                {agent.agentType || 'Silver'} Tier
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>Contact: {agent.contactPerson}</span>
              <span>• Phone: {agent.phone}</span>
              {agent.city && <span>• Location: {agent.city}{agent.state ? `, ${agent.state}` : ''}</span>}
              {agent.panNumber && <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">PAN: {agent.panNumber}</span>}
              {agent.gstNumber && <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">GST: {agent.gstNumber}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Agent</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Commercial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="B2B Bookings"
          value={metrics.totalBookings ?? 0}
          subtitle="Partner client volume"
          icon={BookmarkCheck}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />

        <StatCard
          title="Total Volume"
          value={formatCurrency(metrics.totalRevenue ?? 0)}
          subtitle="Gross trip turnover"
          icon={Briefcase}
          iconBg="bg-brand-50"
          iconColor="text-brand-600"
        />

        <StatCard
          title="Commission Paid"
          value={formatCurrency(metrics.paidCommission ?? 0)}
          subtitle="Disbursed earnings"
          icon={CheckCircle2}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />

        <StatCard
          title="Pending Commission"
          value={formatCurrency(metrics.pendingCommission ?? 0)}
          subtitle="Awaiting payout"
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor={metrics.pendingCommission > 0 ? 'text-amber-600' : 'text-slate-400'}
        />
      </div>

      {/* Google Review & Online Reputation Card */}
      <div className="bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-white dark:from-amber-950/20 dark:via-orange-950/10 dark:to-slate-900 border border-amber-200/80 dark:border-amber-800/40 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800/60 rounded-xl shadow-2xs">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Google Review & Online Reputation</h3>
              {agent.googleReviewRating && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300">
                  {agent.googleReviewRating} ★
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {agent.googleReviewNotes || 'Verified partner agency with public Google ratings and customer feedback'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {agent.googleReviewUrl ? (
            <a
              href={agent.googleReviewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-300 text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <span>View Google Reviews</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer"
            >
              + Add Google Review Link
            </button>
          )}
        </div>
      </div>

      {/* Agent Bookings Ledger */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">Partner Booking History</h3>

        {agent.agentBookings?.length === 0 ? (
          <EmptyState
            title="No bookings through this agent"
            description="When bookings are tagged with this agent, turnover and commission payouts will calculate here."
            className="py-8 border-none bg-slate-50/50 dark:bg-slate-850/50"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="pb-2.5 font-semibold">Booking #</th>
                  <th className="pb-2.5 font-semibold">Customer</th>
                  <th className="pb-2.5 font-semibold">Package</th>
                  <th className="pb-2.5 font-semibold">Total Value</th>
                  <th className="pb-2.5 font-semibold">Commission Rate</th>
                  <th className="pb-2.5 font-semibold">Commission (₹)</th>
                  <th className="pb-2.5 font-semibold">Payout Status</th>
                  <th className="pb-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {agent.agentBookings.map((ab: any) => (
                  <tr key={ab.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3">
                      <span
                        onClick={() => navigate(`/bookings/${ab.bookingId}`)}
                        className="font-bold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                      >
                        {ab.booking?.bookingNumber}
                      </span>
                    </td>
                    <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">
                      {ab.booking?.customer?.fullName}
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">
                      {ab.booking?.package?.packageName || 'Custom Itinerary'}
                    </td>
                    <td className="py-3 font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(ab.booking?.finalAmount)}
                    </td>
                    <td className="py-3 text-slate-700 dark:text-slate-300 font-medium">
                      {ab.commissionRate}%
                    </td>
                    <td className="py-3 font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(ab.commissionAmount)}
                    </td>
                    <td className="py-3">
                      <Badge status={ab.payoutStatus} />
                    </td>
                    <td className="py-3 text-right">
                      {ab.payoutStatus === 'PENDING' ? (
                        <button
                          type="button"
                          onClick={() => handlePayoutChange(ab.id, 'PAID')}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-md transition-colors cursor-pointer"
                        >
                          Mark Paid
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditOpen && (
        <AgentModal
          isOpen={isEditOpen}
          initialData={agent}
          onClose={() => setIsEditOpen(false)}
          onSuccess={() => fetchAgent()}
        />
      )}

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title={`Delete Agent: ${agent.companyName}`}
        message="Are you sure you want to delete this agent partner? This action cannot be undone."
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Agent'}
        isDanger={true}
      />
    </div>
  );
};
