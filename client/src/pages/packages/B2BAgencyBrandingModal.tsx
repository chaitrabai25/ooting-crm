import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Search,
  Phone,
  Mail,
  MapPin,
  Check,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Loader2,
  FileText,
  UserCheck,
  Upload,
  Globe,
  Sparkles,
  User,
  Image as ImageIcon,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  X,
  ExternalLink,
  Info,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Modal } from '../../components/ui/Modal.js';
import { Agent, Package } from '../../types/index.js';
import { confirmAction, notifyError, notifySuccess } from '../../utils/sweetalert.js';

interface B2BAgencyBrandingModalProps {
  isOpen: boolean;
  onClose: () => void;
  branding: Partial<Package>;
  company?: any;
  effectiveLogoUrl?: string;
  onSaveBranding: (updated: Partial<Package>, updateMasterAgentId?: string | null) => Promise<void>;
  onResetToDefault: () => Promise<void>;
}

export const B2BAgencyBrandingModal: React.FC<B2BAgencyBrandingModalProps> = ({
  isOpen,
  onClose,
  branding,
  company,
  effectiveLogoUrl,
  onSaveBranding,
  onResetToDefault,
}) => {
  const [activeTab, setActiveTab] = useState<'select' | 'customize'>(
    branding?.b2bAgentId ? 'select' : branding?.b2bAgencyName ? 'customize' : 'select'
  );

  // Agent Picker state
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(branding.b2bAgentId || null);

  // Active form data (shared between snapshot review & customize tabs)
  const [formData, setFormData] = useState<Partial<Package>>({
    b2bAgentId: null,
    b2bAgencyName: '',
    b2bAgencyLogo: '',
    b2bTagline: 'Authorized Travel Partner',
    b2bContactPerson: '',
    b2bPhone: '',
    b2bAlternatePhone: '',
    b2bEmail: '',
    b2bAddress: '',
    b2bCity: '',
    b2bState: '',
    b2bGstin: '',
    b2bWebsite: '',
  });

  const [updateMasterRecord, setUpdateMasterRecord] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoMode, setLogoMode] = useState<'upload' | 'url'>('upload');
  const [logoPreviewError, setLogoPreviewError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initial state when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        b2bAgentId: branding.b2bAgentId || null,
        b2bAgencyName: branding.b2bAgencyName || '',
        b2bAgencyLogo: branding.b2bAgencyLogo || '',
        b2bTagline: branding.b2bTagline || 'Authorized Travel Partner',
        b2bContactPerson: branding.b2bContactPerson || '',
        b2bPhone: branding.b2bPhone || '',
        b2bAlternatePhone: branding.b2bAlternatePhone || '',
        b2bEmail: branding.b2bEmail || '',
        b2bAddress: branding.b2bAddress || '',
        b2bCity: branding.b2bCity || '',
        b2bState: branding.b2bState || '',
        b2bGstin: branding.b2bGstin || '',
        b2bWebsite: branding.b2bWebsite || '',
      });
      setSelectedAgentId(branding.b2bAgentId || null);
      setUpdateMasterRecord(false);
      setLogoPreviewError(false);

      if (branding.b2bAgentId) {
        setActiveTab('select');
      } else if (branding.b2bAgencyName) {
        setActiveTab('customize');
      } else {
        setActiveTab('select');
      }
    }
  }, [isOpen, branding]);

  // Fetch agents list
  useEffect(() => {
    if (!isOpen) return;

    const fetchAgents = async () => {
      try {
        setIsLoadingAgents(true);
        setAgentsError(null);
        const res = await api.get('/agents?limit=300&sortBy=companyName&sortOrder=asc');
        setAgents(res.data?.data || []);
      } catch (err: any) {
        console.error('Failed to load agents list:', err);
        setAgentsError(err.response?.data?.message || 'Failed to load travel agents.');
      } finally {
        setIsLoadingAgents(false);
      }
    };

    fetchAgents();
  }, [isOpen]);

  const handleFieldChange = (field: keyof Package, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Filter agents by search term
  const filteredAgents = agents.filter((agent) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      (agent.companyName || '').toLowerCase().includes(term) ||
      (agent.contactPerson || '').toLowerCase().includes(term) ||
      (agent.phone || '').toLowerCase().includes(term) ||
      (agent.email || '').toLowerCase().includes(term) ||
      (agent.city || '').toLowerCase().includes(term) ||
      (agent.state || '').toLowerCase().includes(term) ||
      (agent.gstNumber || '').toLowerCase().includes(term)
    );
  });

  // 1-Click Select Agent
  const handlePickAgent = (agent: any) => {
    setSelectedAgentId(agent.id);
    setFormData({
      b2bAgentId: agent.id,
      b2bAgencyName: agent.companyName || '',
      b2bContactPerson: agent.contactPerson || '',
      b2bPhone: agent.phone || '',
      b2bAlternatePhone: agent.alternatePhone || '',
      b2bEmail: agent.email || '',
      b2bAddress: agent.address || '',
      b2bCity: agent.city || '',
      b2bState: agent.state || '',
      b2bGstin: agent.gstNumber || '',
      b2bWebsite: agent.website || '',
      b2bTagline: agent.tagline || 'Authorized Travel Partner',
      b2bAgencyLogo: agent.logoUrl || '',
    });
    setLogoPreviewError(false);
  };

  // Image Upload handler via production /api/upload/image
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      notifyError('File Too Large', 'Logo image size must be less than 10 MB.');
      return;
    }

    try {
      setIsUploadingLogo(true);
      const data = new FormData();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      data.append('image', file, safeName);
      data.append('folder', 'company');

      const res = await api.post('/upload/image?folder=company', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.url) {
        setFormData((prev) => ({ ...prev, b2bAgencyLogo: res.data.url }));
        setLogoPreviewError(false);
        notifySuccess('Logo Uploaded', 'Agency logo uploaded and set successfully!');
      } else {
        throw new Error('Upload succeeded but no image URL was returned.');
      }
    } catch (err: any) {
      console.error('Logo upload error:', err);
      notifyError('Upload Failed', err.response?.data?.message || 'Could not upload agency logo.');
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Validation: Check missing mandatory & recommended fields
  const getMissingFields = () => {
    const missing: string[] = [];
    if (!formData.b2bAgencyName?.trim()) missing.push('Agency Name');
    if (!formData.b2bPhone?.trim()) missing.push('Phone Number');
    if (!formData.b2bEmail?.trim()) missing.push('Email');
    if (!formData.b2bAddress?.trim() && !formData.b2bCity?.trim()) missing.push('Address / City');
    if (!formData.b2bGstin?.trim()) missing.push('GSTIN');
    if (!formData.b2bAgencyLogo?.trim()) missing.push('Agency Logo');
    return missing;
  };

  const missingFields = getMissingFields();

  // Save Branding Handler
  const handleSave = async () => {
    if (!formData.b2bAgencyName?.trim()) {
      notifyError('Agency Name Required', 'Please enter the agency name before saving branding.');
      return;
    }
    if (!formData.b2bPhone?.trim()) {
      notifyError('Phone Number Required', 'Please enter a contact phone number for the agency.');
      return;
    }

    try {
      setIsSaving(true);
      const payload: Partial<Package> = {
        b2bAgentId: activeTab === 'select' ? selectedAgentId : null,
        b2bAgencyName: formData.b2bAgencyName?.trim() || null,
        b2bAgencyLogo: formData.b2bAgencyLogo?.trim() || null,
        b2bContactPerson: formData.b2bContactPerson?.trim() || null,
        b2bPhone: formData.b2bPhone?.trim() || null,
        b2bAlternatePhone: formData.b2bAlternatePhone?.trim() || null,
        b2bEmail: formData.b2bEmail?.trim() || null,
        b2bAddress: formData.b2bAddress?.trim() || null,
        b2bCity: formData.b2bCity?.trim() || null,
        b2bState: formData.b2bState?.trim() || null,
        b2bGstin: formData.b2bGstin?.trim() || null,
        b2bWebsite: formData.b2bWebsite?.trim() || null,
        b2bTagline: formData.b2bTagline?.trim() || 'Authorized Travel Partner',
      };

      const masterIdToUpdate = (updateMasterRecord && selectedAgentId) ? selectedAgentId : null;
      await onSaveBranding(payload, masterIdToUpdate);
      onClose();
    } catch (err: any) {
      console.error('Failed to save B2B branding:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Autofill form from active CRM company settings
  const handleAutofillFromCompanyDefaults = () => {
    if (!company) return;
    setFormData((prev) => ({
      ...prev,
      b2bAgentId: null,
      b2bAgencyName: company.name || '',
      b2bTagline: company.tagline || 'Authorized Travel Partner',
      b2bContactPerson: prev.b2bContactPerson || '',
      b2bPhone: company.phone || '',
      b2bAlternatePhone: '',
      b2bEmail: company.email || '',
      b2bAddress: company.address || '',
      b2bCity: company.city || prev.b2bCity || '',
      b2bState: company.state || prev.b2bState || '',
      b2bGstin: company.gstin || '',
      b2bWebsite: company.website || '',
      b2bAgencyLogo: effectiveLogoUrl || company.logoUrl || prev.b2bAgencyLogo || '',
    }));
    setSelectedAgentId(null);
    setLogoPreviewError(false);
    notifySuccess('Default Settings Loaded', `Autofilled details from ${company.name || 'Company Settings'}. You can adjust any values dynamically before saving.`);
  };

  // Reset to Default Company Settings
  const handleReset = async () => {
    const defaultCompanyName = company?.name || 'Company Settings';
    const confirmed = await confirmAction({
      title: `Reset to Default ${defaultCompanyName}?`,
      text: `This will remove the B2B partner agency override for this itinerary and restore standard ${defaultCompanyName} letterhead.`,
      confirmText: 'Yes, Restore Defaults',
      cancelText: 'Cancel',
      isDangerous: false,
      icon: 'question',
    });
    if (!confirmed) return;

    try {
      setIsSaving(true);
      await onResetToDefault();
      onClose();
    } catch (err: any) {
      console.error('Failed to reset branding:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const isCurrentBranded = Boolean(branding?.b2bAgencyName && branding.b2bAgencyName.trim());

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="B2B Agency Branding"
      subtitle="Brand this itinerary with a partner travel agency's letterhead, logo, and contacts"
      maxWidth="2xl"
    >
      <div className="space-y-4 text-xs font-sans">
        {/* Top Tab Switcher */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('select')}
            className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'select'
                ? 'bg-white dark:bg-slate-900 text-[#C91F28] shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Option 1: Select B2B Travel Agent</span>
            {selectedAgentId && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('customize')}
            className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'customize'
                ? 'bg-white dark:bg-slate-900 text-[#C91F28] shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Option 2: Customize Agency Details</span>
            {activeTab === 'customize' && formData.b2bAgencyName && (
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            )}
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* OPTION 1: SELECT B2B TRAVEL AGENT                             */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'select' && (
          <div className="space-y-4">
            {/* Safety & Isolation Banner */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 text-blue-900 dark:text-blue-300">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <span className="font-bold">Snapshot Isolation:</span> Selecting an agent copies details directly into this itinerary's custom branding snapshot. By default, your master CRM agent directory remains untouched.
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search agents by company name, contact person, phone, email, city, or GSTIN..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C91F28]/30 focus:border-[#C91F28]"
              />
            </div>

            {/* Loading / Error States */}
            {isLoadingAgents && (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin text-[#C91F28]" />
                <span className="text-xs">Loading travel agents from CRM directory...</span>
              </div>
            )}

            {agentsError && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{agentsError}</span>
              </div>
            )}

            {/* Agent Picker Grid */}
            {!isLoadingAgents && !agentsError && (
              <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 dark:divide-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-900/50">
                {filteredAgents.length === 0 ? (
                  <div className="py-6 text-center text-slate-500">
                    <Building2 className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
                    <p className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                      {searchTerm ? 'No matching agents found' : 'No travel agents registered'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {searchTerm ? 'Try searching another keyword.' : 'Add agents in the B2B Agents directory.'}
                    </p>
                  </div>
                ) : (
                  filteredAgents.map((agent: any) => {
                    const isSelected = selectedAgentId === agent.id;
                    return (
                      <div
                        key={agent.id}
                        onClick={() => handlePickAgent(agent)}
                        className={`p-2.5 rounded-xl transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-rose-50/90 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 shadow-xs'
                            : 'hover:bg-white dark:hover:bg-slate-800 border border-transparent'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-white text-xs tracking-tight">
                              {agent.companyName}
                            </span>
                            {agent.agentType && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200">
                                {agent.agentType}
                              </span>
                            )}
                            {isSelected && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                <span>Selected</span>
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            {agent.contactPerson && (
                              <span>👤 {agent.contactPerson}</span>
                            )}
                            {agent.phone && (
                              <span>📞 {agent.phone}</span>
                            )}
                            {agent.email && (
                              <span>✉️ {agent.email}</span>
                            )}
                            {(agent.city || agent.state) && (
                              <span>📍 {[agent.city, agent.state].filter(Boolean).join(', ')}</span>
                            )}
                            {agent.gstNumber && (
                              <span className="font-mono text-[10px]">GSTIN: {agent.gstNumber}</span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePickAgent(agent);
                          }}
                          className={`shrink-0 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Selected Agent Details & Missing Fields Review Section */}
            {selectedAgentId && (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                      Selected Agency Snapshot Review
                    </span>
                    <span className="text-[11px] text-slate-500">
                      (Fill in any missing details before generating PDF)
                    </span>
                  </div>
                  {missingFields.length > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      <span>{missingFields.length} missing fields</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Complete Details</span>
                    </span>
                  )}
                </div>

                {/* Missing Fields Prompt Alert */}
                {missingFields.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2 text-amber-900 dark:text-amber-300 text-[11px]">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Missing details: </span>
                      <span>{missingFields.join(', ')}. Complete the missing agency details below before downloading the branded itinerary.</span>
                    </div>
                  </div>
                )}

                {/* Inline Editing Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Agency Name *
                    </label>
                    <input
                      type="text"
                      value={formData.b2bAgencyName || ''}
                      onChange={(e) => handleFieldChange('b2bAgencyName', e.target.value)}
                      placeholder="e.g. Acme Travels Pvt Ltd"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={formData.b2bContactPerson || ''}
                      onChange={(e) => handleFieldChange('b2bContactPerson', e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Primary Phone *
                    </label>
                    <input
                      type="text"
                      value={formData.b2bPhone || ''}
                      onChange={(e) => handleFieldChange('b2bPhone', e.target.value)}
                      placeholder="e.g. +91 9876543210"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Official Email *
                    </label>
                    <input
                      type="email"
                      value={formData.b2bEmail || ''}
                      onChange={(e) => handleFieldChange('b2bEmail', e.target.value)}
                      placeholder="e.g. info@acmetravels.com"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      GSTIN {(!formData.b2bGstin?.trim()) && <span className="text-amber-600">(Missing)</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.b2bGstin || ''}
                      onChange={(e) => handleFieldChange('b2bGstin', e.target.value)}
                      placeholder="e.g. 29AAAAA0000A1Z5"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      City & State
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={formData.b2bCity || ''}
                        onChange={(e) => handleFieldChange('b2bCity', e.target.value)}
                        placeholder="City"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                      <input
                        type="text"
                        value={formData.b2bState || ''}
                        onChange={(e) => handleFieldChange('b2bState', e.target.value)}
                        placeholder="State"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Full Registered Address
                    </label>
                    <input
                      type="text"
                      value={formData.b2bAddress || ''}
                      onChange={(e) => handleFieldChange('b2bAddress', e.target.value)}
                      placeholder="Office No, Street, Landmark..."
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Logo Uploader / Input for this Agent */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Agency Logo {(!formData.b2bAgencyLogo?.trim()) && <span className="text-amber-600">(Missing)</span>}
                  </label>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="w-14 h-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                      {formData.b2bAgencyLogo && !logoPreviewError ? (
                        <img
                          src={formData.b2bAgencyLogo}
                          alt="Logo Preview"
                          className="max-h-full max-w-full object-contain"
                          onError={() => setLogoPreviewError(true)}
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2 w-full">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingLogo}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isUploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          <span>{isUploadingLogo ? 'Uploading...' : 'Upload Logo File'}</span>
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />

                        {formData.b2bAgencyLogo && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, b2bAgencyLogo: '' }));
                              setLogoPreviewError(false);
                            }}
                            className="text-slate-400 hover:text-red-500 text-xs px-2 py-1"
                          >
                            Remove Logo
                          </button>
                        )}
                      </div>

                      <input
                        type="url"
                        value={formData.b2bAgencyLogo || ''}
                        onChange={(e) => {
                          handleFieldChange('b2bAgencyLogo', e.target.value);
                          setLogoPreviewError(false);
                        }}
                        placeholder="Or paste direct image URL (https://...)"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Optional Update Master Record Checkbox */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={updateMasterRecord}
                      onChange={(e) => setUpdateMasterRecord(e.target.checked)}
                      className="rounded border-slate-300 text-[#C91F28] focus:ring-[#C91F28]"
                    />
                    <span className="font-semibold">
                      Also update master record for this agent in CRM directory
                    </span>
                    <span className="text-slate-400 text-[10px]">
                      (Syncs phone, email, address, and GSTIN to their agent profile)
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* OPTION 2: CUSTOMIZE AGENCY DETAILS                            */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'customize' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-amber-900 dark:text-amber-300 flex items-start gap-2 text-[11px]">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Standalone Custom Agency:</span> Configure bespoke branding for independent tour organizers or agencies not registered in your CRM directory. These details will apply to this itinerary only.
              </div>
            </div>

            {/* Quick Action: Autofill from Active Company Defaults */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                <div>
                  <p className="font-bold text-xs text-slate-800 dark:text-slate-100">
                    Load Active Company Defaults
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Autofill fields using active CRM defaults ({company?.name || 'Company Settings'}), then modify any value dynamically.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAutofillFromCompanyDefaults}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#C91F28]" />
                <span>Autofill from Company Settings</span>
              </button>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Agency / Partner Name *
                </label>
                <input
                  type="text"
                  value={formData.b2bAgencyName || ''}
                  onChange={(e) => handleFieldChange('b2bAgencyName', e.target.value)}
                  placeholder="e.g. Serene Voyages & Holidays"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tagline / Subtitle
                </label>
                <input
                  type="text"
                  value={formData.b2bTagline || ''}
                  onChange={(e) => handleFieldChange('b2bTagline', e.target.value)}
                  placeholder="e.g. Authorized Travel Partner / Curated Holidays"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={formData.b2bContactPerson || ''}
                  onChange={(e) => handleFieldChange('b2bContactPerson', e.target.value)}
                  placeholder="e.g. Ananya Sharma"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Phone *
                </label>
                <input
                  type="text"
                  value={formData.b2bPhone || ''}
                  onChange={(e) => handleFieldChange('b2bPhone', e.target.value)}
                  placeholder="e.g. +91 9845012345"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Alternate / WhatsApp Phone
                </label>
                <input
                  type="text"
                  value={formData.b2bAlternatePhone || ''}
                  onChange={(e) => handleFieldChange('b2bAlternatePhone', e.target.value)}
                  placeholder="e.g. +91 9845054321"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Official Email *
                </label>
                <input
                  type="email"
                  value={formData.b2bEmail || ''}
                  onChange={(e) => handleFieldChange('b2bEmail', e.target.value)}
                  placeholder="e.g. bookings@serenevoyages.com"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Official Website
                </label>
                <input
                  type="text"
                  value={formData.b2bWebsite || ''}
                  onChange={(e) => handleFieldChange('b2bWebsite', e.target.value)}
                  placeholder="e.g. www.serenevoyages.com"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  GSTIN
                </label>
                <input
                  type="text"
                  value={formData.b2bGstin || ''}
                  onChange={(e) => handleFieldChange('b2bGstin', e.target.value)}
                  placeholder="e.g. 29AAAAA0000A1Z5"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={formData.b2bCity || ''}
                  onChange={(e) => handleFieldChange('b2bCity', e.target.value)}
                  placeholder="e.g. Bengaluru"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={formData.b2bState || ''}
                  onChange={(e) => handleFieldChange('b2bState', e.target.value)}
                  placeholder="e.g. Karnataka"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Office Address
                </label>
                <input
                  type="text"
                  value={formData.b2bAddress || ''}
                  onChange={(e) => handleFieldChange('b2bAddress', e.target.value)}
                  placeholder="Full office address for letterhead footer and contact card"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Dual Logo Input Section (Method A: Upload & Method B: URL) */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#C91F28]" />
                  <span>Agency Logo (Dual Input)</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLogoMode('upload')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                      logoMode === 'upload'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400'
                    }`}
                  >
                    Method A: Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoMode('url')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                      logoMode === 'url'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400'
                    }`}
                  >
                    Method B: Image URL
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Logo Preview Square */}
                <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center p-2 shrink-0 relative overflow-hidden shadow-2xs">
                  {formData.b2bAgencyLogo && !logoPreviewError ? (
                    <img
                      src={formData.b2bAgencyLogo}
                      alt="Agency Logo"
                      className="max-h-full max-w-full object-contain"
                      onError={() => setLogoPreviewError(true)}
                    />
                  ) : (
                    <div className="text-center text-slate-400">
                      <ImageIcon className="w-6 h-6 mx-auto mb-1" />
                      <span className="text-[9px] block">No Logo</span>
                    </div>
                  )}
                </div>

                {/* Input Control */}
                <div className="flex-1 space-y-2 w-full">
                  {logoMode === 'upload' ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingLogo}
                          className="px-4 py-2 rounded-xl bg-[#C91F28] hover:bg-[#a8171f] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          {isUploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          <span>{isUploadingLogo ? 'Uploading to Server...' : 'Select & Upload Logo'}</span>
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        {formData.b2bAgencyLogo && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, b2bAgencyLogo: '' }));
                              setLogoPreviewError(false);
                            }}
                            className="text-xs text-rose-600 hover:underline px-2 py-1 font-semibold"
                          >
                            Remove Logo
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        Supports PNG, JPG, WEBP, and SVG up to 10 MB. High-resolution transparent PNG is recommended.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="url"
                        value={formData.b2bAgencyLogo || ''}
                        onChange={(e) => {
                          handleFieldChange('b2bAgencyLogo', e.target.value);
                          setLogoPreviewError(false);
                        }}
                        placeholder="https://example.com/logo.png"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Enter any public HTTPS image URL. Ensure direct link to the image file.
                      </p>
                    </div>
                  )}

                  {formData.b2bAgencyLogo && (
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span className="truncate">Active Logo: {formData.b2bAgencyLogo}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Live Letterhead Preview Card */}
            {formData.b2bAgencyName && (
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/60 space-y-2">
                <span className="text-[10.5px] uppercase font-bold text-slate-400 tracking-wider block">
                  Itinerary Letterhead Preview
                </span>
                <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                      {formData.b2bAgencyLogo ? (
                        <img src={formData.b2bAgencyLogo} alt="" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <Building2 className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase">
                        {formData.b2bAgencyName}
                      </h4>
                      <p className="text-[10px] text-[#C91F28] font-semibold">
                        {formData.b2bTagline || 'Authorized Travel Partner'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right text-[10px] text-slate-600 dark:text-slate-300 font-medium">
                    <div>{formData.b2bPhone || 'Phone not set'}</div>
                    <div>{formData.b2bEmail || 'Email not set'}</div>
                    {formData.b2bGstin && <div className="font-mono text-[9.5px]">GSTIN: {formData.b2bGstin}</div>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {isCurrentBranded && (
              <button
                type="button"
                onClick={handleReset}
                disabled={isSaving}
                className="px-3 py-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Default ({company?.name || 'Company'}) Letterhead</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !formData.b2bAgencyName?.trim()}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-[#C91F28] hover:bg-[#a8171f] text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>{isSaving ? 'Saving Branding...' : 'Save for This Itinerary'}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
