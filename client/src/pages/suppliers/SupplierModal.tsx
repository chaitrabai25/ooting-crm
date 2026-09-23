import React, { useState, useEffect } from 'react';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  User,
  Globe,
  Hotel,
  Bus,
  Car,
  Plane,
  Compass,
  Ticket,
  Utensils,
  GlassWater,
  Sparkles,
  Shield,
  Layers,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal.js';
import { StateDistrictSelect } from '../../components/ui/StateDistrictSelect.js';
import { api } from '../../api/client.js';
import { Supplier, SupplierType } from '../../types/index.js';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier?: Supplier | null;
}

export const SERVICE_CATEGORIES = [
  { id: 'Hotel', label: 'Hotels & Resorts', icon: Hotel, color: 'text-blue-600' },
  { id: 'Bus', label: 'Bus & Tempo Fleet', icon: Bus, color: 'text-purple-600' },
  { id: 'Cab', label: 'Cab & Taxi Vendor', icon: Car, color: 'text-amber-600' },
  { id: 'Flight', label: 'Flight & Airline Booking', icon: Plane, color: 'text-sky-600' },
  { id: 'Guide', label: 'Tour Guide / Escort', icon: Compass, color: 'text-teal-600' },
  { id: 'Adventure Activity', label: 'Adventure Activities', icon: Sparkles, color: 'text-emerald-600' },
  { id: 'Entry Ticket', label: 'Entry Tickets & Passes', icon: Ticket, color: 'text-rose-600' },
  { id: 'Food/Restaurant', label: 'Food & Restaurants', icon: Utensils, color: 'text-orange-600' },
  { id: 'Club', label: 'Clubs & Nightlife', icon: GlassWater, color: 'text-indigo-600' },
  { id: 'Other Travel Service', label: 'Other Travel Services', icon: Layers, color: 'text-slate-600' },
];

export const BUS_TYPES = [
  'Mini Bus',
  'Small Bus',
  'Medium Bus',
  'Large Bus',
  'Urban/City Bus',
  'TT/Tempo Traveller',
  'Small TT',
  'Other',
];

export const CAB_TYPES = [
  'SEDAN',
  'SUV',
  'INNOVA',
  'TEMPO_TRAVELLER',
  'HATCHBACK',
  'LUXURY',
];

