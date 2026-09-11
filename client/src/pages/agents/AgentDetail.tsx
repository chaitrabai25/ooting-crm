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
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.js';
import { StatCard } from '../../components/ui/StatCard.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { AgentModal } from './AgentModal.js';

export const AgentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [agent, setAgent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);

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
        <div className="h-6 bg-slate-200 rounded w-40" />
        <div className="h-48 bg-white rounded-xl border border-slate-200" />
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
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">{agent.companyName}</h1>
              <Badge status={agent.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Contact: {agent.contactPerson} • Phone: {agent.phone}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsEditOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <Edit2 className="w-3.5 h-3.5" />
          <span>Edit Agent</span>
        </button>
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
      <div className="bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-white border border-amber-200/80 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-white border border-amber-200 rounded-xl shadow-2xs">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm">Google Review & Online Reputation</h3>
              {agent.googleReviewRating && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
                  {agent.googleReviewRating} ★
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
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
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold shadow-xs transition-colors"
            >
              <span>View Google Reviews</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold"
            >
              + Add Google Review Link
            </button>
          )}
        </div>
      </div>

      {/* Agent Bookings Ledger */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Partner Booking History</h3>

        {agent.agentBookings?.length === 0 ? (
          <EmptyState
            title="No bookings through this agent"
            description="When bookings are tagged with this agent, turnover and commission payouts will calculate here."
            className="py-8 border-none bg-slate-50/50"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
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
              <tbody className="divide-y divide-slate-100">
                {agent.agentBookings.map((ab: any) => (
                  <tr key={ab.id}>
                    <td className="py-3">
                      <span
                        onClick={() => navigate(`/bookings/${ab.bookingId}`)}
                        className="font-bold text-brand-600 hover:underline cursor-pointer"
                      >
                        {ab.booking?.bookingNumber}
                      </span>
                    </td>
                    <td className="py-3 font-semibold text-slate-800">
                      {ab.booking?.customer?.fullName}
                    </td>
                    <td className="py-3 text-slate-600">
                      {ab.booking?.package?.packageName || 'Custom Itinerary'}
                    </td>
                    <td className="py-3 font-bold text-slate-900">
                      {formatCurrency(ab.booking?.finalAmount)}
                    </td>
                    <td className="py-3 text-slate-700 font-medium">
                      {ab.commissionRate}%
                    </td>
                    <td className="py-3 font-bold text-emerald-600">
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
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                        >
                          Mark Paid
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">Settled</span>
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
    </div>
  );
};
