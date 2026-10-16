import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Plus,
  Building2,
  School,
  X,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Modal } from '../ui/Modal.js';
import { api } from '../../api/client.js';
import { OrganizationMember } from '../../types/index.js';

interface SelectFromDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  customerId: string;
  customerName?: string;
  onSuccess: () => void;
}

export const SelectFromDirectoryModal: React.FC<SelectFromDirectoryModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  customerId,
  customerName,
  onSuccess,
}) => {
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && customerId) {
      fetchMembers();
    }
  }, [isOpen, customerId]);

  const fetchMembers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get(`/customers/${customerId}/members?limit=200`);
      setMembers(res.data.data || []);
    } catch (err: any) {
      setError('Failed to load organization member directory.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      !search ||
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.memberId?.toLowerCase().includes(search.toLowerCase()) ||
      m.department?.toLowerCase().includes(search.toLowerCase()) ||
      m.phone?.includes(search);

    const matchesRole = selectedRole === 'ALL' || m.roleCategory === selectedRole;
    return matchesSearch && matchesRole;
  });

  const toggleSelectAll = () => {
    if (selectedMemberIds.length === filteredMembers.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(filteredMembers.map((m) => m.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAddSelectedToBooking = async () => {
    if (selectedMemberIds.length === 0) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const selectedMembers = members.filter((m) => selectedMemberIds.includes(m.id));
      const passengersPayload = selectedMembers.map((m) => ({
        name: m.name,
        phone: m.phone || null,
        email: m.email || null,
        age: m.age || null,
        gender: m.gender || null,
        memberId: m.id, // Links to OrganizationMember
        roleInTrip: m.roleCategory || 'PARTICIPANT',
        emergencyContact: m.emergencyContactPhone
          ? `${m.emergencyContactName ? `${m.emergencyContactName}: ` : ''}${m.emergencyContactPhone}`
          : null,
        notes: m.dietaryPreferences ? `Diet: ${m.dietaryPreferences}` : null,
      }));

      await api.post(`/bookings/${bookingId}/passengers/import`, {
        passengers: passengersPayload,
        replaceExisting: false,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add members to booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Passengers from Organization Directory"
      subtitle={`Choose registered members/students from ${customerName || 'the customer directory'}`}
      maxWidth="2xl"
    >
      <div className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Toolbar: Search, Filter, Select All */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, roll no, department..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white w-52 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="p-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="ALL">All Roles</option>
              <option value="STUDENT">Students</option>
              <option value="TEACHER">Teachers / Faculty</option>
              <option value="EMPLOYEE">Employees</option>
              <option value="STAFF">Staff</option>
              <option value="MEMBER">Members</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 transition-colors"
            >
              {selectedMemberIds.length === filteredMembers.length && filteredMembers.length > 0 ? (
                <CheckSquare className="w-3.5 h-3.5 text-brand-600" />
              ) : (
                <Square className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>{selectedMemberIds.length === filteredMembers.length ? 'Deselect All' : 'Select All'}</span>
            </button>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {selectedMemberIds.length} selected
            </span>
          </div>
        </div>

        {/* Member Directory List */}
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 animate-pulse">
            Loading organization directory...
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-500">
            No matching members found in this customer's directory.
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
            {filteredMembers.map((m) => {
              const isSelected = selectedMemberIds.includes(m.id);
              return (
                <div
                  key={m.id}
                  onClick={() => toggleSelectOne(m.id)}
                  className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-brand-50/70 dark:bg-brand-950/40 text-brand-900 dark:text-brand-100'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-brand-600">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-brand-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs">{m.name}</span>
                        {m.memberId && (
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                            {m.memberId}
                          </span>
                        )}
                        <span className="text-[10px] font-semibold text-slate-500">
                          {m.roleCategory}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {m.department || m.section
                          ? `${m.department || ''} ${m.section ? `(${m.section})` : ''} • `
                          : ''}
                        Phone: {m.phone || 'No phone'}
                        {m.dietaryPreferences && ` • Diet: ${m.dietaryPreferences}`}
                      </div>
                    </div>
                  </div>

                  {m.emergencyContactPhone && (
                    <div className="text-right text-[10px] text-slate-400 hidden sm:block">
                      <span>Emergency: {m.emergencyContactPhone}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
          <span className="text-slate-500 text-[11px]">
            Selected members will be automatically enrolled as trip passengers.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddSelectedToBooking}
              disabled={isSubmitting || selectedMemberIds.length === 0}
              className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>
                {isSubmitting
                  ? 'Adding...'
                  : `Add ${selectedMemberIds.length} Passenger(s) to Trip`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
