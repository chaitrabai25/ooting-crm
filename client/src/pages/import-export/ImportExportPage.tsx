import React, { useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  RefreshCw,
  Sparkles,
  Users,
  BookmarkCheck,
  Car,
  Briefcase,
  Building2,
  CalendarCheck,
  ChevronRight,
  Filter,
  FileText,
} from 'lucide-react';
import { api } from '../../api/client.js';
import { downloadExcel } from '../../utils/exportHelper.js';
import { downloadExcelTemplate, parseExcelDate, parseExcelNumber, cleanPhoneNumber } from '../../utils/excel.js';

type ModuleKey = 'leads' | 'enquiries' | 'followups' | 'customers' | 'bookings' | 'cabs' | 'agents' | 'suppliers';

interface ModuleConfig {
  key: ModuleKey;
  name: string;
  category: string;
  icon: React.ElementType;
  description: string;
  templateFileName: string;
  templateColumns: string[];
  sampleData: Record<string, any>[];
  exportUrl: string;
  importUrl?: string;
  requiredFields: string[];
  duplicateFieldDescription: string;
}

const MODULE_CONFIGS: ModuleConfig[] = [
  {
    key: 'leads',
    name: 'Leads',
    category: 'Sales',
    icon: Sparkles,
    description: 'Fresh travel enquiries, prospect inquiries, and vacation requests.',
    templateFileName: 'ooting-leads-template.xlsx',
    templateColumns: [
      'Customer Name',
      'Customer Phone',
      'Customer Email',
      'Customer City',
      'Destination',
      'Adults',
      'Children',
      'Budget',
      'Priority',
      'Enquiry Status',
      'Notes',
    ],
    sampleData: [
      {
        'Customer Name': 'Rahul Sharma',
        'Customer Phone': '+919876543210',
        'Customer Email': 'rahul.sharma@example.com',
        'Customer City': 'Bangalore',
        'Destination': 'Ooty & Coonoor Tour',
        'Adults': 2,
        'Children': 1,
        'Budget': 35000,
        'Priority': 'HIGH',
        'Enquiry Status': 'NEW',
        'Notes': 'Looking for valley view resort and sightseeing cab',
      },
    ],
    exportUrl: '/leads/export/excel?tab=new',
    importUrl: '/leads/import',
    requiredFields: ['Customer Name', 'Customer Phone'],
    duplicateFieldDescription: 'Matched by Phone Number and Destination',
  },
  {
    key: 'enquiries',
    name: 'All Enquiries',
    category: 'Sales',
    icon: Sparkles,
    description: 'Complete pipeline of inquiries across all processing stages.',
    templateFileName: 'ooting-enquiries-template.xlsx',
    templateColumns: [
      'Customer Name',
      'Customer Phone',
      'Customer Email',
      'Customer City',
      'Destination',
      'Adults',
      'Children',
      'Budget',
      'Priority',
      'Enquiry Status',
      'Notes',
    ],
    sampleData: [
      {
        'Customer Name': 'Anita Roy',
        'Customer Phone': '+919811223344',
        'Customer Email': 'anita.roy@example.com',
        'Customer City': 'Mumbai',
        'Destination': 'Nilgiris Honeymoon Package',
        'Adults': 2,
        'Children': 0,
        'Budget': 55000,
        'Priority': 'MEDIUM',
        'Enquiry Status': 'QUALIFIED',
        'Notes': 'Needs custom 4D/3N itinerary with candlelight dinner',
      },
    ],
    exportUrl: '/leads/export/excel?tab=all',
    importUrl: '/leads/import',
    requiredFields: ['Customer Name', 'Customer Phone'],
    duplicateFieldDescription: 'Matched by Phone Number and Destination',
  },
  {
    key: 'followups',
    name: 'Follow-ups',
    category: 'Operations',
    icon: CalendarCheck,
    description: 'Client touchpoints, quotation closure calls, and scheduled callbacks.',
    templateFileName: 'ooting-followups-template.xlsx',
    templateColumns: ['Customer Name', 'Customer Phone', 'Follow-up Date', 'Notes'],
    sampleData: [],
    exportUrl: '/followups/export/excel',
    requiredFields: ['Customer Name', 'Customer Phone'],
    duplicateFieldDescription: 'Export only module',
  },
  {
    key: 'customers',
    name: 'Customers & Tourists',
    category: 'Profiles',
    icon: Users,
    description: 'Master directory of travellers, repeat tourists, and contact records.',
    templateFileName: 'ooting-customers-template.xlsx',
    templateColumns: [
      'Full Name',
      'Phone',
      'Alternate Phone',
      'Email',
      'City',
      'State',
      'Country',
      'Notes',
    ],
    sampleData: [
      {
        'Full Name': 'Sanjay Gupta',
        'Phone': '+919822334455',
        'Alternate Phone': '+919822334456',
        'Email': 'sanjay.gupta@example.com',
        'City': 'Chennai',
        'State': 'Tamil Nadu',
        'Country': 'India',
        'Notes': 'Frequent corporate weekend traveller to Ooty',
      },
    ],
    exportUrl: '/customers/export/excel',
    importUrl: '/customers/import',
    requiredFields: ['Full Name', 'Phone'],
    duplicateFieldDescription: 'Matched by Primary Phone Number',
  },
  {
    key: 'bookings',
    name: 'Tour Bookings',
    category: 'Operations',
    icon: BookmarkCheck,
    description: 'Confirmed holiday packages, group rosters, and balance receivables.',
    templateFileName: 'ooting-tour-bookings-template.xlsx',
    templateColumns: [
      'Customer Name',
      'Customer Phone',
      'Customer Email',
      'Customer City',
      'Start Date',
      'End Date',
      'Pax',
      'Total Amount',
      'Discount',
      'Status',
      'Notes',
    ],
    sampleData: [
      {
        'Customer Name': 'Deepak Nair',
        'Customer Phone': '+919844556677',
        'Customer Email': 'deepak.nair@example.com',
        'Customer City': 'Coimbatore',
        'Start Date': '2026-10-20',
        'End Date': '2026-10-24',
        'Pax': 4,
        'Total Amount': 64000,
        'Discount': 3000,
        'Status': 'CONFIRMED',
        'Notes': 'Includes Avalanche lake safari and Toy Train ride',
      },
    ],
    exportUrl: '/bookings/export/excel',
    importUrl: '/bookings/import',
    requiredFields: ['Customer Name', 'Customer Phone'],
    duplicateFieldDescription: 'Matched by Customer Phone and Travel Start Date',
  },
  {
    key: 'cabs',
    name: 'Cab Bookings',
    category: 'Fleet & Transfers',
    icon: Car,
    description: 'Outstation cabs, tourist station transfers, and duty slip logs.',
    templateFileName: 'ooting-cab-bookings-template.xlsx',
    templateColumns: [
      'Customer Name',
      'Customer Phone',
      'Pickup Place',
      'Drop Place',
      'Pickup Date',
      'Vehicle Type',
      'Car Number',
      'Driver Name',
      'Driver Phone',
      'Cab Amount',
      'Advance',
      'Notes',
    ],
    sampleData: [
      {
        'Customer Name': 'Meenakshi Sundaram',
        'Customer Phone': '+919955667788',
        'Pickup Place': 'Coimbatore Junction',
        'Drop Place': 'Ooty Commercial Road',
        'Pickup Date': '2026-11-05',
        'Vehicle Type': 'INNOVA',
        'Car Number': 'TN-43-C-9876',
        'Driver Name': 'Muthu',
        'Driver Phone': '+919876540000',
        'Cab Amount': 4200,
        'Advance': 1000,
        'Notes': 'Train arriving at 07:30 AM',
      },
    ],
    exportUrl: '/cabs/export/excel',
    importUrl: '/cabs/import',
    requiredFields: ['Customer Name', 'Customer Phone'],
    duplicateFieldDescription: 'Matched by Customer Phone, Pickup and Drop Locations',
  },
  {
    key: 'agents',
    name: 'B2B Travel Agents',
    category: 'Partnerships',
    icon: Briefcase,
    description: 'Wholesale agencies, commission accounts, and trade partners.',
    templateFileName: 'ooting-travel-agents-template.xlsx',
    templateColumns: [
      'Agency / Company Name',
      'Contact Person',
      'Phone',
      'Email',
      'City',
      'State',
      'GST Number',
      'PAN Number',
      'Agent Tier',
      'Status',
      'Notes',
    ],
    sampleData: [
      {
        'Agency / Company Name': 'Southern Journeys Ltd',
        'Contact Person': 'Karthik Raja',
        'Phone': '+919866778899',
        'Email': 'ops@southernjourneys.in',
        'City': 'Hyderabad',
        'State': 'Telangana',
        'GST Number': '36ABCDE1234F1Z9',
        'PAN Number': 'ABCDE1234F',
        'Agent Tier': 'Gold',
        'Status': 'ACTIVE',
        'Notes': 'Sends 10+ group bookings per month',
      },
    ],
    exportUrl: '/agents/export/excel',
    importUrl: '/agents/import',
    requiredFields: ['Agency / Company Name', 'Contact Person', 'Phone'],
    duplicateFieldDescription: 'Matched by Agency Name or Phone Number',
  },
  {
    key: 'suppliers',
    name: 'B2B Service Providers',
    category: 'Partnerships',
    icon: Building2,
    description: 'Hotels, transport coaches, local guides, activities & safari vendors.',
    templateFileName: 'ooting-service-providers-template.xlsx',
    templateColumns: [
      'Supplier / Company Name',
      'Supplier Type',
      'Contact Person',
      'Phone',
      'Email',
      'City',
      'State',
      'District',
      'Pincode',
      'PAN Number',
      'Tier',
      'Status',
      'Notes',
    ],
    sampleData: [
      {
        'Supplier / Company Name': 'Nilgiris Pine Valley Resort',
        'Supplier Type': 'HOTEL',
        'Contact Person': 'Ramesh Chander',
        'Phone': '+919877889900',
        'Email': 'info@pinevalleyresort.com',
        'City': 'Ooty',
        'State': 'Tamil Nadu',
        'District': 'Nilgiris',
        'Pincode': '643001',
        'PAN Number': 'AABCP1234E',
        'Tier': 'Diamond',
        'Status': 'ACTIVE',
        'Notes': 'Direct B2B rate with complimentary breakfast',
      },
    ],
    exportUrl: '/suppliers/export/excel',
    importUrl: '/suppliers/import',
    requiredFields: ['Supplier / Company Name', 'Phone'],
    duplicateFieldDescription: 'Matched by Supplier Name or Phone Number',
  },
];

