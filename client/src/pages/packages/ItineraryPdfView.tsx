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
  HeartHandshake,
  Award,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Package, ItineraryDay } from '../../types/index.js';
import { useCompanySettings } from '../../context/CompanySettingsContext.js';
import { generateA4Pdf } from '../../utils/pdfGenerator.js';
import { printElement } from '../../utils/printDocument.js';
import { BrandLoader } from '../../components/ui/BrandLoader.js';

export interface HotelPhotoDisplay {
  url: string;
  caption: string;
}

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
      alert('PDF generation error. Please try the Print button.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!pkg) return;
    try {
      setIsGeneratingPdf(true);
      const cleanTitle = (pkg.packageName || 'Itinerary').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Itinerary_${cleanTitle}.pdf`;

      const { download, pdfBlob } = await generateA4Pdf({
        elementId: 'itinerary-document',
        filename,
        title: pkg.packageName || 'Official Tour Itinerary',
        onePageOnly: false,
        margin: 8,
      });

      const messageText =
        `*${(company.name || 'OOTING').toUpperCase()} - TOUR ITINERARY*\n\n` +
        `Here is the official travel itinerary for *${pkg.packageName}* (${pkg.destination})!\n\n` +
        `• Duration: ${pkg.duration}\n` +
        `• Starting Price: ₹${Number(pkg.price).toLocaleString('en-IN')} Per Person\n` +
        `• Inclusions: ${pkg.inclusions || 'Standard holiday package inclusions'}\n\n` +
        `Have a look at the attached official PDF document for the complete day-by-day schedule.\n\n` +
        `Warm regards,\n*Ooting Team*`;

      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `Tour Itinerary - ${pkg.packageName}`,
          text: messageText,
        });
      } else {
        download();
        const text = encodeURIComponent(
          messageText +
          `\n\n📄 Note: The official Tour Itinerary PDF has been downloaded to your device. Please attach it here to send.`
        );
        window.open(`https://wa.me/?text=${text}`, '_blank');
      }
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
        className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden print:shadow-none print:rounded-none print:max-w-full text-slate-800 font-serif print:m-0"
      >
        
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
        <div className="px-8 pt-6 pb-5 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            {/* LEFT SIDE: Logo & Company Name/Tagline */}
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center bg-white p-1 border border-slate-200 shadow-2xs shrink-0"
                style={{ width: '56px', height: '56px', minWidth: '56px', maxWidth: '56px', minHeight: '56px', maxHeight: '56px', overflow: 'hidden' }}
              >
                <img
                  src={company.logoUrl || '/assets/ooting-logo.jpg'}
                  alt={company.name || 'Ooting'}
                  className="max-w-full max-h-full object-contain"
                  style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  crossOrigin="anonymous"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/ooting-logo.jpg';
                  }}
                />
              </div>
              <div className="min-w-0">
                <span className="text-xl font-black tracking-tight text-slate-900 block leading-tight uppercase">
                  {(company.name || 'OOTING').toUpperCase()}
                </span>
                <span className="text-[11px] font-bold text-[#C91F28] uppercase tracking-wide block mt-0.5">
                  {company.tagline || 'Journeys Beyond Ordinary'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Premium Tour Operator & Destination Specialist
                </span>
              </div>
            </div>

            {/* RIGHT SIDE: Company Contact Details with proper margin */}
            <div className="flex justify-end ml-auto shrink-0">
              <div className="w-fit ml-auto flex flex-col space-y-1.5 text-xs text-slate-700 max-w-[320px]">
                {company.website && (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 flex items-center justify-center shrink-0 text-[#C91F28]">
                      <Globe className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
                    </span>
                    <span className="font-medium text-slate-800 tracking-tight break-all">{company.website}</span>
                  </div>
                )}
                {company.email && (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 flex items-center justify-center shrink-0 text-[#C91F28]">
                      <Mail className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
                    </span>
                    <span className="font-medium text-slate-800 tracking-tight break-all">{company.email}</span>
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 flex items-center justify-center shrink-0 text-[#C91F28]">
                      <Phone className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
                    </span>
                    <span className="font-medium text-slate-800 tracking-tight">{company.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 flex items-center justify-center shrink-0 text-[#C91F28]">
                    <FileText className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
                  </span>
                  <span className="font-medium text-slate-800 tracking-tight">
                    GSTIN: {company?.gstin && company.gstin !== 'NULL' ? company.gstin.replace(/^GSTIN:\s*/i, '') : 'NILL'}
                  </span>
                </div>
                {company.address && (
                  <div className="flex items-start gap-2 pt-0.5">
                    <span className="w-4 h-4 flex items-center justify-center shrink-0 text-[#C91F28] mt-0.5">
                      <MapPin className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
                    </span>
                    <div className="text-slate-600 leading-snug">
                      <div>Ooting 3rd Cross, Malavagoppa, BH Road,</div>
                      <div>Shivamogga, Karnataka, India</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Package Title Banner */}
        <div className="px-8 py-6 bg-gradient-to-r from-red-50/70 via-rose-50/40 to-white border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="inline-block px-2.5 py-0.5 bg-[#C91F28] text-white text-[10px] font-bold uppercase tracking-wider rounded-md mb-1.5">
                Official Tour Itinerary
              </span>
              <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight">
                {pkg.packageName}
              </h1>
              {/* Clean Icon Badges without raw bullets */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700 mt-2 font-medium">
                <span className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                  <MapPin className="w-3.5 h-3.5 text-[#C91F28] shrink-0" />
                  <span>{pkg.destination}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                  <Clock className="w-3.5 h-3.5 text-[#C91F28] shrink-0" />
                  <span>{pkg.duration}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                  <Compass className="w-3.5 h-3.5 text-[#C91F28] shrink-0" />
                  <span className="capitalize">{pkg.packageType.toLowerCase()} Package</span>
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold block">Starting Price</span>
              <span className="text-2xl font-extrabold text-[#C91F28]">
                ₹{Number(pkg.price).toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-500 block">Per Person (All Inclusive)</span>
            </div>
          </div>
        </div>

        {/* Tour Overview */}
        <div className="px-8 py-5 border-b border-slate-100">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-2">
            Tour Overview & Highlights
          </h3>
          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
            {pkg.description}
          </p>
        </div>

        {/* Executive Tour Route & Stay Timeline (Replaces raw table with modern travel schedule) */}
        {itineraries.length > 0 && (
          <div className="px-8 py-5 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#C91F28]" />
                <span>Tour Journey Route & Stay Schedule</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2.5 py-0.5 rounded-full">
                {itineraries.length} Days Travel Highlights
              </span>
            </div>

            <div className="space-y-2">
              {itineraries.map((d, dIdx) => (
                <div
                  key={d.id || dIdx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50/70 transition-all shadow-2xs"
                >
                  {/* Day Number Pill & Title */}
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    <span className="inline-flex items-center justify-center px-2 py-1 rounded-lg bg-red-50 text-[#C91F28] font-black text-[11px] shrink-0 border border-red-200/80">
                      DAY {String(d.dayNumber).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-slate-900 truncate">
                        {d.title?.replace(/^Day\s*\d+:\s*/i, '') || `Day ${d.dayNumber}`}
                      </h4>
                      {d.places && (
                        <div className="text-[10.5px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-[#C91F28] shrink-0" />
                          <span className="truncate">{d.places}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Overnight Stay & Meal Badge */}
                  <div className="flex items-center gap-2 shrink-0 sm:pl-3 border-t sm:border-t-0 sm:border-l border-slate-100 pt-1 sm:pt-0">
                    {d.hotelName ? (
                      <div className="flex items-center gap-1.5 bg-amber-50/70 border border-amber-200/80 px-2.5 py-1 rounded-lg">
                        <Building2 className="w-3 h-3 text-amber-700 shrink-0" />
                        <div className="text-right">
                          <span className="font-bold text-[11px] text-slate-800 block leading-tight">
                            {d.hotelName}
                          </span>
                          {d.hotelStarCategory && (
                            <span className="text-[9.5px] text-amber-800 font-medium block">
                              {d.hotelStarCategory}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic px-2">Transit / Sightseeing</span>
                    )}

                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg shrink-0">
                      {d.mealPlan || 'MAP Plan'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inclusions & Exclusions on Page 1 Overview */}
        <div className="px-8 py-5 border-b border-slate-200 bg-slate-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div className="bg-white p-3.5 rounded-xl border border-emerald-200/90 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[11px] text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Tour Inclusions</span>
              </div>
              <p className="text-[10.5px] text-slate-600 leading-relaxed whitespace-pre-line">
                {pkg.inclusions || 'Hotel accommodation, daily breakfast, private sightseeing transfers, and tour taxes.'}
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-rose-200/90 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[11px] text-rose-800">
                <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>Tour Exclusions</span>
              </div>
              <p className="text-[10.5px] text-slate-600 leading-relaxed whitespace-pre-line">
                {pkg.exclusions || 'Flight/train tickets, personal expenses, entry fees not mentioned, and tips.'}
              </p>
            </div>
          </div>
        </div>

        {/* Page 1 Running Footer Bar */}
        <div className="px-8 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-[#C91F28]" />
            <span>Contact: {company.phone || '+91 8884845595'}</span>
            <span className="text-slate-300">•</span>
            <span>{company.email || 'support@ooting.in'}</span>
          </div>
          <div className="font-bold text-[10.5px] text-slate-400">
            Page 1 of {itineraries.length > 4 ? 4 : 3}
          </div>
          <div className="flex items-center gap-1 font-bold text-[#C91F28]">
            <Globe className="w-3.5 h-3.5" />
            <span>{company.website || 'www.ooting.in'}</span>
          </div>
        </div>

        {/* Clean Page Break: Detailed Day-by-Day Schedule begins on Page 2 */}
        <div className="pdf-page-break-before"></div>

        {/* Detailed Day-by-Day Itinerary Section (Page 2+) */}
        <div className="px-8 py-5 space-y-6">
          {/* Running Page Header on Day-by-Day Section */}
          <div className="pt-2 pb-3 border-b border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-slate-900">
                {pkg.packageName}
              </div>
              <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
                Page 2 of {itineraries.length > 4 ? 4 : 3} • Day-by-Day Detailed Travel Schedule
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-black tracking-tight text-[#C91F28] uppercase block">
                {(company.name || 'OOTING').toUpperCase()}
              </span>
              <span className="text-[9.5px] text-slate-400 block font-medium">
                {company.tagline || 'Journeys Beyond Ordinary'}
              </span>
            </div>
          </div>

          <div className="space-y-6">
            {itineraries.map((day, idx) => {
              const hotelPhotos = getHotelPhotos(day);

              return (
                <div
                  key={day.id || idx}
                  className="itinerary-day-card page-break-avoid border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white"
                >
                  {/* Day Header Bar */}
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-[#C91F28] text-white font-black text-xs flex items-center justify-center shadow-xs">
                        {day.dayNumber}
                      </span>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">{day.title}</h3>
                        {(day as any).date && (
                          <span className="text-[11px] text-[#C91F28] font-bold block">
                            {(day as any).date}
                          </span>
                        )}
                      </div>
                    </div>

                    {(day.startTime || day.endTime) && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3 text-[#C91F28]" />
                        <span>
                          {day.startTime || 'Start'} {day.endTime ? `– ${day.endTime}` : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Day Content Body */}
                  <div className="p-5 space-y-3.5">
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                      {day.description}
                    </p>

                    {((day as any).highlights || (day as any).travelDetails) && (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                        {(day as any).highlights && (
                          <div>
                            <strong className="text-slate-800">Highlights: </strong>
                            <span className="text-slate-700">{(day as any).highlights}</span>
                          </div>
                        )}
                        {(day as any).travelDetails && (
                          <div>
                            <strong className="text-slate-800">Travel & Logistics: </strong>
                            <span className="text-slate-700">{(day as any).travelDetails}</span>
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
                          <div className="pt-2 day-photo-card">
                            <div className="w-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                              <div
                                className="relative w-full bg-slate-900/5 flex items-center justify-center overflow-hidden"
                                style={{ width: '100%', height: '140px', maxHeight: '140px', minHeight: '140px' }}
                              >
                                <img
                                  src={item.url}
                                  alt={placeLabel || day.title}
                                  className="w-full h-full object-cover"
                                  style={{ width: '100%', height: '140px', maxHeight: '140px', objectFit: 'cover' }}
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              {placeLabel && (
                                <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                                  <MapPin className="w-3.5 h-3.5 text-[#C91F28] shrink-0" style={{ width: '14px', height: '14px' }} />
                                  <span className="font-semibold text-slate-900">{placeLabel}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="pt-2">
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
                                    style={{ width: '100%', height: '135px', maxHeight: '135px', minHeight: '135px' }}
                                  >
                                    <img
                                      src={item.url}
                                      alt={placeLabel || ''}
                                      className="w-full h-full object-cover"
                                      style={{ width: '100%', height: '135px', maxHeight: '135px', objectFit: 'cover' }}
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                  {placeLabel && (
                                    <div className="px-2 py-1 bg-slate-50 border-t border-slate-200 flex items-center gap-1 text-[10px] text-slate-800 font-medium">
                                      <MapPin className="w-3 h-3 text-[#C91F28] shrink-0" style={{ width: '12px', height: '12px' }} />
                                      <span className="truncate font-semibold text-slate-800">{placeLabel}</span>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-100">
                      {day.places && (
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#C91F28] mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-semibold text-slate-800 block text-[11px]">Places Visited:</span>
                            <span className="text-slate-600 text-[11px]">{day.places}</span>
                          </div>
                        </div>
                      )}

                      {day.activities && (
                        <div className="flex items-start gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-semibold text-slate-800 block text-[11px]">Key Activities:</span>
                            <span className="text-slate-600 text-[11px]">{day.activities}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Hotel Accommodation Card: Prominent Showcase Matching Place Photo Size with Captions */}
                    {day.hotelName && day.hotelName.trim() && (
                      <div className="mt-3.5 p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 shadow-2xs space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-amber-200/60 pb-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-900 text-[11px] font-bold uppercase tracking-wider">
                              <Building2 className="w-3.5 h-3.5 text-[#C91F28]" />
                              <span>Overnight Stay & Accommodation</span>
                            </span>
                            <h4 className="font-bold text-xs text-slate-900">
                              {day.hotelName}
                            </h4>
                            {day.hotelStarCategory && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                {day.hotelStarCategory}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {day.mealPlan && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-amber-200 text-[10px] font-bold text-amber-800 shadow-2xs">
                                <Coffee className="w-3 h-3 text-amber-600" />
                                <span>{day.mealPlan}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Location & Timings */}
                        <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
                          {day.hotelLocation && (
                            <div className="flex items-center gap-1 text-[11px]">
                              <MapPin className="w-3 h-3 text-[#C91F28] shrink-0" />
                              <span className="font-medium text-slate-700">{day.hotelLocation}</span>
                            </div>
                          )}
                          {((day as any).hotelCheckIn || (day as any).hotelCheckOut) && (
                            <div className="flex items-center gap-2 text-[10px] font-medium">
                              {(day as any).hotelCheckIn && (
                                <span className="bg-white px-2 py-0.5 rounded border border-amber-200">
                                  Check-in: <strong className="text-slate-800">{(day as any).hotelCheckIn}</strong>
                                </span>
                              )}
                              {(day as any).hotelCheckOut && (
                                <span className="bg-white px-2 py-0.5 rounded border border-amber-200">
                                  Check-out: <strong className="text-slate-800">{(day as any).hotelCheckOut}</strong>
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {day.hotelDetails && (
                          <p className="text-[10.5px] text-slate-500 leading-snug">
                            {day.hotelDetails}
                          </p>
                        )}

                        {/* Prominent Hotel Photos Showcase with Captions (Like Place Image Size) */}
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
                                  <span className="font-bold text-amber-900 flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-[#C91F28]" />
                                    <span>{hotelPhotos[0].caption || 'Hotel Accommodation'}</span>
                                  </span>
                                  <span className="text-[10px] text-amber-800 font-semibold">{day.hotelName}</span>
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
                                      style={{ width: '100%', height: '130px', maxHeight: '130px', minHeight: '130px' }}
                                    >
                                      <img
                                        src={hPhoto.url}
                                        alt={hPhoto.caption || day.hotelName || 'Hotel'}
                                        className="w-full h-full object-cover"
                                        style={{ width: '100%', height: '130px', maxHeight: '130px', objectFit: 'cover' }}
                                        referrerPolicy="no-referrer"
                                      />
                                    </div>
                                    <div className="px-2.5 py-1 bg-amber-50/70 border-t border-amber-200/70 flex items-center gap-1 text-[10px]">
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
          <div className="p-3.5 border border-slate-200 rounded-xl text-[10px] text-slate-500 leading-normal bg-white page-break-avoid">
            <p>
              <strong>Booking Notice:</strong> All hotel accommodations and vehicle availability are subject to confirmation at the time of deposit payment. Rates are valid for 15 days from quote generation.
            </p>
          </div>

          {/* Running Footer Bar on Day Schedule */}
          <div className="pt-3 pb-1 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600 bg-white">
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[#C91F28]" />
              <span>Contact: {company.phone || '+91 8884845595'}</span>
              <span className="text-slate-300">•</span>
              <span>{company.email || 'support@ooting.in'}</span>
            </div>
            <div className="font-bold text-[10.5px] text-slate-400">
              Page 2 of {itineraries.length > 4 ? 4 : 3}
            </div>
            <div className="flex items-center gap-1 font-bold text-[#C91F28]">
              <Globe className="w-3.5 h-3.5" />
              <span>{company.website || 'www.ooting.in'}</span>
            </div>
          </div>
        </div>

        {/* Footer Wave Asset */}
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

        {/* Dedicated Final Page: Professional Executive Thank You & Corporate Directory */}
        <div
          className="pdf-page-break-before pdf-thank-you-page w-full flex flex-col justify-between bg-white text-slate-900 border-t-2 border-slate-200 print:border-none print:min-h-screen"
          style={{ minHeight: '960px' }}
        >
          {/* Top Wave Asset */}
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

          {/* Running Header on Thank You Page */}
          <div className="px-8 pt-4 pb-2 border-b border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-slate-900">
                {pkg.packageName}
              </div>
              <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
                Final Page • Journey Acknowledgement & Support
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-black tracking-tight text-[#C91F28] uppercase block">
                {(company.name || 'OOTING').toUpperCase()}
              </span>
              <span className="text-[9.5px] text-slate-400 block font-medium">
                {company.tagline || 'Journeys Beyond Ordinary'}
              </span>
            </div>
          </div>

          {/* Thank You Main Body: Clean, Professional, Spacious */}
          <div className="flex-1 flex flex-col justify-between p-8 sm:p-12 max-w-4xl mx-auto w-full">
            
            {/* Center Section: Large font THANK YOU + One Line below */}
            <div className="text-center pt-4 sm:pt-8 pb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-[#C91F28] text-xs font-extrabold uppercase tracking-wider rounded-full mb-3 border border-red-200">
                <Sparkles className="w-3.5 h-3.5 text-[#C91F28]" />
                <span>Happy Holidays & Safe Travels</span>
              </span>

              {/* Large Font THANK YOU */}
              <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-slate-900 leading-tight">
                THANK YOU
              </h1>

              {/* ONE Line below */}
              <p className="text-sm sm:text-base font-medium text-slate-600 italic mt-3 max-w-xl mx-auto">
                Thank you for choosing Ooting — we look forward to curating your next unforgettable journey.
              </p>

              {/* Red Accent Divider */}
              <div className="w-20 h-1 bg-[#C91F28] rounded-full mx-auto mt-4"></div>
            </div>

            {/* Side-by-Side Professional Corporate Details Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6 text-left">
              {/* Left Column: Brand Identity & Trust Pillars */}
              <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-4 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white p-1 border border-slate-200 shadow-2xs flex items-center justify-center shrink-0">
                    <img
                      src={company.logoUrl || '/assets/ooting-logo.jpg'}
                      alt="Ooting"
                      className="max-w-full max-h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 uppercase">
                      {(company.name || 'OOTING TOURS & TRAVELS').toUpperCase()}
                    </h3>
                    <span className="text-[11px] font-bold text-[#C91F28] uppercase tracking-wide block">
                      {company.tagline || 'Journeys Beyond Ordinary'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Your dedicated travel companion for bespoke holiday itineraries, handpicked hotel stays, and authentic local experiences across India.
                </p>

                <div className="space-y-2 pt-1 text-xs">
                  <div className="flex items-center gap-2 font-medium text-slate-700">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Verified & Sanitized Premium Accommodations</span>
                  </div>
                  <div className="flex items-center gap-2 font-medium text-slate-700">
                    <Car className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Commercial AC Fleet with Seasoned Chauffeurs</span>
                  </div>
                  <div className="flex items-center gap-2 font-medium text-slate-700">
                    <Headphones className="w-4 h-4 text-[#C91F28] shrink-0" />
                    <span>24/7 Dedicated Tour Concierge & Live Support</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Clean Corporate Office & Contact Details */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-red-50/40 via-white to-slate-50 border border-red-200/80 space-y-3.5 shadow-2xs">
                <div className="border-b border-red-200/60 pb-2 flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-[#C91F28]">
                    Official Booking & Support Desk
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    Always Reachable
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-red-50 text-[#C91F28] flex items-center justify-center shrink-0">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[9.5px] text-slate-400 uppercase font-semibold block">Helpline / WhatsApp</span>
                      <span className="font-bold text-slate-800 text-xs">
                        {company.phone || '+91 8884845595 / +91 6362845243'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-red-50 text-[#C91F28] flex items-center justify-center shrink-0">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[9.5px] text-slate-400 uppercase font-semibold block">Reservation Email</span>
                      <span className="font-bold text-slate-800 text-xs">
                        {company.email || 'support@ooting.in'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-red-50 text-[#C91F28] flex items-center justify-center shrink-0">
                      <Globe className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[9.5px] text-slate-400 uppercase font-semibold block">Official Website</span>
                      <span className="font-bold text-slate-800 text-xs">
                        {company.website || 'www.ooting.in'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-red-50 text-[#C91F28] flex items-center justify-center shrink-0">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[9.5px] text-slate-400 uppercase font-semibold block">GSTIN Registration</span>
                      <span className="font-bold text-slate-800 text-xs">
                        {company?.gstin && company.gstin !== 'NULL' ? company.gstin.replace(/^GSTIN:\s*/i, '') : 'NILL'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 pt-0.5">
                    <div className="w-7 h-7 rounded-lg bg-red-50 text-[#C91F28] flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[9.5px] text-slate-400 uppercase font-semibold block">Registered Head Office</span>
                      <span className="font-semibold text-slate-700 text-[11px] leading-tight block">
                        Ooting 3rd Cross, Malavagoppa, BH Road, Shivamogga, Karnataka, India
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Elegant Closing Signature */}
            <div className="pt-2 text-center text-xs text-slate-500 space-y-1">
              <div className="font-serif italic text-slate-600 text-sm">
                "We don't just plan tours; we curate unforgettable experiences to cherish for a lifetime."
              </div>
              <div className="text-[11px] font-bold text-slate-800">
                Warmest Regards, The Team at Ooting Tours & Travels
              </div>
            </div>
          </div>

          {/* Running Footer Bar on Thank You Page */}
          <div className="px-8 py-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600 bg-white">
            <div className="flex items-center gap-2 font-medium">
              <Phone className="w-3.5 h-3.5 text-[#C91F28]" />
              <span>Contact: {company.phone || '+91 8884845595'}</span>
              <span className="text-slate-300">•</span>
              <span>{company.email || 'support@ooting.in'}</span>
            </div>
            <div className="font-bold text-[10.5px] text-slate-400">
              Page {itineraries.length > 4 ? 4 : 3} of {itineraries.length > 4 ? 4 : 3}
            </div>
            <div className="flex items-center gap-1 font-bold text-[#C91F28]">
              <Globe className="w-3.5 h-3.5" />
              <span>{company.website || 'www.ooting.in'}</span>
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
          .pdf-page-break-before {
            page-break-before: always !important;
            break-before: page !important;
          }
        }
      `}</style>
    </div>
  );
};
