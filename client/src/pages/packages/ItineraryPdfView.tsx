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
    const fetchData = async () => {
      try {
        if (!id) return;
        setIsLoading(true);

        // Fetch fresh package with latest itinerary & hotel master sync
        const pkgRes = await api.get(`/packages/${id}?fresh=true&_t=${Date.now()}`);
        const packageData = pkgRes.data;
        setPkg(packageData);

        // Targeted hotel lookup: only fetch the hotels actually referenced in this itinerary
        const neededHotelIds = Array.from(
          new Set(
            (packageData.itineraries || [])
              .map((d: any) => d.hotelId)
              .filter(Boolean)
          )
        ) as string[];

        const lookup = new Map<string, any>();
        // Prepopulate lookup from embedded itinerary hotel details for instant zero-latency render
        (packageData.itineraries || []).forEach((d: any) => {
          if (d.hotelName) {
            lookup.set(d.hotelName.toLowerCase().trim(), {
              id: d.hotelId,
              name: d.hotelName,
              imageUrl: d.hotelImageUrl,
              starCategory: d.hotelStarCategory,
              city: d.hotelLocation,
            });
          }
        });

        // Concurrently fetch full details/galleries only for the 1-2 assigned hotels instead of 250
        if (neededHotelIds.length > 0) {
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
        }

        setHotelsLookup(lookup);
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
      notifySuccess('Opening Print Process', 'Select "Save as PDF" in the print window to download with perfect alignment.');
      await printElement('itinerary-document', {
        title: `Itinerary_${cleanTitle}`,
      });
    } catch (err) {
      console.error('Failed to download itinerary PDF via print:', err);
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

  const activeBranding = {
    isB2B,
    agencyName: isB2B ? pkg.b2bAgencyName!.trim() : (company?.name || 'DESIRE HOLIDAYS').toUpperCase(),
    tagline: isB2B
      ? (pkg.b2bTagline || 'Authorized Travel Partner')
      : (company?.tagline || ''),
    subtitle: isB2B
      ? (pkg.b2bContactPerson ? `Authorized Travel Partner • Contact: ${pkg.b2bContactPerson}` : 'Authorized Travel Partner')
      : (company?.tagline || 'Premium Tour Operator & Destination Specialist'),
    logoUrl: isB2B ? (pkg.b2bAgencyLogo || null) : (effectiveLogoUrl || company?.logoUrl || null),
    phone: isB2B ? (pkg.b2bPhone || '') : (company?.phone || ''),
    alternatePhone: isB2B ? (pkg.b2bAlternatePhone || '') : '',
    email: isB2B ? (pkg.b2bEmail || '') : (company?.email || ''),
    website: isB2B ? (pkg.b2bWebsite || '') : (company?.website || ''),
    gstin: isB2B ? (pkg.b2bGstin || '') : (company?.gstin || ''),
    address: isB2B
      ? [pkg.b2bAddress, pkg.b2bCity, pkg.b2bState].filter(Boolean).join(', ')
      : (company?.address || [company?.city, company?.state].filter(Boolean).join(', ')),
    signatureName: isB2B
      ? pkg.b2bAgencyName!.trim()
      : (company?.name || 'Authorized Tour Operator'),
  };

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

            {/* RIGHT SIDE: Dynamic Contact Details (vertical one-by-one list) */}
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

        {/* Package Title Banner */}
        <div className="px-8 py-3.5 bg-gradient-to-r from-red-50/70 via-rose-50/30 to-white border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block px-2.5 py-0.5 bg-[#C91F28] text-white text-[10.5px] font-bold uppercase tracking-wider rounded">
                  {t('official_tour_itinerary', 'Official Tour Itinerary')}
                </span>
                <span className="text-xs font-bold text-[#C91F28]">
                  • {itineraries.length} {t('days_planned', 'Days Planned')}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#1E3A8A] tracking-tight leading-snug">
                {pkg.packageName}
              </h1>
              {/* Clean Icon Badges without raw bullets */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700 mt-2 font-medium">
                <span className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs font-semibold text-slate-800">
                  <MapPin className="w-3.5 h-3.5 text-[#C91F28] shrink-0" />
                  <span>{pkg.destination}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs font-semibold text-slate-800">
                  <Clock className="w-3.5 h-3.5 text-[#C91F28] shrink-0" />
                  <span>{pkg.duration}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs font-semibold text-slate-800">
                  <Compass className="w-3.5 h-3.5 text-[#1E3A8A] shrink-0" />
                  <span className="capitalize">{pkg.packageType.toLowerCase()} Package</span>
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10.5px] text-slate-500 uppercase tracking-wider font-bold block">{t('starting_price', 'Starting Price')}</span>
              <span className="text-2xl font-bold text-[#C91F28] block">
                ₹{Number(pkg.price).toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-500 font-medium block">{t('per_person', 'Per Person (All Inclusive)')}</span>
            </div>
          </div>
        </div>

        {/* Tour Overview */}
        <div className="px-8 py-3.5 border-b border-slate-100 bg-slate-50/40">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-1.5 h-4 bg-[#C91F28] rounded-full inline-block"></span>
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#1E3A8A]">
              {t('tour_overview_highlights', 'Tour Overview & Highlights')}
            </h3>
          </div>
          <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-line font-normal">
            {pkg.description}
          </p>
        </div>

        {/* Detailed Day-by-Day Itinerary Section (Starts directly on Page 1) */}
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

          {/* Important Terms & Booking Notice */}
          <div className="p-3 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed bg-white">
            <p>
              <strong className="text-slate-900 font-bold">Booking Notice:</strong> All hotel accommodations and vehicle availability are subject to confirmation at the time of deposit payment. Rates are valid for 15 days from quote generation.
            </p>
          </div>

        </div>

        {/* Continuous Flow: Tour Inclusions, Exclusions & Executive Thank You Section */}
        <div
          className="pdf-thank-you-page w-full flex flex-col justify-between bg-white text-slate-900 mt-4 pt-2 border-t border-slate-200"
        >
          <div className="px-8 sm:px-12 py-8 max-w-4xl mx-auto w-full space-y-6">
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

            {/* Thank You Card with Perfectly Centered Logo & Company Info */}
            <div className="pt-4 text-center max-w-2xl mx-auto w-full flex flex-col items-center">
              {/* Agency / Company Logo - Perfectly Centered & Aligned, Direct & Transparent */}
              <div className="mb-4 flex items-center justify-center w-full">
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

              {/* Professional Company Details Card */}
              <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6 text-left shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 mb-3 border-b border-slate-200 gap-2">
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-[#1E3A8A] uppercase tracking-tight">
                      {activeBranding.agencyName.toUpperCase()}
                    </h3>
                    <span className="text-xs font-bold text-[#C91F28] uppercase tracking-wide block mt-0.5">
                      {activeBranding.tagline}
                    </span>
                  </div>
                  {activeBranding.gstin && activeBranding.gstin !== 'NULL' && activeBranding.gstin !== 'NIL' && activeBranding.gstin !== 'NILL' && activeBranding.gstin.trim() !== '' && (
                    <div>
                      <span className="inline-block text-xs font-semibold text-slate-700 bg-white px-3 py-1 rounded-md border border-slate-200 shadow-2xs font-mono">
                        GSTIN: {activeBranding.gstin.replace(/^GSTIN:\s*/i, '')}
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
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Helpline / Contact</span>
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">
                        {activeBranding.phone || (!activeBranding.isB2B && company?.isOoting ? '+91 8884845595' : '')}
                        {activeBranding.alternatePhone && ` / ${activeBranding.alternatePhone}`}
                      </span>
                    </div>
                  </div>

                  {(activeBranding.email || (!activeBranding.isB2B && company?.isOoting)) && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-50 text-[#C91F28] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Email Support</span>
                        <span className="font-bold text-slate-900 text-xs sm:text-sm break-all">
                          {activeBranding.email || (!activeBranding.isB2B && company?.isOoting ? 'support@ooting.in' : '')}
                        </span>
                      </div>
                    </div>
                  )}

                  {(activeBranding.website || (!activeBranding.isB2B && company?.isOoting)) && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-50 text-[#C91F28] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Official Website</span>
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {activeBranding.website || (!activeBranding.isB2B && company?.isOoting ? 'www.ooting.in' : '')}
                        </span>
                      </div>
                    </div>
                  )}

                  {(activeBranding.address || (!activeBranding.isB2B && company?.isOoting)) && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-50 text-[#C91F28] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Registered Office</span>
                        <span className="font-bold text-slate-800 text-xs leading-snug whitespace-pre-line">
                          {activeBranding.address || (!activeBranding.isB2B && company?.isOoting ? 'Ooting 3rd Cross, Malavagoppa, BH Road, Shivamogga, Karnataka, India' : '')}
                        </span>
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
            margin: 6mm 8mm;
          }
          .itinerary-day-card {
            break-inside: auto !important;
            page-break-inside: auto !important;
          }
          .itinerary-day-header {
            break-after: avoid !important;
            page-break-after: avoid !important;
          }
          .day-photo-card, .hotel-card {
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
