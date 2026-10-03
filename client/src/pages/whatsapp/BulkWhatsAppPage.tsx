import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Upload,
  FileSpreadsheet,
  Download,
  Send,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye,
  Trash2,
  Sparkles,
  Smartphone,
  RefreshCw,
  Clock,
  ShieldCheck,
  Image as ImageIcon,
  FileText,
  Users,
  Paperclip,
  Link as LinkIcon,
  Loader2,
  Check,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.js';
import { Modal } from '../../components/ui/Modal.js';
import { downloadExcel } from '../../utils/exportHelper.js';

interface RecipientRow {
  Phone: string;
  customerName?: string;
  package?: string;
  travelDate?: string;
  bookingNumber?: string;
  quotationAmount?: string | number;
  dueAmount?: string | number;
  [key: string]: any;
}

const DEFAULT_TEMPLATES = [
  {
    id: 'PROMO',
    title: 'Tour Promotion / Seasonal Offer',
    content:
      'Hello {{customerName}}, greetings from Ooting Holidays! 🌴 We have an exclusive festive offer on our {{package}} package departing {{travelDate}}. Contact us today to unlock a special group discount!',
  },
  {
    id: 'PAYMENT',
    title: 'Pending Balance Reminder',
    content:
      'Dear {{customerName}}, warm greetings from Ooting Holidays! ✈️ This is a gentle reminder regarding the pending balance of ₹{{dueAmount}} for your booking {{bookingNumber}}. Kindly settle before {{travelDate}} to ensure smooth hotel and cab arrangements.',
  },
  {
    id: 'QUOTATION',
    title: 'Quotation Follow-up',
    content:
      'Hi {{customerName}}, thank you for your travel enquiry with Ooting Holidays! 🏔️ We have prepared your itinerary for {{package}} with total fare ₹{{quotationAmount}}. Would you like to customize any sightseeing spots or hotels?',
  },
  {
    id: 'CAB_DUTY',
    title: 'Cab Reporting & Driver Briefing',
    content:
      'Dear {{customerName}}, your Ooting tourist cab for {{package}} is confirmed for pickup on {{travelDate}}. Duty slip and driver contact details have been sent. Please reach out if you need route assistance!',
  },
  {
    id: 'CUSTOM',
    title: 'Custom Message',
    content: 'Hello {{customerName}}, greetings from Ooting Holidays! ',
  },
];

const AVAILABLE_PLACEHOLDERS = [
  '{{customerName}}',
  '{{package}}',
  '{{travelDate}}',
  '{{bookingNumber}}',
  '{{quotationAmount}}',
  '{{dueAmount}}',
];

