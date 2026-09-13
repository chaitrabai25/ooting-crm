import React, { useState, useEffect } from 'react';
import { Car, User, Phone, Mail, MapPin, Calendar, Clock, DollarSign, ShieldAlert, AlertCircle, FileText } from 'lucide-react';
import { Modal } from '../../components/ui/Modal.js';
import { api } from '../../api/client.js';
import { CabBooking, Customer } from '../../types/index.js';

interface CabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: CabBooking | null;
}

export const CabModal: React.FC<CabModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);

  // Form State
  const [customerId, setCustomerId] = useState<string>(initialData?.customerId || '');
  const [customerName, setCustomerName] = useState<string>(initialData?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState<string>(initialData?.customerPhone || '');
  const [customerEmail, setCustomerEmail] = useState<string>(initialData?.customerEmail || '');

  const [pickupDate, setPickupDate] = useState<string>(
    initialData?.pickupDate ? initialData.pickupDate.split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [pickupTime, setPickupTime] = useState<string>(initialData?.pickupTime || '08:00 AM');
  const [pickupPlace, setPickupPlace] = useState<string>(initialData?.pickupPlace || '');
  const [dropPlace, setDropPlace] = useState<string>(initialData?.dropPlace || '');
  const [travelRoute, setTravelRoute] = useState<string>(initialData?.travelRoute || '');

  const [vehicleType, setVehicleType] = useState<string>(initialData?.vehicleType || 'SEDAN');
  const [requiredCabType, setRequiredCabType] = useState<string>(initialData?.requiredCabType || 'AC');
  const [tripType, setTripType] = useState<string>(initialData?.tripType || 'OUTSTATION');
  const [passengerCount, setPassengerCount] = useState<number>(initialData?.passengerCount || 2);
  const [carNumber, setCarNumber] = useState<string>(initialData?.carNumber || '');
  const [driverName, setDriverName] = useState<string>(initialData?.driverName || '');
  const [driverPhone, setDriverPhone] = useState<string>(initialData?.driverPhone || '');
  const [cabProvider, setCabProvider] = useState<string>(initialData?.cabProvider || '');

  const [estimatedDistance, setEstimatedDistance] = useState<string>(initialData?.estimatedDistance || '');
  const [estimatedDuration, setEstimatedDuration] = useState<string>(initialData?.estimatedDuration || '');

  const [cabAmount, setCabAmount] = useState<number>(initialData?.cabAmount || 0);
  const [advanceAmount, setAdvanceAmount] = useState<number>(initialData?.advanceAmount || 0);
  const [paymentStatus, setPaymentStatus] = useState<string>(initialData?.paymentStatus || 'PENDING');
  const [bookingStatus, setBookingStatus] = useState<string>(initialData?.bookingStatus || 'CONFIRMED');

  const [assignedStaffId, setAssignedStaffId] = useState<string>(initialData?.assignedStaffId || '');
  const [specialInstructions, setSpecialInstructions] = useState<string>(initialData?.specialInstructions || '');
  const [internalNotes, setInternalNotes] = useState<string>(initialData?.internalNotes || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.get('/customers?limit=100').then((res) => {
        setCustomers(res.data.data || []);
      }).catch(console.error);

      api.get('/users/staff').then((res) => {
        setStaffList(res.data || []);
      }).catch(console.error);

      if (initialData) {
        setCustomerId(initialData.customerId || '');
        setCustomerName(initialData.customerName || '');
        setCustomerPhone(initialData.customerPhone || '');
        setCustomerEmail(initialData.customerEmail || '');
        setPickupDate(initialData.pickupDate ? initialData.pickupDate.split('T')[0] : '');
        setPickupTime(initialData.pickupTime || '');
        setPickupPlace(initialData.pickupPlace || '');
        setDropPlace(initialData.dropPlace || '');
        setTravelRoute(initialData.travelRoute || '');
        setVehicleType(initialData.vehicleType || 'SEDAN');
        setRequiredCabType(initialData.requiredCabType || 'AC');
        setTripType(initialData.tripType || 'OUTSTATION');
        setPassengerCount(initialData.passengerCount || 1);
        setCarNumber(initialData.carNumber || '');
        setDriverName(initialData.driverName || '');
        setDriverPhone(initialData.driverPhone || '');
        setCabProvider(initialData.cabProvider || '');
        setEstimatedDistance(initialData.estimatedDistance || '');
        setEstimatedDuration(initialData.estimatedDuration || '');
        setCabAmount(initialData.cabAmount || 0);
        setAdvanceAmount(initialData.advanceAmount || 0);
        setPaymentStatus(initialData.paymentStatus || 'PENDING');
        setBookingStatus(initialData.bookingStatus || 'CONFIRMED');
        setAssignedStaffId(initialData.assignedStaffId || '');
        setSpecialInstructions(initialData.specialInstructions || '');
        setInternalNotes(initialData.internalNotes || '');
      } else {
        // Reset
        setCustomerId('');
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setPickupDate(new Date().toISOString().split('T')[0]);
        setPickupTime('08:00 AM');
        setPickupPlace('');
        setDropPlace('');
        setTravelRoute('');
        setVehicleType('SEDAN');
        setRequiredCabType('AC');
        setTripType('OUTSTATION');
        setPassengerCount(2);
        setCarNumber('');
        setDriverName('');
        setDriverPhone('');
        setCabProvider('');
        setEstimatedDistance('');
        setEstimatedDuration('');
        setCabAmount(0);
        setAdvanceAmount(0);
        setPaymentStatus('PENDING');
        setBookingStatus('CONFIRMED');
        setAssignedStaffId('');
        setSpecialInstructions('');
        setInternalNotes('');
      }
      setError(null);
    }
  }, [isOpen, initialData]);

  const handleCustomerSelect = (id: string) => {
    setCustomerId(id);
    const selected = customers.find((c) => c.id === id);
    if (selected) {
      setCustomerName(selected.fullName);
      setCustomerPhone(selected.phone);
      if (selected.email) setCustomerEmail(selected.email);
    }
  };

  const balanceAmount = Math.max(0, (Number(cabAmount) || 0) - (Number(advanceAmount) || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setError('Customer name is required');
      return;
    }
    if (!customerPhone.trim()) {
      setError('Customer phone number is required');
      return;
    }
    if (!pickupPlace.trim() || !dropPlace.trim()) {
      setError('Pickup and Drop locations are required');
      return;
    }
    if (!pickupDate) {
      setError('Pickup date is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload = {
        customerId: customerId || null,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || null,
        pickupDate,
        pickupTime: pickupTime.trim(),
        pickupPlace: pickupPlace.trim(),
        dropPlace: dropPlace.trim(),
        travelRoute: travelRoute.trim() || null,
        vehicleType,
        requiredCabType,
        tripType,
        passengerCount: Number(passengerCount) || 1,
        carNumber: carNumber.trim() ? carNumber.trim().toUpperCase() : null,
        driverName: driverName.trim() || null,
        driverPhone: driverPhone.trim() || null,
        cabProvider: cabProvider.trim() || null,
        estimatedDistance: estimatedDistance.trim() || null,
        estimatedDuration: estimatedDuration.trim() || null,
        cabAmount: Number(cabAmount) || 0,
        advanceAmount: Number(advanceAmount) || 0,
        paymentStatus,
        bookingStatus,
        assignedStaffId: assignedStaffId || null,
        specialInstructions: specialInstructions.trim() || null,
        internalNotes: internalNotes.trim() || null,
      };

      if (initialData?.id) {
        await api.put(`/cabs/${initialData.id}`, payload);
      } else {
        await api.post('/cabs', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Cab booking save error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to save cab booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? `Edit Cab Booking: ${initialData.bookingReference}` : 'New Cab Booking / Transfer'}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-lg flex items-center gap-2 text-rose-700 dark:text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Customer Details */}
        <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <User className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              Customer Information
            </h3>
            {customers.length > 0 && (
              <div className="w-56">
                <select
                  value={customerId}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">-- Autofill from existing customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Customer Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="e.g. +91 9876543210"
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="ramesh@gmail.com"
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Journey & Schedule */}
        <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Trip Route & Schedule
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Pickup Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Pickup Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                placeholder="e.g. 06:30 AM"
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Pickup Location <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={pickupPlace}
                onChange={(e) => setPickupPlace(e.target.value)}
                placeholder="e.g. Coimbatore Airport / Hotel"
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Drop Location <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={dropPlace}
                onChange={(e) => setDropPlace(e.target.value)}
                placeholder="e.g. Ooty Town / Resort"
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Trip Type
              </label>
              <select
                value={tripType}
                onChange={(e) => setTripType(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="OUTSTATION">Outstation Tour</option>
                <option value="LOCAL">Local Sightseeing</option>
                <option value="ONE_WAY">One-Way Transfer</option>
                <option value="ROUND_TRIP">Round Trip</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Passengers
              </label>
              <input
                type="number"
                min={1}
                value={passengerCount}
                onChange={(e) => setPassengerCount(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Est. Distance
              </label>
              <input
                type="text"
                value={estimatedDistance}
                onChange={(e) => setEstimatedDistance(e.target.value)}
                placeholder="e.g. 180 km"
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Est. Duration
              </label>
              <input
                type="text"
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(e.target.value)}
                placeholder="e.g. 2 Days / 1 Night"
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Detailed Travel Route & Sightseeing Itinerary
            </label>
            <input
              type="text"
              value={travelRoute}
              onChange={(e) => setTravelRoute(e.target.value)}
              placeholder="e.g. Coimbatore Airport -> Coonoor (Sim's Park) -> Ooty Lake -> Doddabetta -> Drop Coimbatore"
              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
        </div>

        {/* Section 3: Vehicle & Driver Details */}
        <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Car className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            Vehicle & Driver Assignment
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Vehicle Category
              </label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="SEDAN">Sedan (Dzire / Etios / 4 Seats)</option>
                <option value="SUV">SUV (Ertiga / 6-7 Seats)</option>
                <option value="INNOVA">Innova / Crysta (7 Seats)</option>
                <option value="TEMPO_TRAVELLER">Tempo Traveller (12-17 Seats)</option>
                <option value="HATCHBACK">Hatchback (WagonR / 4 Seats)</option>
                <option value="LUXURY">Luxury Vehicle</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Air Conditioning
              </label>
              <select
                value={requiredCabType}
                onChange={(e) => setRequiredCabType(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="AC">AC (Air Conditioned)</option>
                <option value="NON_AC">Non-AC</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Vehicle Number Plate
              </label>
              <input
                type="text"
                value={carNumber}
                onChange={(e) => setCarNumber(e.target.value.toUpperCase())}
                placeholder="e.g. TN 43 AB 1234"
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Cab Operator / Vendor
              </label>
              <input
                type="text"
                value={cabProvider}
                onChange={(e) => setCabProvider(e.target.value)}
                placeholder="e.g. Ooty Nilgiri Travels"
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Assigned Driver Name
              </label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="e.g. Murugan / Prakash"
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Driver Contact Phone
              </label>
              <input
                type="text"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                placeholder="e.g. +91 9443212345"
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Pricing, Status & Financials */}
        <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Pricing & Booking Status
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Total Cab Amount (₹)
              </label>
              <input
                type="number"
                min={0}
                value={cabAmount}
                onChange={(e) => setCabAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Advance Paid (₹)
              </label>
              <input
                type="number"
                min={0}
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Balance Due (₹)
              </label>
              <div className="w-full px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-bold">
                ₹{balanceAmount.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Payment Status
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="PENDING">Pending</option>
                <option value="PARTIAL">Partially Paid</option>
                <option value="PAID">Fully Paid</option>
                <option value="REFUNDED">Refunded</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Trip Booking Status
              </label>
              <select
                value={bookingStatus}
                onChange={(e) => setBookingStatus(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="CONFIRMED">Confirmed</option>
                <option value="ON_TRIP">On Trip (Active)</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Assign Staff Coordinator
              </label>
              <select
                value={assignedStaffId}
                onChange={(e) => setAssignedStaffId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="">-- Assign Staff --</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 5: Instructions & Internal Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Special Instructions (Printed on Duty Slip)
            </label>
            <textarea
              rows={2}
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="e.g. AC will be switched off on uphill hairpin bends. Infant baby on board."
              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Internal Office / Accounts Notes
            </label>
            <textarea
              rows={2}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="e.g. Vendor payout ₹3,200 pending after tour completion."
              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : initialData ? 'Update Cab Booking' : 'Create Cab Booking'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
