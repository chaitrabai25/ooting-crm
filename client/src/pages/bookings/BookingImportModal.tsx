import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertTriangle, FileSpreadsheet, Download, RefreshCw, X, Check, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../../api/client.js';
import { Modal } from '../../components/ui/Modal.js';
import { parseSpreadsheetSafely, safeIncludes, safeStr, parseExcelDate, parseExcelNumber, cleanPhoneNumber } from '../../utils/excel.js';

interface BookingImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedBookingRow {
  rowNumber: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerCity?: string;
  destination?: string;
  travelStartDate?: string;
  travelEndDate?: string;
  travellers?: number;
  totalAmount?: number;
  discount?: number;
  bookingStatus?: string;
  notes?: string;
  isValid: boolean;
  validationError?: string;
}

export const BookingImportModal: React.FC<BookingImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedBookingRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultSummary, setResultSummary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const downloadSampleTemplate = () => {
    const wb = XLSX.utils.book_new();
    const headers = [
      'Customer Name',
      'Phone',
      'Email',
      'City',
      'Destination',
      'Start Date (YYYY-MM-DD)',
      'End Date (YYYY-MM-DD)',
      'Travellers',
      'Total Amount',
      'Discount',
      'Booking Status',
      'Notes',
    ];
    const sampleRows = [
      [
        'Anita Desai',
        '+91 98450 77889',
        'anita@example.com',
        'Bangalore',
        'Ooty 3D2N Royal Escape',
        '2026-10-05',
        '2026-10-07',
        2,
        22000,
        1000,
        'CONFIRMED',
        'Includes private cab and honeymoon cake',
      ],
      [
        'Vikram Singh',
        '+91 98450 33445',
        'vikram@example.com',
        'Hyderabad',
        'Mysore & Coorg Heritage',
        '2026-10-12',
        '2026-10-15',
        4,
        48000,
        2000,
        'CONFIRMED',
        'Family tour with 2 deluxe rooms',
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    ws['!cols'] = [
      { wch: 18 },
      { wch: 16 },
      { wch: 22 },
      { wch: 14 },
      { wch: 24 },
      { wch: 16 },
      { wch: 16 },
      { wch: 10 },
      { wch: 12 },
      { wch: 10 },
      { wch: 14 },
      { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Bookings');
    XLSX.writeFile(wb, 'Ooting_Bookings_Import_Template.xlsx');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResultSummary(null);
    setFileName(file.name);

    try {
      const parsed = await parseSpreadsheetSafely(file, [
        ['name', 'customer'],
        ['phone', 'mobile', 'contact'],
      ]);

      const { headers, rawRows } = parsed;

      if (!rawRows || rawRows.length === 0) {
        setError('The uploaded spreadsheet contains no data rows.');
        setParsedRows([]);
        return;
      }

      const nameIdx = headers.findIndex((h) => safeIncludes(h, 'name') || safeIncludes(h, 'customer'));
      const phoneIdx = headers.findIndex((h) => safeIncludes(h, 'phone') || safeIncludes(h, 'mobile') || safeIncludes(h, 'contact'));
      const emailIdx = headers.findIndex((h) => safeIncludes(h, 'email') || safeIncludes(h, 'mail'));
      const cityIdx = headers.findIndex((h) => safeIncludes(h, 'city'));
      const destIdx = headers.findIndex((h) => safeIncludes(h, 'dest') || safeIncludes(h, 'package'));
      const startIdx = headers.findIndex((h) => safeIncludes(h, 'start'));
      const endIdx = headers.findIndex((h) => safeIncludes(h, 'end'));
      const travellersIdx = headers.findIndex((h) => safeIncludes(h, 'traveller') || safeIncludes(h, 'person') || safeIncludes(h, 'count') || safeIncludes(h, 'pax'));
      const amountIdx = headers.findIndex((h) => safeIncludes(h, 'amount') || safeIncludes(h, 'total') || safeIncludes(h, 'price'));
      const discountIdx = headers.findIndex((h) => safeIncludes(h, 'discount'));
      const statusIdx = headers.findIndex((h) => safeIncludes(h, 'status'));
      const notesIdx = headers.findIndex((h) => safeIncludes(h, 'note') || safeIncludes(h, 'remark'));

      if (nameIdx === -1 || phoneIdx === -1) {
        const found = headers.filter((h) => safeStr(h).length > 0).join(', ');
        setError(`Spreadsheet must include columns for "Customer Name" and "Phone Number". Detected columns: ${found || 'None'}`);
        setParsedRows([]);
        return;
      }

      const rows: ParsedBookingRow[] = [];

      for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || row.length === 0 || row.every((c: any) => safeStr(c).length === 0)) continue;

        const customerName = safeStr(row[nameIdx]);
        const cleanPhone = cleanPhoneNumber(row[phoneIdx]);

        let isValid = true;
        let validationError: string | undefined;

        if (!customerName) {
          isValid = false;
          validationError = 'Customer Name is required';
        } else if (cleanPhone.length < 8) {
          isValid = false;
          validationError = 'Valid Phone Number is required';
        }

        rows.push({
          rowNumber: i + 1,
          customerName,
          customerPhone: cleanPhone || safeStr(row[phoneIdx]),
          customerEmail: emailIdx !== -1 && row[emailIdx] ? safeStr(row[emailIdx]) : undefined,
          customerCity: cityIdx !== -1 && row[cityIdx] ? safeStr(row[cityIdx]) : undefined,
          destination: destIdx !== -1 && row[destIdx] ? safeStr(row[destIdx]) : undefined,
          travelStartDate: startIdx !== -1 ? parseExcelDate(row[startIdx]) : undefined,
          travelEndDate: endIdx !== -1 ? parseExcelDate(row[endIdx]) : undefined,
          travellers: travellersIdx !== -1 ? parseExcelNumber(row[travellersIdx], 2) : 2,
          totalAmount: amountIdx !== -1 ? parseExcelNumber(row[amountIdx], 0) : 0,
          discount: discountIdx !== -1 ? parseExcelNumber(row[discountIdx], 0) : 0,
          bookingStatus: statusIdx !== -1 && row[statusIdx] ? safeStr(row[statusIdx]).toUpperCase() : 'CONFIRMED',
          notes: notesIdx !== -1 && row[notesIdx] ? safeStr(row[notesIdx]) : undefined,
          isValid,
          validationError,
        });
      }

      setParsedRows(rows);
    } catch (err: any) {
      console.error('Failed to parse Excel spreadsheet:', err);
      setError(err?.message || 'Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.');
      setParsedRows([]);
    }
  };

  const handleImportSubmit = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setError('No valid rows available to import.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const payload = validRows.map((r) => ({
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        customerEmail: r.customerEmail,
        customerCity: r.customerCity,
        destination: r.destination,
        travelStartDate: r.travelStartDate,
        travelEndDate: r.travelEndDate,
        travellers: r.travellers,
        totalAmount: r.totalAmount,
        discount: r.discount,
        bookingStatus: r.bookingStatus,
        notes: r.notes,
      }));

      const res = await api.post('/bookings/import', { items: payload });
      setResultSummary(res.data);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to import bookings.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetImport = () => {
    setFileName(null);
    setParsedRows([]);
    setResultSummary(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Bookings from Excel (.xlsx)"
      subtitle="Batch upload confirmed customer bookings, travel schedules, and financials"
      maxWidth="2xl"
    >
      <div className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {resultSummary ? (
          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-emerald-900">Bookings Import Completed!</h3>
            <p className="text-xs text-emerald-800">{resultSummary.message}</p>
            <div className="flex justify-center gap-3 pt-3">
              <button
                onClick={resetImport}
                className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg"
              >
                Import Another File
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg shadow-sm"
              >
                Close & View Bookings
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Step 1: Download Template */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">Standard Booking Template</h4>
                  <p className="text-[11px] text-slate-500">Includes columns for customer info, travel dates, travellers & amounts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={downloadSampleTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Template</span>
              </button>
            </div>

            {/* Step 2: Upload File Area */}
            {!fileName ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 rounded-xl p-8 text-center cursor-pointer bg-slate-50/50 hover:bg-slate-100/50 transition-all"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                  Click to select Excel spreadsheet (.xlsx / .xls)
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Maximum 5,000 rows per batch</p>
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center gap-2.5 truncate">
                  <FileSpreadsheet className="w-4 h-4 text-brand-600 flex-shrink-0" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{fileName}</span>
                  <span className="text-[11px] text-slate-400">({parsedRows.length} rows detected)</span>
                </div>
                <button
                  type="button"
                  onClick={resetImport}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Step 3: Row Preview */}
            {parsedRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">Row Verification Preview:</span>
                  <div className="flex gap-3 font-semibold">
                    <span className="text-emerald-600">✓ {validCount} valid</span>
                    {invalidCount > 0 && <span className="text-red-600">✗ {invalidCount} invalid</span>}
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                  {parsedRows.slice(0, 15).map((r) => (
                    <div key={r.rowNumber} className="p-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <div className="truncate flex-1">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{r.customerName}</span>
                        <span className="text-slate-400 ml-2">({r.customerPhone})</span>
                        <span className="text-emerald-600 font-bold ml-2">₹{r.totalAmount?.toLocaleString()}</span>
                      </div>
                      <div>
                        {r.isValid ? (
                          <span className="text-emerald-600 font-bold">Ready</span>
                        ) : (
                          <span className="text-red-500 font-medium">{r.validationError}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleImportSubmit}
                    disabled={isProcessing || validCount === 0}
                    className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow-sm"
                  >
                    {isProcessing ? 'Importing Bookings...' : `Confirm & Import (${validCount} Bookings)`}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};
