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
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Package, ItineraryDay } from '../../types/index.js';
import { useCompanySettings } from '../../context/CompanySettingsContext.js';
import { generateA4Pdf } from '../../utils/pdfGenerator.js';
import { printElement } from '../../utils/printDocument.js';
import { BrandLoader } from '../../components/ui/BrandLoader.js';
import { notifyError } from '../../utils/sweetalert.js';

export interface HotelPhotoDisplay {
  url: string;
  caption: string;
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
            <span className={idx === segments.length - 1 ? 'text-[#C91F28] font-black' : 'text-slate-950 font-black'}>
              {seg.trim()}
            </span>
            {idx < segments.length - 1 && (
              <span className="text-[#C91F28] font-black mx-2 text-base">→</span>
            )}
          </React.Fragment>
        ))}
      </span>
    );
  }
  return <span className="text-slate-950 font-black">{text}</span>;
};

const renderColoredDayTitle = (rawTitle: string) => {
  const cleanTitle = (rawTitle || '').replace(/^Day\s*\d+:\s*/i, '').trim();
  if (!cleanTitle) return <span className="text-slate-950 font-black">Day Tour Schedule</span>;

  // If title has a pipe '|' separating route and subtitle: e.g. "Mangalore Airport → Coorg | Scenic Journey to the Coffee Hills"
  if (cleanTitle.includes('|')) {
    const parts = cleanTitle.split('|');
    const mainRoute = parts[0].trim();
    const subTheme = parts.slice(1).join('|').trim();

    return (
      <span className="inline">
        {renderRouteSegments(mainRoute)}
        <span className="text-[#C91F28] font-black mx-2">|</span>
        <span className="text-[#C91F28] font-extrabold">{subTheme}</span>
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
        <span className="text-slate-950 font-black">{dest}</span>
        <span className="text-[#C91F28] font-black mx-2">:</span>
        <span className="text-[#C91F28] font-extrabold">{desc}</span>
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
        <span className="text-[#C91F28] font-black mx-2">—</span>
        <span className="text-[#C91F28] font-extrabold">{desc}</span>
      </span>
    );
  }

  return renderRouteSegments(cleanTitle);
};

