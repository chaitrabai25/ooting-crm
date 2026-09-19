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
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Modal } from '../../components/ui/Modal.js';
import { Booking, Traveller, Supplier } from '../../types/index.js';
import { ServiceProviderSelectModal } from './ServiceProviderSelectModal.js';

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
      setError(err.response?.data?.message || 'Failed to save booking.');
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

        {/* Dates & Count */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Travel Start Date *</label>
            <input
              type="date"
              required
              value={travelStartDate}
              onChange={(e) => setTravelStartDate(e.target.value)}
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
              max="50"
              required
              value={travellers}
              onChange={(e) => handleTravellerCountChange(Number(e.target.value))}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-[#C91F28] focus:border-transparent focus:outline-none font-bold text-slate-900"
            />
          </div>
        </div>

        {/* Multi-Traveller Details Card */}
        <div className="p-4 bg-slate-50/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#C91F28]" />
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                Traveller Information ({travellersList.length} {travellersList.length === 1 ? 'Person' : 'People'})
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Fields adapt dynamically based on traveller count
            </span>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
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
                  {index === 0 && (
                    <span className="text-[10px] bg-red-50 dark:bg-red-950/40 text-[#C91F28] dark:text-red-300 px-2 py-0.5 rounded-full font-medium">
                      Primary Booker
                    </span>
                  )}
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
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Phone (Optional)</label>
                    <input
                      type="tel"
                      placeholder="Phone number"
                      value={traveller.phone || ''}
                      onChange={(e) => updateTravellerField(index, 'phone', e.target.value)}
                      className="mt-0.5 w-full p-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-850 dark:bg-slate-900 dark:text-slate-100 rounded-lg text-xs focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Email (Optional)</label>
                    <input
                      type="email"
                      placeholder="Email address"
                      value={traveller.email || ''}
                      onChange={(e) => updateTravellerField(index, 'email', e.target.value)}
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
    </Modal>
  );
};
