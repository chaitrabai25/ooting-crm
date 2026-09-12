import React, { useState, useEffect } from 'react';
import { UserCheck, Users, AlertCircle, ArrowRight } from 'lucide-react';
import { Modal } from '../../components/ui/Modal.js';
import { api } from '../../api/client.js';

interface ForwardCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerIds: string[];
  customerNames: string[];
  onSuccess: () => void;
}

export const ForwardCustomerModal: React.FC<ForwardCustomerModalProps> = ({
  isOpen,
  onClose,
  customerIds,
  customerNames,
  onSuccess,
}) => {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setSelectedUserId('');
      setError(null);
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get('/users');
      // res.data can be an array or { data: [...] }
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      const activeUsers = list.filter((u: any) => u.status === 'ACTIVE' || !u.status);
      setUsers(activeUsers);
      if (activeUsers.length > 0) {
        setSelectedUserId(activeUsers[0].id);
      }
    } catch (err: any) {
      setError('Failed to fetch CRM users list.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleForward = async () => {
    if (!selectedUserId) {
      setError('Please select a team member to assign the customers to.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.post('/customers/forward', {
        customerIds,
        targetUserId: selectedUserId,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reassign customers.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Forward Customers to Team Member" maxWidth="md">
      <div className="space-y-4">
        <div className="p-3 bg-brand-50/60 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-900/60 rounded-lg">
          <div className="flex items-center gap-2 text-brand-800 dark:text-brand-300 font-semibold text-sm">
            <Users className="w-4 h-4" />
            <span>Forwarding {customerIds.length} Selected Customer(s)</span>
          </div>
          <p className="text-xs text-brand-700 dark:text-brand-400 mt-1">
            {customerNames.slice(0, 3).join(', ')}
            {customerNames.length > 3 ? ` and ${customerNames.length - 3} more` : ''}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Select Assigned Staff Member:
          </label>

          {loadingUsers ? (
            <div className="py-4 text-center text-xs text-slate-400">Loading team members...</div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {users.map((u) => (
                <label
                  key={u.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedUserId === u.id
                      ? 'border-brand-600 bg-brand-50/50 dark:border-brand-500 dark:bg-brand-950/30'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="targetUserId"
                      value={u.id}
                      checked={selectedUserId === u.id}
                      onChange={() => setSelectedUserId(u.id)}
                      className="text-brand-600 focus:ring-brand-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {u.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {u.email} {u.role ? `• ${u.role}` : ''}
                      </div>
                    </div>
                  </div>
                  {selectedUserId === u.id && (
                    <UserCheck className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting || !selectedUserId}
            onClick={handleForward}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
          >
            <span>{submitting ? 'Reassigning...' : `Forward to ${selectedUser?.name || 'User'}`}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Modal>
  );
};
