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
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.js';
import { StatCard } from '../../components/ui/StatCard.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { CustomerModal } from './CustomerModal.js';

export const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bookings' | 'leads' | 'quotations' | 'notes'>('bookings');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCustomer = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/customers/${id}`);
      setCustomer(res.data);
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
      alert(err.response?.data?.message || 'Failed to delete customer.');
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
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
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">{customer.fullName}</h1>
              <Badge status={customer.status} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customer since {new Date(customer.createdAt).toLocaleDateString()} • Source: {customer.source || 'Direct'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
        <StatCard
          title="Lifetime Bookings"
          value={metrics.totalBookings ?? 0}
          subtitle="Total trips confirmed"
          icon={BookmarkCheck}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
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
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Contact & Profile
          </h3>
          <div className="space-y-3 text-xs">
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

        {/* 360 Tabs (Bookings, Leads, Quotations) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
          {/* Tab Navigation */}
          <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-2 mb-4 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('bookings')}
              className={`pb-2 transition-colors relative cursor-pointer ${
                activeTab === 'bookings'
                  ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 -mb-2.5 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Bookings ({customer.bookings?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('leads')}
              className={`pb-2 transition-colors relative cursor-pointer ${
                activeTab === 'leads'
                  ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 -mb-2.5 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Enquiries ({customer.leads?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('quotations')}
              className={`pb-2 transition-colors relative cursor-pointer ${
                activeTab === 'quotations'
                  ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 -mb-2.5 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Quotations ({customer.quotations?.length || 0})
            </button>
          </div>

          {/* Bookings Tab */}
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
                    const paid = b.payments
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
                            Travel: {new Date(b.travelStartDate).toLocaleDateString()} to{' '}
                            {new Date(b.travelEndDate).toLocaleDateString()} ({b.travellers} Pax)
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="font-bold text-slate-900 dark:text-slate-100 block">{formatCurrency(b.finalAmount)}</span>
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block">Paid: {formatCurrency(paid)}</span>
                          {balance > 0 && (
                            <span className="text-[11px] text-rose-600 dark:text-rose-400 block">Due: {formatCurrency(balance)}</span>
                          )}
                          <div className="mt-1">
                            <Badge status={b.bookingStatus} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Leads Tab */}
          {activeTab === 'leads' && (
            <div>
              {customer.leads?.length === 0 ? (
                <EmptyState
                  title="No enquiries recorded"
                  description="Customer has no active or past enquiries."
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
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{l.destination}</span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Created {new Date(l.createdAt).toLocaleDateString()} • {l.adults}A {l.children}C
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge status={l.enquiryStatus} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quotations Tab */}
          {activeTab === 'quotations' && (
            <div>
              {customer.quotations?.length === 0 ? (
                <EmptyState
                  title="No quotations created"
                  description="Create a branded quotation for this customer."
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
                        <span className="text-slate-800 dark:text-slate-200 font-medium ml-2">{q.destination}</span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {new Date(q.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">{formatCurrency(q.finalAmount)}</span>
                        <Badge status={q.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Customer Modal */}
      {isEditOpen && (
        <CustomerModal
          isOpen={isEditOpen}
          initialData={customer}
          onClose={() => setIsEditOpen(false)}
          onSuccess={() => fetchCustomer()}
        />
      )}

      {/* Delete Customer Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteCustomer}
        title={`Delete Customer: ${customer?.fullName}`}
        message={`Are you sure you want to permanently delete this customer profile for ${customer?.fullName}? This action cannot be undone.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Customer'}
        isDanger={true}
      />
    </div>
  );
};
