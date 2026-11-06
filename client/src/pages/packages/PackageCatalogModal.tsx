/**
 * @file PackageCatalogModal.tsx
 * @description Multi-Package Catalog & Brochure PDF Generator for Ooting CRM.
 * Allows travel agents and staff to select multiple packages, optionally override starting rates and descriptions,
 * and generate a high-impact, professional executive tour catalog / brochure PDF or printout.
 *
 * Page Geometry:
 * - Sheet 1 (Cover Sheet): Executive Letterhead + 2 Packages (Height calibrated to cleanly fill A4 with zero overflow).
 * - Sheet 2+ (Subsequent Sheets): Clean Running Header + 3 Packages per sheet (60-70 word descriptions for perfect fit).
 * - Final Sheet: Verified Reviews, Happy Moments Gallery, THANK YOU, and Official Office Contact Card.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Printer,
  Search,
  CheckSquare,
  Square,
  MapPin,
  Phone,
  Mail,
  Globe,
  Star,
  ShieldCheck,
  CheckCircle2,
  Quote,
  FileText,
  Camera,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { Package } from '../../types/index.js';
import { useCompanySettings } from '../../context/CompanySettingsContext.js';
import { printElement } from '../../utils/printDocument.js';
import { notifyError } from '../../utils/sweetalert.js';
import { api } from '../../api/client.js';
import { parseGalleryUrls } from '../../utils/galleryHelper.js';

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

const DEFAULT_TRIP_GALLERY = [
  { url: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=600&auto=format&fit=crop&q=80', caption: 'Breathtaking Viewpoints' },
  { url: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&auto=format&fit=crop&q=80', caption: 'Cherished Family Moments' },
  { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80', caption: 'Serene Nature & Escapes' },
  { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80', caption: 'Luxury Stays & Heritage' },
];

function countWords(str?: string | null): number {
  if (!str) return 0;
  return str.trim().split(/\s+/).filter(Boolean).length;
}

function truncateToWords(str: string, maxWords: number): string {
  if (!str) return '';
  const words = str.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return str.trim();
  return words.slice(0, maxWords).join(' ') + '...';
}

function parseCustomBranding(pkg: Package): any {
  if (!pkg.customBranding) return {};
  if (typeof pkg.customBranding === 'object') return pkg.customBranding;
  try {
    return JSON.parse(pkg.customBranding);
  } catch {
    return {};
  }
}

function getCatalogPackageImage(pkg: Package): string {
  const cb = parseCustomBranding(pkg);
  if (cb?.bannerImageUrl && typeof cb.bannerImageUrl === 'string' && cb.bannerImageUrl.trim()) {
    return cb.bannerImageUrl.trim();
  }
  if (pkg.imageUrl && pkg.imageUrl.trim() && pkg.imageUrl !== 'null' && pkg.imageUrl !== 'undefined') {
    return pkg.imageUrl.trim();
  }
  if (pkg.itineraries && pkg.itineraries.length > 0) {
    const firstItin = pkg.itineraries[0];
    if (firstItin.imageUrl && firstItin.imageUrl.trim() && firstItin.imageUrl !== 'null') {
      return firstItin.imageUrl.trim();
    }
    if (firstItin.images) {
      try {
        const parsed = typeof firstItin.images === 'string' ? JSON.parse(firstItin.images) : firstItin.images;
        if (Array.isArray(parsed) && parsed.length > 0) {
          const img = typeof parsed[0] === 'string' ? parsed[0] : parsed[0]?.url || parsed[0]?.imageUrl;
          if (img && img.trim()) return img.trim();
        }
      } catch {}
    }
  }
  const destKey = `${pkg.packageName || ''} ${pkg.destination || ''}`.toLowerCase().trim();
  for (const [key, url] of Object.entries(DESTINATION_FALLBACKS)) {
    if (key !== 'default' && destKey.includes(key)) return url;
  }
  return DESTINATION_FALLBACKS.default;
}

function getCleanCatalogDescription(pkg: Package, maxWords = 65): string {
  const cb = parseCustomBranding(pkg);
  let raw = '';
  if (cb?.tourOverview && typeof cb.tourOverview === 'string' && cb.tourOverview.trim()) {
    raw = cb.tourOverview.trim();
  } else if (pkg.description && pkg.description.trim()) {
    raw = pkg.description.trim();
  } else if (cb?.description && typeof cb.description === 'string' && cb.description.trim()) {
    raw = cb.description.trim();
  }
  if (!raw) return '';

  const clean = raw.replace(/\*\*/g, '').replace(/###\s*/g, '').replace(/##\s*/g, '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return clean;
  return words.slice(0, maxWords).join(' ') + '...';
}

function getCatalogPackageInclusions(pkg: Package): string {
  const cb = parseCustomBranding(pkg);
  if (cb?.inclusions && typeof cb.inclusions === 'string' && cb.inclusions.trim()) {
    return cb.inclusions.trim();
  }
  if (pkg.inclusions && pkg.inclusions.trim()) {
    return pkg.inclusions.trim();
  }
  return '';
}

