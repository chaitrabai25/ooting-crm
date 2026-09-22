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
} from 'lucide-react';
import { api } from '../../api/client.js';
import { CabBooking } from '../../types/index.js';
import { generateA4Pdf } from '../../utils/pdfGenerator.js';

interface DutySlipTableRow {
  id: string;
  label: string;
  startVal: string;
  endVal: string;
  remarks: string;
}

export const CabVoucher: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [cab, setCab] = useState<CabBooking | null>(null);
  const [company, setCompany] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Additional Details / Table State (Default disabled as requested)
  const [showCustomTable, setShowCustomTable] = useState(false);
  const [customRows, setCustomRows] = useState<DutySlipTableRow[]>([
    { id: '1', label: 'Starting & Ending Km', startVal: '', endVal: '', remarks: '' },
    { id: '2', label: 'Duty Time (HH:MM)', startVal: '', endVal: '', remarks: '' },
    { id: '3', label: 'Toll & Parking (₹)', startVal: '', endVal: '', remarks: '' },
  ]);

  useEffect(() => {
    const fetchVoucher = async () => {
      try {
        setIsLoading(true);
        const res = await api.get(`/cabs/${id}/voucher`);
        setCab(res.data.cab);
        setCompany(res.data.company);
      } catch (err) {
        console.error('Failed to load cab voucher:', err);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchVoucher();
  }, [id]);

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
      `*OOTING HOLIDAYS - CAB DUTY SLIP*\n` +
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
      `Have a safe & memorable journey with Ooting Holidays!`
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
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Cab List</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Additional Table Button */}
          <button
            type="button"
            onClick={() => setShowCustomTable(!showCustomTable)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-colors ${
              showCustomTable
                ? 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>{showCustomTable ? 'Hide Extra Table' : '+ Add Table / Additional Details'}</span>
          </button>

          {/* WhatsApp Share */}
          <button
            type="button"
            onClick={handleWhatsApp}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp Duty Slip</span>
          </button>

          {/* Download PDF */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-colors disabled:opacity-50"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-amber-400" />
                <span>Download Duty Slip (PDF)</span>
              </>
            )}
          </button>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2 bg-[#C91F28] hover:bg-[#a81920] text-white text-xs font-bold rounded-xl shadow-md transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Main A4 Duty Slip Document (Container isolated for dedicated PDF and Print) */}
      <div
        id="duty-slip-document"
        className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden print:shadow-none print:rounded-none print:max-w-full text-slate-800 font-sans print:m-0 border border-slate-200"
      >
        {/* Top Header Wave Accent */}
        <div className="w-full h-3.5 bg-[#C91F28] overflow-hidden relative">
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
                <span className="text-xl font-black tracking-tight text-slate-900 block leading-tight">
                  OOTING
                </span>
                <span className="text-[11px] font-bold text-[#C91F28] tracking-wide uppercase block">
                  Journeys Beyond Ordinary
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Tourist Cab Services & Nilgiri Tour Specialist
                </span>
              </div>
            </div>

            {/* Official Contact Details */}
            <div className="text-right text-[11px] text-slate-600 space-y-0.5">
              <div className="flex items-center justify-end gap-1.5 font-medium">
                <Globe className="w-3 h-3 text-[#C91F28]" />
                <span>{company?.website || 'https://ooting.in'}</span>
              </div>
              <div className="flex items-center justify-end gap-1.5">
                <Phone className="w-3 h-3 text-[#C91F28]" />
                <span>{company?.phone || '+91 80000 00000'} (24/7 Helpline)</span>
              </div>
              <div className="flex items-center justify-end gap-1.5">
                <Mail className="w-3 h-3 text-[#C91F28]" />
                <span>{company?.email || 'support@ooting.com'}</span>
              </div>
              <div className="flex items-center justify-end gap-1.5 text-slate-500 text-[10px]">
                <MapPin className="w-3 h-3 text-[#C91F28]" />
                <span>Nilgiris / Ooty, Tamil Nadu</span>
              </div>
            </div>
          </div>
        </div>

        {/* Document Title Banner */}
        <div className="bg-slate-900 text-white px-8 py-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] tracking-widest uppercase text-amber-400 font-bold block">
              OFFICIAL TRAVEL VOUCHER
            </span>
            <h1 className="text-base font-black tracking-wide">
              CAB DUTY SLIP & PASSENGER MANIFEST
            </h1>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block uppercase">Duty Slip #</span>
            <span className="font-mono text-sm font-bold text-white tracking-wider">
              {cab.bookingReference}
            </span>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Guest & Journey Overview Grid */}
          <div className="grid grid-cols-2 gap-6">
            {/* Passenger / Guest Details */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#C91F28] mb-3 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Guest / Passenger Details
              </h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Lead Guest:</span>
                  <span className="font-bold text-slate-900">{cab.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone Number:</span>
                  <span className="font-semibold text-slate-800">{cab.customerPhone}</span>
                </div>
                {cab.customerEmail && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email:</span>
                    <span className="text-slate-700">{cab.customerEmail}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">No. of Passengers:</span>
                  <span className="font-bold text-slate-900">{cab.passengerCount} Guest(s)</span>
                </div>
              </div>
            </div>

            {/* Reporting & Schedule Details */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#C91F28] mb-3 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Schedule & Reporting Details
              </h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Reporting Date:</span>
                  <span className="font-bold text-slate-900">
                    {new Date(cab.pickupDate).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reporting Time:</span>
                  <span className="font-bold text-[#C91F28]">{cab.pickupTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Trip Category:</span>
                  <span className="font-semibold text-slate-800">{cab.tripType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Booking Status:</span>
                  <span className="font-bold text-emerald-700">{cab.bookingStatus}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Route & Vehicle Assignment */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#C91F28]" />
                Journey Route & Vehicle Assignment
              </h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-2.5 border-r border-slate-200 pr-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Pickup Location
                  </span>
                  <span className="font-bold text-slate-900 text-sm">{cab.pickupPlace}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Drop Location
                  </span>
                  <span className="font-bold text-slate-900 text-sm">{cab.dropPlace}</span>
                </div>

                {cab.dutyRange && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-brand-600 block">
                      Duty Range / Circuit
                    </span>
                    <span className="font-semibold text-slate-900 text-xs bg-amber-50/80 px-2 py-1 rounded-md border border-amber-200 block mt-0.5">
                      {cab.dutyRange}
                    </span>
                  </div>
                )}

                {cab.travelRoute && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Tour Route / Sightseeing
                    </span>
                    <span className="text-slate-700">{cab.travelRoute}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Vehicle Type
                    </span>
                    <span className="font-bold text-slate-900">{cab.vehicleType}</span>
                    <span className="text-[11px] text-slate-500 block">({cab.requiredCabType})</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Vehicle Plate No.
                    </span>
                    <span className="font-mono font-bold text-sm text-slate-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 inline-block mt-0.5">
                      {cab.carNumber || 'To Be Assigned'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Driver Name
                    </span>
                    <span className="font-bold text-slate-900">
                      {cab.driverName || 'Will be notified via SMS'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Driver Contact
                    </span>
                    <span className="font-bold text-slate-900">{cab.driverPhone || '—'}</span>
                  </div>
                </div>

                {cab.assignedStaff?.name && (
                  <div className="pt-2 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-400">Coordinator: </span>
                    <span className="font-semibold text-slate-700">{cab.assignedStaff.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Optional Additional Details / Duty Log Table (Shown only when toggled on) */}
          {showCustomTable && (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#C91F28]" />
                  Additional Duty Details & Log
                </h3>
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="print:hidden inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 bg-white px-2 py-0.5 rounded border border-slate-200"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Row</span>
                </button>
              </div>

              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2 px-3 border-r border-slate-200 text-left">Reading / Description</th>
                    <th className="py-2 px-3 border-r border-slate-200">Starting</th>
                    <th className="py-2 px-3 border-r border-slate-200">Closing</th>
                    <th className="py-2 px-3 border-r border-slate-200">Remarks / Total</th>
                    <th className="py-2 px-2 print:hidden w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {customRows.map((row) => (
                    <tr key={row.id} className="h-9">
                      <td className="font-semibold text-slate-700 bg-slate-50/50 border-r border-slate-200 text-left px-3">
                        <input
                          type="text"
                          value={row.label}
                          onChange={(e) => handleRowChange(row.id, 'label', e.target.value)}
                          className="w-full bg-transparent border-none focus:outline-none font-semibold text-slate-800 text-xs"
                        />
                      </td>
                      <td className="border-r border-slate-200 px-2">
                        <input
                          type="text"
                          value={row.startVal}
                          onChange={(e) => handleRowChange(row.id, 'startVal', e.target.value)}
                          placeholder="—"
                          className="w-full bg-transparent text-center border-none focus:outline-none text-xs"
                        />
                      </td>
                      <td className="border-r border-slate-200 px-2">
                        <input
                          type="text"
                          value={row.endVal}
                          onChange={(e) => handleRowChange(row.id, 'endVal', e.target.value)}
                          placeholder="—"
                          className="w-full bg-transparent text-center border-none focus:outline-none text-xs"
                        />
                      </td>
                      <td className="border-r border-slate-200 px-2">
                        <input
                          type="text"
                          value={row.remarks}
                          onChange={(e) => handleRowChange(row.id, 'remarks', e.target.value)}
                          placeholder="—"
                          className="w-full bg-transparent text-center border-none focus:outline-none text-xs"
                        />
                      </td>
                      <td className="print:hidden text-center px-1">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                          title="Remove row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tariff, Driver Allowance & Financial Summary */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-[#C91F28]" />
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
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Agreed Fare</span>
                <span className="text-base font-black text-slate-900">
                  ₹{Number(cab.cabAmount).toLocaleString('en-IN')}
                </span>
              </div>

              {cab.driverAllowanceTotal && cab.driverAllowanceTotal > 0 && (
                <div className="bg-amber-50/70 rounded-lg p-1.5 border border-amber-200/80">
                  <span className="text-[10px] uppercase font-bold text-amber-800 block">
                    Driver Allowance (
                    {cab.driverAllowanceType === 'NIGHT_WISE'
                      ? 'Night-wise'
                      : cab.driverAllowanceType === 'CUSTOM'
                      ? 'Custom'
                      : 'Day-wise'}
                    )
                  </span>
                  <span className="text-base font-black text-amber-900">
                    ₹{Number(cab.driverAllowanceTotal).toLocaleString('en-IN')}
                  </span>
                  {cab.driverAllowanceRate && cab.driverAllowanceDays ? (
                    <span className="text-[10px] text-amber-700 block">
                      ₹{cab.driverAllowanceRate} × {cab.driverAllowanceDays}{' '}
                      {cab.driverAllowanceType === 'NIGHT_WISE' ? 'nights' : 'days'}
                    </span>
                  ) : null}
                </div>
              )}

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Advance Received</span>
                <span className="text-base font-black text-emerald-700">
                  ₹{Number(cab.advanceAmount).toLocaleString('en-IN')}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Balance Payable</span>
                <span className="text-base font-black text-[#C91F28]">
                  ₹{Number(cab.balanceAmount).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Terms & Important Travel Notes */}
          <div className="border border-slate-200 rounded-xl p-4 text-[11px] text-slate-600 space-y-1 bg-amber-50/40">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-amber-600" />
              Nilgiri Hills Cab Guidelines & Instructions
            </h4>
            <p>
              1. <strong>Air Conditioning:</strong> As per standard Nilgiri tourist vehicle norms, AC is turned off on steep hairpin climbs for engine safety.
            </p>
            <p>
              2. <strong>Tolls & Parking:</strong> State border taxes, tolls, forest entry tickets, and parking fees are extra as per actual receipts unless explicitly included in the package.
            </p>
            {cab.specialInstructions && (
              <p className="text-slate-900 font-semibold pt-1">
                Special Note: {cab.specialInstructions}
              </p>
            )}
          </div>

          {/* Official Authorization Notice */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/80 text-center space-y-1 mt-6">
            <div className="flex items-center justify-center gap-2 text-slate-900 font-black text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-[#C91F28]" />
              <span>Officially Authorized by Ooting</span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium">
              This duty slip is issued by Ooting for official travel service coordination.
            </p>
            <p className="text-[10px] text-slate-400">
              Computer-generated document. Valid without physical signature or rubber stamp.
            </p>
          </div>
        </div>

        {/* Bottom Wave Footer */}
        <div className="w-full h-3 bg-[#C91F28] mt-4"></div>
      </div>
    </div>
  );
};