export const SupplierModal: React.FC<SupplierModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  supplier,
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'address' | 'categories' | 'details' | 'financial'>('basic');
  const [staffUsers, setStaffUsers] = useState<{ id: string; name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    supplierType: 'HOTEL' as SupplierType | string,
    contactPerson: '',
    phone: '',
    whatsapp: '',
    alternateContact: '',
    email: '',
    website: '',
    address: '',
    city: '',
    district: '',
    state: 'Karnataka',
    country: 'India',
    pincode: '',
    gstNumber: '',
    panNumber: '',
    tier: 'Silver' as 'Diamond' | 'Gold' | 'Silver',
    status: 'ACTIVE',
    assignedToId: '',
    serviceCategories: ['Hotel'] as string[],
    notes: '',
    // Financials
    paymentTerms: 'NET_30',
    creditLimit: 0,
    commissionDetails: '',
    bankDetails: '',
    contractDetails: '',
  });

  // Specific service category details state
  const [categoryDetails, setCategoryDetails] = useState<any>({
    hotel: {
      hotelName: '',
      starCategory: '3_STAR',
      location: '',
      contact: '',
      phone: '',
      whatsapp: '',
      email: '',
      roomTypes: 'Deluxe, Super Deluxe, Suite',
      numberOfRooms: 20,
      mealPlan: 'CP (Breakfast)',
      checkInTime: '12:00 PM',
      checkOutTime: '11:00 AM',
      facilities: 'Free Wi-Fi, Swimming Pool, Parking, Room Service',
      contractRate: '',
      cancellationTerms: 'Free cancellation up to 48 hours prior',
      commission: '10%',
      notes: '',
    },
    bus: {
      vehicleType: 'TT/Tempo Traveller',
      capacity: 12,
      acType: 'AC',
      vehicleNumber: '',
      driverName: '',
      driverPhone: '',
      pickupArea: '',
      operatingStates: 'Karnataka, Kerala, Tamil Nadu',
      operatingDistricts: 'Bengaluru, Mysuru, Kodagu, Ooty',
      contractRate: '',
      notes: '',
    },
    cab: {
      vehicleType: 'SEDAN',
      seatingCapacity: 4,
      acType: 'AC',
      vehicleNumber: '',
      driverName: '',
      driverPhone: '',
      pickupArea: '',
      operatingArea: 'South India',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      rate: '',
      notes: '',
    },
    guide: {
      guideCompanyName: '',
      guideName: '',
      phone: '',
      whatsapp: '',
      email: '',
      languages: 'English, Hindi, Kannada, Tamil',
      specialization: 'Historical & Heritage Tours',
      destinationsCovered: 'Ooty, Coonoor, Mysore, Hampi',
      availability: 'FULL_TIME',
      rate: '1500 / Day',
      notes: '',
    },
    adventure: {
      activityName: '',
      provider: '',
      location: '',
      state: 'Karnataka',
      district: 'Kodagu (Coorg)',
      contactPerson: '',
      phone: '',
      whatsapp: '',
      email: '',
      activityType: 'Trekking & River Rafting',
      ageRestrictions: 'Above 10 years',
      duration: '3 Hours',
      capacity: 25,
      rate: '',
      b2bRate: '',
      availability: 'Daily',
      cancellationTerms: 'Non-refundable if cancelled within 24h',
      notes: '',
    },
    entryTicket: {
      attraction: '',
      provider: '',
      contactPerson: '',
      phone: '',
      whatsapp: '',
      email: '',
      state: 'Tamil Nadu',
      district: 'Nilgiris (Ooty)',
      ticketType: 'Adult / Child Combo',
      adultRate: '',
      childRate: '',
      b2bRate: '',
      validity: 'Same day only',
      cancellationTerms: '',
      notes: '',
    },
    food: {
      restaurantName: '',
      contactPerson: '',
      phone: '',
      whatsapp: '',
      email: '',
      location: '',
      state: 'Karnataka',
      district: 'Mysuru (Mysore)',
      cuisine: 'South Indian & Multi-Cuisine',
      mealType: 'Lunch & Dinner Buffet',
      vegType: 'Both Veg & Non-Veg',
      groupCapacity: 80,
      mealPackage: 'Standard Thali & Buffet',
      b2bRate: '',
      availability: '11:00 AM - 11:00 PM',
      notes: '',
    },
    club: {
      clubName: '',
      location: '',
      contactPerson: '',
      phone: '',
      whatsapp: '',
      email: '',
      state: 'Goa',
      district: 'North Goa (Panaji / Calangute)',
      clubType: 'Beach Lounge & Nightclub',
      entryTicket: 'Couple Entry with Cover',
      capacity: 200,
      timings: '07:00 PM - 03:00 AM',
      b2bRate: '',
      terms: 'Smart casual dress code required',
      notes: '',
    },
  });

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await api.get('/users/staff');
        setStaffUsers(res.data || []);
      } catch (err) {
        console.error('Failed to load staff list:', err);
      }
    };
    if (isOpen) {
      fetchStaff();
    }
  }, [isOpen]);

  useEffect(() => {
    if (supplier) {
      let parsedCategories: string[] = ['Hotel'];
      if (supplier.serviceCategories) {
        try {
          parsedCategories = typeof supplier.serviceCategories === 'string'
            ? JSON.parse(supplier.serviceCategories)
            : supplier.serviceCategories;
        } catch {
          parsedCategories = [supplier.supplierType || 'Hotel'];
        }
      }

      let parsedDetails = categoryDetails;
      if (supplier.categoryDetails) {
        try {
          const detailObj = typeof supplier.categoryDetails === 'string'
            ? JSON.parse(supplier.categoryDetails)
            : supplier.categoryDetails;
          parsedDetails = { ...categoryDetails, ...detailObj };
        } catch (e) {
          console.error('Failed to parse supplier categoryDetails:', e);
        }
      }

      setFormData({
        name: supplier.name || '',
        supplierType: supplier.supplierType || 'HOTEL',
        contactPerson: supplier.contactPerson || '',
        phone: supplier.phone || '',
        whatsapp: supplier.whatsapp || '',
        alternateContact: supplier.alternateContact || '',
        email: supplier.email || '',
        website: supplier.website || '',
        address: supplier.address || '',
        city: supplier.city || '',
        district: (supplier as any).district || '',
        state: supplier.state || 'Karnataka',
        country: supplier.country || 'India',
        pincode: (supplier as any).pincode || '',
        gstNumber: supplier.gstNumber || '',
        panNumber: (supplier as any).panNumber || '',
        tier: ((supplier as any).tier as 'Diamond' | 'Gold' | 'Silver') || 'Silver',
        status: supplier.status || 'ACTIVE',
        assignedToId: supplier.assignedToId || '',
        serviceCategories: parsedCategories,
        notes: supplier.notes || '',
        paymentTerms: supplier.paymentTerms || 'NET_30',
        creditLimit: supplier.creditLimit || 0,
        commissionDetails: supplier.commissionDetails || '',
        bankDetails: supplier.bankDetails || '',
        contractDetails: supplier.contractDetails || '',
      });

      setCategoryDetails(parsedDetails);
    } else {
      // New supplier reset
      setFormData({
        name: '',
        supplierType: 'HOTEL',
        contactPerson: '',
        phone: '',
        whatsapp: '',
        alternateContact: '',
        email: '',
        website: '',
        address: '',
        city: '',
        district: '',
        state: 'Karnataka',
        country: 'India',
        pincode: '',
        gstNumber: '',
        panNumber: '',
        tier: 'Silver',
        status: 'ACTIVE',
        assignedToId: '',
        serviceCategories: ['Hotel'],
        notes: '',
        paymentTerms: 'NET_30',
        creditLimit: 0,
        commissionDetails: '',
        bankDetails: '',
        contractDetails: '',
      });
    }
  }, [supplier, isOpen]);

  const toggleCategory = (catId: string) => {
    setFormData((prev) => {
      const exists = prev.serviceCategories.includes(catId);
      const updated = exists
        ? prev.serviceCategories.filter((c) => c !== catId)
        : [...prev.serviceCategories, catId];
      return {
        ...prev,
        serviceCategories: updated.length > 0 ? updated : ['Other Travel Service'],
      };
    });
  };

  const handleDetailChange = (categoryKey: string, field: string, value: any) => {
    setCategoryDetails((prev: any) => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.name.trim()) {
      setErrorMessage('Provider / Company Name is required.');
      setActiveTab('basic');
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMessage('Valid Contact Phone is required.');
      setActiveTab('basic');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        supplierType: formData.supplierType,
        contactPerson: formData.contactPerson.trim() || null,
        phone: formData.phone.trim(),
        whatsapp: formData.whatsapp.trim() || null,
        alternateContact: formData.alternateContact.trim() || null,
        email: formData.email.trim() || null,
        website: formData.website.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        district: formData.district.trim() || null,
        state: formData.state.trim() || null,
        country: formData.country.trim() || 'India',
        pincode: formData.pincode.trim() || null,
        gstNumber: formData.gstNumber.trim() || null,
        panNumber: formData.panNumber.trim() || null,
        tier: formData.tier,
        status: formData.status,
        assignedToId: formData.assignedToId || null,
        serviceCategories: formData.serviceCategories,
        categoryDetails: categoryDetails,
        paymentTerms: formData.paymentTerms,
        creditLimit: Number(formData.creditLimit) || 0,
        commissionDetails: formData.commissionDetails.trim() || null,
        bankDetails: formData.bankDetails.trim() || null,
        contractDetails: formData.contractDetails.trim() || null,
        notes: formData.notes.trim() || null,
      };

      if (supplier?.id) {
        await api.put(`/suppliers/${supplier.id}`, payload);
      } else {
        await api.post('/suppliers', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to save B2B Service Provider.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={supplier ? 'Edit B2B Service Provider' : 'Add B2B Service Provider'}
      subtitle="Register partner companies, vehicle fleets, hoteliers, guides & services"
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-red-50 text-[#C91F28] border border-red-200 rounded-xl text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        {/* Tab Headers */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold gap-1 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'basic'
                ? 'bg-red-50 text-[#C91F28] dark:bg-brand-950/50 dark:text-brand-300 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            1. Basic & Contacts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('address')}
            className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'address'
                ? 'bg-red-50 text-[#C91F28] dark:bg-brand-950/50 dark:text-brand-300 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            2. State, District & Tax
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'categories'
                ? 'bg-red-50 text-[#C91F28] dark:bg-brand-950/50 dark:text-brand-300 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            3. Service Categories ({formData.serviceCategories.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'details'
                ? 'bg-red-50 text-[#C91F28] dark:bg-brand-950/50 dark:text-brand-300 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            4. Service Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('financial')}
            className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'financial'
                ? 'bg-red-50 text-[#C91F28] dark:bg-brand-950/50 dark:text-brand-300 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            5. Terms & Banking
          </button>
        </div>

        {/* Tab 1: Basic & Contacts */}
        {activeTab === 'basic' && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Company / Provider Name <span className="text-[#C91F28]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Royal Ooty Resorts / Sharma Tour Cabs"
                  className="w-full px-3 py-2 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="e.g. Anand Kumar (Manager)"
                  className="w-full px-3 py-2 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Primary Phone <span className="text-[#C91F28]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98450 12345"
                  className="w-full px-3 py-2 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  WhatsApp Number
                </label>
                <input
                  type="text"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="+91 98450 12345"
                  className="w-full px-3 py-2 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Alternate Phone
                </label>
                <input
                  type="text"
                  value={formData.alternateContact}
                  onChange={(e) => setFormData({ ...formData, alternateContact: e.target.value })}
                  placeholder="Office landline or secondary mobile"
                  className="w-full px-3 py-2 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="bookings@partner.com"
                  className="w-full px-3 py-2 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Website URL
                </label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://partner-hotels.com"
                  className="w-full px-3 py-2 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              {/* Provider Tier (Diamond, Gold, Silver — exactly these 3) */}
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Provider Tier <span className="text-[#C91F28]">*</span>
                </label>
                <select
                  value={formData.tier}
                  onChange={(e) => setFormData({ ...formData, tier: e.target.value as any })}
                  className="w-full px-3 py-2 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                >
                  <option value="Diamond">💎 Diamond (Top Tier Partner)</option>
                  <option value="Gold">🥇 Gold (Preferred Partner)</option>
                  <option value="Silver">🥈 Silver (Standard Partner)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Operating Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                >
                  <option value="ACTIVE">Active Partner</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Assigned Staff In-Charge
                </label>
                <select
                  value={formData.assignedToId}
                  onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                  className="w-full px-3 py-2 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                >
                  <option value="">Unassigned</option>
                  {staffUsers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: State, District & Tax */}
        {activeTab === 'address' && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 text-xs">
            {/* Smart State + District Search Component */}
            <StateDistrictSelect
              state={formData.state}
              district={formData.district}
              onStateChange={(st) => setFormData((prev) => ({ ...prev, state: st }))}
              onDistrictChange={(dt) => setFormData((prev) => ({ ...prev, district: dt }))}
              required={true}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  City / Town
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g. Ooty, Madikeri, Mysore"
                  className="w-full px-3 py-2 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  PIN / ZIP Code
                </label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  placeholder="e.g. 643001"
                  className="w-full px-3 py-2 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Country
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-3 py-2 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Full Physical Address / Head Office
              </label>
              <textarea
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Door No, Street name, Landmark..."
                className="w-full px-3 py-2 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  GST Number (if applicable)
                </label>
                <input
                  type="text"
                  value={formData.gstNumber}
                  onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
                  placeholder="29AAAAA0000A1Z5"
                  className="w-full px-3 py-2 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  PAN Number
                </label>
                <input
                  type="text"
                  value={formData.panNumber}
                  onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                  placeholder="ABCDE1234F"
                  className="w-full px-3 py-2 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Service Categories Selection */}
        {activeTab === 'categories' && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 text-xs">
            <p className="text-slate-500 dark:text-slate-400">
              Select all travel services supplied by this provider. Details for selected services will be configurable in the next tab.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SERVICE_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = formData.serviceCategories.includes(cat.id);

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'bg-red-50/70 dark:bg-brand-950/40 border-[#C91F28] dark:border-brand-600 shadow-sm ring-1 ring-[#C91F28]/30'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className={`p-2 rounded-xl bg-white dark:bg-slate-800 shadow-xs flex-shrink-0 ${cat.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {cat.label}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        {isSelected ? '✓ Configured & Active' : 'Click to enable'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 4: Category Specific Details */}
        {activeTab === 'details' && (
          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1 text-xs">
            {formData.serviceCategories.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                Please enable at least one Service Category in Tab 3.
              </div>
            )}

            {/* Hotel Details */}
            {formData.serviceCategories.includes('Hotel') && (
              <div className="p-4 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 space-y-3">
                <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-300">
                  <Hotel className="w-4 h-4 text-blue-600" />
                  <span>Hotel / Resort Specific Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Hotel Name</label>
                    <input
                      type="text"
                      value={categoryDetails.hotel.hotelName}
                      onChange={(e) => handleDetailChange('hotel', 'hotelName', e.target.value)}
                      placeholder="e.g. Hill Crest Resort"
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Star Category</label>
                    <select
                      value={categoryDetails.hotel.starCategory}
                      onChange={(e) => handleDetailChange('hotel', 'starCategory', e.target.value)}
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                    >
                      <option value="5_STAR">5 Star Luxury</option>
                      <option value="4_STAR">4 Star Premium</option>
                      <option value="3_STAR">3 Star Standard</option>
                      <option value="HERITAGE">Heritage / Villa</option>
                      <option value="HOMESTAY">Homestay / Cottage</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Meal Plan</label>
                    <input
                      type="text"
                      value={categoryDetails.hotel.mealPlan}
                      onChange={(e) => handleDetailChange('hotel', 'mealPlan', e.target.value)}
                      placeholder="e.g. CP (Breakfast) / MAP"
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Room Types</label>
                    <input
                      type="text"
                      value={categoryDetails.hotel.roomTypes}
                      onChange={(e) => handleDetailChange('hotel', 'roomTypes', e.target.value)}
                      placeholder="Deluxe, Suite, Cottage"
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Total Rooms</label>
                    <input
                      type="number"
                      value={categoryDetails.hotel.numberOfRooms}
                      onChange={(e) => handleDetailChange('hotel', 'numberOfRooms', Number(e.target.value))}
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">B2B / Contract Rate</label>
                    <input
                      type="text"
                      value={categoryDetails.hotel.contractRate}
                      onChange={(e) => handleDetailChange('hotel', 'contractRate', e.target.value)}
                      placeholder="₹2,500 / night"
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Check-in / Check-out</label>
                    <input
                      type="text"
                      value={`${categoryDetails.hotel.checkInTime} / ${categoryDetails.hotel.checkOutTime}`}
                      onChange={(e) => {
                        const parts = e.target.value.split('/');
                        handleDetailChange('hotel', 'checkInTime', parts[0]?.trim() || '12:00 PM');
                        handleDetailChange('hotel', 'checkOutTime', parts[1]?.trim() || '11:00 AM');
                      }}
                      placeholder="12:00 PM / 11:00 AM"
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Cancellation Terms</label>
                    <input
                      type="text"
                      value={categoryDetails.hotel.cancellationTerms}
                      onChange={(e) => handleDetailChange('hotel', 'cancellationTerms', e.target.value)}
                      placeholder="Free cancellation up to 48 hours"
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bus Details */}
            {formData.serviceCategories.includes('Bus') && (
              <div className="p-4 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 space-y-3">
                <div className="flex items-center gap-2 font-bold text-purple-900 dark:text-purple-300">
                  <Bus className="w-4 h-4 text-purple-600" />
                  <span>Bus & Coach Specific Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Bus Vehicle Size / Type</label>
                    <select
                      value={categoryDetails.bus.vehicleType}
                      onChange={(e) => handleDetailChange('bus', 'vehicleType', e.target.value)}
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                    >
                      {BUS_TYPES.map((bt) => (
                        <option key={bt} value={bt}>{bt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Seating Capacity</label>
                    <input
                      type="number"
                      value={categoryDetails.bus.capacity}
                      onChange={(e) => handleDetailChange('bus', 'capacity', Number(e.target.value))}
                      placeholder="12, 21, 33, 49"
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">AC / Non-AC</label>
                    <select
                      value={categoryDetails.bus.acType}
                      onChange={(e) => handleDetailChange('bus', 'acType', e.target.value)}
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    >
                      <option value="AC">AC Coach</option>
                      <option value="NON_AC">Non-AC Coach</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Vehicle Number</label>
                    <input
                      type="text"
                      value={categoryDetails.bus.vehicleNumber}
                      onChange={(e) => handleDetailChange('bus', 'vehicleNumber', e.target.value.toUpperCase())}
                      placeholder="KA-01-AB-1234"
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl uppercase font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Driver Name</label>
                    <input
                      type="text"
                      value={categoryDetails.bus.driverName}
                      onChange={(e) => handleDetailChange('bus', 'driverName', e.target.value)}
                      placeholder="Driver name"
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Driver Phone</label>
                    <input
                      type="text"
                      value={categoryDetails.bus.driverPhone}
                      onChange={(e) => handleDetailChange('bus', 'driverPhone', e.target.value)}
                      placeholder="+91 98450 12345"
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Operating States & Districts</label>
                    <input
                      type="text"
                      value={categoryDetails.bus.operatingStates}
                      onChange={(e) => handleDetailChange('bus', 'operatingStates', e.target.value)}
                      placeholder="Karnataka, Kerala, Tamil Nadu"
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Contract / Day Rate</label>
                    <input
                      type="text"
                      value={categoryDetails.bus.contractRate}
                      onChange={(e) => handleDetailChange('bus', 'contractRate', e.target.value)}
                      placeholder="₹6,500 / day or ₹28 / km"
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Cab Details (Reusing Cab Booking vehicle types) */}
            {formData.serviceCategories.includes('Cab') && (
              <div className="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 space-y-3">
                <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300">
                  <Car className="w-4 h-4 text-amber-600" />
                  <span>Cab & Taxi Fleet Details (Reuses CRM Cab Specs)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Vehicle Type / Size</label>
                    <select
                      value={categoryDetails.cab.vehicleType}
                      onChange={(e) => handleDetailChange('cab', 'vehicleType', e.target.value)}
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                    >
                      {CAB_TYPES.map((ct) => (
                        <option key={ct} value={ct}>{ct}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Capacity (Seats)</label>
                    <input
                      type="number"
                      value={categoryDetails.cab.seatingCapacity}
                      onChange={(e) => handleDetailChange('cab', 'seatingCapacity', Number(e.target.value))}
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">AC Option</label>
                    <select
                      value={categoryDetails.cab.acType}
                      onChange={(e) => handleDetailChange('cab', 'acType', e.target.value)}
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    >
                      <option value="AC">AC Cab</option>
                      <option value="NON_AC">Non-AC</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Default Vehicle Number</label>
                    <input
                      type="text"
                      value={categoryDetails.cab.vehicleNumber}
                      onChange={(e) => handleDetailChange('cab', 'vehicleNumber', e.target.value.toUpperCase())}
                      placeholder="KA-05-MM-5566"
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl uppercase font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Driver Name</label>
                    <input
                      type="text"
                      value={categoryDetails.cab.driverName}
                      onChange={(e) => handleDetailChange('cab', 'driverName', e.target.value)}
                      placeholder="e.g. Suresh Gowda"
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Driver Phone</label>
                    <input
                      type="text"
                      value={categoryDetails.cab.driverPhone}
                      onChange={(e) => handleDetailChange('cab', 'driverPhone', e.target.value)}
                      placeholder="+91 98450 11223"
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Operating Area / Hub</label>
                    <input
                      type="text"
                      value={categoryDetails.cab.operatingArea}
                      onChange={(e) => handleDetailChange('cab', 'operatingArea', e.target.value)}
                      placeholder="Airport transfers, Outstation tours..."
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Standard Rate / Package</label>
                    <input
                      type="text"
                      value={categoryDetails.cab.rate}
                      onChange={(e) => handleDetailChange('cab', 'rate', e.target.value)}
                      placeholder="₹16 / km or ₹3,200 / day"
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Guide Details */}
            {formData.serviceCategories.includes('Guide') && (
              <div className="p-4 rounded-2xl bg-teal-50/40 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900 space-y-3">
                <div className="flex items-center gap-2 font-bold text-teal-900 dark:text-teal-300">
                  <Compass className="w-4 h-4 text-teal-600" />
                  <span>Tour Guide & Escort Details</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Guide Name</label>
                    <input
                      type="text"
                      value={categoryDetails.guide.guideName}
                      onChange={(e) => handleDetailChange('guide', 'guideName', e.target.value)}
                      placeholder="Full name of guide"
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Languages Spoken</label>
                    <input
                      type="text"
                      value={categoryDetails.guide.languages}
                      onChange={(e) => handleDetailChange('guide', 'languages', e.target.value)}
                      placeholder="English, Hindi, Kannada..."
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Daily Rate</label>
                    <input
                      type="text"
                      value={categoryDetails.guide.rate}
                      onChange={(e) => handleDetailChange('guide', 'rate', e.target.value)}
                      placeholder="₹1,500 / day"
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Adventure Activity Details */}
            {formData.serviceCategories.includes('Adventure Activity') && (
              <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 space-y-3">
                <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-300">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Adventure Activity Provider Details</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Activity Name</label>
                    <input
                      type="text"
                      value={categoryDetails.adventure.activityName}
                      onChange={(e) => handleDetailChange('adventure', 'activityName', e.target.value)}
                      placeholder="Rafting / Zipline / Trekking"
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Duration</label>
                    <input
                      type="text"
                      value={categoryDetails.adventure.duration}
                      onChange={(e) => handleDetailChange('adventure', 'duration', e.target.value)}
                      placeholder="2 Hours"
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">B2B Rate (Per Person)</label>
                    <input
                      type="text"
                      value={categoryDetails.adventure.b2bRate}
                      onChange={(e) => handleDetailChange('adventure', 'b2bRate', e.target.value)}
                      placeholder="₹850 / person"
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Entry Ticket Details */}
            {formData.serviceCategories.includes('Entry Ticket') && (
              <div className="p-4 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 space-y-3">
                <div className="flex items-center gap-2 font-bold text-rose-900 dark:text-rose-300">
                  <Ticket className="w-4 h-4 text-rose-600" />
                  <span>Entry Ticket & Attraction Details</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Attraction / Monument</label>
                    <input
                      type="text"
                      value={categoryDetails.entryTicket.attraction}
                      onChange={(e) => handleDetailChange('entryTicket', 'attraction', e.target.value)}
                      placeholder="Botanical Garden / Palace"
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Adult B2B Rate</label>
                    <input
                      type="text"
                      value={categoryDetails.entryTicket.adultRate}
                      onChange={(e) => handleDetailChange('entryTicket', 'adultRate', e.target.value)}
                      placeholder="₹120"
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Child B2B Rate</label>
                    <input
                      type="text"
                      value={categoryDetails.entryTicket.childRate}
                      onChange={(e) => handleDetailChange('entryTicket', 'childRate', e.target.value)}
                      placeholder="₹60"
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Food Details */}
            {formData.serviceCategories.includes('Food/Restaurant') && (
              <div className="p-4 rounded-2xl bg-orange-50/40 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 space-y-3">
                <div className="flex items-center gap-2 font-bold text-orange-900 dark:text-orange-300">
                  <Utensils className="w-4 h-4 text-orange-600" />
                  <span>Restaurant & Meal Details</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Cuisine</label>
                    <input
                      type="text"
                      value={categoryDetails.food.cuisine}
                      onChange={(e) => handleDetailChange('food', 'cuisine', e.target.value)}
                      placeholder="South Indian / Multi-Cuisine"
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Group Capacity</label>
                    <input
                      type="number"
                      value={categoryDetails.food.groupCapacity}
                      onChange={(e) => handleDetailChange('food', 'groupCapacity', Number(e.target.value))}
                      placeholder="80 seats"
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Buffet Rate / Pax</label>
                    <input
                      type="text"
                      value={categoryDetails.food.b2bRate}
                      onChange={(e) => handleDetailChange('food', 'b2bRate', e.target.value)}
                      placeholder="₹350 / head"
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Club Details */}
            {formData.serviceCategories.includes('Club') && (
              <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900 space-y-3">
                <div className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-300">
                  <GlassWater className="w-4 h-4 text-indigo-600" />
                  <span>Club & Lounge Details</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Club Type</label>
                    <input
                      type="text"
                      value={categoryDetails.club.clubType}
                      onChange={(e) => handleDetailChange('club', 'clubType', e.target.value)}
                      placeholder="Beach Lounge / Rooftop Club"
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Timings</label>
                    <input
                      type="text"
                      value={categoryDetails.club.timings}
                      onChange={(e) => handleDetailChange('club', 'timings', e.target.value)}
                      placeholder="07:00 PM - 03:00 AM"
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">B2B Entry Rate</label>
                    <input
                      type="text"
                      value={categoryDetails.club.b2bRate}
                      onChange={(e) => handleDetailChange('club', 'b2bRate', e.target.value)}
                      placeholder="₹1,500 / couple"
                      className="w-full px-3 py-1.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Terms & Banking */}
        {activeTab === 'financial' && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Payment Terms
                </label>
                <select
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  className="w-full px-3 py-2 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                >
                  <option value="ADVANCE">Full Advance Payment</option>
                  <option value="PARTIAL_ADVANCE">50% Advance & Balance at Check-in</option>
                  <option value="NET_15">Net 15 Days</option>
                  <option value="NET_30">Net 30 Days (Credit Cycle)</option>
                  <option value="ON_DELIVERY">Post Service Settlement</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Credit Limit (INR ₹)
                </label>
                <input
                  type="number"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                  placeholder="0"
                  className="w-full px-3 py-2 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Commission & B2B Margin Details
              </label>
              <textarea
                rows={2}
                value={formData.commissionDetails}
                onChange={(e) => setFormData({ ...formData, commissionDetails: e.target.value })}
                placeholder="e.g. 10% on direct rooms, ₹300 per outstation trip..."
                className="w-full px-3 py-2 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Bank & UPI Settlement Details
              </label>
              <textarea
                rows={2}
                value={formData.bankDetails}
                onChange={(e) => setFormData({ ...formData, bankDetails: e.target.value })}
                placeholder="Account Name, Bank, Account No, IFSC Code, UPI ID..."
                className="w-full px-3 py-2 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Internal Operational Notes
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Key escalation contacts, VIP driver notes..."
                className="w-full px-3 py-2 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Tier: <strong className="text-slate-800 dark:text-slate-200">{formData.tier}</strong> | Categories: <strong className="text-slate-800 dark:text-slate-200">{formData.serviceCategories.length}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-[#C91F28] hover:bg-[#A8171F] rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : supplier ? 'Update Provider' : 'Create Provider'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default SupplierModal;