function parseInclusionList(raw?: string | null): string[] {
  if (!raw || !raw.trim()) return [];
  const text = raw.trim();
  if (text.includes('\n')) {
    return text
      .split('\n')
      .map((s) => s.replace(/^[\s•\-\*\d\.\)\✓\✔\✕\✖\—]+/, '').trim())
      .filter(Boolean);
  }
  if (text.includes(',') || text.includes(';') || text.includes('•')) {
    return text
      .split(/[,;•]+/)
      .map((s) => s.replace(/^[\s•\-\*\d\.\)\✓\✔\✕\✖\—]+/, '').trim())
      .filter(Boolean);
  }
  return [text];
}

function formatDestinationRoute(raw?: string | null): string {
  if (!raw) return 'Tour Destination';
  return raw
    .replace(/\s*(-->|->|--|—>)\s*/g, ' → ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const PackageCatalogModal: React.FC<PackageCatalogModalProps> = ({
  isOpen,
  onClose,
  packages,
}) => {
  const { company, effectiveLogoUrl } = useCompanySettings();

  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    packages.slice(0, 5).map((p) => p.id)
  );
  const [priceOverrides, setPriceOverrides] = useState<Record<string, string>>({});
  const [descriptionOverrides, setDescriptionOverrides] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [catalogTitle, setCatalogTitle] = useState('Exclusive Tour Packages & Master Itineraries');
  const [catalogSubtitle, setCatalogSubtitle] = useState('Curated Holiday Collections • Handcrafted Itineraries • Unforgettable Moments');
  const [zoomScale, setZoomScale] = useState<number>(0.85);
  const [detailedPackages, setDetailedPackages] = useState<Record<string, Package>>({});

  // Sync initial selection when modal opens
  useEffect(() => {
    if (isOpen && selectedIds.length === 0 && packages.length > 0) {
      setSelectedIds(packages.slice(0, 5).map((p) => p.id));
    }
  }, [isOpen, packages]);

  // Fetch full details for selected packages in background to ensure zero data loss
  useEffect(() => {
    if (!isOpen || selectedIds.length === 0) return;
    let isMounted = true;
    const fetchMissing = async () => {
      for (const id of selectedIds) {
        if (!detailedPackages[id]) {
          try {
            const res = await api.get(`/packages/${id}`);
            if (res.data && isMounted) {
              setDetailedPackages((prev) => ({ ...prev, [id]: res.data }));
            }
          } catch {
            // Silently fall back to base list package
          }
        }
      }
    };
    fetchMissing();
    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedIds]);

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
    return packages
      .filter((p) => selectedIds.includes(p.id))
      .map((p) => detailedPackages[p.id] || p);
  }, [packages, selectedIds, detailedPackages]);

  // Chunking logic:
  // Sheet 1: Exactly up to 2 packages (fits with executive letterhead)
  // Subsequent Sheets: Exactly up to 3 packages per sheet
  const { page1Packages, subsequentPages, totalPdfPages } = useMemo(() => {
    const p1 = selectedPackagesList.slice(0, 2);
    const rem = selectedPackagesList.slice(2);
    const subPages: Package[][] = [];
    for (let i = 0; i < rem.length; i += 3) {
      subPages.push(rem.slice(i, i + 3));
    }
    // Total pages = Sheet 1 + subsequent package pages + 1 final closing page
    const total = 1 + subPages.length + 1;
    return { page1Packages: p1, subsequentPages: subPages, totalPdfPages: total };
  }, [selectedPackagesList]);

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

  const handleDescriptionChange = (pkgId: string, val: string) => {
    setDescriptionOverrides((prev) => ({ ...prev, [pkgId]: val }));
  };

  const handleResetDescription = (pkgId: string) => {
    setDescriptionOverrides((prev) => {
      const next = { ...prev };
      delete next[pkgId];
      return next;
    });
  };

  const handleTrimDescription = (pkgId: string, currentText: string) => {
    const trimmed = truncateToWords(currentText, 65);
    setDescriptionOverrides((prev) => ({ ...prev, [pkgId]: trimmed }));
  };

  const handlePrint = async () => {
    if (selectedPackagesList.length === 0) {
      notifyError('No Packages Selected', 'Please select at least one tour package to print the catalog.');
      return;
    }
    const safeTitle = (company?.name || 'Ooting_Holidays').replace(/[^a-zA-Z0-9]/g, '_');
    await printElement('catalog-printable-doc', {
      title: `${safeTitle}_Tour_Brochure_Catalog`,
    });
  };

  if (!isOpen) return null;

  /**
   * Helper to render a package card in either Sheet 1 (height 425px) or Subsequent Sheet (height 310px).
   * Calibrated with exact heights and padding to guarantee 0 overflow and 0 blank empty space.
   */
  const renderPackageCard = (pkg: Package, globalIdx: number, variant: 'SHEET_1' | 'SUBSEQUENT') => {
    const priceToShow = priceOverrides[pkg.id] ?? String(pkg.price);
    const coverImg = getCatalogPackageImage(pkg);
    const rawDesc = descriptionOverrides[pkg.id] !== undefined
      ? descriptionOverrides[pkg.id]
      : getCleanCatalogDescription(pkg, 65);
    const pkgDescription = rawDesc;
    const pkgInclusions = getCatalogPackageInclusions(pkg);
    const inclusionList = parseInclusionList(pkgInclusions);
    const destinationRoute = formatDestinationRoute(pkg.destination);

    const isSheet1 = variant === 'SHEET_1';
    // Max inclusions shown: 8 on Sheet 1, 5 on subsequent sheets
    const maxInclusions = isSheet1 ? 8 : 5;
    const displayedInclusions = inclusionList.slice(0, maxInclusions);
    const extraInclusionsCount = Math.max(0, inclusionList.length - maxInclusions);

    return (
      <div
        key={pkg.id}
        className="catalog-package-card-wrapper"
        style={{
          breakInside: 'avoid',
          pageBreakInside: 'avoid',
          display: 'block',
          width: '100%',
        }}
      >
        <div
          className={`catalog-package-card border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs flex flex-row bg-white ${
            isSheet1 ? 'h-[425px] min-h-[425px] max-h-[425px]' : 'h-[310px] min-h-[310px] max-h-[310px]'
          }`}
          style={{
            height: isSheet1 ? '425px' : '310px',
            minHeight: isSheet1 ? '425px' : '310px',
            maxHeight: isSheet1 ? '425px' : '310px',
            boxSizing: 'border-box',
          }}
        >
          {/* Package Banner Image (Self-stretching full height, no empty space) */}
          <div
            className={`shrink-0 self-stretch relative overflow-hidden bg-slate-900 rounded-xl m-2.5 mr-0 shadow-2xs border border-slate-200/80 ${
              isSheet1 ? 'w-56' : 'w-48'
            }`}
          >
            <img
              src={coverImg}
              alt={pkg.packageName}
              className="w-full h-full object-cover object-center absolute inset-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = DESTINATION_FALLBACKS.default;
              }}
            />
            {/* Number count badge (clean # count) */}
            <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-md bg-slate-950/85 text-white text-[10px] font-black uppercase tracking-wider backdrop-blur-xs shadow-sm z-10">
              {globalIdx + 1}
            </div>
          </div>

          {/* Package Content Section */}
          <div className="p-3.5 flex-1 flex flex-col justify-between min-w-0 overflow-hidden">
            <div className="space-y-1.5 overflow-hidden">
              {/* Package Header Row: Title & Duration Badge (One time only) */}
              <div className="flex items-start justify-between gap-2">
                <h3
                  className={`font-black text-slate-900 uppercase tracking-tight leading-tight line-clamp-1 ${
                    isSheet1 ? 'text-base' : 'text-sm'
                  }`}
                  title={pkg.packageName}
                >
                  {pkg.packageName}
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full bg-red-50 text-[#C91F28] font-black border border-red-200/60 shadow-2xs shrink-0 whitespace-nowrap ${
                    isSheet1 ? 'text-[11px]' : 'text-[10px]'
                  }`}
                >
                  {pkg.duration}
                </span>
              </div>

              {/* Destination Route (Clean 1 line with MapPin icon) */}
              <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
                <MapPin className="w-3.5 h-3.5 text-[#C91F28] shrink-0" />
                <span className="font-bold text-[#C91F28] leading-tight text-[11px] truncate" title={destinationRoute}>
                  {destinationRoute}
                </span>
              </div>

              {/* Description: Justified, 60-70 words word limit cleanly fitting without empty space */}
              {pkgDescription && (
                <p
                  className={`text-slate-700 leading-relaxed text-justify ${
                    isSheet1 ? 'text-[11.5px] line-clamp-5' : 'text-[11px] line-clamp-4 leading-snug'
                  }`}
                  style={{ textAlign: 'justify', textJustify: 'inter-word' }}
                >
                  {pkgDescription}
                </p>
              )}

              {/* Inclusions Badges */}
              {pkgInclusions && (
                <div className="pt-1">
                  <div className="flex items-center gap-1 text-[10.5px] font-bold text-emerald-800 mb-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Key Inclusions:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {displayedInclusions.map((item, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50/90 text-emerald-950 border border-emerald-200/60 shadow-2xs"
                      >
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                        <span className="truncate max-w-[170px]">{item}</span>
                      </span>
                    ))}
                    {extraInclusionsCount > 0 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9.5px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        +{extraInclusionsCount} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Price Tag Row (Highlight amount) */}
            <div className="pt-2 border-t border-slate-200/90 flex items-center justify-between shrink-0">
              <span className="text-[10.5px] text-slate-500 font-semibold tracking-tight">
                Twin Sharing • Chauffeur Driven
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Starts At
                </span>
                <div className="px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 shadow-2xs">
                  <span
                    className={`font-black text-[#1E3A8A] tracking-tight ${
                      isSheet1 ? 'text-base' : 'text-sm'
                    }`}
                  >
                    {Number(priceToShow) > 0 ? `₹${Number(priceToShow).toLocaleString('en-IN')}` : 'On Request'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
                  Print / Save PDF
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Fit 2 packages on sheet 1, 3 packages on subsequent sheets, with 60-70 word descriptions and zero empty space.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={selectedPackagesList.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#C91F28] hover:bg-[#a81920] rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
              title="Print document or Save as PDF with perfect vector layout and no cut content"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>Print / Save as PDF</span>
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
          {/* Left Control Panel (4 Cols) */}
          <div className="lg:col-span-4 p-4 sm:p-5 border-r border-slate-200 dark:border-slate-800 overflow-y-auto space-y-4 bg-white dark:bg-slate-900/50">
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

              {/* Sheet Fitting Guide Pill */}
              <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-[11px] text-blue-900 dark:text-blue-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Sheet Fit: 2 on Sheet 1 • 3 on Sheet 2+</span>
                </span>
                <span className="font-bold font-mono text-[10px] bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                  {totalPdfPages} Sheets Total
                </span>
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

              {/* Package Items List with Live Description & Price Editor */}
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {filteredPackages.map((pkg) => {
                  const isChecked = selectedIds.includes(pkg.id);
                  const currentRate = priceOverrides[pkg.id] ?? String(pkg.price);
                  const effectiveDesc = descriptionOverrides[pkg.id] !== undefined
                    ? descriptionOverrides[pkg.id]
                    : getCleanCatalogDescription(pkg, 65);
                  const wordCount = countWords(effectiveDesc);

                  return (
                    <div
                      key={pkg.id}
                      className={`p-3 rounded-xl border transition-all text-xs flex flex-col gap-2.5 ${
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

                      {/* When selected: Price Override & Live 60-70 Word Description Editor */}
                      {isChecked && (
                        <div className="pl-6 pt-2 pb-1 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
                          {/* Brochure Price Row */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
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

                          {/* Description Editor (60-70 words recommended) */}
                          <div className="space-y-1 pt-1.5 border-t border-dashed border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                Catalog Description:
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-md ${
                                    wordCount >= 55 && wordCount <= 72
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                  }`}
                                  title="Recommended: 60-70 words for perfect card height fit"
                                >
                                  {wordCount} words
                                </span>
                                {wordCount > 70 && (
                                  <button
                                    type="button"
                                    onClick={() => handleTrimDescription(pkg.id, effectiveDesc)}
                                    className="text-[9.5px] text-[#C91F28] hover:underline font-bold cursor-pointer"
                                    title="Automatically trim to 65 words"
                                  >
                                    Trim to 65w
                                  </button>
                                )}
                              </div>
                            </div>

                            <textarea
                              rows={3}
                              value={effectiveDesc}
                              onChange={(e) => handleDescriptionChange(pkg.id, e.target.value)}
                              placeholder="Enter 60-70 word tour summary..."
                              className="w-full p-2 text-[11px] leading-relaxed bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#C91F28] resize-none"
                            />

                            <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5">
                              <span>⚡ Syncs live with PDF preview</span>
                              {descriptionOverrides[pkg.id] !== undefined && (
                                <button
                                  type="button"
                                  onClick={() => handleResetDescription(pkg.id)}
                                  className="text-[#C91F28] hover:underline cursor-pointer font-bold inline-flex items-center gap-0.5"
                                >
                                  <RotateCcw className="w-2.5 h-2.5" />
                                  <span>Reset</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Preview Panel (8 Cols) */}
          <div className="lg:col-span-8 p-3 sm:p-5 bg-slate-200/80 dark:bg-slate-950 overflow-x-auto overflow-y-auto flex flex-col items-center min-w-0">
            {/* Top Preview Status Bar & Zoom Controls */}
            <div className="w-full max-w-[794px] flex items-center justify-between pb-3 text-xs text-slate-500 shrink-0">
              <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                <FileText className="w-3.5 h-3.5 text-[#C91F28]" />
                <span>Live A4 Brochure Preview ({totalPdfPages} Sheets)</span>
              </span>
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-300 dark:border-slate-700 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-semibold px-1">Zoom:</span>
                <button
                  type="button"
                  onClick={() => setZoomScale(0.75)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    zoomScale === 0.75
                      ? 'bg-[#C91F28] text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  75%
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale(0.85)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    zoomScale === 0.85
                      ? 'bg-[#C91F28] text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  85%
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale(1)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    zoomScale === 1
                      ? 'bg-[#C91F28] text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  100%
                </button>
              </div>
            </div>

            {/* The Dedicated Printable Container with discrete .pdf-page elements */}
            <div
              id="catalog-printable-doc"
              className="w-full max-w-[794px] space-y-8 print:space-y-0 shrink-0 origin-top transition-transform"
              style={{
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                transform: zoomScale !== 1 ? `scale(${zoomScale})` : undefined,
              }}
            >
              <style>{`
                @media print {
                  body, html {
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #ffffff !important;
                  }
                  #catalog-printable-doc {
                    padding: 0 !important;
                    margin: 0 !important;
                    box-shadow: none !important;
                    border: none !important;
                    width: 210mm !important;
                    max-width: 210mm !important;
                    background: #ffffff !important;
                  }
                  .pdf-page {
                    width: 210mm !important;
                    max-width: 210mm !important;
                    min-width: 210mm !important;
                    height: 296mm !important;
                    max-height: 296mm !important;
                    min-height: 296mm !important;
                    box-sizing: border-box !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: hidden !important;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                    page-break-after: always !important;
                    break-after: page !important;
                  }
                  .pdf-page:last-child {
                    page-break-after: avoid !important;
                    break-after: avoid !important;
                  }
                  .catalog-package-card-wrapper {
                    display: block !important;
                    break-inside: avoid !important;
                    page-break-inside: avoid !important;
                  }
                  .catalog-package-card {
                    break-inside: avoid !important;
                    page-break-inside: avoid !important;
                  }
                  .catalog-closing-section {
                    break-inside: avoid !important;
                    page-break-inside: avoid !important;
                  }
                }
              `}</style>

              {/* ========================================================================= */}
              {/* SHEET 1: EXECUTIVE LETTERHEAD COVER & FIRST 2 PACKAGES                     */}
              {/* ========================================================================= */}
              <div
                className="pdf-page bg-white text-slate-900 rounded-2xl shadow-xl overflow-hidden p-6 sm:p-7 flex flex-col justify-between border border-slate-200 print:border-none print:shadow-none print:rounded-none"
                style={{
                  width: '794px',
                  minWidth: '794px',
                  maxWidth: '794px',
                  height: '1123px',
                  minHeight: '1123px',
                  maxHeight: '1123px',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                }}
              >
                <div>
                  {/* Top Accent Wave Bar */}
                  <div
                    className="w-full bg-[#C91F28] overflow-hidden relative shrink-0 rounded-t-lg mb-2"
                    style={{ height: '7px', minHeight: '7px', maxHeight: '7px', backgroundColor: '#C91F28', overflow: 'hidden' }}
                  >
                    <img
                      src="/assets/ooting-header-wave.png"
                      alt=""
                      className="w-full h-full object-cover opacity-90"
                      style={{ width: '100%', height: '7px', objectFit: 'cover' }}
                    />
                  </div>

                  {/* Header Letterhead (Logo, Agency Name, Tagline, Dynamic Right Contact Details) */}
                  <div className="pb-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      {/* LEFT SIDE: Binoculars Logo, Agency Name & Taglines */}
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center bg-white p-1 border border-slate-200 shadow-2xs shrink-0"
                          style={{ width: '48px', height: '48px', minWidth: '48px', maxWidth: '48px', minHeight: '48px', maxHeight: '48px', overflow: 'hidden' }}
                        >
                          <img
                            src={effectiveLogoUrl || company?.logoUrl || "/assets/ooting-binoculars.png"}
                            alt={company?.name || 'Ooting Holidays'}
                            className="max-w-full max-h-full object-contain"
                            style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/assets/ooting-binoculars.png';
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="text-lg font-black tracking-tight text-slate-900 block leading-tight uppercase">
                            {(company?.name || 'OOTING HOLIDAYS').toUpperCase()}
                          </span>
                          <span className="text-xs font-bold text-[#C91F28] uppercase tracking-wide block mt-0.5">
                            {company?.tagline || 'Journeys Beyond Ordinary'}
                          </span>
                          <span className="text-[10.5px] text-slate-500 font-medium block">
                            {(company as any)?.subtitle || 'Premium Tour Operator & Destination Specialist'}
                          </span>
                        </div>
                      </div>

                      {/* RIGHT SIDE: Dynamic Aligned Contact Details */}
                      <div className="flex justify-end ml-auto shrink-0">
                        <div className="w-fit ml-auto flex flex-col space-y-1 text-xs text-slate-700 max-w-[320px]">
                          {company?.website && (
                            <div className="flex items-center gap-2">
                              <span className="w-4 h-4 mr-2 flex items-center justify-center shrink-0 text-[#C91F28]">
                                <Globe className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
                              </span>
                              <a
                                href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-slate-800 hover:text-[#C91F28] tracking-tight break-all text-xs"
                              >
                                {company.website.replace(/^https?:\/\//, '')}
                              </a>
                            </div>
                          )}
                          {company?.email && (
                            <div className="flex items-center gap-2">
                              <span className="w-4 h-4 mr-2 flex items-center justify-center shrink-0 text-[#C91F28]">
                                <Mail className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
                              </span>
                              <a
                                href={`mailto:${company.email}`}
                                className="font-semibold text-slate-800 hover:text-[#C91F28] tracking-tight break-all text-xs"
                              >
                                {company.email}
                              </a>
                            </div>
                          )}
                          {company?.phone && (
                            <div className="flex items-center gap-2">
                              <span className="w-4 h-4 mr-2 flex items-center justify-center shrink-0 text-[#C91F28]">
                                <Phone className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
                              </span>
                              <a
                                href={`tel:${(company.phone || '').replace(/[^0-9+]/g, '')}`}
                                className="font-semibold text-slate-800 hover:text-[#C91F28] tracking-tight text-xs"
                              >
                                {company.phone}
                                {(company as any)?.alternatePhone && ` / ${(company as any).alternatePhone}`}
                              </a>
                            </div>
                          )}
                          {company?.gstin && company.gstin !== 'NULL' && company.gstin !== 'NIL' && company.gstin.trim() !== '' && (
                            <div className="flex items-center gap-2">
                              <span className="w-4 h-4 mr-2 flex items-center justify-center shrink-0 text-[#C91F28]">
                                <FileText className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
                              </span>
                              <span className="font-semibold text-slate-800 tracking-tight text-xs">
                                GSTIN: {company.gstin.replace(/^GSTIN:\s*/i, '')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Clean Simple Design Line */}
                    <div className="w-full h-[2.5px] bg-[#C91F28] rounded-full mt-3 mb-2" />

                    {/* Catalog Main Banner Title & Subtitle */}
                    <div className="text-center space-y-0.5">
                      <h1 className="text-xl sm:text-2xl font-black text-[#1E3A8A] uppercase tracking-tight">
                        {catalogTitle}
                      </h1>
                      <p className="text-xs text-slate-500 italic max-w-xl mx-auto">
                        {catalogSubtitle}
                      </p>
                    </div>
                  </div>

                  {/* Sheet 1 Packages: Exactly up to 2 Packages */}
                  <div className="space-y-4 pt-1">
                    {page1Packages.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-xs">
                        No packages selected. Check boxes on the left to include packages in this catalog.
                      </div>
                    ) : (
                      page1Packages.map((pkg, idx) => renderPackageCard(pkg, idx, 'SHEET_1'))
                    )}
                  </div>
                </div>

                {/* Sheet 1 Footer */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider shrink-0">
                  <span>{company?.name || 'Ooting Holidays'} • Handcrafted Itineraries</span>
                  <span className="font-bold">Sheet 1 of {totalPdfPages}</span>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* SUBSEQUENT SHEETS: EXACTLY 3 PACKAGES PER SHEET                           */}
              {/* ========================================================================= */}
              {subsequentPages.map((pagePackages, pIdx) => {
                const sheetNumber = 2 + pIdx;
                const startIndex = 2 + pIdx * 3;

                return (
                  <div
                    key={pIdx}
                    className="pdf-page bg-white text-slate-900 rounded-2xl shadow-xl overflow-hidden p-6 sm:p-7 flex flex-col justify-between border border-slate-200 print:border-none print:shadow-none print:rounded-none"
                    style={{
                      width: '794px',
                      minWidth: '794px',
                      maxWidth: '794px',
                      height: '1123px',
                      minHeight: '1123px',
                      maxHeight: '1123px',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                    }}
                  >
                    <div>
                      {/* Top Accent Wave Bar */}
                      <div
                        className="w-full bg-[#C91F28] overflow-hidden relative shrink-0 rounded-t-lg mb-2"
                        style={{ height: '5px', minHeight: '5px', maxHeight: '5px', backgroundColor: '#C91F28', overflow: 'hidden' }}
                      >
                        <img
                          src="/assets/ooting-header-wave.png"
                          alt=""
                          className="w-full h-full object-cover opacity-90"
                          style={{ width: '100%', height: '5px', objectFit: 'cover' }}
                        />
                      </div>

                      {/* Running Header */}
                      <div className="pb-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                          <span className="flex items-center gap-1.5 uppercase tracking-wide text-[#1E3A8A]">
                            <span>{(company?.name || 'OOTING HOLIDAYS').toUpperCase()}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-[#C91F28] font-bold">Curated Tour Catalog</span>
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            Sheet {sheetNumber} of {totalPdfPages}
                          </span>
                        </div>
                        <div className="w-full h-[1.5px] bg-[#C91F28] rounded-full mt-1.5 mb-2" />
                      </div>

                      {/* Packages on this sheet: Exactly 3 Packages */}
                      <div className="space-y-3">
                        {pagePackages.map((pkg, idx) =>
                          renderPackageCard(pkg, startIndex + idx, 'SUBSEQUENT')
                        )}
                      </div>
                    </div>

                    {/* Sheet Footer */}
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider shrink-0">
                      <span>{company?.website || 'www.ooting.in'} • Contact: {company?.phone || '+91 8884845595'}</span>
                      <span className="font-bold">Sheet {sheetNumber} of {totalPdfPages}</span>
                    </div>
                  </div>
                );
              })}

              {/* ========================================================================= */}
              {/* FINAL SHEET: EXECUTIVE CLOSING PAGE (Thank You, Reviews, Contact Card)     */}
              {/* ========================================================================= */}
              <div
                className="pdf-page catalog-closing-section bg-white text-slate-900 rounded-2xl shadow-xl overflow-hidden p-6 sm:p-7 flex flex-col justify-between border border-slate-200 print:border-none print:shadow-none print:rounded-none"
                style={{
                  width: '794px',
                  minWidth: '794px',
                  maxWidth: '794px',
                  height: '1123px',
                  minHeight: '1123px',
                  maxHeight: '1123px',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                }}
              >
                <div>
                  {/* Top Accent Wave Bar */}
                  <div
                    className="w-full bg-[#C91F28] overflow-hidden relative shrink-0 rounded-t-lg mb-2"
                    style={{ height: '5px', minHeight: '5px', maxHeight: '5px', backgroundColor: '#C91F28', overflow: 'hidden' }}
                  >
                    <img
                      src="/assets/ooting-header-wave.png"
                      alt=""
                      className="w-full h-full object-cover opacity-90"
                      style={{ width: '100%', height: '5px', objectFit: 'cover' }}
                    />
                  </div>

                  {/* Running Header */}
                  <div className="pb-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center gap-1.5 uppercase tracking-wide text-[#1E3A8A]">
                        <span>{(company?.name || 'OOTING HOLIDAYS').toUpperCase()}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[#C91F28]">Verified Guest Reviews & Concierge Support</span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Sheet {totalPdfPages} of {totalPdfPages}
                      </span>
                    </div>
                    <div className="w-full h-[1.5px] bg-[#C91F28] rounded-full mt-1.5" />
                  </div>

                  <div className="space-y-4">
                    {/* 1. Happy Moments & Guest Memories Gallery Strip */}
                    {(() => {
                      const parsedGallery = parseGalleryUrls(company?.tripGallery);
                      const galleryPhotos = parsedGallery.length > 0
                        ? parsedGallery.map((url, idx) => ({
                            url,
                            caption: idx === 0 ? 'Scenic Views' : idx === 1 ? 'Family Moments' : idx === 2 ? 'Serene Escapes' : 'Luxury Resorts',
                          }))
                        : DEFAULT_TRIP_GALLERY;

                      return (
                        <div className="space-y-1.5 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200">
                          <div className="flex items-center justify-between pb-1">
                            <div className="flex items-center gap-1.5">
                              <Camera className="w-3.5 h-3.5 text-[#C91F28]" />
                              <span className="text-xs font-bold text-slate-800 uppercase tracking-tight">
                                Happy Moments & Guest Memories
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold text-slate-500">
                              Real Moments from Our Tours
                            </span>
                          </div>

                          <div className="grid grid-cols-4 gap-2.5">
                            {galleryPhotos.slice(0, 4).map((item, gIdx) => (
                              <div
                                key={gIdx}
                                className="happy-moment-card bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs group"
                              >
                                <div
                                  className="relative w-full bg-slate-900/5 flex items-center justify-center overflow-hidden"
                                  style={{ width: '100%', height: '90px', maxHeight: '90px', minHeight: '90px' }}
                                >
                                  <img
                                    src={item.url}
                                    alt={item.caption || 'Trip Photo'}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    style={{ width: '100%', height: '90px', maxHeight: '90px', objectFit: 'cover' }}
                                    crossOrigin="anonymous"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      const target = e.currentTarget;
                                      target.onerror = null;
                                      const parentCard = target.closest('.happy-moment-card');
                                      if (parentCard) (parentCard as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                </div>
                                <div className="px-1.5 py-1 bg-slate-50 border-t border-slate-200 text-center text-[9.5px] font-bold text-slate-700 truncate">
                                  {item.caption || 'Traveler Memory'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* 2. Verified Guest Reviews & Testimonials */}
                    <div className="p-4 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white rounded-2xl border border-blue-200/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-2xs">
                            <Star className="w-3.5 h-3.5 fill-current text-slate-950" />
                            <span>{String(company?.reviewRating || '4.9')} / 5.0</span>
                          </div>
                          <span className="text-xs font-bold text-slate-800">
                            Rated by {company?.reviewCount || '1,250+'} Happy Travelers
                          </span>
                        </div>

                        <div className="text-[10.5px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          ✓ Verified 100% Authentic Feedback
                        </div>
                      </div>

                      {/* Testimonial Quote */}
                      <blockquote className="text-xs text-slate-700 italic border-l-2 border-[#C91F28] pl-3 py-1 flex items-start gap-2">
                        <Quote className="w-4 h-4 text-[#C91F28] shrink-0 mt-0.5 opacity-80" />
                        <span>
                          "{company?.reviewQuote || 'Our family trip with Ooting was completely breathtaking! Impeccable cabs, punctual chauffeurs, and handpicked luxury resorts.'}"
                        </span>
                      </blockquote>
                      <div className="text-right text-[11px] font-bold text-[#1E3A8A]">
                        — {company?.reviewAuthor || 'Rajesh & Family, Bangalore'}
                      </div>
                    </div>

                    {/* 3. Professional THANK YOU Header */}
                    <div className="pt-1 text-center max-w-xl mx-auto w-full flex flex-col items-center">
                      <h2 className="text-2xl font-black uppercase tracking-tight text-[#1E3A8A] leading-tight">
                        THANK YOU
                      </h2>
                      <div className="w-12 h-0.5 bg-[#C91F28] rounded-full mx-auto my-1.5" />
                      <p className="text-xs font-medium text-slate-600 italic text-center leading-relaxed">
                        Thank you for choosing {company?.name || 'Ooting Holidays'} — we look forward to curating your next unforgettable journey.
                      </p>
                    </div>

                    {/* 4. Professional Company Details Card with Clickable Links */}
                    <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left shadow-2xs space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200 gap-2">
                        <div>
                          <h3 className="font-extrabold text-sm text-[#1E3A8A] uppercase tracking-tight">
                            {(company?.name || 'OOTING HOLIDAYS').toUpperCase()}
                          </h3>
                          <span className="text-xs font-bold text-[#C91F28] uppercase tracking-wide block mt-0.5">
                            {company?.tagline || 'Journeys Beyond Ordinary'}
                          </span>
                        </div>

                        {/* Clickable Social Media Badges */}
                        <div className="flex items-center gap-2">
                          {company?.facebookUrl && (
                            <a
                              href={company.facebookUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-7 h-7 rounded-full bg-[#1877F2]/10 hover:bg-[#1877F2] text-[#1877F2] hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                              title="Visit Facebook"
                            >
                              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                              </svg>
                            </a>
                          )}
                          {company?.instagramUrl && (
                            <a
                              href={company.instagramUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-7 h-7 rounded-full bg-[#E4405F]/10 hover:bg-[#E4405F] text-[#E4405F] hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                              title="Visit Instagram"
                            >
                              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                              </svg>
                            </a>
                          )}
                          {company?.youtubeUrl && (
                            <a
                              href={company.youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-7 h-7 rounded-full bg-[#FF0000]/10 hover:bg-[#FF0000] text-[#FF0000] hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                              title="Visit YouTube"
                            >
                              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                              </svg>
                            </a>
                          )}
                          {company?.website && (
                            <a
                              href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-7 h-7 rounded-full bg-blue-50 hover:bg-[#1E3A8A] text-[#1E3A8A] hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                              title="Visit Website"
                            >
                              <Globe className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Clean 2-Column Contact Grid */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {/* Phone */}
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-red-50 text-[#C91F28] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                            <Phone className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Helpline / Contact</span>
                            <a
                              href={`tel:${(company?.phone || '+918884845595').replace(/[^0-9+]/g, '')}`}
                              className="font-bold text-slate-900 text-xs hover:text-[#C91F28] transition-colors"
                            >
                              {company?.phone || '+91 8884845595'}
                              {(company as any)?.alternatePhone && ` / ${(company as any).alternatePhone}`}
                            </a>
                          </div>
                        </div>

                        {/* Email */}
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-red-50 text-[#C91F28] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                            <Mail className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Email Support</span>
                            <a
                              href={`mailto:${company?.email || 'support@ooting.in'}`}
                              className="font-bold text-slate-900 text-xs break-all hover:text-[#C91F28] transition-colors"
                            >
                              {company?.email || 'support@ooting.in'}
                            </a>
                          </div>
                        </div>

                        {/* Website */}
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-red-50 text-[#C91F28] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                            <Globe className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Official Website</span>
                            <a
                              href={company?.website?.startsWith('http') ? company.website : `https://${company?.website || 'www.ooting.in'}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-slate-900 text-xs hover:text-[#C91F28] transition-colors"
                            >
                              {company?.website || 'www.ooting.in'}
                            </a>
                          </div>
                        </div>

                        {/* Registered Office */}
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-red-50 text-[#C91F28] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                            <MapPin className="w-3.5 h-3.5" />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Registered Office</span>
                            <div className="font-bold text-slate-800 text-[11px] leading-tight">
                              {company?.address || 'Ooting 3rd Cross, Malavagoppa, BH Road, Shivamogga, Karnataka, India'}
                            </div>
                            {company?.googleMapUrl && (
                              <a
                                href={company.googleMapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors cursor-pointer w-fit"
                              >
                                <MapPin className="w-3 h-3 text-emerald-600" />
                                <span>Navigate on Google Maps ↗</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 5. Terms / Notes */}
                    <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[10px] text-amber-900 leading-relaxed">
                      <strong>Important Note:</strong> Rates are indicative per person on twin-sharing basis and subject to seasonal vehicle & hotel availability at the time of final confirmation. Customizations for group sizes (2, 4, 6, 8, 12+ pax) with dedicated private chauffeur and vehicle options available upon request.
                    </div>
                  </div>
                </div>

                {/* Final Sheet Footer */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider shrink-0">
                  <span>{company?.name || 'Ooting Holidays'} • {company?.tagline || 'Journeys Beyond Ordinary'}</span>
                  <span className="font-bold">Sheet {totalPdfPages} of {totalPdfPages}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
