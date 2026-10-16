import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Compass,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Star,
  Edit2,
  Trash2,
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  Lock,
  UserCheck,
  ShieldAlert,
  Clock,
  Briefcase,
  Globe,
  Award,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { StatCard } from '../../components/ui/StatCard.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { GuideModal } from './GuideModal.js';
import { TourGuide, GuideDocument, GuideAvailability } from '../../types/index.js';
import { notifyError } from '../../utils/sweetalert.js';

export const GuideDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [guide, setGuide] = useState<TourGuide | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'assignments' | 'availability' | 'documents' | 'account'>('overview');

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Add Document Modal
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docType, setDocType] = useState('ID_PROOF');
  const [docName, setDocName] = useState('');
  const [docFileUrl, setDocFileUrl] = useState('');
  const [isSubmittingDoc, setIsSubmittingDoc] = useState(false);

  // Add Availability Block Modal
  const [isAvailModalOpen, setIsAvailModalOpen] = useState(false);
  const [availStartDate, setAvailStartDate] = useState('');
  const [availEndDate, setAvailEndDate] = useState('');
  const [availStatus, setAvailStatus] = useState<'AVAILABLE' | 'BLOCKED' | 'LEAVE'>('BLOCKED');
  const [availReason, setAvailReason] = useState('');
  const [isSubmittingAvail, setIsSubmittingAvail] = useState(false);

  // Account Activation Modal (Decoupled Login)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  const fetchGuide = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/guides/${id}`);
      setGuide(res.data);
      if (res.data.email) setAccountEmail(res.data.email);
    } catch (err) {
      console.error('Failed to load guide details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchGuide();
  }, [id]);

  const handleDelete = async () => {
    if (!guide) return;
    try {
      await api.delete(`/guides/${guide.id}`);
      navigate('/guides');
    } catch (err: any) {
      notifyError('Failed to Delete Guide', err.response?.data?.message || 'Failed to remove guide.');
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFileUrl.trim() || !docName.trim()) return;
    setIsSubmittingDoc(true);

    try {
      await api.post(`/guides/${id}/documents`, {
        documentType: docType,
        documentName: docName,
        fileUrl: docFileUrl,
      });
      setIsDocModalOpen(false);
      setDocName('');
      setDocFileUrl('');
      fetchGuide();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upload document.');
    } finally {
      setIsSubmittingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to remove this document?')) return;
    try {
      await api.delete(`/guides/${id}/documents/${docId}`);
      fetchGuide();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove document.');
    }
  };

  const handleAddAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!availStartDate || !availEndDate) return;
    setIsSubmittingAvail(true);

    try {
      await api.post(`/guides/${id}/availability`, {
        startDate: availStartDate,
        endDate: availEndDate,
        status: availStatus,
        reason: availReason,
      });
      setIsAvailModalOpen(false);
      setAvailStartDate('');
      setAvailEndDate('');
      setAvailReason('');
      fetchGuide();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save availability block.');
    } finally {
      setIsSubmittingAvail(false);
    }
  };

  const handleDeleteAvailability = async (availId: string) => {
    try {
      await api.delete(`/guides/${id}/availability/${availId}`);
      fetchGuide();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete availability record.');
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountError(null);
    setIsSubmittingAccount(true);

    try {
      await api.post(`/guides/${id}/account`, {
        email: accountEmail,
        password: accountPassword,
      });
      setIsAccountModalOpen(false);
      setAccountPassword('');
      fetchGuide();
    } catch (err: any) {
      setAccountError(err.response?.data?.message || 'Failed to create login account.');
    } finally {
      setIsSubmittingAccount(false);
    }
  };

  const handleToggleAccountStatus = async (newStatus: 'ACTIVE' | 'SUSPENDED') => {
    try {
      await api.patch(`/guides/${id}/account-status`, { status: newStatus });
      fetchGuide();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update account status.');
    }
  };

  const parseLanguages = (raw?: string | null): string[] => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return raw.split(',').map((s) => s.trim());
    }
    return [];
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-60" />
        <div className="h-32 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800" />
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Guide record not found.</p>
        <button
          onClick={() => navigate('/guides')}
          className="mt-2 text-xs font-semibold text-brand-600 hover:underline"
        >
          Return to Directory
        </button>
      </div>
    );
  }

  const primaryAssignments = guide.primaryAssignments || [];
  const documents: GuideDocument[] = guide.documents || [];
  const availabilities: GuideAvailability[] = guide.availabilities || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/guides')}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">{guide.fullName}</h1>
              <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800">
                {guide.guideCode}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  guide.guideType === 'INTERNAL'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                    : guide.guideType === 'FREELANCE'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                }`}
              >
                {guide.guideType}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  guide.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                    : guide.status === 'SUSPENDED'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                    : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {guide.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Registered guide since {new Date(guide.createdAt).toLocaleDateString()} • {guide.city || 'Base City'}, {guide.state || 'Karnataka'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={`tel:${guide.phone}`}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
            title="Call Guide"
          >
            <Phone className="w-4 h-4 text-blue-600" />
          </a>
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs hover:bg-slate-50"
          >
            <Edit2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Edit Profile</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50"
            title="Delete Guide"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tours Assigned"
          value={primaryAssignments.length}
          subtitle="All-time tour assignments"
          icon={Compass}
          iconBg="bg-blue-50 dark:bg-blue-950/40"
          iconColor="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          title="Rating"
          value={guide.rating ? `${guide.rating.toFixed(1)} / 5.0` : '5.0 / 5.0'}
          subtitle="Customer satisfaction"
          icon={Star}
          iconBg="bg-amber-50 dark:bg-amber-950/40"
          iconColor="text-amber-500"
        />
        <StatCard
          title="Daily Rate"
          value={`₹${Number(guide.dailyRate || 0).toLocaleString('en-IN')}`}
          subtitle="Commercial compensation"
          icon={Award}
          iconBg="bg-emerald-50 dark:bg-emerald-950/40"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="CRM Portal Access"
          value={guide.userId ? 'Activated' : 'Standby'}
          subtitle={guide.user?.status || 'No user login linked'}
          icon={UserCheck}
          iconBg={guide.userId ? 'bg-purple-50 dark:bg-purple-950/40' : 'bg-slate-100 dark:bg-slate-800'}
          iconColor={guide.userId ? 'text-purple-600' : 'text-slate-400'}
        />
      </div>

      {/* Layout: Sidebar card + Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Summary info */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4 text-xs">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
            Key Guide Details
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <Phone className="w-4 h-4 text-slate-400" />
              <span className="font-semibold">{guide.phone}</span>
            </div>
            {guide.email && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{guide.email}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>
                {guide.city ? `${guide.city}, ` : ''}{guide.state || 'Karnataka'}{guide.pincode ? ` - ${guide.pincode}` : ''}
              </span>
            </div>
            {guide.licenseNumber && (
              <div className="flex items-center gap-2 font-mono text-slate-700 dark:text-slate-300">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Badge: {guide.licenseNumber}</span>
              </div>
            )}
          </div>

          {/* Languages */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Languages Fluency
            </span>
            <div className="flex flex-wrap gap-1">
              {parseLanguages(guide.languages).map((l, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800"
                >
                  {l}
                </span>
              ))}
            </div>
          </div>

          {/* Emergency Contact */}
          {guide.emergencyContactPhone && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Emergency Contact
              </span>
              <p className="font-semibold text-slate-900 dark:text-white">
                {guide.emergencyContactName || 'Family Contact'}{' '}
                {guide.emergencyContactRelation && (
                  <span className="text-slate-400 font-normal">({guide.emergencyContactRelation})</span>
                )}
              </p>
              <a
                href={`tel:${guide.emergencyContactPhone}`}
                className="text-brand-600 hover:underline block font-mono"
              >
                {guide.emergencyContactPhone}
              </a>
            </div>
          )}
        </div>

        {/* Right Side: Tabbed Interface */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-2 mb-4 text-xs font-semibold overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`pb-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'overview'
                  ? 'text-brand-600 border-b-2 border-brand-600 -mb-2.5 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Overview & Competencies
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('assignments')}
              className={`pb-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'assignments'
                  ? 'text-brand-600 border-b-2 border-brand-600 -mb-2.5 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Tour Assignments ({primaryAssignments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('availability')}
              className={`pb-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'availability'
                  ? 'text-brand-600 border-b-2 border-brand-600 -mb-2.5 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Availability Roster ({availabilities.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('documents')}
              className={`pb-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'documents'
                  ? 'text-brand-600 border-b-2 border-brand-600 -mb-2.5 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Documents & Badges ({documents.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('account')}
              className={`pb-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'account'
                  ? 'text-brand-600 border-b-2 border-brand-600 -mb-2.5 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Portal Login & Access
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg space-y-1">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">Core Expertise</span>
                <p className="text-slate-600 dark:text-slate-400">{guide.expertise || 'General tourism and sightseeing'}</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg space-y-1">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">Preferred Destinations & Circuits</span>
                <p className="text-slate-600 dark:text-slate-400">{guide.destinations || 'All regional routes'}</p>
              </div>

              {guide.qualifications && (
                <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg space-y-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">Certifications & Training</span>
                  <p className="text-slate-600 dark:text-slate-400">{guide.qualifications}</p>
                </div>
              )}

              {guide.notes && (
                <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg space-y-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">Internal Staff Notes</span>
                  <p className="text-slate-600 dark:text-slate-400">{guide.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TOUR ASSIGNMENTS */}
          {activeTab === 'assignments' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate('/guides/assignments')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Assign New Tour</span>
                </button>
              </div>

              {primaryAssignments.length === 0 ? (
                <EmptyState
                  title="No tour assignments recorded yet"
                  description="Assign this guide to confirmed bookings or group tours."
                  className="py-8 border-none bg-slate-50/50"
                />
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {primaryAssignments.map((asg) => (
                    <div
                      key={asg.id}
                      onClick={() => navigate(`/guides/assignments/${asg.id}/manifest`)}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-850 px-2 rounded-lg cursor-pointer transition-colors text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-brand-600 dark:text-brand-400">{asg.assignmentCode}</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{asg.tourName}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Dates: {new Date(asg.startDate).toLocaleDateString()} to {new Date(asg.endDate).toLocaleDateString()} • {asg.passengerCount} Pax
                          {asg.reportingTime && ` • Reporting: ${asg.reportingTime}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {asg.status}
                        </span>
                        <span className="block text-[10px] text-brand-600 hover:underline mt-1 font-semibold">
                          View Manifest &rarr;
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AVAILABILITY ROSTER */}
          {activeTab === 'availability' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Record off-duty, leave, or reserved blackout dates</span>
                <button
                  type="button"
                  onClick={() => setIsAvailModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Block Dates</span>
                </button>
              </div>

              {availabilities.length === 0 ? (
                <EmptyState
                  title="No blocked dates on roster"
                  description="This guide is currently marked available for future tour schedules."
                  className="py-8 border-none bg-slate-50/50"
                />
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {availabilities.map((av) => (
                    <div key={av.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {new Date(av.startDate).toLocaleDateString()} to {new Date(av.endDate).toLocaleDateString()}
                        </span>
                        {av.reason && <p className="text-[11px] text-slate-500 mt-0.5">{av.reason}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            av.status === 'LEAVE'
                              ? 'bg-amber-100 text-amber-800'
                              : av.status === 'BLOCKED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {av.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteAvailability(av.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Remove block"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DOCUMENTS & BADGES */}
          {activeTab === 'documents' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Government tourist guides badges, ID cards, certificates</span>
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Document</span>
                </button>
              </div>

              {documents.length === 0 ? (
                <EmptyState
                  title="No documents uploaded yet"
                  description="Keep official guide licenses, Aadhaar/ID proof, and police clearances on file."
                  className="py-8 border-none bg-slate-50/50"
                />
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {documents.map((d) => (
                    <div key={d.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white">{d.documentName}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-100 text-slate-600">
                            {d.documentType}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Uploaded {new Date(d.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            d.verificationStatus === 'VERIFIED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : d.verificationStatus === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {d.verificationStatus}
                        </span>
                        <a
                          href={d.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-600 hover:underline text-xs font-semibold"
                        >
                          View
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(d.id)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PORTAL LOGIN & ACCESS */}
          {activeTab === 'account' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-brand-600" />
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      Decoupled Field Guide Portal Login
                    </span>
                  </div>
                  {guide.userId ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Login Active
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                      Standby (No Login)
                    </span>
                  )}
                </div>

                <p className="text-slate-600 dark:text-slate-400 text-xs">
                  When enabled, this field guide receives their own restricted credentials to view assigned tour manifests, reporting times, passenger rosters, and log progress milestones.
                </p>

                {guide.userId ? (
                  <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Linked User Login:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{guide.user?.email}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Assigned Role:</span>
                      <span className="font-mono text-purple-600 font-bold">TOUR_GUIDE</span>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      {guide.user?.status === 'ACTIVE' ? (
                        <button
                          type="button"
                          onClick={() => handleToggleAccountStatus('SUSPENDED')}
                          className="px-3 py-1.5 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100"
                        >
                          Suspend Guide Access
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleAccountStatus('ACTIVE')}
                          className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100"
                        >
                          Reactivate Guide Access
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAccountModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold shadow-xs text-xs"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Activate Guide Login Account</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditOpen && (
        <GuideModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSuccess={fetchGuide}
          initialData={guide}
        />
      )}

      {/* Upload Document Modal */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-5 space-y-4 text-xs shadow-xl">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Upload Guide Document</h3>
            <form onSubmit={handleAddDocument} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Document Type</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="ID_PROOF">Aadhaar / National ID Proof</option>
                  <option value="GUIDE_LICENSE">Official Tour Guide Badge / License</option>
                  <option value="POLICE_CLEARANCE">Police Verification Certificate</option>
                  <option value="FIRST_AID_CERT">First-Aid / Safety Certification</option>
                  <option value="OTHER">Other Compliance Document</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Document Title *</label>
                <input
                  type="text"
                  required
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g. Karnataka Tourism Badge 2026"
                  className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">File URL / Document Link *</label>
                <input
                  type="text"
                  required
                  value={docFileUrl}
                  onChange={(e) => setDocFileUrl(e.target.value)}
                  placeholder="https://... or uploaded file path"
                  className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDoc}
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold"
                >
                  {isSubmittingDoc ? 'Saving...' : 'Add Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Availability Modal */}
      {isAvailModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-5 space-y-4 text-xs shadow-xl">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Block Availability Dates</h3>
            <form onSubmit={handleAddAvailability} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Start Date *</label>
                <input
                  type="date"
                  required
                  value={availStartDate}
                  onChange={(e) => setAvailStartDate(e.target.value)}
                  className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">End Date *</label>
                <input
                  type="date"
                  required
                  value={availEndDate}
                  onChange={(e) => setAvailEndDate(e.target.value)}
                  className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Status</label>
                <select
                  value={availStatus}
                  onChange={(e) => setAvailStatus(e.target.value as any)}
                  className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="BLOCKED">Blocked / Reserved</option>
                  <option value="LEAVE">On Personal Leave</option>
                  <option value="AVAILABLE">Available</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Reason / Notes</label>
                <input
                  type="text"
                  value={availReason}
                  onChange={(e) => setAvailReason(e.target.value)}
                  placeholder="e.g. Personal family event"
                  className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAvailModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAvail}
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold"
                >
                  {isSubmittingAvail ? 'Saving...' : 'Save Block'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Creation Modal */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-5 space-y-4 text-xs shadow-xl">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Activate Guide Portal Login</h3>
            {accountError && (
              <div className="p-2.5 bg-red-50 text-red-700 rounded-lg border border-red-200">
                {accountError}
              </div>
            )}
            <form onSubmit={handleCreateAccount} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Login Email *</label>
                <input
                  type="email"
                  required
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                  placeholder="guide@ooting.com"
                  className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Initial Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAccount}
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold"
                >
                  {isSubmittingAccount ? 'Creating...' : 'Activate Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Tour Guide"
        message={`Are you sure you want to permanently delete ${guide.fullName} (${guide.guideCode})?`}
        confirmLabel="Delete Guide"
        isDanger={true}
      />
    </div>
  );
};
