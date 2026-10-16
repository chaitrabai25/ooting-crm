import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Compass,
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Phone,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Car,
  Hotel,
  Printer,
  ShieldAlert,
  Send,
  Building,
  User,
  Coffee,
  Bed,
  Search,
  Sparkles,
  Info,
  DollarSign,
  Receipt,
  Plus,
  Trash2,
  Edit,
  Check,
  RotateCcw,
  Droplet,
  Split,
  FileSpreadsheet,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.js';
import { Modal } from '../../components/ui/Modal.js';
import { useAuth } from '../../context/AuthContext.js';
import { notifyError, notifySuccess } from '../../utils/sweetalert.js';
import { TourExpenseModal } from './TourExpenseModal.js';
import { TourExpense, TourExpenseSummary, PassengerExpenseBreakdown } from '../../types/index.js';

interface ItineraryDay {
  id: string;
  dayNumber: number;
  title: string;
  description?: string;
  activities?: string;
  places?: string;
  startTime?: string;
  endTime?: string;
  date?: string;
  highlights?: string;
  travelDetails?: string;
  hotelName?: string;
  hotelLocation?: string;
  hotelStarCategory?: string;
  hotelCheckIn?: string;
  hotelCheckOut?: string;
  mealPlan?: string;
}

interface ManifestPassenger {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  age?: number;
  gender?: string;
  idNumber?: string;
  roleInTrip?: string;
  emergencyContact?: string;
  roomAllocation?: string;
  notes?: string;
  isPrimary?: boolean;
}

interface ManifestCab {
  id: string;
  bookingReference?: string;
  vehicleType: string;
  carNumber?: string;
  driverName?: string;
  driverPhone?: string;
  pickupPlace?: string;
  dropPlace?: string;
  pickupDate?: string;
  pickupTime?: string;
  bookingStatus?: string;
}

interface TourManifestData {
  id: string;
  assignmentCode: string;
  tourName?: string;
  route?: string;
  destination?: string;
  startDate: string;
  endDate: string;
  reportingTime?: string;
  reportingLocation?: string;
  passengerCount: number;
  groupName?: string;
  coordinatorName?: string;
  coordinatorPhone?: string;
  status: 'ASSIGNED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  progressNotes?: string;
  emergencyReported?: boolean;
  emergencyNotes?: string;
  completionReport?: string;
  completedAt?: string;
  notes?: string;
  primaryGuide?: {
    id: string;
    guideCode: string;
    fullName: string;
    phone: string;
    photoUrl?: string;
    languages?: string;
  };
  secondaryGuide?: {
    id: string;
    guideCode: string;
    fullName: string;
    phone: string;
  };
  package?: {
    id: string;
    packageName: string;
    destination: string;
    duration: string;
    description?: string;
    inclusions?: string;
    exclusions?: string;
    itineraries: ItineraryDay[];
  };
  booking?: {
    id: string;
    bookingNumber: string;
    travelStartDate: string;
    travelEndDate: string;
    travellers: number;
    bookingStatus: string;
    travellersList: ManifestPassenger[];
    cabBookings: ManifestCab[];
  };
  customer?: {
    id: string;
    fullName: string;
    phone?: string;
    organizationName?: string;
    category?: string;
    customerType?: string;
    primaryContactName?: string;
    primaryContactPhone?: string;
  };
}

