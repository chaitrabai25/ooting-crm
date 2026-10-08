import React, { useState, useEffect } from 'react';
import { X, Building2, User, Palette, Globe, Shield, AlertCircle } from 'lucide-react';
import { api } from '../../api/client.js';
import { Company } from '../../types/index.js';
import { notifySuccess, notifyError } from '../../utils/sweetalert.js';

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  company: Company | null;
}

export const CompanyModal: React.FC<CompanyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  company,
}) => {
  const isEdit = !!company;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'branding' | 'admin'>('details');

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
    // Admin fields (only for creation)
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminPhone: '',
  });

  useEffect(() => {
    if (company) {
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
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        adminPhone: '',
      });
      setActiveTab('details');
    } else {
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
      // Auto-generate slug from name on create if slug hasn't been manually diverged
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
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
          logoUrl: formData.logoUrl || undefined,
          faviconUrl: formData.faviconUrl || undefined,
          primaryColor: formData.primaryColor || undefined,
          secondaryColor: formData.secondaryColor || undefined,
        };

        await api.put(`/companies/${company.id}`, payload);
        notifySuccess('Company Updated', `Updated settings for ${formData.name}.`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {isEdit ? `Edit Company: ${company.name}` : 'Create New Tenant Company'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEdit
                  ? 'Update tenant profile, status, and white-label settings'
                  : 'Provision an isolated multi-tenant organization with its company admin'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/20">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" /> Company Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('branding')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'branding'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="w-4 h-4" /> White-Label Branding
          </button>
          {!isEdit && (
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`py-3 px-4 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'admin'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Company Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Mountain Treks Travels"
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Slug Identifier <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="slug"
                    required
                    disabled={isEdit}
                    value={formData.slug}
                    onChange={handleChange}
                    placeholder="mountain-treks"
                    className={`w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 ${
                      isEdit ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  />
                  {!isEdit && (
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Used for company identification & booking reference prefixes.
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Company Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="info@mountaintreks.com"
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Company Phone <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 9876543210"
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Website URL</label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://mountaintreks.com"
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    name="gstin"
                    value={formData.gstin}
                    onChange={handleChange}
                    placeholder="29AAAAA0000A1Z5"
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tagline / Motto</label>
                <input
                  type="text"
                  name="tagline"
                  value={formData.tagline}
                  onChange={handleChange}
                  placeholder="e.g., Unforgettable Himalayan Journeys"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Registered Address</label>
                <textarea
                  name="address"
                  rows={2}
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Office address, street, landmark..."
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Bangalore"
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">State</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="Karnataka"
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Pincode</label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    placeholder="560001"
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {isEdit && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tenant Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    disabled={company?.isOoting}
                    className={`w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 ${
                      company?.isOoting ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    <option value="ACTIVE">ACTIVE (Full Access)</option>
                    <option value="SUSPENDED">SUSPENDED (Access Blocked)</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                  {company?.isOoting && (
                    <span className="text-[10px] text-amber-400 mt-1 block">
                      Primary Ooting instance cannot be deactivated or suspended.
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'branding' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-950/30 border border-blue-900/50 rounded-lg text-xs text-blue-300 flex items-start gap-2">
                <Palette className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
                <span>
                  Configure custom white-label branding. When this tenant logs in, all headers, titles, favicons,
                  and exported PDF documents will use these brand assets.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Logo Image URL</label>
                <input
                  type="text"
                  name="logoUrl"
                  value={formData.logoUrl}
                  onChange={handleChange}
                  placeholder="https://example.com/logo.png or /assets/custom-logo.png"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                {formData.logoUrl && (
                  <div className="mt-2 p-2 bg-white rounded-lg inline-block border border-slate-700">
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">Favicon URL</label>
                <input
                  type="text"
                  name="faviconUrl"
                  value={formData.faviconUrl}
                  onChange={handleChange}
                  placeholder="https://example.com/favicon.ico"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Brand Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      name="primaryColor"
                      value={formData.primaryColor}
                      onChange={handleChange}
                      className="w-10 h-10 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      name="primaryColor"
                      value={formData.primaryColor}
                      onChange={handleChange}
                      placeholder="#2563eb"
                      className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Secondary Brand Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      name="secondaryColor"
                      value={formData.secondaryColor}
                      onChange={handleChange}
                      className="w-10 h-10 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      name="secondaryColor"
                      value={formData.secondaryColor}
                      onChange={handleChange}
                      placeholder="#1e40af"
                      className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isEdit && activeTab === 'admin' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-950/30 border border-amber-900/50 rounded-lg text-xs text-amber-300 flex items-start gap-2">
                <Shield className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
                <span>
                  Provide initial login credentials for the Company Administrator. They will receive full ADMIN
                  rights within this company to manage staff, packages, leads, and custom branding.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Administrator Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="adminName"
                  required
                  value={formData.adminName}
                  onChange={handleChange}
                  placeholder="e.g., Rajesh Sharma"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Login Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    name="adminEmail"
                    required
                    value={formData.adminEmail}
                    onChange={handleChange}
                    placeholder="admin@mountaintreks.com"
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Login Password <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    name="adminPassword"
                    required
                    value={formData.adminPassword}
                    onChange={handleChange}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Admin Mobile / Phone</label>
                <input
                  type="text"
                  name="adminPhone"
                  value={formData.adminPhone}
                  onChange={handleChange}
                  placeholder="+91 9876500000"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/30 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Provision Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
