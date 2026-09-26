import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Printer,
  ArrowLeft,
  Phone,
  Mail,
  Globe,
  MapPin,
  Calendar,
  Clock,
  Car,
  User,
  Share2,
  ShieldCheck,
  CreditCard,
  Download,
  Plus,
  Trash2,
  Table,
  Loader2,
  Eye,
  X,
  FileText,
  Save,
  Check,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { CabBooking } from '../../types/index.js';
import { generateA4Pdf } from '../../utils/pdfGenerator.js';
import { useCompanySettings } from '../../context/CompanySettingsContext.js';

interface DutySlipTableRow {
  id: string;
  label: string;
  startVal: string;
  endVal: string;
  remarks: string;
}

const DutySlipDocumentBody: React.FC<{
  cab: CabBooking;
  company: any;
  showCustomTable: boolean;
  customRows: DutySlipTableRow[];
  onRowChange?: (id: string, field: keyof DutySlipTableRow, value: string) => void;
  onAddRow?: () => void;
  onRemoveRow?: (id: string) => void;
  isStaticPreview?: boolean;
}> = ({
  cab,
  company,
  showCustomTable,
  customRows,
  onRowChange,
  onAddRow,
  onRemoveRow,
  isStaticPreview = false,
}) => {
  return (
    <>
      {/* Top Header Wave Accent */}
      <div className="w-full h-3 bg-[#C91F28] overflow-hidden relative">
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
                Tourist Cab & Travel Services
              </span>
            </div>
          </div>

          {/* RIGHT SIDE: Company Contact Details (Neat Left-Aligned Vertical List with Fixed-Width Icons) */}
          <div className="flex justify-end">
            <div className="flex flex-col space-y-1.5 text-xs text-slate-700 min-w-[250px]">
              <div className="flex items-center gap-2.5">
                <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-[#C91F28]">
                  <Globe className="w-3.5 h-3.5" />
                </span>
                <span className="font-medium text-slate-800 tracking-tight">{company.website || 'https://ooting.in'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-[#C91F28]">
                  <Phone className="w-3.5 h-3.5" />
                </span>
                <span className="font-medium text-slate-800 tracking-tight">{company.phone || '+91 98765 43210'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-[#C91F28]">
                  <Mail className="w-3.5 h-3.5" />
                </span>
                <span className="font-medium text-slate-800 tracking-tight">{company.email || 'contact@ooting.com'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-[#C91F28]">
                  <FileText className="w-3.5 h-3.5" />
                </span>
                <span className="font-mono font-bold text-slate-900 tracking-tight">{company.gstin || '29AABCO1234F1Z5'}</span>
              </div>
              <div className="flex items-start gap-2.5 pt-0.5">
                <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-[#C91F28] mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                </span>
                <span className="text-slate-600 leading-snug max-w-[280px]">
                  {company.address || 'Ooting Holidays Private Limited, Bangalore, Karnataka, India'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Document Title & Reference Banner */}
      <div className="bg-slate-900 text-white px-8 py-3 flex items-center justify-between">
        <div>
          <span className="text-[10px] tracking-widest uppercase text-amber-400 font-bold block">
            OFFICIAL TRAVEL VOUCHER
          </span>
          <h1 className="text-base font-black tracking-wide">
            CAB DUTY SLIP & PASSENGER MANIFEST
          </h1>
        </div>
        <div className="flex items-center gap-6 text-right">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Duty Slip #</span>
            <span className="font-mono text-sm font-bold text-amber-300 tracking-wider">
              {cab.bookingReference}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Duty Date</span>
            <span className="text-xs font-bold text-white">
              {new Date(cab.pickupDate).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-8 space-y-5">
        {/* Guest & Journey Overview Grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* Passenger / Guest Details */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#C91F28] mb-3 flex items-center gap-1.5">
              <User className="w-4 h-4" />
              Guest / Passenger Details
            </h3>
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-[130px_1fr] items-center">
                <span className="text-slate-500 font-medium">Customer Name:</span>
                <span className="font-bold text-slate-900">{cab.customerName}</span>
              </div>
              <div className="grid grid-cols-[130px_1fr] items-center">
                <span className="text-slate-500 font-medium">Phone Number:</span>
                <span className="font-semibold text-slate-800">{cab.customerPhone}</span>
              </div>
              {cab.customerEmail && (
                <div className="grid grid-cols-[130px_1fr] items-center">
                  <span className="text-slate-500 font-medium">Email:</span>
                  <span className="text-slate-700">{cab.customerEmail}</span>
                </div>
              )}
              <div className="grid grid-cols-[130px_1fr] items-center">
                <span className="text-slate-500 font-medium">No. of Guests:</span>
                <span className="font-bold text-slate-900">{cab.passengerCount} Guest(s)</span>
              </div>
            </div>
          </div>

          {/* Reporting & Schedule Details */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#C91F28] mb-3 flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              Schedule & Reporting Details
            </h3>
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-[130px_1fr] items-center">
                <span className="text-slate-500 font-medium">Reporting Date:</span>
                <span className="font-bold text-slate-900">
                  {new Date(cab.pickupDate).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="grid grid-cols-[130px_1fr] items-center">
                <span className="text-slate-500 font-medium">Reporting Time:</span>
                <span className="font-bold text-[#C91F28]">{cab.pickupTime}</span>
              </div>
              <div className="grid grid-cols-[130px_1fr] items-center">
                <span className="text-slate-500 font-medium">Trip Category:</span>
                <span className="font-semibold text-slate-800">{cab.tripType}</span>
              </div>
              <div className="grid grid-cols-[130px_1fr] items-center">
                <span className="text-slate-500 font-medium">Booking Status:</span>
                <span className="font-bold text-emerald-700">{cab.bookingStatus}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Route & Vehicle Assignment */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#C91F28]" />
              Journey Route & Vehicle Assignment
            </h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-6 text-xs">
            <div className="space-y-2.5 border-r border-slate-200 pr-4">
              <div className="grid grid-cols-[120px_1fr] items-center">
                <span className="text-slate-500 font-medium">Pickup Location:</span>
                <span className="font-bold text-slate-900">{cab.pickupPlace}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] items-center">
                <span className="text-slate-500 font-medium">Drop Location:</span>
                <span className="font-bold text-slate-900">{cab.dropPlace}</span>
              </div>
              {cab.dutyRange && (
                <div className="grid grid-cols-[120px_1fr] items-center">
                  <span className="text-slate-500 font-medium">Duty Range:</span>
                  <span className="font-bold text-[#C91F28]">{cab.dutyRange}</span>
                </div>
              )}
              {cab.travelRoute && (
                <div className="grid grid-cols-[120px_1fr] items-start">
                  <span className="text-slate-500 font-medium">Tour Route:</span>
                  <span className="text-slate-700 leading-snug">{cab.travelRoute}</span>
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              <div className="grid grid-cols-[120px_1fr] items-center">
                <span className="text-slate-500 font-medium">Vehicle Type:</span>
                <span className="font-bold text-slate-900">
                  {cab.vehicleType}{' '}
                  <span className="font-normal text-slate-500">({cab.requiredCabType})</span>
                </span>
              </div>
              <div className="grid grid-cols-[120px_1fr] items-center">
                <span className="text-slate-500 font-medium">Vehicle Number:</span>
                <span className="font-mono font-bold text-xs text-slate-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 inline-block w-fit">
                  {cab.carNumber || 'To Be Assigned'}
                </span>
              </div>
              <div className="grid grid-cols-[120px_1fr] items-center">
                <span className="text-slate-500 font-medium">Driver Name:</span>
                <span className="font-bold text-slate-900">
                  {cab.driverName || 'Will be notified via SMS'}
                </span>
              </div>
              <div className="grid grid-cols-[120px_1fr] items-center">
                <span className="text-slate-500 font-medium">Driver Contact:</span>
                <span className="font-bold text-slate-900">{cab.driverPhone || '—'}</span>
              </div>
              {cab.assignedStaff?.name && (
                <div className="grid grid-cols-[120px_1fr] items-center text-slate-500">
                  <span className="font-medium">Coordinator:</span>
                  <span className="font-semibold text-slate-700">{cab.assignedStaff.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Optional Additional Details / Duty Log Table */}
        {showCustomTable && (
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#C91F28]" />
                Additional Duty Details & Log
              </h3>
              {!isStaticPreview && onAddRow && (
                <button
                  type="button"
                  onClick={onAddRow}
                  className="print:hidden pdf-hide inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-white px-2.5 py-1 rounded border border-slate-200 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Row</span>
                </button>
              )}
            </div>

            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3 border-r border-slate-200 text-left">Reading / Description</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Starting</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Closing</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Remarks / Total</th>
                  {!isStaticPreview && <th className="py-2.5 px-2 print:hidden pdf-hide w-8"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {customRows.map((row) => (
                  <tr key={row.id} className="h-9">
                    <td className="font-semibold text-slate-700 bg-slate-50/50 border-r border-slate-200 text-left px-3">
                      {isStaticPreview ? (
                        <span>{row.label}</span>
                      ) : (
                        <>
                          <span className="hidden print:inline-block pdf-show text-xs font-semibold text-slate-800">
                            {row.label || '—'}
                          </span>
                          <input
                            type="text"
                            value={row.label}
                            onChange={(e) => onRowChange?.(row.id, 'label', e.target.value)}
                            className="w-full bg-transparent border-none focus:outline-none font-semibold text-slate-800 text-xs print:hidden pdf-hide"
                          />
                        </>
                      )}
                    </td>
                    <td className="border-r border-slate-200 px-2 text-center">
                      {isStaticPreview ? (
                        <span>{row.startVal || '—'}</span>
                      ) : (
                        <>
                          <span className="hidden print:inline-block pdf-show text-xs text-slate-800">
                            {row.startVal || '—'}
                          </span>
                          <input
                            type="text"
                            value={row.startVal}
                            onChange={(e) => onRowChange?.(row.id, 'startVal', e.target.value)}
                            placeholder="—"
                            className="w-full bg-transparent text-center border-none focus:outline-none text-xs print:hidden pdf-hide"
                          />
                        </>
                      )}
                    </td>
                    <td className="border-r border-slate-200 px-2 text-center">
                      {isStaticPreview ? (
                        <span>{row.endVal || '—'}</span>
                      ) : (
                        <>
                          <span className="hidden print:inline-block pdf-show text-xs text-slate-800">
                            {row.endVal || '—'}
                          </span>
                          <input
                            type="text"
                            value={row.endVal}
                            onChange={(e) => onRowChange?.(row.id, 'endVal', e.target.value)}
                            placeholder="—"
                            className="w-full bg-transparent text-center border-none focus:outline-none text-xs print:hidden pdf-hide"
                          />
                        </>
                      )}
                    </td>
                    <td className="border-r border-slate-200 px-2 text-center">
                      {isStaticPreview ? (
                        <span>{row.remarks || '—'}</span>
                      ) : (
                        <>
                          <span className="hidden print:inline-block pdf-show text-xs text-slate-800">
                            {row.remarks || '—'}
                          </span>
                          <input
                            type="text"
                            value={row.remarks}
                            onChange={(e) => onRowChange?.(row.id, 'remarks', e.target.value)}
                            placeholder="—"
                            className="w-full bg-transparent text-center border-none focus:outline-none text-xs print:hidden pdf-hide"
                          />
                        </>
                      )}
                    </td>
                    {!isStaticPreview && onRemoveRow && (
                      <td className="print:hidden pdf-hide text-center px-1">
                        <button
                          type="button"
                          onClick={() => onRemoveRow(row.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                          title="Remove row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tariff, Driver Allowance & Financial Summary */}
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-[#C91F28]" />
              Fare & Driver Allowance Summary
            </h3>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                cab.paymentStatus === 'PAID'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              Payment: {cab.paymentStatus}
            </span>
          </div>

          <div
            className={`grid ${
              cab.driverAllowanceTotal && cab.driverAllowanceTotal > 0
                ? 'grid-cols-4'
                : 'grid-cols-3'
            } gap-3 pt-2 border-t border-slate-200 text-center`}
          >
            <div>
              <span className="text-[11px] uppercase font-bold text-slate-400 block">Total Agreed Fare</span>
              <span className="text-base font-black text-slate-900">
                ₹{Number(cab.cabAmount).toLocaleString('en-IN')}
              </span>
            </div>

            {cab.driverAllowanceTotal && cab.driverAllowanceTotal > 0 && (
              <div className="bg-amber-50/80 rounded-lg p-2 border border-amber-200/80">
                <span className="text-[11px] uppercase font-bold text-amber-900 block">
                  Driver Allowance / Driver Bata
                </span>
                <span className="text-base font-black text-amber-900">
                  ₹{Number(cab.driverAllowanceTotal).toLocaleString('en-IN')}
                </span>
                {cab.driverAllowanceRate && cab.driverAllowanceDays ? (
                  <span className="text-xs text-amber-800 block font-medium">
                    {cab.driverAllowanceType === 'NIGHT_WISE'
                      ? 'Night-wise'
                      : cab.driverAllowanceType === 'CUSTOM'
                      ? 'Custom'
                      : 'Day-wise'}{' '}
                    ₹{cab.driverAllowanceRate} × {cab.driverAllowanceDays}{' '}
                    {cab.driverAllowanceType === 'NIGHT_WISE' ? 'nights' : 'days'}
                  </span>
                ) : null}
              </div>
            )}

            <div>
              <span className="text-[11px] uppercase font-bold text-slate-400 block">Advance Received</span>
              <span className="text-base font-black text-emerald-700">
                ₹{Number(cab.advanceAmount).toLocaleString('en-IN')}
              </span>
            </div>

            <div>
              <span className="text-[11px] uppercase font-bold text-slate-400 block">Balance Payable</span>
              <span className="text-base font-black text-[#C91F28]">
                ₹{Number(cab.balanceAmount).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Terms & Important Travel Notes */}
        <div className="border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 space-y-1 bg-amber-50/40">
          <h4 className="font-bold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            Standard Tour & Cab Guidelines
          </h4>
          <p>
            1. <strong>Air Conditioning:</strong> As per standard hill and mountain terrain vehicle norms, AC may be turned off during steep hairpin climbs for passenger and engine safety.
          </p>
          <p>
            2. <strong>Tolls & Parking:</strong> State border taxes, tolls, entry tickets, and parking fees are extra as per actual receipts unless explicitly included in the package.
          </p>
          {cab.specialInstructions && (
            <p className="text-slate-900 font-semibold pt-0.5">
              Special Note: {cab.specialInstructions}
            </p>
          )}
        </div>

        {/* Official Verification Notice (NO SIGNATURES) */}
        <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/80 text-center space-y-0.5">
          <div className="flex items-center justify-center gap-1.5 text-slate-900 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C91F28]" />
            <span>Official Travel Duty Slip • {company.name || 'Ooting'}</span>
          </div>
          <p className="text-[10px] text-slate-500">
            Computer-generated service document verified by {company.name || 'Ooting'} CRM. Valid for official travel coordination without physical signature.
          </p>
        </div>
      </div>

      {/* Bottom Wave Footer */}
      <div className="w-full h-3 bg-[#C91F28] overflow-hidden relative mt-auto flex-shrink-0">
        <img
          src="/assets/ooting-header-wave.png"
          alt=""
          className="w-full h-full object-cover opacity-90 rotate-180"
        />
      </div>
    </>
  );
};

export const CabVoucher: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { company: globalCompany } = useCompanySettings();

  const [cab, setCab] = useState<CabBooking | null>(null);
  const [serverCompany, setServerCompany] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Additional Details / Table State (Default disabled)
  const [showCustomTable, setShowCustomTable] = useState(false);
  const [customRows, setCustomRows] = useState<DutySlipTableRow[]>([
    { id: '1', label: 'Starting & Ending Km', startVal: '', endVal: '', remarks: '' },
    { id: '2', label: 'Duty Time (HH:MM)', startVal: '', endVal: '', remarks: '' },
    { id: '3', label: 'Toll & Parking (₹)', startVal: '', endVal: '', remarks: '' },
  ]);

  const [isSavingRows, setIsSavingRows] = useState(false);
  const [saveRowsSuccess, setSaveRowsSuccess] = useState(false);

  // Merge server company with global company settings (global context is primary source of truth)
  const company = {
    ...serverCompany,
    ...globalCompany,
  };

  useEffect(() => {
    const fetchVoucher = async () => {
      try {
        setIsLoading(true);
        const res = await api.get(`/cabs/${id}/voucher`);
        setCab(res.data.cab);
        setServerCompany(res.data.company);

        if (res.data.cab?.customTableRows) {
          try {
            const loaded = typeof res.data.cab.customTableRows === 'string'
              ? JSON.parse(res.data.cab.customTableRows)
              : res.data.cab.customTableRows;
            if (Array.isArray(loaded) && loaded.length > 0) {
              setCustomRows(loaded);
              setShowCustomTable(true);
            }
          } catch (e) {
            console.warn('Could not parse saved customTableRows:', e);
          }
        }
      } catch (err) {
        console.error('Failed to load cab voucher:', err);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchVoucher();
  }, [id]);

  const handleSaveRows = async () => {
    if (!cab) return;
    setIsSavingRows(true);
    try {
      await api.patch(`/cabs/${cab.id}/table-rows`, {
        customTableRows: showCustomTable ? customRows : null,
      });
      setSaveRowsSuccess(true);
      setTimeout(() => setSaveRowsSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save duty slip table:', err);
      alert('Failed to save duty slip table rows.');
    } finally {
      setIsSavingRows(false);
    }
  };

  const handlePrint = () => {
    document.body.classList.add('printing-dedicated');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-dedicated');
    }, 1000);
  };

  const handleDownloadPdf = async () => {
    if (!cab) return;
    try {
      setIsGeneratingPdf(true);
      const { download } = await generateA4Pdf({
        elementId: 'duty-slip-document',
        filename: `DutySlip-${cab.bookingReference}.pdf`,
      });
      download();
    } catch (err) {
      console.error('Failed to generate Duty Slip PDF:', err);
      alert('Could not generate PDF. Please try the Print button.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleWhatsApp = () => {
    if (!cab) return;
    const phone = cab.customerPhone.replace(/[^0-9]/g, '');
    const allowanceText = cab.driverAllowanceTotal && cab.driverAllowanceTotal > 0
      ? `Driver Allowance: ₹${cab.driverAllowanceTotal} (${cab.driverAllowanceType === 'NIGHT_WISE' ? 'Night-wise' : cab.driverAllowanceType === 'CUSTOM' ? 'Custom' : 'Day-wise'})\n`
      : '';
    const dutyRangeText = cab.dutyRange ? `Duty Range: ${cab.dutyRange}\n` : '';

    const text = encodeURIComponent(
      `*${(company.name || 'OOTING').toUpperCase()} - CAB DUTY SLIP*\n` +
      `Booking Ref: ${cab.bookingReference}\n` +
      `Guest Name: ${cab.customerName}\n` +
      `Pickup Date: ${new Date(cab.pickupDate).toLocaleDateString('en-IN')}\n` +
      `Pickup Time: ${cab.pickupTime}\n` +
      `Pickup Location: ${cab.pickupPlace}\n` +
      `Drop Location: ${cab.dropPlace}\n` +
      dutyRangeText +
      `Vehicle: ${cab.vehicleType} (${cab.requiredCabType})\n` +
      (cab.carNumber ? `Car No: ${cab.carNumber}\n` : '') +
      (cab.driverName ? `Driver: ${cab.driverName} (${cab.driverPhone || 'N/A'})\n` : '') +
      `Total Fare: ₹${Number(cab.cabAmount).toLocaleString('en-IN')}\n` +
      allowanceText +
      `Balance Due: ₹${Number(cab.balanceAmount).toLocaleString('en-IN')}\n\n` +
      `Have a safe & memorable journey with ${company.name || 'Ooting'}!`
    );
    window.open(`https://wa.me/${phone.length === 10 ? '91' + phone : phone}?text=${text}`, '_blank');
  };

  const handleAddRow = () => {
    const newRow: DutySlipTableRow = {
      id: Date.now().toString(),
      label: 'Other Expense / Item',
      startVal: '',
      endVal: '',
      remarks: '',
    };
    setCustomRows([...customRows, newRow]);
  };

  const handleRemoveRow = (rowId: string) => {
    setCustomRows(customRows.filter((r) => r.id !== rowId));
  };

  const handleRowChange = (rowId: string, field: keyof DutySlipTableRow, value: string) => {
    setCustomRows(
      customRows.map((r) => (r.id === rowId ? { ...r, [field]: value } : r))
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
        <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
          <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
          <span>Generating printable Cab Duty Slip...</span>
        </div>
      </div>
    );
  }

  if (!cab) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 gap-3">
        <p className="text-slate-600 dark:text-slate-400 text-sm">Cab booking record could not be loaded.</p>
        <button
          onClick={() => navigate('/cabs')}
          className="px-4 py-2 bg-[#C91F28] text-white text-xs font-semibold rounded-xl"
        >
          Return to Cab Bookings
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200/70 dark:bg-slate-950 py-8 px-4 print:p-0 print:bg-white text-slate-800">
      {/* Top Floating Action Bar (Hidden in Print) */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-300/80 dark:border-slate-800 shadow-md print:hidden">
        <button
          type="button"
          onClick={() => navigate('/cabs')}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Cab List</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Additional Table Button */}
          <button
            type="button"
            onClick={() => setShowCustomTable(!showCustomTable)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
              showCustomTable
                ? 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>{showCustomTable ? 'Hide Extra Table' : '+ Add Table / Additional Details'}</span>
          </button>

          {/* Save Table Rows Button */}
          {showCustomTable && (
            <button
              type="button"
              onClick={handleSaveRows}
              disabled={isSavingRows}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer ${
                saveRowsSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isSavingRows ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : saveRowsSuccess ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{saveRowsSuccess ? 'Saved!' : isSavingRows ? 'Saving...' : 'Save Table'}</span>
            </button>
          )}

          {/* Preview Modal Button */}
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-slate-300 dark:border-slate-700"
          >
            <Eye className="w-4 h-4 text-brand-600" />
            <span>Print Preview</span>
          </button>

          {/* WhatsApp Share */}
          <button
            type="button"
            onClick={handleWhatsApp}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp Duty Slip</span>
          </button>

          {/* Download PDF */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-amber-400" />
                <span>Download PDF</span>
              </>
            )}
          </button>

          {/* Print Button */}
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

      {/* Main A4 Duty Slip Document (Container isolated for dedicated PDF and Print) */}
      <div
        id="duty-slip-document"
        className="flex min-h-[1123px] w-[794px] max-w-full mx-auto flex-col bg-white rounded-2xl shadow-xl overflow-hidden print:shadow-none print:rounded-none text-slate-800 font-sans print:m-0 border border-slate-200"
        style={{ boxSizing: 'border-box' }}
      >
        <DutySlipDocumentBody
          cab={cab}
          company={company}
          showCustomTable={showCustomTable}
          customRows={customRows}
          onRowChange={handleRowChange}
          onAddRow={handleAddRow}
          onRemoveRow={handleRemoveRow}
        />
      </div>

      {/* Print Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-300 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-brand-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Duty Slip Preview — {cab.bookingReference}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-[#C91F28] hover:bg-[#a81920] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Now</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950 flex justify-center">
              <div className="flex min-h-[1123px] w-[794px] max-w-full mx-auto flex-col bg-white rounded-2xl shadow-2xl overflow-hidden text-slate-800 font-sans border border-slate-200">
                <DutySlipDocumentBody
                  cab={cab}
                  company={company}
                  showCustomTable={showCustomTable}
                  customRows={customRows}
                  isStaticPreview={true}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