export const ItineraryPdfView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { company } = useCompanySettings();

  const [pkg, setPkg] = useState<Package | null>(null);
  const [hotelsLookup, setHotelsLookup] = useState<Map<string, any>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [pkgRes, hotelsRes] = await Promise.all([
          api.get('/packages/' + id),
          api.get('/hotels').catch(() => ({ data: { hotels: [] } })),
        ]);
        setPkg(pkgRes.data);

        const map = new Map<string, any>();
        const list = hotelsRes.data?.hotels || [];
        list.forEach((h: any) => {
          if (h.id) map.set(h.id, h);
          if (h.name) map.set(h.name.toLowerCase().trim(), h);
        });
        setHotelsLookup(map);
      } catch (err) {
        console.error('Failed to load package itinerary for PDF:', err);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchData();
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
      const filename = `Itinerary_${cleanTitle}.pdf`;

      const { download } = await generateA4Pdf({
        elementId: 'itinerary-document',
        filename,
        title: pkg.packageName || 'Official Tour Itinerary',
        onePageOnly: false,
        margin: 8,
      });
      await download();
    } catch (err) {
      console.error('Failed to download itinerary PDF:', err);
      notifyError('PDF Generation Error', 'Could not generate PDF directly. Please use the Print button to export as PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!pkg) return;

    const cleanTitle = (pkg.packageName || 'Itinerary').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Itinerary_${cleanTitle}.pdf`;

    const messageText =
      `*${(company.name || 'OOTING').toUpperCase()} - TOUR ITINERARY*\n\n` +
      `Here is the official travel itinerary for *${pkg.packageName}* (${pkg.destination})!\n\n` +
      `• Duration: ${pkg.duration}\n` +
      `• Starting Price: ₹${Number(pkg.price).toLocaleString('en-IN')} Per Person\n` +
      `• Inclusions: ${pkg.inclusions || 'Standard holiday package inclusions'}\n\n` +
      `Have a look at the attached official PDF document for the complete day-by-day schedule.\n\n` +
      `Warm regards,\n*Ooting Team*`;

    const text = encodeURIComponent(
      messageText +
      `\n\n📄 Note: The official Tour Itinerary PDF (${filename}) has been downloaded to your device. Please attach it here to send.`
    );
    const waUrl = `https://wa.me/?text=${text}`;

    // Open WhatsApp synchronously in user click gesture to avoid browser popup blockers
    window.open(waUrl, '_blank');

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

  return (
    <div className="min-h-screen bg-slate-200/70 dark:bg-slate-950 py-8 px-4 print:p-0 print:bg-white">
      {/* Top Floating Action Bar (Hidden in Print) */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-300/80 dark:border-slate-800 shadow-md print:hidden">
        <button
          type="button"
          onClick={() => navigate('/packages/' + id)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Package</span>
        </button>

        <div className="flex items-center gap-3">
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
          >
            {isGeneratingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            ) : (
              <Download className="w-4 h-4 text-amber-400" />
            )}
            <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
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
        className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden print:shadow-none print:rounded-none print:max-w-full text-slate-800 font-sans antialiased print:m-0"
        style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
          #itinerary-document, #itinerary-document * {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          }
        `}</style>
        
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
            {/* LEFT SIDE: Logo & Company Name/Tagline */}
            <div className="flex items-center gap-3.5">
              <div
                className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center bg-white p-1 border border-slate-200 shadow-2xs shrink-0"
                style={{ width: '56px', height: '56px', minWidth: '56px', maxWidth: '56px', minHeight: '56px', maxHeight: '56px', overflow: 'hidden' }}
              >
                <img
                  src={company.logoUrl || '/assets/ooting-logo.jpg'}
                  alt={company.name || 'Ooting'}
                  className="max-w-full max-h-full object-contain"
                  style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/ooting-logo.jpg';
                  }}
                />
              </div>
              <div className="min-w-0">
                <span className="text-xl font-black tracking-tight text-slate-900 block leading-tight uppercase">
                  {(company.name || 'OOTING').toUpperCase()}
                </span>
                <span className="text-xs font-bold text-[#C91F28] uppercase tracking-wide block mt-0.5">
                  {company.tagline || 'Journeys Beyond Ordinary'}
                </span>
                <span className="text-[11px] text-slate-500 font-medium block">
                  Premium Tour Operator & Destination Specialist
                </span>
              </div>
            </div>

            {/* RIGHT SIDE: Company Contact Details (vertical one-by-one list) */}
            <div className="flex justify-end ml-auto shrink-0">
              <div className="w-fit ml-auto flex flex-col space-y-1.5 text-xs text-slate-700 max-w-[340px]">
                {company.website && (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 mr-2 flex items-center justify-center shrink-0 text-[#C91F28]">
                      <Globe className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
                    </span>
                    <span className="font-semibold text-slate-800 tracking-tight break-all text-xs">{company.website}</span>
                  </div>
                )}
                {company.email && (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 mr-2 flex items-center justify-center shrink-0 text-[#C91F28]">
                      <Mail className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
                    </span>
                    <span className="font-semibold text-slate-800 tracking-tight break-all text-xs">{company.email}</span>
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 mr-2 flex items-center justify-center shrink-0 text-[#C91F28]">
                      <Phone className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
                    </span>
                    <span className="font-semibold text-slate-800 tracking-tight text-xs">{company.phone}</span>
                  </div>
                )}
                {company?.gstin && company.gstin !== 'NULL' && company.gstin !== 'NIL' && company.gstin !== 'NILL' && company.gstin.trim() !== '' && (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 mr-2 flex items-center justify-center shrink-0 text-[#C91F28]">
                      <FileText className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
                    </span>
                    <span className="font-semibold text-slate-800 tracking-tight text-xs">
                      GSTIN: {company.gstin.replace(/^GSTIN:\s*/i, '')}
                    </span>
                  </div>
                )}
                {company.address && (
                  <div className="flex items-start gap-2 pt-0.5">
                    <span className="w-4 h-4 mr-2 flex items-center justify-center shrink-0 text-[#C91F28] mt-0.5">
                      <MapPin className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
                    </span>
                    <div className="text-slate-800 leading-snug text-[11px] font-bold whitespace-pre-line">
                      {company.address}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Package Title Banner */}
        <div className="px-8 py-4 bg-gradient-to-r from-red-50/80 via-rose-50/50 to-white border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-block px-3 py-0.5 bg-[#C91F28] text-white text-[11px] font-black uppercase tracking-wider rounded-md shadow-2xs">
                  Official Tour Itinerary
                </span>
                <span className="text-xs sm:text-sm font-black text-[#C91F28]">
                  • {itineraries.length} Days Planned
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight leading-tight">
                {pkg.packageName}
              </h1>
              {/* Clean Icon Badges without raw bullets */}
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-800 mt-2.5 font-medium">
                <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs font-bold text-slate-900">
                  <MapPin className="w-3.5 h-3.5 text-[#C91F28] shrink-0" />
                  <span>{pkg.destination}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs font-bold text-slate-900">
                  <Clock className="w-3.5 h-3.5 text-[#C91F28] shrink-0" />
                  <span>{pkg.duration}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs font-bold text-slate-900">
                  <Compass className="w-3.5 h-3.5 text-[#C91F28] shrink-0" />
                  <span className="capitalize">{pkg.packageType.toLowerCase()} Package</span>
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-extrabold block">Starting Price</span>
              <span className="text-2xl sm:text-3xl font-black text-[#C91F28] block">
                ₹{Number(pkg.price).toLocaleString('en-IN')}
              </span>
              <span className="text-[10.5px] text-slate-500 font-bold block">Per Person (All Inclusive)</span>
            </div>
          </div>
        </div>

        {/* Tour Overview */}
        <div className="px-8 py-4 border-b border-slate-200/80 bg-slate-50/50">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="w-2 h-5 bg-[#C91F28] rounded-full inline-block"></span>
            <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-[#C91F28]">
              Tour Overview & Highlights
            </h3>
          </div>
          <p className="text-[14.5px] sm:text-[15px] text-slate-800 leading-relaxed whitespace-pre-line font-medium">
            {pkg.description}
          </p>
        </div>

        {/* Detailed Day-by-Day Itinerary Section (Starts directly on Page 1) */}
        <div className="px-8 py-4 space-y-4">
          <div className="flex items-center justify-between border-b-2 border-red-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-5 bg-[#C91F28] rounded-full inline-block"></span>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-950">
                Detailed Day-by-Day Travel Schedule
              </h2>
            </div>
            <span className="px-3 py-1 bg-red-50 text-[#C91F28] border border-red-200 rounded-full text-xs font-bold shadow-2xs">
              {itineraries.length} Days Planned
            </span>
          </div>

          <div className="space-y-4">
            {itineraries.map((day, idx) => {
              const hotelPhotos = getHotelPhotos(day);

              return (
                <div
                  key={day.id || idx}
                  className={`itinerary-day-card ${idx === 0 ? 'itinerary-day-1' : 'page-break-avoid'} border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs bg-white`}
                >
                  {/* Day Header Bar */}
                  <div className="px-4 py-3 bg-gradient-to-r from-red-50/90 via-rose-50/40 to-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#C91F28] via-rose-600 to-[#991B1B] text-white font-black text-xs sm:text-[13px] uppercase tracking-wider shadow-xs flex items-center justify-center shrink-0">
                        Day {day.dayNumber}
                      </span>
                      <div>
                        <h3 className="font-display font-black text-lg sm:text-[19px] text-slate-950 leading-snug tracking-tight">
                          {renderColoredDayTitle(day.title)}
                        </h3>
                        {(day as any).date && (
                          <span className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] text-[#C91F28] font-black mt-1">
                            <Calendar className="w-3.5 h-3.5 text-[#C91F28]" />
                            {(day as any).date}
                          </span>
                        )}
                      </div>
                    </div>

                    {(day.startTime || day.endTime) && (
                      <div className="text-xs sm:text-[13px] text-slate-800 flex items-center gap-1.5 font-bold bg-white px-3 py-1 rounded-lg border border-rose-200 shadow-2xs">
                        <Clock className="w-3.5 h-3.5 text-[#C91F28]" />
                        <span>
                          {day.startTime || 'Start'} {day.endTime ? `– ${day.endTime}` : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Day Content Body */}
                  <div className="p-4 space-y-3.5">
                    <p className="text-[15px] sm:text-[15.5px] text-slate-800 leading-[1.7] whitespace-pre-line font-medium">
                      {day.description}
                    </p>

                    {((day as any).highlights || (day as any).travelDetails) && (
                      <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50/90 via-orange-50/40 to-amber-50/20 border border-amber-300/90 space-y-3 shadow-2xs">
                        {(day as any).highlights && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 text-white text-xs font-black uppercase tracking-wider shadow-xs">
                                <Sparkles className="w-3.5 h-3.5" /> Highlights
                              </span>
                              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">
                                Key Sightseeing Points
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {parseCommaList((day as any).highlights).map((item, hIdx) => (
                                <span
                                  key={hIdx}
                                  className="inline-flex items-center gap-2 bg-white text-amber-950 border border-amber-300/90 px-3 py-1.5 rounded-lg text-[13px] sm:text-[13.5px] font-bold shadow-2xs hover:border-amber-400"
                                >
                                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 shadow-2xs"></span>
                                  <span>{item}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {(day as any).travelDetails && (
                          <div className="pt-2.5 border-t border-amber-200/80 flex items-start gap-2.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 border border-blue-200 text-xs font-black uppercase tracking-wider shrink-0 mt-0.5 shadow-2xs">
                              <Car className="w-3.5 h-3.5 text-blue-600" /> Travel & Logistics
                            </span>
                            <span className="text-xs sm:text-[13.5px] text-slate-800 font-semibold leading-relaxed">
                              {(day as any).travelDetails}
                            </span>
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
                                style={{ width: '100%', height: '145px', maxHeight: '145px', minHeight: '145px' }}
                              >
                                <img
                                  src={item.url}
                                  alt={placeLabel || day.title}
                                  className="w-full h-full object-cover"
                                  style={{ width: '100%', height: '145px', maxHeight: '145px', objectFit: 'cover' }}
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
                                    style={{ width: '100%', height: '130px', maxHeight: '130px', minHeight: '130px' }}
                                  >
                                    <img
                                      src={item.url}
                                      alt={placeLabel || ''}
                                      className="w-full h-full object-cover"
                                      style={{ width: '100%', height: '130px', maxHeight: '130px', objectFit: 'cover' }}
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-200/80">
                        {day.places && (
                          <div className="p-3.5 rounded-xl bg-gradient-to-r from-rose-50/90 via-red-50/40 to-rose-50/20 border border-rose-300/80 space-y-2.5 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-[#C91F28] to-rose-700 text-white text-xs font-black uppercase tracking-wider shadow-xs">
                                <MapPin className="w-3.5 h-3.5" /> Places Visited
                              </span>
                              <span className="text-[11px] font-bold text-rose-800">
                                {parseCommaList(day.places).length} Locations
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {parseCommaList(day.places).map((place, pIdx) => (
                                <span
                                  key={pIdx}
                                  className="inline-flex items-center gap-1.5 bg-white text-rose-950 border border-rose-300/90 px-3 py-1.5 rounded-lg text-[13px] sm:text-[13.5px] font-bold shadow-2xs hover:border-rose-400"
                                >
                                  <MapPin className="w-3.5 h-3.5 text-[#C91F28] shrink-0" />
                                  <span>{place}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {day.activities && (
                          <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50/90 via-teal-50/40 to-emerald-50/20 border border-emerald-300/80 space-y-2.5 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-xs font-black uppercase tracking-wider shadow-xs">
                                <Compass className="w-3.5 h-3.5" /> Key Activities
                              </span>
                              <span className="text-[11px] font-bold text-emerald-800">
                                {parseCommaList(day.activities).length} Experiences
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {parseCommaList(day.activities).map((act, aIdx) => (
                                <span
                                  key={aIdx}
                                  className="inline-flex items-center gap-2 bg-white text-emerald-950 border border-emerald-300/90 px-3 py-1.5 rounded-lg text-[13px] sm:text-[13.5px] font-bold shadow-2xs hover:border-emerald-400"
                                >
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-2xs"></span>
                                  <span>{act}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Hotel Accommodation Card: Prominent Showcase with Captions */}
                    {day.hotelName && day.hotelName.trim() && (
                      <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-amber-50/60 via-orange-50/30 to-amber-50/20 border border-amber-200/90 shadow-2xs space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-amber-200/70 pb-2.5">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#C91F28] text-white text-xs font-black uppercase tracking-wider shadow-xs">
                              <Building2 className="w-3.5 h-3.5" />
                              <span>Overnight Stay & Accommodation</span>
                            </span>
                            <h4 className="font-black text-base text-slate-950">
                              {day.hotelName}
                            </h4>
                            {day.hotelStarCategory && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold">
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                {day.hotelStarCategory}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {day.mealPlan && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-xs font-bold text-amber-900 shadow-2xs">
                                <Coffee className="w-3.5 h-3.5 text-amber-600" />
                                <span>{day.mealPlan}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Location & Timings */}
                        <div className="flex flex-wrap items-center justify-between text-xs text-slate-700 gap-2">
                          {day.hotelLocation && (
                            <div className="flex items-center gap-1.5 text-xs sm:text-[13px]">
                              <MapPin className="w-3.5 h-3.5 text-[#C91F28] shrink-0" />
                              <span className="font-bold text-slate-800">{day.hotelLocation}</span>
                            </div>
                          )}
                          {((day as any).hotelCheckIn || (day as any).hotelCheckOut) && (
                            <div className="flex items-center gap-2 text-xs font-semibold">
                              {(day as any).hotelCheckIn && (
                                <span className="bg-white px-2.5 py-1 rounded-md border border-amber-200 text-slate-800">
                                  Check-in: <strong className="text-slate-950 font-black">{(day as any).hotelCheckIn}</strong>
                                </span>
                              )}
                              {(day as any).hotelCheckOut && (
                                <span className="bg-white px-2.5 py-1 rounded-md border border-amber-200 text-slate-800">
                                  Check-out: <strong className="text-slate-950 font-black">{(day as any).hotelCheckOut}</strong>
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {day.hotelDetails && (
                          <p className="text-xs sm:text-[13px] text-slate-700 leading-relaxed font-medium">
                            {day.hotelDetails}
                          </p>
                        )}

                        {/* Hotel Photos Showcase with Captions */}
                        {hotelPhotos.length > 0 && (
                          <div className="pt-1">
                            {hotelPhotos.length === 1 ? (
                              <div className="w-full bg-white rounded-xl border border-amber-200/90 overflow-hidden shadow-2xs">
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
                                <div className="px-3 py-1.5 bg-amber-50/70 border-t border-amber-200/70 flex items-center justify-between text-xs">
                                  <span className="font-bold text-amber-950 flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-[#C91F28]" />
                                    <span>{hotelPhotos[0].caption || 'Hotel Accommodation'}</span>
                                  </span>
                                  <span className="text-xs text-amber-800 font-bold">{day.hotelName}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                {hotelPhotos.slice(0, 3).map((hPhoto, hIdx) => (
                                  <div
                                    key={hIdx}
                                    className="flex flex-col bg-white rounded-xl border border-amber-200/90 overflow-hidden shadow-2xs"
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
                                    <div className="px-2.5 py-1 bg-amber-50/70 border-t border-amber-200/70 flex items-center gap-1.5 text-[11px]">
                                      <Building2 className="w-3 h-3 text-[#C91F28] shrink-0" />
                                      <span className="truncate font-bold text-amber-950">
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

          {/* Important Terms & Booking Notice */}
          <div className="p-4 border border-slate-200/90 rounded-xl text-[13px] sm:text-[13.5px] text-slate-700 leading-relaxed bg-white page-break-avoid shadow-2xs">
            <p>
              <strong className="text-slate-950 font-black">Booking Notice:</strong> All hotel accommodations and vehicle availability are subject to confirmation at the time of deposit payment. Rates are valid for 15 days from quote generation.
            </p>
          </div>

        </div>

        {/* Dedicated Final Page: Tour Inclusions, Exclusions & Executive Thank You Page */}
        <div
          className="pdf-page-break-before pdf-thank-you-page w-full flex flex-col justify-between bg-white text-slate-900 print:min-h-screen"
        >
          <div className="px-8 sm:px-12 py-8 max-w-4xl mx-auto w-full space-y-6">
            {/* Tour Terms, Inclusions & Exclusions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b-2 border-red-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-5 bg-[#C91F28] rounded-full inline-block"></span>
                  <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-950">
                    Tour Terms, Inclusions & Exclusions
                  </h3>
                </div>
                <span className="text-xs font-black text-[#C91F28] uppercase tracking-wide">
                  Official Travel Scope
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Inclusions List */}
                <div className="bg-emerald-50/60 p-4 sm:p-5 rounded-2xl border border-emerald-300 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2.5 border-b border-emerald-200/90">
                      <div className="flex items-center gap-2 font-black text-sm sm:text-base text-emerald-950">
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                        <span>Tour Inclusions</span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Included in Package</span>
                    </div>
                    <ul className="space-y-2.5 pt-3">
                      {parseBulletPoints(
                        pkg.inclusions ||
                          'Hotel accommodation in selected room category\nDaily breakfast at hotel restaurant\nPrivate dedicated AC vehicle for transfers and sightseeing\nDriver beta, toll charges, fuel, and parking fees\nAll applicable state taxes and GST'
                      ).map((pt, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs sm:text-[13.5px] text-slate-900 leading-snug font-medium">
                          <span className="w-4.5 h-4.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                            ✓
                          </span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Exclusions List */}
                <div className="bg-rose-50/60 p-4 sm:p-5 rounded-2xl border border-rose-300 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2.5 border-b border-rose-200/90">
                      <div className="flex items-center gap-2 font-black text-sm sm:text-base text-rose-950">
                        <XCircle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
                        <span>Tour Exclusions</span>
                      </div>
                      <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wide">Not Included</span>
                    </div>
                    <ul className="space-y-2.5 pt-3">
                      {parseBulletPoints(
                        pkg.exclusions ||
                          'Airfare, train fare, or bus tickets to destination\nEntry monument tickets, safari, camera fees, or boat rides\nLunch, dinner, laundry, telephone calls, and room mini-bar\nTravel, baggage, or medical insurance\nAny tips or personal expenses not mentioned in inclusions'
                      ).map((pt, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs sm:text-[13.5px] text-slate-900 leading-snug font-medium">
                          <span className="w-4.5 h-4.5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
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

            {/* Thank You Card with Perfectly Centered Logo & Company Info */}
            <div className="pt-4 text-center max-w-2xl mx-auto w-full flex flex-col items-center">
              {/* Ooting Logo - Perfectly Centered & Aligned, Direct & Transparent (No Box) */}
              <div className="mb-4 flex items-center justify-center w-full">
                <img
                  src={company.logoUrl || '/assets/ooting-logo.jpg'}
                  alt={company.name || 'Ooting'}
                  className="h-16 sm:h-20 w-auto max-w-[220px] object-contain mx-auto drop-shadow-sm"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/ooting-logo.jpg';
                  }}
                />
              </div>

              {/* Large Font THANK YOU */}
              <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-slate-900 leading-tight text-center">
                THANK YOU
              </h1>

              {/* Below One Line */}
              <p className="text-sm font-medium text-slate-600 italic mt-2 max-w-lg mx-auto text-center leading-relaxed">
                Thank you for choosing Ooting — we look forward to curating your next unforgettable journey.
              </p>

              {/* Red Accent Divider */}
              <div className="w-16 h-1 bg-[#C91F28] rounded-full mx-auto my-4"></div>

              {/* Professional Company Details Card */}
              <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6 text-left shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3.5 mb-3.5 border-b border-slate-200 gap-2">
                  <div>
                    <h3 className="font-extrabold text-base sm:text-lg text-slate-900 uppercase tracking-tight">
                      {(company.name || 'OOTING TOURS & TRAVELS').toUpperCase()}
                    </h3>
                    <span className="text-xs font-bold text-[#C91F28] uppercase tracking-wide block mt-0.5">
                      {company.tagline || 'Journeys Beyond Ordinary'}
                    </span>
                  </div>
                  {company?.gstin && company.gstin !== 'NULL' && company.gstin !== 'NIL' && company.gstin !== 'NILL' && company.gstin.trim() !== '' && (
                    <div>
                      <span className="inline-block text-xs font-semibold text-slate-700 bg-white px-3 py-1 rounded-md border border-slate-200 shadow-2xs">
                        GSTIN: {company.gstin.replace(/^GSTIN:\s*/i, '')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Clean contact grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-50 text-[#C91F28] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Helpline / WhatsApp</span>
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">
                        {company.phone || '+91 8884845595 / +91 6362845243'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-50 text-[#C91F28] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Email Support</span>
                      <span className="font-bold text-slate-900 text-xs sm:text-sm break-all">
                        {company.email || 'support@ooting.in'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-50 text-[#C91F28] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Official Website</span>
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">
                        {company.website || 'www.ooting.in'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-50 text-[#C91F28] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Registered Head Office</span>
                      <span className="font-bold text-slate-800 text-xs leading-snug whitespace-pre-line">
                        {company.address || 'Ooting 3rd Cross, Malavagoppa, BH Road, Shivamogga, Karnataka, India'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warm Signature Quote */}
              <div className="mt-6 text-center space-y-1">
                <div className="font-serif italic text-slate-700 text-xs sm:text-sm">
                  "Curating unforgettable experiences to cherish for a lifetime."
                </div>
                <div className="text-xs font-bold text-slate-800">
                  Warmest Regards, The Team at {company.name || 'Ooting Tours & Travels'}
                </div>
              </div>
            </div>
          </div>

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
          .page-break-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .itinerary-day-1 {
            break-before: avoid !important;
            page-break-before: avoid !important;
          }
          .pdf-page-break-before {
            page-break-before: always !important;
            break-before: page !important;
          }
        }
      `}</style>
    </div>
  );
};
