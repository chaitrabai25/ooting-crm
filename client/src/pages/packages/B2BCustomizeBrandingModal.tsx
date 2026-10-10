import React, { useState, useEffect } from 'react';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Globe,
  FileText,
  User,
  Sparkles,
  RotateCcw,
  Save,
  Image as ImageIcon,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal.js';
import { Package } from '../../types/index.js';
import { confirmAction } from '../../utils/sweetalert.js';

interface B2BCustomizeBrandingModalProps {
  isOpen: boolean;
  onClose: () => void;
  branding: Partial<Package>;
  onSaveBranding: (updated: Partial<Package>) => void;
  onResetToDefault: () => void;
}

export const B2BCustomizeBrandingModal: React.FC<B2BCustomizeBrandingModalProps> = ({
  isOpen,
  onClose,
  branding,
  onSaveBranding,
  onResetToDefault,
}) => {
  const [formData, setFormData] = useState<Partial<Package>>({
    b2bAgencyName: '',
    b2bAgencyLogo: '',
    b2bTagline: '',
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

  useEffect(() => {
    if (isOpen) {
      setFormData({
        b2bAgentId: branding.b2bAgentId || null,
        b2bAgencyName: branding.b2bAgencyName || '',
        b2bAgencyLogo: branding.b2bAgencyLogo || '',
        b2bTagline: branding.b2bTagline || '',
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
    }
  }, [isOpen, branding]);

  const handleChange = (field: keyof Package, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveBranding(formData);
    onClose();
  };

  const handleReset = async () => {
    const confirmed = await confirmAction({
      title: 'Reset to Ooting Default Branding?',
      text: 'This will clear all B2B agency branding overrides for this itinerary and restore standard Ooting letterhead & contacts.',
      confirmText: 'Yes, Reset to Default',
      cancelText: 'Cancel',
      isDangerous: true,
      icon: 'warning',
    });
    if (confirmed) {
      onResetToDefault();
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customize B2B Agency Details"
      subtitle="Edit itinerary letterhead, contacts, and custom branding for this package"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
        {/* Info Banner */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 text-amber-900 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-[11px] font-medium">
              These details apply specifically to this itinerary proposal and exported PDF document.
            </span>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Revert to default Ooting CRM branding"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset to Default</span>
          </button>
        </div>

        {/* Agency Identity Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Agency / Partner Name *
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                required
                value={formData.b2bAgencyName || ''}
                onChange={(e) => handleChange('b2bAgencyName', e.target.value)}
                placeholder="e.g. Serene World Holidays"
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-[#C91F28]/30 focus:border-[#C91F28]"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Agency Tagline
            </label>
            <div className="relative">
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={formData.b2bTagline || ''}
                onChange={(e) => handleChange('b2bTagline', e.target.value)}
                placeholder="e.g. Crafted Journeys, Timeless Memories"
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C91F28]/30 focus:border-[#C91F28]"
              />
            </div>
          </div>
        </div>

        {/* Logo URL with thumbnail preview */}
        <div>
          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Agency Logo URL
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={formData.b2bAgencyLogo || ''}
                onChange={(e) => handleChange('b2bAgencyLogo', e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C91F28]/30 focus:border-[#C91F28]"
              />
            </div>
            {formData.b2bAgencyLogo && (
              <div className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-1 flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src={formData.b2bAgencyLogo}
                  alt="Logo preview"
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
          <span className="text-[10.5px] text-slate-400 mt-1 block">
            Leave blank to display stylized agency name typography in PDF letterhead.
          </span>
        </div>

        {/* Contact Person & Primary Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Contact Person
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={formData.b2bContactPerson || ''}
                onChange={(e) => handleChange('b2bContactPerson', e.target.value)}
                placeholder="e.g. Rajesh Kumar"
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C91F28]/30 focus:border-[#C91F28]"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Primary Phone *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={formData.b2bPhone || ''}
                onChange={(e) => handleChange('b2bPhone', e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C91F28]/30 focus:border-[#C91F28]"
              />
            </div>
          </div>
        </div>

        {/* Alternate Phone & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Alternate Phone
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={formData.b2bAlternatePhone || ''}
                onChange={(e) => handleChange('b2bAlternatePhone', e.target.value)}
                placeholder="+91 91234 56789"
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C91F28]/30 focus:border-[#C91F28]"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="email"
                value={formData.b2bEmail || ''}
                onChange={(e) => handleChange('b2bEmail', e.target.value)}
                placeholder="bookings@travelpartner.com"
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C91F28]/30 focus:border-[#C91F28]"
              />
            </div>
          </div>
        </div>

        {/* GSTIN & Website */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              GSTIN
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={formData.b2bGstin || ''}
                onChange={(e) => handleChange('b2bGstin', e.target.value.toUpperCase())}
                placeholder="29ABCDE1234F1Z5"
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#C91F28]/30 focus:border-[#C91F28]"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Official Website
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={formData.b2bWebsite || ''}
                onChange={(e) => handleChange('b2bWebsite', e.target.value)}
                placeholder="www.travelpartner.com"
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C91F28]/30 focus:border-[#C91F28]"
              />
            </div>
          </div>
        </div>

        {/* City & State */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              City
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={formData.b2bCity || ''}
                onChange={(e) => handleChange('b2bCity', e.target.value)}
                placeholder="Bengaluru"
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C91F28]/30 focus:border-[#C91F28]"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              State
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={formData.b2bState || ''}
                onChange={(e) => handleChange('b2bState', e.target.value)}
                placeholder="Karnataka"
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C91F28]/30 focus:border-[#C91F28]"
              />
            </div>
          </div>
        </div>

        {/* Full Address */}
        <div>
          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Registered Office Address
          </label>
          <textarea
            rows={2}
            value={formData.b2bAddress || ''}
            onChange={(e) => handleChange('b2bAddress', e.target.value)}
            placeholder="Office #204, Brigade Towers, MG Road..."
            className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#C91F28]/30 focus:border-[#C91F28] resize-none"
          />
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#C91F28] hover:bg-[#a81920] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Apply Agency Details</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