export const AssignedTourManifest: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [manifest, setManifest] = useState<TourManifestData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [passengerSearch, setPassengerSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'itinerary' | 'passengers' | 'cabs' | 'expenses' | 'reports'>('itinerary');

  // Tour Expenses State
  const [expensesSummary, setExpensesSummary] = useState<TourExpenseSummary | null>(null);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedPassengerForExpense, setSelectedPassengerForExpense] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<TourExpense | null>(null);
  const [isSettlingPassenger, setIsSettlingPassenger] = useState<string | null>(null);
  const [isTogglingExpense, setIsTogglingExpense] = useState<string | null>(null);

  // Progress Update Modal
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [progressNotesInput, setProgressNotesInput] = useState('');
  const [progressStatusInput, setProgressStatusInput] = useState('IN_PROGRESS');
  const [isSavingProgress, setIsSavingProgress] = useState(false);

  // Emergency Modal
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [emergencyNotesInput, setEmergencyNotesInput] = useState('');
  const [isSavingEmergency, setIsSavingEmergency] = useState(false);

  // Tour Completion Modal
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completionReportInput, setCompletionReportInput] = useState('');
  const [isSavingComplete, setIsSavingComplete] = useState(false);

  const fetchManifest = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/guides/assignments/${id}/manifest`);
      setManifest(res.data);
      if (res.data.progressNotes) {
        setProgressNotesInput(res.data.progressNotes);
      }
      if (res.data.status) {
        setProgressStatusInput(res.data.status);
      }
    } catch (err: any) {
      notifyError(err.response?.data?.message || 'Failed to load tour manifest.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExpenses = async () => {
    if (!id) return;
    try {
      setIsLoadingExpenses(true);
      const res = await api.get(`/guides/assignments/${id}/expenses`);
      setExpensesSummary(res.data);
    } catch (err: any) {
      console.error('Failed to load tour expenses:', err);
    } finally {
      setIsLoadingExpenses(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchManifest();
      fetchExpenses();
    }
  }, [id]);

  const handleToggleExpenseSettle = async (exp: TourExpense) => {
    if (!id) return;
    try {
      setIsTogglingExpense(exp.id);
      await api.patch(`/guides/assignments/${id}/expenses/${exp.id}/settle`, {
        settledWithCustomer: !exp.settledWithCustomer,
      });
      notifySuccess(!exp.settledWithCustomer ? 'Expense marked as settled' : 'Settlement reset');
      await fetchExpenses();
    } catch (err: any) {
      notifyError(err.response?.data?.message || 'Failed to update settlement status.');
    } finally {
      setIsTogglingExpense(null);
    }
  };

  const handleSettlePassenger = async (passengerId: string, passengerName: string) => {
    if (!id) return;
    try {
      setIsSettlingPassenger(passengerId);
      await api.post(`/guides/assignments/${id}/expenses/settle-passenger`, {
        passengerId,
        notes: `Settled in full with ${passengerName} during tour.`,
      });
      notifySuccess(`All expenses settled for ${passengerName}`);
      await fetchExpenses();
    } catch (err: any) {
      notifyError(err.response?.data?.message || 'Failed to settle passenger expenses.');
    } finally {
      setIsSettlingPassenger(null);
    }
  };

  const handleDeleteExpense = async (expenseId: string, title: string) => {
    if (!id) return;
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await api.delete(`/guides/assignments/${id}/expenses/${expenseId}`);
      notifySuccess('Expense deleted');
      await fetchExpenses();
    } catch (err: any) {
      notifyError(err.response?.data?.message || 'Failed to delete expense.');
    }
  };

  const handleOpenAddExpense = (passengerId?: string | null) => {
    setSelectedPassengerForExpense(passengerId || null);
    setEditingExpense(null);
    setIsExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (exp: TourExpense) => {
    setEditingExpense(exp);
    setSelectedPassengerForExpense(exp.passengerId || null);
    setIsExpenseModalOpen(true);
  };

  const handleUpdateProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      setIsSavingProgress(true);
      await api.patch(`/guides/assignments/${id}/progress`, {
        progressNotes: progressNotesInput,
        status: progressStatusInput,
      });
      setIsProgressModalOpen(false);
      fetchManifest();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update tour progress.');
    } finally {
      setIsSavingProgress(false);
    }
  };

  const handleReportEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      setIsSavingEmergency(true);
      await api.patch(`/guides/assignments/${id}/progress`, {
        emergencyReported: true,
        emergencyNotes: emergencyNotesInput,
      });
      setIsEmergencyModalOpen(false);
      fetchManifest();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to report emergency incident.');
    } finally {
      setIsSavingEmergency(false);
    }
  };

  const handleCompleteTour = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      setIsSavingComplete(true);
      await api.post(`/guides/assignments/${id}/complete`, {
        completionReport: completionReportInput,
      });
      setIsCompleteModalOpen(false);
      fetchManifest();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete tour.');
    } finally {
      setIsSavingComplete(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse p-4">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-60" />
        <div className="h-40 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800" />
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Tour assignment manifest not found or access is restricted.</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-2 text-xs font-semibold text-brand-600 hover:underline"
        >
          Go Back
        </button>
      </div>
    );
  }

  const pkg = manifest.package;
  const booking = manifest.booking;
  const customer = manifest.customer;
  const itineraries = pkg?.itineraries || [];
  const passengers = booking?.travellersList || [];
  const cabs = booking?.cabBookings || [];

  const filteredPassengers = passengers.filter((p) => {
    if (!passengerSearch.trim()) return true;
    const q = passengerSearch.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q) ||
      p.roleInTrip?.toLowerCase().includes(q) ||
      p.roomAllocation?.toLowerCase().includes(q) ||
      p.idNumber?.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <Badge variant="warning">ON TOUR (IN PROGRESS)</Badge>;
      case 'COMPLETED':
        return <Badge variant="success">TOUR COMPLETED</Badge>;
      case 'CONFIRMED':
        return <Badge variant="info">CONFIRMED</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">CANCELLED</Badge>;
      default:
        return <Badge variant="neutral">ASSIGNED</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-16 print:p-0 print:space-y-4">
      {/* Emergency Alert Banner */}
      {manifest.emergencyReported && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-500 text-rose-900 dark:text-rose-100 flex items-start gap-3 shadow-md">
          <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide">🚨 Emergency / Incident Reported</h2>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                Active Incident
              </span>
            </div>
            <p className="text-xs font-medium mt-1 text-rose-800 dark:text-rose-200">
              {manifest.emergencyNotes || 'Emergency logged by tour operations.'}
            </p>
          </div>
        </div>
      )}

      {/* Top Action Bar (Hidden when printing) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                {pkg?.packageName || manifest.destination || 'Field Tour'}
              </h1>
              <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800">
                {manifest.assignmentCode}
              </span>
              {getStatusBadge(manifest.status)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Least-Privilege Authorized Tour Manifest &bull; Operational View
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Manifest</span>
          </button>

          <button
            type="button"
            onClick={() => setIsEmergencyModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Report Emergency</span>
          </button>

          <button
            type="button"
            onClick={() => setIsProgressModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Update Progress</span>
          </button>

          {manifest.status !== 'COMPLETED' && (
            <button
              type="button"
              onClick={() => setIsCompleteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Complete Tour</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tour Summary Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
          {/* Col 1: Destination & Dates */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Tour Window & Destination
            </span>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <MapPin className="w-4 h-4 text-brand-600 shrink-0" />
              <span>{manifest.destination || pkg?.destination || 'Destination'}</span>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {new Date(manifest.startDate).toLocaleDateString()} &rarr; {new Date(manifest.endDate).toLocaleDateString()}
                </span>
              </div>
              {manifest.reportingTime && (
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Reporting: {manifest.reportingTime}</span>
                </div>
              )}
            </div>
          </div>

          {/* Col 2: Group / Organization & Coordinator */}
          <div className="space-y-2 md:pl-4 pt-3 md:pt-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Group & Primary Contact
            </span>
            <div className="text-xs">
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                <span>{customer?.organizationName || manifest.groupName || customer?.fullName || 'Tour Group'}</span>
              </p>
              {customer?.customerType && (
                <span className="inline-block mt-0.5 px-2 py-0.2 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  {customer.customerType} Group
                </span>
              )}
            </div>
            {(manifest.coordinatorName || customer?.primaryContactName) && (
              <div className="text-xs text-slate-600 dark:text-slate-300">
                <span className="text-slate-400 text-[11px] block">Trip Coordinator:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {manifest.coordinatorName || customer?.primaryContactName}
                </span>
                {(manifest.coordinatorPhone || customer?.primaryContactPhone || customer?.phone) && (
                  <div className="flex items-center gap-2 mt-1">
                    <a
                      href={`tel:${manifest.coordinatorPhone || customer?.primaryContactPhone || customer?.phone}`}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:underline"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{manifest.coordinatorPhone || customer?.primaryContactPhone || customer?.phone}</span>
                    </a>
                    <a
                      href={`https://wa.me/${(manifest.coordinatorPhone || customer?.primaryContactPhone || customer?.phone || '').replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-600 hover:text-emerald-700"
                      title="WhatsApp Coordinator"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Col 3: Assigned Guides */}
          <div className="space-y-2 md:pl-4 pt-3 md:pt-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Assigned Field Guide(s)
            </span>
            <div className="text-xs space-y-1.5">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Lead Guide</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {manifest.primaryGuide?.fullName || 'Not assigned'}
                </span>
                {manifest.primaryGuide?.phone && (
                  <a
                    href={`tel:${manifest.primaryGuide.phone}`}
                    className="block text-[11px] text-brand-600 hover:underline font-mono"
                  >
                    {manifest.primaryGuide.phone}
                  </a>
                )}
              </div>
              {manifest.secondaryGuide && (
                <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">2nd Guide</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {manifest.secondaryGuide.fullName}
                  </span>
                  {manifest.secondaryGuide.phone && (
                    <a
                      href={`tel:${manifest.secondaryGuide.phone}`}
                      className="block text-[11px] text-brand-600 hover:underline font-mono"
                    >
                      {manifest.secondaryGuide.phone}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Col 4: Passengers & Headcount */}
          <div className="space-y-2 md:pl-4 pt-3 md:pt-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Operational Headcount
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {manifest.passengerCount || passengers.length || 0}
              </span>
              <span className="text-xs font-semibold text-slate-500">Total Travellers</span>
            </div>
            <div className="text-[11px] text-slate-500 space-y-0.5">
              <p>Booking #{booking?.bookingNumber || 'N/A'}</p>
              {cabs.length > 0 && <p>{cabs.length} Assigned Vehicle(s)</p>}
            </div>
            {manifest.reportingLocation && (
              <div className="text-[11px] text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-500">Pickup Point: </span>
                {manifest.reportingLocation}
              </div>
            )}
          </div>
        </div>

        {/* Live Operational Notes */}
        {manifest.progressNotes && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-lg text-xs">
            <span className="font-bold text-amber-800 dark:text-amber-300 block mb-0.5 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              Latest Field Tour Progress Notes:
            </span>
            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{manifest.progressNotes}</p>
          </div>
        )}
      </div>

      {/* Navigation Tabs (Hidden when printing) */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-semibold overflow-x-auto print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab('itinerary')}
          className={`pb-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'itinerary'
              ? 'text-brand-600 border-b-2 border-brand-600 -mb-2.5 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Day-by-Day Itinerary ({itineraries.length} Days)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('passengers')}
          className={`pb-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'passengers'
              ? 'text-brand-600 border-b-2 border-brand-600 -mb-2.5 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Passenger Manifest & Rooms ({passengers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cabs')}
          className={`pb-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'cabs'
              ? 'text-brand-600 border-b-2 border-brand-600 -mb-2.5 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>Cabs & Drivers ({cabs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('expenses')}
          className={`pb-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'expenses'
              ? 'text-brand-600 border-b-2 border-brand-600 -mb-2.5 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4 text-emerald-600" />
          <span>Tour Expenses & Settlement</span>
          {expensesSummary && expensesSummary.totalTourExpenses > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-bold ml-0.5">
              ₹{expensesSummary.totalTourExpenses.toLocaleString()}
            </span>
          )}
        </button>

        {manifest.completionReport && (
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`pb-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'reports'
                ? 'text-brand-600 border-b-2 border-brand-600 -mb-2.5 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Tour Completion Report</span>
          </button>
        )}
      </div>

      {/* TAB 1: DAY-BY-DAY ITINERARY */}
      {(activeTab === 'itinerary' || (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('print').matches)) && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Compass className="w-4 h-4 text-brand-600" />
            <span>Tour Itinerary & Daily Schedule</span>
          </h2>

          {itineraries.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
              No daily itinerary attached to this package yet.
            </div>
          ) : (
            <div className="space-y-3">
              {itineraries.map((day) => (
                <div
                  key={day.id || day.dayNumber}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 font-bold flex items-center justify-center text-xs shrink-0">
                        D{day.dayNumber}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {day.title || `Day ${day.dayNumber}`}
                      </h3>
                    </div>
                    {day.date && (
                      <span className="text-xs font-semibold text-slate-500">
                        {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Activities & Places */}
                    <div className="space-y-1.5">
                      {day.places && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Places To Visit:
                          </span>
                          <p className="text-slate-800 dark:text-slate-200 font-medium">{day.places}</p>
                        </div>
                      )}
                      {day.activities && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Scheduled Activities:
                          </span>
                          <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{day.activities}</p>
                        </div>
                      )}
                      {day.highlights && (
                        <div>
                          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                            Key Highlights:
                          </span>
                          <p className="text-amber-800 dark:text-amber-300 font-medium">{day.highlights}</p>
                        </div>
                      )}
                    </div>

                    {/* Hotel, Meal Plan & Logistics */}
                    <div className="space-y-1.5 bg-slate-50/60 dark:bg-slate-800/40 p-3 rounded-lg">
                      {day.hotelName && (
                        <div className="flex items-start gap-2">
                          <Hotel className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {day.hotelName} {day.hotelStarCategory ? `(${day.hotelStarCategory}★)` : ''}
                            </span>
                            {day.hotelLocation && (
                              <p className="text-[11px] text-slate-500">{day.hotelLocation}</p>
                            )}
                          </div>
                        </div>
                      )}
                      {day.mealPlan && (
                        <div className="flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                          <Coffee className="w-3.5 h-3.5 shrink-0" />
                          <span>Meal Plan: {day.mealPlan}</span>
                        </div>
                      )}
                      {day.travelDetails && (
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-700">
                          <span className="font-semibold text-slate-500">Travel Instructions: </span>
                          {day.travelDetails}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PASSENGERS MANIFEST & ROOM ALLOCATIONS */}
      {activeTab === 'passengers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-600" />
              <span>Passenger Manifest, Room Allocations & Emergency Info</span>
            </h2>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search passenger, room, role..."
                value={passengerSearch}
                onChange={(e) => setPassengerSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          {passengers.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
              No passengers enrolled in this booking manifest yet.
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-3 py-2.5">#</th>
                      <th className="px-3 py-2.5">Passenger Name</th>
                      <th className="px-3 py-2.5">Role / Category</th>
                      <th className="px-3 py-2.5">Age / Gender</th>
                      <th className="px-3 py-2.5">Room Allocation</th>
                      <th className="px-3 py-2.5">Phone / Emergency</th>
                      <th className="px-3 py-2.5">Dietary / Medical Notes</th>
                      <th className="px-3 py-2.5">Expenses & Balance</th>
                      <th className="px-3 py-2.5 text-right">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredPassengers.map((p, idx) => {
                      const breakdown = expensesSummary?.passengerBreakdown?.find((b) => b.passengerId === p.id);
                      return (
                        <tr key={p.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-3 py-2.5 font-mono text-[11px] text-slate-400">{idx + 1}</td>
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                              {p.name}
                              {p.isPrimary && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                                  Primary Lead
                                </span>
                              )}
                            </div>
                            {p.idNumber && (
                              <span className="font-mono text-[10px] text-slate-400">ID: {p.idNumber}</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {p.roleInTrip || 'Traveller'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                            {p.age ? `${p.age} yrs` : '-'} {p.gender ? `• ${p.gender}` : ''}
                          </td>
                          <td className="px-3 py-2.5">
                            {p.roomAllocation ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                <Bed className="w-3 h-3" />
                                <span>{p.roomAllocation}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 space-y-0.5">
                            {p.phone ? (
                              <a href={`tel:${p.phone}`} className="text-brand-600 hover:underline block font-mono">
                                {p.phone}
                              </a>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                            {p.emergencyContact && (
                              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium block">
                                Em: {p.emergencyContact}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            {p.notes ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                                {p.notes}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Regular</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            {breakdown && breakdown.totalPayable > 0 ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    ₹{breakdown.totalPayable.toLocaleString()}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                      breakdown.settlementStatus === 'PAID'
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                        : breakdown.settlementStatus === 'PARTIAL'
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                    }`}
                                  >
                                    {breakdown.settlementStatus}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  ₹{breakdown.individualTotal.toLocaleString()} extras + ₹{breakdown.sharedSplitCost.toLocaleString()} shared
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">
                                {expensesSummary?.perPassengerSharedCost && expensesSummary.perPassengerSharedCost > 0
                                  ? `₹${Math.round(expensesSummary.perPassengerSharedCost)} shared pool`
                                  : '₹0'}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenAddExpense(p.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 rounded-md border border-emerald-200 dark:border-emerald-800 transition-colors shadow-2xs"
                              title={`Add expense for ${p.name}`}
                            >
                              <Plus className="w-3 h-3" />
                              <span>Expense</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CAB & DRIVER DETAILS */}
      {activeTab === 'cabs' && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Car className="w-4 h-4 text-brand-600" />
            <span>Assigned Tourist Cabs, Vehicles & Drivers</span>
          </h2>

          {cabs.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
              No cabs or transport assignments attached to this tour booking.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cabs.map((cab) => (
                <div
                  key={cab.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded-lg">
                        <Car className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {cab.vehicleType || 'Vehicle'}
                        </span>
                        {cab.carNumber && (
                          <span className="block font-mono text-xs font-bold text-slate-600 dark:text-slate-300">
                            {cab.carNumber}
                          </span>
                        )}
                      </div>
                    </div>
                    {cab.bookingReference && (
                      <span className="font-mono text-[10px] text-slate-400">
                        Ref: {cab.bookingReference}
                      </span>
                    )}
                  </div>

                  {/* Driver Contact */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Assigned Driver</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {cab.driverName || 'Driver details pending'}
                      </span>
                      {cab.driverPhone && (
                        <span className="block font-mono text-slate-500">{cab.driverPhone}</span>
                      )}
                    </div>
                    {cab.driverPhone && (
                      <a
                        href={`tel:${cab.driverPhone}`}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call Driver</span>
                      </a>
                    )}
                  </div>

                  {/* Route & Timing */}
                  <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                    {cab.pickupPlace && (
                      <div>
                        <span className="text-slate-400 font-semibold">Pickup: </span>
                        <span>{cab.pickupPlace}</span>
                        {cab.pickupTime && <span className="font-mono ml-1 text-slate-500">({cab.pickupTime})</span>}
                      </div>
                    )}
                    {cab.dropPlace && (
                      <div>
                        <span className="text-slate-400 font-semibold">Drop: </span>
                        <span>{cab.dropPlace}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: TOUR EXPENSES & SETTLEMENT MATRIX */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          {/* Header & Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Field Tour Expenses & Passenger Settlement Matrix
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Log customer extras, record common group expenses (water bottles, driver allowance, tolls), and split costs equally across passengers.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleOpenAddExpense(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Customer Expense</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedPassengerForExpense(null);
                  setEditingExpense({
                    id: '',
                    assignmentId: id!,
                    expenseType: 'GENERAL',
                    category: 'WATER_BOTTLE',
                    splitType: 'SPLIT_EQUALLY',
                    amount: 0,
                    title: '',
                    notes: '',
                    settledWithCustomer: false,
                    settlementStatus: 'UNSETTLED',
                    createdAt: '',
                    updatedAt: '',
                  } as any);
                  setIsExpenseModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
              >
                <Droplet className="w-3.5 h-3.5" />
                <span>+ Water / Shared Expense</span>
              </button>

              <button
                type="button"
                onClick={fetchExpenses}
                disabled={isLoadingExpenses}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                title="Refresh Tour Expenses"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isLoadingExpenses ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* 4 Financial Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Tour Incurred */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Total Tour Expenses
                </span>
                <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                ₹{(expensesSummary?.totalTourExpenses || 0).toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {(expensesSummary?.expenses || []).length} total expense item(s) logged
              </p>
            </div>

            {/* Card 2: Customer Individual Extras */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Customer Extras Total
                </span>
                <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600">
                  <User className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                ₹{(expensesSummary?.totalPassengerExpenses || 0).toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {expensesSummary?.passengerExpensesCount || 0} individual personal expense(s)
              </p>
            </div>

            {/* Card 3: General Group Shared Pool */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  General Shared Pool
                </span>
                <span className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/80 text-cyan-600">
                  <Split className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                ₹{(expensesSummary?.totalSharedSplitExpenses || 0).toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Water bottles, parking, tolls & allowances
              </p>
            </div>

            {/* Card 4: Per Passenger Shared Cost */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Per-Passenger Shared Split
                </span>
                <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/80 text-amber-600">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
                ₹{expensesSummary?.perPassengerSharedCost ? Math.round(expensesSummary.perPassengerSharedCost).toLocaleString() : 0}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Split equally among {expensesSummary?.passengerCount || passengers.length || 0} traveller(s)
              </p>
            </div>
          </div>

          {/* Section 1: Passenger Settlement & Recovery Matrix */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden space-y-3 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-brand-600" />
                  <span>Passenger Settlement & Collection Matrix</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Calculation rule: <strong>Net Payable = Customer Extras + Equal Share of Shared Pool (₹{expensesSummary?.perPassengerSharedCost ? Math.round(expensesSummary.perPassengerSharedCost) : 0})</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  {expensesSummary?.passengerBreakdown?.filter((b) => b.settlementStatus === 'PAID').length || 0} /{' '}
                  {expensesSummary?.passengerBreakdown?.length || passengers.length || 0} Settled
                </span>
              </div>
            </div>

            {(!expensesSummary?.passengerBreakdown || expensesSummary.passengerBreakdown.length === 0) ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No passenger breakdown available. Ensure passengers are enrolled in the tour manifest.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-3 py-2.5">#</th>
                      <th className="px-3 py-2.5">Passenger Name</th>
                      <th className="px-3 py-2.5">Room</th>
                      <th className="px-3 py-2.5">Individual Customer Extras</th>
                      <th className="px-3 py-2.5 text-right">Customer Total</th>
                      <th className="px-3 py-2.5 text-right">Shared Pool Share</th>
                      <th className="px-3 py-2.5 text-right">Net Payable</th>
                      <th className="px-3 py-2.5 text-center">Settlement Status</th>
                      <th className="px-3 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {expensesSummary.passengerBreakdown.map((b, idx) => (
                      <tr key={b.passengerId || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-3 py-2.5 font-mono text-[11px] text-slate-400">{idx + 1}</td>
                        <td className="px-3 py-2.5">
                          <span className="font-bold text-slate-900 dark:text-white">{b.passengerName}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          {b.roomNumber ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                              <Bed className="w-3 h-3" />
                              <span>{b.roomNumber}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {b.expenses && b.expenses.length > 0 ? (
                            <div className="space-y-1">
                              {b.expenses.map((e: TourExpense) => (
                                <div
                                  key={e.id}
                                  className="flex items-center justify-between gap-2 p-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-[11px]"
                                >
                                  <div className="flex items-center gap-1 truncate">
                                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                      {e.title}
                                    </span>
                                    {e.category && (
                                      <span className="text-[9px] text-slate-400">
                                        ({e.category.toLowerCase().replace(/_/g, ' ')})
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="font-bold text-slate-900 dark:text-white">
                                      ₹{Number(e.amount).toLocaleString()}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditExpense(e)}
                                      className="p-0.5 text-slate-400 hover:text-brand-600"
                                      title="Edit expense"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteExpense(e.id, e.title)}
                                      className="p-0.5 text-slate-400 hover:text-rose-600"
                                      title="Delete expense"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">No individual extras</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                          ₹{b.individualTotal.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-cyan-600 dark:text-cyan-400 font-semibold">
                          + ₹{b.sharedSplitCost.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-sm text-slate-900 dark:text-white">
                          ₹{b.totalPayable.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              b.settlementStatus === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : b.settlementStatus === 'PARTIAL'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {b.settlementStatus === 'PAID'
                              ? 'PAID IN FULL'
                              : b.settlementStatus === 'PARTIAL'
                              ? 'PARTIALLY SETTLED'
                              : 'PENDING'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right space-x-1 whitespace-nowrap">
                          {b.totalPayable > 0 && b.settlementStatus !== 'PAID' && (
                            <button
                              type="button"
                              onClick={() => handleSettlePassenger(b.passengerId, b.passengerName)}
                              disabled={isSettlingPassenger === b.passengerId}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-2xs transition-colors disabled:opacity-50"
                              title="Mark full payment collected from passenger"
                            >
                              <Check className="w-3 h-3" />
                              <span>{isSettlingPassenger === b.passengerId ? 'Settling...' : 'Mark Paid'}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenAddExpense(b.passengerId)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition-colors"
                            title={`Add extra expense for ${b.passengerName}`}
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: General & Shared Tour Expenses Table (Water, Driver Allowance, Tolls) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden space-y-3 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Droplet className="w-4 h-4 text-cyan-600" />
                  <span>General & Shared Tour Expenses (Water Bottles, Allowances, Tolls)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Package-level common expenses that are divided equally across all tour passengers.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedPassengerForExpense(null);
                  setEditingExpense({
                    id: '',
                    assignmentId: id!,
                    expenseType: 'GENERAL',
                    category: 'WATER_BOTTLE',
                    splitType: 'SPLIT_EQUALLY',
                    amount: 0,
                    title: '',
                    notes: '',
                    settledWithCustomer: false,
                    settlementStatus: 'UNSETTLED',
                    createdAt: '',
                    updatedAt: '',
                  } as any);
                  setIsExpenseModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add General Expense</span>
              </button>
            </div>

            {(!expensesSummary?.expenses || expensesSummary.expenses.filter((e: TourExpense) => e.expenseType === 'GENERAL').length === 0) ? (
              <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                <p>No general or shared package expenses logged yet.</p>
                <p className="text-[11px] text-slate-500">
                  Add expenses like water bottle cartons, toll tickets, parking fees, or driver allowance so they can be split.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-3 py-2.5">Date / Time</th>
                      <th className="px-3 py-2.5">Category</th>
                      <th className="px-3 py-2.5">Expense Title / Description</th>
                      <th className="px-3 py-2.5">Split Rule</th>
                      <th className="px-3 py-2.5 text-right">Amount</th>
                      <th className="px-3 py-2.5">Receipt #</th>
                      <th className="px-3 py-2.5">Notes</th>
                      <th className="px-3 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {expensesSummary.expenses
                      .filter((e: TourExpense) => e.expenseType === 'GENERAL')
                      .map((exp: TourExpense) => (
                        <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-3 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                            <div>{new Date(exp.expenseDate).toLocaleDateString()}</div>
                            {exp.expenseTime && (
                              <div className="text-[10px] text-slate-400 font-mono">{exp.expenseTime}</div>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                              {exp.category.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-white">
                            {exp.title}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {exp.splitType === 'SPLIT_EQUALLY'
                                ? `Split Equally (${passengers.length} pax)`
                                : exp.splitType ? exp.splitType.replace(/_/g, ' ') : 'Shared'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-sm text-slate-900 dark:text-white">
                            ₹{Number(exp.amount).toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">
                            {exp.receiptNumber || '-'}
                          </td>
                          <td className="px-3 py-2.5 text-slate-500 text-[11px] max-w-xs truncate">
                            {exp.notes || '-'}
                          </td>
                          <td className="px-3 py-2.5 text-right space-x-1 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleOpenEditExpense(exp)}
                              className="p-1 rounded text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Edit expense"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteExpense(exp.id, exp.title)}
                              className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Delete expense"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: TOUR COMPLETION REPORT */}
      {activeTab === 'reports' && manifest.completionReport && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Tour Completion Report & Guide Debrief</span>
            </h2>
            {manifest.completedAt && (
              <span className="text-xs text-slate-400">
                Completed on {new Date(manifest.completedAt).toLocaleString()}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
            {manifest.completionReport}
          </p>
        </div>
      )}

      {/* MODAL 1: Update Progress Notes */}
      {isProgressModalOpen && (
        <Modal
          isOpen={isProgressModalOpen}
          onClose={() => setIsProgressModalOpen(false)}
          title="Update Field Tour Progress"
        >
          <form onSubmit={handleUpdateProgress} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tour Operational Status
              </label>
              <select
                value={progressStatusInput}
                onChange={(e) => setProgressStatusInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="IN_PROGRESS">IN_PROGRESS (Currently on Tour)</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Live Field Notes / Progress Log
              </label>
              <textarea
                rows={4}
                value={progressNotesInput}
                onChange={(e) => setProgressNotesInput(e.target.value)}
                placeholder="e.g. Departed Bangalore at 07:00 AM. Breakfast stop completed. Reached Mysore palace on schedule..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsProgressModalOpen(false)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingProgress}
                className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold disabled:opacity-50"
              >
                {isSavingProgress ? 'Saving...' : 'Save Progress'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: Report Emergency */}
      {isEmergencyModalOpen && (
        <Modal
          isOpen={isEmergencyModalOpen}
          onClose={() => setIsEmergencyModalOpen(false)}
          title="🚨 Report Field Incident / Emergency"
        >
          <form onSubmit={handleReportEmergency} className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200">
              <p className="font-bold">Urgent Notice</p>
              <p className="mt-0.5 text-[11px]">
                Submitting this alert flags this tour manifest immediately across the CRM and notifies operations managers.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Incident Description & Immediate Needs *
              </label>
              <textarea
                required
                rows={4}
                value={emergencyNotesInput}
                onChange={(e) => setEmergencyNotesInput(e.target.value)}
                placeholder="Describe the medical emergency, road accident, breakdown, or severe weather incident..."
                className="w-full px-3 py-2 rounded-lg border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsEmergencyModalOpen(false)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingEmergency}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold disabled:opacity-50"
              >
                {isSavingEmergency ? 'Submitting Alert...' : 'Submit Emergency Report'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: Tour Completion Report */}
      {isCompleteModalOpen && (
        <Modal
          isOpen={isCompleteModalOpen}
          onClose={() => setIsCompleteModalOpen(false)}
          title="Complete Tour & Submit Debrief"
        >
          <form onSubmit={handleCompleteTour} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tour Completion Summary & Feedback
              </label>
              <textarea
                rows={5}
                value={completionReportInput}
                onChange={(e) => setCompletionReportInput(e.target.value)}
                placeholder="Summarize the successful tour completion, traveller feedback, places visited, hotel check-out status, and any observations..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCompleteModalOpen(false)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingComplete}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold disabled:opacity-50"
              >
                {isSavingComplete ? 'Submitting...' : 'Confirm Tour Completed'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 4: Tour Expense Recording / Editing Modal */}
      {isExpenseModalOpen && (
        <TourExpenseModal
          isOpen={isExpenseModalOpen}
          onClose={() => {
            setIsExpenseModalOpen(false);
            setEditingExpense(null);
            setSelectedPassengerForExpense(null);
          }}
          onSuccess={() => {
            setIsExpenseModalOpen(false);
            setEditingExpense(null);
            setSelectedPassengerForExpense(null);
            fetchExpenses();
          }}
          assignmentId={id!}
          passengers={passengers.map((p) => ({
            id: p.id,
            name: p.name,
            roomAllocation: p.roomAllocation,
            roleInTrip: p.roleInTrip,
            phone: p.phone,
          }))}
          initialPassengerId={selectedPassengerForExpense}
          editingExpense={editingExpense}
        />
      )}
    </div>
  );
};
