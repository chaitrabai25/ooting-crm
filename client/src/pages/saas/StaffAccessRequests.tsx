import React, { useEffect, useState } from 'react';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  AlertTriangle,
  RefreshCw,
  Search,
  Check,
  X,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.js';
import { Modal } from '../../components/ui/Modal.js';
import { notifyError, notifySuccess } from '../../utils/sweetalert.js';

export const StaffAccessRequests: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Rejection modal
  const [rejectingRequest, setRejectingRequest] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '20');
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get(`/saas/staff-requests?${params.toString()}`);
      setRequests(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
    } catch (err: any) {
      notifyError('Failed to Fetch Requests', err.response?.data?.message || 'Unable to retrieve staff seat requests.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [page, statusFilter]);

  const handleApprove = async (reqItem: any) => {
    try {
      setIsSubmitting(true);
      await api.post(`/saas/staff-requests/${reqItem.id}/approve`);
      notifySuccess(
        'Request Approved',
        `Staff limit for ${reqItem.company?.name || 'Company'} has been incremented by ${reqItem.requestedSeats} seats.`
      );
      fetchRequests();
    } catch (err: any) {
      notifyError('Approval Failed', err.response?.data?.message || 'Could not approve staff request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingRequest) return;
    try {
      setIsSubmitting(true);
      await api.post(`/saas/staff-requests/${rejectingRequest.id}/reject`, {
        rejectionReason: rejectionReason || 'Request does not comply with current subscription quota.',
      });
      notifySuccess('Request Rejected', 'The staff access request has been rejected.');
      setRejectingRequest(null);
      setRejectionReason('');
      fetchRequests();
    } catch (err: any) {
      notifyError('Rejection Failed', err.response?.data?.message || 'Could not reject staff request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wider">
              Layer A Quota Governance
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Staff Access & Seat Increase Queue
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Review and approve customer requests to increase staff seats beyond their default 1-staff cap.
          </p>
        </div>

        <button
          onClick={fetchRequests}
          className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition cursor-pointer self-start sm:self-auto"
          title="Refresh Queue"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs font-semibold">
        <button
          onClick={() => {
            setStatusFilter('PENDING');
            setPage(1);
          }}
          className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
            statusFilter === 'PENDING'
              ? 'bg-amber-500 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Pending Review
        </button>
        <button
          onClick={() => {
            setStatusFilter('APPROVED');
            setPage(1);
          }}
          className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
            statusFilter === 'APPROVED'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Approved
        </button>
        <button
          onClick={() => {
            setStatusFilter('REJECTED');
            setPage(1);
          }}
          className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
            statusFilter === 'REJECTED'
              ? 'bg-red-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Rejected
        </button>
        <button
          onClick={() => {
            setStatusFilter('');
            setPage(1);
          }}
          className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
            statusFilter === ''
              ? 'bg-slate-800 text-white dark:bg-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          All Requests
        </button>
      </div>

      {/* Requests Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/20">
                <th className="py-3 px-4">Organization</th>
                <th className="py-3 px-4">Requested By</th>
                <th className="py-3 px-4">Seat Increase</th>
                <th className="py-3 px-4">Reason / Business Need</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-brand-500" />
                    Loading requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                    No staff access requests matching selected filter.
                  </td>
                </tr>
              ) : (
                requests.map((reqItem) => {
                  const isPending = reqItem.status === 'PENDING';

                  return (
                    <tr key={reqItem.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {reqItem.company?.name || 'Customer Organization'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {reqItem.company?.orgCode || 'ORG-UNKNOWN'}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {reqItem.requestedBy?.name || 'Admin'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {reqItem.requestedBy?.email}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-slate-500">{reqItem.currentLimit}</span>
                          <span className="text-slate-400">&rarr;</span>
                          <span className="font-bold text-amber-500">
                            +{reqItem.requestedSeats}
                          </span>
                          <span className="text-slate-400">=</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {reqItem.currentLimit + reqItem.requestedSeats} total
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <p className="text-slate-700 dark:text-slate-300 font-medium truncate" title={reqItem.reason}>
                          {reqItem.reason}
                        </p>
                        {reqItem.businessJustification && (
                          <p className="text-[10px] text-slate-400 truncate mt-0.5" title={reqItem.businessJustification}>
                            {reqItem.businessJustification}
                          </p>
                        )}
                        {reqItem.rejectionReason && (
                          <p className="text-[10px] text-red-500 truncate mt-0.5" title={reqItem.rejectionReason}>
                            Rejection Note: {reqItem.rejectionReason}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {reqItem.status === 'PENDING' ? (
                          <Badge variant="warning" size="sm">PENDING</Badge>
                        ) : reqItem.status === 'APPROVED' ? (
                          <Badge variant="success" size="sm">APPROVED</Badge>
                        ) : (
                          <Badge variant="danger" size="sm">REJECTED</Badge>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(reqItem.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApprove(reqItem)}
                              disabled={isSubmitting}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-[11px] transition inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <Check className="w-3 h-3" /> Approve
                            </button>
                            <button
                              onClick={() => {
                                setRejectingRequest(reqItem);
                                setRejectionReason('');
                              }}
                              disabled={isSubmitting}
                              className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 rounded font-semibold text-[11px] transition inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <X className="w-3 h-3" /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Reviewed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectingRequest && (
        <Modal
          isOpen={Boolean(rejectingRequest)}
          onClose={() => setRejectingRequest(null)}
          title={`Reject Staff Request: ${rejectingRequest.company?.name}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Provide a rationale explaining why this staff increase request is declined.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Rejection Reason
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                placeholder="e.g. Please upgrade to Professional Plan before requesting additional staff accounts."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isSubmitting || !rejectionReason.trim()}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Rejecting...' : 'Reject Request'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default StaffAccessRequests;
