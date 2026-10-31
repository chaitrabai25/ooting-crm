import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Printer,
  ArrowLeft,
  Clock,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  Globe,
  Camera,
  Share2,
  FileText,
  Download,
  Loader2,
  Compass,
  Building2,
  Star,
  Coffee,
  ShieldCheck,
  Car,
  Headphones,
  Sparkles,
  ExternalLink,
  Quote,
  Shield,
  HeartHandshake,
  Award,
  Users,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Package, ItineraryDay, PackageCustomBrandingData, HotelPlanOption, PricingTierRow } from '../../types/index.js';
import { useCompanySettings } from '../../context/CompanySettingsContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { generateA4Pdf } from '../../utils/pdfGenerator.js';
import { printElement } from '../../utils/printDocument.js';
import { openWhatsAppShare, copyToClipboard } from '../../utils/whatsappHelper.js';
import { BrandLoader } from '../../components/ui/BrandLoader.js';
import { notifyError, notifySuccess, ootingSwal, showToast } from '../../utils/sweetalert.js';

export interface HotelPhotoDisplay {
  url: string;
  caption: string;
}

export const DESTINATION_HERO_FALLBACKS: Record<string, string> = {
  coorg: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1400&auto=format&fit=crop&q=80',
  ooty: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=1400&auto=format&fit=crop&q=80',
  mysore: 'https://images.unsplash.com/photo-1600100397608-f010f444f434?w=1400&auto=format&fit=crop&q=80',
  kerala: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1400&auto=format&fit=crop&q=80',
  wayanad: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1400&auto=format&fit=crop&q=80',
  goa: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1400&auto=format&fit=crop&q=80',
  andaman: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=1400&auto=format&fit=crop&q=80',
  south: 'https://images.unsplash.com/photo-1600100397608-f010f444f434?w=1400&auto=format&fit=crop&q=80',
  default: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1400&auto=format&fit=crop&q=80',
};