export const ImportExportPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') === 'export' ? 'export' : 'import') as 'import' | 'export';

  const [selectedModuleKey, setSelectedModuleKey] = useState<ModuleKey>('leads');
  const selectedModule = MODULE_CONFIGS.find((m) => m.key === selectedModuleKey) || MODULE_CONFIGS[0];

  // Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);
  const [rowValidationResults, setRowValidationResults] = useState<{
    validCount: number;
    warningCount: number;
    errorCount: number;
    rowStatuses: { isValid: boolean; warning?: string; error?: string }[];
  }>({
    validCount: 0,
    warningCount: 0,
    errorCount: 0,
    rowStatuses: [],
  });

  const [duplicateAction, setDuplicateAction] = useState<'skip' | 'update' | 'new'>('skip');
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    isOpen: boolean;
    imported: number;
    skipped: number;
    errors: string[];
    message: string;
  } | null>(null);

  // Export State
  const [exportSearch, setExportSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  const handleTabChange = (tab: 'import' | 'export') => {
    setSearchParams({ tab });
  };

  // Download official Excel template (.xlsx)
  const handleDownloadTemplate = (config: ModuleConfig) => {
    downloadExcelTemplate(config.templateColumns, config.sampleData, config.templateFileName);
  };

  // Parse & Validate uploaded Excel file (.xlsx only)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      alert('Please upload a valid Excel spreadsheet (.xlsx or .xls).');
      return;
    }

    setUploadedFile(file);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        const workbook = XLSX.read(buffer, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          alert('Excel file has no readable sheets.');
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawJson.length === 0) {
          alert('Excel file contains no data rows.');
          return;
        }

        // Validate each row
        let validCount = 0;
        let warningCount = 0;
        let errorCount = 0;

        const rowStatuses = rawJson.map((row, idx) => {
          let error: string | undefined;
          let warning: string | undefined;

          // Check required fields
          for (const reqField of selectedModule.requiredFields) {
            // Flexible match for column variations
            const hasVal = Object.keys(row).some(
              (key) => key.toLowerCase().replace(/[^a-z]/g, '').includes(reqField.toLowerCase().replace(/[^a-z]/g, '')) && String(row[key]).trim().length > 0
            );

            if (!hasVal) {
              error = `Missing required field "${reqField}"`;
              break;
            }
          }

          // Check Phone formatting if present
          const phoneKey = Object.keys(row).find((k) => k.toLowerCase().includes('phone') || k.toLowerCase().includes('mobile'));
          if (phoneKey && row[phoneKey]) {
            const cleaned = cleanPhoneNumber(row[phoneKey]);
            if (cleaned.length < 7) {
              error = error || 'Invalid phone number format';
            }
          }

          // Check Email formatting if present
          const emailKey = Object.keys(row).find((k) => k.toLowerCase().includes('email'));
          if (emailKey && row[emailKey]) {
            const emailStr = String(row[emailKey]).trim();
            if (emailStr && !emailStr.includes('@')) {
              warning = 'Email address looks incomplete';
            }
          }

          if (error) {
            errorCount++;
            return { isValid: false, error };
          } else if (warning) {
            warningCount++;
            validCount++;
            return { isValid: true, warning };
          } else {
            validCount++;
            return { isValid: true };
          }
        });

        setParsedRows(rawJson);
        setRowValidationResults({
          validCount,
          warningCount,
          errorCount,
          rowStatuses,
        });
      } catch (err: any) {
        console.error('Error parsing excel:', err);
        alert('Failed to parse Excel file. Please ensure it is a valid, uncorrupted .xlsx file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Submit Bulk Import to Server
  const handleConfirmImport = async () => {
    if (!selectedModule.importUrl) {
      alert('Import is not supported for this module.');
      return;
    }

    if (parsedRows.length === 0) {
      alert('No data rows to import.');
      return;
    }

    try {
      setIsImporting(true);
      const res = await api.post(selectedModule.importUrl, {
        items: parsedRows,
        duplicateAction,
      });

      setImportSummary({
        isOpen: true,
        imported: res.data.imported || 0,
        skipped: res.data.skipped || 0,
        errors: res.data.errors || [],
        message: res.data.message || 'Import completed successfully.',
      });

      // Clear uploaded file and parsed data after success
      setUploadedFile(null);
      setParsedRows([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error('Import error:', err);
      const msg = err.response?.data?.message || 'Import operation failed. Please check server logs.';
      alert(msg);
    } finally {
      setIsImporting(false);
    }
  };

  // Trigger Excel Export via Authenticated Helper
  const handleExecuteExport = async (config: ModuleConfig, useFilter: boolean = false) => {
    try {
      setIsExporting(true);
      setExportSuccessMessage(null);

      let url = config.exportUrl;
      const delimiter = url.includes('?') ? '&' : '?';

      if (useFilter && exportSearch.trim()) {
        url = `${url}${delimiter}search=${encodeURIComponent(exportSearch.trim())}`;
      }

      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `ooting-${config.key}-${timestamp}.xlsx`;

      await downloadExcel(url, filename);
      setExportSuccessMessage(`Successfully exported ${config.name} into ${filename}`);
      setTimeout(() => setExportSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <FileSpreadsheet className="w-7 h-7 text-[#C91F28]" />
              Data Import & Export Center
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Comprehensive spreadsheet operations, duplicate-protected imports, template downloads, and authenticated Excel (.xlsx) exports.
            </p>
          </div>

          {/* Primary View Tabs */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 select-none">
            <button
              type="button"
              onClick={() => handleTabChange('import')}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'import'
                  ? 'bg-[#C91F28] text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Import Data</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('export')}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'export'
                  ? 'bg-[#C91F28] text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Export Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===================== TAB: IMPORT DATA ===================== */}
      {currentTab === 'import' && (
        <div className="space-y-6">
          {/* Step 1: Select Target Module */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center text-xs font-black">
                1
              </span>
              Select Target CRM Module
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {MODULE_CONFIGS.filter((m) => m.importUrl).map((mod) => {
                const Icon = mod.icon;
                const isSelected = selectedModuleKey === mod.key;

                return (
                  <button
                    key={mod.key}
                    type="button"
                    onClick={() => {
                      setSelectedModuleKey(mod.key);
                      setUploadedFile(null);
                      setParsedRows([]);
                      setImportSummary(null);
                    }}
                    className={`flex flex-col items-center text-center p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-[#C91F28] bg-red-50/50 dark:bg-red-950/30 text-[#C91F28] shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-[#C91F28]' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span className="text-xs font-bold leading-tight">{mod.name}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{mod.category}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Download Template & Instructions */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center text-xs font-black">
                  2
                </span>
                Download Standard Excel Template
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                Download the official pre-formatted Excel spreadsheet (.xlsx) containing proper column headers and sample format guidance for <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedModule.name}</span>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleDownloadTemplate(selectedModule)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300/80 dark:border-slate-700 transition-all shrink-0 cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Download {selectedModule.name} Template (.xlsx)</span>
            </button>
          </div>

          {/* Step 3: Upload Excel File */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center text-xs font-black">
                3
              </span>
              Upload & Inspect Spreadsheet
            </h2>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .xls"
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#C91F28] dark:hover:border-[#C91F28] bg-slate-50 dark:bg-slate-950/40 rounded-2xl p-8 text-center cursor-pointer transition-colors"
            >
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {uploadedFile ? uploadedFile.name : 'Click or Drag & Drop Excel file (.xlsx or .xls)'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Supports Microsoft Excel OpenXML (.xlsx). Maximum 5,000 rows per batch.
              </p>
              {uploadedFile && (
                <span className="inline-block mt-3 px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 text-xs rounded-full font-bold">
                  Loaded {parsedRows.length} Rows
                </span>
              )}
            </div>
          </div>

          {/* Step 4 & Preview: If file is parsed */}
          {parsedRows.length > 0 && (
            <div className="space-y-6">
              {/* Duplicate Handling Strategy */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center text-xs font-black">
                    4
                  </span>
                  Duplicate Protection Strategy
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  {selectedModule.duplicateFieldDescription}. Choose how the system handles existing records:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label
                    className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                      duplicateAction === 'skip'
                        ? 'border-[#C91F28] bg-red-50/40 dark:bg-red-950/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dupStrategy"
                      checked={duplicateAction === 'skip'}
                      onChange={() => setDuplicateAction('skip')}
                      className="mt-1 text-[#C91F28] focus:ring-[#C91F28]"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                        Skip Duplicates (Safest)
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                        Preserves existing records untouched. Duplicate rows are skipped and counted in the final report.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                      duplicateAction === 'update'
                        ? 'border-[#C91F28] bg-red-50/40 dark:bg-red-950/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dupStrategy"
                      checked={duplicateAction === 'update'}
                      onChange={() => setDuplicateAction('update')}
                      className="mt-1 text-[#C91F28] focus:ring-[#C91F28]"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                        Update Existing
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                        Updates existing matching records with new details (notes, budget, tier, city, etc.) from the spreadsheet.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                      duplicateAction === 'new'
                        ? 'border-[#C91F28] bg-red-50/40 dark:bg-red-950/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dupStrategy"
                      checked={duplicateAction === 'new'}
                      onChange={() => setDuplicateAction('new')}
                      className="mt-1 text-[#C91F28] focus:ring-[#C91F28]"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                        Import as New
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                        Creates fresh entries for all rows even if contact or agency name matches an existing profile.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Validation Stats Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-4 rounded-2xl flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                      {rowValidationResults.validCount}
                    </span>
                    <span className="text-xs text-emerald-800 dark:text-emerald-400 block font-medium">
                      Valid Rows Ready
                    </span>
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-4 rounded-2xl flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <span className="text-lg font-black text-amber-700 dark:text-amber-300">
                      {rowValidationResults.warningCount}
                    </span>
                    <span className="text-xs text-amber-800 dark:text-amber-400 block font-medium">
                      Minor Format Warnings
                    </span>
                  </div>
                </div>

                <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 p-4 rounded-2xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  <div>
                    <span className="text-lg font-black text-rose-700 dark:text-rose-300">
                      {rowValidationResults.errorCount}
                    </span>
                    <span className="text-xs text-rose-800 dark:text-rose-400 block font-medium">
                      Rows with Missing Fields
                    </span>
                  </div>
                </div>
              </div>

              {/* Preview Table (First 15 rows) */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                    Spreadsheet Preview (Showing {Math.min(15, parsedRows.length)} of {parsedRows.length} Rows)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Required: {selectedModule.requiredFields.join(', ')}
                  </span>
                </div>

                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                        <th className="p-3 font-bold w-12">#</th>
                        <th className="p-3 font-bold w-28">Validation</th>
                        {Object.keys(parsedRows[0] || {}).slice(0, 6).map((col) => (
                          <th key={col} className="p-3 font-bold truncate max-w-[160px]">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {parsedRows.slice(0, 15).map((row, idx) => {
                        const status = rowValidationResults.rowStatuses[idx];

                        return (
                          <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="p-3 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                            <td className="p-3">
                              {status?.isValid ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Ready
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 truncate max-w-[140px]"
                                  title={status?.error}
                                >
                                  <AlertCircle className="w-3 h-3 shrink-0" />
                                  {status?.error || 'Invalid'}
                                </span>
                              )}
                            </td>
                            {Object.keys(parsedRows[0] || {}).slice(0, 6).map((col) => (
                              <td key={col} className="p-3 text-slate-700 dark:text-slate-300 truncate max-w-[160px]">
                                {String(row[col] ?? '')}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Confirm Action Bar */}
                <div className="p-4 bg-slate-50 dark:bg-slate-850/80 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Ready to process {rowValidationResults.validCount} valid records into the database with duplicate rule: <span className="font-bold text-slate-700 dark:text-slate-200">{duplicateAction}</span>.
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedFile(null);
                        setParsedRows([]);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      disabled={isImporting || rowValidationResults.validCount === 0}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#C91F28] hover:bg-[#a81920] disabled:opacity-50 transition-all cursor-pointer shadow-sm"
                    >
                      {isImporting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Importing Records...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>Confirm & Import into {selectedModule.name}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Import Summary Toast / Card */}
          {importSummary && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-md">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Import Completed: {selectedModule.name}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    {importSummary.message}
                  </p>

                  <div className="flex items-center gap-6 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">Successfully Processed</span>
                      <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                        {importSummary.imported}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">Skipped (Duplicate / Invalid)</span>
                      <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                        {importSummary.skipped}
                      </span>
                    </div>
                  </div>

                  {importSummary.errors.length > 0 && (
                    <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-300 max-h-40 overflow-y-auto space-y-1">
                      <span className="font-bold block text-slate-800 dark:text-slate-100 mb-1">
                        Row Notes & Skipped Details ({importSummary.errors.length}):
                      </span>
                      {importSummary.errors.map((err, i) => (
                        <div key={i} className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                          • {err}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB: EXPORT DATA ===================== */}
      {currentTab === 'export' && (
        <div className="space-y-6">
          {/* Quick Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Optional Global Export Filter
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Type keyword or search term to export filtered records, or leave empty to export all current records.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter keyword..."
                  value={exportSearch}
                  onChange={(e) => setExportSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-[#C91F28] w-48 sm:w-64"
                />
              </div>
            </div>
          </div>

          {/* Success toast */}
          {exportSuccessMessage && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{exportSuccessMessage}</span>
            </div>
          )}

          {/* Module Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {MODULE_CONFIGS.map((config) => {
              const Icon = config.icon;

              return (
                <div
                  key={config.key}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[#C91F28]">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {config.category}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{config.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[36px] line-clamp-2">
                      {config.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleExecuteExport(config, false)}
                      disabled={isExporting}
                      className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#C91F28] hover:bg-[#a81920] disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export All to .xlsx</span>
                    </button>

                    {exportSearch.trim() && (
                      <button
                        type="button"
                        onClick={() => handleExecuteExport(config, true)}
                        disabled={isExporting}
                        className="w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                      >
                        <Filter className="w-3 h-3 text-[#C91F28]" />
                        <span>Export Filtered "{exportSearch.trim()}"</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
