import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Sparkles,
  BookmarkCheck,
  CreditCard,
  Edit2,
  FileText,
  Clock,
  Plus,
  Trash2,
  Building2,
  School,
  GraduationCap,
  Users,
  Trophy,
  Globe,
  FileSpreadsheet,
  Upload,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  Compass,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.js';
import { StatCard } from '../../components/ui/StatCard.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { CustomerModal } from './CustomerModal.js';
import { MemberModal } from './MemberModal.js';
import { UniversalExcelImportModal } from './UniversalExcelImportModal.js';
import { OrganizationMember } from '../../types/index.js';
import { notifyError } from '../../utils/sweetalert.js';

export const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'bookings' | 'leads' | 'quotations' | 'assignments' | 'overview'>('members');

  // Modals
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<OrganizationMember | null>(null);

  // Member Search and Filter
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedRoleCategory, setSelectedRoleCategory] = useState('ALL');

  const fetchCustomer = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/customers/${id}`);
      setCustomer(res.data);
      // Default to bookings tab if it's an individual, otherwise members tab
      if (res.data.customerType === 'INDIVIDUAL' && activeTab === 'members') {
        setActiveTab('bookings');
      }
    } catch (err) {
      console.error('Failed to load customer profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customer) return;
    try {
      setIsDeleting(true);
      await api.delete(`/customers/${customer.id}`);
      navigate('/customers');
    } catch (err: any) {
      notifyError('Failed to Delete Customer', err.response?.data?.message || 'Failed to delete customer.');
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member from the directory?')) return;
    try {
      await api.delete(`/customers/${id}/members/${memberId}`);
      fetchCustomer();
    } catch (err: any) {
      notifyError('Failed to Delete Member', err.response?.data?.message || 'Failed to remove member.');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get(`/customers/${id}/members/template`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${(customer.organizationName || customer.fullName).replace(/[^a-zA-Z0-9_-]/g, '_')}_Members_Template.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      notifyError('Error', 'Failed to download template.');
    }
  };

  useEffect(() => {
    if (id) fetchCustomer();
  }, [id]);

  const formatCurrency = (val: number) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN');
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-40" />
        <div className="h-32 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-slate-500">Customer record not found.</p>
        <button
          onClick={() => navigate('/customers')}
          className="mt-3 text-xs font-semibold text-brand-600 hover:underline"
        >
          Return to Customers
        </button>
      </div>
    );
  }

  const metrics = customer.metrics || {};
  const isOrganization = customer.customerType && customer.customerType !== 'INDIVIDUAL';
  const members: OrganizationMember[] = customer.members || [];
  const assignments: any[] = customer.assignments || [];

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      !memberSearch ||
      m.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.memberId?.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.phone?.includes(memberSearch) ||
      m.department?.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.designation?.toLowerCase().includes(memberSearch.toLowerCase());

    const matchesRole = selectedRoleCategory === 'ALL' || m.roleCategory === selectedRoleCategory;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/customers')}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {customer.organizationName || customer.fullName}
              </h1>
              {customer.customerType && customer.customerType !== 'INDIVIDUAL' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                  {customer.customerType}
                </span>
              )}
              {(customer.organizationCode || customer.udid) && (
                <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                  UDID: {customer.udid || customer.organizationCode}
                </span>
              )}
              <Badge status={customer.status} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customer since {new Date(customer.createdAt).toLocaleDateString()} • Source: {customer.source || 'Direct'}
              {customer.category && ` • ${customer.category}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Edit Profile</span>
          </button>
          <button
            type="button"
            onClick={() => navigate(`/leads?action=create&customerId=${customer.id}`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Create Enquiry</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Delete Customer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* 360-Degree Lifetime Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isOrganization ? (
          <StatCard
            title="Total Members"
            value={members.length}
            subtitle="Registered passengers & staff"
            icon={Users}
            iconBg="bg-purple-50 dark:bg-purple-950/40"
            iconColor="text-purple-600 dark:text-purple-400"
          />
        ) : (
          <StatCard
            title="Lifetime Bookings"
            value={metrics.totalBookings ?? 0}
            subtitle="Total trips confirmed"
            icon={BookmarkCheck}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />
        )}
        <StatCard
          title="Lifetime Value"
          value={formatCurrency(metrics.lifetimeValue ?? 0)}
          subtitle="Gross trip volume"
          icon={CreditCard}
          iconBg="bg-brand-50"
          iconColor="text-brand-600"
        />
        <StatCard
          title="Total Paid"
          value={formatCurrency(metrics.totalPaid ?? 0)}
          subtitle="Received & settled"
          icon={CreditCard}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Outstanding Balance"
          value={formatCurrency(metrics.outstandingBalance ?? 0)}
          subtitle="Pending receivables"
          icon={CreditCard}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
        />
      </div>

      {/* Profile & Tabs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            {isOrganization ? <Building2 className="w-4 h-4 text-brand-600" /> : <Users className="w-4 h-4 text-brand-600" />}
            {isOrganization ? 'Organization Profile' : 'Contact & Profile'}
          </h3>

          <div className="space-y-3 text-xs">
            {isOrganization && customer.primaryContactName && (
              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                  Primary Contact / Coordinator
                </span>
                <div className="font-semibold text-slate-900 dark:text-white text-xs">
                  {customer.primaryContactName}
                  {customer.primaryContactDesignation && (
                    <span className="text-slate-500 font-normal"> ({customer.primaryContactDesignation})</span>
                  )}
                </div>
                {customer.primaryContactPhone && (
                  <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{customer.primaryContactPhone}</span>
                  </div>
                )}
                {customer.primaryContactEmail && (
                  <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{customer.primaryContactEmail}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-slate-900 dark:text-slate-100">{customer.phone}</span>
            </div>
            {customer.alternatePhone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400 opacity-60" />
                <span className="text-slate-600 dark:text-slate-400">{customer.alternatePhone} (Alt)</span>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="text-slate-700 dark:text-slate-300">{customer.email}</span>
              </div>
            )}
            {customer.gstin && (
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-slate-700 dark:text-slate-300 font-mono">GSTIN: {customer.gstin}</span>
              </div>
            )}
            {customer.website && (
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-400" />
                <a
                  href={customer.website.startsWith('http') ? customer.website : `https://${customer.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-600 dark:text-brand-400 hover:underline truncate max-w-[200px]"
                >
                  {customer.website}
                </a>
              </div>
            )}
            {(customer.city || customer.state) && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="text-slate-700 dark:text-slate-300">
                  {customer.city}
                  {customer.state ? `, ${customer.state}` : ''}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600 dark:text-slate-400">
                Assigned: {customer.assignedTo?.name || 'Unassigned'}
              </span>
            </div>
          </div>

          {customer.billingAddress && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Billing Address
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                {customer.billingAddress}
              </p>
            </div>
          )}

          {customer.notes && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Profile Notes
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                {customer.notes}
              </p>
            </div>
          )}
        </div>

        {/* 360 Tabs */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
          {/* Tab Navigation */}
          <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-2 mb-4 text-xs font-semibold overflow-x-auto">
            {isOrganization && (
              <button
                onClick={() => setActiveTab('members')}
                className={`pb-2 transition-colors relative whitespace-nowrap cursor-pointer ${
                  activeTab === 'members'
                    ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 -mb-2.5 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                Members Directory ({members.length})
              </button>
            )}
            <button
              onClick={() => setActiveTab('bookings')}
              className={`pb-2 transition-colors relative whitespace-nowrap cursor-pointer ${
                activeTab === 'bookings'
                  ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 -mb-2.5 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Trips & Bookings ({customer.bookings?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('leads')}
              className={`pb-2 transition-colors relative whitespace-nowrap cursor-pointer ${
                activeTab === 'leads'
                  ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 -mb-2.5 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Enquiries ({customer.leads?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('quotations')}
              className={`pb-2 transition-colors relative whitespace-nowrap cursor-pointer ${
                activeTab === 'quotations'
                  ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 -mb-2.5 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Quotations ({customer.quotations?.length || 0})
            </button>
            {assignments.length > 0 && (
              <button
                onClick={() => setActiveTab('assignments')}
                className={`pb-2 transition-colors relative whitespace-nowrap cursor-pointer ${
                  activeTab === 'assignments'
                    ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 -mb-2.5 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                Assigned Guides ({assignments.length})
              </button>
            )}
          </div>

          {/* TAB 1: MEMBERS DIRECTORY */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Search member, ID, phone..."
                      className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white w-52"
                    />
                  </div>
                  <select
                    value={selectedRoleCategory}
                    onChange={(e) => setSelectedRoleCategory(e.target.value)}
                    className="p-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="STUDENT">Students</option>
                    <option value="TEACHER">Teachers / Faculty</option>
                    <option value="EMPLOYEE">Employees</option>
                    <option value="EXECUTIVE">Executives</option>
                    <option value="STAFF">Staff</option>
                    <option value="COORDINATOR">Coordinators</option>
                    <option value="MEMBER">Members</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    title="Download Excel Template"
                    className="p-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 rounded-lg hover:bg-brand-100"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-brand-600" />
                    <span>Import Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMember(null);
                      setIsMemberModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Member</span>
                  </button>
                </div>
              </div>

              {filteredMembers.length === 0 ? (
                <EmptyState
                  title="No directory members found"
                  description="Add individual employees, students, or passengers, or import in bulk using an Excel file."
                  className="py-8 border-none bg-slate-50/50 dark:bg-slate-850/50"
                />
              ) : (
                <div className="max-h-96 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-2.5">ID / Roll No</th>
                        <th className="p-2.5">Name</th>
                        <th className="p-2.5">Role</th>
                        <th className="p-2.5">Department / Class</th>
                        <th className="p-2.5">Phone</th>
                        <th className="p-2.5">Emergency Contact</th>
                        <th className="p-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {filteredMembers.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850">
                          <td className="p-2.5 font-mono font-bold text-brand-600 dark:text-brand-400">
                            {m.memberId || '—'}
                          </td>
                          <td className="p-2.5 font-semibold text-slate-900 dark:text-white">
                            {m.name}
                            {m.dietaryPreferences && (
                              <span className="block text-[10px] text-emerald-600 font-normal">
                                Diet: {m.dietaryPreferences}
                              </span>
                            )}
                          </td>
                          <td className="p-2.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {m.roleCategory || 'MEMBER'}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-300">
                            {m.department || m.designation || m.section
                              ? `${m.department || ''} ${m.section ? `(${m.section})` : ''} ${m.designation ? `/ ${m.designation}` : ''}`
                              : '—'}
                          </td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-300">{m.phone || '—'}</td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-300">
                            {m.emergencyContactPhone ? (
                              <div>
                                <span className="font-medium text-slate-800 dark:text-slate-200">{m.emergencyContactPhone}</span>
                                {m.emergencyContactName && (
                                  <span className="block text-[10px] text-slate-400">({m.emergencyContactName})</span>
                                )}
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="p-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMember(m);
                                  setIsMemberModalOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-brand-600 rounded"
                                title="Edit Member"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMember(m.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                title="Remove Member"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BOOKINGS */}
          {activeTab === 'bookings' && (
            <div>
              {customer.bookings?.length === 0 ? (
                <EmptyState
                  title="No bookings recorded yet"
                  description="Convert an enquiry or record a new confirmed trip for this customer."
                  className="py-8 border-none bg-slate-50/50 dark:bg-slate-850/50"
                />
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {customer.bookings.map((b: any) => {
                    const paid =
                      b.payments
                        ?.filter((p: any) => p.paymentStatus === 'SUCCESS')
                        ?.reduce((acc: number, p: any) => acc + p.amount, 0) || 0;
                    const balance = Math.max(0, b.finalAmount - paid);

                    return (
                      <div
                        key={b.id}
                        onClick={() => navigate(`/bookings/${b.id}`)}
                        className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 px-2 rounded-lg cursor-pointer transition-colors text-xs"
                      >
                        <div>
                          <span className="font-semibold text-brand-600 dark:text-brand-400">{b.bookingNumber}</span>
                          <span className="text-slate-800 dark:text-slate-200 font-medium ml-2">
                            {b.package?.packageName || 'Custom Itinerary'}
                          </span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Travel: {new Date(b.travelStartDate).toLocaleDateString()} -{' '}
                            {new Date(b.travelEndDate).toLocaleDateString()} • {b.adults} Adults
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900 dark:text-slate-100 block">
                            {formatCurrency(b.finalAmount)}
                          </span>
                          <span
                            className={`text-[10px] font-semibold ${
                              balance === 0 ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          >
                            {balance === 0 ? 'Fully Paid' : `Bal: ${formatCurrency(balance)}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LEADS */}
          {activeTab === 'leads' && (
            <div>
              {customer.leads?.length === 0 ? (
                <EmptyState
                  title="No enquiries on record"
                  description="Create a new lead or tour requirement for this customer."
                  className="py-8 border-none bg-slate-50/50 dark:bg-slate-850/50"
                />
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {customer.leads.map((l: any) => (
                    <div
                      key={l.id}
                      onClick={() => navigate(`/leads/${l.id}`)}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 px-2 rounded-lg cursor-pointer transition-colors text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {l.destination || 'Unspecified Destination'}
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Created {new Date(l.createdAt).toLocaleDateString()} • Priority: {l.priority}
                        </p>
                      </div>
                      <Badge status={l.enquiryStatus} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: QUOTATIONS */}
          {activeTab === 'quotations' && (
            <div>
              {customer.quotations?.length === 0 ? (
                <EmptyState
                  title="No quotations created yet"
                  description="Draft and generate itinerary proposals for this client."
                  className="py-8 border-none bg-slate-50/50 dark:bg-slate-850/50"
                />
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {customer.quotations.map((q: any) => (
                    <div
                      key={q.id}
                      onClick={() => navigate(`/quotations/${q.id}`)}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 px-2 rounded-lg cursor-pointer transition-colors text-xs"
                    >
                      <div>
                        <span className="font-semibold text-brand-600 dark:text-brand-400">{q.quotationNumber}</span>
                        <span className="text-slate-800 dark:text-slate-200 font-medium ml-2">{q.title}</span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Issued {new Date(q.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">
                          {formatCurrency(q.totalAmount)}
                        </span>
                        <Badge status={q.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ASSIGNED GUIDES */}
          {activeTab === 'assignments' && (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {assignments.map((asg: any) => (
                <div
                  key={asg.id}
                  onClick={() => navigate(`/guides/assignments/${asg.id}/manifest`)}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 px-2 rounded-lg cursor-pointer transition-colors text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-brand-600 dark:text-brand-400">{asg.assignmentCode}</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{asg.tourName}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Guide: {asg.primaryGuide?.fullName} ({asg.primaryGuide?.phone}) • {new Date(asg.startDate).toLocaleDateString()} to {new Date(asg.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {asg.status}
                    </span>
                    <span className="block text-[10px] text-brand-600 hover:underline mt-1 font-semibold">
                      View Tour Manifest &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Customer Modal */}
      {isEditOpen && (
        <CustomerModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSuccess={fetchCustomer}
          initialData={customer}
        />
      )}

      {/* Add / Edit Member Modal */}
      {isMemberModalOpen && (
        <MemberModal
          isOpen={isMemberModalOpen}
          onClose={() => setIsMemberModalOpen(false)}
          onSuccess={fetchCustomer}
          customerId={customer.id}
          customerType={customer.customerType}
          initialData={editingMember}
        />
      )}

      {/* Universal Excel Import Modal */}
      {isImportModalOpen && (
        <UniversalExcelImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={fetchCustomer}
          customerId={customer.id}
          customerName={customer.organizationName || customer.fullName}
          customerType={customer.customerType}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteCustomer}
        title="Delete Customer Profile"
        message={`Are you sure you want to delete ${customer.organizationName || customer.fullName}? This will archive the record and prevent new bookings.`}
        confirmLabel="Delete Customer"
        isDanger={true}
      />
    </div>
  );
};
