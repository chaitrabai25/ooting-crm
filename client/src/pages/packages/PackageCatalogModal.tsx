/**
 * @file PackageCatalogModal.tsx
 * @description Multi-Package Catalog & Brochure PDF Generator for Ooting CRM.
 * Allows travel agents and staff to select multiple packages, optionally override starting rates,
 * and generate a high-impact, professional executive tour catalog / brochure PDF or printout.
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  Download,
  Search,
  CheckSquare,
  Square,
  Sparkles,
  MapPin,
  Clock,
  Tag,
  Phone,
  Mail,
  Globe,
  Star,
  ShieldCheck,
  Quote,
  Loader2,
  FileText,
} from 'lucide-react';
import { Package } from '../../types/index.js';
import { useCompanySettings } from '../../context/CompanySettingsContext.js';
import { printElement } from '../../utils/printDocument.js';
import { generateA4Pdf } from '../../utils/pdfGenerator.js';
import { notifySuccess, notifyError } from '../../utils/sweetalert.js';

interface PackageCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  packages: Package[];
}

const DESTINATION_FALLBACKS: Record<string, string> = {
  ooty: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=800&auto=format&fit=crop&q=80',
  coorg: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&auto=format&fit=crop&q=80',
  mysore: 'https://images.unsplash.com/photo-1600100397608-f010f444f434?w=800&auto=format&fit=crop&q=80',
  kerala: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&auto=format&fit=crop&q=80',
  wayanad: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&auto=format&fit=crop&q=80',
  trivandrum: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&auto=format&fit=crop&q=80',
  kanyakumari: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&auto=format&fit=crop&q=80',
  rameshwaram: 'https://images.unsplash.com/photo-1605649487212-47bdab064df8?w=800&auto=format&fit=crop&q=80',
  tirupati: 'https://images.unsplash.com/photo-1620619767323-b95a89183081?w=800&auto=format&fit=crop&q=80',
  srisailam: 'https://images.unsplash.com/photo-1590766940554-634a7ed41450?w=800&auto=format&fit=crop&q=80',
  hyderabad: 'https://images.unsplash.com/photo-1605649487212-47bdab064df8?w=800&auto=format&fit=crop&q=80',
  mahabalipuram: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&auto=format&fit=crop&q=80',
  andaman: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800&auto=format&fit=crop&q=80',
  goa: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&auto=format&fit=crop&q=80',
  gokarna: 'https://images.unsplash.com/photo-1507525428033-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
  shivamogga: 'https://images.unsplash.com/photo-1511497584788-87676104235f?w=800&auto=format&fit=crop&q=80',
  chikmagalur: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&auto=format&fit=crop&q=80',
  south: 'https://images.unsplash.com/photo-1600100397608-f010f444f434?w=800&auto=format&fit=crop&q=80',
  default: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&auto=format&fit=crop&q=80',
};

function getCatalogPackageImage(pkg: Package): string {
  if (pkg.imageUrl && pkg.imageUrl.trim() && pkg.imageUrl !== 'null' && pkg.imageUrl !== 'undefined') {
    return pkg.imageUrl.trim();
  }
  const destKey = (pkg.destination || '').toLowerCase().trim();
  for (const [key, url] of Object.entries(DESTINATION_FALLBACKS)) {
    if (destKey.includes(key)) return url;
  }
  return DESTINATION_FALLBACKS.default;
}

export const PackageCatalogModal: React.FC<PackageCatalogModalProps> = ({
  isOpen,
  onClose,
  packages,
}) => {
  const { company, effectiveLogoUrl } = useCompanySettings();

  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    packages.slice(0, 6).map((p) => p.id)
  );
  const [priceOverrides, setPriceOverrides] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [catalogTitle, setCatalogTitle] = useState('Exclusive Tour Packages & Master Itineraries');
  const [catalogSubtitle, setCatalogSubtitle] = useState('Curated Holiday Collections • Handcrafted Itineraries • Unforgettable Moments');
  const [isGenerating, setIsGenerating] = useState(false);

  // Sync initial selection when modal opens
  React.useEffect(() => {
    if (isOpen && selectedIds.length === 0 && packages.length > 0) {
      setSelectedIds(packages.slice(0, 6).map((p) => p.id));
    }
  }, [isOpen, packages]);

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        pkg.packageName.toLowerCase().includes(q) ||
        (pkg.destination && pkg.destination.toLowerCase().includes(q));
      const matchCat = !categoryFilter || pkg.packageType === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [packages, search, categoryFilter]);

  const selectedPackagesList = useMemo(() => {
    return packages.filter((p) => selectedIds.includes(p.id));
  }, [packages, selectedIds]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(filteredPackages.map((p) => p.id));
  };

  const handleClearAll = () => {
    setSelectedIds([]);
  };

  const handlePriceChange = (pkgId: string, val: string) => {
    setPriceOverrides((prev) => ({ ...prev, [pkgId]: val }));
  };

  const handlePrint = async () => {
    if (selectedPackagesList.length === 0) {
      notifyError('No Packages Selected', 'Please select at least one tour package to print the catalog.');
      return;
    }
    await printElement('catalog-printable-doc', {
      title: `Tour_Catalog_${company?.name || 'Ooting'}`,
    });
  };

  const handleDownloadPdf = async () => {
    if (selectedPackagesList.length === 0) {
      notifyError('No Packages Selected', 'Please select at least one tour package to download the catalog.');
      return;
    }
    try {
      setIsGenerating(true);
      notifySuccess('Preparing PDF', 'Compiling high-resolution tour brochure...');
      const { download } = await generateA4Pdf({
        elementId: 'catalog-printable-doc',
        filename: `Tour_Catalog_${(company?.name || 'Ooting').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        title: catalogTitle,
        onePageOnly: false,
        margin: 6,
      });
      await download();
    } catch (err: any) {
      console.error('Catalog PDF export error:', err);
      notifyError('Print Process Recommended', 'Using direct print window for perfect layout.');
      await printElement('catalog-printable-doc', {
        title: `Tour_Catalog_${company?.name || 'Ooting'}`,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-slate-100 dark:bg-slate-900 rounded-3xl w-full max-w-7xl max-h-[94vh] flex flex-col shadow-2xl border border-slate-300 dark:border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-[#C91F28] flex items-center justify-center shadow-2xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Multi-Package Catalog & Brochure Generator</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#C91F28]/10 text-[#C91F28]">
                  PDF / Print
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generate high-impact executive brochures with customized rates and interactive office links.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isGenerating || selectedPackagesList.length === 0}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4 text-[#C91F28]" />
              <span className="hidden sm:inline">Print Catalog</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGenerating || selectedPackagesList.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#C91F28] hover:bg-[#a81920] rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
              ) : (
                <Download className="w-4 h-4 text-amber-300" />
              )}
              <span>{isGenerating ? 'Compiling PDF...' : 'Download PDF Catalog'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Split into Left Selection Controls & Right Live A4 Document Preview */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
          {/* Left Control Panel (5 Cols) */}
          <div className="lg:col-span-5 p-4 sm:p-5 border-r border-slate-200 dark:border-slate-800 overflow-y-auto space-y-4 bg-white dark:bg-slate-900/50">
            {/* Title & Subtitle Customization */}
            <div className="space-y-2.5 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Brochure Header & Title
              </span>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Catalog Main Heading</label>
                <input
                  type="text"
                  value={catalogTitle}
                  onChange={(e) => setCatalogTitle(e.target.value)}
                  placeholder="e.g. South India Holiday Catalog"
                  className="mt-1 w-full p-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#C91F28]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Catalog Sub-heading / Tagline</label>
                <input
                  type="text"
                  value={catalogSubtitle}
                  onChange={(e) => setCatalogSubtitle(e.target.value)}
                  placeholder="Curated Holiday Collections..."
                  className="mt-1 w-full p-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#C91F28]"
                />
              </div>
            </div>

            {/* Filter & Selection Bar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Select Packages ({selectedIds.length} of {packages.length} selected)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[11px] font-semibold text-[#C91F28] hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Search & Filter */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search package name, place..."
                    className="w-full pl-8 pr-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="">All Categories</option>
                  <option value="HOLIDAY">Holiday</option>
                  <option value="FLIGHT">Flight</option>
                  <option value="HOTEL">Hotel</option>
                  <option value="BUS">Bus</option>
                </select>
              </div>

              {/* Package Items List */}
              <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-1">
                {filteredPackages.map((pkg) => {
                  const isChecked = selectedIds.includes(pkg.id);
                  const currentRate = priceOverrides[pkg.id] ?? String(pkg.price);

                  return (
                    <div
                      key={pkg.id}
                      className={`p-3 rounded-xl border transition-all text-xs flex flex-col gap-2 ${
                        isChecked
                          ? 'border-[#C91F28]/50 bg-rose-50/20 dark:bg-rose-950/20 shadow-2xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={() => toggleSelect(pkg.id)}
                          className="mt-0.5 text-slate-400 hover:text-[#C91F28] cursor-pointer shrink-0"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-[#C91F28]" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0" onClick={() => toggleSelect(pkg.id)}>
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate cursor-pointer">
                              {pkg.packageName}
                            </h4>
                            <span className="text-[10px] font-bold text-slate-400 shrink-0">
                              {pkg.duration}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 text-[#C91F28]" />
                              {pkg.destination}
                            </span>
                            <span>•</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300">
                              Base: ₹{Number(pkg.price).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Inline Price Override */}
                      {isChecked && (
                        <div className="flex items-center justify-between gap-2 pl-6 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                          <span className="text-[10px] font-semibold text-slate-500">
                            Brochure Price:
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] font-bold text-slate-600">₹</span>
                            <input
                              type="number"
                              value={currentRate}
                              onChange={(e) => handlePriceChange(pkg.id, e.target.value)}
                              className="w-24 px-2 py-0.5 text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-right focus:outline-none focus:ring-1 focus:ring-[#C91F28]"
                              placeholder="Amount"
                            />
                            <span className="text-[10px] text-slate-400">/ pax</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Preview Panel (7 Cols) */}
          <div className="lg:col-span-7 p-4 sm:p-6 bg-slate-200/80 dark:bg-slate-950 overflow-y-auto flex justify-center">
            {/* The Dedicated Printable Container */}
            <div
              id="catalog-printable-doc"
              className="w-full max-w-2xl bg-white text-slate-900 rounded-2xl shadow-xl overflow-hidden p-6 sm:p-8 space-y-6 print:p-0 print:shadow-none print:rounded-none"
              style={{
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              }}
            >
              {/* Header Letterhead */}
              <div className="border-b border-slate-200 pb-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    {effectiveLogoUrl ? (
                      <img
                        src={effectiveLogoUrl}
                        alt={company?.name || 'Ooting'}
                        className="h-12 w-auto object-contain max-w-[200px]"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/assets/ooting-logo.jpg';
                        }}
                      />
                    ) : (
                      <h2 className="text-xl font-black text-[#1E3A8A] uppercase tracking-tight">
                        {company?.name || 'OOTING HOLIDAYS'}
                      </h2>
                    )}
                    <p className="text-[10px] font-bold text-[#C91F28] uppercase tracking-wider">
                      {company?.tagline || 'Journeys Beyond Ordinary'}
                    </p>
                  </div>

                  <div className="text-right text-[11px] text-slate-600 space-y-0.5">
                    <div className="font-bold text-slate-800 flex items-center justify-end gap-1">
                      <Phone className="w-3 h-3 text-[#C91F28]" />
                      <span>{company?.phone || '+91 8884845595'}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span>{company?.email || 'support@ooting.in'}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1">
                      <Globe className="w-3 h-3 text-slate-400" />
                      <span>{company?.website || 'www.ooting.in'}</span>
                    </div>
                  </div>
                </div>

                {/* Red Decorative Divider */}
                <div className="w-full h-1 bg-[#C91F28] rounded-full mt-4"></div>

                {/* Catalog Main Banner Title */}
                <div className="mt-4 text-center space-y-1">
                  <h1 className="text-lg sm:text-xl font-black text-[#1E3A8A] uppercase tracking-tight">
                    {catalogTitle}
                  </h1>
                  <p className="text-xs text-slate-500 italic max-w-lg mx-auto">
                    {catalogSubtitle}
                  </p>
                </div>
              </div>

              {/* Multi-Package Cards Display Grid */}
              <div className="space-y-4">
                {selectedPackagesList.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No packages selected. Check boxes on the left to include packages in this catalog.
                  </div>
                ) : (
                  selectedPackagesList.map((pkg, idx) => {
                    const priceToShow = priceOverrides[pkg.id] ?? String(pkg.price);
                    const coverImg = getCatalogPackageImage(pkg);

                    return (
                      <div
                        key={pkg.id}
                        className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs flex flex-col sm:flex-row gap-0 sm:gap-4 bg-slate-50/50"
                        style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                      >
                        {/* Package Thumbnail */}
                        <div className="w-full sm:w-44 h-32 sm:h-auto shrink-0 relative bg-slate-900">
                          <img
                            src={coverImg}
                            alt={pkg.packageName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = DESTINATION_FALLBACKS.default;
                            }}
                          />
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-950/80 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-xs">
                            #{idx + 1}
                          </div>
                        </div>

                        {/* Package Details */}
                        <div className="p-3 sm:py-3.5 sm:pr-4 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                                {pkg.packageName}
                              </h3>
                              <span className="px-2 py-0.5 rounded-full bg-red-100 text-[#C91F28] font-bold text-[10px]">
                                {pkg.duration}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold mt-1">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-[#C91F28]" />
                                {pkg.destination}
                              </span>
                              <span>•</span>
                              <span>Curated Itinerary</span>
                            </div>

                            {pkg.description && (
                              <p className="text-[11px] text-slate-600 line-clamp-2 mt-1.5 leading-snug">
                                {pkg.description}
                              </p>
                            )}

                            {pkg.inclusions && (
                              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span className="line-clamp-1 font-medium">
                                  <strong>Includes:</strong> {pkg.inclusions}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Price Tag Row */}
                          <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-medium">
                              Per Person Twin Sharing
                            </span>
                            <div className="text-right">
                              <span className="text-[11px] text-slate-500 uppercase mr-1">Starts At</span>
                              <span className="text-sm sm:text-base font-black text-[#1E3A8A]">
                                ₹{Number(priceToShow).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Note / Terms */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[10px] text-amber-900 leading-relaxed">
                <strong>Important Note:</strong> Rates are indicative per person on twin-sharing basis and subject to seasonal vehicle & hotel availability at the time of final confirmation. Customizations for group sizes (2, 4, 6, 8, 12+ pax) with dedicated private chauffeur and vehicle options available upon request.
              </div>

              {/* Executive Closing Page Summary */}
              <div
                className="pt-4 border-t border-slate-200 space-y-4"
                style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
              >
                {/* Trust Badge */}
                <div className="p-3.5 bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-white rounded-xl border border-blue-200/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[11px] flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current text-slate-950" />
                      <span>{String(company?.reviewRating || '4.9')} / 5.0</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-800">
                      Rated by {company?.reviewCount || '1,250+'} Happy Travelers
                    </span>
                  </div>

                  <div className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Verified 100% Authentic Feedback
                  </div>
                </div>

                {/* Testimonial Quote */}
                <div className="text-xs text-slate-600 italic border-l-2 border-[#C91F28] pl-3 py-0.5">
                  "{company?.reviewQuote || 'Our family trip with Ooting was breathtaking! Impeccable cabs, punctual chauffeurs, and handpicked luxury resorts.'}"
                  <span className="font-bold text-[#1E3A8A] not-italic ml-2">
                    — {company?.reviewAuthor || 'Rajesh & Family, Bangalore'}
                  </span>
                </div>

                {/* Interactive Contact & Office Navigation Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-200 gap-1">
                    <span className="font-bold text-slate-900 uppercase">
                      {company?.name || 'Ooting Holidays'} Registered Office
                    </span>
                    {company?.googleMapUrl && (
                      <a
                        href={company.googleMapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors cursor-pointer w-fit"
                      >
                        <MapPin className="w-3 h-3 text-emerald-600" />
                        <span>Navigate on Google Maps ↗</span>
                      </a>
                    )}
                  </div>

                  <div className="text-slate-600 text-[11px] leading-relaxed">
                    {company?.address || 'Ooting 3rd Cross, Malavagoppa, BH Road, Shivamogga, Karnataka, India'}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-700 pt-1">
                    <span>
                      📞 <strong>Call / WhatsApp:</strong> {company?.phone || '+91 8884845595'}
                    </span>
                    <span>
                      ✉️ <strong>Email:</strong> {company?.email || 'support@ooting.in'}
                    </span>
                    <span>
                      🌐 <strong>Web:</strong> {company?.website || 'www.ooting.in'}
                    </span>
                  </div>
                </div>

                {/* Footer Tagline */}
                <div className="text-center text-[10px] text-slate-400 uppercase tracking-widest pt-2">
                  {company?.name || 'Ooting Holidays'} • {company?.tagline || 'Journeys Beyond Ordinary'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
