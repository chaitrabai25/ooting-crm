import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertTriangle, FileSpreadsheet, Download, RefreshCw, X, Check, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../../api/client.js';
import { Modal } from '../../components/ui/Modal.js';

interface AgentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedAgentRow {
  rowNumber: number;
  companyName: string;
  contactPerson: string;
  phone: string;
  email?: string;
  city?: string;
  state?: string;
  gstNumber?: string;
  googleReviewUrl?: string;
  isValid: boolean;
  validationError?: string;
  isDuplicate?: boolean;
}

export const AgentImportModal: React.FC<AgentImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedAgentRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultSummary, setResultSummary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const downloadSampleTemplate = () => {
    const wb = XLSX.utils.book_new();
    const headers = [
      'Agency Name',
      'Contact Person',
      'Phone',
      'Email',
      'City',
      'State',
      'GSTIN',
      'Google Review URL',
    ];
    const sampleRows = [
      [
        'Skyline Travels Pvt Ltd',
        'Vikram Sethi',
        '+91 98765 11223',
        'agent@skylinetravels.com',
        'Bangalore',
        'Karnataka',
        '29AAAAA0000A1Z5',
        'https://g.page/r/skyline-travels',
      ],
      [
        'Southern Holiday World',
        'Meera Nair',
        '+91 98450 99887',
        'meera@southernholiday.com',
        'Kochi',
        'Kerala',
        '32BBBBB0000B2Z6',
        'https://maps.app.goo.gl/sample-review',
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    ws['!cols'] = [
      { wch: 26 },
      { wch: 18 },
      { wch: 18 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 35 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'B2B Agents');
    XLSX.writeFile(wb, 'Ooting_B2B_Agents_Import_Template.xlsx');
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
        const companyIdx = headers.findIndex((h) => h.includes('company') || h.includes('agency'));
        const personIdx = headers.findIndex((h) => h.includes('contact') || h.includes('person') || h.includes('name'));
        const phoneIdx = headers.findIndex((h) => h.includes('phone') || h.includes('mobile'));
        const emailIdx = headers.findIndex((h) => h.includes('email') || h.includes('mail'));
        const cityIdx = headers.findIndex((h) => h.includes('city'));
        const stateIdx = headers.findIndex((h) => h.includes('state'));
        const gstIdx = headers.findIndex((h) => h.includes('gst'));
        const reviewIdx = headers.findIndex((h) => h.includes('review') || h.includes('google'));

        if (companyIdx === -1 || personIdx === -1 || phoneIdx === -1) {
          setError('Spreadsheet must have columns for "Agency Name", "Contact Person", and "Phone".');
          setParsedRows([]);
          return;
        }

        const rows: ParsedAgentRow[] = [];
        const seenPhones = new Set<string>();

        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          if (!row || row.length === 0) continue;

          const companyName = String(row[companyIdx] || '').trim();
          const contactPerson = String(row[personIdx] || '').trim();
          const rawPhone = String(row[phoneIdx] || '').trim();
          const cleanPhone = rawPhone.replace(/[^\d+]/g, '');
          const email = emailIdx !== -1 && row[emailIdx] ? String(row[emailIdx]).trim() : undefined;
          const city = cityIdx !== -1 && row[cityIdx] ? String(row[cityIdx]).trim() : undefined;
          const state = stateIdx !== -1 && row[stateIdx] ? String(row[stateIdx]).trim() : undefined;
          const gstNumber = gstIdx !== -1 && row[gstIdx] ? String(row[gstIdx]).trim() : undefined;
          const googleReviewUrl = reviewIdx !== -1 && row[reviewIdx] ? String(row[reviewIdx]).trim() : undefined;

          let isValid = true;
          let validationError = '';
          let isDuplicate = false;

          if (!companyName) {
            isValid = false;
            validationError = 'Missing Agency Name';
          } else if (!contactPerson) {
            isValid = false;
            validationError = 'Missing Contact Person';
          } else if (!cleanPhone || cleanPhone.length < 8) {
            isValid = false;
            validationError = 'Invalid Phone Number';
          } else if (seenPhones.has(cleanPhone)) {
            isDuplicate = true;
            validationError = 'Duplicate Phone in File';
          } else {
            seenPhones.add(cleanPhone);
          }

          rows.push({
            rowNumber: i + 1,
            companyName,
            contactPerson,
            phone: rawPhone,
            email,
            city,
            state,
            gstNumber,
            googleReviewUrl,
            isValid,
            validationError,
            isDuplicate,
          });
        }

        setParsedRows(rows);
      } catch (err: any) {
        setError(`Failed to read spreadsheet: ${err?.message || 'Invalid file format'}`);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    setError(null);
    setResultSummary(null);

    const validRows = parsedRows.filter((r) => r.isValid && !r.isDuplicate);
    if (validRows.length === 0) {
      setError('There are no valid, non-duplicate agent rows to import.');
      return;
    }

    setIsProcessing(true);
    try {
      const items = validRows.map((r) => ({
        companyName: r.companyName,
        contactPerson: r.contactPerson,
        phone: r.phone,
        email: r.email || null,
        city: r.city || null,
        state: r.state || null,
        gstNumber: r.gstNumber || null,
        googleReviewUrl: r.googleReviewUrl || null,
      }));

      const res = await api.post('/agents/import', { items });
      setResultSummary(res.data);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to import agents.');
    } finally {
      setIsProcessing(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid && !r.isDuplicate).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid || r.isDuplicate).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import B2B Travel Agents (.xlsx / .xls)"
      subtitle="Bulk onboard agency partners, contact persons, and Google Review links"
      maxWidth="2xl"
    >
      <div className="space-y-4 text-xs max-h-[80vh] overflow-y-auto pr-1">
        {error && (
          <div className="p-3 bg-red-50 text-[#C91F28] border border-red-200 rounded-xl flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {resultSummary && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>{resultSummary.message}</span>
            </div>
            <div className="text-xs text-emerald-700 flex items-center gap-4">
              <span>Registered: <strong>{resultSummary.createdCount ?? 0}</strong></span>
              <span>Skipped / Existing: <strong>{resultSummary.skippedCount ?? 0}</strong></span>
            </div>
          </div>
        )}

        {/* Upload Zone & Template Download */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Upload Button */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-[#C91F28] bg-slate-50/60 hover:bg-red-50/20 rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="p-2.5 bg-red-100 text-[#C91F28] rounded-xl">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-slate-800">
                {fileName ? fileName : 'Choose Agent Excel / CSV File'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Supports .xlsx, .xls, and .csv files</p>
            </div>
          </div>

          {/* Download Sample Template */}
          <div className="border border-slate-200 bg-white rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-800 font-bold mb-1">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Sample Agent Template</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Download pre-formatted Excel template with columns for Agency Name, Contact Person, Phone, Email, GST, and Google Review URL.
              </p>
            </div>

            <button
              type="button"
              onClick={downloadSampleTemplate}
              className="mt-3 inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Agent .xlsx</span>
            </button>
          </div>
        </div>

        {/* Parsed Preview Table */}
        {parsedRows.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">Spreadsheet Preview ({parsedRows.length} Rows)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                  {validCount} Valid
                </span>
                {invalidCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    {invalidCount} Issues
                  </span>
                )}
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 w-12">Row</th>
                    <th className="py-2 px-3">Agency Name</th>
                    <th className="py-2 px-3">Contact Person</th>
                    <th className="py-2 px-3">Phone</th>
                    <th className="py-2 px-3">City</th>
                    <th className="py-2 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedRows.map((r, idx) => (
                    <tr
                      key={idx}
                      className={!r.isValid || r.isDuplicate ? 'bg-amber-50/40' : 'hover:bg-slate-50/60'}
                    >
                      <td className="py-2 px-3 text-slate-400 font-mono">#{r.rowNumber}</td>
                      <td className="py-2 px-3 font-medium text-slate-900">{r.companyName || '—'}</td>
                      <td className="py-2 px-3 text-slate-700">{r.contactPerson || '—'}</td>
                      <td className="py-2 px-3 text-slate-700">{r.phone || '—'}</td>
                      <td className="py-2 px-3 text-slate-500">{r.city || '—'}</td>
                      <td className="py-2 px-3 text-right">
                        {r.isValid && !r.isDuplicate ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[10px]">
                            <Check className="w-3 h-3" /> Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-[10px]">
                            <AlertCircle className="w-3 h-3" /> {r.validationError}
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

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Close
          </button>

          {parsedRows.length > 0 && (
            <button
              type="button"
              disabled={isProcessing || validCount === 0}
              onClick={handleImport}
              className="inline-flex items-center gap-1.5 px-5 py-2 font-semibold text-white bg-[#C91F28] hover:bg-[#a81920] rounded-xl shadow-sm disabled:opacity-50 transition-all"
            >
              {isProcessing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Import {validCount} Agent{validCount !== 1 ? 's' : ''}</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
