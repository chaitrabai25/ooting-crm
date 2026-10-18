import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Compass,
  Users,
  Search,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Eye,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Car,
  ChevronRight,
  Filter,
  Phone,
  Hotel,
  Bed,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { DataTable, Column } from '../../components/ui/DataTable.js';
import { Modal } from '../../components/ui/Modal.js';
import { TourAssignment, TourGuide } from '../../types/index.js';
import { notifyError } from '../../utils/sweetalert.js';

export const GuideAssignments: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [assignments, setAssignments] = useState<TourAssignment[]>([]);
  const [guides, setGuides] = useState<TourGuide[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [b2bHotels, setB2bHotels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // New Assignment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [tourName, setTourName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropLocation, setDropLocation] = useState('');
  const [reportingTime, setReportingTime] = useState('07:30 AM');
  const [passengerCount, setPassengerCount] = useState<string>('2');
  const [primaryGuideId, setPrimaryGuideId] = useState('');
  const [secondaryGuideId, setSecondaryGuideId] = useState('');
  const [guideFee, setGuideFee] = useState<string>('1500');
  const [perDiemAllowance, setPerDiemAllowance] = useState<string>('500');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [operationalNotes, setOperationalNotes] = useState('');

  // Cab & Driver Logistics
  const [cabSourceMode, setCabSourceMode] = useState<'B2B' | 'MANUAL'>('B2B');
  const [selectedB2bCabId, setSelectedB2bCabId] = useState('');
  const [b2bTransportOptions, setB2bTransportOptions] = useState<any[]>([]);
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Innova Crysta');

  // Tour Accommodation & Staying Hotels
  const [hotelSourceMode, setHotelSourceMode] = useState<'B2B' | 'MANUAL'>('B2B');
  const [selectedB2bHotelId, setSelectedB2bHotelId] = useState('');
  const [hotelName, setHotelName] = useState('');
  const [hotelLocation, setHotelLocation] = useState('');
  const [hotelStarCategory, setHotelStarCategory] = useState('3 Star');
  const [hotelPhone, setHotelPhone] = useState('');
  const [mealPlan, setMealPlan] = useState('Breakfast + Dinner');

  // Conflict Warning State
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [canOverride, setCanOverride] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchAssignments = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (search) params.append('search', search);
      if (selectedStatus && selectedStatus !== 'ALL') params.append('status', selectedStatus);

      const res = await api.get(`/guides/assignments?${params.toString()}`);
      setAssignments(res.data.data || []);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [guidesRes, bookingsRes, packagesRes, hotelsRes, cabsRes, suppliersRes] = await Promise.all([
        api.get('/guides?limit=100&status=ACTIVE').catch(() => ({ data: { data: [] } })),
        api.get('/bookings?limit=100').catch(() => ({ data: { data: [] } })),
        api.get('/packages?limit=100').catch(() => ({ data: { data: [] } })),
        api.get('/hotels?limit=100').catch(() => ({ data: { data: [] } })),
        api.get('/cabs?limit=100').catch(() => ({ data: { data: [] } })),
        api.get('/suppliers?limit=100').catch(() => ({ data: { data: [] } })),
      ]);
      setGuides(guidesRes.data?.data || guidesRes.data?.guides || (Array.isArray(guidesRes.data) ? guidesRes.data : []));
      setBookings(bookingsRes.data?.data || bookingsRes.data?.bookings || (Array.isArray(bookingsRes.data) ? bookingsRes.data : []));
      setPackages(packagesRes.data?.data || packagesRes.data?.packages || (Array.isArray(packagesRes.data) ? packagesRes.data : []));
      const hotelList = hotelsRes.data?.hotels || hotelsRes.data?.data || (Array.isArray(hotelsRes.data) ? hotelsRes.data : []);
      setB2bHotels(hotelList);

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
      setB2bTransportOptions([...registeredCabs, ...b2bSuppliers]);
    } catch (err) {
      console.error('Failed to load dependencies:', err);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [page, selectedStatus]);

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    const action = searchParams.get('action');
    const open = searchParams.get('open');
    const pId = searchParams.get('packageId');
    const gId = searchParams.get('guideId');
    const bId = searchParams.get('bookingId');

    if (action === 'assign' || open === 'true' || pId || gId || bId) {
      resetModalState();
      if (pId) {
        setSelectedPackageId(pId);
        // Load package details if available
        api.get(`/packages/${pId}`).then((res) => {
          if (res.data) {
            setTourName(res.data.packageName || '');
            setDestination(res.data.destination || '');
          }
        }).catch(() => {});
      }
      if (gId) setPrimaryGuideId(gId);
      if (bId) handleBookingSelect(bId);
      setIsModalOpen(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('action');
      newParams.delete('open');
      newParams.delete('packageId');
      newParams.delete('guideId');
      newParams.delete('bookingId');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams]);

  const handlePackageSelect = (pkgId: string) => {
    setSelectedPackageId(pkgId);
    if (!pkgId) return;
    const pkg = packages.find((item) => item.id === pkgId);
    if (pkg) {
      setTourName(pkg.packageName || '');
      setDestination(pkg.destination || '');
      // Try to estimate passenger count from active bookings for this package
      const matchingBookings = bookings.filter((b) => b.packageId === pkgId);
      if (matchingBookings.length > 0) {
        const totalTravellers = matchingBookings.reduce((sum, b) => sum + (Number(b.travellers) || 1), 0);
        setPassengerCount(String(Math.max(1, totalTravellers)));
        const first = matchingBookings[0];
        if (first.travelStartDate) setStartDate(first.travelStartDate.split('T')[0]);
        if (first.travelEndDate) setEndDate(first.travelEndDate.split('T')[0]);
      }
    }
  };

  const handleBookingSelect = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    const b = bookings.find((item) => item.id === bookingId);
    if (b) {
      setTourName(b.package?.packageName || `Tour for ${b.customer?.fullName || 'Guest'}`);
      setDestination(b.package?.destination || b.destination || '');
      setStartDate(b.travelStartDate ? b.travelStartDate.split('T')[0] : '');
      setEndDate(b.travelEndDate ? b.travelEndDate.split('T')[0] : '');
      setPassengerCount(String(b.travellers || 2));

      // Auto-populate cab & driver if booking has cab assignments
      if (b.cabBookings && b.cabBookings.length > 0) {
        const cab = b.cabBookings[0];
        if (cab.driverName) setDriverName(cab.driverName);
        if (cab.driverPhone) setDriverPhone(cab.driverPhone);
        if (cab.carNumber) setVehicleNumber(cab.carNumber);
        if (cab.vehicleType) setVehicleType(cab.vehicleType);
        if (cab.pickupPlace) setPickupLocation(cab.pickupPlace);
        if (cab.dropPlace) setDropLocation(cab.dropPlace);
        if (cab.pickupTime) setReportingTime(cab.pickupTime);
      }
    }
  };

  const handleB2bCabSelect = (transportId: string) => {
    setSelectedB2bCabId(transportId);
    const t = b2bTransportOptions.find((x) => x.id === transportId);
    if (t) {
      if (t.driverName) setDriverName(t.driverName);
      if (t.driverPhone) setDriverPhone(t.driverPhone);
      if (t.vehicleNumber) setVehicleNumber(t.vehicleNumber);
      if (t.vehicleType) setVehicleType(t.vehicleType);
    }
  };

  const handleB2bHotelSelect = (hotelId: string) => {
    setSelectedB2bHotelId(hotelId);
    if (!Array.isArray(b2bHotels)) return;
    const h = b2bHotels.find((x) => x.id === hotelId);
    if (h) {
      setHotelName(h.name || '');
      setHotelLocation(h.city || h.district || h.state || '');
      setHotelStarCategory(h.starCategory || '3 Star');
      setHotelPhone(h.contactPhone || h.phone || '');
    }
  };

  const handlePrimaryGuideChange = (guideId: string) => {
    setPrimaryGuideId(guideId);
    setConflictWarning(null);
    setCanOverride(false);
    const g = guides.find((item) => item.id === guideId);
    if (g && g.dailyRate) {
      setGuideFee(String(g.dailyRate));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const hotelList = hotelName.trim()
        ? [
            {
              id: selectedB2bHotelId || `hotel-${Date.now()}`,
              hotelName: hotelName.trim(),
              hotelLocation: hotelLocation.trim(),
              hotelStarCategory,
              hotelPhone: hotelPhone.trim(),
              mealPlan,
              source: hotelSourceMode === 'B2B' ? 'B2B_SERVICE_PROVIDER' : 'MANUAL_ENTRY',
            },
          ]
        : [];

      const payload: any = {
        packageId: selectedPackageId || null,
        bookingId: selectedBookingId || null,
        primaryGuideId,
        secondaryGuideId: secondaryGuideId || null,
        tourName: tourName.trim(),
        destination: destination.trim(),
        startDate,
        endDate,
        pickupLocation: pickupLocation.trim() || null,
        dropLocation: dropLocation.trim() || null,
        reportingTime: reportingTime.trim() || null,
        passengerCount: Number(passengerCount) || 1,
        guideFee: guideFee ? Number(guideFee) : 0,
        perDiemAllowance: perDiemAllowance ? Number(perDiemAllowance) : 0,
        specialInstructions: specialInstructions.trim() || null,
        operationalNotes: operationalNotes.trim() || null,
        canOverride,
        allowOverlapOverride: canOverride,
        driverName: driverName.trim() || null,
        driverPhone: driverPhone.trim() || null,
        vehicleNumber: vehicleNumber.trim() || null,
        vehicleType: vehicleType.trim() || null,
        hotelDetails: hotelList.length > 0 ? JSON.stringify(hotelList) : null,
      };

      await api.post('/guides/assignments', payload);
      setIsModalOpen(false);
      resetModalState();
      fetchAssignments();
    } catch (err: any) {
      if (err.response?.status === 409) {
        // Date overlap conflict detected by server!
        setConflictWarning(err.response.data.message || 'Guide has a date conflict with another tour.');
      } else {
        setFormError(err.response?.data?.message || 'Failed to assign tour guide.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetModalState = () => {
    setSelectedPackageId('');
    setSelectedBookingId('');
    setTourName('');
    setDestination('');
    setStartDate('');
    setEndDate('');
    setPickupLocation('');
    setDropLocation('');
    setReportingTime('07:30 AM');
    setPassengerCount('2');
    setPrimaryGuideId('');
    setSecondaryGuideId('');
    setGuideFee('1500');
    setPerDiemAllowance('500');
    setSpecialInstructions('');
    setOperationalNotes('');
    setDriverName('');
    setDriverPhone('');
    setVehicleNumber('');
    setVehicleType('Innova Crysta');
    setCabSourceMode('B2B');
    setSelectedB2bCabId('');
    setHotelSourceMode('B2B');
    setSelectedB2bHotelId('');
    setHotelName('');
    setHotelLocation('');
    setHotelStarCategory('3 Star');
    setHotelPhone('');
    setMealPlan('Breakfast + Dinner');
    setConflictWarning(null);
    setCanOverride(false);
    setFormError(null);
  };

  const columns: Column<TourAssignment>[] = [
    {
      header: 'Tour / Assignment',
      render: (a) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span
              onClick={() => navigate(`/guides/assignments/${a.id}/manifest`)}
              className="font-bold text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer text-xs"
            >
              {a.tourName}
            </span>
            <span className="font-mono text-[10px] font-bold text-brand-600 dark:text-brand-400 px-1 rounded bg-brand-50 dark:bg-brand-950/60">
              {a.assignmentCode}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
            <span>{a.destination}</span>
            <span>•</span>
            <span>{a.passengerCount} Pax</span>
            {a.customer && <span>• {a.customer.organizationName || a.customer.fullName}</span>}
          </div>
        </div>
      ),
    },
    {
      header: 'Assigned Guide(s)',
      render: (a) => (
        <div className="text-xs">
          <div className="font-semibold text-slate-800 dark:text-slate-200">
            {a.primaryGuide?.fullName}
            <span className="font-mono text-[10px] text-slate-400 font-normal ml-1">
              ({a.primaryGuide?.guideCode})
            </span>
          </div>
          {a.secondaryGuide && (
            <div className="text-[10px] text-slate-500">
              2nd Guide: {a.secondaryGuide.fullName}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Tour Dates & Reporting',
      render: (a) => (
        <div className="text-xs space-y-0.5">
          <div className="font-medium text-slate-800 dark:text-slate-200">
            {new Date(a.startDate).toLocaleDateString()} &rarr; {new Date(a.endDate).toLocaleDateString()}
          </div>
          {a.reportingTime && (
            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Reporting: {a.reportingTime}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Operational Status',
      render: (a) => (
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
            a.status === 'COMPLETED'
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
              : a.status === 'IN_PROGRESS'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
              : a.status === 'CONFIRMED'
              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
          }`}
        >
          {a.status}
        </span>
      ),
    },
    {
      header: 'Manifest',
      className: 'text-right w-36',
      render: (a) => (
        <button
          type="button"
          onClick={() => navigate(`/guides/assignments/${a.id}/manifest`)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Tour Manifest</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-50 dark:bg-brand-950/50 text-brand-600 rounded-lg">
              <Compass className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Tour Assignments</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Operational guide allocations, overlap conflict protection, manifests, and reporting times
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              resetModalState();
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Assign Guide to Tour</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'ALL', label: 'All Assignments' },
          { id: 'ASSIGNED', label: 'Assigned' },
          { id: 'CONFIRMED', label: 'Confirmed' },
          { id: 'IN_PROGRESS', label: 'In Progress' },
          { id: 'COMPLETED', label: 'Completed' },
        ].map((tab) => {
          const isActive = selectedStatus === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setSelectedStatus(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tour, code, guide, destination..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <DataTable
          columns={columns}
          data={assignments}
          isLoading={isLoading}
          emptyTitle="No tour assignments recorded"
          emptyDescription="Click 'Assign Guide to Tour' to allocate a field guide."
          pagination={{
            page,
            limit,
            total,
            totalPages,
            onPageChange: (p) => setPage(p),
          }}
        />
      </div>

      {/* Assign Guide Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Assign Tour Guide to Trip"
          subtitle="Configure tour dates, primary & secondary guides with date overlap protection"
          maxWidth="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {formError && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg">
                {formError}
              </div>
            )}

            {/* Overlap Conflict Alert */}
            {conflictWarning && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-lg space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Schedule Conflict Detected!</span>
                </div>
                <p className="text-[11px] leading-relaxed">{conflictWarning}</p>
                <label className="flex items-center gap-2 pt-1 font-semibold text-slate-900 dark:text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canOverride}
                    onChange={(e) => setCanOverride(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span>Admin Override: Proceed and assign guide despite date conflict</span>
                </label>
              </div>
            )}

            {/* Link to Package */}
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Select Tour Package (Auto-populates Tour & Passenger Manifest)</span>
                {selectedPackageId && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    ✓ Package Auto-Sync Active
                  </span>
                )}
              </label>
              <select
                value={selectedPackageId}
                onChange={(e) => handlePackageSelect(e.target.value)}
                className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-medium"
              >
                <option value="">Select a travel package or create custom tour...</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.packageName} ({p.destination} • {p.duration})
                  </option>
                ))}
              </select>
            </div>

            {/* Link to Existing Confirmed Booking */}
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Link to Booking (Optional - Auto-populates customer booking details)
              </label>
              <select
                value={selectedBookingId}
                onChange={(e) => handleBookingSelect(e.target.value)}
                className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
              >
                <option value="">Select a confirmed booking or enter manual tour...</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bookingNumber} - {b.package?.packageName || 'Tour'} ({b.customer?.organizationName || b.customer?.fullName})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Tour / Circuit Name *</label>
                <input
                  type="text"
                  required
                  value={tourName}
                  onChange={(e) => setTourName(e.target.value)}
                  placeholder="e.g. 3D/2N Coorg Heritage & Wildlife"
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Destination *</label>
                <input
                  type="text"
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Coorg, Ooty, Hampi"
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
                />
              </div>
            </div>

            {/* Guide Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Primary Tour Guide *
                </label>
                <select
                  required
                  value={primaryGuideId}
                  onChange={(e) => handlePrimaryGuideChange(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-semibold"
                >
                  <option value="">Select Primary Guide...</option>
                  {guides.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.fullName} ({g.guideCode}) - ₹{g.dailyRate || 0}/day [{g.guideType}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Secondary Guide / Escort (Optional)
                </label>
                <select
                  value={secondaryGuideId}
                  onChange={(e) => setSecondaryGuideId(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
                >
                  <option value="">None (Single Guide)</option>
                  {guides
                    .filter((g) => g.id !== primaryGuideId)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.fullName} ({g.guideCode})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Dates & Logistics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Start Date *</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">End Date *</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Reporting Time</label>
                <input
                  type="text"
                  value={reportingTime}
                  onChange={(e) => setReportingTime(e.target.value)}
                  placeholder="e.g. 06:30 AM"
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Passenger Count</label>
                <input
                  type="number"
                  min="1"
                  value={passengerCount}
                  onChange={(e) => setPassengerCount(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Guide Fee (₹)</label>
                <input
                  type="number"
                  value={guideFee}
                  onChange={(e) => setGuideFee(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Per Diem (₹)</label>
                <input
                  type="number"
                  value={perDiemAllowance}
                  onChange={(e) => setPerDiemAllowance(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
                />
              </div>
            </div>

            {/* Cab & Driver Logistics Section */}
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-slate-900 dark:text-white text-xs">
                    Assigned Tourist Vehicle & Driver Logistics
                  </span>
                  <span className="text-[10px] text-blue-600 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded font-semibold">
                    For Guide & Ops
                  </span>
                </div>
                {/* Mode Selector Toggle */}
                <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setCabSourceMode('B2B')}
                    className={`px-2.5 py-0.5 rounded-md transition-all ${
                      cabSourceMode === 'B2B'
                        ? 'bg-blue-600 text-white font-bold shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    B2B Transport Master
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCabSourceMode('MANUAL');
                      setSelectedB2bCabId('');
                    }}
                    className={`px-2.5 py-0.5 rounded-md transition-all ${
                      cabSourceMode === 'MANUAL'
                        ? 'bg-blue-600 text-white font-bold shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Enter Manually
                  </button>
                </div>
              </div>

              {cabSourceMode === 'B2B' && (
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Direct Select from B2B Transport / Cabs ({b2bTransportOptions.length} available)
                  </label>
                  <select
                    value={selectedB2bCabId}
                    onChange={(e) => handleB2bCabSelect(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-medium"
                  >
                    <option value="">-- Choose Transport / Driver from B2B Library --</option>
                    {b2bTransportOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Driver / Chauffeur Name</label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Driver Phone Number</label>
                  <input
                    type="tel"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Vehicle Registration Number</label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="e.g. KA 04 ME 1234"
                    className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-mono font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Vehicle Type</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
                  >
                    <option value="Innova Crysta">Innova Crysta (6+1)</option>
                    <option value="Innova Hycross">Innova Hycross</option>
                    <option value="Sedan / Dzire / Etios">Sedan / Dzire / Etios (4+1)</option>
                    <option value="Tempo Traveller (12 Seater)">Tempo Traveller (12 Seater)</option>
                    <option value="Tempo Traveller (17 Seater)">Tempo Traveller (17 Seater)</option>
                    <option value="Mini Coach (21 Seater)">Mini Coach (21 Seater)</option>
                    <option value="Luxury Coach (35+ Seater)">Luxury Coach (35+ Seater)</option>
                    <option value="Volvo Multi-Axle (45 Seater)">Volvo Multi-Axle (45 Seater)</option>
                    <option value="Dedicated Tour Vehicle">Other / Custom Vehicle</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tour Accommodation & Staying Hotel Logistics Section */}
            <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hotel className="w-4 h-4 text-amber-600" />
                  <span className="font-bold text-slate-900 dark:text-white text-xs">
                    Tour Accommodation & Staying Hotel
                  </span>
                </div>
                {/* Mode Selector Toggle */}
                <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setHotelSourceMode('B2B')}
                    className={`px-2.5 py-0.5 rounded-md transition-all ${
                      hotelSourceMode === 'B2B'
                        ? 'bg-amber-500 text-white font-bold shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    B2B Hotel Master
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHotelSourceMode('MANUAL');
                      setSelectedB2bHotelId('');
                    }}
                    className={`px-2.5 py-0.5 rounded-md transition-all ${
                      hotelSourceMode === 'MANUAL'
                        ? 'bg-amber-500 text-white font-bold shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Enter Manually
                  </button>
                </div>
              </div>

              {hotelSourceMode === 'B2B' ? (
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Direct Select from B2B Hotels ({b2bHotels.length} available)
                  </label>
                  <select
                    value={selectedB2bHotelId}
                    onChange={(e) => handleB2bHotelSelect(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-medium"
                  >
                    <option value="">-- Choose Hotel from B2B Library --</option>
                    {b2bHotels.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} {h.city ? `(${h.city})` : ''} - {h.starCategory || 'Hotel'} {h.contactPhone ? `[Ph: ${h.contactPhone}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Hotel Name</label>
                  <input
                    type="text"
                    value={hotelName}
                    onChange={(e) => setHotelName(e.target.value)}
                    placeholder="e.g. Heritage Resort Coorg"
                    className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">City / Location</label>
                  <input
                    type="text"
                    value={hotelLocation}
                    onChange={(e) => setHotelLocation(e.target.value)}
                    placeholder="e.g. Madikeri, Coorg"
                    className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Star Rating</label>
                  <select
                    value={hotelStarCategory}
                    onChange={(e) => setHotelStarCategory(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
                  >
                    <option value="3 Star">3 Star</option>
                    <option value="4 Star">4 Star</option>
                    <option value="5 Star">5 Star</option>
                    <option value="Heritage / Resort">Heritage / Resort</option>
                    <option value="Boutique / Homestay">Boutique / Homestay</option>
                    <option value="Standard">Standard</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Hotel Contact Phone</label>
                  <input
                    type="tel"
                    value={hotelPhone}
                    onChange={(e) => setHotelPhone(e.target.value)}
                    placeholder="Front Desk / Reservation"
                    className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Meal Plan</label>
                  <select
                    value={mealPlan}
                    onChange={(e) => setMealPlan(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
                  >
                    <option value="Breakfast Included (CP)">Breakfast Included (CP)</option>
                    <option value="Breakfast + Dinner (MAP)">Breakfast + Dinner (MAP)</option>
                    <option value="All Meals (AP)">All Meals (AP)</option>
                    <option value="Room Only (EP)">Room Only (EP)</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Special Instructions for Guide
              </label>
              <textarea
                rows={2}
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="e.g. Senior citizens in group, provide frequent breaks and Hindi commentary..."
                className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Validating...' : 'Assign Guide'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
