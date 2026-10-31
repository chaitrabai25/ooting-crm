import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  Building2,
  Image as ImageIcon,
  Plus,
  Trash2,
  Wand2,
  HelpCircle,
  Car,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Modal } from '../../components/ui/Modal.js';
import { Package, PricingTierRow, HotelPlanOption, PackageCustomBrandingData } from '../../types/index.js';

interface PackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Package | null;
}

const DEFAULT_TIER_CONFIGS = [
  { pax: '2 Pax', vehicle: 'AC Sedan (Dzire / Etios)', mult: 1.0 },
  { pax: '4 Pax', vehicle: 'AC SUV (Ertiga / Innova)', mult: 0.88 },
  { pax: '6 Pax', vehicle: 'AC Innova Crysta', mult: 0.82 },
  { pax: '8 Pax', vehicle: 'Tempo Traveller (10 Seater)', mult: 0.78 },
  { pax: '10 Pax', vehicle: 'Tempo Traveller (12 Seater)', mult: 0.74 },
  { pax: '12 Pax', vehicle: 'Tempo Traveller (14 Seater)', mult: 0.70 },
];

function generateDefaultTiers(basePrice: number): PricingTierRow[] {
  const p = Math.max(basePrice || 12000, 1000);
  return DEFAULT_TIER_CONFIGS.map((c) => {
    const tierBase = Math.round((p * c.mult) / 100) * 100;
    return {
      paxCount: c.pax,
      vehicle: c.vehicle,
      plans: {
        budget: {
          doubleSharing: tierBase,
          tripleSharing: Math.round((tierBase * 0.9) / 100) * 100,
          cwb: Math.round((tierBase * 0.65) / 100) * 100,
          cnb: Math.round((tierBase * 0.45) / 100) * 100,
        },
        standard: {
          doubleSharing: Math.round((tierBase * 1.15) / 100) * 100,
          tripleSharing: Math.round((tierBase * 1.05) / 100) * 100,
          cwb: Math.round((tierBase * 0.75) / 100) * 100,
          cnb: Math.round((tierBase * 0.5) / 100) * 100,
        },
        deluxe: {
          doubleSharing: Math.round((tierBase * 1.35) / 100) * 100,
          tripleSharing: Math.round((tierBase * 1.2) / 100) * 100,
          cwb: Math.round((tierBase * 0.85) / 100) * 100,
          cnb: Math.round((tierBase * 0.55) / 100) * 100,
        },
        luxury: {
          doubleSharing: Math.round((tierBase * 1.75) / 100) * 100,
          tripleSharing: Math.round((tierBase * 1.55) / 100) * 100,
          cwb: Math.round((tierBase * 1.1) / 100) * 100,
          cnb: Math.round((tierBase * 0.7) / 100) * 100,
        },
      },
    };
  });
}

