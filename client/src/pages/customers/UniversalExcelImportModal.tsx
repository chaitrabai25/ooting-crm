import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Check,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal.js';
import { api } from '../../api/client.js';

interface UniversalExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customerId: string;
  customerName: string;
  customerType?: string;
}

interface ParsedRow {
  memberId: string;
  name: string;
  roleCategory: string;
  designation: string;
  department: string;
  section: string;
  phone: string;
  email: string;
  gender: string;
  age: string;
  bloodGroup: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  dietaryPreferences: string;
  medicalNotes: string;
  isValid: boolean;
  validationError?: string;
}

export const UniversalExcelImportModal: React.FC<UniversalExcelImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  customerId,
  customerName,
  customerType = 'ORGANIZATION',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'preview' | 'processing' | 'result'>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [duplicateAction, setDuplicateAction] = useState<'skip' | 'update'>('skip');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<{
    message: string;
    imported: number;
    updated: number;
    skipped: number;
    errors: { row: number; error: string }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSchool = customerType === 'SCHOOL' || customerType === 'INSTITUTE';

  const resetState = () => {
    setStep('upload');
    setFileName('');
    setParsedRows([]);
    setDuplicateAction('skip');
    setIsSubmitting(false);
    setImportResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get(`/customers/${customerId}/members/template`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${customerName.replace(/[^a-zA-Z0-9_-]/g, '_')}_Members_Template.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Failed to download template. Please try again.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        // raw: false ensures strings with leading zeros ("00482") are preserved as string text!
        const workbook = XLSX.read(data, { type: 'array', raw: false });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, {
          defval: '',
          raw: false,
        });

        if (rawRows.length === 0) {
          setError('The uploaded Excel sheet contains no records or rows.');
          return;
        }

        const normalized: ParsedRow[] = rawRows.map((r, idx) => {
          const rawMemberId = String(r['Member ID / Roll No'] || r['Member ID'] || r['Roll No'] || r.memberId || r.id || '').trim();
          const rawName = String(r['Full Name *'] || r['Full Name'] || r.name || r.fullName || '').trim();
          const rawRole = String(r['Role Category'] || r.roleCategory || r.role || (isSchool ? 'STUDENT' : 'EMPLOYEE')).trim();
          const rawDept = String(r['Department / Class'] || r['Department'] || r['Class'] || r.department || '').trim();
          const rawSection = String(r['Section'] || r.section || '').trim();
          const rawDesignation = String(r['Designation'] || r.designation || '').trim();
          const rawPhone = String(r['Phone'] || r['Mobile'] || r.phone || '').trim();
          const rawEmail = String(r['Email'] || r.email || '').trim();
          const rawGender = String(r['Gender'] || r.gender || '').trim();
          const rawAge = String(r['Age'] || r.age || '').trim();
          const rawBloodGroup = String(r['Blood Group'] || r.bloodGroup || '').trim();
          const rawEmergName = String(r['Emergency Contact Name'] || r.emergencyContactName || '').trim();
          const rawEmergPhone = String(r['Emergency Contact Phone'] || r.emergencyContactPhone || '').trim();
          const rawEmergRel = String(r['Emergency Contact Relation'] || r.emergencyContactRelation || '').trim();
          const rawDiet = String(r['Dietary Preferences'] || r.dietaryPreferences || '').trim();
          const rawMed = String(r['Medical Notes'] || r.medicalNotes || '').trim();

          let isValid = true;
          let validationError = '';

          if (!rawName || rawName.length < 2) {
            isValid = false;
            validationError = 'Name is required (min 2 chars)';
          }

          return {
            memberId: rawMemberId,
            name: rawName,
            roleCategory: rawRole.toUpperCase() || 'MEMBER',
            department: rawDept,
            section: rawSection,
            designation: rawDesignation,
            phone: rawPhone,
            email: rawEmail,
            gender: rawGender,
            age: rawAge,
            bloodGroup: rawBloodGroup,
            emergencyContactName: rawEmergName,
            emergencyContactPhone: rawEmergPhone,
            emergencyContactRelation: rawEmergRel,
            dietaryPreferences: rawDiet,
            medicalNotes: rawMed,
            isValid,
            validationError,
          };
        });

        setParsedRows(normalized);
        setStep('preview');
      } catch (err: any) {
        setError(`Failed to read Excel file: ${err?.message || 'Invalid format'}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExecuteImport = async () => {
    setIsSubmitting(true);
    setError(null);
    setStep('processing');

    try {
      const validRows = parsedRows.filter((r) => r.isValid);
      const res = await api.post(`/customers/${customerId}/members/import`, {
        rows: validRows,
        duplicateAction,
      });

      setImportResult(res.data);
      setStep('result');
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete import.');
      setStep('preview');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadErrorReport = () => {
    if (!importResult || !importResult.errors || importResult.errors.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(
      importResult.errors.map((e) => ({
        'Row Number': e.row,
        'Issue / Error Description': e.error,
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Errors');
    XLSX.writeFile(workbook, `${customerName}_Import_Errors.xlsx`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Universal Excel Import Engine"
      subtitle={`Import Members, Passengers, Students & Staff for ${customerName}`}
      maxWidth="xl"
    >
      <div className="space-y-5 text-xs">
        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                step === 'upload'
                  ? 'bg-brand-600 text-white'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
              }`}
            >
              1
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">Upload File</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                step === 'preview'
                  ? 'bg-brand-600 text-white'
                  : step === 'result'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}
            >
              2
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">Preview & Validate</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                step === 'result'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}
            >
              3
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">Execution Summary</span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: UPLOAD */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-brand-600" />
                  Dynamic Excel Template
                </h4>
                <p className="text-blue-700 dark:text-blue-300 text-[11px] mt-0.5">
                  Pre-formatted with {isSchool ? 'Roll Numbers, Classes, Sections' : 'Employee IDs, Departments, Designations'} and sample rows.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300 rounded-lg hover:bg-blue-50 font-semibold shadow-sm transition-colors text-xs shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                Download Template (.xlsx)
              </button>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/50"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-12 h-12 bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                Click to browse or drop your Excel file here
              </p>
              <p className="text-slate-500 text-[11px] mt-1">Supports Microsoft Excel (.xlsx, .xls) and CSV</p>
              <div className="mt-4 inline-flex items-center gap-2 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 rounded text-[10px]">
                <Check className="w-3 h-3 text-emerald-600" />
                Leading zero preservation enabled (IDs like "00482" stay intact)
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-brand-600" />
                <span className="font-bold text-slate-800 dark:text-slate-200">{fileName}</span>
                <span className="text-slate-500 text-[11px]">({parsedRows.length} total rows parsed)</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Duplicate Records:
                </label>
                <select
                  value={duplicateAction}
                  onChange={(e) => setDuplicateAction(e.target.value as any)}
                  className="p-1.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-slate-900 dark:text-white"
                >
                  <option value="skip">Skip duplicates (Keep existing)</option>
                  <option value="update">Update existing records with new data</option>
                </select>
              </div>
            </div>

            {/* Preview Table */}
            <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 text-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="p-2 border-b border-slate-200 dark:border-slate-700">#</th>
                    <th className="p-2 border-b border-slate-200 dark:border-slate-700">Member ID</th>
                    <th className="p-2 border-b border-slate-200 dark:border-slate-700">Full Name</th>
                    <th className="p-2 border-b border-slate-200 dark:border-slate-700">Role</th>
                    <th className="p-2 border-b border-slate-200 dark:border-slate-700">{isSchool ? 'Class/Sec' : 'Dept/Designation'}</th>
                    <th className="p-2 border-b border-slate-200 dark:border-slate-700">Phone</th>
                    <th className="p-2 border-b border-slate-200 dark:border-slate-700">Emergency</th>
                    <th className="p-2 border-b border-slate-200 dark:border-slate-700 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {parsedRows.map((r, i) => (
                    <tr
                      key={i}
                      className={!r.isValid ? 'bg-red-50/60 dark:bg-red-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}
                    >
                      <td className="p-2 text-slate-500">{i + 1}</td>
                      <td className="p-2 font-mono font-bold text-brand-600 dark:text-brand-400">
                        {r.memberId || '-'}
                      </td>
                      <td className="p-2 font-semibold text-slate-900 dark:text-white">
                        {r.name}
                        {r.validationError && (
                          <div className="text-[10px] text-red-600 dark:text-red-400 font-normal">
                            {r.validationError}
                          </div>
                        )}
                      </td>
                      <td className="p-2">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {r.roleCategory}
                        </span>
                      </td>
                      <td className="p-2 text-slate-600 dark:text-slate-300">
                        {isSchool
                          ? `${r.department || ''} ${r.section ? `(${r.section})` : ''}`
                          : `${r.department || ''} ${r.designation ? `/ ${r.designation}` : ''}`}
                      </td>
                      <td className="p-2 text-slate-600 dark:text-slate-300">{r.phone || '-'}</td>
                      <td className="p-2 text-slate-600 dark:text-slate-300">
                        {r.emergencyContactPhone ? `${r.emergencyContactName || 'Contact'}: ${r.emergencyContactPhone}` : '-'}
                      </td>
                      <td className="p-2 text-center">
                        {r.isValid ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold text-[10px]">
                            <AlertTriangle className="w-3.5 h-3.5" /> Invalid
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
              >
                Choose Another File
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={isSubmitting || parsedRows.filter((r) => r.isValid).length === 0}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                Execute Import ({parsedRows.filter((r) => r.isValid).length} Valid Records)
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PROCESSING */}
        {step === 'processing' && (
          <div className="p-8 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto" />
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
              Processing & Validating Records...
            </h4>
            <p className="text-slate-500 text-xs">
              Saving directory members, validating unique identifiers, and updating audit trail.
            </p>
          </div>
        )}

        {/* STEP 4: RESULT */}
        {step === 'result' && importResult && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
              <h4 className="font-bold text-emerald-950 dark:text-emerald-200 text-sm">
                Import Process Completed
              </h4>
              <p className="text-emerald-700 dark:text-emerald-300 text-xs mt-1">
                {importResult.message}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-emerald-600">{importResult.imported}</div>
                <div className="text-slate-500 text-[10px] font-semibold uppercase mt-0.5">New Imported</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{importResult.updated}</div>
                <div className="text-slate-500 text-[10px] font-semibold uppercase mt-0.5">Updated</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-amber-600">{importResult.skipped}</div>
                <div className="text-slate-500 text-[10px] font-semibold uppercase mt-0.5">Skipped / Duplicates</div>
              </div>
            </div>

            {importResult.errors && importResult.errors.length > 0 && (
              <div className="border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 dark:text-amber-200 text-[11px] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    {importResult.errors.length} Row(s) Skipped or Had Validation Warnings
                  </span>
                  <button
                    type="button"
                    onClick={handleDownloadErrorReport}
                    className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" /> Download Error Log
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-semibold hover:opacity-90"
              >
                Close & Return to Directory
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
