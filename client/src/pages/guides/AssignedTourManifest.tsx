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
  Link as LinkIcon,
  ExternalLink,
  HeartPulse,
  UserCheck,
  ClipboardCheck,
  Copy,
  Share2,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.js';
import { Modal } from '../../components/ui/Modal.js';
import { useAuth } from '../../context/AuthContext.js';
import { notifyError, notifySuccess, notifyWarning } from '../../utils/sweetalert.js';
import { exportToExcel } from '../../utils/excel.js';
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
  const [activeTab, setActiveTab] = useState<'itinerary' | 'attendance' | 'passengers' | 'cabs' | 'hotels' | 'expenses' | 'reports'>('itinerary');

  // Tour Attendance & Safety Roll-Call State
  const [attendanceCheckpoints, setAttendanceCheckpoints] = useState<any[]>([]);
  const [selectedCheckpointId, setSelectedCheckpointId] = useState<string>('');
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, Record<string, any>>>({});
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [isTogglingPaxAttendance, setIsTogglingPaxAttendance] = useState<string | null>(null);
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState<'ALL' | 'PRESENT' | 'MISSING'>('ALL');
  const [passengerSearch, setPassengerSearch] = useState('');

  // New Checkpoint Modal
  const [isNewCheckpointModalOpen, setIsNewCheckpointModalOpen] = useState(false);
  const [newCheckpointName, setNewCheckpointName] = useState('');
  const [newCheckpointLocation, setNewCheckpointLocation] = useState('');
  const [isSavingCheckpoint, setIsSavingCheckpoint] = useState(false);

  // Cab B2B vs Manual Mode
  const [cabModalMode, setCabModalMode] = useState<'B2B' | 'MANUAL'>('B2B');
  const [transportOptions, setTransportOptions] = useState<any[]>([]);
  const [cabModalSelectedId, setCabModalSelectedId] = useState('');

  // Tour Expenses State
  const [expensesSummary, setExpensesSummary] = useState<TourExpenseSummary | null>(null);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedPassengerForExpense, setSelectedPassengerForExpense] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<TourExpense | null>(null);
  const [defaultExpenseType, setDefaultExpenseType] = useState<'PASSENGER' | 'GENERAL'>('PASSENGER');
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

  // Custom Passenger Modal
  const [isAddPaxModalOpen, setIsAddPaxModalOpen] = useState(false);
  const [paxName, setPaxName] = useState('');
  const [paxPhone, setPaxPhone] = useState('');
  const [paxAge, setPaxAge] = useState('');
  const [paxGender, setPaxGender] = useState('Male');
  const [paxRole, setPaxRole] = useState('Traveller');
  const [paxRoom, setPaxRoom] = useState('');
  const [paxNotes, setPaxNotes] = useState('');
  const [isSavingPax, setIsSavingPax] = useState(false);

  // Itinerary Day Modal (Add / Edit day schedule)
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [dayNumberInput, setDayNumberInput] = useState('1');
  const [dayTitleInput, setDayTitleInput] = useState('');
  const [dayDescInput, setDayDescInput] = useState('');
  const [dayActivitiesInput, setDayActivitiesInput] = useState('');
  const [dayPlacesInput, setDayPlacesInput] = useState('');
  const [dayHotelNameInput, setDayHotelNameInput] = useState('');
  const [dayHotelLocationInput, setDayHotelLocationInput] = useState('');
  const [dayMealPlanInput, setDayMealPlanInput] = useState('Breakfast + Dinner');
  const [dayHighlightsInput, setDayHighlightsInput] = useState('');
  const [isSavingDay, setIsSavingDay] = useState(false);

  // Cab & Driver Logistics Modal
  const [isCabModalOpen, setIsCabModalOpen] = useState(false);
  const [cabDriverNameInput, setCabDriverNameInput] = useState('');
  const [cabDriverPhoneInput, setCabDriverPhoneInput] = useState('');
  const [cabVehicleNumberInput, setCabVehicleNumberInput] = useState('');
  const [cabVehicleTypeInput, setCabVehicleTypeInput] = useState('Innova Crysta');
  const [isSavingCab, setIsSavingCab] = useState(false);

  // Staying Hotel Logistics Modal
  const [isHotelModalOpen, setIsHotelModalOpen] = useState(false);
  const [hotelModalMode, setHotelModalMode] = useState<'B2B' | 'MANUAL'>('B2B');
  const [hotelModalSelectedId, setHotelModalSelectedId] = useState('');
  const [hotelModalNameInput, setHotelModalNameInput] = useState('');
  const [hotelModalLocationInput, setHotelModalLocationInput] = useState('');
  const [hotelModalStarCategoryInput, setHotelModalStarCategoryInput] = useState('3 Star');
  const [hotelModalPhoneInput, setHotelModalPhoneInput] = useState('');
  const [hotelModalMealPlanInput, setHotelModalMealPlanInput] = useState('Breakfast + Dinner');
  const [hotelOptions, setHotelOptions] = useState<any[]>([]);
  const [isSavingHotel, setIsSavingHotel] = useState(false);

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

  const fetchAttendance = async () => {
    if (!id) return;
    try {
      setIsLoadingAttendance(true);
      const res = await api.get(`/guides/assignments/${id}/attendance`);
      const checkpoints = res.data.checkpoints || [];
      setAttendanceCheckpoints(checkpoints);
      if (checkpoints.length > 0 && !selectedCheckpointId) {
        setSelectedCheckpointId(checkpoints[0].id);
      }
      setAttendanceRecords(res.data.records || {});
    } catch (err: any) {
      console.error('Failed to load tour attendance:', err);
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchManifest();
      fetchExpenses();
      fetchAttendance();
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchAttendance();
    }
  }, [activeTab]);

  const handleToggleAttendance = async (paxId: string, currentStatus: string) => {
    if (!id || !selectedCheckpointId) {
      notifyError('Please select or create an attendance checkpoint first.');
      return;
    }
    const newStatus = currentStatus === 'PRESENT' ? 'ABSENT' : 'PRESENT';
    try {
      setIsTogglingPaxAttendance(paxId);
      // Optimistic update
      setAttendanceRecords((prev) => ({
        ...prev,
        [selectedCheckpointId]: {
          ...(prev[selectedCheckpointId] || {}),
          [paxId]: {
            status: newStatus,
            markedAt: new Date().toISOString(),
            markedBy: user?.name || 'Tour Guide',
          },
        },
      }));

      await api.post(`/guides/assignments/${id}/attendance/mark`, {
        checkpointId: selectedCheckpointId,
        passengerId: paxId,
        status: newStatus,
      });
    } catch (err: any) {
      notifyError(err.response?.data?.message || 'Failed to update attendance status.');
      await fetchAttendance();
    } finally {
      setIsTogglingPaxAttendance(null);
    }
  };

  const handleMarkAllPresent = async () => {
    if (!id || !selectedCheckpointId) {
      notifyError('Please select a checkpoint first.');
      return;
    }
    try {
      setIsMarkingAll(true);
      await api.post(`/guides/assignments/${id}/attendance/mark-all`, {
        checkpointId: selectedCheckpointId,
      });
      notifySuccess('All travellers marked as Present and Safe!');
      await fetchAttendance();
    } catch (err: any) {
      notifyError(err.response?.data?.message || 'Failed to mark all travellers present.');
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleSaveNewCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newCheckpointName.trim()) return;
    try {
      setIsSavingCheckpoint(true);
      const res = await api.post(`/guides/assignments/${id}/attendance/checkpoint`, {
        name: newCheckpointName.trim(),
        location: newCheckpointLocation.trim() || undefined,
      });
      notifySuccess(`Checkpoint "${newCheckpointName}" created.`);
      setIsNewCheckpointModalOpen(false);
      setNewCheckpointName('');
      setNewCheckpointLocation('');
      await fetchAttendance();
      if (res.data?.checkpoint?.id) {
        setSelectedCheckpointId(res.data.checkpoint.id);
      }
    } catch (err: any) {
      notifyError(err.response?.data?.message || 'Failed to create checkpoint.');
    } finally {
      setIsSavingCheckpoint(false);
    }
  };

  const handleCopyRegistrationLink = () => {
    const url = `${window.location.origin}/register-tour/${id}`;
    navigator.clipboard.writeText(url);
    notifySuccess('Customer Self-Registration Form link copied to clipboard!');
  };

  const handleShareWhatsApp = () => {
    const url = `${window.location.origin}/register-tour/${id}`;
    const tourTitle = (manifest as any)?.package?.packageName || (manifest as any)?.destination || 'Upcoming Tour';
    const msg = encodeURIComponent(
      `Hello! 👋 Please complete your traveller self-registration for the upcoming trip "${tourTitle}" with Ooting:\n\n👉 ${url}\n\nPlease submit your details, food preferences & emergency contact for group safety. Thank you!`
    );
    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
  };

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

  const handleOpenAddExpense = (passengerId?: string | null, type: 'PASSENGER' | 'GENERAL' = 'PASSENGER') => {
    setSelectedPassengerForExpense(passengerId || null);
    setEditingExpense(null);
    setDefaultExpenseType(type);
    setIsExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (exp: TourExpense) => {
    setEditingExpense(exp);
    setSelectedPassengerForExpense(exp.passengerId || null);
    setDefaultExpenseType(exp.expenseType || 'PASSENGER');
    setIsExpenseModalOpen(true);
  };

  // Passenger Handlers
  const handleAddPassenger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !paxName.trim()) return;
    try {
      setIsSavingPax(true);
      await api.post(`/guides/assignments/${id}/passengers`, {
        name: paxName.trim(),
        phone: paxPhone.trim(),
        age: paxAge ? Number(paxAge) : null,
        gender: paxGender,
        roleInTrip: paxRole,
        roomAllocation: paxRoom.trim(),
        notes: paxNotes.trim(),
      });
      notifySuccess(`Passenger "${paxName}" added to tour manifest.`);
      setIsAddPaxModalOpen(false);
      setPaxName('');
      setPaxPhone('');
      setPaxAge('');
      setPaxRoom('');
      setPaxNotes('');
      await fetchManifest();
      await fetchExpenses();
    } catch (err: any) {
      notifyError(err.response?.data?.message || 'Failed to add passenger.');
    } finally {
      setIsSavingPax(false);
    }
  };

  const handleDeletePassenger = async (passengerId: string, name: string) => {
    if (!id) return;
    if (!window.confirm(`Are you sure you want to remove passenger "${name}" from this manifest?`)) return;
    try {
      await api.delete(`/guides/assignments/${id}/passengers/${passengerId}`);
      notifySuccess(`Passenger "${name}" removed.`);
      await fetchManifest();
      await fetchExpenses();
    } catch (err: any) {
      notifyError(err.response?.data?.message || 'Failed to remove passenger.');
    }
  };

  // Itinerary Day Handlers
  const handleOpenAddDay = () => {
    setDayNumberInput(String(((manifest as any)?.package?.itineraries?.length || 0) + 1));
    setDayTitleInput('');
    setDayDescInput('');
    setDayActivitiesInput('');
    setDayPlacesInput('');
    setDayHotelNameInput('');
    setDayHotelLocationInput('');
    setDayMealPlanInput('Breakfast + Dinner');
    setDayHighlightsInput('');
    setIsDayModalOpen(true);
  };

  const handleOpenEditDay = (day: ItineraryDay) => {
    setDayNumberInput(String(day.dayNumber));
    setDayTitleInput(day.title || '');
    setDayDescInput(day.description || '');
    setDayActivitiesInput(day.activities || '');
    setDayPlacesInput(day.places || '');
    setDayHotelNameInput(day.hotelName || '');
    setDayHotelLocationInput(day.hotelLocation || '');
    setDayMealPlanInput(day.mealPlan || 'Breakfast + Dinner');
    setDayHighlightsInput(day.highlights || '');
    setIsDayModalOpen(true);
  };

  const handleSaveDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      setIsSavingDay(true);
      await api.post(`/guides/assignments/${id}/itinerary`, {
        dayNumber: Number(dayNumberInput) || 1,
        title: dayTitleInput.trim() || `Day ${dayNumberInput} Program`,
        description: dayDescInput.trim(),
        activities: dayActivitiesInput.trim(),
        places: dayPlacesInput.trim(),
        hotelName: dayHotelNameInput.trim(),
        hotelLocation: dayHotelLocationInput.trim(),
        mealPlan: dayMealPlanInput.trim(),
        highlights: dayHighlightsInput.trim(),
      });
      notifySuccess(`Day ${dayNumberInput} schedule updated.`);
      setIsDayModalOpen(false);
      await fetchManifest();
    } catch (err: any) {
      notifyError(err.response?.data?.message || 'Failed to save itinerary day.');
    } finally {
      setIsSavingDay(false);
    }
  };

  // Cab & Driver Handlers
  const handleOpenCabModal = async () => {
    const directDriver = (manifest as any)?.driverName;
    const directPhone = (manifest as any)?.driverPhone;
    const directCar = (manifest as any)?.vehicleNumber;
    const directType = (manifest as any)?.vehicleType;

    const firstCab = (manifest?.booking?.cabBookings && manifest.booking.cabBookings[0]) as any;

    setCabDriverNameInput(directDriver || firstCab?.driverName || '');
    setCabDriverPhoneInput(directPhone || firstCab?.driverPhone || '');
    setCabVehicleNumberInput(directCar || firstCab?.carNumber || '');
    setCabVehicleTypeInput(directType || firstCab?.vehicleType || 'Innova Crysta');

    if (transportOptions.length === 0) {
      try {
        const [cabsRes, suppliersRes] = await Promise.all([
          api.get('/cabs?limit=100').catch(() => ({ data: { data: [] } })),
          api.get('/suppliers?limit=100').catch(() => ({ data: { data: [] } })),
        ]);
        const registeredCabs = (cabsRes.data?.data || cabsRes.data || []).map((c: any) => ({
          id: c.id,
          source: 'CAB',
          title: `${c.driverName || 'Driver'} - ${c.carNumber || 'Vehicle'} (${c.vehicleType || 'Cab'})`,
          driverName: c.driverName || '',
          driverPhone: c.driverPhone || '',
          vehicleNumber: c.carNumber || '',
          vehicleType: c.vehicleType || 'Innova Crysta',
        }));
        const b2bSuppliers = (suppliersRes.data?.data || suppliersRes.data || [])
          .filter((s: any) => {
            const type = (s.supplierType || '').toUpperCase();
            const cat = (s.serviceCategories || '').toUpperCase();
            return type.includes('CAB') || type.includes('TRANSPORT') || cat.includes('TRANSPORT') || cat.includes('CAB') || cat.includes('VEHICLE');
          })
          .map((s: any) => ({
            id: s.id,
            source: 'SUPPLIER',
            title: `${s.name} - ${s.contactPerson || 'Transport'} (${s.phone || ''})`,
            driverName: s.contactPerson || s.name || '',
            driverPhone: s.phone || '',
            vehicleNumber: '',
            vehicleType: 'Innova Crysta',
          }));
        setTransportOptions([...registeredCabs, ...b2bSuppliers]);
      } catch (e) {
        console.warn('Failed to load transport options', e);
      }
    }
    setCabModalMode('B2B');
    setCabModalSelectedId('');
    setIsCabModalOpen(true);
  };

  const handleSelectB2bTransport = (transportId: string) => {
    setCabModalSelectedId(transportId);
    const t = transportOptions.find((x) => x.id === transportId);
    if (t) {
      if (t.driverName) setCabDriverNameInput(t.driverName);
      if (t.driverPhone) setCabDriverPhoneInput(t.driverPhone);
      if (t.vehicleNumber) setCabVehicleNumberInput(t.vehicleNumber);
      if (t.vehicleType) setCabVehicleTypeInput(t.vehicleType);
    }
  };

  const handleSaveCab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      setIsSavingCab(true);
      await api.post(`/guides/assignments/${id}/logistics`, {
        driverName: cabDriverNameInput.trim() || null,
        driverPhone: cabDriverPhoneInput.trim() || null,
        vehicleNumber: cabVehicleNumberInput.trim() || null,
        vehicleType: cabVehicleTypeInput.trim() || null,
      });
      notifySuccess('Cab & driver logistics updated successfully.');
      setIsCabModalOpen(false);
      await fetchManifest();
    } catch (err: any) {
      notifyError(err.response?.data?.message || 'Failed to update cab & driver.');
    } finally {
      setIsSavingCab(false);
    }
  };

  // Staying Hotel Handlers
  const handleOpenHotelModal = async () => {
    if (hotelOptions.length === 0) {
      try {
        const res = await api.get('/hotels?limit=100');
        setHotelOptions(res.data.data || res.data || []);
      } catch (e) {}
    }
    setHotelModalMode('B2B');
    setHotelModalSelectedId('');
    setHotelModalNameInput('');
    setHotelModalLocationInput('');
    setHotelModalStarCategoryInput('3 Star');
    setHotelModalPhoneInput('');
    setHotelModalMealPlanInput('Breakfast + Dinner');
    setIsHotelModalOpen(true);
  };

  const handleSelectB2bHotel = (hotelId: string) => {
    setHotelModalSelectedId(hotelId);
    const h = hotelOptions.find((x) => x.id === hotelId);
    if (h) {
      setHotelModalNameInput(h.name);
      setHotelModalLocationInput(h.city || h.district || h.state || '');
      setHotelModalStarCategoryInput(h.starCategory || '3 Star');
      setHotelModalPhoneInput(h.contactPhone || '');
    }
  };

  const handleSaveHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !hotelModalNameInput.trim()) return;
    try {
      setIsSavingHotel(true);
      const existingHotels = (manifest as any)?.hotels || [];
      const newHotel = {
        id: hotelModalSelectedId || `hotel-${Date.now()}`,
        hotelName: hotelModalNameInput.trim(),
        hotelLocation: hotelModalLocationInput.trim(),
        hotelStarCategory: hotelModalStarCategoryInput,
        hotelPhone: hotelModalPhoneInput.trim(),
        mealPlan: hotelModalMealPlanInput,
        source: hotelModalMode === 'B2B' ? 'B2B_SERVICE_PROVIDER' : 'MANUAL_ENTRY',
      };
      const updatedHotels = [...existingHotels, newHotel];
      await api.post(`/guides/assignments/${id}/logistics`, {
        hotelDetails: JSON.stringify(updatedHotels),
      });
      notifySuccess('Staying hotel added to manifest.');
      setIsHotelModalOpen(false);
      await fetchManifest();
    } catch (err: any) {
      notifyError(err.response?.data?.message || 'Failed to save staying hotel.');
    } finally {
      setIsSavingHotel(false);
    }
  };

  const handleDeleteHotel = async (hotelId: string, name: string) => {
    if (!id) return;
    if (!window.confirm(`Are you sure you want to remove "${name}" from staying hotels?`)) return;
    try {
      const existingHotels = (manifest as any)?.hotels || [];
      const filtered = existingHotels.filter((h: any) => h.id !== hotelId);
      await api.post(`/guides/assignments/${id}/logistics`, {
        hotelDetails: JSON.stringify(filtered),
      });
      notifySuccess('Hotel removed.');
      await fetchManifest();
    } catch (err: any) {
      notifyError(err.response?.data?.message || 'Failed to remove hotel.');
    }
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

  const currentCheckpointRecords = selectedCheckpointId ? (attendanceRecords[selectedCheckpointId] || {}) : {};
  const presentPaxIds = new Set(
    Object.keys(currentCheckpointRecords).filter((pId) => currentCheckpointRecords[pId]?.status === 'PRESENT')
  );
  const presentCount = passengers.filter((p) => presentPaxIds.has(p.id)).length;
  const missingCount = passengers.length - presentCount;
  const presentPct = passengers.length > 0 ? (presentCount / passengers.length) * 100 : 0;

  const filteredAttendancePassengers = passengers.filter((p) => {
    const isPresent = presentPaxIds.has(p.id);
    if (attendanceFilter === 'PRESENT' && !isPresent) return false;
    if (attendanceFilter === 'MISSING' && isPresent) return false;
    if (!attendanceSearch.trim()) return true;
    const q = attendanceSearch.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q) ||
      p.roomAllocation?.toLowerCase().includes(q) ||
      p.emergencyContact?.toLowerCase().includes(q) ||
      p.notes?.toLowerCase().includes(q)
    );
  });

  const handleExportAttendanceExcel = () => {
    if (!manifest || passengers.length === 0) {
      notifyWarning('Export Notice', 'No passenger records found to export attendance.');
      return;
    }

    const currentCp = attendanceCheckpoints.find((c) => c.id === selectedCheckpointId);
    const cpName = currentCp?.name || 'Active Safety Checkpoint';

    const data = passengers.map((p, idx) => {
      const rec = selectedCheckpointId ? attendanceRecords[selectedCheckpointId]?.[p.id] : null;
      const isPresent = rec?.status === 'PRESENT';

      const row: Record<string, any> = {
        'S.No': idx + 1,
        'Traveller Name': p.name,
        'Primary Contact': p.isPrimary ? 'Yes' : 'No',
        'Mobile Phone': p.phone || 'N/A',
        'Gender': p.gender || 'N/A',
        'Age': p.age || 'N/A',
        'Room Allocation': p.roomAllocation || 'N/A',
        'Role in Trip': p.roleInTrip || 'Traveller',
        'Emergency Contact': p.emergencyContact || 'N/A',
        'Dietary / Medical Needs': p.notes || 'None',
        'ID / Document': p.idNumber || 'N/A',
        [`${cpName} Attendance`]: isPresent ? 'PRESENT' : 'MISSING',
        'Roll-Call Time': rec?.markedAt ? new Date(rec.markedAt).toLocaleString() : 'Not Recorded',
        'Verified By': rec?.markedByName || manifest.primaryGuide?.fullName || 'Guide',
      };

      if (attendanceCheckpoints.length > 1) {
        attendanceCheckpoints.forEach((cp) => {
          if (cp.id !== selectedCheckpointId) {
            const cpRec = attendanceRecords[cp.id]?.[p.id];
            row[`Spot: ${cp.name}`] = cpRec?.status === 'PRESENT' ? 'PRESENT' : 'MISSING';
          }
        });
      }

      return row;
    });

    const code = manifest.assignmentCode || 'Tour';
    const timestamp = new Date().toISOString().slice(0, 10);
    exportToExcel(data, `${code}-Attendance-Safety-Sheet-${timestamp}.xlsx`, 'Attendance Roster');
    notifySuccess('Attendance Excel sheet downloaded successfully!');
  };

  const handleExportPassengersExcel = () => {
    if (!manifest || passengers.length === 0) {
      notifyWarning('Export Notice', 'No passenger records to export.');
      return;
    }

    const data = passengers.map((p, idx) => ({
      'S.No': idx + 1,
      'Full Name': p.name,
      'Lead / Primary Guest': p.isPrimary ? 'Yes' : 'No',
      'Mobile Phone': p.phone || 'N/A',
      'Email Address': p.email || 'N/A',
      'Gender': p.gender || 'N/A',
      'Age': p.age || 'N/A',
      'Role in Trip': p.roleInTrip || 'Traveller',
      'Room Allocation': p.roomAllocation || 'N/A',
      'ID / Aadhaar / Passport': p.idNumber || 'N/A',
      'Emergency Contact': p.emergencyContact || 'N/A',
      'Special Requests / Medical Notes': p.notes || 'None',
    }));

    const code = manifest.assignmentCode || 'Tour';
    const timestamp = new Date().toISOString().slice(0, 10);
    exportToExcel(data, `${code}-Passenger-Manifest-${timestamp}.xlsx`, 'Passengers Manifest');
    notifySuccess('Passenger manifest Excel sheet downloaded successfully!');
  };

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
            onClick={handleExportPassengersExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold shadow-xs"
            title="Download Passenger Manifest spreadsheet (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Manifest (.xlsx)</span>
          </button>

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
          onClick={() => setActiveTab('attendance')}
          className={`pb-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'attendance'
              ? 'text-brand-600 border-b-2 border-brand-600 -mb-2.5 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardCheck className="w-4 h-4 text-emerald-600" />
          <span>Attendance & Safety ({passengers.length})</span>
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
          onClick={() => setActiveTab('hotels')}
          className={`pb-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'hotels'
              ? 'text-brand-600 border-b-2 border-brand-600 -mb-2.5 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Hotel className="w-4 h-4" />
          <span>Hotels & Stay ({((manifest as any)?.hotels || []).length})</span>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Compass className="w-4 h-4 text-brand-600" />
                <span>Tour Itinerary & Daily Schedule ({itineraries.length} Days)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Day-by-day sightseeing programs, reporting schedules, hotel stay, and meal arrangements
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddDay}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Day Schedule</span>
            </button>
          </div>

          {itineraries.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs space-y-3">
              <p>No daily itinerary schedule attached to this tour yet.</p>
              <button
                type="button"
                onClick={handleOpenAddDay}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Day 1 Details</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {itineraries.map((day) => (
                <div
                  key={day.id || day.dayNumber}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 font-bold flex items-center justify-center text-xs shrink-0">
                        D{day.dayNumber}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {day.title || `Day ${day.dayNumber}`}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {day.date && (
                        <span className="text-xs font-semibold text-slate-500">
                          {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenEditDay(day)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-brand-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded-md transition-colors"
                        title="Edit Day Details"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Edit Day</span>
                      </button>
                    </div>
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

      {/* TAB: ATTENDANCE & SAFETY ROLL-CALL */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          {/* Header & Checkpoint Controls */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                  <span>Tour Attendance & Group Safety Roll-Call</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Verify group headcount, mark travellers present at each sightseeing spot/checkpoint, and safeguard group security.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleExportAttendanceExcel}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                  title="Download Attendance Sheet as Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export Sheet (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
                  title="Print Attendance Checklist"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>PDF / Print</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsNewCheckpointModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Checkpoint / Spot</span>
                </button>

                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  disabled={isMarkingAll || !selectedCheckpointId || passengers.length === 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                  title="Mark all travellers present for this spot"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isMarkingAll ? 'Marking All...' : '⚡ Mark All Present (1-Click)'}</span>
                </button>
              </div>
            </div>

            {/* Checkpoint Dropdown Selector */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brand-600" />
                <span>Active Safety Checkpoint:</span>
              </label>

              {attendanceCheckpoints.length === 0 ? (
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span>No checkpoints yet.</span>
                  <button
                    type="button"
                    onClick={() => setIsNewCheckpointModalOpen(true)}
                    className="text-brand-600 font-bold hover:underline"
                  >
                    + Create First Checkpoint
                  </button>
                </div>
              ) : (
                <select
                  value={selectedCheckpointId}
                  onChange={(e) => setSelectedCheckpointId(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-1 focus:ring-brand-500"
                >
                  {attendanceCheckpoints.map((cp) => (
                    <option key={cp.id} value={cp.id}>
                      {cp.name} {cp.location ? `— 📍 ${cp.location}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* 3 Safety Headcount Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Tour Group
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {passengers.length}
                </span>
                <span className="text-xs font-semibold text-slate-500">Travellers in Manifest</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800/80 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
                  Accounted For & Safe
                </span>
                <span className="p-1 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {presentCount}
                </span>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  ({Math.round(presentPct)}% Present)
                </span>
              </div>
            </div>

            <div
              className={`rounded-xl border p-4 shadow-xs transition-colors ${
                missingCount > 0
                  ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
                  : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">
                  Missing / Unaccounted
                </span>
                {missingCount > 0 && (
                  <span className="p-1 rounded-md bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span
                  className={`text-2xl font-black ${
                    missingCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
                  }`}
                >
                  {missingCount}
                </span>
                <span className="text-xs font-semibold text-slate-500">Traveller(s)</span>
              </div>
            </div>
          </div>

          {/* Missing Alert Notice if any passenger is absent */}
          {missingCount > 0 && (
            <div className="p-3 bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-900 dark:text-rose-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  <strong>Safety Attention:</strong> {missingCount} traveller(s) are not yet marked present at this stop. Please verify their whereabouts or use the direct phone shortcuts below before departing.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAttendanceFilter('MISSING')}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold shrink-0 transition-colors"
              >
                View Missing Only
              </button>
            </div>
          )}

          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setAttendanceFilter('ALL')}
                className={`px-3 py-1 rounded-md font-bold transition-all ${
                  attendanceFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                All ({passengers.length})
              </button>
              <button
                type="button"
                onClick={() => setAttendanceFilter('PRESENT')}
                className={`px-3 py-1 rounded-md font-bold transition-all ${
                  attendanceFilter === 'PRESENT'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Present ({presentCount})
              </button>
              <button
                type="button"
                onClick={() => setAttendanceFilter('MISSING')}
                className={`px-3 py-1 rounded-md font-bold transition-all ${
                  attendanceFilter === 'MISSING'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Missing ({missingCount})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search traveller, room, phone..."
                value={attendanceSearch}
                onChange={(e) => setAttendanceSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Travellers Roster Table */}
          {passengers.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs space-y-3">
              <p>No travellers currently assigned to this tour manifest.</p>
              <button
                type="button"
                onClick={() => setIsAddPaxModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Traveller</span>
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-3 py-2.5">#</th>
                      <th className="px-3 py-2.5">Traveller Name</th>
                      <th className="px-3 py-2.5">Room</th>
                      <th className="px-3 py-2.5">Phone & Emergency</th>
                      <th className="px-3 py-2.5">Dietary / Medical Needs</th>
                      <th className="px-3 py-2.5 text-center">Status</th>
                      <th className="px-3 py-2.5 text-right">Roll-Call Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredAttendancePassengers.map((p, idx) => {
                      const record = currentCheckpointRecords[p.id];
                      const isPresent = record?.status === 'PRESENT';
                      const isToggling = isTogglingPaxAttendance === p.id;

                      return (
                        <tr
                          key={p.id || idx}
                          className={`transition-colors ${
                            isPresent
                              ? 'bg-emerald-50/20 dark:bg-emerald-950/10 hover:bg-emerald-50/40'
                              : 'bg-rose-50/20 dark:bg-rose-950/10 hover:bg-rose-50/40'
                          }`}
                        >
                          <td className="px-3 py-2.5 font-mono text-[11px] text-slate-400">{idx + 1}</td>
                          <td className="px-3 py-2.5">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              {p.name}
                              {p.isPrimary && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                                  Primary Lead
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {p.age ? `${p.age} yrs` : ''} {p.gender ? `• ${p.gender}` : ''} • {p.roleInTrip || 'Traveller'}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            {p.roomAllocation ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                <Bed className="w-3 h-3" />
                                <span>{p.roomAllocation}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 space-y-1">
                            {p.phone && (
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={`tel:${p.phone}`}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:underline font-mono"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span>{p.phone}</span>
                                </a>
                                <a
                                  href={`https://wa.me/${p.phone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-600 hover:text-emerald-700"
                                  title="WhatsApp traveller"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            )}
                            {p.emergencyContact && (
                              <div className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                                <HeartPulse className="w-3 h-3" />
                                <span>Em: {p.emergencyContact}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            {p.notes ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200">
                                {p.notes}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Regular</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {isPresent ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>PRESENT</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                <span>MISSING</span>
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleToggleAttendance(p.id, isPresent ? 'PRESENT' : 'ABSENT')}
                              disabled={isToggling || !selectedCheckpointId}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-2xs transition-all disabled:opacity-50 cursor-pointer ${
                                isPresent
                                  ? 'bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                            >
                              {isPresent ? (
                                <>
                                  <RotateCcw className="w-3 h-3" />
                                  <span>{isToggling ? 'Updating...' : 'Mark Absent'}</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{isToggling ? 'Updating...' : 'Mark Present'}</span>
                                </>
                              )}
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

      {/* TAB 2: PASSENGERS MANIFEST & ROOM ALLOCATIONS */}
      {activeTab === 'passengers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-600" />
                <span>Passenger Manifest, Room Allocations & Emergency Info ({passengers.length} Travellers)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Roster of all registered travellers under the tour guide's care with room allocations & contact numbers
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleCopyRegistrationLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                title="Copy public customer self-registration link to clipboard"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Share Registration Form</span>
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                title="Share registration form link with customers via WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Invite via WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleExportPassengersExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors whitespace-nowrap"
                title="Download passenger manifest as Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Excel</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold shadow-xs whitespace-nowrap"
                title="Print or save manifest as PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>PDF / Print</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddPaxModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Passenger</span>
              </button>

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
          </div>

          {passengers.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs space-y-3">
              <p>No passengers enrolled in this tour manifest yet.</p>
              <button
                type="button"
                onClick={() => setIsAddPaxModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Passenger</span>
              </button>
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
                      const isCustom = p.id && (p.id.startsWith('pax-') || p.id.startsWith('custom-'));
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
                          <td className="px-3 py-2.5 text-right whitespace-nowrap space-x-1">
                            <button
                              type="button"
                              onClick={() => handleOpenAddExpense(p.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 rounded-md border border-emerald-200 dark:border-emerald-800 transition-colors shadow-2xs"
                              title={`Add expense for ${p.name}`}
                            >
                              <Plus className="w-3 h-3" />
                              <span>Expense</span>
                            </button>
                            {isCustom && (
                              <button
                                type="button"
                                onClick={() => handleDeletePassenger(p.id, p.name)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                title="Remove passenger from manifest"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Car className="w-4 h-4 text-brand-600" />
                <span>Assigned Tourist Cabs, Vehicles & Drivers</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Vehicle specifications, driver contact numbers, pickup points, and tour routing
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCabModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
            >
              <Car className="w-3.5 h-3.5" />
              <span>+ Update Cab & Driver Logistics</span>
            </button>
          </div>

          {cabs.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs space-y-3">
              <p>No cabs or transport logistics assigned to this tour yet.</p>
              <button
                type="button"
                onClick={handleOpenCabModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Assign Driver & Vehicle</span>
              </button>
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
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`tel:${cab.driverPhone}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call</span>
                        </a>
                        <a
                          href={`https://wa.me/${cab.driverPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-emerald-600 hover:text-emerald-700"
                          title="WhatsApp Driver"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </a>
                      </div>
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

      {/* TAB 4: STAYING HOTELS & ACCOMMODATION */}
      {activeTab === 'hotels' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Hotel className="w-4 h-4 text-brand-600" />
                <span>Staying Hotels & Tour Accommodation</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                B2B service provider hotels and confirmed tour accommodation with room types & meal plans
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenHotelModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Staying Hotel</span>
            </button>
          </div>

          {!((manifest as any)?.hotels) || (manifest as any).hotels.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs space-y-3">
              <p>No staying hotel accommodation assigned to this tour yet.</p>
              <button
                type="button"
                onClick={handleOpenHotelModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Choose from B2B Hotels or Enter Hotel</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(manifest as any).hotels.map((h: any, idx: number) => (
                <div
                  key={h.id || idx}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-start gap-2">
                      <div className="p-2 bg-amber-50 dark:bg-amber-950 text-amber-600 rounded-lg shrink-0 mt-0.5">
                        <Hotel className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{h.hotelName}</span>
                          {h.hotelStarCategory && (
                            <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              {h.hotelStarCategory}
                            </span>
                          )}
                        </h3>
                        {h.hotelLocation && (
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{h.hotelLocation}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteHotel(h.id, h.hotelName)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Remove hotel"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {h.hotelPhone && (
                      <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Contact Phone</span>
                          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{h.hotelPhone}</span>
                        </div>
                        <a
                          href={`tel:${h.hotelPhone}`}
                          className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold flex items-center gap-1 px-2"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call</span>
                        </a>
                      </div>
                    )}
                    {h.mealPlan && (
                      <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Meal Plan</span>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                          <Coffee className="w-3 h-3" />
                          <span>{h.mealPlan}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {h.source && (
                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span>Source: {h.source === 'B2B_SERVICE_PROVIDER' ? 'B2B Hotel Master' : 'Manual Entry'}</span>
                    </div>
                  )}
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
                onClick={() => handleOpenAddExpense(null, 'PASSENGER')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Customer Expense</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAddExpense(null, 'GENERAL')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
              >
                <Droplet className="w-3.5 h-3.5" />
                <span>Water / Shared Expense</span>
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
                onClick={() => handleOpenAddExpense(null, 'GENERAL')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add General Expense</span>
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
                      <th className="px-3 py-2.5">Bill Slip / Proof</th>
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
                            {exp.splitType === 'COMPANY_EXPENSE' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 whitespace-nowrap">
                                🏢 Company Internal (Do Not Divide)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 whitespace-nowrap">
                                {exp.splitType === 'SPLIT_EQUALLY'
                                  ? `Split Equally (${passengers.length} pax)`
                                  : exp.splitType ? exp.splitType.replace(/_/g, ' ') : 'Shared'}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-sm text-slate-900 dark:text-white">
                            ₹{Number(exp.amount).toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">
                            {exp.receiptNumber || '-'}
                          </td>
                          <td className="px-3 py-2.5">
                            {exp.receiptUrl ? (
                              <a
                                href={exp.receiptUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-brand-600 dark:text-brand-400 border border-slate-200 dark:border-slate-700 whitespace-nowrap"
                                title="View expense bill slip"
                              >
                                <Receipt className="w-3 h-3 text-brand-600" />
                                <span>View Slip</span>
                                <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                              </a>
                            ) : (
                              <span className="text-slate-400 text-[10px] italic">No slip</span>
                            )}
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

      {/* MODAL: Add Passenger */}
      {isAddPaxModalOpen && (
        <Modal
          isOpen={isAddPaxModalOpen}
          onClose={() => setIsAddPaxModalOpen(false)}
          title="Add Passenger / Traveller to Manifest"
        >
          <form onSubmit={handleAddPassenger} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Passenger Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={paxName}
                  onChange={(e) => setPaxName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Phone / WhatsApp
                </label>
                <input
                  type="tel"
                  value={paxPhone}
                  onChange={(e) => setPaxPhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Age
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={paxAge}
                  onChange={(e) => setPaxAge(e.target.value)}
                  placeholder="e.g. 35"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Gender
                </label>
                <select
                  value={paxGender}
                  onChange={(e) => setPaxGender(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Role in Tour
                </label>
                <select
                  value={paxRole}
                  onChange={(e) => setPaxRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Primary Booker">Primary Booker</option>
                  <option value="Family Head">Family Head</option>
                  <option value="Adult">Adult</option>
                  <option value="Child">Child</option>
                  <option value="Senior Citizen">Senior Citizen</option>
                  <option value="Traveller">Traveller</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Allocated Room Number / Type
              </label>
              <input
                type="text"
                value={paxRoom}
                onChange={(e) => setPaxRoom(e.target.value)}
                placeholder="e.g. Room 204 (Deluxe Double)"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Special Notes (Dietary / Medical / Preferences)
              </label>
              <textarea
                rows={2}
                value={paxNotes}
                onChange={(e) => setPaxNotes(e.target.value)}
                placeholder="e.g. Jain food required, vegetarian, ground floor room preferred..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddPaxModalOpen(false)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingPax}
                className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold disabled:opacity-50"
              >
                {isSavingPax ? 'Adding...' : 'Add Passenger'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Itinerary Day Schedule */}
      {isDayModalOpen && (
        <Modal
          isOpen={isDayModalOpen}
          onClose={() => setIsDayModalOpen(false)}
          title={`Day ${dayNumberInput} Schedule & Activities`}
        >
          <form onSubmit={handleSaveDay} className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Day Number *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={dayNumberInput}
                  onChange={(e) => setDayNumberInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div className="col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Day Title / Headline *
                </label>
                <input
                  type="text"
                  required
                  value={dayTitleInput}
                  onChange={(e) => setDayTitleInput(e.target.value)}
                  placeholder="e.g. Mysore Palace & Chamundi Hill Tour"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Day Description / Schedule Overview
              </label>
              <textarea
                rows={3}
                value={dayDescInput}
                onChange={(e) => setDayDescInput(e.target.value)}
                placeholder="Detailed timing and schedule for the day..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Places / Attractions to Visit
                </label>
                <input
                  type="text"
                  value={dayPlacesInput}
                  onChange={(e) => setDayPlacesInput(e.target.value)}
                  placeholder="e.g. Mysore Palace, Zoo, Brindavan Gardens"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Planned Activities
                </label>
                <input
                  type="text"
                  value={dayActivitiesInput}
                  onChange={(e) => setDayActivitiesInput(e.target.value)}
                  placeholder="e.g. Guided palace walk, boating, light show"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Staying Hotel
                </label>
                <input
                  type="text"
                  value={dayHotelNameInput}
                  onChange={(e) => setDayHotelNameInput(e.target.value)}
                  placeholder="e.g. Royal Orchid Metropole"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Hotel Location / City
                </label>
                <input
                  type="text"
                  value={dayHotelLocationInput}
                  onChange={(e) => setDayHotelLocationInput(e.target.value)}
                  placeholder="e.g. Mysore Central"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Meal Plan
                </label>
                <select
                  value={dayMealPlanInput}
                  onChange={(e) => setDayMealPlanInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Breakfast + Dinner">Breakfast + Dinner (MAP)</option>
                  <option value="Breakfast Only">Breakfast Only (CP)</option>
                  <option value="All Meals (Breakfast + Lunch + Dinner)">All Meals (AP)</option>
                  <option value="No Meals Included">No Meals (EP)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Day Highlights / Special Notes
              </label>
              <input
                type="text"
                value={dayHighlightsInput}
                onChange={(e) => setDayHighlightsInput(e.target.value)}
                placeholder="e.g. Palace illumination at 7:00 PM; carry valid ID"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsDayModalOpen(false)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingDay}
                className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold disabled:opacity-50"
              >
                {isSavingDay ? 'Saving...' : 'Save Day Details'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Cab & Driver Logistics */}
      {isCabModalOpen && (
        <Modal
          isOpen={isCabModalOpen}
          onClose={() => setIsCabModalOpen(false)}
          title="Assigned Cab & Driver Details"
        >
          <form onSubmit={handleSaveCab} className="space-y-3 text-xs">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-200 text-[11px]">
              Assigned cab and driver details are visible to guides, operations staff, and travellers on their tour manifest.
            </div>

            {/* Mode Toggle: B2B vs Manual */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setCabModalMode('B2B')}
                className={`flex-1 py-1.5 text-center font-bold rounded-md transition-all ${
                  cabModalMode === 'B2B'
                    ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                🚗 Select from B2B Transport / Cabs
              </button>
              <button
                type="button"
                onClick={() => {
                  setCabModalMode('MANUAL');
                  setCabModalSelectedId('');
                }}
                className={`flex-1 py-1.5 text-center font-bold rounded-md transition-all ${
                  cabModalMode === 'MANUAL'
                    ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                ✏️ Enter Manually
              </button>
            </div>

            {cabModalMode === 'B2B' && (
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Choose B2B Transport Service / Driver Provider
                </label>
                <select
                  value={cabModalSelectedId}
                  onChange={(e) => handleSelectB2bTransport(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="">-- Choose Transport / Cab Provider ({transportOptions.length} available) --</option>
                  {transportOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Driver Name
                </label>
                <input
                  type="text"
                  value={cabDriverNameInput}
                  onChange={(e) => setCabDriverNameInput(e.target.value)}
                  placeholder="e.g. Suresh Gowda"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Driver Phone Number / WhatsApp
                </label>
                <input
                  type="tel"
                  value={cabDriverPhoneInput}
                  onChange={(e) => setCabDriverPhoneInput(e.target.value)}
                  placeholder="e.g. +91 9845012345"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vehicle Registration Number
                </label>
                <input
                  type="text"
                  value={cabVehicleNumberInput}
                  onChange={(e) => setCabVehicleNumberInput(e.target.value)}
                  placeholder="e.g. KA-09-EA-4589"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white uppercase"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vehicle Type / Model
                </label>
                <select
                  value={cabVehicleTypeInput}
                  onChange={(e) => setCabVehicleTypeInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Innova Crysta">Innova Crysta (6+1 / 7+1)</option>
                  <option value="Sedan (Dzire/Etios)">Sedan (Dzire / Etios)</option>
                  <option value="Tempo Traveller (12S)">Tempo Traveller (12 Seater)</option>
                  <option value="Tempo Traveller (16S)">Tempo Traveller (16 Seater)</option>
                  <option value="Force Urbania">Force Urbania (Luxury 12S/16S)</option>
                  <option value="SUV (Ertiga/Xylo)">SUV (Ertiga / Carens)</option>
                  <option value="Mini Coach (21S)">Mini Coach (21 Seater)</option>
                  <option value="Luxury Bus (40S)">Luxury Coach Bus (40+ Seater)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCabModalOpen(false)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingCab}
                className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold disabled:opacity-50"
              >
                {isSavingCab ? 'Updating...' : 'Save Cab & Driver'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: Staying Hotel Logistics */}
      {isHotelModalOpen && (
        <Modal
          isOpen={isHotelModalOpen}
          onClose={() => setIsHotelModalOpen(false)}
          title="Add Staying Hotel to Manifest"
        >
          <form onSubmit={handleSaveHotel} className="space-y-3 text-xs">
            {/* Mode Toggle: B2B vs Manual */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setHotelModalMode('B2B')}
                className={`flex-1 py-1.5 text-center font-bold rounded-md transition-all ${
                  hotelModalMode === 'B2B'
                    ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                🏢 Select from B2B Hotels
              </button>
              <button
                type="button"
                onClick={() => {
                  setHotelModalMode('MANUAL');
                  setHotelModalSelectedId('');
                }}
                className={`flex-1 py-1.5 text-center font-bold rounded-md transition-all ${
                  hotelModalMode === 'MANUAL'
                    ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                ✏️ Enter Manually
              </button>
            </div>

            {hotelModalMode === 'B2B' && (
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Choose B2B Hotel Provider
                </label>
                <select
                  value={hotelModalSelectedId}
                  onChange={(e) => handleSelectB2bHotel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="">-- Choose Hotel from B2B Library --</option>
                  {hotelOptions.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.city || h.district || 'Karnataka'}) - {h.starCategory || 'Hotel'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Hotel Name *
                </label>
                <input
                  type="text"
                  required
                  value={hotelModalNameInput}
                  onChange={(e) => setHotelModalNameInput(e.target.value)}
                  placeholder="e.g. Radisson Blu Plaza Mysore"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  City / Location
                </label>
                <input
                  type="text"
                  value={hotelModalLocationInput}
                  onChange={(e) => setHotelModalLocationInput(e.target.value)}
                  placeholder="e.g. MG Road, Mysore"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Star Category
                </label>
                <select
                  value={hotelModalStarCategoryInput}
                  onChange={(e) => setHotelModalStarCategoryInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="5 Star">5 Star Luxury</option>
                  <option value="4 Star">4 Star Premium</option>
                  <option value="3 Star">3 Star Comfort</option>
                  <option value="2 Star / Budget">2 Star / Budget</option>
                  <option value="Heritage / Resort">Heritage / Resort</option>
                  <option value="Homestay">Homestay / Estate</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Front Desk / Contact Phone
                </label>
                <input
                  type="tel"
                  value={hotelModalPhoneInput}
                  onChange={(e) => setHotelModalPhoneInput(e.target.value)}
                  placeholder="e.g. +91 821 2577777"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Meal Plan Included
                </label>
                <select
                  value={hotelModalMealPlanInput}
                  onChange={(e) => setHotelModalMealPlanInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Breakfast + Dinner">MAP (Breakfast + Dinner)</option>
                  <option value="Breakfast Only">CP (Breakfast Only)</option>
                  <option value="All Meals (Breakfast + Lunch + Dinner)">AP (All Meals)</option>
                  <option value="Room Only">EP (Room Only)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsHotelModalOpen(false)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingHotel}
                className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold disabled:opacity-50"
              >
                {isSavingHotel ? 'Saving...' : 'Add Staying Hotel'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: New Safety / Attendance Checkpoint */}
      {isNewCheckpointModalOpen && (
        <Modal
          isOpen={isNewCheckpointModalOpen}
          onClose={() => setIsNewCheckpointModalOpen(false)}
          title="Create New Attendance & Safety Checkpoint"
        >
          <form onSubmit={handleSaveNewCheckpoint} className="space-y-3 text-xs">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-200 text-[11px]">
              Safety checkpoints let the guide perform roll-calls before boarding vehicles, entering sightseeing monuments, or leaving attractions.
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Checkpoint / Spot Name *
              </label>
              <input
                type="text"
                required
                value={newCheckpointName}
                onChange={(e) => setNewCheckpointName(e.target.value)}
                placeholder="e.g. Day 1 - Chamundi Hill Viewpoint"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Spot Location / Landmark (Optional)
              </label>
              <input
                type="text"
                value={newCheckpointLocation}
                onChange={(e) => setNewCheckpointLocation(e.target.value)}
                placeholder="e.g. Mysore, Karnataka"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsNewCheckpointModalOpen(false)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingCheckpoint || !newCheckpointName.trim()}
                className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold disabled:opacity-50"
              >
                {isSavingCheckpoint ? 'Creating...' : 'Create Checkpoint'}
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
          initialExpenseType={defaultExpenseType}
          editingExpense={editingExpense}
        />
      )}
    </div>
  );
};
