import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  ArrowLeft,
  Edit2,
  Trash2,
  DollarSign,
  FileText,
  CreditCard,
  Tag,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Award,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.js';
import { CopyButton } from '../../components/ui/CopyButton.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { WhatsAppModal } from '../../components/whatsapp/WhatsAppModal.js';
import { SupplierModal } from './SupplierModal.js';
import { Supplier } from '../../types/index.js';

export const SupplierDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // WhatsApp modal state
  const [whatsAppData, setWhatsAppData] = useState<{
    isOpen: boolean;
    customerName: string;
    customerPhone: string;
  }>({
    isOpen: false,
    customerName: '',
    customerPhone: '',
  });

  const fetchSupplier = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/suppliers/${id}`);
      setSupplier(res.data);
    } catch (err) {
      console.error('Failed to fetch supplier details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchSupplier();
  }, [id]);

  const handleDelete = async () => {
    if (!supplier) return;
    try {
      setIsDeleting(true);
      await api.delete(`/suppliers/${supplier.id}`);
      navigate('/suppliers');
    } catch (err: any) {
      console.error('Failed to delete supplier:', err);
      alert(err.response?.data?.message || 'Failed to delete supplier.');
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse p-6">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-48" />
        <div className="h-64 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Supplier Not Found</h2>
        <button
          onClick={() => navigate('/suppliers')}
          className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-brand-600 rounded-xl"
        >
          Back to Supplier Directory
        </button>
      </div>
    );
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'INACTIVE':
        return 'warning';
      case 'BLACKLISTED':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Back Button & Actions Header */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/suppliers')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to B2B Service Providers</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl shadow-xs transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5 text-brand-600" />
            <span>Edit Provider</span>
          </button>
          <button
            onClick={() => setIsDeleteOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl shadow-xs transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Hero Profile Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#C91F28]/10 border border-[#C91F28]/20 flex items-center justify-center text-[#C91F28] flex-shrink-0">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {supplier.name}
                </h1>
                <Badge status={supplier.status} />
                
                {/* Tier Badge */}
                <span
                  className={`inline-flex items-center gap-1 px-3 py-0.5 text-xs font-bold rounded-full border shadow-xs ${
                    supplier.tier === 'Diamond'
                      ? 'bg-cyan-50 text-cyan-700 border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800'
                      : supplier.tier === 'Gold'
                      ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                      : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  }`}
                >
                  {supplier.tier === 'Diamond' && <Sparkles className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />}
                  {supplier.tier === 'Gold' && <Award className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
                  {supplier.tier || 'Silver'} Tier
                </span>

                <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  {supplier.supplierType}
                </span>
              </div>

              {/* Service Categories Chips */}
              {(() => {
                let cats: string[] = [];
                if (Array.isArray(supplier.serviceCategories)) {
                  cats = supplier.serviceCategories;
                } else if (typeof supplier.serviceCategories === 'string') {
                  try {
                    cats = JSON.parse(supplier.serviceCategories);
                  } catch {
                    cats = [supplier.serviceCategories];
                  }
                }
                return cats.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {cats.map((c) => (
                      <span
                        key={c}
                        className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                ) : null;
              })()}

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-2 flex-wrap">
                {(supplier.city || supplier.state) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <strong>{supplier.city || '—'}</strong>
                    {supplier.district && <span>({supplier.district})</span>}
                    {supplier.state && <span>, {supplier.state}</span>}
                    {supplier.pincode && <span>- {supplier.pincode}</span>}
                  </span>
                )}
                {supplier.contactPerson && (
                  <span>• Contact: <strong className="text-slate-700 dark:text-slate-200">{supplier.contactPerson}</strong></span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={`tel:${supplier.phone}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call</span>
            </a>
            <button
              onClick={() =>
                setWhatsAppData({
                  isOpen: true,
                  customerName: supplier.contactPerson || supplier.name,
                  customerPhone: supplier.whatsapp || supplier.phone,
                })
              }
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 rounded-xl transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
            {supplier.email && (
              <a
                href={`mailto:${supplier.email}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email</span>
              </a>
            )}
            {supplier.website && (
              <a
                href={supplier.website.startsWith('http') ? supplier.website : `https://${supplier.website}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Website</span>
              </a>
            )}
          </div>
        </div>

        {/* Key Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Primary Phone</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="font-semibold text-slate-800 dark:text-slate-200">{supplier.phone}</span>
              <CopyButton text={supplier.phone} />
            </div>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">PAN Number</span>
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
              {supplier.panNumber || '—'}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">GSTIN</span>
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
              {supplier.gstNumber || 'Not Specified'}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Credit Limit</span>
            <span className="font-semibold text-brand-600 dark:text-brand-400 mt-0.5 block">
              ₹{(supplier.creditLimit || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Assigned Staff</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
              {supplier.assignedUser?.name || 'Unassigned'}
            </span>
          </div>
        </div>
      </div>

      {/* Category Specific Details Card if available */}
      {(() => {
        let detailsObj: any = null;
        if (typeof supplier.categoryDetails === 'string' && supplier.categoryDetails) {
          try {
            detailsObj = JSON.parse(supplier.categoryDetails);
          } catch {
            detailsObj = null;
          }
        } else if (typeof supplier.categoryDetails === 'object') {
          detailsObj = supplier.categoryDetails;
        }

        if (!detailsObj || Object.keys(detailsObj).length === 0) return null;

        return (
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#C91F28]" />
              <span>Category Specific Service Details</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(detailsObj).map(([catKey, val]: [string, any]) => {
                if (!val || (typeof val === 'object' && Object.keys(val).length === 0)) return null;
                return (
                  <div
                    key={catKey}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-1.5"
                  >
                    <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide text-[11px] block">
                      {catKey.replace(/([A-Z])/g, ' $1')}
                    </span>
                    {typeof val === 'object' ? (
                      <dl className="space-y-1 text-slate-600 dark:text-slate-300">
                        {Object.entries(val).map(([subK, subV]) => (
                          <div key={subK} className="flex justify-between gap-2 text-[11px]">
                            <dt className="text-slate-400 capitalize">{subK.replace(/([A-Z])/g, ' $1')}:</dt>
                            <dd className="font-medium text-slate-800 dark:text-slate-200 text-right">{String(subV)}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="text-slate-700 dark:text-slate-300 text-[11px]">{String(val)}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Detailed Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Services & Destinations */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-brand-600" />
            <span>Services & Operational Scope</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">Services Provided:</span>
              <p className="text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                {supplier.servicesProvided || 'No specific services listed.'}
              </p>
            </div>

            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">Destinations Covered:</span>
              <p className="text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                {supplier.destinationsCovered || 'All regional destinations.'}
              </p>
            </div>

            {supplier.contractDetails && (
              <div>
                <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">Contract / MoU Terms:</span>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  {supplier.contractDetails}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Financial & Settlement Terms */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <span>Commercial & Banking Terms</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">Payment Terms:</span>
              <p className="text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                {supplier.paymentTerms || 'Standard Payment on Confirmation'}
              </p>
            </div>

            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">Commission / Discount Margin:</span>
              <p className="text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                {supplier.commissionDetails || 'Direct net rate contracted'}
              </p>
            </div>

            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">Bank Settlement Details:</span>
              <div className="text-slate-800 dark:text-slate-200 font-mono text-[11px] whitespace-pre-wrap bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                {supplier.bankDetails || 'No bank account details uploaded.'}
              </div>
            </div>
          </div>
        </div>

        {/* Address & Operational Notes */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 text-xs">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-600" />
            <span>Address & Internal Notes</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">Full Property / Office Address:</span>
              <p className="text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                {supplier.address || 'Address not specified'}
              </p>
            </div>

            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">Internal Notes & Instructions:</span>
              <p className="text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                {supplier.notes || 'No internal notes recorded.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <SupplierModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={fetchSupplier}
        supplier={supplier}
      />

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title={`Delete Supplier: ${supplier.name}`}
        message="Are you sure you want to permanently delete this supplier? This action cannot be undone."
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Supplier'}
        isDanger={true}
      />

      <WhatsAppModal
        isOpen={whatsAppData.isOpen}
        onClose={() => setWhatsAppData((prev) => ({ ...prev, isOpen: false }))}
        recipientName={whatsAppData.customerName}
        recipientPhone={whatsAppData.customerPhone}
      />
    </div>
  );
};
