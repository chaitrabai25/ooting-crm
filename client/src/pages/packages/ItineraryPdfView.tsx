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
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Package, ItineraryDay } from '../../types/index.js';
import { useCompanySettings } from '../../context/CompanySettingsContext.js';
import { generateA4Pdf } from '../../utils/pdfGenerator.js';
import { printElement } from '../../utils/printDocument.js';
import { BrandLoader } from '../../components/ui/BrandLoader.js';

export const ItineraryPdfView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { company } = useCompanySettings();

  const [pkg, setPkg] = useState<Package | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    const fetchPackage = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/packages/' + id);
        setPkg(res.data);
      } catch (err) {
        console.error('Failed to load package itinerary for PDF:', err);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchPackage();
  }, [id]);

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
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-2">
            Tour Overview & Highlights
          </h3>
          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
            {pkg.description}
          </p>
        </div>

        {/* Day-by-Day Itinerary Section */}
        <div className="px-8 py-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Detailed Day-by-Day Travel Schedule
            </h2>
            <span className="text-xs font-semibold text-[#C91F28]">
              {itineraries.length} Days Planned
            </span>
          </div>

          <div className="space-y-6">
            {itineraries.map((day, idx) => (
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

                  {/* Day Photo(s) - Disciplined Aspect Ratio & Height with Place Name Label */}
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
                              style={{ width: '100%', height: '210px', maxHeight: '210px', minHeight: '210px' }}
                            >
                              <img
                                src={item.url}
                                alt={placeLabel || day.title}
                                className="w-full h-full object-cover"
                                style={{ width: '100%', height: '210px', maxHeight: '210px', objectFit: 'cover' }}
                                crossOrigin="anonymous"
                                onError={(e) => {
                                  (e.currentTarget.closest('.day-photo-card') as HTMLElement)?.style.setProperty('display', 'none');
                                }}
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
                                    crossOrigin="anonymous"
                                    onError={(e) => {
                                      (e.currentTarget.closest('.day-photo-card') as HTMLElement)?.style.setProperty('display', 'none');
                                    }}
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

                  {/* Hotel Accommodation Card (Rendered only if hotel is assigned to this day) */}
                  {day.hotelName && day.hotelName.trim() && (
                    <div className="mt-3 p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 shadow-2xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-900">
                          <Building2 className="w-3.5 h-3.5 text-[#C91F28]" />
                          Overnight Stay / Hotel
                        </span>
                        {day.mealPlan && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-amber-200 text-[10px] font-semibold text-amber-800">
                            <Coffee className="w-3 h-3 text-amber-600" />
                            {day.mealPlan}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        {day.hotelImageUrl && (
                          <div className="w-24 h-16 rounded-lg overflow-hidden border border-amber-200/90 shrink-0 bg-white">
                            <img
                              src={day.hotelImageUrl}
                              alt={day.hotelName}
                              className="w-full h-full object-cover"
                              crossOrigin="anonymous"
                              onError={(e) => {
                                (e.currentTarget.parentElement as HTMLElement)?.style.setProperty('display', 'none');
                              }}
                            />
                          </div>
                        )}

                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-xs text-slate-900">
                              {day.hotelName}
                            </h4>
                            {day.hotelStarCategory && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-medium">
                                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                {day.hotelStarCategory}
                              </span>
                            )}
                          </div>

                          {day.hotelLocation && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-600">
                              <MapPin className="w-3 h-3 text-[#C91F28] shrink-0" />
                              <span>{day.hotelLocation}</span>
                            </div>
                          )}

                          {day.hotelDetails && (
                            <p className="text-[10px] text-slate-500 leading-tight">
                              {day.hotelDetails}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inclusions & Exclusions */}
        <div className="px-8 py-6 bg-slate-50/70 border-t border-slate-200 page-break-avoid">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-4">
            Package Inclusions & Exclusions
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Inclusions */}
            <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>What Is Included:</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {pkg.inclusions || 'Hotel accommodation, daily breakfast, private sightseeing transfers, and tour taxes.'}
              </p>
            </div>

            {/* Exclusions */}
            <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-2xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-xs text-rose-800">
                <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>What Is Excluded:</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {pkg.exclusions || 'Flight/train tickets, personal expenses, entry fees not mentioned, and tips.'}
              </p>
            </div>
          </div>
        </div>

        {/* Important Terms & Booking Notice */}
        <div className="px-8 py-4 border-t border-slate-200 text-[10px] text-slate-500 leading-normal bg-white page-break-avoid">
          <p>
            <strong>Booking Notice:</strong> All hotel accommodations and vehicle availability are subject to confirmation at the time of deposit payment. Rates are valid for 15 days from quote generation.
          </p>
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
        }
      `}</style>
    </div>
  );
};
