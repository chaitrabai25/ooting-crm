import React, { useState } from 'react';
import { api } from '../../api/client.js';
import { Modal } from '../../components/ui/Modal.js';
import { User, Role } from '../../types/index.js';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: User | null;
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(initialData?.role || 'SALES');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [status, setStatus] = useState(initialData?.status || 'ACTIVE');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload: any = {
        name,
        email,
        role,
        phone: phone || null,
        status,
      };

      if (!initialData) {
        if (!password || password.length < 6) {
          setError('Password must be at least 6 characters.');
          setIsSubmitting(false);
          return;
        }
        payload.password = password;
        await api.post('/users', payload);
      } else {
        if (password) payload.password = password;
        await api.put(`/users/${initialData.id}`, payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Staff User' : 'Add New Staff Member'}
      subtitle="Configure CRM access role and credentials"
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="font-semibold text-slate-700">Full Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Rahul Verma"
            className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="font-semibold text-slate-700">Email Address *</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="rahul@ooting.com"
            className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="font-semibold text-slate-700">
            {initialData ? 'Change Password (leave blank to keep current)' : 'Login Password *'}
          </label>
          <input
            type="password"
            required={!initialData}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-700">Role *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white font-medium"
            >
              <option value="SALES">Sales Staff</option>
              <option value="ADMIN">Administrator</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="OPERATIONS">Operations</option>
              <option value="ACCOUNTANT">Accountant</option>
              <option value="AGENT">Agent</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none bg-white"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>

        <div>
          <label className="font-semibold text-slate-700">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="mt-1 w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : initialData ? 'Update User' : 'Create User'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
