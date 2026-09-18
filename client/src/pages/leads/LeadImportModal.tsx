import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertTriangle, FileSpreadsheet, Download, RefreshCw, X, Check, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../../api/client.js';
import { Modal } from '../../components/ui/Modal.js';

interface LeadImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedLeadRow {
  rowNumber: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerCity?: string;
  destination: string;
  adults?: number;
  children?: number;
  budget?: number;
  source?: string;
  priority?: string;
  notes?: string;
  isValid: boolean;
  validationError?: string;
}

export const LeadImportModal: React.FC<LeadImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedLeadRow[]>([]);
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
      'Adults',
      'Children',
      'Budget',
      'Source',
      'Priority',
      'Notes',
    ];
    const sampleRows = [
      [
        'Ramesh Kumar',
        '+91 98450 12345',
        'ramesh@example.com',
        'Bangalore',
        'Ooty 3D2N Royal Escape',
        2,
        1,
        25000,
        'WEBSITE',
        'HIGH',
        'Prefers 4-star hotel near lake',
      ],
      [
        'Pooja Sharma',
        '+91 98450 67890',
        'pooja@example.com',
        'Mysore',
        'Coorg Nature Retreat',
        4,
        0,
        45000,
        'INSTAGRAM',
        'MEDIUM',
        'Looking for private villa with plantation tour',
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    ws['!cols'] = [
      { wch: 18 },
      { wch: 16 },
      { wch: 22 },
      { wch: 14 },
      { wch: 24 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    XLSX.writeFile(wb, 'Ooting_Leads_Import_Template.xlsx');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResultSummary(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!json || json.length < 2) {
          setError('The uploaded spreadsheet contains no data rows.');
          setParsedRows([]);
          return;
        }

        const headers: string[] = (json[0] || []).map((h: any) => String(h || '').trim().toLowerCase());
        const nameIdx = headers.findIndex((h) => h.includes('name') || h.includes('customer'));
        const phoneIdx = headers.findIndex((h) => h.includes('phone') || h.includes('mobile') || h.includes('contact'));
        const emailIdx = headers.findIndex((h) => h.includes('email') || h.includes('mail'));
        const cityIdx = headers.findIndex((h) => h.includes('city'));
        const destIdx = headers.findIndex((h) => h.includes('dest') || h.includes('place') || h.includes('package'));
        const adultsIdx = headers.findIndex((h) => h.includes('adult'));
        const childrenIdx = headers.findIndex((h) => h.includes('child'));
        const budgetIdx = headers.findIndex((h) => h.includes('budget') || h.includes('price') || h.includes('cost'));
        const sourceIdx = headers.findIndex((h) => h.includes('source'));
        const priorityIdx = headers.findIndex((h) => h.includes('priority'));
        const notesIdx = headers.findIndex((h) => h.includes('note') || h.includes('remark'));

        if (nameIdx === -1 || phoneIdx === -1) {
          setError('Spreadsheet must include columns for "Customer Name" and "Phone".');
          setParsedRows([]);
          return;
        }

        const rows: ParsedLeadRow[] = [];

        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          if (!row || row.length === 0) continue;

          const customerName = String(row[nameIdx] || '').trim();
          const rawPhone = String(row[phoneIdx] || '').trim();
          const cleanPhone = rawPhone.replace(/[^\d+]/g, '');
          const destination = destIdx !== -1 && row[destIdx] ? String(row[destIdx]).trim() : 'General Enquiry';

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
            customerPhone: cleanPhone,
            customerEmail: emailIdx !== -1 && row[emailIdx] ? String(row[emailIdx]).trim() : undefined,
            customerCity: cityIdx !== -1 && row[cityIdx] ? String(row[cityIdx]).trim() : undefined,
            destination,
            adults: adultsIdx !== -1 && Number(row[adultsIdx]) ? Number(row[adultsIdx]) : 2,
            children: childrenIdx !== -1 && Number(row[childrenIdx]) ? Number(row[childrenIdx]) : 0,
            budget: budgetIdx !== -1 && Number(row[budgetIdx]) ? Number(row[budgetIdx]) : undefined,
            source: sourceIdx !== -1 && row[sourceIdx] ? String(row[sourceIdx]).trim() : 'DIRECT',
            priority: priorityIdx !== -1 && row[priorityIdx] ? String(row[priorityIdx]).trim() : 'MEDIUM',
            notes: notesIdx !== -1 && row[notesIdx] ? String(row[notesIdx]).trim() : undefined,
            isValid,
            validationError,
          });
        }

        setParsedRows(rows);
      } catch (err) {
        console.error('Failed to parse Excel spreadsheet:', err);
        setError('Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.');
      }
    };
    reader.readAsBinaryString(file);
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
        adults: r.adults,
        children: r.children,
        budget: r.budget,
        source: r.source,
        priority: r.priority,
        notes: r.notes,
      }));

      const res = await api.post('/leads/import', { items: payload });
      setResultSummary(res.data);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to import leads.');
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
      title="Import Leads from Excel (.xlsx)"
      subtitle="Batch upload client travel enquiries and automatically link customer records"
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
            <h3 className="text-sm font-bold text-emerald-900">Leads Import Completed!</h3>
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
                Close & View Leads
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
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">Standard Lead Template</h4>
                  <p className="text-[11px] text-slate-500">Includes columns for customer details, destination, travellers & budget</p>
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
                        <span className="text-brand-600 ml-2">→ {r.destination}</span>
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
                    {isProcessing ? 'Importing Leads...' : `Confirm & Import (${validCount} Leads)`}
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
