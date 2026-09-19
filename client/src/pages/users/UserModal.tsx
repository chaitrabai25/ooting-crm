import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, Check, X, CheckSquare, Square, RotateCcw } from 'lucide-react';
import { api } from '../../api/client.js';
import { Modal } from '../../components/ui/Modal.js';
import { User, Role } from '../../types/index.js';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: User | null;
}

interface ActionPermissions {
  view?: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  export?: boolean;
}

type PermissionsMap = Record<string, ActionPermissions>;

const CRM_MODULES: { id: string; label: string; actions: (keyof ActionPermissions)[] }[] = [
  { id: 'leads', label: 'Leads & Enquiries', actions: ['view', 'create', 'edit', 'delete', 'export'] },
  { id: 'quotations', label: 'Quotations & Itineraries', actions: ['view', 'create', 'edit', 'delete', 'export'] },
  { id: 'bookings', label: 'Tour Bookings', actions: ['view', 'create', 'edit', 'delete', 'export'] },
  { id: 'cabs', label: 'Cab Bookings & Duty Slips', actions: ['view', 'create', 'edit', 'delete', 'export'] },
  { id: 'customers', label: 'Customers & Tourists', actions: ['view', 'create', 'edit', 'delete', 'export'] },
  { id: 'packages', label: 'Travel Packages', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'suppliers', label: 'B2B Suppliers & Partners', actions: ['view', 'create', 'edit', 'delete', 'export'] },
  { id: 'agents', label: 'B2B Travel Agents', actions: ['view', 'create', 'edit', 'delete', 'export'] },
  { id: 'payments', label: 'Payments & Financials', actions: ['view', 'create', 'edit', 'delete', 'export'] },
  { id: 'reports', label: 'Business Reports', actions: ['view', 'export'] },
];

