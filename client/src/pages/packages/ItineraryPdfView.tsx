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
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Package, ItineraryDay } from '../../types/index.js';
import { useCompanySettings } from '../../context/CompanySettingsContext.js';
import { generateA4Pdf } from '../../utils/pdfGenerator.js';

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

  const handlePrint = () => {
    window.print();
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
        onePageOnly: false,
      });
      download();
    } catch (err) {
      console.error('Failed to download itinerary PDF:', err);
      alert('PDF generation error. Please try the Print button.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="animate-pulse text-slate-500 text-sm font-medium">
          Generating printable itinerary document...
        </div>
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
    <div className="min-h-screen bg-slate-200/70 py-8 px-4 print:p-0 print:bg-white">
      {/* Top Floating Action Bar (Hidden in Print) */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-300/80 shadow-md print:hidden">
        <button
          type="button"
          onClick={() => navigate('/packages/' + id)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Package</span>
        </button>

        <div className="flex items-center gap-3">
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
        className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden print:shadow-none print:rounded-none print:max-w-full text-slate-800 font-sans print:m-0"
      >
        
        {/* Top Header Wave Asset */}
        <div className="w-full h-4 bg-[#C91F28] overflow-hidden relative">
          <img
            src="/assets/ooting-header-wave.png"
            alt=""
            className="w-full h-full object-cover opacity-90"
          />
        </div>

        {/* Letterhead Header Section */}
        <div className="px-8 pt-6 pb-5 border-b border-slate-200">
          <div className="grid grid-cols-2 gap-8 items-start">
            {/* LEFT SIDE: Logo & Company Name/Tagline */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center bg-white p-1 border border-slate-200 shadow-xs flex-shrink-0">
                <img
                  src={company.logoUrl || '/assets/ooting-logo.jpg'}
                  alt={company.name || 'Ooting'}
                  className="w-full h-full object-contain"
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

            {/* RIGHT SIDE: Company Contact Details (Neat Right-Aligned Container with Fixed-Width Red Icons) */}
            <div className="flex justify-end ml-auto shrink-0">
              <div className="flex flex-col space-y-2 text-xs text-slate-700 min-w-[260px] max-w-[340px]">
                {company.website && (
                  <div className="flex items-center gap-2.5">
                    <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-[#C91F28]">
                      <Globe className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-medium text-slate-800 tracking-tight break-all">{company.website}</span>
                  </div>
                )}
                {company.email && (
                  <div className="flex items-center gap-2.5">
                    <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-[#C91F28]">
                      <Mail className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-medium text-slate-800 tracking-tight break-all">{company.email}</span>
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-center gap-2.5">
                    <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-[#C91F28]">
                      <Phone className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-medium text-slate-800 tracking-tight">{company.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-[#C91F28]">
                    <FileText className="w-3.5 h-3.5" />
                  </span>
                  <span className="font-mono font-bold text-slate-900 tracking-tight">
                    GSTIN: {company?.gstin?.trim() ? company.gstin.trim().toUpperCase().replace(/^GSTIN:\s*/i, '') : 'NIL'}
                  </span>
                </div>
                {company.address && (
                  <div className="flex items-start gap-2.5 pt-0.5">
                    <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-[#C91F28] mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-slate-600 leading-snug break-words">
                      {company.address}
                    </span>
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
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1.5 font-medium">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#C91F28]" /> {pkg.destination}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#C91F28]" /> {pkg.duration}
                </span>
                <span>•</span>
                <span className="capitalize font-semibold text-slate-800">{pkg.packageType.toLowerCase()} Package</span>
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
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#C91F28] mb-2">
            Tour Overview & Highlights
          </h3>
          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
            {pkg.description}
          </p>
        </div>

        {/* Day-by-Day Itinerary Section */}
        <div className="px-8 py-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
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
                className="page-break-avoid border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white"
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

                  {/* Day Photo(s) - Intelligent aspect-ratio scaling with Place Name label */}
                  {(() => {
                    let photoItems: { url: string; label?: string }[] = [];
                    if ((day as any).images) {
                      try {
                        const parsed = JSON.parse((day as any).images);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                          photoItems = parsed
                            .map((item: any) => {
                              if (typeof item === 'string') return { url: item };
                              return { url: item.url || item.imageUrl, label: item.label || item.name || item.placeName };
                            })
                            .filter((item) => Boolean(item.url));
                        }
                      } catch {
                        if (typeof (day as any).images === 'string' && (day as any).images.includes(',')) {
                          photoItems = (day as any).images
                            .split(',')
                            .map((s: string) => ({ url: s.trim() }))
                            .filter((item: any) => Boolean(item.url));
                        }
                      }
                    }
                    if (photoItems.length === 0 && day.imageUrl) {
                      photoItems = [{ url: day.imageUrl }];
                    }

                    if (photoItems.length === 0) return null;

                    const placesList = day.places
                      ? day.places.split(',').map((s: string) => s.trim()).filter(Boolean)
                      : [];

                    if (photoItems.length === 1) {
                      const item = photoItems[0];
                      const placeLabel = item.label || (placesList.length > 0 ? placesList.join(' • ') : day.title);
                      return (
                        <div className="pt-2">
                          <div className="w-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                            <div className="relative w-full bg-slate-900/5 flex items-center justify-center aspect-[16/10] max-h-[420px] overflow-hidden">
                              <img
                                src={item.url}
                                alt={placeLabel}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80';
                                }}
                              />
                            </div>
                            {placeLabel && (
                              <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                                <MapPin className="w-3.5 h-3.5 text-[#C91F28] flex-shrink-0" />
                                <span className="font-semibold text-slate-900">{placeLabel}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {photoItems.map((item, pIdx) => {
                            const placeLabel =
                              item.label || placesList[pIdx] || placesList[0] || `${day.title} - View ${pIdx + 1}`;
                            return (
                              <div
                                key={pIdx}
                                className="flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs"
                              >
                                <div className="relative w-full bg-slate-900/5 flex items-center justify-center aspect-[16/10] overflow-hidden">
                                  <img
                                    src={item.url}
                                    alt={placeLabel}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src =
                                        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80';
                                    }}
                                  />
                                </div>
                                {placeLabel && (
                                  <div className="px-2.5 py-1.5 bg-slate-50 border-t border-slate-200 flex items-center gap-1.5 text-[11px] text-slate-800 font-medium">
                                    <MapPin className="w-3 h-3 text-[#C91F28] flex-shrink-0" />
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
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inclusions & Exclusions */}
        <div className="px-8 py-6 bg-slate-50/70 border-t border-slate-200 page-break-avoid">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-4">
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
        <div className="w-full h-4 bg-[#C91F28] overflow-hidden relative">
          <img
            src="/assets/ooting-footer-wave.png"
            alt=""
            className="w-full h-full object-cover opacity-90"
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
