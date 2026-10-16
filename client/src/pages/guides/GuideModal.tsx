import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal.js';
import { api } from '../../api/client.js';
import { TourGuide, GuideType, GuideStatus } from '../../types/index.js';
import { LocationSelector } from '../../components/common/LocationSelector.js';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: TourGuide | null;
}

const COMMON_LANGUAGES = [
  'Kannada',
  'English',
  'Hindi',
  'Tamil',
  'Telugu',
  'Malayalam',
  'Marathi',
  'Gujarati',
  'Bengali',
  'French',
  'German',
  'Spanish',
];

export const GuideModal: React.FC<GuideModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [fullName, setFullName] = useState(initialData?.fullName || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [alternatePhone, setAlternatePhone] = useState(initialData?.alternatePhone || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [city, setCity] = useState(initialData?.city || '');
  const [state, setState] = useState(initialData?.state || '');
  const [pincode, setPincode] = useState(initialData?.pincode || '');

  // Languages parsing (can be JSON array string or comma separated)
  const initialLanguages: string[] = (() => {
    if (!initialData?.languages) return ['Kannada', 'English'];
    try {
      const parsed = JSON.parse(initialData.languages);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return initialData.languages.split(',').map((s) => s.trim());
    }
    return ['Kannada', 'English'];
  })();

  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(initialLanguages);
  const [customLanguage, setCustomLanguage] = useState('');

  const [expertise, setExpertise] = useState(initialData?.expertise || '');
  const [destinations, setDestinations] = useState(initialData?.destinations || '');
  const [experienceYears, setExperienceYears] = useState<string>(
    initialData?.experienceYears !== undefined ? String(initialData.experienceYears) : '3'
  );
  const [guideType, setGuideType] = useState<GuideType>(initialData?.guideType || 'FREELANCE');
  const [dailyRate, setDailyRate] = useState<string>(
    initialData?.dailyRate !== undefined ? String(initialData.dailyRate) : '1500'
  );
  const [perTripRate, setPerTripRate] = useState<string>(
    initialData?.perTripRate !== undefined ? String(initialData.perTripRate) : '0'
  );

  const [emergencyContactName, setEmergencyContactName] = useState(
    initialData?.emergencyContactName || ''
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    initialData?.emergencyContactPhone || ''
  );
  const [emergencyContactRelation, setEmergencyContactRelation] = useState(
    initialData?.emergencyContactRelation || ''
  );

  const [licenseNumber, setLicenseNumber] = useState(initialData?.licenseNumber || '');
  const [badgeNumber, setBadgeNumber] = useState(initialData?.badgeNumber || '');
  const [qualifications, setQualifications] = useState(initialData?.qualifications || '');
  const [status, setStatus] = useState<GuideStatus>(initialData?.status || 'ACTIVE');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const handleAddCustomLanguage = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && customLanguage.trim()) {
      e.preventDefault();
      if (!selectedLanguages.includes(customLanguage.trim())) {
        setSelectedLanguages((prev) => [...prev, customLanguage.trim()]);
      }
      setCustomLanguage('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        alternatePhone: alternatePhone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        pincode: pincode.trim() || null,
        languages: selectedLanguages,
        expertise: expertise.trim() || null,
        destinations: destinations.trim() || null,
        experienceYears: experienceYears ? Number(experienceYears) : 0,
        guideType,
        dailyRate: dailyRate ? Number(dailyRate) : 0,
        perTripRate: perTripRate ? Number(perTripRate) : 0,
        emergencyContactName: emergencyContactName.trim() || null,
        emergencyContactPhone: emergencyContactPhone.trim() || null,
        emergencyContactRelation: emergencyContactRelation.trim() || null,
        licenseNumber: licenseNumber.trim() || null,
        badgeNumber: badgeNumber.trim() || null,
        qualifications: qualifications.trim() || null,
        status,
      };

      if (initialData?.id) {
        await api.put(`/guides/${initialData.id}`, payload);
      } else {
        await api.post('/guides', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save guide profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? `Edit Guide: ${initialData.guideCode}` : 'Register New Tour Guide'}
      subtitle="Complete profile, language fluencies, expertise, commercial rates and verification details"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg">
            {error}
          </div>
        )}

        {/* Basic Personal Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Full Name *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Manjunath Gowda"
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Guide Type</label>
            <select
              value={guideType}
              onChange={(e) => setGuideType(e.target.value as GuideType)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
            >
              <option value="FREELANCE">Freelance Guide</option>
              <option value="INTERNAL">Internal / Full-Time Staff</option>
              <option value="CONTRACT">Contractual Guide</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Primary Phone *</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 98450 12345"
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Alternate Phone</label>
            <input
              type="tel"
              value={alternatePhone}
              onChange={(e) => setAlternatePhone(e.target.value)}
              placeholder="e.g. 98450 67890"
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="manjunath@example.com"
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
            />
          </div>
        </div>

        {/* Location */}
        <LocationSelector
          selectedState={state}
          onStateChange={(s) => setState(s)}
          selectedDistrict={city}
          onDistrictChange={(d) => setCity(d)}
          showPlace={false}
          stateLabel="Base State"
          districtLabel="Base City / District"
          statePlaceholder="Select State..."
          districtPlaceholder="Select City / District..."
        />

        {/* Languages & Expertise */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              Spoken Languages (Click to toggle)
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_LANGUAGES.map((lang) => {
                const isSelected = selectedLanguages.includes(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLanguage(lang)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                      isSelected
                        ? 'bg-brand-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {lang} {isSelected && '✓'}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={customLanguage}
              onChange={(e) => setCustomLanguage(e.target.value)}
              onKeyDown={handleAddCustomLanguage}
              placeholder="Type other language and press Enter..."
              className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Specialized Expertise</label>
              <input
                type="text"
                value={expertise}
                onChange={(e) => setExpertise(e.target.value)}
                placeholder="e.g. Wildlife, Heritage, Trekking, Pilgrimage"
                className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Key Destinations</label>
              <input
                type="text"
                value={destinations}
                onChange={(e) => setDestinations(e.target.value)}
                placeholder="e.g. Coorg, Ooty, Hampi, Mysore, Dandeli"
                className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Commercials & Experience */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Experience (Years)</label>
            <input
              type="number"
              step="0.5"
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
              placeholder="e.g. 5"
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Daily Rate (₹)</label>
            <input
              type="number"
              value={dailyRate}
              onChange={(e) => setDailyRate(e.target.value)}
              placeholder="e.g. 1500"
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-bold"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Per Trip Rate (₹)</label>
            <input
              type="number"
              value={perTripRate}
              onChange={(e) => setPerTripRate(e.target.value)}
              placeholder="Optional package rate"
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
            />
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Emergency Contact Name</label>
            <input
              type="text"
              value={emergencyContactName}
              onChange={(e) => setEmergencyContactName(e.target.value)}
              placeholder="e.g. Kavita Gowda"
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Emergency Phone</label>
            <input
              type="tel"
              value={emergencyContactPhone}
              onChange={(e) => setEmergencyContactPhone(e.target.value)}
              placeholder="e.g. 98450 99999"
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Relation</label>
            <input
              type="text"
              value={emergencyContactRelation}
              onChange={(e) => setEmergencyContactRelation(e.target.value)}
              placeholder="e.g. Spouse / Brother"
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
            />
          </div>
        </div>

        {/* Verification Credentials */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">License / Badge Number</label>
            <input
              type="text"
              value={licenseNumber || badgeNumber}
              onChange={(e) => {
                setLicenseNumber(e.target.value);
                setBadgeNumber(e.target.value);
              }}
              placeholder="e.g. KSTDC-GD-0428"
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Account Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as GuideStatus)}
              className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
            >
              <option value="ACTIVE">Active (Available for tours)</option>
              <option value="INACTIVE">Inactive (Off-duty)</option>
              <option value="SUSPENDED">Suspended (Blocked from assignments)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : initialData ? 'Update Profile' : 'Register Guide'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