export const BulkWhatsAppPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('PROMO');
  const [messageTemplate, setMessageTemplate] = useState<string>(DEFAULT_TEMPLATES[0].content);

  // Media Attachment State (Image / PDF Document)
  const [mediaType, setMediaType] = useState<'NONE' | 'IMAGE' | 'DOCUMENT'>('NONE');
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [mediaFilename, setMediaFilename] = useState<string>('');
  const [isUploadingMedia, setIsUploadingMedia] = useState<boolean>(false);
  const [recipientSource, setRecipientSource] = useState<'EXCEL' | 'CRM'>('CRM');
  const [isLoadingCustomers, setIsLoadingCustomers] = useState<boolean>(false);

  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [previews, setPreviews] = useState<any[]>([]);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState<number>(0);

  const [apiStatus, setApiStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendProgress, setSendProgress] = useState<number>(0);
  const [sendResults, setSendResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check WhatsApp configuration status
  useEffect(() => {
    api.get('/whatsapp/config-status').then((res) => {
      setApiStatus(res.data);
    }).catch(console.error);
  }, []);

  // Auto-fetch all CRM customers when recipientSource is CRM and recipients is empty
  useEffect(() => {
    if (recipientSource === 'CRM' && recipients.length === 0) {
      handleLoadCrmCustomers();
    }
  }, [recipientSource]);

  // Update preview when template, recipients, or media changes
  useEffect(() => {
    if (recipients.length > 0) {
      api.post('/whatsapp/preview', {
        template: messageTemplate,
        recipients,
        mediaType,
        mediaUrl,
        mediaFilename,
      }).then((res) => {
        setPreviews(res.data.previews || []);
      }).catch(console.error);
    } else {
      setPreviews([]);
    }
  }, [messageTemplate, recipients, mediaType, mediaUrl, mediaFilename]);

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const tmpl = DEFAULT_TEMPLATES.find((t) => t.id === id);
    if (tmpl) setMessageTemplate(tmpl.content);
  };

  const handleInsertPlaceholder = (placeholder: string) => {
    setMessageTemplate((prev) => prev + ' ' + placeholder);
  };

  // Auto-load all active CRM customers
  const handleLoadCrmCustomers = async () => {
    try {
      setIsLoadingCustomers(true);
      setError(null);
      const res = await api.get('/whatsapp/crm-recipients');
      const list: RecipientRow[] = res.data.recipients || [];
      if (!list || list.length === 0) {
        setError('No active CRM customers with valid phone numbers were found.');
        return;
      }
      setRecipients(list);
      setSelectedPreviewIndex(0);
    } catch (err: any) {
      console.error('Failed to load CRM customers:', err);
      setError('Failed to fetch CRM customers. Please try again.');
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  // Download Sample Excel Template (.xlsx) with Bearer Authentication
  const handleDownloadTemplate = async () => {
    await downloadExcel('/whatsapp/template/excel', 'ooting-whatsapp-template.xlsx');
  };

  // Media File Upload Handler (Image / PDF Document)
  const handleMediaFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingMedia(true);
      setError(null);

      if (mediaType === 'IMAGE') {
        if (!file.type.startsWith('image/')) {
          setError('Please upload a valid image file (JPG, PNG, WebP).');
          return;
        }
        const formData = new FormData();
        formData.append('image', file);
        formData.append('folder', 'whatsapp');
        const res = await api.post('/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMediaUrl(res.data.url);
        setMediaFilename(res.data.filename || file.name);
      } else if (mediaType === 'DOCUMENT') {
        if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
          setError('Please upload a valid PDF document (.pdf).');
          return;
        }
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post('/upload/document', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMediaUrl(res.data.url);
        setMediaFilename(res.data.originalName || file.name);
      }
    } catch (err: any) {
      console.error('Media upload failed:', err);
      setError(err?.response?.data?.message || 'Failed to upload media file.');
    } finally {
      setIsUploadingMedia(false);
      if (mediaFileInputRef.current) mediaFileInputRef.current.value = '';
    }
  };

  // Upload Excel Spreadsheet (.xlsx only)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setError('Please upload a valid Excel spreadsheet (.xlsx or .xls) only.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      if (!rows || rows.length === 0) {
        setError('The selected Excel file contains no data rows.');
        return;
      }

      // Check for phone column
      const validRows: RecipientRow[] = rows.map((r) => ({
        Phone: String(r.Phone || r.phone || r.Mobile || r.mobile || ''),
        customerName: r.customerName || r['Customer Name'] || r.name || 'Valued Guest',
        package: r.package || r.Package || 'Tour Package',
        travelDate: r.travelDate || r['Travel Date'] || '',
        bookingNumber: r.bookingNumber || r['Booking Number'] || '',
        quotationAmount: r.quotationAmount || r['Quotation Amount'] || '',
        dueAmount: r.dueAmount || r['Due Amount'] || '',
      }));

      setRecipients(validRows);
      setSelectedPreviewIndex(0);
    } catch (err: any) {
      console.error('Failed to parse Excel file:', err);
      setError('Failed to parse Excel spreadsheet. Please make sure it is a valid .xlsx file.');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Bulk Send Execution
  const handleBulkSend = async () => {
    if (recipients.length === 0) {
      setError('Please select or load recipients first.');
      return;
    }
    if (!messageTemplate.trim()) {
      setError('Please provide a message template.');
      return;
    }

    try {
      setIsSending(true);
      setSendProgress(20);
      setError(null);

      const res = await api.post('/whatsapp/bulk-send', {
        template: messageTemplate,
        recipients,
        mediaType,
        mediaUrl,
        mediaFilename,
      });

      setSendProgress(100);
      setSendResults(res.data.results || []);
    } catch (err: any) {
      console.error('Bulk send error:', err);
      setError(err.response?.data?.message || 'Failed to dispatch bulk WhatsApp messages.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            Automated & Bulk WhatsApp Messaging
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Broadcast personalized tour offers, departure alerts, and payment reminders via Excel list.
          </p>
        </div>

        {/* API Gateway Status Badge */}
        {apiStatus && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Gateway:</span>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-bold border flex items-center gap-1.5 ${
                apiStatus.ready
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800'
                  : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${apiStatus.ready ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              {apiStatus.activeGateway} ({apiStatus.ready ? 'Connected' : 'wa.me Fallback Ready'})
            </span>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center justify-between text-xs text-rose-700 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold underline text-[11px]">
            Dismiss
          </button>
        </div>
      )}

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Template Selection & Message Composer (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Preset Template Selector */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-600" />
              1. Select Message Template
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEFAULT_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleSelectTemplate(tmpl.id)}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                    selectedTemplateId === tmpl.id
                      ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/40 text-brand-900 dark:text-brand-100 font-semibold'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {tmpl.title}
                </button>
              ))}
            </div>
          </div>

          {/* Message Composer & Placeholder Tags */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                2. Compose Message & Insert Tags
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">
                {messageTemplate.length} chars
              </span>
            </div>

            {/* Clickable Placeholders */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Click to Insert Placeholder Variables:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_PLACEHOLDERS.map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => handleInsertPlaceholder(ph)}
                    className="px-2 py-0.5 text-[11px] font-mono bg-slate-100 dark:bg-slate-700 hover:bg-brand-50 dark:hover:bg-brand-950 hover:text-brand-600 dark:hover:text-brand-400 border border-slate-200 dark:border-slate-600 rounded-md transition-colors"
                  >
                    + {ph}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <textarea
              rows={6}
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              placeholder="Type your WhatsApp message template here..."
              className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 leading-relaxed font-sans"
            />
          </div>

          {/* Media Attachment (Image or PDF Document) */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-brand-600" />
                3. Attach Media (Image or PDF Document)
              </h2>
              {mediaType !== 'NONE' && (
                <button
                  type="button"
                  onClick={() => {
                    setMediaType('NONE');
                    setMediaUrl('');
                    setMediaFilename('');
                  }}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold"
                >
                  Remove Attachment
                </button>
              )}
            </div>

            {/* Type selector buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMediaType('NONE');
                  setMediaUrl('');
                  setMediaFilename('');
                }}
                className={`p-2 rounded-xl border text-center text-xs font-medium transition-all ${
                  mediaType === 'NONE'
                    ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/40 text-brand-900 dark:text-brand-100 font-semibold shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                Text Only (No Media)
              </button>

              <button
                type="button"
                onClick={() => setMediaType('IMAGE')}
                className={`p-2 rounded-xl border text-center text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                  mediaType === 'IMAGE'
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-semibold shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                Image (Photo / Flyer)
              </button>

              <button
                type="button"
                onClick={() => setMediaType('DOCUMENT')}
                className={`p-2 rounded-xl border text-center text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                  mediaType === 'DOCUMENT'
                    ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100 font-semibold shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <FileText className="w-4 h-4 text-indigo-600" />
                PDF Document (Itinerary)
              </button>
            </div>

            {/* Media upload controls */}
            {mediaType !== 'NONE' && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <input
                  type="file"
                  ref={mediaFileInputRef}
                  onChange={handleMediaFileUpload}
                  accept={mediaType === 'IMAGE' ? 'image/jpeg,image/png,image/webp' : '.pdf,application/pdf'}
                  className="hidden"
                />

                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <button
                    type="button"
                    onClick={() => mediaFileInputRef.current?.click()}
                    disabled={isUploadingMedia}
                    className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {isUploadingMedia ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>
                      {isUploadingMedia
                        ? 'Uploading...'
                        : mediaType === 'IMAGE'
                        ? 'Upload Image File'
                        : 'Upload PDF Document'}
                    </span>
                  </button>

                  <span className="text-[11px] text-slate-400">or paste direct media URL below</span>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <LinkIcon className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder={
                      mediaType === 'IMAGE'
                        ? 'https://example.com/tour-poster.jpg'
                        : 'https://example.com/itinerary.pdf'
                    }
                    className="w-full pl-8 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                {/* Media Active Banner */}
                {mediaUrl && (
                  <div className="p-2.5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-100">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {mediaType === 'IMAGE' ? (
                        <img
                          src={mediaUrl}
                          alt="preview"
                          className="w-10 h-10 object-cover rounded-lg border border-emerald-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center font-bold text-[10px]">
                          PDF
                        </div>
                      )}
                      <div className="truncate">
                        <span className="font-semibold block truncate">
                          {mediaFilename || (mediaType === 'IMAGE' ? 'Image Attached' : 'PDF Document Attached')}
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block truncate font-mono">
                          {mediaUrl}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setMediaUrl('');
                        setMediaFilename('');
                      }}
                      className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded text-rose-600 shrink-0 ml-2"
                      title="Clear file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recipient Source: Auto CRM Customers or Excel Upload */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                4. Select Recipients (Auto CRM or Excel)
              </h2>

              {recipientSource === 'EXCEL' && (
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Sample Excel</span>
                </button>
              )}
            </div>

            {/* Source switch pills */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setRecipientSource('CRM');
                  handleLoadCrmCustomers();
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  recipientSource === 'CRM'
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Auto-Load All CRM Customers</span>
              </button>

              <button
                type="button"
                onClick={() => setRecipientSource('EXCEL')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  recipientSource === 'EXCEL'
                    ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/40 text-brand-900 dark:text-brand-100 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-brand-600" />
                <span>Upload Custom Excel (.xlsx)</span>
              </button>
            </div>

            {/* If CRM mode */}
            {recipientSource === 'CRM' && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {isLoadingCustomers ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                      {isLoadingCustomers
                        ? 'Fetching all CRM customers...'
                        : `${recipients.length} Active CRM Customers Loaded`}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Synchronized directly from your CRM customer registry.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLoadCrmCustomers}
                  disabled={isLoadingCustomers}
                  className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 rounded-lg flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingCustomers ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            )}

            {/* If EXCEL mode */}
            {recipientSource === 'EXCEL' && (
              <div className="space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".xlsx, .xls"
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 p-6 rounded-xl text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/30"
                >
                  <Upload className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    Click to upload Excel spreadsheet (.xlsx / .xls)
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Must include a 'Phone' column, and optional 'customerName', 'package', 'travelDate'
                  </span>
                </div>

                {recipients.length > 0 && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="font-semibold text-emerald-900 dark:text-emerald-100">
                        {recipients.length} recipients loaded from Excel.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRecipients([])}
                      className="text-rose-600 hover:text-rose-700 font-semibold"
                    >
                      Clear List
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Phone Mockup & Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Live Mobile Device Preview */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-brand-600" />
              Live WhatsApp Chat Mockup
            </h2>

            {/* Phone Screen Mockup */}
            <div className="bg-[#0b141a] text-white rounded-3xl p-4 shadow-xl border-4 border-slate-800 relative overflow-hidden">
              {/* WhatsApp Header */}
              <div className="flex items-center gap-2.5 pb-3 border-b border-white/10 mb-3">
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs text-white">
                  {previews[selectedPreviewIndex]?.customerName?.charAt(0) || 'G'}
                </div>
                <div>
                  <span className="font-bold text-xs block text-slate-100">
                    {previews[selectedPreviewIndex]?.customerName || 'Customer'}
                  </span>
                  <span className="text-[10px] text-emerald-400 block font-mono">
                    {previews[selectedPreviewIndex]?.phone || '+91 9876543210'}
                  </span>
                </div>
              </div>

              {/* Chat Bubble Area */}
              <div className="space-y-3 min-h-[220px] flex flex-col justify-end bg-[#0b141a]">
                <div className="bg-[#005c4b] text-white p-2.5 rounded-2xl rounded-tr-xs text-xs max-w-[92%] ml-auto shadow-md space-y-2">
                  {/* Media attachment render in chat bubble */}
                  {mediaType === 'IMAGE' && mediaUrl && (
                    <div className="rounded-xl overflow-hidden bg-black/20 border border-white/10 max-h-48 flex items-center justify-center">
                      <img
                        src={mediaUrl}
                        alt="attachment"
                        className="w-full h-auto max-h-48 object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {mediaType === 'DOCUMENT' && mediaUrl && (
                    <div className="p-2.5 bg-black/25 rounded-xl border border-white/10 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 shadow-sm">
                        PDF
                      </div>
                      <div className="overflow-hidden truncate flex-1">
                        <span className="font-semibold text-[11px] block truncate text-slate-100">
                          {mediaFilename || 'Itinerary_Details.pdf'}
                        </span>
                        <span className="text-[9px] text-emerald-300 block uppercase font-mono">
                          PDF • Document
                        </span>
                      </div>
                    </div>
                  )}

                  <p className="whitespace-pre-wrap leading-relaxed px-1">
                    {previews[selectedPreviewIndex]?.message ||
                      'Hello Customer, your customized message preview will appear here once recipients are loaded.'}
                  </p>
                  <div className="text-[9px] text-white/60 text-right pr-1">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
                  </div>
                </div>
              </div>
            </div>

            {/* Recipient Selector for preview */}
            {previews.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Preview recipient ({selectedPreviewIndex + 1} of {previews.length}):
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedPreviewIndex}
                    onChange={(e) => setSelectedPreviewIndex(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    {previews.map((p, idx) => (
                      <option key={idx} value={idx}>
                        {p.customerName} ({p.phone})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <button
              type="button"
              onClick={handleBulkSend}
              disabled={isSending || recipients.length === 0}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>
                {isSending
                  ? 'Broadcasting WhatsApp Messages...'
                  : `Dispatch to ${recipients.length} Recipients ${
                      mediaType === 'IMAGE'
                        ? '(with Image)'
                        : mediaType === 'DOCUMENT'
                        ? '(with PDF Document)'
                        : ''
                    }`}
              </span>
            </button>

            {isSending && (
              <div className="space-y-1">
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2 transition-all duration-300"
                    style={{ width: `${sendProgress}%` }}
                  ></div>
                </div>
                <span className="text-[10px] text-slate-400 text-center block">
                  Processing broadcast queue...
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Send Results Modal */}
      {sendResults && (
        <Modal
          isOpen={!!sendResults}
          onClose={() => setSendResults(null)}
          title="WhatsApp Broadcast Results"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 font-medium">
              Broadcast completed! Below is the delivery status for each recipient. If an official Cloud API
              credential is not configured, you can click "Open WhatsApp" to send via direct Web WhatsApp.
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
              {sendResults.map((res, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                      {res.customerName || 'Customer'} ({res.phone})
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Status: {res.status} • Provider: {res.provider || 'wa.me'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {res.success ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Sent
                      </span>
                    ) : (
                      <span className="text-amber-600 font-bold flex items-center gap-1">
                        Fallback Ready
                      </span>
                    )}

                    {res.webUrl && (
                      <a
                        href={res.webUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                      >
                        <span>Open WhatsApp</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setSendResults(null)}
                className="px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
