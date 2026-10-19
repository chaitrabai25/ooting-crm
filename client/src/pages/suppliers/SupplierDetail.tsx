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
  Hotel,
  Car,
  Bus,
  Compass,
  Mountain,
  Ticket,
  Utensils,
  Plane,
  Star,
  Clock,
  Layers,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.js';
import { StatusToggle } from '../../components/ui/StatusToggle.js';
import { CopyButton } from '../../components/ui/CopyButton.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { WhatsAppModal } from '../../components/whatsapp/WhatsAppModal.js';
import { SupplierModal } from './SupplierModal.js';
import { Supplier } from '../../types/index.js';
import { notifyError } from '../../utils/sweetalert.js';
import { useAuth } from '../../context/AuthContext.js';

export const SupplierDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can, isSuperAdmin } = useAuth();

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
      notifyError('Failed to Delete Supplier', err.response?.data?.message || 'Failed to delete supplier.');
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
          {(isSuperAdmin || can('suppliers', 'edit')) && (
            <button
              onClick={() => setIsEditOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-brand-600" />
              <span>Edit Provider</span>
            </button>
          )}
          {(isSuperAdmin || can('suppliers', 'delete')) && (
            <button
              onClick={() => setIsDeleteOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
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
                <StatusToggle
                  status={supplier.status}
                  activeValue="ACTIVE"
                  inactiveValue="INACTIVE"
                  disabled={!isSuperAdmin && !can('suppliers', 'edit')}
                  onToggle={async (next) => {
                    await api.patch(`/suppliers/${id}/status`, { status: next });
                    setSupplier((prev: any) => ({ ...prev, status: next }));
                  }}
                />
                
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

        const formatLabel = (key: string) => {
          return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (str) => str.toUpperCase())
            .replace(/Ac Type/i, 'AC Type')
            .replace(/Gst/i, 'GST')
            .replace(/Pan/i, 'PAN');
        };

        const getCategoryHeaderInfo = (catKey: string) => {
          const lower = catKey.toLowerCase();
          if (lower.includes('hotel')) {
            return {
              title: 'Hotel & Resort Logistics',
              icon: <Hotel className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
              accentBorder: 'border-blue-200 dark:border-blue-900/60',
              badgeBg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
            };
          }
          if (lower.includes('bus')) {
            return {
              title: 'Bus & Coach Fleet Logistics',
              icon: <Bus className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
              accentBorder: 'border-purple-200 dark:border-purple-900/60',
              badgeBg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
            };
          }
          if (lower.includes('cab')) {
            return {
              title: 'Cab & Fleet Services',
              icon: <Car className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
              accentBorder: 'border-amber-200 dark:border-amber-900/60',
              badgeBg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
            };
          }
          if (lower.includes('guide')) {
            return {
              title: 'Tour Guide & Escort Services',
              icon: <Compass className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
              accentBorder: 'border-teal-200 dark:border-teal-900/60',
              badgeBg: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
            };
          }
          if (lower.includes('adventure')) {
            return {
              title: 'Adventure & Activities',
              icon: <Mountain className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
              accentBorder: 'border-emerald-200 dark:border-emerald-900/60',
              badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
            };
          }
          return {
            title: formatLabel(catKey),
            icon: <ShieldCheck className="w-4 h-4 text-slate-600 dark:text-slate-400" />,
            accentBorder: 'border-slate-200 dark:border-slate-800',
            badgeBg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
          };
        };

        return (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#C91F28]" />
                  <span>Category Specific Service Details</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Verified fleet specifications, hotel room configurations, and operational parameters.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(detailsObj).map(([catKey, val]: [string, any]) => {
                if (!val || (typeof val === 'object' && Object.keys(val).length === 0)) return null;
                const headerInfo = getCategoryHeaderInfo(catKey);

                if (typeof val !== 'object') {
                  return (
                    <div
                      key={catKey}
                      className={`p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border ${headerInfo.accentBorder} space-y-2`}
                    >
                      <div className="flex items-center gap-2">
                        {headerInfo.icon}
                        <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                          {headerInfo.title}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300">{String(val)}</p>
                    </div>
                  );
                }

                // Filter out empty values
                const validEntries = Object.entries(val).filter(
                  ([_, v]) => v !== '' && v !== null && v !== undefined
                );

                if (validEntries.length === 0) return null;

                // Extract highlight badges
                const highlights: { label: string; value: string; isPrimary?: boolean }[] = [];
                if (val.starCategory) {
                  highlights.push({ label: 'Star', value: val.starCategory.replace('_', ' '), isPrimary: true });
                }
                if (val.numberOfRooms) {
                  highlights.push({ label: 'Rooms', value: `${val.numberOfRooms} Rooms` });
                }
                if (val.vehicleType) {
                  highlights.push({ label: 'Vehicle', value: String(val.vehicleType), isPrimary: true });
                }
                if (val.capacity || val.seatingCapacity) {
                  highlights.push({ label: 'Capacity', value: `${val.capacity || val.seatingCapacity} Seats` });
                }
                if (val.acType) {
                  highlights.push({ label: 'AC', value: String(val.acType) });
                }
                if (val.specialization) {
                  highlights.push({ label: 'Specialization', value: String(val.specialization), isPrimary: true });
                }

                // Remaining attributes to display in grid
                const remainingEntries = validEntries.filter(
                  ([k]) => !['starCategory', 'numberOfRooms', 'vehicleType', 'capacity', 'seatingCapacity', 'acType'].includes(k)
                );

                return (
                  <div
                    key={catKey}
                    className={`rounded-2xl border ${headerInfo.accentBorder} bg-slate-50/50 dark:bg-slate-850/40 overflow-hidden shadow-2xs flex flex-col`}
                  >
                    {/* Header */}
                    <div className="p-4 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2 bg-white dark:bg-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                          {headerInfo.icon}
                        </div>
                        <div>
                          <h3 className="font-bold text-xs text-slate-900 dark:text-white">
                            {headerInfo.title}
                          </h3>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                            {catKey}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${headerInfo.badgeBg}`}>
                        {validEntries.length} Details
                      </span>
                    </div>

                    {/* Highlights Badges */}
                    {highlights.length > 0 && (
                      <div className="px-4 py-2.5 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200/50 dark:border-slate-800 flex flex-wrap gap-1.5">
                        {highlights.map((h, i) => (
                          <span
                            key={i}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                              h.isPrimary
                                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <span>{h.value}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Detailed Key-Values */}
                    <div className="p-4 space-y-2 flex-1">
                      <dl className="grid grid-cols-1 gap-2 text-xs">
                        {remainingEntries.map(([k, v]) => {
                          const isRate = k.toLowerCase().includes('rate') || k.toLowerCase().includes('price');
                          const isContact = k.toLowerCase().includes('phone') || k.toLowerCase().includes('contact') || k.toLowerCase().includes('driver');
                          return (
                            <div
                              key={k}
                              className="p-2 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800/80 flex items-start justify-between gap-2"
                            >
                              <dt className="text-slate-500 dark:text-slate-400 text-[11px] font-medium shrink-0 max-w-[45%]">
                                {formatLabel(k)}:
                              </dt>
                              <dd
                                className={`text-[11.5px] font-semibold text-right break-words ${
                                  isRate
                                    ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                                    : isContact
                                    ? 'text-[#C91F28] dark:text-rose-400'
                                    : 'text-slate-900 dark:text-slate-100'
                                }`}
                              >
                                {String(v)}
                              </dd>
                            </div>
                          );
                        })}
                      </dl>
                    </div>
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