const getDefaultPermissionsForRole = (r: Role): PermissionsMap => {
  const map: PermissionsMap = {};

  CRM_MODULES.forEach((mod) => {
    map[mod.id] = {};
    mod.actions.forEach((act) => {
      if (r === 'SUPER_ADMIN' || r === 'ADMIN') {
        map[mod.id][act] = true;
      } else if (r === 'SALES') {
        if (['leads', 'quotations', 'bookings', 'cabs', 'customers'].includes(mod.id)) {
          map[mod.id][act] = act !== 'delete';
        } else if (['packages', 'suppliers', 'agents', 'payments'].includes(mod.id)) {
          map[mod.id][act] = act === 'view';
        } else {
          map[mod.id][act] = false;
        }
      } else if (r === 'OPERATIONS') {
        if (['bookings', 'cabs', 'suppliers', 'packages'].includes(mod.id)) {
          map[mod.id][act] = act !== 'delete';
        } else if (['leads', 'customers', 'agents'].includes(mod.id)) {
          map[mod.id][act] = act === 'view';
        } else {
          map[mod.id][act] = false;
        }
      } else if (r === 'ACCOUNTANT') {
        if (['payments', 'reports'].includes(mod.id)) {
          map[mod.id][act] = act !== 'delete';
        } else if (['bookings', 'cabs', 'suppliers', 'agents'].includes(mod.id)) {
          map[mod.id][act] = act === 'view';
        } else {
          map[mod.id][act] = false;
        }
      } else if (r === 'AGENT') {
        if (['bookings', 'packages'].includes(mod.id)) {
          map[mod.id][act] = act === 'view';
        } else {
          map[mod.id][act] = false;
        }
      } else {
        map[mod.id][act] = false;
      }
    });
  });

  return map;
};

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

  // Granular Permissions State
  const [permissions, setPermissions] = useState<PermissionsMap>(() => {
    if (initialData?.permissions) {
      try {
        const parsed = JSON.parse(initialData.permissions);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse user permissions:', e);
      }
    }
    return getDefaultPermissionsForRole(initialData?.role || 'SALES');
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync permissions when initialData changes
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setEmail(initialData.email);
      setRole(initialData.role);
      setPhone(initialData.phone || '');
      setStatus(initialData.status);
      if (initialData.permissions) {
        try {
          const parsed = JSON.parse(initialData.permissions);
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            setPermissions(parsed);
            return;
          }
        } catch (e) {}
      }
      setPermissions(getDefaultPermissionsForRole(initialData.role));
    } else {
      setName('');
      setEmail('');
      setPassword('');
      setRole('SALES');
      setPhone('');
      setStatus('ACTIVE');
      setPermissions(getDefaultPermissionsForRole('SALES'));
    }
  }, [initialData, isOpen]);

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    setPermissions(getDefaultPermissionsForRole(newRole));
  };

  const togglePermission = (moduleId: string, action: keyof ActionPermissions) => {
    setPermissions((prev) => {
      const mod = prev[moduleId] || {};
      return {
        ...prev,
        [moduleId]: {
          ...mod,
          [action]: !mod[action],
        },
      };
    });
  };

  const setAllPermissions = (enable: boolean) => {
    const updated: PermissionsMap = {};
    CRM_MODULES.forEach((mod) => {
      updated[mod.id] = {};
      mod.actions.forEach((act) => {
        updated[mod.id][act] = enable;
      });
    });
    setPermissions(updated);
  };

  const resetToRoleDefault = () => {
    setPermissions(getDefaultPermissionsForRole(role));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload: any = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        phone: phone ? phone.trim() : null,
        status,
        permissions: role === 'SUPER_ADMIN' ? null : JSON.stringify(permissions),
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
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-xs">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-xl">
            {error}
          </div>
        )}

        {/* Basic Account Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Verma"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C91F28]"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="rahul@ooting.com"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C91F28]"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              {initialData ? 'Change Password (leave blank to keep)' : 'Login Password *'}
            </label>
            <input
              type="password"
              required={!initialData}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={initialData ? '••••••••' : 'Minimum 6 characters'}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C91F28]"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C91F28]"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Role *
            </label>
            <select
              value={role}
              onChange={(e) => handleRoleChange(e.target.value as Role)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#C91F28]"
            >
              <option value="SALES">Sales Staff</option>
              <option value="OPERATIONS">Operations</option>
              <option value="ACCOUNTANT">Accountant</option>
              <option value="ADMIN">Administrator</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="AGENT">Travel Agent Partner</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Account Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#C91F28]"
            >
              <option value="ACTIVE">Active (Can log in)</option>
              <option value="INACTIVE">Inactive (Access paused)</option>
              <option value="SUSPENDED">Suspended (Access blocked)</option>
            </select>
          </div>
        </div>

        {/* Permissions Section */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#C91F28]" />
                Granular Permissions Matrix
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Control exactly what this employee can view, create, edit, delete, or export
              </p>
            </div>

            {role !== 'SUPER_ADMIN' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAllPermissions(true)}
                  className="px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => setAllPermissions(false)}
                  className="px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Clear All
                </button>
                <button
                  type="button"
                  onClick={resetToRoleDefault}
                  title="Reset to role default"
                  className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {role === 'SUPER_ADMIN' ? (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-600" />
              <div className="text-xs">
                <span className="font-bold block">Super Admin Full System Bypass</span>
                <span>
                  Super Admins have unrestricted access across all CRM features, database operations, user management, and exports.
                </span>
              </div>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3 font-bold">Module</th>
                    <th className="py-2.5 px-2 text-center font-bold w-16">View</th>
                    <th className="py-2.5 px-2 text-center font-bold w-16">Create</th>
                    <th className="py-2.5 px-2 text-center font-bold w-16">Edit</th>
                    <th className="py-2.5 px-2 text-center font-bold w-16">Delete</th>
                    <th className="py-2.5 px-2 text-center font-bold w-16">Export</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {CRM_MODULES.map((mod) => {
                    const modPerms = permissions[mod.id] || {};
                    return (
                      <tr key={mod.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {mod.label}
                        </td>
                        {(['view', 'create', 'edit', 'delete', 'export'] as (keyof ActionPermissions)[]).map(
                          (act) => {
                            const isApplicable = mod.actions.includes(act);
                            if (!isApplicable) {
                              return (
                                <td key={act} className="py-2 px-2 text-center text-slate-300 dark:text-slate-600">
                                  —
                                </td>
                              );
                            }
                            const isChecked = Boolean(modPerms[act]);
                            return (
                              <td key={act} className="py-2 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => togglePermission(mod.id, act)}
                                  className={`p-1 rounded transition-colors ${
                                    isChecked
                                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100'
                                      : 'text-slate-300 dark:text-slate-600 hover:text-slate-400'
                                  }`}
                                  title={`${isChecked ? 'Disable' : 'Enable'} ${act} on ${mod.label}`}
                                >
                                  {isChecked ? (
                                    <CheckSquare className="w-4 h-4" />
                                  ) : (
                                    <Square className="w-4 h-4" />
                                  )}
                                </button>
                              </td>
                            );
                          }
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 font-bold text-white bg-[#C91F28] hover:bg-[#A8171F] rounded-xl shadow-md disabled:opacity-50 transition-all"
          >
            {isSubmitting ? 'Saving...' : initialData ? 'Update User' : 'Create User'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
export default UserModal;