export const DEFAULT_TRIP_GALLERY = [
  { url: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=600&auto=format&fit=crop&q=80', caption: 'Breathtaking Viewpoints' },
  { url: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&auto=format&fit=crop&q=80', caption: 'Cherished Family Moments' },
  { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80', caption: 'Serene Nature & Escapes' },
  { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80', caption: 'Luxury Stays & Heritage' },
];

export function getHeroBannerImage(pkg: any, customData?: PackageCustomBrandingData): string {
  if (customData?.bannerImageUrl && customData.bannerImageUrl.trim()) {
    return customData.bannerImageUrl.trim();
  }
  if (pkg.imageUrl && pkg.imageUrl.trim() && pkg.imageUrl !== 'null') {
    return pkg.imageUrl.trim();
  }
  const nameAndDest = `${pkg.packageName || ''} ${pkg.destination || ''}`.toLowerCase();
  for (const [key, url] of Object.entries(DESTINATION_HERO_FALLBACKS)) {
    if (key !== 'default' && nameAndDest.includes(key)) return url;
  }
  return DESTINATION_HERO_FALLBACKS.default;
}

export function getTruncatedDescription(desc?: string | null, maxWords = 55): string {
  if (!desc) return '';
  const clean = desc.trim();
  const words = clean.split(/\s+/);
  if (words.length <= maxWords) return clean;
  return words.slice(0, maxWords).join(' ') + '...';
}

const parseBulletPoints = (text?: string | null): string[] => {
  if (!text || !text.trim()) return [];
  const raw = text.trim();
  // Check if multiline
  const lines = raw
    .split(/\r?\n/)
    .map((s) => s.replace(/^[\s•\-\*\d\.\)\✓\✔\✕\✖\—]+/, '').trim())
    .filter(Boolean);
  if (lines.length > 1) return lines;

  // If on a single line separated by commas or semicolons
  if (raw.includes(',') || raw.includes(';')) {
    return raw
      .split(/[,;]/)
      .map((s) => s.replace(/^[\s•\-\*\d\.\)\✓\✔\✕\✖\—]+/, '').trim())
      .filter(Boolean);
  }

  return [raw];
};

const parseCommaList = (text?: string | null): string[] => {
  if (!text || !text.trim()) return [];
  return text
    .split(/[,•|]+/)
    .map((s) => s.trim())
    .filter((s) => Boolean(s) && s !== 'null' && s !== 'undefined');
};

const renderRouteSegments = (text: string) => {
  if (text.includes('→') || text.includes('->') || text.includes('—>')) {
    const segments = text.split(/→|->|—>/);
    return (
      <span className="inline">
        {segments.map((seg, idx) => (
          <React.Fragment key={idx}>
            <span className="text-[#1E3A8A] font-bold">
              {seg.trim()}
            </span>
            {idx < segments.length - 1 && (
              <span className="text-[#C91F28] font-bold mx-1.5 text-sm">→</span>
            )}
          </React.Fragment>
        ))}
      </span>
    );
  }
  return <span className="text-[#1E3A8A] font-bold">{text}</span>;
};

const renderColoredDayTitle = (rawTitle: string) => {
  const cleanTitle = (rawTitle || '').replace(/^Day\s*\d+:?\s*/i, '').trim() || (rawTitle || '').trim();
  if (!cleanTitle) return <span className="text-[#1E3A8A] font-bold">Sightseeing & Tour Schedule</span>;

  // If title has a pipe '|' separating route and subtitle: e.g. "Mangalore Airport → Coorg | Scenic Journey to the Coffee Hills"
  if (cleanTitle.includes('|')) {
    const parts = cleanTitle.split('|');
    const mainRoute = parts[0].trim();
    const subTheme = parts.slice(1).join('|').trim();

    return (
      <span className="inline">
        {renderRouteSegments(mainRoute)}
        <span className="text-[#C91F28] font-bold mx-2">|</span>
        <span className="text-[#C91F28] font-medium">{subTheme}</span>
      </span>
    );
  }

  // If title has a colon ':' separating destination and activity: e.g. "Explore Coorg: Nature, Culture & Scenic Beauty"
  if (cleanTitle.includes(':')) {
    const parts = cleanTitle.split(':');
    const dest = parts[0].trim();
    const desc = parts.slice(1).join(':').trim();

    return (
      <span className="inline">
        <span className="text-[#1E3A8A] font-bold">{dest}</span>
        <span className="text-[#C91F28] font-bold mx-1.5">:</span>
        <span className="text-[#C91F28] font-medium">{desc}</span>
      </span>
    );
  }

  // If title has a dash ' - ' or ' — ' separating destination and activity
  if (cleanTitle.includes(' - ') || cleanTitle.includes(' — ')) {
    const parts = cleanTitle.split(/\s*[-—]\s*/);
    const dest = parts[0].trim();
    const desc = parts.slice(1).join(' — ').trim();

    return (
      <span className="inline">
        {renderRouteSegments(dest)}
        <span className="text-[#C91F28] font-bold mx-2">—</span>
        <span className="text-[#C91F28] font-medium">{desc}</span>
      </span>
    );
  }

  return renderRouteSegments(cleanTitle);
};

export const PdfPageHeader: React.FC<{
  branding: any;
  packageName: string;
  pageLabel: string;
}> = ({ branding, packageName, pageLabel }) => (
  <div className="pdf-page-header px-8 py-2.5 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-5 h-5 rounded-md bg-[#C91F28] text-white flex items-center justify-center font-black text-[10px] shrink-0">
        {branding.agencyName ? branding.agencyName.slice(0, 2) : 'OT'}
      </div>
      <span className="font-extrabold uppercase tracking-tight text-slate-900 text-[11px] shrink-0">
        {branding.agencyName}
      </span>
      <span className="text-slate-300 shrink-0">|</span>
      <span className="text-[#1E3A8A] font-semibold truncate max-w-[320px]">
        {packageName}
      </span>
    </div>
    <div className="flex items-center gap-2 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
      <span>{pageLabel}</span>
    </div>
  </div>
);

export const PdfPageFooter: React.FC<{
  branding: any;
  packageName: string;
  pageNumber: number;
  totalLabel?: string;
}> = ({ branding, packageName, pageNumber, totalLabel }) => (
  <div className="pdf-page-footer px-8 py-2 bg-slate-50/90 border-t border-slate-200 flex items-center justify-between text-[10.5px] text-slate-500">
    <div className="flex items-center gap-3">
      <span className="font-bold text-slate-800 uppercase tracking-wider">
        {branding.agencyName}
      </span>
      {branding.phone && (
        <span className="text-slate-600 hidden sm:inline">📞 {branding.phone}</span>
      )}
      {branding.website && (
        <span className="text-slate-600 hidden sm:inline">🌐 {branding.website}</span>
      )}
    </div>
    <div className="flex items-center gap-2">
      <span className="text-slate-400 truncate max-w-[220px] hidden md:inline">
        {packageName}
      </span>
      <span className="px-2.5 py-0.5 rounded-full bg-slate-200/90 font-black text-slate-700 text-[10px]">
        Page {pageNumber}{totalLabel ? ` • ${totalLabel}` : ''}
      </span>
    </div>
  </div>
);

export const ItineraryPdfView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { company, effectiveLogoUrl } = useCompanySettings();
  const { language, setLanguage, t } = useLanguage();

  const [pkg, setPkg] = useState<Package | null>(null);
  const [hotelsLookup, setHotelsLookup] = useState<Map<string, any>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);


  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        if (!id) return;
        setIsLoading(true);

        let packageData: any = null;
        try {
          // 1. Try authenticated package endpoint with fresh flag
          const pkgRes = await api.get(`/packages/${id}?fresh=true&_t=${Date.now()}`);
          packageData = pkgRes.data;
        } catch {
          // 2. If 401 or unauthorized/not found, fallback to public itinerary endpoint
          try {
            const pubRes = await api.get(`/packages/public/${id}?_t=${Date.now()}`);
            packageData = pubRes.data;
          } catch (pubErr) {
            console.error('Failed to load package from public endpoint:', pubErr);
          }
        }

        if (!isMounted) return;
        if (!packageData) {
          setPkg(null);
          return;
        }
        setPkg(packageData);

        // Prepopulate lookup from embedded itinerary hotel details
        const lookup = new Map<string, any>();
        (packageData.itineraries || []).forEach((d: any) => {
          if (d.hotelName) {
            lookup.set(d.hotelName.toLowerCase().trim(), {
              id: d.hotelId,
              name: d.hotelName,
              imageUrl: d.hotelImageUrl,
              starCategory: d.hotelStarCategory,
              city: d.hotelLocation,
              details: d.hotelDetails,
              checkIn: d.hotelCheckIn,
              checkOut: d.hotelCheckOut,
            });
          }
          if (d.hotelId) {
            lookup.set(d.hotelId, {
              id: d.hotelId,
              name: d.hotelName,
              imageUrl: d.hotelImageUrl,
              starCategory: d.hotelStarCategory,
              city: d.hotelLocation,
              details: d.hotelDetails,
              checkIn: d.hotelCheckIn,
              checkOut: d.hotelCheckOut,
            });
          }
        });

        // Concurrently fetch full details/galleries only if user has a token
        const token = localStorage.getItem('ooting_crm_token');
        const neededHotelIds = Array.from(
          new Set(
            (packageData.itineraries || [])
              .map((d: any) => d.hotelId)
              .filter(Boolean)
          )
        ) as string[];

        if (token && neededHotelIds.length > 0) {
          try {
            const hotelFetches = neededHotelIds.map((hId) =>
              api.get(`/hotels/${hId}?_t=${Date.now()}`).catch(() => null)
            );
            const hotelResults = await Promise.all(hotelFetches);
            hotelResults.forEach((res) => {
              if (res?.data) {
                const h = res.data;
                if (h.id) lookup.set(h.id, h);
                if (h.name) lookup.set(h.name.toLowerCase().trim(), h);
              }
            });
          } catch {}
        }

        if (isMounted) {
          setHotelsLookup(lookup);
        }
      } catch (err) {
        console.error('Failed to load package itinerary for PDF:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    if (id) fetchData();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const getHotelPhotos = (day: ItineraryDay): HotelPhotoDisplay[] => {
    const result: HotelPhotoDisplay[] = [];
    const addedUrls = new Set<string>();

    const addPhoto = (url?: string | null, caption?: string | null) => {
      if (!url) return;
      const cleanUrl = url.trim();
      if (!cleanUrl || cleanUrl === 'null' || cleanUrl === 'undefined' || addedUrls.has(cleanUrl)) return;
      addedUrls.add(cleanUrl);
      result.push({
        url: cleanUrl,
        caption: caption && caption.trim() ? caption.trim() : 'Property Accommodation',
      });
    };

    if (day.hotelImageUrl) {
      addPhoto(day.hotelImageUrl, 'Property Accommodation');
    }

    let matchedHotel = null;
    if (day.hotelId && hotelsLookup.has(day.hotelId)) {
      matchedHotel = hotelsLookup.get(day.hotelId);
    } else if (day.hotelName && hotelsLookup.has(day.hotelName.toLowerCase().trim())) {
      matchedHotel = hotelsLookup.get(day.hotelName.toLowerCase().trim());
    }

    if (matchedHotel) {
      if (matchedHotel.imageUrl) {
        addPhoto(matchedHotel.imageUrl, 'Main Property / Exterior');
      }
      if (matchedHotel.gallery) {
        try {
          const gal = typeof matchedHotel.gallery === 'string' ? JSON.parse(matchedHotel.gallery) : matchedHotel.gallery;
          if (Array.isArray(gal)) {
            gal.forEach((g: any) => {
              if (typeof g === 'string') {
                addPhoto(g, 'Hotel Accommodation');
              } else if (g && typeof g === 'object') {
                addPhoto(g.url, g.caption || g.label || 'Hotel Feature');
              }
            });
          }
        } catch {}
      }
      if (matchedHotel.images) {
        try {
          const imgs = typeof matchedHotel.images === 'string' ? JSON.parse(matchedHotel.images) : matchedHotel.images;
          if (Array.isArray(imgs)) {
            imgs.forEach((img: any) => {
              if (typeof img === 'string') {
                addPhoto(img, 'Hotel Accommodation');
              } else if (img && typeof img === 'object') {
                addPhoto(img.url, img.caption || img.label || 'Hotel Feature');
              }
            });
          }
        } catch {}
      }
    }

    return result;
  };

  const handlePrint = async () => {
    if (!pkg) return;
    const cleanTitle = (pkg.packageName || 'Itinerary').replace(/[^a-zA-Z0-9]/g, '_');
    await printElement('itinerary-document', {
      title: `Itinerary_${cleanTitle}`,
    });
  };

  const handleDownloadPdf = async () => {
    if (!pkg) return;
    try {
      setIsGeneratingPdf(true);
      const cleanTitle = (pkg.packageName || 'Itinerary').replace(/[^a-zA-Z0-9]/g, '_');
      notifySuccess('Preparing PDF', 'Generating high-resolution official tour itinerary PDF...');
      try {
        const { download } = await generateA4Pdf({
          elementId: 'itinerary-document',
          filename: `Itinerary_${cleanTitle}.pdf`,
          title: pkg.packageName,
          onePageOnly: false,
          margin: 6,
        });
        await download();
      } catch (genErr) {
        console.warn('Canvas PDF export fallback to print pipeline:', genErr);
        await printElement('itinerary-document', {
          title: `Itinerary_${cleanTitle}`,
        });
      }
    } catch (err) {
      console.error('Failed to download itinerary PDF:', err);
      notifyError('Print Error', 'Could not open print window. Please try again or use the Print button.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <BrandLoader size="lg" text="Loading Tour Itinerary..." subtext="Retrieving day-by-day travel schedule" />
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 gap-3">
        <p className="text-slate-600 text-sm">Package itinerary could not be loaded.</p>
        <button
          onClick={() => navigate('/packages')}
          className="px-4 py-2 bg-[#C91F28] text-white text-xs font-semibold rounded-xl"
        >
          Return to Packages
        </button>
      </div>
    );
  }

  const itineraries: ItineraryDay[] = pkg.itineraries || [];

  const isB2B = Boolean(pkg?.b2bAgencyName && pkg.b2bAgencyName.trim());

  let customData: PackageCustomBrandingData = {};
  if (pkg.customBranding) {
    try {
      customData = typeof pkg.customBranding === 'string'
        ? JSON.parse(pkg.customBranding)
        : (pkg.customBranding || {});
    } catch {
      customData = {};
    }
  }

  const activeBranding = {
    isB2B,
    agencyName: isB2B ? pkg.b2bAgencyName!.trim() : (company?.name || 'OOTING HOLIDAYS').toUpperCase(),
    tagline: isB2B
      ? (pkg.b2bTagline || 'Authorized Travel Partner')
      : (company?.tagline || 'Journeys Beyond Ordinary'),
    subtitle: isB2B
      ? (pkg.b2bContactPerson ? `Authorized Travel Partner • Contact: ${pkg.b2bContactPerson}` : 'Authorized Travel Partner')
      : (company?.tagline || 'Premium Tour Operator & Destination Specialist'),
    logoUrl: isB2B ? (pkg.b2bAgencyLogo || null) : (effectiveLogoUrl || company?.logoUrl || null),
    phone: isB2B ? (pkg.b2bPhone || '') : (company?.phone || '+91 8884845595'),
    alternatePhone: isB2B ? (pkg.b2bAlternatePhone || '') : '',
    email: isB2B ? (pkg.b2bEmail || '') : (company?.email || 'support@ooting.in'),
    website: isB2B ? (pkg.b2bWebsite || '') : (company?.website || 'www.ooting.in'),
    gstin: isB2B ? (pkg.b2bGstin || '') : (company?.gstin || ''),
    address: isB2B
      ? [pkg.b2bAddress, pkg.b2bCity, pkg.b2bState].filter(Boolean).join(', ')
      : (company?.address || 'Ooting 3rd Cross, Malavagoppa, BH Road, Shivamogga, Karnataka, India'),
    signatureName: isB2B
      ? pkg.b2bAgencyName!.trim()
      : (company?.name || 'Ooting Holidays'),
    facebookUrl: !isB2B ? (company?.facebookUrl || 'https://facebook.com/ooting.in') : '',
    instagramUrl: !isB2B ? (company?.instagramUrl || 'https://instagram.com/ooting.in') : '',
    youtubeUrl: !isB2B ? (company?.youtubeUrl || '') : '',
    googleMapUrl: !isB2B ? (company?.googleMapUrl || 'https://maps.google.com/?q=Ooting+Holidays+Shivamogga') : '',
    reviewRating: company?.reviewRating || '4.9',
    reviewCount: company?.reviewCount || '1,250+',
    reviewQuote: company?.reviewQuote || 'Our family trip with Ooting was completely breathtaking! Impeccable cabs, punctual chauffeurs, and handpicked luxury resorts.',
    reviewAuthor: company?.reviewAuthor || 'Rajesh & Family, Bangalore',
    tripGallery: company?.tripGallery || '',
  };

  const basePrice = Number(pkg?.price) || 12000;
  const firstTier = customData.pricingTiers?.[0]?.plans;
  const samplePricing = {
    budget: firstTier?.budget?.doubleSharing || basePrice,
    standard: firstTier?.standard?.doubleSharing || Math.round(basePrice * 1.15),
    deluxe: firstTier?.deluxe?.doubleSharing || Math.round(basePrice * 1.35),
    luxury: firstTier?.luxury?.doubleSharing || Math.round(basePrice * 1.75),
  };

  const effectiveHotelOptions: HotelPlanOption[] = (() => {
    if (Array.isArray(customData.hotelOptions) && customData.hotelOptions.length > 0) {
      return customData.hotelOptions;
    }
    const cities = new Set<string>();
    const options: HotelPlanOption[] = [];
    itineraries.forEach((d) => {
      const city = d.hotelLocation || pkg?.destination || 'Destination';
      if (!cities.has(city)) {
        cities.add(city);
        options.push({
          city,
          nights: 1,
          budgetHotel: d.hotelName || 'Comfort 3-Star Inn / Similar',
          standardHotel: 'Quality 3-Star Deluxe / Similar',
          deluxeHotel: 'Handpicked 4-Star Resort / Similar',
          luxuryHotel: 'Taj / 5-Star Heritage / Similar',
        });
      }
    });
    if (options.length > 0) return options;
    return [
      {
        city: pkg?.destination || 'Tour Destination',
        nights: itineraries.length || 1,
        budgetHotel: 'Comfort 3-Star Inn / Similar',
        standardHotel: 'Quality 3-Star Deluxe / Similar',
        deluxeHotel: 'Handpicked 4-Star Resort / Similar',
        luxuryHotel: 'Taj / 5-Star Heritage / Similar',
      },
    ];
  })();

  const tiers: PricingTierRow[] = (() => {
    if (Array.isArray(customData.pricingTiers) && customData.pricingTiers.length > 0) {
      return customData.pricingTiers;
    }
    const base = basePrice;
    return [
      {
        paxCount: '2 Pax',
        vehicle: 'Dedicated AC Sedan (Dzire / Etios)',
        plans: {
          budget: { doubleSharing: base, tripleSharing: Math.round(base * 0.9), cwb: Math.round(base * 0.65), cnb: Math.round(base * 0.45) },
          standard: { doubleSharing: Math.round(base * 1.15), tripleSharing: Math.round(base * 1.05), cwb: Math.round(base * 0.75), cnb: Math.round(base * 0.5) },
          deluxe: { doubleSharing: Math.round(base * 1.35), tripleSharing: Math.round(base * 1.2), cwb: Math.round(base * 0.85), cnb: Math.round(base * 0.55) },
          luxury: { doubleSharing: Math.round(base * 1.75), tripleSharing: Math.round(base * 1.55), cwb: Math.round(base * 1.1), cnb: Math.round(base * 0.7) },
        },
      },
      {
        paxCount: '4 Pax',
        vehicle: 'Dedicated AC SUV (Ertiga / Innova)',
        plans: {
          budget: { doubleSharing: Math.round(base * 0.88), tripleSharing: Math.round(base * 0.8), cwb: Math.round(base * 0.58), cnb: Math.round(base * 0.4) },
          standard: { doubleSharing: Math.round(base * 1.02), tripleSharing: Math.round(base * 0.92), cwb: Math.round(base * 0.66), cnb: Math.round(base * 0.45) },
          deluxe: { doubleSharing: Math.round(base * 1.2), tripleSharing: Math.round(base * 1.05), cwb: Math.round(base * 0.75), cnb: Math.round(base * 0.48) },
          luxury: { doubleSharing: Math.round(base * 1.55), tripleSharing: Math.round(base * 1.35), cwb: Math.round(base * 0.95), cnb: Math.round(base * 0.62) },
        },
      },
      {
        paxCount: '6 Pax',
        vehicle: 'AC Innova Crysta',
        plans: {
          budget: { doubleSharing: Math.round(base * 0.82), tripleSharing: Math.round(base * 0.74), cwb: Math.round(base * 0.54), cnb: Math.round(base * 0.38) },
          standard: { doubleSharing: Math.round(base * 0.95), tripleSharing: Math.round(base * 0.86), cwb: Math.round(base * 0.62), cnb: Math.round(base * 0.42) },
          deluxe: { doubleSharing: Math.round(base * 1.12), tripleSharing: Math.round(base * 0.98), cwb: Math.round(base * 0.7), cnb: Math.round(base * 0.45) },
          luxury: { doubleSharing: Math.round(base * 1.45), tripleSharing: Math.round(base * 1.28), cwb: Math.round(base * 0.9), cnb: Math.round(base * 0.58) },
        },
      },
      {
        paxCount: '8 Pax',
        vehicle: 'Tempo Traveller (10 Seater)',
        plans: {
          budget: { doubleSharing: Math.round(base * 0.78), tripleSharing: Math.round(base * 0.7), cwb: Math.round(base * 0.5), cnb: Math.round(base * 0.35) },
          standard: { doubleSharing: Math.round(base * 0.9), tripleSharing: Math.round(base * 0.82), cwb: Math.round(base * 0.58), cnb: Math.round(base * 0.38) },
          deluxe: { doubleSharing: Math.round(base * 1.05), tripleSharing: Math.round(base * 0.92), cwb: Math.round(base * 0.65), cnb: Math.round(base * 0.42) },
          luxury: { doubleSharing: Math.round(base * 1.38), tripleSharing: Math.round(base * 1.2), cwb: Math.round(base * 0.85), cnb: Math.round(base * 0.55) },
        },
      },
      {
        paxCount: '10 Pax',
        vehicle: 'Tempo Traveller (12 Seater)',
        plans: {
          budget: { doubleSharing: Math.round(base * 0.74), tripleSharing: Math.round(base * 0.66), cwb: Math.round(base * 0.48), cnb: Math.round(base * 0.32) },
          standard: { doubleSharing: Math.round(base * 0.86), tripleSharing: Math.round(base * 0.78), cwb: Math.round(base * 0.55), cnb: Math.round(base * 0.35) },
          deluxe: { doubleSharing: Math.round(base * 1.0), tripleSharing: Math.round(base * 0.88), cwb: Math.round(base * 0.62), cnb: Math.round(base * 0.4) },
          luxury: { doubleSharing: Math.round(base * 1.32), tripleSharing: Math.round(base * 1.15), cwb: Math.round(base * 0.8), cnb: Math.round(base * 0.52) },
        },
      },
      {
        paxCount: '12 Pax',
        vehicle: 'Tempo Traveller (14 Seater)',
        plans: {
          budget: { doubleSharing: Math.round(base * 0.7), tripleSharing: Math.round(base * 0.62), cwb: Math.round(base * 0.45), cnb: Math.round(base * 0.3) },
          standard: { doubleSharing: Math.round(base * 0.82), tripleSharing: Math.round(base * 0.74), cwb: Math.round(base * 0.52), cnb: Math.round(base * 0.33) },
          deluxe: { doubleSharing: Math.round(base * 0.95), tripleSharing: Math.round(base * 0.84), cwb: Math.round(base * 0.58), cnb: Math.round(base * 0.38) },
          luxury: { doubleSharing: Math.round(base * 1.25), tripleSharing: Math.round(base * 1.1), cwb: Math.round(base * 0.76), cnb: Math.round(base * 0.48) },
        },
      },
    ];
  })();

  const handleShareWhatsApp = async () => {
    if (!pkg) return;

    const cleanTitle = (pkg.packageName || 'Itinerary').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Itinerary_${cleanTitle}.pdf`;

    const messageText =
      `*${activeBranding.agencyName.toUpperCase()} - TOUR ITINERARY*\n\n` +
      `Here is the official travel itinerary for *${pkg.packageName}* (${pkg.destination})!\n\n` +
      `• Duration: ${pkg.duration}\n` +
      `• Starting Price: ₹${Number(pkg.price).toLocaleString('en-IN')} Per Person\n` +
      `• Inclusions: ${pkg.inclusions || 'Standard holiday package inclusions'}\n\n` +
      `Have a look at the attached official PDF document for the complete day-by-day schedule.\n\n` +
      `Warm regards,\n*${activeBranding.signatureName}*`;

    const fullText =
      messageText +
      `\n\n📄 Note: The official Tour Itinerary PDF (${filename}) has been downloaded to your device. Please attach it here to send.`;

    // 1. Immediately copy the full message to clipboard so user can paste it anywhere
    await copyToClipboard(fullText);

    // 2. Prompt user for optional phone number or direct choice
    const isDark = document.documentElement.classList.contains('dark');
    const result = await ootingSwal.fire({
      title: 'Share Itinerary on WhatsApp',
      html: `
        <div class="text-left space-y-3 pt-2">
          <p class="text-xs text-slate-600 dark:text-slate-300">
            The itinerary message has been <strong>automatically copied to your clipboard</strong>!
          </p>
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Customer Mobile / WhatsApp Number (Optional):
            </label>
            <input
              id="swal-customer-phone"
              type="tel"
              placeholder="e.g. 9876543210 (or leave blank to search)"
              class="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#C91F28]"
            />
          </div>
          <p class="text-[11px] text-slate-500">
            • <strong>Open WhatsApp:</strong> Reuses your WhatsApp tab directly without opening duplicate tabs.<br/>
            • <strong>Copy Text Only:</strong> Keep your current tabs intact; just switch to your open WhatsApp tab and press <kbd class="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px]">Ctrl+V</kbd>.
          </p>
        </div>
      `,
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Open WhatsApp',
      denyButtonText: 'Copy Text Only',
      cancelButtonText: 'Cancel',
      background: isDark ? '#0f172a' : '#ffffff',
      color: isDark ? '#f8fafc' : '#0f172a',
      preConfirm: () => {
        const input = document.getElementById('swal-customer-phone') as HTMLInputElement;
        return input ? input.value : '';
      },
    });

    if (result.isDismissed) return;

    if (result.isConfirmed) {
      const enteredPhone = result.value || '';
      openWhatsAppShare({ phone: enteredPhone, text: fullText });
      showToast('Switched to WhatsApp & downloading PDF...', 'success');
    } else if (result.isDenied) {
      showToast('✅ Itinerary copied! Switch to your open WhatsApp tab & paste with Ctrl+V', 'success');
    }

    try {
      setIsGeneratingPdf(true);
      const { download } = await generateA4Pdf({
        elementId: 'itinerary-document',
        filename,
        title: pkg.packageName || 'Official Tour Itinerary',
        onePageOnly: false,
        margin: 8,
      });

      // Always auto-download the official PDF for immediate customer delivery
      await download();
    } catch (err) {
      console.error('WhatsApp itinerary share error:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-200/70 dark:bg-slate-950 py-8 px-4 print:p-0 print:bg-white">
      {/* Top Floating Action Bar (Hidden in Print) */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-300/80 dark:border-slate-800 shadow-md print:hidden">
        <button
          type="button"
          onClick={() => navigate('/packages/' + id)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Package</span>
        </button>

        {/* Language Switcher: English vs Kannada */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              language === 'en'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            🇬🇧 English
          </button>
          <button
            type="button"
            onClick={() => setLanguage('kn')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              language === 'kn'
                ? 'bg-[#C91F28] text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            🇮🇳 ಕನ್ನಡ
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            disabled={isGeneratingPdf}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
            title="Send official PDF itinerary on WhatsApp"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp PDF</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
            title="Download official PDF (via Print process)"
          >
            {isGeneratingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            ) : (
              <Download className="w-4 h-4 text-amber-400" />
            )}
            <span>{isGeneratingPdf ? 'Preparing Print...' : 'Download PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2 bg-[#C91F28] hover:bg-[#a81920] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Main A4 Printable Document Paper */}
      <div
        id="itinerary-document"
        lang={language}
        className={`max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden print:shadow-none print:rounded-none print:max-w-full text-slate-800 font-sans antialiased print:m-0 ${
          language === 'kn' ? 'kannada-newspaper-text' : ''
        }`}
        style={{
          fontFamily: language === 'kn'
            ? "'Noto Sans Kannada', 'Noto Serif Kannada', system-ui, serif"
            : "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800;900&family=Noto+Sans+Kannada:wght@400;500;600;700;800;900&family=Noto+Serif+Kannada:wght@400;500;600;700;800;900&display=swap');
          #itinerary-document {
            font-family: 'Inter', 'Noto Sans Kannada', 'Noto Serif Kannada', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          }
          #itinerary-document h1,
          #itinerary-document h2,
          #itinerary-document h3,
          #itinerary-document h4,
          #itinerary-document h5,
          #itinerary-document h6,
          #itinerary-document .font-heading,
          #itinerary-document .font-display,
          #itinerary-document [class*="font-heading"] {
            font-family: 'Plus Jakarta Sans', 'Noto Sans Kannada', 'Noto Serif Kannada', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          }
          #itinerary-document p,
          #itinerary-document span,
          #itinerary-document td,
          #itinerary-document th,
          #itinerary-document li {
            font-family: 'Inter', 'Noto Sans Kannada', 'Noto Serif Kannada', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }

          /* Authentic Kannada Newspaper Typography (Vijaya Karnataka / Kannada Prabha style) */
          #itinerary-document[lang="kn"],
          #itinerary-document.kannada-newspaper-text,
          .kannada-newspaper-text {
            font-family: 'Noto Sans Kannada', 'Noto Serif Kannada', system-ui, serif !important;
            letter-spacing: normal !important;
            word-spacing: normal !important;
          }
          #itinerary-document[lang="kn"] h1,
          #itinerary-document[lang="kn"] h2,
          #itinerary-document[lang="kn"] h3,
          #itinerary-document[lang="kn"] h4,
          .kannada-newspaper-text h1,
          .kannada-newspaper-text h2,
          .kannada-newspaper-text h3,
          .kannada-newspaper-text h4 {
            font-family: 'Noto Sans Kannada', 'Noto Serif Kannada', system-ui, serif !important;
            font-weight: 700 !important;
            line-height: 1.45 !important;
            letter-spacing: normal !important;
            word-spacing: normal !important;
          }
          #itinerary-document[lang="kn"] p,
          #itinerary-document[lang="kn"] span,
          #itinerary-document[lang="kn"] li,
          #itinerary-document[lang="kn"] td,
          .kannada-newspaper-text p,
          .kannada-newspaper-text span,
          .kannada-newspaper-text li,
          .kannada-newspaper-text td {
            font-family: 'Noto Sans Kannada', 'Noto Serif Kannada', system-ui, serif !important;
            line-height: 1.65 !important;
            letter-spacing: normal !important;
            word-spacing: normal !important;
          }
        `}</style>
        
        {/* ========================================================================= */}
        {/* PAGE 1: OFFICIAL COVER PAGE (Branding, Hero Banner, Overview & Highlights) */}
        {/* ========================================================================= */}
        <div
          className="pdf-page-cover flex flex-col justify-between bg-white text-slate-800"
          style={{
            breakAfter: 'page',
            pageBreakAfter: 'always',
            minHeight: '1020px',
          }}
        >
          <div>
            {/* Top Header Wave Asset */}
            <div
              className="w-full bg-[#C91F28] overflow-hidden relative shrink-0"
              style={{ width: '100%', height: '8px', minHeight: '8px', maxHeight: '8px', backgroundColor: '#C91F28', overflow: 'hidden' }}
            >
              <img
                src="/assets/ooting-header-wave.png"
                alt=""
                className="w-full h-full object-cover opacity-90"
                style={{ width: '100%', height: '8px', objectFit: 'cover' }}
              />
            </div>

            {/* Letterhead Header Section */}
            <div className="px-8 py-3.5 border-b border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* LEFT SIDE: Logo & Agency / Company Name & Tagline */}
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center bg-white p-1 border border-slate-200 shadow-2xs shrink-0"
                    style={{ width: '56px', height: '56px', minWidth: '56px', maxWidth: '56px', minHeight: '56px', maxHeight: '56px', overflow: 'hidden' }}
                  >
                    {activeBranding.logoUrl ? (
                      <img
                        src={activeBranding.logoUrl}
                        alt={activeBranding.agencyName}
                        className="max-w-full max-h-full object-contain"
                        style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          if (activeBranding.isB2B) {
                            (e.target as HTMLImageElement).style.display = 'none';
                          } else if (company?.isOoting) {
                            (e.target as HTMLImageElement).src = '/assets/ooting-logo.jpg';
                          } else {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full rounded-lg bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center font-black text-sm uppercase tracking-wider shadow-inner">
                        {activeBranding.agencyName.slice(0, 2)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xl font-black tracking-tight text-slate-900 block leading-tight uppercase">
                      {activeBranding.agencyName}
                    </span>
                    <span className="text-xs font-bold text-[#C91F28] uppercase tracking-wide block mt-0.5">
                      {activeBranding.tagline}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium block">
                      {activeBranding.subtitle}
                    </span>
                  </div>
                </div>

                {/* RIGHT SIDE: Dynamic Contact Details */}
                <div className="flex justify-end ml-auto shrink-0">
                  <div className="w-fit ml-auto flex flex-col space-y-1.5 text-xs text-slate-700 max-w-[340px]">
                    {activeBranding.website && (
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 mr-2 flex items-center justify-center shrink-0 text-[#C91F28]">
                          <Globe className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
                        </span>
                        <span className="font-semibold text-slate-800 tracking-tight break-all text-xs">{activeBranding.website}</span>
                      </div>
                    )}
                    {activeBranding.email && (
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 mr-2 flex items-center justify-center shrink-0 text-[#C91F28]">
                          <Mail className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
                        </span>
                        <span className="font-semibold text-slate-800 tracking-tight break-all text-xs">{activeBranding.email}</span>
                      </div>
                    )}
                    {activeBranding.phone && (
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 mr-2 flex items-center justify-center shrink-0 text-[#C91F28]">
                          <Phone className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
                        </span>
                        <span className="font-semibold text-slate-800 tracking-tight text-xs">
                          {activeBranding.phone}
                          {activeBranding.alternatePhone && ` / ${activeBranding.alternatePhone}`}
                        </span>
                      </div>
                    )}
                    {activeBranding.gstin && activeBranding.gstin !== 'NULL' && activeBranding.gstin !== 'NIL' && activeBranding.gstin.trim() !== '' && (
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 mr-2 flex items-center justify-center shrink-0 text-[#C91F28]">
                          <FileText className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
                        </span>
                        <span className="font-semibold text-slate-800 tracking-tight text-xs">
                          GSTIN: {activeBranding.gstin.replace(/^GSTIN:\s*/i, '')}
                        </span>
                      </div>
                    )}
                    {activeBranding.address && (
                      <div className="flex items-start gap-2 pt-0.5">
                        <span className="w-4 h-4 mr-2 flex items-center justify-center shrink-0 text-[#C91F28] mt-0.5">
                          <MapPin className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
                        </span>
                        <div className="text-slate-800 leading-snug text-[11px] font-bold whitespace-pre-line">
                          {activeBranding.address}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Flamingo-Style Cover Page Hero Image Banner */}
            <div className="relative w-full overflow-hidden bg-slate-900 border-b border-slate-200">
              <div className="relative w-full h-64 sm:h-76 overflow-hidden">
                <img
                  src={getHeroBannerImage(pkg, customData)}
                  alt={pkg.packageName}
                  className="w-full h-full object-cover contrast-105 saturate-110 brightness-[0.92]"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  referrerPolicy="no-referrer"
                />
                {/* Subtle Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-slate-900/30 pointer-events-none" />

                {/* Top Left Tour Code Badge */}
                <div className="absolute top-4 left-6 sm:left-8 flex items-center gap-2">
                  <span className="px-3.5 py-1 rounded-full bg-[#C91F28] text-white font-black text-xs uppercase tracking-wider shadow-md border border-white/20">
                    TOUR CODE: {customData.tourCode || `OT-${(pkg.destination || 'TOUR').slice(0, 3).toUpperCase()}-${pkg.id.slice(0, 4).toUpperCase()}`}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-black/60 text-white backdrop-blur-xs font-bold text-xs border border-white/20">
                    {pkg.duration}
                  </span>
                </div>

                {/* Bottom Title & Subtitle Info */}
                <div className="absolute bottom-4 left-6 right-6 sm:left-8 sm:right-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 text-white">
                  <div className="max-w-2xl">
                    <span className="text-xs font-black uppercase tracking-widest text-amber-300 drop-shadow-sm block mb-1">
                      OFFICIAL TOUR ITINERARY & VACATION PROPOSAL
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                      {pkg.packageName}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-200 font-medium mt-1 drop-shadow-sm flex items-center gap-2">
                      <span>{customData.theme || `${pkg.destination} Scenic Holiday & Curated Tour`}</span>
                      <span>•</span>
                      <span className="text-amber-200 font-semibold">{itineraries.length} Days Planned</span>
                    </p>
                  </div>

                  <div className="sm:text-right shrink-0 bg-black/50 backdrop-blur-xs p-3 rounded-xl border border-white/25">
                    <span className="text-[10px] text-slate-300 uppercase tracking-wider font-bold block">
                      {t('starting_price', 'Starting From')}
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-amber-400 block">
                      ₹{Number(pkg.price).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-300 font-medium block">Per Person (All Inclusive)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Vacation at a Glance & Quick Snapshot Box */}
            <div className="px-8 py-3.5 bg-slate-50/80 border-b border-slate-200 space-y-3">
              {/* Quick Badges Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-red-50 text-[#C91F28] flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">Destinations</span>
                    <span className="font-bold text-xs text-slate-900 truncate block">{pkg.destination}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1E3A8A] flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">Duration</span>
                    <span className="font-bold text-xs text-slate-900 truncate block">{pkg.duration}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                    <Car className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">Private Vehicle</span>
                    <span className="font-bold text-xs text-slate-900 truncate block">Dedicated AC Cab</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <Coffee className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">Meal Plan</span>
                    <span className="font-bold text-xs text-slate-900 truncate block">Daily Buffet Breakfast</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Overview & Truncated Description (Word limit: max 55 words so it stays on Page 1) */}
            <div className="px-8 py-3.5 space-y-3">
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-3.5 bg-[#C91F28] rounded-full inline-block"></span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E3A8A]">
                    Tour Overview & Destination Experience
                  </h3>
                </div>
                <p className="text-[12px] text-slate-700 leading-relaxed font-normal">
                  {getTruncatedDescription(pkg.description, 55) || `Experience the captivating sights, scenic landscapes, and cultural heritage of ${pkg.destination}. Handcrafted for memorable comfort, seamless private transfers, and handpicked premium accommodation.`}
                </p>
              </div>

              {/* Vacation Highlights Box */}
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-3.5 bg-[#1E3A8A] rounded-full inline-block"></span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E3A8A]">
                      Vacation at a Glance & Major Highlights
                    </h3>
                  </div>
                  <span className="text-[10.5px] font-bold text-[#C91F28] uppercase tracking-wide">
                    Handcrafted Holiday
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-slate-800">
                  {(Array.isArray(customData.highlights) && customData.highlights.length > 0
                    ? customData.highlights.slice(0, 6)
                    : itineraries.slice(0, 6).map((d) => d.title || `Day ${d.dayNumber}: ${d.places || 'Sightseeing Tour'}`)
                  ).map((item, hIdx) => (
                    <div key={hIdx} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        ✓
                      </span>
                      <span className="font-medium leading-tight text-slate-800">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Page 1 Footer Bar */}
          <PdfPageFooter
            branding={activeBranding}
            packageName={pkg.packageName}
            pageNumber={1}
          />
        </div>

        {/* ========================================================================= */}
        {/* PAGE 2: TOUR PRICING & HOTEL ACCOMMODATION MATRIX (WITH AMOUNTS)         */}
        {/* ========================================================================= */}
        <div
          className="pdf-page-pricing flex flex-col justify-between bg-white text-slate-800"
          style={{
            breakAfter: 'page',
            pageBreakAfter: 'always',
            minHeight: '1020px',
          }}
        >
          <div>
            <PdfPageHeader
              branding={activeBranding}
              packageName={pkg.packageName}
              pageLabel="Tour Pricing & Hotel Plans"
            />

            <div className="px-8 py-5 space-y-4">
              {/* Flamingo-Style Multi-Pax Tiered Pricing Matrix */}
              <div className="itinerary-pricing-matrix border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white space-y-0">
                <div className="px-5 py-3 bg-gradient-to-r from-[#1E3A8A] via-blue-900 to-[#1E3A8A] text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-4 bg-amber-400 rounded-full inline-block" />
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base uppercase tracking-tight text-white">
                        Executive Tour Cost & Tiered Pricing Matrix
                      </h3>
                      <p className="text-[10.5px] text-blue-200">
                        Per Person Rates in Indian Rupees (INR) based on Pax Count & Hotel Star Plan
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-white/15 text-amber-300 border border-white/20 rounded-full text-xs font-bold uppercase tracking-wider w-fit">
                    Flamingo Executive Model
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold uppercase tracking-wider text-[10.5px] border-b border-slate-200">
                        <th className="p-2.5 border-r border-slate-200 w-36">Pax & Vehicle</th>
                        <th className="p-2 border-r border-slate-200 text-center bg-blue-50/60 text-[#1E3A8A]">
                          Budget (3★)
                        </th>
                        <th className="p-2 border-r border-slate-200 text-center bg-slate-50 text-slate-700">
                          Standard Plan
                        </th>
                        <th className="p-2 border-r border-slate-200 text-center bg-amber-50/60 text-amber-900">
                          Deluxe (4★ Premium)
                        </th>
                        <th className="p-2 text-center bg-rose-50/60 text-[#C91F28]">
                          Luxury (5★ Heritage)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-[11px]">
                      {tiers.map((tier, tIdx) => (
                        <tr
                          key={tIdx}
                          className={tIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}
                        >
                          <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900 bg-slate-50/30">
                            <div className="flex items-center gap-1.5 text-xs text-[#1E3A8A] font-black">
                              <Users className="w-3.5 h-3.5 text-[#C91F28]" />
                              <span>{tier.paxCount}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold mt-0.5">
                              <Car className="w-3 h-3 text-slate-400" />
                              <span className="truncate">{tier.vehicle}</span>
                            </div>
                          </td>

                          {(['budget', 'standard', 'deluxe', 'luxury'] as const).map((planKey) => {
                            const pData = (tier && tier.plans && tier.plans[planKey]) ? tier.plans[planKey] : { doubleSharing: 0, tripleSharing: 0, cwb: 0, cnb: 0 };
                            return (
                              <td
                                key={planKey}
                                className="p-2 border-r border-slate-200 text-[10.5px] align-top"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center justify-between text-slate-900 font-bold">
                                    <span className="text-[10px] text-slate-500 font-normal">Double:</span>
                                    <span className="text-[#1E3A8A] font-bold">
                                      ₹{Number(pData.doubleSharing || 0).toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-slate-700">
                                    <span className="text-[10px] text-slate-400 font-normal">Triple:</span>
                                    <span>
                                      ₹{Number(pData.tripleSharing || 0).toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                  {pData.cwb ? (
                                    <div className="flex items-center justify-between text-slate-500 text-[9.5px]">
                                      <span>CWB:</span>
                                      <span>₹{Number(pData.cwb).toLocaleString('en-IN')}</span>
                                    </div>
                                  ) : null}
                                  {pData.cnb ? (
                                    <div className="flex items-center justify-between text-slate-500 text-[9.5px]">
                                      <span>CNB:</span>
                                      <span>₹{Number(pData.cnb).toLocaleString('en-IN')}</span>
                                    </div>
                                  ) : null}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-200 text-[10.5px] text-slate-600 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">Cost Inclusions & Terms:</span>
                    <span>All rates quoted per person in Indian Rupees (INR) on twin/triple sharing.</span>
                  </div>
                  <div className="text-slate-500">
                    * CWB: Child With Bed (5-11 yrs) • CNB: Child No Bed (2-5 yrs) • GST 5% extra on invoice • Chauffeur allowance, fuel, toll tax, interstate entry permit & parking included.
                  </div>
                </div>
              </div>

              {/* Hotel Accommodation Plans by Category & Rates Table WITH AMOUNTS */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-1 gap-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#1E3A8A] rounded-full inline-block"></span>
                    <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#1E3A8A]">
                      Hotel Accommodation Plans by Category & Rates
                    </h3>
                  </div>
                  <span className="text-[10.5px] font-semibold text-slate-500">
                    Rooms subject to availability at confirmation
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-[#1E3A8A] text-white font-bold uppercase tracking-wider">
                        <th className="p-2.5 border-r border-blue-900 w-28">City / Destination</th>
                        <th className="p-2 border-r border-blue-900 text-center w-14">Nights</th>
                        <th className="p-2 border-r border-blue-900">
                          <div>Budget Friendly (3★)</div>
                          <div className="text-[10px] text-amber-300 font-bold font-sans">
                            From ₹{samplePricing.budget.toLocaleString('en-IN')}/pax
                          </div>
                        </th>
                        <th className="p-2 border-r border-blue-900">
                          <div>Standard Plan</div>
                          <div className="text-[10px] text-blue-200 font-bold font-sans">
                            From ₹{samplePricing.standard.toLocaleString('en-IN')}/pax
                          </div>
                        </th>
                        <th className="p-2 border-r border-blue-900">
                          <div>Deluxe (4★ Premium)</div>
                          <div className="text-[10px] text-amber-300 font-bold font-sans">
                            From ₹{samplePricing.deluxe.toLocaleString('en-IN')}/pax
                          </div>
                        </th>
                        <th className="p-2">
                          <div>Luxury (5★ Heritage)</div>
                          <div className="text-[10px] text-amber-300 font-bold font-sans">
                            From ₹{samplePricing.luxury.toLocaleString('en-IN')}/pax
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {effectiveHotelOptions.map((h, hIdx) => (
                        <tr key={hIdx} className={hIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200">
                            {h.city}
                          </td>
                          <td className="p-2 font-black text-center text-[#C91F28] border-r border-slate-200">
                            {h.nights}N
                          </td>
                          <td className="p-2 text-slate-700 border-r border-slate-200">
                            <div className="font-semibold">{h.budgetHotel || 'Standard 3-Star Hotel / Similar'}</div>
                            <div className="text-[10px] text-slate-500 font-medium">Category Rate: ₹{samplePricing.budget.toLocaleString('en-IN')}</div>
                          </td>
                          <td className="p-2 text-slate-700 border-r border-slate-200">
                            <div className="font-semibold">{h.standardHotel || 'Quality 3-Star Deluxe / Similar'}</div>
                            <div className="text-[10px] text-slate-500 font-medium">Category Rate: ₹{samplePricing.standard.toLocaleString('en-IN')}</div>
                          </td>
                          <td className="p-2 font-semibold text-slate-900 border-r border-slate-200">
                            <div className="font-bold text-slate-900">{h.deluxeHotel || 'Handpicked 4-Star Resort / Similar'}</div>
                            <div className="text-[10px] text-slate-500 font-medium">Category Rate: ₹{samplePricing.deluxe.toLocaleString('en-IN')}</div>
                          </td>
                          <td className="p-2 font-bold text-[#1E3A8A]">
                            <div className="font-bold text-[#1E3A8A]">{h.luxuryHotel || 'Taj / 5-Star Heritage / Similar'}</div>
                            <div className="text-[10px] text-amber-700 font-semibold">Category Rate: ₹{samplePricing.luxury.toLocaleString('en-IN')}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Booking Notice & Guarantee */}
              <div className="p-3.5 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed bg-white shadow-2xs">
                <p>
                  <strong className="text-slate-900 font-bold">Booking Notice & Price Guarantee:</strong> All hotel accommodations and vehicle choices are subject to confirmation at the time of deposit payment. Rates are valid for 15 days from quote generation and include dedicated chauffeur allowance, fuel, toll taxes, and interstate permits.
                </p>
              </div>
            </div>
          </div>

          {/* Page 2 Footer Bar */}
          <PdfPageFooter
            branding={activeBranding}
            packageName={pkg.packageName}
            pageNumber={2}
          />
        </div>

        {/* ========================================================================= */}
        {/* PAGE 3+: DETAILED DAY-BY-DAY TRAVEL SCHEDULE                             */}
        {/* ========================================================================= */}
        <div className="pdf-page-schedule bg-white text-slate-800">
          <PdfPageHeader
            branding={activeBranding}
            packageName={pkg.packageName}
            pageLabel="Detailed Day-by-Day Travel Schedule"
          />

          <div className="px-8 py-4 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#C91F28] rounded-full inline-block"></span>
                <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-[#1E3A8A]">
                  {t('detailed_travel_schedule', 'Detailed Day-by-Day Travel Schedule')}
                </h2>
              </div>
              <span className="px-2.5 py-0.5 bg-red-50 text-[#C91F28] border border-red-200 rounded-full text-xs font-bold">
                {itineraries.length} {t('days_planned', 'Days Planned')}
              </span>
            </div>

            <div className="space-y-3.5">
              {itineraries.map((day, idx) => {
              const hotelPhotos = getHotelPhotos(day);

              return (
                <div
                  key={day.id || idx}
                  className="itinerary-day-card border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white"
                >
                  {/* Day Header Bar */}
                  <div className="itinerary-day-header px-4 py-2 bg-slate-50/80 border-b border-slate-200">
                    {((day as any).date || day.startTime || day.endTime) ? (
                      <>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-md bg-[#C91F28] text-white font-bold text-xs uppercase tracking-wider shadow-2xs shrink-0">
                              {t('day', 'Day')} {day.dayNumber}
                            </span>
                            {(day as any).date && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs font-bold text-slate-800 shadow-2xs whitespace-nowrap">
                                <Calendar className="w-3.5 h-3.5 text-[#C91F28]" />
                                <span>{(day as any).date}</span>
                              </span>
                            )}
                          </div>

                          {(day.startTime || day.endTime) && (
                            <div className="text-xs text-slate-700 flex items-center gap-1.5 font-medium bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs whitespace-nowrap shrink-0">
                              <Clock className="w-3.5 h-3.5 text-[#C91F28]" />
                              <span>
                                {day.startTime || 'Start'} {day.endTime ? `– ${day.endTime}` : ''}
                              </span>
                            </div>
                          )}
                        </div>

                        <h3 className="font-bold text-sm sm:text-base text-[#1E3A8A] leading-snug">
                          {renderColoredDayTitle(day.title)}
                        </h3>
                      </>
                    ) : (
                      <div className="flex items-start gap-2.5">
                        <span className="px-2.5 py-1 rounded-md bg-[#C91F28] text-white font-bold text-xs uppercase tracking-wider shadow-2xs shrink-0 mt-0.5">
                          {t('day', 'Day')} {day.dayNumber}
                        </span>
                        <h3 className="font-bold text-sm sm:text-base text-[#1E3A8A] leading-snug">
                          {renderColoredDayTitle(day.title)}
                        </h3>
                      </div>
                    )}
                  </div>

                  {/* Day Content Body */}
                  <div className="p-3.5 space-y-2">
                    <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-line font-normal">
                      {day.description}
                    </p>

                    {((day as any).highlights || (day as any).travelDetails) && (
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                        {(day as any).highlights && (
                          <div className="text-slate-800 leading-relaxed">
                            <strong className="text-[#1E3A8A] font-bold">{t('highlights', 'Highlights')}:</strong>{' '}
                            {(day as any).highlights}
                          </div>
                        )}
                        {(day as any).travelDetails && (
                          <div className="text-slate-800 leading-relaxed">
                            <strong className="text-[#C91F28] font-bold">{t('travel_logistics', 'Travel & Logistics')}:</strong>{' '}
                            {(day as any).travelDetails}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Day Sightseeing Photos (CORS-safe & Disciplined Height) */}
                    {(() => {
                      let photoItems: { url: string; label?: string }[] = [];
                      if ((day as any).images) {
                        try {
                          const parsed = JSON.parse((day as any).images);
                          if (Array.isArray(parsed) && parsed.length > 0) {
                            photoItems = parsed
                              .map((item: any) => {
                                if (typeof item === 'string') return { url: item.trim() };
                                return {
                                  url: (item.url || item.imageUrl || '').trim(),
                                  label: item.label || item.name || item.placeName,
                                };
                              })
                              .filter((item) => Boolean(item.url) && item.url !== 'undefined' && item.url !== 'null' && item.url !== '""');
                          }
                        } catch {
                          if (typeof (day as any).images === 'string' && (day as any).images.includes(',')) {
                            photoItems = (day as any).images
                              .split(',')
                              .map((s: string) => ({ url: s.trim() }))
                              .filter((item: any) => Boolean(item.url) && item.url !== 'undefined' && item.url !== 'null');
                          }
                        }
                      }
                      if (photoItems.length === 0 && day.imageUrl && day.imageUrl.trim()) {
                        photoItems = [{ url: day.imageUrl.trim() }];
                      }

                      if (photoItems.length === 0) return null;

                      const placesList = day.places
                        ? day.places.split(',').map((s: string) => s.trim()).filter(Boolean)
                        : [];

                      if (photoItems.length === 1) {
                        const item = photoItems[0];
                        const placeLabel = item.label || (placesList.length > 0 ? placesList.join(' • ') : '');
                        return (
                          <div className="pt-1 day-photo-card">
                            <div className="w-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                              <div
                                className="relative w-full bg-slate-900/5 flex items-center justify-center overflow-hidden"
                                style={{ width: '100%', height: '125px', maxHeight: '125px', minHeight: '125px' }}
                              >
                                <img
                                  src={item.url}
                                  alt={placeLabel || day.title}
                                  className="w-full h-full object-cover"
                                  style={{ width: '100%', height: '125px', maxHeight: '125px', objectFit: 'cover' }}
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              {placeLabel && (
                                <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                                  <MapPin className="w-3.5 h-3.5 text-[#C91F28] shrink-0" style={{ width: '14px', height: '14px' }} />
                                  <span className="font-bold text-slate-900">{placeLabel}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="pt-1">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {photoItems.map((item, pIdx) => {
                              const placeLabel = item.label || placesList[pIdx] || '';
                              return (
                                <div
                                  key={pIdx}
                                  className="day-photo-card flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs"
                                >
                                  <div
                                    className="relative w-full bg-slate-900/5 flex items-center justify-center overflow-hidden"
                                    style={{ width: '100%', height: '115px', maxHeight: '115px', minHeight: '115px' }}
                                  >
                                    <img
                                      src={item.url}
                                      alt={placeLabel || ''}
                                      className="w-full h-full object-cover"
                                      style={{ width: '100%', height: '115px', maxHeight: '115px', objectFit: 'cover' }}
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                  {placeLabel && (
                                    <div className="px-2.5 py-1 bg-slate-50 border-t border-slate-200 flex items-center gap-1 text-[11px] text-slate-800 font-medium">
                                      <MapPin className="w-3 h-3 text-[#C91F28] shrink-0" style={{ width: '12px', height: '12px' }} />
                                      <span className="truncate font-bold text-slate-900">{placeLabel}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Places & Activities */}
                    {(day.places || day.activities) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs border-t border-slate-100">
                        {day.places && (
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#C91F28] mt-0.5 shrink-0" />
                            <div>
                              <span className="font-bold text-[#1E3A8A] block text-xs">Places Visited:</span>
                              <span className="text-slate-700 text-xs leading-relaxed">{day.places}</span>
                            </div>
                          </div>
                        )}

                        {day.activities && (
                          <div className="flex items-start gap-1.5">
                            <Compass className="w-3.5 h-3.5 text-[#1E3A8A] mt-0.5 shrink-0" />
                            <div>
                              <span className="font-bold text-[#1E3A8A] block text-xs">Key Activities:</span>
                              <span className="text-slate-700 text-xs leading-relaxed">{day.activities}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Hotel Accommodation Card: Prominent Showcase with Captions */}
                    {day.hotelName && day.hotelName.trim() && (
                      <div className="mt-2.5 p-3 rounded-xl bg-slate-50/80 border border-slate-200 shadow-2xs space-y-2 hotel-card">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/80 pb-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 text-[#1E3A8A] border border-blue-200 text-[11px] font-bold uppercase tracking-wider">
                              <Building2 className="w-3.5 h-3.5 text-[#C91F28]" />
                              <span>Overnight Stay & Accommodation</span>
                            </span>
                            <h4 className="font-bold text-sm text-[#1E3A8A]">
                              {day.hotelName}
                            </h4>
                            {day.hotelStarCategory && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                {day.hotelStarCategory}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {day.mealPlan && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-xs font-bold text-slate-800 shadow-2xs">
                                <Coffee className="w-3 h-3 text-[#C91F28]" />
                                <span>{day.mealPlan}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Location & Timings */}
                        <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
                          {day.hotelLocation && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <MapPin className="w-3.5 h-3.5 text-[#C91F28] shrink-0" />
                              <span className="font-medium text-slate-800">{day.hotelLocation}</span>
                            </div>
                          )}
                          {((day as any).hotelCheckIn || (day as any).hotelCheckOut) && (
                            <div className="flex items-center gap-2 text-xs font-medium">
                              {(day as any).hotelCheckIn && (
                                <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                                  Check-in: <strong className="text-slate-900">{(day as any).hotelCheckIn}</strong>
                                </span>
                              )}
                              {(day as any).hotelCheckOut && (
                                <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                                  Check-out: <strong className="text-slate-900">{(day as any).hotelCheckOut}</strong>
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {day.hotelDetails && (
                          <p className="text-xs text-slate-600 leading-relaxed font-normal">
                            {day.hotelDetails}
                          </p>
                        )}

                        {/* Hotel Photos Showcase with Captions */}
                        {hotelPhotos.length > 0 && (
                          <div className="pt-1">
                            {hotelPhotos.length === 1 ? (
                              <div className="w-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                                <div
                                  className="relative w-full bg-slate-900/5 flex items-center justify-center overflow-hidden"
                                  style={{ width: '100%', height: '140px', maxHeight: '140px', minHeight: '140px' }}
                                >
                                  <img
                                    src={hotelPhotos[0].url}
                                    alt={hotelPhotos[0].caption || day.hotelName || 'Hotel'}
                                    className="w-full h-full object-cover"
                                    style={{ width: '100%', height: '140px', maxHeight: '140px', objectFit: 'cover' }}
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                                  <span className="font-bold text-[#1E3A8A] flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-[#C91F28]" />
                                    <span>{hotelPhotos[0].caption || 'Hotel Accommodation'}</span>
                                  </span>
                                  <span className="text-xs text-slate-700 font-bold">{day.hotelName}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                {hotelPhotos.slice(0, 3).map((hPhoto, hIdx) => (
                                  <div
                                    key={hIdx}
                                    className="flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs"
                                  >
                                    <div
                                      className="relative w-full bg-slate-900/5 flex items-center justify-center overflow-hidden"
                                      style={{ width: '100%', height: '120px', maxHeight: '120px', minHeight: '120px' }}
                                    >
                                      <img
                                        src={hPhoto.url}
                                        alt={hPhoto.caption || day.hotelName || 'Hotel'}
                                        className="w-full h-full object-cover"
                                        style={{ width: '100%', height: '120px', maxHeight: '120px', objectFit: 'cover' }}
                                        referrerPolicy="no-referrer"
                                      />
                                    </div>
                                    <div className="px-2.5 py-1 bg-slate-50 border-t border-slate-200 flex items-center gap-1.5 text-[11px]">
                                      <Building2 className="w-3 h-3 text-[#C91F28] shrink-0" />
                                      <span className="truncate font-bold text-slate-800">
                                        {hPhoto.caption || (hIdx === 0 ? 'Main Property' : 'Room Feature')}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </div>

          {/* Schedule Section Footer Bar */}
          <PdfPageFooter
            branding={activeBranding}
            packageName={pkg.packageName}
            pageNumber={3}
            totalLabel="Schedule"
          />
        </div>

        {/* ========================================================================= */}
        {/* FINAL PAGE: TERMS, GUEST EXPERIENCES & EXECUTIVE THANK YOU                */}
        {/* ========================================================================= */}
        <div
          className="pdf-page-closing flex flex-col justify-between bg-white text-slate-900"
          style={{
            breakBefore: 'page',
            pageBreakBefore: 'always',
            minHeight: '1020px',
          }}
        >
          <div>
            <PdfPageHeader
              branding={activeBranding}
              packageName={pkg.packageName}
              pageLabel="Official Terms & Closing Profile"
            />

            <div className="px-8 sm:px-12 py-6 max-w-4xl mx-auto w-full space-y-6">
              {/* Tour Terms, Inclusions & Exclusions */}
              <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-[#C91F28] rounded-full inline-block"></span>
                  <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider text-[#1E3A8A]">
                    {t('terms_conditions', 'Tour Terms, Inclusions & Exclusions')}
                  </h3>
                </div>
                <span className="text-xs font-bold text-[#C91F28] uppercase tracking-wide">
                  {language === 'kn' ? 'ಅಧಿಕೃತ ಪ್ರವಾಸದ ವ್ಯಾಪ್ತಿ' : 'Official Travel Scope'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Inclusions List */}
                <div className="bg-emerald-50/50 p-4 sm:p-5 rounded-2xl border border-emerald-200 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                      <div className="flex items-center gap-2 font-bold text-sm text-[#1E3A8A]">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{t('inclusions', 'Tour Inclusions')}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">
                        {language === 'kn' ? 'ಪ್ಯಾಕೇಜ್‌ನಲ್ಲಿ ಒಳಗೊಂಡಿದೆ' : 'Included in Package'}
                      </span>
                    </div>
                    <ul className="space-y-2 pt-2.5">
                      {parseBulletPoints(
                        pkg.inclusions ||
                          'Hotel accommodation in selected room category\nDaily breakfast at hotel restaurant\nPrivate dedicated AC vehicle for transfers and sightseeing\nDriver beta, toll charges, fuel, and parking fees\nAll applicable state taxes and GST'
                      ).map((pt, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs sm:text-[13px] text-slate-800 leading-snug">
                          <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                            ✓
                          </span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Exclusions List */}
                <div className="bg-rose-50/50 p-4 sm:p-5 rounded-2xl border border-rose-200 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-rose-200">
                      <div className="flex items-center gap-2 font-bold text-sm text-[#1E3A8A]">
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{t('exclusions', 'Tour Exclusions')}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wide">
                        {language === 'kn' ? 'ಒಳಗೊಂಡಿಲ್ಲ' : 'Not Included'}
                      </span>
                    </div>
                    <ul className="space-y-2 pt-2.5">
                      {parseBulletPoints(
                        pkg.exclusions ||
                          'Airfare, train fare, or bus tickets to destination\nEntry monument tickets, safari, camera fees, or boat rides\nLunch, dinner, laundry, telephone calls, and room mini-bar\nTravel, baggage, or medical insurance\nAny tips or personal expenses not mentioned in inclusions'
                      ).map((pt, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs sm:text-[13px] text-slate-800 leading-snug">
                          <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                            ✕
                          </span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Previous Trip Moments Photo Gallery */}
            {(() => {
              let galleryPhotos = DEFAULT_TRIP_GALLERY;
              if (activeBranding.tripGallery) {
                try {
                  const parsed = typeof activeBranding.tripGallery === 'string' ? JSON.parse(activeBranding.tripGallery) : activeBranding.tripGallery;
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    galleryPhotos = parsed.map((item: any, idx: number) => {
                      if (typeof item === 'string') return { url: item, caption: `Trip Moment ${idx + 1}` };
                      return { url: item.url || item.imageUrl || '', caption: item.caption || item.label || `Trip Moment ${idx + 1}` };
                    }).filter((item: any) => Boolean(item.url));
                  }
                } catch {
                  if (typeof activeBranding.tripGallery === 'string' && activeBranding.tripGallery.includes(',')) {
                    galleryPhotos = activeBranding.tripGallery.split(',').map((s, idx) => ({ url: s.trim(), caption: `Trip Moment ${idx + 1}` })).filter((i: any) => Boolean(i.url));
                  }
                }
              }
              if (!galleryPhotos || galleryPhotos.length === 0) {
                galleryPhotos = DEFAULT_TRIP_GALLERY;
              }

              return (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-[#C91F28]" />
                      <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#1E3A8A]">
                        Moments Captured by Our Happy Travelers
                      </h3>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Real Guest Experiences
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {galleryPhotos.slice(0, 4).map((item, gIdx) => (
                      <div
                        key={gIdx}
                        className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs group"
                      >
                        <div
                          className="relative w-full bg-slate-900/5 flex items-center justify-center overflow-hidden"
                          style={{ width: '100%', height: '110px', maxHeight: '110px', minHeight: '110px' }}
                        >
                          <img
                            src={item.url}
                            alt={item.caption || 'Trip Photo'}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            style={{ width: '100%', height: '110px', maxHeight: '110px', objectFit: 'cover' }}
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="px-2 py-1 bg-slate-50 border-t border-slate-200 text-center text-[10px] font-bold text-slate-700 truncate">
                          {item.caption || 'Traveler Memory'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Customer Rating & Testimonial Card */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white rounded-2xl border border-blue-200/80 shadow-2xs space-y-2 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-2xs">
                    <Star className="w-3.5 h-3.5 fill-current text-slate-950" />
                    <span>{String(activeBranding.reviewRating || '4.9')} / 5.0</span>
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    Rated by {activeBranding.reviewCount || '1,250+'} Happy Travelers
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 w-fit">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified 100% Authentic Feedback</span>
                </div>
              </div>

              <blockquote className="text-xs sm:text-[13px] text-slate-700 italic leading-relaxed pt-1 flex items-start gap-2">
                <Quote className="w-4 h-4 text-blue-400 shrink-0 mt-0.5 opacity-80" />
                <span>
                  "{activeBranding.reviewQuote || 'Our family trip with Ooting was completely breathtaking! Impeccable cabs, punctual chauffeurs, and handpicked luxury resorts.'}"
                </span>
              </blockquote>

              <div className="text-right text-[11px] font-bold text-[#1E3A8A]">
                — {activeBranding.reviewAuthor || 'Rajesh & Family, Bangalore'}
              </div>
            </div>

            {/* Thank You Card with Perfectly Centered Logo & Company Info */}
            <div className="pt-2 text-center max-w-2xl mx-auto w-full flex flex-col items-center">
              {/* Agency / Company Logo */}
              <div className="mb-3 flex items-center justify-center w-full">
                {activeBranding.logoUrl ? (
                  <img
                    src={activeBranding.logoUrl}
                    alt={activeBranding.agencyName}
                    className="h-16 sm:h-20 w-auto max-w-[220px] object-contain mx-auto drop-shadow-sm"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      if (activeBranding.isB2B) {
                        (e.target as HTMLImageElement).style.display = 'none';
                      } else if (company?.isOoting) {
                        (e.target as HTMLImageElement).src = '/assets/ooting-logo.jpg';
                      } else {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center font-black text-xl uppercase tracking-wider shadow-md mx-auto">
                    {activeBranding.agencyName.slice(0, 2)}
                  </div>
                )}
              </div>

              {/* Large Font THANK YOU */}
              <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-[#1E3A8A] leading-tight text-center">
                {language === 'kn' ? 'ಧನ್ಯವಾದಗಳು' : 'THANK YOU'}
              </h1>

              {/* Below One Line */}
              <p className="text-xs sm:text-sm font-medium text-slate-600 italic mt-1.5 max-w-lg mx-auto text-center leading-relaxed">
                {language === 'kn'
                  ? `${activeBranding.agencyName} ಅನ್ನು ಆಯ್ಕೆ ಮಾಡಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು — ನಿಮ್ಮ ಮುಂದಿನ ಸ್ಮರಣೀಯ ಪ್ರವಾಸವನ್ನು ಯೋಜಿಸಲು ನಾವು ಎದುರುನೋಡುತ್ತಿದ್ದೇವೆ.`
                  : `Thank you for choosing ${activeBranding.agencyName} — we look forward to curating your next unforgettable journey.`}
              </p>

              {/* Red Accent Divider */}
              <div className="w-16 h-1 bg-[#C91F28] rounded-full mx-auto my-3"></div>

              {/* Professional Company Details Card with Clickable Links */}
              <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6 text-left shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200 gap-2">
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-[#1E3A8A] uppercase tracking-tight">
                      {activeBranding.agencyName.toUpperCase()}
                    </h3>
                    <span className="text-xs font-bold text-[#C91F28] uppercase tracking-wide block mt-0.5">
                      {activeBranding.tagline}
                    </span>
                  </div>

                  {/* Clickable Social Media Badges */}
                  <div className="flex items-center gap-2 pt-1 sm:pt-0">
                    {activeBranding.facebookUrl && (
                      <a
                        href={activeBranding.facebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-full bg-[#1877F2]/10 hover:bg-[#1877F2] text-[#1877F2] hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                        title="Visit our Facebook Page"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                      </a>
                    )}

                    {activeBranding.instagramUrl && (
                      <a
                        href={activeBranding.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-full bg-[#E4405F]/10 hover:bg-[#E4405F] text-[#E4405F] hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                        title="Visit our Instagram"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                        </svg>
                      </a>
                    )}

                    {activeBranding.youtubeUrl && (
                      <a
                        href={activeBranding.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-full bg-[#FF0000]/10 hover:bg-[#FF0000] text-[#FF0000] hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                        title="Visit our YouTube Channel"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                      </a>
                    )}

                    {activeBranding.website && (
                      <a
                        href={activeBranding.website.startsWith('http') ? activeBranding.website : `https://${activeBranding.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-full bg-blue-50 hover:bg-[#1E3A8A] text-[#1E3A8A] hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                        title="Visit Official Website"
                      >
                        <Globe className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Clean contact grid with Clickable Links */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Phone */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-50 text-[#C91F28] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Helpline / Contact</span>
                      <a
                        href={`tel:${(activeBranding.phone || '').replace(/[^0-9+]/g, '')}`}
                        className="font-bold text-slate-900 text-xs sm:text-sm hover:text-[#C91F28] transition-colors"
                      >
                        {activeBranding.phone || (!activeBranding.isB2B && company?.isOoting ? '+91 8884845595' : '')}
                        {activeBranding.alternatePhone && ` / ${activeBranding.alternatePhone}`}
                      </a>
                    </div>
                  </div>

                  {/* Email */}
                  {(activeBranding.email || (!activeBranding.isB2B && company?.isOoting)) && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-50 text-[#C91F28] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Email Support</span>
                        <a
                          href={`mailto:${activeBranding.email || (!activeBranding.isB2B && company?.isOoting ? 'support@ooting.in' : '')}`}
                          className="font-bold text-slate-900 text-xs sm:text-sm break-all hover:text-[#C91F28] transition-colors"
                        >
                          {activeBranding.email || (!activeBranding.isB2B && company?.isOoting ? 'support@ooting.in' : '')}
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Website */}
                  {(activeBranding.website || (!activeBranding.isB2B && company?.isOoting)) && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-50 text-[#C91F28] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Official Website</span>
                        <a
                          href={activeBranding.website?.startsWith('http') ? activeBranding.website : `https://${activeBranding.website || 'www.ooting.in'}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-slate-900 text-xs sm:text-sm hover:text-[#C91F28] transition-colors"
                        >
                          {activeBranding.website || (!activeBranding.isB2B && company?.isOoting ? 'www.ooting.in' : '')}
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Registered Office with Clickable Google Maps Link */}
                  {(activeBranding.address || (!activeBranding.isB2B && company?.isOoting)) && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-50 text-[#C91F28] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Registered Office</span>
                        <div className="font-bold text-slate-800 text-xs leading-snug whitespace-pre-line">
                          {activeBranding.address || (!activeBranding.isB2B && company?.isOoting ? 'Ooting 3rd Cross, Malavagoppa, BH Road, Shivamogga, Karnataka, India' : '')}
                        </div>
                        {activeBranding.googleMapUrl && (
                          <a
                            href={activeBranding.googleMapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors cursor-pointer"
                            title="Open office address in Google Maps"
                          >
                            <MapPin className="w-3 h-3 text-emerald-600" />
                            <span>Navigate on Google Maps ↗</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Warm Signature Quote */}
              <div className="mt-6 text-center space-y-1">
                <div className="font-serif italic text-slate-700 text-xs sm:text-sm">
                  "Curating unforgettable experiences to cherish for a lifetime."
                </div>
                <div className="text-xs font-bold text-slate-800">
                  Warmest Regards, The Team at {activeBranding.signatureName}
                </div>
              </div>
            </div>
            </div>
          </div>

          <div>
            {/* Bottom Wave Asset */}
            <div
              className="w-full bg-[#C91F28] overflow-hidden relative shrink-0"
              style={{ width: '100%', height: '8px', minHeight: '8px', maxHeight: '8px', backgroundColor: '#C91F28', overflow: 'hidden' }}
            >
              <img
                src="/assets/ooting-footer-wave.png"
                alt=""
                className="w-full h-full object-cover opacity-90"
                style={{ width: '100%', height: '8px', objectFit: 'cover' }}
              />
            </div>

            {/* Final Page Footer Bar */}
            <PdfPageFooter
              branding={activeBranding}
              packageName={pkg.packageName}
              pageNumber={4}
              totalLabel="Final"
            />
          </div>
        </div>
      </div>

      {/* Printable CSS style tags */}
      <style>{`
        @media print {
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          .pdf-page-cover {
            break-after: page !important;
            page-break-after: always !important;
          }
          .pdf-page-pricing {
            break-after: page !important;
            page-break-after: always !important;
          }
          .pdf-page-closing {
            break-before: page !important;
            page-break-before: always !important;
          }
          .itinerary-day-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 12px !important;
          }
          .itinerary-day-header {
            break-after: avoid !important;
            page-break-after: avoid !important;
          }
          .day-photo-card, .hotel-card, .itinerary-pricing-matrix {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .page-break-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ItineraryPdfView;
