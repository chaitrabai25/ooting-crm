import React, { useState, useEffect } from 'react';
import { X, Building2, User, Palette, Shield, Crown, CheckSquare, Square, Calendar, Sparkles, Check } from 'lucide-react';
import { api } from '../../api/client.js';
import { Company } from '../../types/index.js';
import { notifySuccess, notifyError } from '../../utils/sweetalert.js';

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  company: Company | null;
}

export const AVAILABLE_MODULES = [
  { id: 'leads', label: 'Leads & Enquiries', desc: 'Inbound inquiries, follow-up scheduler, conversions' },
  { id: 'quotations', label: 'Quotations & Itineraries', desc: 'Custom proposals, price calculations, and PDF generation' },
  { id: 'bookings', label: 'Tour Bookings & Manifests', desc: 'Passenger bookings, manifests, and vouchers' },
  { id: 'cabs', label: 'Cab Bookings & Duty Slips', desc: 'Vehicle transfers, driver duty slips, and outstation trips' },
  { id: 'guides', label: 'Tour Guides & Field Expenses', desc: 'Guide directory, tour manifests, passenger & package expenses' },
  { id: 'customers', label: 'Customers & UDID Registry', desc: 'Tourists, Group Departure, School Tour, Club & Org members' },
  { id: 'packages', label: 'Travel Packages & Places Master', desc: 'Package itineraries, hotel & sightseeing directories' },
  { id: 'whatsapp', label: 'Bulk WhatsApp Broadcasts', desc: 'Direct messaging and bulk WhatsApp promotions' },
  { id: 'b2b', label: 'B2B Travel Agents & Suppliers', desc: 'Agent commissions and supplier vendor directories' },
  { id: 'payments', label: 'Financials & Expenses', desc: 'Payment tracking, receipts, and general expense ledger' },
  { id: 'reports', label: 'Business Reports & Analytics', desc: 'Revenue analytics, sales graphs, and spreadsheets' },
];

