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
  Users,
  FileText,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Modal } from '../ui/Modal.js';
import { Traveller } from '../../types/index.js';
import { api } from '../../api/client.js';

interface PassengerImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When imported within BookingModal (draft state) */
  onImport?: (passengers: Traveller[]) => void;
  /** When imported within BookingDetail (persisted booking state) */
  bookingId?: string;
  bookingNumber?: string;
  onSuccess?: () => void;
}

export interface ParsedPassengerRow {
  rowNumber: number;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | string;
  phone: string;
  age?: number | null;
  email?: string | null;
  idNumber?: string | null;
  address?: string | null;
  isValid: boolean;
  errors: string[];
}

export const PassengerImportModal: React.FC<PassengerImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  bookingId,
  bookingNumber,
  onSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedPassengerRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'valid' | 'errors'>('all');
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [skipErrors, setSkipErrors] = useState(true);

  if (!isOpen) return null;

  const resetState = () => {
    setFileName(null);
    setParsedRows([]);
    setIsProcessing(false);
    setIsSaving(false);
    setActiveTab('all');
    setGlobalError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // 1. Download Sample Template (.xlsx and .csv)
  const downloadTemplate = (format: 'xlsx' | 'csv') => {
    const headers = [
      'Name',
      'Gender',
      'Contact Number',
      'Age',
      'Email',
      'ID / Passport Number',
      'Address',
    ];

    const sampleRows = [
      [
        'Rajesh Sharma',
        'Male',
        '9876543210',
        34,
        'rajesh.sharma@example.com',
        'AADHAAR-8921-3412',
        'Bangalore, Karnataka',
      ],
      [
        'Priya Sharma',
        'Female',
        '9876543211',
        31,
        'priya.s@example.com',
        'AADHAAR-5544-1122',
        'Bangalore, Karnataka',
      ],
      [
        'Aarav Sharma',
        'Male',
        '9876543210',
        7,
        '',
        'BC-2019-9944',
        'Bangalore, Karnataka',
      ],
      [
        'Sunita Patel',
        'Female',
        '9845012345',
        28,
        'sunita.patel@example.com',
        'PASS-P4829103',
        'Mumbai, Maharashtra',
      ],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);

    ws['!cols'] = [
      { wch: 22 }, // Name
      { wch: 12 }, // Gender
      { wch: 18 }, // Contact Number
      { wch: 8 },  // Age
      { wch: 26 }, // Email
      { wch: 22 }, // ID/Passport
      { wch: 30 }, // Address
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Passengers');

    if (format === 'xlsx') {
      XLSX.writeFile(wb, 'Ooting_Passenger_Import_Template.xlsx');
    } else {
      XLSX.writeFile(wb, 'Ooting_Passenger_Import_Template.csv', { bookType: 'csv' });
    }
  };

  // Helper to normalize gender
  const normalizeGender = (val: any): { gender: string; isValid: boolean } => {
    if (!val) return { gender: '', isValid: false };
    const s = String(val).trim().toUpperCase();
    if (s === 'M' || s === 'MALE' || s === 'BOY' || s === 'MEN' || s === 'MAN') {
      return { gender: 'MALE', isValid: true };
    }
    if (s === 'F' || s === 'FEMALE' || s === 'GIRL' || s === 'WOMEN' || s === 'WOMAN') {
      return { gender: 'FEMALE', isValid: true };
    }
    if (s === 'O' || s === 'OTHER' || s === 'OTHERS' || s === 'NON-BINARY') {
      return { gender: 'OTHER', isValid: true };
    }
    return { gender: s, isValid: false };
  };

  // Helper to normalize phone
  const cleanPhone = (val: any): { phone: string; isValid: boolean } => {
    if (!val) return { phone: '', isValid: false };
    const raw = String(val).replace(/[^\d+]/g, '');
    const digitsOnly = raw.replace(/\D/g, '');
    // Minimum 10 digits for Indian or international numbers
    if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
      return { phone: raw, isValid: true };
    }
    return { phone: String(val).trim(), isValid: false };
  };

  // 2. Handle File Upload and Parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setGlobalError(null);
    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!rawJson || rawJson.length < 2) {
          setGlobalError('The uploaded spreadsheet contains no passenger data.');
          setParsedRows([]);
          setIsProcessing(false);
          return;
        }

        // Find header row (check first 5 rows)
        let headerRowIdx = -1;
        let nameColIdx = -1;
        let genderColIdx = -1;
        let phoneColIdx = -1;
        let ageColIdx = -1;
        let emailColIdx = -1;
        let idColIdx = -1;
        let addressColIdx = -1;

        for (let r = 0; r < Math.min(rawJson.length, 5); r++) {
          const row = (rawJson[r] || []).map((c: any) => String(c || '').toLowerCase().trim());
          const nIdx = row.findIndex((c: string) => c.includes('name') || c.includes('passenger'));
          const pIdx = row.findIndex((c: string) => c.includes('phone') || c.includes('contact') || c.includes('mobile'));

          if (nIdx !== -1 && pIdx !== -1) {
            headerRowIdx = r;
            nameColIdx = nIdx;
            phoneColIdx = pIdx;
            genderColIdx = row.findIndex((c: string) => c.includes('gender') || c.includes('sex'));
            ageColIdx = row.findIndex((c: string) => c === 'age' || c.includes('years'));
            emailColIdx = row.findIndex((c: string) => c.includes('email') || c.includes('mail'));
            idColIdx = row.findIndex((c: string) => c.includes('passport') || c.includes('id') || c.includes('aadhaar') || c.includes('govt'));
            addressColIdx = row.findIndex((c: string) => c.includes('address') || c.includes('city') || c.includes('location'));
            break;
          }
        }

        if (headerRowIdx === -1 || nameColIdx === -1 || phoneColIdx === -1) {
          setGlobalError(
            'Could not find columns for "Name" and "Contact Number". Please ensure header titles include Name and Phone/Contact.'
          );
          setParsedRows([]);
          setIsProcessing(false);
          return;
        }

        const rows: ParsedPassengerRow[] = [];
        const seenNames = new Map<string, number>();

        for (let i = headerRowIdx + 1; i < rawJson.length; i++) {
          const rawRow = rawJson[i];
          if (!rawRow || rawRow.length === 0) continue;

          // Check if row is completely blank
          const isBlank = rawRow.every((val: any) => val === undefined || val === null || String(val).trim() === '');
          if (isBlank) continue;

          const rawName = String(rawRow[nameColIdx] || '').trim();
          const rawGender = genderColIdx !== -1 ? rawRow[genderColIdx] : '';
          const rawPhone = String(rawRow[phoneColIdx] || '').trim();
          const rawAge = ageColIdx !== -1 ? rawRow[ageColIdx] : null;
          const rawEmail = emailColIdx !== -1 ? String(rawRow[emailColIdx] || '').trim() : '';
          const rawIdNumber = idColIdx !== -1 ? String(rawRow[idColIdx] || '').trim() : '';
          const rawAddress = addressColIdx !== -1 ? String(rawRow[addressColIdx] || '').trim() : '';

          const rowErrors: string[] = [];

          // 1. Name validation
          if (!rawName) {
            rowErrors.push('Passenger name is missing');
          } else if (rawName.length < 2) {
            rowErrors.push('Name is too short (min 2 characters)');
          }

          // 2. Gender validation
          const { gender, isValid: isGenderValid } = normalizeGender(rawGender);
          if (!isGenderValid) {
            rowErrors.push('Gender must be Male, Female, or Other');
          }

          // 3. Contact Number validation
          const { phone, isValid: isPhoneValid } = cleanPhone(rawPhone);
          if (!isPhoneValid) {
            rowErrors.push('Invalid contact number (minimum 10 digits required)');
          }

          // 4. Age validation (optional)
          let parsedAge: number | null = null;
          if (rawAge !== undefined && rawAge !== null && String(rawAge).trim() !== '') {
            const num = parseInt(String(rawAge), 10);
            if (isNaN(num) || num < 0 || num > 120) {
              rowErrors.push('Age must be a valid number between 0 and 120');
            } else {
              parsedAge = num;
            }
          }

          // 5. Email validation (optional)
          let cleanEmail: string | null = null;
          if (rawEmail) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
              rowErrors.push('Invalid email address format');
            } else {
              cleanEmail = rawEmail.toLowerCase();
            }
          }

          // 6. Duplicate checking in file
          const nameKey = rawName.toLowerCase();
          if (rawName && seenNames.has(nameKey)) {
            rowErrors.push(`Duplicate passenger name in sheet (matches row ${seenNames.get(nameKey)})`);
          } else if (rawName) {
            seenNames.set(nameKey, i + 1);
          }

          rows.push({
            rowNumber: i + 1,
            name: rawName,
            gender: gender || 'MALE',
            phone: phone || rawPhone,
            age: parsedAge,
            email: cleanEmail,
            idNumber: rawIdNumber || null,
            address: rawAddress || null,
            isValid: rowErrors.length === 0,
            errors: rowErrors,
          });
        }

        if (rows.length === 0) {
          setGlobalError('No passenger records found in the uploaded file.');
        }

        setParsedRows(rows);
      } catch (err: any) {
        console.error('File parsing error:', err);
        setGlobalError('Failed to read spreadsheet file. Please check file format and try again.');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  const validRows = parsedRows.filter((r) => r.isValid);
  const errorRows = parsedRows.filter((r) => !r.isValid);

  const displayedRows =
    activeTab === 'valid' ? validRows : activeTab === 'errors' ? errorRows : parsedRows;

  // 3. Confirm Import
  const handleConfirmImport = async () => {
    const rowsToImport = skipErrors ? validRows : parsedRows;
    if (rowsToImport.length === 0) {
      setGlobalError('No valid passenger records to import.');
      return;
    }

    const travellersData: Traveller[] = rowsToImport.map((r, idx) => ({
      name: r.name,
      gender: r.gender,
      phone: r.phone,
      age: r.age,
      email: r.email,
      idNumber: r.idNumber,
      address: r.address,
      isPrimary: idx === 0,
    }));

    // Mode A: Attached directly to a persisted booking
    if (bookingId) {
      setIsSaving(true);
      try {
        await api.post(`/bookings/${bookingId}/passengers/import`, {
          passengers: travellersData,
          replaceExisting: false,
        });

        if (onSuccess) onSuccess();
        handleClose();
      } catch (err: any) {
        setGlobalError(err.response?.data?.message || 'Failed to save passengers to database.');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // Mode B: Handed off to draft in BookingModal
    if (onImport) {
      onImport(travellersData);
      handleClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Passengers via Excel / CSV"
      subtitle={
        bookingNumber
          ? `Bulk import group tour passengers for booking ${bookingNumber}`
          : 'Upload spreadsheet with group passenger roster for confirmed booking'
      }
      maxWidth="4xl"
    >
      <div className="space-y-4 text-xs">
        {globalError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-[#C91F28] dark:text-red-300 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{globalError}</span>
          </div>
        )}

        {/* Step 1 & 2: Template Download & Upload Area */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          {/* Download Templates Banner */}
          <div className="md:col-span-4 p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between">
            <div className="space-y-1.5">
              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#C91F28]" />
                Download Sample Template
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Use our pre-formatted template with Name, Gender, Phone, Age, ID, and Address columns.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-3">
              <button
                type="button"
                onClick={() => downloadTemplate('xlsx')}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => downloadTemplate('csv')}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download CSV (.csv)</span>
              </button>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div className="md:col-span-8">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={handleFileUpload}
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#C91F28] dark:hover:border-[#C91F28] bg-slate-50/50 dark:bg-slate-900/50 p-6 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-slate-100/70 dark:hover:bg-slate-800/70 min-h-[145px]"
            >
              <UploadCloud className="w-8 h-8 text-[#C91F28] mb-2" />
              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                {fileName ? `Uploaded: ${fileName}` : 'Click to Upload Passenger Spreadsheet (.xlsx or .csv)'}
              </span>
              <span className="text-[11px] text-slate-500 mt-1 max-w-sm">
                Drag and drop your Excel or CSV file. All passengers will be validated automatically.
              </span>
              {isProcessing && (
                <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs mt-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Validating passenger records...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Step 3 & 4: Validation Summary & Tabs */}
        {parsedRows.length > 0 && (
          <div className="space-y-3">
            {/* KPI Summary Banner */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
                <span className="text-[10px] text-slate-500 font-semibold uppercase block">Total Found</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  {parsedRows.length} Passengers
                </span>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold uppercase block">
                  Valid to Import
                </span>
                <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-400">
                  {validRows.length} Ready
                </span>
              </div>

              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-center">
                <span className="text-[10px] text-rose-700 dark:text-rose-400 font-semibold uppercase block">
                  Errors / Issues
                </span>
                <span className="text-base font-extrabold text-rose-700 dark:text-rose-400">
                  {errorRows.length} Needs Attention
                </span>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1 font-semibold rounded-lg text-xs transition-colors cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  All ({parsedRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('valid')}
                  className={`px-3 py-1 font-semibold rounded-lg text-xs transition-colors cursor-pointer ${
                    activeTab === 'valid'
                      ? 'bg-emerald-600 text-white'
                      : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50'
                  }`}
                >
                  Valid Ready ({validRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('errors')}
                  className={`px-3 py-1 font-semibold rounded-lg text-xs transition-colors cursor-pointer ${
                    activeTab === 'errors'
                      ? 'bg-rose-600 text-white'
                      : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50'
                  }`}
                >
                  Errors ({errorRows.length})
                </button>
              </div>

              {errorRows.length > 0 && (
                <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipErrors}
                    onChange={(e) => setSkipErrors(e.target.checked)}
                    className="rounded text-[#C91F28] focus:ring-[#C91F28]"
                  />
                  <span>Skip error rows and import {validRows.length} valid passengers</span>
                </label>
              )}
            </div>

            {/* Preview Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold sticky top-0 z-10">
                  <tr>
                    <th className="p-2.5 w-12 text-center">Row</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Passenger Name</th>
                    <th className="p-2.5">Gender</th>
                    <th className="p-2.5">Contact Number</th>
                    <th className="p-2.5">Age</th>
                    <th className="p-2.5">ID / Passport</th>
                    <th className="p-2.5">Validation Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {displayedRows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className={
                        !row.isValid
                          ? 'bg-rose-50/50 dark:bg-rose-950/20'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-850'
                      }
                    >
                      <td className="p-2.5 text-center font-mono font-medium text-slate-500">
                        {row.rowNumber}
                      </td>
                      <td className="p-2.5">
                        {row.isValid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                            <Check className="w-3 h-3" /> Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">
                            <AlertTriangle className="w-3 h-3" /> Error
                          </span>
                        )}
                      </td>
                      <td className={`p-2.5 font-semibold ${!row.name ? 'text-rose-600 italic' : 'text-slate-900 dark:text-slate-100'}`}>
                        {row.name || 'Missing Name'}
                      </td>
                      <td className="p-2.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {row.gender}
                        </span>
                      </td>
                      <td className={`p-2.5 font-mono ${row.errors.some((e) => e.includes('contact')) ? 'text-rose-600 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                        {row.phone || '—'}
                      </td>
                      <td className="p-2.5 text-slate-600 dark:text-slate-400">
                        {row.age ?? '—'}
                      </td>
                      <td className="p-2.5 text-slate-600 dark:text-slate-400">
                        {row.idNumber || '—'}
                      </td>
                      <td className="p-2.5">
                        {row.isValid ? (
                          <span className="text-emerald-600 font-medium text-[11px]">Ready to save</span>
                        ) : (
                          <div className="space-y-0.5">
                            {row.errors.map((err, errIdx) => (
                              <span key={errIdx} className="text-rose-600 dark:text-rose-400 font-semibold text-[11px] block">
                                • {err}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {parsedRows.length > 0 && (
              <button
                type="button"
                disabled={validRows.length === 0 || isSaving}
                onClick={handleConfirmImport}
                className="inline-flex items-center gap-1.5 px-5 py-2 font-bold text-white bg-[#C91F28] hover:bg-[#a81920] rounded-xl shadow-sm disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving to Database...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      Import {skipErrors ? validRows.length : parsedRows.length} Passengers
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