export const PackageModal: React.FC<PackageModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  // Parse existing custom branding if present
  const parsedCustom: PackageCustomBrandingData = React.useMemo(() => {
    if (!initialData?.customBranding) return {};
    try {
      return JSON.parse(initialData.customBranding);
    } catch {
      return {};
    }
  }, [initialData]);

  // Active Tab: 'basic' | 'pricing' | 'hotels' | 'banner'
  const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'hotels' | 'banner'>('basic');

  // Tab 1: Basic Information
  const [packageName, setPackageName] = useState(initialData?.packageName || '');
  const [destination, setDestination] = useState(initialData?.destination || '');
  const [duration, setDuration] = useState(initialData?.duration || '4 Days / 3 Nights');
  const [price, setPrice] = useState(initialData?.price || 12000);
  const [packageType, setPackageType] = useState(initialData?.packageType || 'HOLIDAY');
  const [description, setDescription] = useState(initialData?.description || '');
  const [inclusions, setInclusions] = useState(initialData?.inclusions || '');
  const [exclusions, setExclusions] = useState(initialData?.exclusions || '');
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');
  const [status, setStatus] = useState(initialData?.status || 'ACTIVE');

  // Tab 2: Flamingo Tiered Pricing Matrix
  const [pricingTiers, setPricingTiers] = useState<PricingTierRow[]>(() => {
    if (parsedCustom.pricingTiers && parsedCustom.pricingTiers.length > 0) {
      return parsedCustom.pricingTiers;
    }
    return generateDefaultTiers(initialData?.price || 12000);
  });

  // Tab 3: Hotel Plans by Destination
  const [hotelOptions, setHotelOptions] = useState<HotelPlanOption[]>(() => {
    if (parsedCustom.hotelOptions && parsedCustom.hotelOptions.length > 0) {
      return parsedCustom.hotelOptions;
    }
    return [
      {
        city: initialData?.destination?.split(/[,•/]/)[0]?.trim() || 'Main Destination',
        nights: 2,
        budgetHotel: 'Hotel City Comforts / Similar (3★)',
        standardHotel: 'Sterling Holidays / Similar (3★ Deluxe)',
        deluxeHotel: 'The Serai / Accord / Similar (4★)',
        luxuryHotel: 'Taj / Heritage Resort / Similar (5★)',
      },
    ];
  });

  // Tab 4: Cover Banner & Highlights
  const [tourCode, setTourCode] = useState(parsedCustom.tourCode || '');
  const [theme, setTheme] = useState(parsedCustom.theme || '');
  const [bannerImageUrl, setBannerImageUrl] = useState(parsedCustom.bannerImageUrl || '');
  const [highlightsText, setHighlightsText] = useState((parsedCustom.highlights || []).join('\n'));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill pricing tiers from current base price
  const handleAutoFillTiers = () => {
    setPricingTiers(generateDefaultTiers(Number(price) || 12000));
  };

  const updateTierField = (
    tierIdx: number,
    planKey: string,
    field: 'doubleSharing' | 'tripleSharing' | 'cwb' | 'cnb',
    val: number
  ) => {
    setPricingTiers((prev) => {
      const copy = [...prev];
      const tier = { ...copy[tierIdx] };
      const plans = { ...tier.plans };
      const plan = { ...(plans[planKey] || { doubleSharing: 0, tripleSharing: 0, cwb: 0, cnb: 0 }) };
      plan[field] = val;
      plans[planKey] = plan;
      tier.plans = plans;
      copy[tierIdx] = tier;
      return copy;
    });
  };

  const updateTierVehicle = (tierIdx: number, vehicle: string) => {
    setPricingTiers((prev) => {
      const copy = [...prev];
      copy[tierIdx] = { ...copy[tierIdx], vehicle };
      return copy;
    });
  };

  const updateTierPax = (tierIdx: number, paxCount: string) => {
    setPricingTiers((prev) => {
      const copy = [...prev];
      copy[tierIdx] = { ...copy[tierIdx], paxCount };
      return copy;
    });
  };

  const addPricingTier = () => {
    setPricingTiers((prev) => [
      ...prev,
      {
        paxCount: `${(prev.length + 1) * 2} Pax`,
        vehicle: 'Dedicated AC Vehicle',
        plans: {
          budget: { doubleSharing: 0, tripleSharing: 0, cwb: 0, cnb: 0 },
          standard: { doubleSharing: 0, tripleSharing: 0, cwb: 0, cnb: 0 },
          deluxe: { doubleSharing: 0, tripleSharing: 0, cwb: 0, cnb: 0 },
          luxury: { doubleSharing: 0, tripleSharing: 0, cwb: 0, cnb: 0 },
        },
      },
    ]);
  };

  const removePricingTier = (idx: number) => {
    setPricingTiers((prev) => prev.filter((_, i) => i !== idx));
  };

  // Hotel option helpers
  const addHotelOption = () => {
    setHotelOptions((prev) => [
      ...prev,
      {
        city: '',
        nights: 1,
        budgetHotel: '',
        standardHotel: '',
        deluxeHotel: '',
        luxuryHotel: '',
      },
    ]);
  };

  const removeHotelOption = (idx: number) => {
    setHotelOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateHotelOption = (idx: number, field: keyof HotelPlanOption, val: any) => {
    setHotelOptions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const highlightsArray = highlightsText
        .split(/\r?\n/)
        .map((s) => s.replace(/^[\s•\-\*\d\.\)\✓\✔]+/, '').trim())
        .filter(Boolean);

      const customBrandingData: PackageCustomBrandingData = {
        tourCode: tourCode.trim() || undefined,
        theme: theme.trim() || undefined,
        bannerImageUrl: bannerImageUrl.trim() || imageUrl.trim() || undefined,
        highlights: highlightsArray.length > 0 ? highlightsArray : undefined,
        hotelOptions: hotelOptions.filter((h) => h.city.trim()),
        pricingTiers: pricingTiers.filter((t) => t.paxCount.trim()),
        activePlans: ['budget', 'standard', 'deluxe', 'luxury'],
      };

      const payload = {
        packageName,
        destination,
        duration,
        price: Number(price),
        packageType,
        imageUrl: imageUrl.trim() || null,
        description,
        inclusions: inclusions || null,
        exclusions: exclusions || null,
        status,
        customBranding: JSON.stringify(customBrandingData),
      };

      if (initialData?.id) {
        await api.put(`/packages/${initialData.id}`, payload);
      } else {
        await api.post('/packages', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save package.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Travel Package & Itinerary' : 'Create Executive Travel Package'}
      subtitle="Define destinations, multi-pax tiered pricing matrix, hotel categories, and cover branding"
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl font-medium">
            {error}
          </div>
        )}

        {/* Tab Navigation Header */}
        <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700 pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'basic'
                ? 'bg-[#1E3A8A] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>1. Basic Details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'pricing'
                ? 'bg-[#C91F28] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>2. Tiered Pricing Matrix ({pricingTiers.length} Tiers)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hotels')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'hotels'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>3. Hotel Categories ({hotelOptions.length} Cities)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('banner')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'banner'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>4. Cover Banner & Tour Code</span>
          </button>
        </div>

        {/* TAB 1: BASIC INFORMATION */}
        {activeTab === 'basic' && (
          <div className="space-y-3.5 animate-fadeIn">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Package Name *</label>
              <input
                type="text"
                required
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                placeholder="e.g. Simply Coorg & Ooty Serenity"
                className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none font-semibold text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Destinations Covered *</label>
                <input
                  type="text"
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Coorg, Ooty, Mysore"
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Duration *</label>
                <input
                  type="text"
                  required
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 6 Nights / 7 Days"
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Base Starting Price (₹) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none font-bold text-sm text-[#C91F28]"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Shown on cards and catalog summary</span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Category</label>
                <select
                  value={packageType}
                  onChange={(e) => setPackageType(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="HOLIDAY">Holiday Tour</option>
                  <option value="FLIGHT">Flight + Hotel</option>
                  <option value="HOTEL">Hotel Stay</option>
                  <option value="BUS">Bus Tour</option>
                  <option value="CUSTOM">Custom Itinerary</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="DRAFT">Draft</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Thumbnail Image (URL)</span>
                <span className="text-[10px] text-slate-400 font-normal">Card preview thumbnail</span>
              </label>
              <div className="mt-1 flex items-center gap-3">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... (or image URL)"
                  className="flex-1 p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                />
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                )}
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Package Overview & Description *</label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the travel experience, highlights, and serene nature of this tour..."
                className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Key Inclusions (One per line)</label>
                <textarea
                  rows={3}
                  value={inclusions}
                  onChange={(e) => setInclusions(e.target.value)}
                  placeholder="Accommodation in selected hotel category&#10;Daily buffet breakfast&#10;Private dedicated AC vehicle for transfers&#10;Driver allowance, toll & parking charges"
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Key Exclusions (One per line)</label>
                <textarea
                  rows={3}
                  value={exclusions}
                  onChange={(e) => setExclusions(e.target.value)}
                  placeholder="Airfare or train tickets&#10;Entry monument tickets & boat rides&#10;Personal laundry, room minibar, shopping&#10;Travel insurance"
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-[#C91F28] focus:outline-none font-mono text-[11px]"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FLAMINGO TIERED PRICING MATRIX */}
        {activeTab === 'pricing' && (
          <div className="space-y-3.5 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-red-50/70 border border-red-200 rounded-xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#1E3A8A] text-xs uppercase tracking-wide">
                    Executive Flamingo Pricing Matrix
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#C91F28] text-white font-bold text-[10px]">
                    2, 4, 6, 8, 10, 12 Pax
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                  Define per-person rates for Double Sharing, Triple Sharing, CWB (Child with Bed), and CNB (Child No Bed) across hotel tiers.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleAutoFillTiers}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-[#C91F28] border border-red-200 rounded-lg font-bold text-xs shadow-2xs transition-all cursor-pointer"
                  title="Auto-calculate realistic tiered rates from base price"
                >
                  <Wand2 className="w-3.5 h-3.5 text-[#C91F28]" />
                  <span>Auto-Calculate from ₹{Number(price).toLocaleString('en-IN')}</span>
                </button>

                <button
                  type="button"
                  onClick={addPricingTier}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1E3A8A] hover:bg-blue-900 text-white rounded-lg font-bold text-xs shadow-2xs transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Pax Tier</span>
                </button>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl max-h-[480px]">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="bg-[#1E3A8A] text-white text-[11px] font-bold uppercase tracking-wider">
                    <th className="p-2.5 border-r border-blue-900 w-36">Pax & Vehicle</th>
                    <th className="p-2.5 border-r border-blue-900 text-center bg-blue-950/40">Budget (3★)</th>
                    <th className="p-2.5 border-r border-blue-900 text-center bg-blue-900/40">Standard</th>
                    <th className="p-2.5 border-r border-blue-900 text-center bg-blue-950/40">Deluxe (4★)</th>
                    <th className="p-2.5 border-r border-blue-900 text-center bg-blue-900/40">Luxury (5★)</th>
                    <th className="p-2.5 text-center w-10">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-[11px]">
                  {pricingTiers.map((tier, tIdx) => (
                    <tr
                      key={tIdx}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/50 ${
                        tIdx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/40 dark:bg-slate-800/20'
                      }`}
                    >
                      {/* Pax & Vehicle */}
                      <td className="p-2.5 border-r border-slate-200 dark:border-slate-700 space-y-1 align-top bg-slate-50/30">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#C91F28] shrink-0" />
                          <input
                            type="text"
                            value={tier.paxCount}
                            onChange={(e) => updateTierPax(tIdx, e.target.value)}
                            className="font-bold text-xs text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#C91F28] focus:outline-none w-full"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Car className="w-3 h-3 text-slate-400 shrink-0" />
                          <input
                            type="text"
                            value={tier.vehicle}
                            onChange={(e) => updateTierVehicle(tIdx, e.target.value)}
                            placeholder="Vehicle type"
                            className="text-[10.5px] text-slate-600 dark:text-slate-400 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#C91F28] focus:outline-none w-full"
                          />
                        </div>
                      </td>

                      {/* 4 Plan Columns: Budget, Standard, Deluxe, Luxury */}
                      {(['budget', 'standard', 'deluxe', 'luxury'] as const).map((planKey) => {
                        const planData = tier.plans[planKey] || {
                          doubleSharing: 0,
                          tripleSharing: 0,
                          cwb: 0,
                          cnb: 0,
                        };
                        return (
                          <td
                            key={planKey}
                            className="p-2 border-r border-slate-200 dark:border-slate-700 align-top text-[10.5px]"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] text-slate-400 font-semibold">2-Share:</span>
                                <div className="flex items-center">
                                  <span className="text-slate-400 mr-0.5">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={planData.doubleSharing || ''}
                                    onChange={(e) =>
                                      updateTierField(tIdx, planKey, 'doubleSharing', Number(e.target.value))
                                    }
                                    placeholder="0"
                                    className="w-20 p-1 border border-slate-200 dark:border-slate-700 rounded text-right font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#C91F28]"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] text-slate-400 font-semibold">3-Share:</span>
                                <div className="flex items-center">
                                  <span className="text-slate-400 mr-0.5">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={planData.tripleSharing || ''}
                                    onChange={(e) =>
                                      updateTierField(tIdx, planKey, 'tripleSharing', Number(e.target.value))
                                    }
                                    placeholder="0"
                                    className="w-20 p-1 border border-slate-200 dark:border-slate-700 rounded text-right text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#C91F28]"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] text-slate-400">CWB:</span>
                                <div className="flex items-center">
                                  <span className="text-slate-400 mr-0.5">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={planData.cwb || ''}
                                    onChange={(e) =>
                                      updateTierField(tIdx, planKey, 'cwb', Number(e.target.value))
                                    }
                                    placeholder="0"
                                    className="w-20 p-1 border border-slate-200 dark:border-slate-700 rounded text-right text-slate-600 dark:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#C91F28]"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] text-slate-400">CNB:</span>
                                <div className="flex items-center">
                                  <span className="text-slate-400 mr-0.5">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={planData.cnb || ''}
                                    onChange={(e) =>
                                      updateTierField(tIdx, planKey, 'cnb', Number(e.target.value))
                                    }
                                    placeholder="0"
                                    className="w-20 p-1 border border-slate-200 dark:border-slate-700 rounded text-right text-slate-600 dark:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#C91F28]"
                                  />
                                </div>
                              </div>
                            </div>
                          </td>
                        );
                      })}

                      {/* Remove Button */}
                      <td className="p-2 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => removePricingTier(tIdx)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                          title="Remove this pax tier"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-[10.5px] text-slate-500 italic">
              * Note: Double Sharing & Triple Sharing are per-person rates. CWB = Child with Bed, CNB = Child without Bed. GST 5% extra applicable on invoice.
            </p>
          </div>
        )}

        {/* TAB 3: HOTEL CATEGORIES & DESTINATIONS */}
        {activeTab === 'hotels' && (
          <div className="space-y-3.5 animate-fadeIn">
            <div className="flex items-center justify-between p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
              <div>
                <span className="font-bold text-[#1E3A8A] text-xs uppercase tracking-wide block">
                  Hotel Category Breakdown by City
                </span>
                <span className="text-[11px] text-slate-600">
                  Specify night stay and hotel names for each category (Budget, Standard, Deluxe, Luxury).
                </span>
              </div>
              <button
                type="button"
                onClick={addHotelOption}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add City Stay</span>
              </button>
            </div>

            <div className="space-y-3">
              {hotelOptions.map((opt, hIdx) => (
                <div
                  key={hIdx}
                  className="p-3.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                        {hIdx + 1}
                      </span>
                      <input
                        type="text"
                        value={opt.city}
                        onChange={(e) => updateHotelOption(hIdx, 'city', e.target.value)}
                        placeholder="City / Destination (e.g. Coorg, Ooty, Mysore)"
                        className="p-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white flex-1 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-semibold text-slate-500">Nights:</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={opt.nights}
                        onChange={(e) => updateHotelOption(hIdx, 'nights', parseInt(e.target.value, 10) || 1)}
                        className="w-16 p-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-center text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => removeHotelOption(hIdx)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                        title="Delete city stay"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                        Budget (3★ Friendly) Hotel
                      </span>
                      <input
                        type="text"
                        value={opt.budgetHotel || ''}
                        onChange={(e) => updateHotelOption(hIdx, 'budgetHotel', e.target.value)}
                        placeholder="e.g. Hotel City Comforts / Similar"
                        className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                        Standard Hotel
                      </span>
                      <input
                        type="text"
                        value={opt.standardHotel || ''}
                        onChange={(e) => updateHotelOption(hIdx, 'standardHotel', e.target.value)}
                        placeholder="e.g. Sterling Holidays / Similar"
                        className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                        Deluxe (4★ Premium) Hotel
                      </span>
                      <input
                        type="text"
                        value={opt.deluxeHotel || ''}
                        onChange={(e) => updateHotelOption(hIdx, 'deluxeHotel', e.target.value)}
                        placeholder="e.g. The Serai / Accord / Similar"
                        className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                        Luxury (5★ Heritage) Hotel
                      </span>
                      <input
                        type="text"
                        value={opt.luxuryHotel || ''}
                        onChange={(e) => updateHotelOption(hIdx, 'luxuryHotel', e.target.value)}
                        placeholder="e.g. Taj Connemara / Heritage Palace / Similar"
                        className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: COVER BANNER & TOUR CODE */}
        {activeTab === 'banner' && (
          <div className="space-y-3.5 animate-fadeIn">
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
              <span className="font-bold text-[#1E3A8A] text-xs uppercase tracking-wide block">
                Official Cover Page Branding (Flamingo Style)
              </span>
              <span className="text-[11px] text-slate-600">
                These elements appear prominently on Sheet 1 of the generated PDF and customer web view.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Tour Code *</label>
                <input
                  type="text"
                  value={tourCode}
                  onChange={(e) => setTourCode(e.target.value)}
                  placeholder="e.g. OT-2026-COORG-01"
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none font-bold uppercase tracking-wider text-xs"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Unique reference code on PDF header</span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Theme / Subtitle</label>
                <input
                  type="text"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="e.g. Hills & Coffee Plantation Serenity"
                  className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none text-xs"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Appears beneath the package title</span>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Scenic Hero Banner Image (URL)</span>
                <span className="text-[10px] text-slate-400 font-normal">Full-bleed scenic banner on Sheet 1</span>
              </label>
              <div className="mt-1 flex items-center gap-3">
                <input
                  type="url"
                  value={bannerImageUrl}
                  onChange={(e) => setBannerImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... (Scenic landscape banner URL)"
                  className="flex-1 p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none text-xs"
                />
                {bannerImageUrl && (
                  <img
                    src={bannerImageUrl}
                    alt="Banner preview"
                    className="w-16 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                )}
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Vacation Highlights Checklist (One per line)</span>
                <span className="text-[10px] text-slate-400 font-normal">Displayed in Vacation at a Glance box</span>
              </label>
              <textarea
                rows={4}
                value={highlightsText}
                onChange={(e) => setHighlightsText(e.target.value)}
                placeholder="Abbey Falls & Raja's Seat Sunset&#10;Dubare Elephant Camp & River Rafting&#10;Golden Temple Tibetan Monastery Bylakuppe&#10;Ooty Botanical Garden & Nilgiri Toy Train Ride&#10;Chamundi Hills & Royal Mysore Palace Illumination"
                className="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono text-[11px]"
              />
            </div>
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Flamingo-grade pricing & cover branding ready</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 font-bold text-white bg-[#C91F28] hover:bg-[#a81920] rounded-lg shadow-sm disabled:opacity-50 cursor-pointer transition-all"
            >
              {isSubmitting ? 'Saving...' : initialData ? 'Update Package' : 'Save Package'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
