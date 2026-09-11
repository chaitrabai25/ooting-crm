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
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Package, ItineraryDay } from '../../types/index.js';

export const ItineraryPdfView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [pkg, setPkg] = useState<Package | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Package</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 hidden sm:inline">
            Press 'Print / Save as PDF' to export high-resolution letterhead
          </span>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C91F28] hover:bg-[#a81920] text-white text-xs font-bold rounded-xl shadow-md transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* Main A4 Printable Document Paper */}
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden print:shadow-none print:rounded-none print:max-w-full text-slate-800 font-sans print:m-0">
        
        {/* Top Header Wave Asset */}
        <div className="w-full h-4 bg-[#C91F28] overflow-hidden relative">
          <img
            src="/assets/ooting-header-wave.png"
            alt=""
            className="w-full h-full object-cover opacity-90"
          />
        </div>

        {/* Letterhead Header Section */}
        <div className="px-8 pt-6 pb-4 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Logo & Company Identity */}
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center p-1 bg-white shadow-xs">
                <img
                  src="/assets/ooting-logo.jpg"
                  alt="Ooting"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="text-lg font-black tracking-tight text-slate-900 block leading-tight">
                  OOTING
                </span>
                <span className="text-[11px] font-bold text-[#C91F28] tracking-wide uppercase block">
                  Journeys Beyond Ordinary
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Premium Tour Operator & Destination Specialist
                </span>
              </div>
            </div>

            {/* Official Contact Details */}
            <div className="text-right text-[11px] text-slate-600 space-y-0.5">
              <div className="flex items-center justify-end gap-1.5 font-medium">
                <Globe className="w-3 h-3 text-[#C91F28]" />
                <span>www.ooting.com</span>
              </div>
              <div className="flex items-center justify-end gap-1.5">
                <Mail className="w-3 h-3 text-[#C91F28]" />
                <span>contact@ooting.in</span>
              </div>
              <div className="flex items-center justify-end gap-1.5">
                <Phone className="w-3 h-3 text-[#C91F28]" />
                <span>+91 98450 11223</span>
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
                    <h3 className="font-bold text-sm text-slate-900">{day.title}</h3>
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

                  {/* Day Photo if present */}
                  {day.imageUrl && (
                    <div className="pt-1">
                      <div className="w-full max-h-60 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                        <img
                          src={day.imageUrl}
                          alt={day.title}
                          className="w-full h-52 object-cover"
                        />
                      </div>
                    </div>
                  )}

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