export const CompanyModal: React.FC<CompanyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  company,
}) => {
  const isEdit = !!company;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'branding' | 'plan' | 'admin'>('details');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    tagline: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstin: '',
    status: 'ACTIVE',
    logoUrl: '',
    faviconUrl: '',
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
    maxStaffLimit: 1,
    subscriptionTier: 'STARTER',
    subscriptionExpiresAt: '',
    // Admin fields (only for creation)
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminPhone: '',
  });

  const [selectedModules, setSelectedModules] = useState<string[]>(() => AVAILABLE_MODULES.map((m) => m.id));

  useEffect(() => {
    if (company) {
      // Parse enabledModules if existing
      let initialModules = AVAILABLE_MODULES.map((m) => m.id);
      if ((company as any).enabledModules) {
        try {
          const parsed = JSON.parse((company as any).enabledModules);
          if (Array.isArray(parsed) && parsed.length > 0) initialModules = parsed;
        } catch {
          const split = (company as any).enabledModules.split(',').map((s: string) => s.trim()).filter(Boolean);
          if (split.length > 0) initialModules = split;
        }
      }
      setSelectedModules(initialModules);

      setFormData({
        name: company.name || '',
        slug: company.slug || '',
        tagline: (company as any).tagline || '',
        email: company.email || '',
        phone: company.phone || '',
        website: company.website || '',
        address: company.address || '',
        city: (company as any).city || '',
        state: (company as any).state || '',
        pincode: (company as any).pincode || '',
        gstin: company.gstin || '',
        status: company.status || 'ACTIVE',
        logoUrl: company.logoUrl || '',
        faviconUrl: company.faviconUrl || '',
        primaryColor: company.primaryColor || '#2563eb',
        secondaryColor: company.secondaryColor || '#1e40af',
        maxStaffLimit: (company as any).maxStaffLimit || 1,
        subscriptionTier: company.subscriptionTier || 'STARTER',
        subscriptionExpiresAt: company.subscriptionExpiresAt ? company.subscriptionExpiresAt.split('T')[0] : '',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        adminPhone: '',
      });
      setActiveTab('details');
    } else {
      setSelectedModules(AVAILABLE_MODULES.map((m) => m.id));
      // Default new tenant to 1 year expiration
      const defaultOneYear = new Date();
      defaultOneYear.setFullYear(defaultOneYear.getFullYear() + 1);

      setFormData({
        name: '',
        slug: '',
        tagline: '',
        email: '',
        phone: '',
        website: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        gstin: '',
        status: 'ACTIVE',
        logoUrl: '',
        faviconUrl: '',
        primaryColor: '#2563eb',
        secondaryColor: '#1e40af',
        maxStaffLimit: 1,
        subscriptionTier: 'STARTER',
        subscriptionExpiresAt: defaultOneYear.toISOString().split('T')[0],
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        adminPhone: '',
      });
      setActiveTab('details');
    }
  }, [company, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (!isEdit && name === 'name') {
        const autoSlug = value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        next.slug = autoSlug;
      }
      return next;
    });
  };

  const handleSetDurationPreset = (days: number) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    setFormData((prev) => ({
      ...prev,
      subscriptionExpiresAt: targetDate.toISOString().split('T')[0],
    }));
  };

  const toggleModule = (modId: string) => {
    setSelectedModules((prev) =>
      prev.includes(modId) ? prev.filter((id) => id !== modId) : [...prev, modId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formattedExpiresAt = formData.subscriptionExpiresAt
        ? new Date(formData.subscriptionExpiresAt + 'T23:59:59.999Z').toISOString()
        : null;

      if (isEdit) {
        const payload: Record<string, any> = {
          name: formData.name,
          tagline: formData.tagline || undefined,
          email: formData.email,
          phone: formData.phone,
          website: formData.website || undefined,
          address: formData.address || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          pincode: formData.pincode || undefined,
          gstin: formData.gstin || undefined,
          status: formData.status,
          maxStaffLimit: Number(formData.maxStaffLimit) || 1,
          subscriptionTier: formData.subscriptionTier,
          subscriptionExpiresAt: formattedExpiresAt,
          enabledModules: JSON.stringify(selectedModules),
          logoUrl: formData.logoUrl || undefined,
          faviconUrl: formData.faviconUrl || undefined,
          primaryColor: formData.primaryColor || undefined,
          secondaryColor: formData.secondaryColor || undefined,
        };

        await api.put(`/companies/${company.id}`, payload);
        notifySuccess('Company Updated', `Updated license & settings for ${formData.name}.`);
      } else {
        // Create new company with admin
        if (!formData.adminEmail || !formData.adminPassword || !formData.adminName) {
          notifyError('Missing Admin Details', 'Admin name, email, and password are required to create a new tenant.');
          setActiveTab('admin');
          setIsSubmitting(false);
          return;
        }

        const payload = {
          name: formData.name,
          slug: formData.slug,
          tagline: formData.tagline || undefined,
          email: formData.email,
          phone: formData.phone,
          website: formData.website || undefined,
          address: formData.address || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          pincode: formData.pincode || undefined,
          gstin: formData.gstin || undefined,
          primaryColor: formData.primaryColor || undefined,
          secondaryColor: formData.secondaryColor || undefined,
          maxStaffLimit: Number(formData.maxStaffLimit) || 1,
          subscriptionTier: formData.subscriptionTier,
          subscriptionExpiresAt: formattedExpiresAt,
          enabledModules: JSON.stringify(selectedModules),
          adminName: formData.adminName,
          adminEmail: formData.adminEmail,
          adminPassword: formData.adminPassword,
          adminPhone: formData.adminPhone || undefined,
        };

        await api.post('/companies', payload);
        notifySuccess('Company Created', `Tenant "${formData.name}" and admin account created successfully.`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Company save failed:', err);
      notifyError('Operation Failed', err.response?.data?.message || 'Failed to save company details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {isEdit ? `Edit Company: ${company.name}` : 'Create New Tenant Company'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEdit
                  ? 'Update tenant profile, status, and white-label settings'
                  : 'Provision an isolated multi-tenant organization with its company admin'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-white dark:bg-slate-950/20">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" /> Company Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('plan')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'plan'
                ? 'border-amber-600 text-amber-600 dark:border-amber-500 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Crown className="w-4 h-4 text-amber-500" /> Plan & Feature Access
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('branding')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'branding'
                ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Palette className="w-4 h-4" /> White-Label Branding
          </button>
          {!isEdit && (
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`py-3 px-4 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'admin'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <User className="w-4 h-4" /> Admin Account
            </button>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Mountain Treks Travels"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Slug Identifier <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="slug"
                    required
                    disabled={isEdit}
                    value={formData.slug}
                    onChange={handleChange}
                    placeholder="mountain-treks"
                    className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 font-mono ${
                      isEdit ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''
                    }`}
                  />
                  {!isEdit && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                      Used for company identification & booking reference prefixes.
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Company Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="info@mountaintreks.com"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Company Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 9876543210"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Website URL
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://mountaintreks.com"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    GSTIN Number
                  </label>
                  <input
                    type="text"
                    name="gstin"
                    value={formData.gstin}
                    onChange={handleChange}
                    placeholder="29AAAAA0000A1Z5"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tagline / Motto
                </label>
                <input
                  type="text"
                  name="tagline"
                  value={formData.tagline}
                  onChange={handleChange}
                  placeholder="e.g., Unforgettable Himalayan Journeys"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Registered Address
                </label>
                <textarea
                  name="address"
                  rows={2}
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Office address, street, landmark..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Bangalore"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">State</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="Karnataka"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Pincode</label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    placeholder="560001"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 font-medium"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200/80 dark:border-blue-900/60">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-blue-950 dark:text-blue-300">
                    Staff Seat Quota (Employee Logins) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                    Default: 1 Staff
                  </span>
                </div>
                <input
                  type="number"
                  name="maxStaffLimit"
                  min="1"
                  required
                  value={formData.maxStaffLimit}
                  onChange={handleChange}
                  placeholder="1"
                  disabled={company?.isOoting}
                  className={`w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold ${
                    company?.isOoting ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''
                  }`}
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Controls how many staff accounts and employee logins this organization can create. If set to 1, only 1 employee login will be allowed.
                </p>
                {company?.isOoting && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 block font-medium">
                    Primary Ooting instance has unlimited staff access.
                  </span>
                )}
              </div>

              {isEdit && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tenant Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    disabled={company?.isOoting}
                    className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      company?.isOoting ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''
                    }`}
                  >
                    <option value="ACTIVE">ACTIVE (Full Access)</option>
                    <option value="SUSPENDED">SUSPENDED (Access Blocked)</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                  {company?.isOoting && (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 block font-medium">
                      Primary Ooting instance cannot be deactivated or suspended.
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'branding' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2.5">
                <Palette className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                <span>
                  Configure custom white-label branding. When this tenant logs in, all headers, titles, favicons,
                  and exported PDF documents will use these brand assets.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Logo Image URL
                </label>
                <input
                  type="text"
                  name="logoUrl"
                  value={formData.logoUrl}
                  onChange={handleChange}
                  placeholder="https://example.com/logo.png or /assets/custom-logo.png"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                />
                {formData.logoUrl && (
                  <div className="mt-2.5 p-2 bg-white rounded-xl inline-block border border-slate-200 dark:border-slate-700 shadow-2xs">
                    <img
                      src={formData.logoUrl}
                      alt="Logo Preview"
                      className="h-10 max-w-xs object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Favicon URL
                </label>
                <input
                  type="text"
                  name="faviconUrl"
                  value={formData.faviconUrl}
                  onChange={handleChange}
                  placeholder="https://example.com/favicon.ico"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Brand Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      name="primaryColor"
                      value={formData.primaryColor}
                      onChange={handleChange}
                      className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      name="primaryColor"
                      value={formData.primaryColor}
                      onChange={handleChange}
                      placeholder="#2563eb"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Secondary Brand Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      name="secondaryColor"
                      value={formData.secondaryColor}
                      onChange={handleChange}
                      className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      name="secondaryColor"
                      value={formData.secondaryColor}
                      onChange={handleChange}
                      placeholder="#1e40af"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'plan' && (
            <div className="space-y-5">
              {/* Top Banner Notice */}
              <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
                <Crown className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1">
                  <div className="font-bold text-sm">SaaS Licensing, Staff Limits & Feature Monetization</div>
                  <div className="text-amber-800 dark:text-amber-300">
                    Master Admin controls the staff seat capacity, subscription duration, and sidebar module access.
                    Organizations default to 1 staff seat. When duration expires, login is automatically suspended.
                  </div>
                </div>
              </div>

              {/* 1. Subscription Tier & Expiration Date */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Subscription Tier & Duration
                  </h3>
                  {company?.isOoting && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      Core Platform Tenant
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Subscription Tier
                    </label>
                    <select
                      name="subscriptionTier"
                      value={formData.subscriptionTier}
                      onChange={handleChange}
                      disabled={company?.isOoting}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="STARTER">Starter Tier (Essential)</option>
                      <option value="GROWTH">Growth Tier (Pro Agency)</option>
                      <option value="ENTERPRISE">Enterprise Tier (Full Suite)</option>
                      <option value="CUSTOM">Custom Enterprise</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Expiry Date (YYYY-MM-DD)
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        name="subscriptionExpiresAt"
                        value={formData.subscriptionExpiresAt}
                        onChange={handleChange}
                        disabled={company?.isOoting}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {!company?.isOoting && (
                  <div>
                    <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                      Quick Set Duration Presets:
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleSetDurationPreset(30)}
                        className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 hover:border-blue-300 rounded-lg text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        +1 Month (30d)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetDurationPreset(90)}
                        className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 hover:border-blue-300 rounded-lg text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        +3 Months (90d)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetDurationPreset(180)}
                        className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 hover:border-blue-300 rounded-lg text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        +6 Months (180d)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetDurationPreset(365)}
                        className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 rounded-lg text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
                      >
                        +1 Year (365d)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, subscriptionExpiresAt: '' }))}
                        className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 transition-colors cursor-pointer"
                      >
                        Lifetime (No Expiry)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Staff Seat Quota Enforcement */}
              <div className="p-4 bg-blue-50/60 dark:bg-blue-950/20 rounded-xl border border-blue-200/80 dark:border-blue-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-blue-950 dark:text-blue-300">
                    Staff Seat Quota (Max Staff Logins) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                    Default: 1 Staff Seat
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    name="maxStaffLimit"
                    min="1"
                    required
                    value={formData.maxStaffLimit}
                    onChange={handleChange}
                    placeholder="1"
                    disabled={company?.isOoting}
                    className="w-32 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-base text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Allowed user logins (including Staff, Operations, Accounts, and Tour Guides with login).
                  </div>
                </div>
                <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed pt-1">
                  🛡️ <strong>SaaS Quota Rule:</strong> If set to 1, this organization can only have 1 active employee login.
                  If the organization administrator tries to add more staff or guides beyond this number, the CRM will block them
                  and instruct them to contact Master Admin to upgrade. Only Master Admin can increase this limit to 2, 3, 5, etc.
                </p>
              </div>

              {/* 3. Enabled Sidebar Modules & Feature Access */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-blue-500" /> Enabled Sidebar Modules ({selectedModules.length}/{AVAILABLE_MODULES.length})
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Unchecked modules will be completely hidden from this tenant's sidebar navigation.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedModules(AVAILABLE_MODULES.map((m) => m.id))}
                      className="px-2 py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 dark:bg-blue-950/60 rounded-md border border-blue-200 dark:border-blue-900 cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedModules(['leads', 'quotations', 'bookings', 'customers', 'packages', 'payments'])}
                      className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      Standard Plan
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedModules(['leads', 'quotations', 'bookings', 'customers'])}
                      className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      Core Essentials
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto p-1">
                  {AVAILABLE_MODULES.map((mod) => {
                    const isSelected = selectedModules.includes(mod.id);
                    return (
                      <div
                        key={mod.id}
                        onClick={() => toggleModule(mod.id)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3 select-none ${
                          isSelected
                            ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 shadow-2xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className="mt-0.5">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                            <span>{mod.label}</span>
                            {isSelected && (
                              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">Enabled</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                            {mod.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {!isEdit && activeTab === 'admin' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <Shield className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span>
                  Provide initial login credentials for the Company Administrator. They will receive full ADMIN
                  rights within this company to manage staff, packages, leads, and custom branding.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Administrator Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="adminName"
                  required
                  value={formData.adminName}
                  onChange={handleChange}
                  placeholder="e.g., Rajesh Sharma"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Login Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="adminEmail"
                    required
                    value={formData.adminEmail}
                    onChange={handleChange}
                    placeholder="admin@mountaintreks.com"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Login Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="adminPassword"
                    required
                    value={formData.adminPassword}
                    onChange={handleChange}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Admin Mobile / Phone
                </label>
                <input
                  type="text"
                  name="adminPhone"
                  value={formData.adminPhone}
                  onChange={handleChange}
                  placeholder="+91 9876500000"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Provision Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyModal;
