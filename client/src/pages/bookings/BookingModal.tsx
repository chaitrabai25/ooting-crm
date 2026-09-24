import React, { useState, useEffect } from 'react';
import {
  Users,
  User,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  Search,
  MapPin,
  Building2,
  Sparkles,
  Award,
  Trash2,
  Plus,
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Modal } from '../../components/ui/Modal.js';
import { Booking, Traveller, Supplier } from '../../types/index.js';
import { ServiceProviderSelectModal } from './ServiceProviderSelectModal.js';
import { PassengerImportModal } from '../../components/passengers/PassengerImportModal.js';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Booking | null;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [customerId, setCustomerId] = useState(initialData?.customerId || '');
  const [packageId, setPackageId] = useState(initialData?.packageId || '');
  const [travelStartDate, setTravelStartDate] = useState(
    initialData?.travelStartDate ? initialData.travelStartDate.split('T')[0] : ''
  );
  const [travelEndDate, setTravelEndDate] = useState(
    initialData?.travelEndDate ? initialData.travelEndDate.split('T')[0] : ''
  );
  const [durationDays, setDurationDays] = useState<number>(initialData?.durationDays || 1);
  const [durationNights, setDurationNights] = useState<number>(
    initialData?.durationNights !== undefined && initialData?.durationNights !== null ? initialData.durationNights : 0
  );
  const [isCustomDuration, setIsCustomDuration] = useState<boolean>(false);
  const [tripType, setTripType] = useState<'SINGLE' | 'GROUP'>(
    (initialData?.tripType as 'SINGLE' | 'GROUP') || (initialData?.travellers && initialData.travellers > 1 ? 'GROUP' : 'SINGLE')
  );
  const [isPassengerImportOpen, setIsPassengerImportOpen] = useState(false);
  const [travellers, setTravellers] = useState(initialData?.travellers || 1);
  const [totalAmount, setTotalAmount] = useState(initialData?.totalAmount || 0);
  const [discount, setDiscount] = useState(initialData?.discount || 0);
  const [bookingStatus, setBookingStatus] = useState(initialData?.bookingStatus || 'CONFIRMED');
  const [assignedUserId, setAssignedUserId] = useState(initialData?.assignedUserId || '');
  const [notes, setNotes] = useState(initialData?.notes || '');

  // Customer selection mode & manual creation
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerCity, setCustomerCity] = useState('');

  // Multi-traveller state
  const [travellersList, setTravellersList] = useState<Traveller[]>([]);

  // B2B Agent Option
  const [agentId, setAgentId] = useState('');
  const [commissionRate, setCommissionRate] = useState(0);

  // B2B Service Providers Option
  interface BookingServiceProviderItem {
    supplierId: string;
    supplierName: string;
    category: string;
    tier: string;
    contactPerson?: string;
    phone?: string;
    rate?: number;
    details?: string;
    notes?: string;
  }
  const [selectedProviders, setSelectedProviders] = useState<BookingServiceProviderItem[]>([]);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);

  // Dropdown data
  const [customers, setCustomers] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.get('/customers?limit=100').then((res) => setCustomers(res.data.data || []));
      api.get('/packages?limit=100').then((res) => setPackages(res.data.data || []));
      api.get('/users/staff').then((res) => setStaff(res.data || []));
      api.get('/agents?limit=100').then((res) => setAgents(res.data.data || []));

      // If editing, load full booking with travellersList & serviceProviders
      if (initialData?.id) {
        api.get('/bookings/' + initialData.id).then((res) => {
          const b = res.data;
          if (b) {
            setCustomerId(b.customerId || '');
            setPackageId(b.packageId || '');
            setTravelStartDate(b.travelStartDate ? b.travelStartDate.split('T')[0] : '');
            setTravelEndDate(b.travelEndDate ? b.travelEndDate.split('T')[0] : '');
            if (b.durationDays) setDurationDays(b.durationDays);
            if (b.durationNights !== undefined && b.durationNights !== null) setDurationNights(b.durationNights);
            if (b.tripType) setTripType(b.tripType as any);
            setTravellers(b.travellers || 1);
            setTotalAmount(b.totalAmount || 0);
            setDiscount(b.discount || 0);
            setBookingStatus(b.bookingStatus || 'CONFIRMED');
            setAssignedUserId(b.assignedUserId || '');
            setNotes(b.notes || '');

            if (b.serviceProviders) {
              try {
                const parsed =
                  typeof b.serviceProviders === 'string'
                    ? JSON.parse(b.serviceProviders)
                    : b.serviceProviders;
                if (Array.isArray(parsed)) setSelectedProviders(parsed);
                else setSelectedProviders([]);
              } catch {
                setSelectedProviders([]);
              }
            } else {
              setSelectedProviders([]);
            }

            if (b.travellersList && b.travellersList.length > 0) {
              setTravellersList(b.travellersList);
            } else {
              // initialize with customer
              setTravellersList([
                {
                  name: b.customer?.fullName || '',
                  phone: b.customer?.phone || '',
                  email: b.customer?.email || '',
                  isPrimary: true,
                },
              ]);
            }
          }
        });
      } else {
        // New booking: initialize 1 traveller
        setSelectedProviders([]);
        setTravellersList([
          {
            name: '',
            phone: '',
            email: '',
            isPrimary: true,
          },
        ]);
      }
    }
  }, [isOpen, initialData]);

  const handleQuickDuration = (days: number, nights: number) => {
    setDurationDays(days);
    setDurationNights(nights);
    setIsCustomDuration(false);
    if (travelStartDate) {
      const start = new Date(travelStartDate);
      const end = new Date(start);
      end.setDate(start.getDate() + Math.max(0, days - 1));
      setTravelEndDate(end.toISOString().split('T')[0]);
    }
  };

  const handleStartDateChange = (startDateStr: string) => {
    setTravelStartDate(startDateStr);
    if (startDateStr && durationDays > 0) {
      const start = new Date(startDateStr);
      const end = new Date(start);
      end.setDate(start.getDate() + Math.max(0, durationDays - 1));
      setTravelEndDate(end.toISOString().split('T')[0]);
    }
  };

  const handleImportedPassengers = (passengers: Traveller[]) => {
    if (passengers.length === 0) return;
    setTravellersList(passengers);
    setTravellers(passengers.length);
    if (passengers.length > 1) {
      setTripType('GROUP');
    }
    const pkg = packages.find((p) => p.id === packageId);
    if (pkg && !initialData) {
      setTotalAmount(pkg.price * passengers.length);
    }
  };

  const handleAddTravellerRow = () => {
    const newCount = travellersList.length + 1;
    setTravellers(newCount);
    setTravellersList((prev) => [
      ...prev,
      {
        name: '',
        age: null,
        gender: 'MALE',
        phone: '',
        email: '',
        idNumber: '',
        address: '',
        isPrimary: false,
      },
    ]);
  };

  const handleRemoveTravellerRow = (idx: number) => {
    if (travellersList.length <= 1) return;
    const updated = travellersList.filter((_, i) => i !== idx);
    setTravellers(updated.length);
    setTravellersList(updated);
  };

  // Adjust travellers list when traveller count changes
  const handleTravellerCountChange = (count: number) => {
    const validCount = Math.max(1, count);
    setTravellers(validCount);

    const pkg = packages.find((p) => p.id === packageId);
    if (pkg && !initialData) {
      setTotalAmount(pkg.price * validCount);
    }

    setTravellersList((prev) => {
      const updated = [...prev];
      if (validCount > updated.length) {
        for (let i = updated.length; i < validCount; i++) {
          updated.push({
            name: '',
            age: null,
            gender: 'MALE',
            phone: '',
            email: '',
            isPrimary: false,
          });
        }
      } else if (validCount < updated.length) {
        return updated.slice(0, validCount);
      }
      return updated;
    });
  };

  const handleCustomerSelect = (id: string) => {
    setCustomerId(id);
    const selected = customers.find((c) => c.id === id);
    if (selected) {
      setTravellersList((prev) => {
        const updated = [...prev];
        if (updated.length === 0) {
          updated.push({
            name: selected.fullName,
            phone: selected.phone,
            email: selected.email || '',
            isPrimary: true,
          });
        } else {
          updated[0] = {
            ...updated[0],
            name: selected.fullName,
            phone: selected.phone,
            email: selected.email || '',
            isPrimary: true,
          };
        }
        return updated;
      });
    }
  };

  const handlePackageSelect = (pkgId: string) => {
    setPackageId(pkgId);
    const selected = packages.find((p) => p.id === pkgId);
    if (selected && !initialData) {
      setTotalAmount(selected.price * travellers);
    }
  };

  const updateTravellerField = (index: number, field: keyof Traveller, value: any) => {
    setTravellersList((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.fullName?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone?.includes(customerSearch)
  );

  const handleManualCustomerChange = (field: 'name' | 'phone' | 'email' | 'city', value: string) => {
    if (field === 'name') setCustomerName(value);
    if (field === 'phone') setCustomerPhone(value);
    if (field === 'email') setCustomerEmail(value);
    if (field === 'city') setCustomerCity(value);

    // Synchronize primary traveller
    setTravellersList((prev) => {
      const updated = [...prev];
      if (updated.length === 0) {
        updated.push({
          name: field === 'name' ? value : customerName,
          phone: field === 'phone' ? value : customerPhone,
          email: field === 'email' ? value : customerEmail,
          isPrimary: true,
        });
      } else {
        updated[0] = {
          ...updated[0],
          name: field === 'name' ? value : updated[0].name,
          phone: field === 'phone' ? value : updated[0].phone,
          email: field === 'email' ? value : updated[0].email,
          isPrimary: true,
        };
      }
      return updated;
    });
  };

  const handleAddProvider = (provider: Supplier) => {
    if (selectedProviders.some((p) => p.supplierId === provider.id)) return;
    let cat = provider.category || provider.supplierType || 'Service Provider';
    if (Array.isArray(provider.serviceCategories) && provider.serviceCategories.length > 0) {
      cat = provider.serviceCategories[0];
    } else if (typeof provider.serviceCategories === 'string') {
      try {
        const parsed = JSON.parse(provider.serviceCategories);
        if (Array.isArray(parsed) && parsed.length > 0) cat = parsed[0];
      } catch {}
    }

    setSelectedProviders((prev) => [
      ...prev,
      {
        supplierId: provider.id,
        supplierName: provider.name,
        category: cat,
        tier: provider.tier || 'Silver',
        contactPerson: provider.contactPerson || '',
        phone: provider.phone || '',
        rate: 0,
        details: provider.servicesProvided || '',
        notes: '',
      },
    ]);
  };

  const handleRemoveProvider = (supplierId: string) => {
    setSelectedProviders((prev) => prev.filter((p) => p.supplierId !== supplierId));
  };

  const updateProviderField = (
    index: number,
    field: 'rate' | 'notes' | 'category',
    val: any
  ) => {
    setSelectedProviders((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], [field]: val };
      }
      return copy;
    });
  };

  const finalAmount = Math.max(0, Number(totalAmount) - Number(discount));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNewCustomer && !customerId) {
      setError('Please select an existing customer or switch to Add Customer Manually.');
      return;
    }
    if (isNewCustomer && (!customerName.trim() || !customerPhone.trim())) {
      setError('Customer Full Name and Phone Number are required.');
      return;
    }
    if (!travelStartDate || !travelEndDate) {
      setError('Travel dates are required.');
      return;
    }

    // Validate travellers list
    for (let i = 0; i < travellersList.length; i++) {
      if (!travellersList[i].name || !travellersList[i].name.trim()) {
        setError(`Please enter the full name for Traveller ${i + 1}.`);
        return;
      }
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const payload: any = {
        packageId: packageId || null,
        assignedUserId: assignedUserId || null,
        travelStartDate,
        travelEndDate,
        durationDays: Number(durationDays),
        durationNights: Number(durationNights),
        tripType,
        travellers: Number(travellers),
        totalAmount: Number(totalAmount),
        discount: Number(discount),
        bookingStatus,
        notes: notes || null,
        agentId: agentId || null,
        commissionRate: Number(commissionRate) || 0,
        serviceProviders:
          selectedProviders.length > 0 ? JSON.stringify(selectedProviders) : null,
        travellersList: travellersList.map((t, idx) => ({
          name: t.name.trim(),
          age: t.age ? Number(t.age) : null,
          gender: t.gender || null,
          phone: t.phone ? t.phone.trim() : null,
          email: t.email ? t.email.trim() : null,
          idNumber: t.idNumber ? t.idNumber.trim() : null,
          address: t.address ? t.address.trim() : null,
          isPrimary: idx === 0 || !!t.isPrimary,
        })),
      };

      if (!isNewCustomer && customerId) {
        payload.customerId = customerId;
      } else {
        payload.customerName = customerName.trim();
        payload.customerPhone = customerPhone.trim();
        payload.customerEmail = customerEmail.trim() || null;
        payload.customerCity = customerCity.trim() || null;
      }

      if (initialData?.id) {
        await api.put('/bookings/' + initialData.id, payload);
      } else {
        await api.post('/bookings', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        'Unable to save booking. Your data was not saved. Please verify all fields and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Booking' : 'Create Confirmed Booking'}
      subtitle="Record confirmed travel itinerary, multi-traveller details, and financials"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-xs max-h-[78vh] overflow-y-auto pr-1">
        {error && (
          <div className="p-3 bg-red-50 text-[#C91F28] border border-red-200 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Customer Selection Section */}
        <div className="p-3.5 bg-slate-50/80 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-850 dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <label className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#C91F28]" />
              Customer Information *
            </label>
            {!initialData && (
              <div className="flex items-center p-0.5 bg-slate-200/70 dark:bg-slate-800 rounded-lg text-[11px] self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsNewCustomer(false)}
                  className={`px-2.5 py-1 font-semibold rounded-md transition-colors ${
                    !isNewCustomer
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Select Existing
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewCustomer(true)}
                  className={`px-2.5 py-1 font-semibold rounded-md transition-colors ${
                    isNewCustomer
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  + Add Customer Manually
                </button>
              </div>
            )}
          </div>

          {!isNewCustomer ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Filter existing customers by name or phone..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                />
              </div>

              <select
                required={!isNewCustomer}
                value={customerId}
                onChange={(e) => handleCustomerSelect(e.target.value)}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:border-transparent focus:outline-none bg-white font-medium text-xs"
              >
                <option value="">-- Choose Customer ({filteredCustomers.length} available) --</option>
                {filteredCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.phone}){c.city ? ` - ${c.city}` : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required={isNewCustomer}
                  value={customerName}
                  onChange={(e) => handleManualCustomerChange('name', e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] block mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required={isNewCustomer}
                  value={customerPhone}
                  onChange={(e) => handleManualCustomerChange('phone', e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => handleManualCustomerChange('email', e.target.value)}
                  placeholder="e.g. ramesh@gmail.com"
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] block mb-1">
                  City / Location
                </label>
                <input
                  type="text"
                  value={customerCity}
                  onChange={(e) => handleManualCustomerChange('city', e.target.value)}
                  placeholder="e.g. Bangalore"
                  className="w-full p-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Trip Type Selection */}
        <div className="p-3 bg-slate-50/80 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#C91F28]" />
              Trip Type *
            </label>
            <span className="text-[11px] text-slate-500 font-normal">
              {tripType === 'GROUP' ? 'Group tour with bulk passenger roster' : 'Individual / Family tour'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTripType('SINGLE')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                tripType === 'SINGLE'
                  ? 'border-[#C91F28] bg-red-50/50 dark:bg-red-950/40 text-[#C91F28] dark:text-red-300 font-bold shadow-2xs'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Single / Individual Trip</span>
            </button>
            <button
              type="button"
              onClick={() => setTripType('GROUP')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                tripType === 'GROUP'
                  ? 'border-[#C91F28] bg-red-50/50 dark:bg-red-950/40 text-[#C91F28] dark:text-red-300 font-bold shadow-2xs'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Group Trip</span>
            </button>
          </div>
        </div>

        {/* Travel Package */}
        <div>
          <label className="font-semibold text-slate-700 dark:text-slate-300">Travel Package (Optional)</label>
          <select
            value={packageId}
            onChange={(e) => handlePackageSelect(e.target.value)}
            className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:border-transparent focus:outline-none bg-white font-medium"
          >
            <option value="">-- Custom Tour Package --</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.packageName} ({p.duration})
              </option>
            ))}
          </select>
        </div>

        {/* Flexible Trip Duration Selector */}
        <div className="p-3.5 bg-slate-50/80 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#C91F28]" />
              Trip Duration *
            </label>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 dark:bg-red-950/60 text-[#C91F28] dark:text-red-300 border border-red-200 dark:border-red-800">
              {durationDays} {durationDays === 1 ? 'Day' : 'Days'} / {durationNights} {durationNights === 1 ? 'Night' : 'Nights'}
            </span>
          </div>

          {/* Quick Combination Presets */}
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">Quick Combinations:</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { d: 1, n: 0, label: '1D / 0N' },
                { d: 1, n: 1, label: '1D / 1N' },
                { d: 2, n: 1, label: '2D / 1N' },
                { d: 2, n: 2, label: '2D / 2N' },
                { d: 3, n: 2, label: '3D / 2N' },
                { d: 3, n: 3, label: '3D / 3N' },
                { d: 4, n: 3, label: '4D / 3N' },
                { d: 4, n: 4, label: '4D / 4N' },
              ].map((combo) => {
                const isSelected = durationDays === combo.d && durationNights === combo.n && !isCustomDuration;
                return (
                  <button
                    key={combo.label}
                    type="button"
                    onClick={() => handleQuickDuration(combo.d, combo.n)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#C91F28] text-white border-[#C91F28] shadow-2xs font-bold'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-[#C91F28]'
                    }`}
                  >
                    {combo.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setIsCustomDuration(true)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                  isCustomDuration
                    ? 'bg-[#C91F28] text-white border-[#C91F28] shadow-2xs font-bold'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-[#C91F28]'
                }`}
              >
                Custom
              </button>
            </div>
          </div>

          {/* Individual Days and Nights Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Days:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDurationDays(d);
                      setIsCustomDuration(false);
                      if (travelStartDate) {
                        const start = new Date(travelStartDate);
                        const end = new Date(start);
                        end.setDate(start.getDate() + Math.max(0, d - 1));
                        setTravelEndDate(end.toISOString().split('T')[0]);
                      }
                    }}
                    className={`w-7 h-7 rounded-lg font-bold text-xs border transition-colors cursor-pointer ${
                      durationDays === d && !isCustomDuration
                        ? 'bg-[#C91F28] text-white border-[#C91F28]'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {d}
                  </button>
                ))}
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={durationDays}
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value || '1', 10));
                    setDurationDays(val);
                    setIsCustomDuration(true);
                    if (travelStartDate) {
                      const start = new Date(travelStartDate);
                      const end = new Date(start);
                      end.setDate(start.getDate() + Math.max(0, val - 1));
                      setTravelEndDate(end.toISOString().split('T')[0]);
                    }
                  }}
                  placeholder="Custom"
                  className="w-16 h-7 px-2 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-[#C91F28]"
                  title="Custom days"
                />
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Nights:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      setDurationNights(n);
                      setIsCustomDuration(false);
                    }}
                    className={`w-7 h-7 rounded-lg font-bold text-xs border transition-colors cursor-pointer ${
                      durationNights === n && !isCustomDuration
                        ? 'bg-[#C91F28] text-white border-[#C91F28]'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={durationNights}
                  onChange={(e) => {
                    const val = Math.max(0, parseInt(e.target.value || '0', 10));
                    setDurationNights(val);
                    setIsCustomDuration(true);
                  }}
                  placeholder="Custom"
                  className="w-16 h-7 px-2 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-[#C91F28]"
                  title="Custom nights"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dates & Count */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Travel Start Date *</label>
            <input
              type="date"
              required
              value={travelStartDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:border-transparent focus:outline-none"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Travel End Date *</label>
            <input
              type="date"
              required
              value={travelEndDate}
              onChange={(e) => setTravelEndDate(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:border-transparent focus:outline-none"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Number of Travellers *</label>
            <input
              type="number"
              min="1"
              max="500"
              required
              value={travellers}
              onChange={(e) => handleTravellerCountChange(Number(e.target.value))}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:border-transparent focus:outline-none font-bold text-slate-900"
            />
          </div>
        </div>

        {/* Multi-Traveller Details Card with Excel Import */}
        <div className="p-4 bg-slate-50/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#C91F28]" />
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                Passenger Roster ({travellersList.length} {travellersList.length === 1 ? 'Person' : 'People'})
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsPassengerImportOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors cursor-pointer"
                title="Bulk import passengers from Excel (.xlsx) or CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Import Excel / CSV</span>
              </button>

              <button
                type="button"
                onClick={handleAddTravellerRow}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white shadow-2xs transition-colors cursor-pointer"
                title="Add individual passenger"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Person</span>
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {travellersList.map((traveller, index) => (
              <div
                key={index}
                className="p-3 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl shadow-xs space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-950/60 text-[#C91F28] dark:text-red-300 font-bold text-[11px] flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                      Traveller {index + 1} {index === 0 ? '(Primary Contact)' : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {index === 0 ? (
                      <span className="text-[10px] bg-red-50 dark:bg-red-950/40 text-[#C91F28] dark:text-red-300 px-2 py-0.5 rounded-full font-medium">
                        Primary Booker
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRemoveTravellerRow(index)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1"
                        title="Remove passenger"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Full legal name"
                      value={traveller.name}
                      onChange={(e) => updateTravellerField(index, 'name', e.target.value)}
                      className="mt-0.5 w-full p-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-850 dark:bg-slate-900 dark:text-slate-100 rounded-lg text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Age</label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      placeholder="Age"
                      value={traveller.age ?? ''}
                      onChange={(e) => updateTravellerField(index, 'age', e.target.value)}
                      className="mt-0.5 w-full p-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-850 dark:bg-slate-900 dark:text-slate-100 rounded-lg text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Gender</label>
                    <select
                      value={traveller.gender || 'MALE'}
                      onChange={(e) => updateTravellerField(index, 'gender', e.target.value)}
                      className="mt-0.5 w-full p-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-850 dark:bg-slate-900 dark:text-slate-100 rounded-lg text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Contact Number</label>
                    <input
                      type="tel"
                      placeholder="Mobile number"
                      value={traveller.phone || ''}
                      onChange={(e) => updateTravellerField(index, 'phone', e.target.value)}
                      className="mt-0.5 w-full p-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-850 dark:bg-slate-900 dark:text-slate-100 rounded-lg text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Email Address</label>
                    <input
                      type="email"
                      placeholder="Email address"
                      value={traveller.email || ''}
                      onChange={(e) => updateTravellerField(index, 'email', e.target.value)}
                      className="mt-0.5 w-full p-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-850 dark:bg-slate-900 dark:text-slate-100 rounded-lg text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">ID / Passport / Aadhaar Number</label>
                    <input
                      type="text"
                      placeholder="Govt ID or Passport"
                      value={traveller.idNumber || ''}
                      onChange={(e) => updateTravellerField(index, 'idNumber', e.target.value)}
                      className="mt-0.5 w-full p-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-850 dark:bg-slate-900 dark:text-slate-100 rounded-lg text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Address / City</label>
                    <input
                      type="text"
                      placeholder="City, State"
                      value={traveller.address || ''}
                      onChange={(e) => updateTravellerField(index, 'address', e.target.value)}
                      className="mt-0.5 w-full p-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-850 dark:bg-slate-900 dark:text-slate-100 rounded-lg text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Calculation Card */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Total Booking Price (₹) *</label>
              <input
                type="number"
                min="0"
                required
                value={totalAmount}
                onChange={(e) => setTotalAmount(Number(e.target.value))}
                className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none font-bold"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Discount Given (₹)</label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Final Booking Amount:</span>
            <span className="font-extrabold text-[#C91F28] text-base">
              ₹{finalAmount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* B2B Agent connection */}
        {!initialData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-850 dark:bg-slate-900/40">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">B2B Agent Partner (Optional)</label>
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
              >
                <option value="">-- Direct Customer (No Agent) --</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.companyName} ({a.contactPerson})
                  </option>
                ))}
              </select>
            </div>
            {agentId && (
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Commission Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(Number(e.target.value))}
                  placeholder="e.g. 10%"
                  className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
                />
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Booking Status</label>
            <select
              value={bookingStatus}
              onChange={(e) => setBookingStatus(e.target.value as any)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
            >
              <option value="CONFIRMED">Confirmed</option>
              <option value="HOLD">Hold</option>
              <option value="ENQUIRY">Enquiry</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Assigned Sales Executive</label>
            <select
              value={assignedUserId}
              onChange={(e) => setAssignedUserId(e.target.value)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
            >
              <option value="">-- Unassigned --</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Linked B2B Service Providers Section */}
        <div className="p-3.5 bg-slate-50/80 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#C91F28]" />
              <label className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                Linked B2B Service Providers ({selectedProviders.length})
              </label>
            </div>
            <button
              type="button"
              onClick={() => setIsProviderModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#C91F28] hover:bg-[#a81920] text-white shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Link Provider</span>
            </button>
          </div>

          {selectedProviders.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic">
              No service providers linked yet. Click "+ Link Provider" to attach hotels, cabs, buses, guides, or activities.
            </p>
          ) : (
            <div className="space-y-2.5">
              {selectedProviders.map((p, idx) => (
                <div
                  key={p.supplierId || idx}
                  className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xs space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {p.supplierName}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        {p.category}
                      </span>
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                          p.tier === 'Diamond'
                            ? 'bg-cyan-50 text-cyan-700 border-cyan-300'
                            : p.tier === 'Gold'
                            ? 'bg-amber-50 text-amber-700 border-amber-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        {p.tier === 'Diamond' && <Sparkles className="w-2.5 h-2.5 text-cyan-600" />}
                        {p.tier === 'Gold' && <Award className="w-2.5 h-2.5 text-amber-600" />}
                        {p.tier}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveProvider(p.supplierId)}
                      className="text-slate-400 hover:text-red-600 transition-colors p-1"
                      title="Remove provider"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <label className="text-slate-500 font-medium block">Agreed Cost / Rate (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={p.rate || ''}
                        onChange={(e) => updateProviderField(idx, 'rate', Number(e.target.value))}
                        placeholder="0"
                        className="mt-0.5 w-full p-1.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-900 rounded-lg text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium block">Confirmation / Specs / Notes</label>
                      <input
                        type="text"
                        value={p.notes || ''}
                        onChange={(e) => updateProviderField(idx, 'notes', e.target.value)}
                        placeholder="Confirmation code, vehicle number, room type..."
                        className="mt-0.5 w-full p-1.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-900 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="font-semibold text-slate-700 dark:text-slate-300">Internal Booking Notes</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special meal instructions, hotel confirmation codes, chauffeur details..."
            className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 font-semibold text-white bg-[#C91F28] hover:bg-[#a81920] rounded-xl shadow-sm disabled:opacity-50 transition-all"
          >
            {isSubmitting ? 'Saving...' : initialData ? 'Update Booking' : 'Create Confirmed Booking'}
          </button>
        </div>
      </form>

      {/* Service Provider Selection Modal */}
      {isProviderModalOpen && (
        <ServiceProviderSelectModal
          isOpen={isProviderModalOpen}
          onClose={() => setIsProviderModalOpen(false)}
          onSelect={handleAddProvider}
        />
      )}

      {/* Passenger Excel / CSV Import Modal */}
      {isPassengerImportOpen && (
        <PassengerImportModal
          isOpen={isPassengerImportOpen}
          onClose={() => setIsPassengerImportOpen(false)}
          onImport={handleImportedPassengers}
        />
      )}
    </Modal>
  );
};
