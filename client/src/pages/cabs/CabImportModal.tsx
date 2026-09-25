import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  RefreshCw,
  X,
  Check,
  AlertCircle,
  Car,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../../api/client.js';
import { Modal } from '../../components/ui/Modal.js';
import { parseSpreadsheetSafely, safeIncludes, safeStr, cleanPhoneNumber } from '../../utils/excel.js';

interface CabImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedCabRow {
  rowNumber: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  pickupDate: string;
  pickupTime: string;
  pickupPlace: string;
  dropPlace: string;
  travelRoute?: string;
  vehicleType: string;
  carNumber?: string;
  passengerCount: number;
  driverName?: string;
  driverPhone?: string;
  cabProvider?: string;
  tripType: string;
  cabAmount: number;
  advanceAmount: number;
  specialInstructions?: string;
  internalNotes?: string;
  isValid: boolean;
  validationError?: string;
}

export const CabImportModal: React.FC<CabImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedCabRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultSummary, setResultSummary] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const downloadSampleTemplate = () => {
    const wb = XLSX.utils.book_new();
    const headers = [
      'Customer Name',
      'Customer Phone',
      'Customer Email',
      'Pickup Date',
      'Pickup Time',
      'Pickup Place',
      'Drop Place',
      'Route',
      'Vehicle Type',
      'Car Number',
      'Passengers',
      'Driver Name',
      'Driver Phone',
      'Cab Provider',
      'Trip Type',
      'Cab Amount',
      'Advance Paid',
      'Special Instructions',
      'Notes',
    ];

    const todayStr = new Date().toISOString().slice(0, 10);

    const sampleRows = [
      [
        'Vikram Singh',
        '+91 98450 11223',
        'vikram@example.com',
        todayStr,
        '07:00 AM',
        'Bangalore Airport',
        'Ooty Town',
        'Bangalore - Mysore - Bandipur - Ooty',
        'INNOVA',
        'KA-01-AB-1234',
        4,
        'Ramesh Kumar',
        '9876543210',
        'Sri Balaji Travels',
        'OUTSTATION',
        14500,
        3000,
        'Require child seat if available',
        'Airport pickup arrival at 06:30 AM',
      ],
      [
        'Sneha Reddy',
        '+91 97420 44556',
        'sneha@example.com',
        todayStr,
        '09:30 AM',
        'Coimbatore Junction',
        'Coonoor Tea Estate',
        'Coimbatore - Mettupalayam - Coonoor',
        'SEDAN',
        'TN-43-XY-9876',
        2,
        'Murugan',
        '9443322110',
        'Nilgiri Cabs',
        'ONE_WAY',
        4200,
        1000,
        'AC required during ghat road',
        'Train arrives at 09:10 AM',
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    ws['!cols'] = [
      { wch: 18 },
      { wch: 16 },
      { wch: 22 },
      { wch: 14 },
      { wch: 12 },
      { wch: 20 },
      { wch: 20 },
      { wch: 30 },
      { wch: 14 },
      { wch: 15 },
      { wch: 12 },
      { wch: 16 },
      { wch: 15 },
      { wch: 18 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 },
      { wch: 30 },
      { wch: 25 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Cab Bookings');
    XLSX.writeFile(wb, 'Ooting_Cab_Bookings_Import_Template.xlsx');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResultSummary(null);
    setFileName(file.name);

    try {
      const parsed = await parseSpreadsheetSafely(file, [
        ['customer', 'guest', 'name', 'passenger'],
        ['phone', 'mobile', 'contact'],
      ]);
      const rawJson: any[] = parsed.jsonRows;

      if (!rawJson || rawJson.length === 0) {
        setError('The uploaded spreadsheet contains no data rows.');
        setParsedRows([]);
        return;
      }

        const rows: ParsedCabRow[] = rawJson.map((r, idx) => {
          // Normalize Customer Name
          const customerName = (
            r['Customer Name'] ||
            r['customerName'] ||
            r['Guest Name'] ||
            r['guestName'] ||
            r['Name'] ||
            r['name'] ||
            r['Passenger'] ||
            r['passenger'] ||
            ''
          ).toString().trim();

          // Normalize Phone
          let customerPhone = (
            r['Customer Phone'] ||
            r['customerPhone'] ||
            r['Phone'] ||
            r['phone'] ||
            r['Mobile'] ||
            r['mobile'] ||
            r['Contact'] ||
            r['contact'] ||
            ''
          ).toString().trim();
          customerPhone = customerPhone.replace(/\.0$/, '').replace(/[^0-9+]/g, '');

          const customerEmail = (
            r['Customer Email'] ||
            r['customerEmail'] ||
            r['Email'] ||
            r['email'] ||
            ''
          ).toString().trim() || undefined;

          // Pickup & Drop
          const pickupPlace = (
            r['Pickup Place'] ||
            r['pickupPlace'] ||
            r['Pickup Location'] ||
            r['From'] ||
            r['from'] ||
            ''
          ).toString().trim();

          const dropPlace = (
            r['Drop Place'] ||
            r['dropPlace'] ||
            r['Drop Location'] ||
            r['To'] ||
            r['to'] ||
            ''
          ).toString().trim();

          const travelRoute = (
            r['Route'] ||
            r['travelRoute'] ||
            r['Travel Route'] ||
            ''
          ).toString().trim() || (pickupPlace && dropPlace ? `${pickupPlace} - ${dropPlace}` : undefined);

          // Date & Time
          let pickupDate = new Date().toISOString().slice(0, 10);
          const rawDate = r['Pickup Date'] || r['pickupDate'] || r['Date'] || r['date'];
          if (rawDate) {
            if (typeof rawDate === 'number') {
              pickupDate = new Date(Math.round((rawDate - 25569) * 86400 * 1000)).toISOString().slice(0, 10);
            } else {
              const d = new Date(rawDate);
              if (!isNaN(d.getTime())) {
                pickupDate = d.toISOString().slice(0, 10);
              }
            }
          }

          const pickupTime = (
            r['Pickup Time'] ||
            r['pickupTime'] ||
            r['Time'] ||
            r['time'] ||
            '08:00 AM'
          ).toString().trim();

          // Vehicle & Drivers
          const vehicleType = (
            r['Vehicle Type'] ||
            r['vehicleType'] ||
            r['Vehicle'] ||
            'SEDAN'
          ).toString().trim().toUpperCase();

          const carNumber = (
            r['Car Number'] ||
            r['carNumber'] ||
            r['Vehicle No'] ||
            r['vehicleNo'] ||
            ''
          ).toString().trim().toUpperCase() || undefined;

          const passengerCount = Math.max(1, Number(r['Passengers'] || r['passengerCount'] || r['Persons'] || 1));
          const driverName = (r['Driver Name'] || r['driverName'] || '').toString().trim() || undefined;
          let driverPhone = (r['Driver Phone'] || r['driverPhone'] || '').toString().trim().replace(/[^0-9+]/g, '') || undefined;
          const cabProvider = (r['Cab Provider'] || r['cabProvider'] || r['Vendor'] || '').toString().trim() || undefined;
          const tripType = (r['Trip Type'] || r['tripType'] || 'OUTSTATION').toString().trim().toUpperCase();

          // Financials
          const cabAmount = Math.max(0, Number(r['Cab Amount'] || r['Cab Amount (INR)'] || r['cabAmount'] || r['Amount'] || 0));
          const advanceAmount = Math.max(0, Number(r['Advance Paid'] || r['Advance (INR)'] || r['advanceAmount'] || r['Advance'] || 0));

          const specialInstructions = (r['Special Instructions'] || r['specialInstructions'] || '').toString().trim() || undefined;
          const internalNotes = (r['Notes'] || r['internalNotes'] || '').toString().trim() || undefined;

          // Validation
          let isValid = true;
          let validationError: string | undefined;

          if (!customerName) {
            isValid = false;
            validationError = 'Missing customer name';
          } else if (!customerPhone || customerPhone.length < 7) {
            isValid = false;
            validationError = 'Valid phone required';
          }

          return {
            rowNumber: idx + 2,
            customerName,
            customerPhone,
            customerEmail,
            pickupDate,
            pickupTime,
            pickupPlace: pickupPlace || 'Bangalore',
            dropPlace: dropPlace || 'Ooty',
            travelRoute,
            vehicleType: ['SEDAN', 'SUV', 'INNOVA', 'TEMPO', 'BUS'].includes(vehicleType) ? vehicleType : 'SEDAN',
            carNumber,
            passengerCount,
            driverName,
            driverPhone,
            cabProvider,
            tripType: ['LOCAL', 'OUTSTATION', 'AIRPORT_TRANSFER', 'ONE_WAY', 'ROUND_TRIP'].includes(tripType)
              ? tripType
              : 'OUTSTATION',
            cabAmount,
            advanceAmount,
            specialInstructions,
            internalNotes,
            isValid,
            validationError,
          };
      });

      setParsedRows(rows);
    } catch (err: any) {
      console.error('File parsing error:', err);
      setError(err?.message || 'Failed to parse the file. Please ensure it is a valid Excel spreadsheet.');
      setParsedRows([]);
    }
  };

  const handleImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setError('No valid rows found to import.');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const res = await api.post('/cabs/import', { items: validRows });
      setResultSummary(res.data);
      onSuccess();
    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.response?.data?.message || 'Failed to import cab bookings. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Tourist Cab Bookings"
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Step 1: Download template */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Official Excel (.xlsx) Template
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Includes sample guest transfers, routes, drivers & fare structures
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={downloadSampleTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg shadow-xs transition-colors flex-shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Template</span>
          </button>
        </div>

        {/* Upload Zone */}
        {!fileName && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-white dark:bg-slate-900/40 group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .xls"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Click to browse or drag and drop your Excel spreadsheet
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Accepts Microsoft Excel (.xlsx or .xls) files
            </p>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Selected file and parsed row preview */}
        {fileName && !resultSummary && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-4 h-4 text-brand-600" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {fileName}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {parsedRows.length} rows detected
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFileName(null);
                  setParsedRows([]);
                  setError(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Validation summary pills */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <Check className="w-3.5 h-3.5" />
                <span>{validCount} ready to import</span>
              </div>
              {invalidCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{invalidCount} require attention</span>
                </div>
              )}
            </div>

            {/* Preview Table */}
            <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2 px-3 font-semibold w-12">Row</th>
                    <th className="py-2 px-3 font-semibold">Guest</th>
                    <th className="py-2 px-3 font-semibold">Phone</th>
                    <th className="py-2 px-3 font-semibold">Route</th>
                    <th className="py-2 px-3 font-semibold">Vehicle</th>
                    <th className="py-2 px-3 font-semibold">Fare</th>
                    <th className="py-2 px-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {parsedRows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className={
                        !row.isValid
                          ? 'bg-amber-50/50 dark:bg-amber-950/20'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }
                    >
                      <td className="py-2 px-3 font-mono text-slate-400 text-[11px]">
                        {row.rowNumber}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">
                        {row.customerName || <span className="text-red-500 italic">Empty</span>}
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                        {row.customerPhone || <span className="text-red-500 italic">Empty</span>}
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-300 truncate max-w-[140px]">
                        {row.pickupPlace} → {row.dropPlace}
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                        <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                          {row.vehicleType}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-700 dark:text-slate-200 font-semibold">
                        ₹{row.cabAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-3">
                        {row.isValid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400" title={row.validationError}>
                            <AlertTriangle className="w-3.5 h-3.5" /> {row.validationError}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Result Summary Screen */}
        {resultSummary && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>Import Completed Successfully</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {resultSummary.message}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-500">Imported Records</span>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {resultSummary.imported}
                </p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-500">Skipped Records</span>
                <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                  {resultSummary.skipped}
                </p>
              </div>
            </div>

            {resultSummary.errors && resultSummary.errors.length > 0 && (
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 max-h-36 overflow-y-auto">
                <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 mb-1">
                  Skipped Details:
                </p>
                <ul className="text-[11px] text-amber-700 dark:text-amber-400 space-y-0.5 list-disc list-inside">
                  {resultSummary.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {resultSummary ? 'Close' : 'Cancel'}
          </button>

          {fileName && !resultSummary && (
            <button
              type="button"
              onClick={handleImport}
              disabled={isProcessing || validCount === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Importing {validCount} Bookings...</span>
                </>
              ) : (
                <>
                  <Car className="w-3.5 h-3.5" />
                  <span>Import {validCount} Bookings</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
export default CabImportModal;
