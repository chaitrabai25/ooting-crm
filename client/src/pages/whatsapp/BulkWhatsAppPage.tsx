import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Play,
  Pause,
  Square,
  SkipForward,
  Settings as SettingsIcon,
  Zap,
  Search,
  CheckSquare,
  Square as SquareBox,
  CheckCheck,
  ArrowRight,
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
  customerId?: string;
  [key: string]: any;
}

const DEFAULT_TEMPLATES = [
  {
    id: 'PROMO',
    title: 'Tour Promotion / Festive Offer',
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

const interpolateClientTemplate = (template: string, item: Record<string, any>): string => {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return item[key] !== undefined && item[key] !== null ? String(item[key]) : `{{${key}}}`;
  });
};

const sanitizePhoneNumber = (raw: string): string => {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 10) digits = '91' + digits;
  return digits;
};

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
  const [recipientSource, setRecipientSource] = useState<'CRM' | 'EXCEL'>('CRM');
  const [isLoadingCustomers, setIsLoadingCustomers] = useState<boolean>(false);

  // Delivery Mode: Defaults to CLOUD_API for 100% automated server dispatch from +91 8884845595
  const [delaySeconds, setDelaySeconds] = useState<number>(2);
  const [dispatchMode, setDispatchMode] = useState<'CLOUD_API' | 'WEB_AUTOMATOR'>('CLOUD_API');
  const [sendingSinglePhone, setSendingSinglePhone] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);

  // Automated Broadcast Execution State
  const [isAutoBroadcasting, setIsAutoBroadcasting] = useState<boolean>(false);
  const [isAutoPaused, setIsAutoPaused] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [currentBroadcastIndex, setCurrentBroadcastIndex] = useState<number>(0);
  const [dispatchedHistory, setDispatchedHistory] = useState<
    Array<{
      phone: string;
      name: string;
      status: 'SENT' | 'FAILED' | 'DISPATCHED';
      time: string;
      externalId?: string;
      error?: string;
    }>
  >([]);

  // Gateway Settings Modal State
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [configToken, setConfigToken] = useState<string>('');
  const [configPhoneId, setConfigPhoneId] = useState<string>('');
  const [configBusinessNum, setConfigBusinessNum] = useState<string>('8884845595');
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [isTestingConfig, setIsTestingConfig] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any>(null);

  const isPausedRef = useRef<boolean>(false);
  const isStoppedRef = useRef<boolean>(false);
  const timerIntervalRef = useRef<any>(null);

  // Recipients and Client Selection State
  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [previews, setPreviews] = useState<any[]>([]);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState<number>(0);

  const [apiStatus, setApiStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check WhatsApp configuration status on mount
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

  // Auto-load all active CRM customers and select all by default
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
      setSelectedIndices(new Set(list.map((_, i) => i)));
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

  // Helper to extract values by flexible keyword matching across Excel columns
  const findColumnValue = (row: any, keywords: string[]): any => {
    const keys = Object.keys(row);
    // 1. Exact or alphanumeric match
    for (const kw of keywords) {
      const match = keys.find(
        (k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === kw.toLowerCase().replace(/[^a-z0-9]/g, '')
      );
      if (match && row[match] !== undefined && row[match] !== null && String(row[match]).trim() !== '') {
        return row[match];
      }
    }
    // 2. Substring match
    for (const kw of keywords) {
      const match = keys.find((k) =>
        k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(kw.toLowerCase().replace(/[^a-z0-9]/g, ''))
      );
      if (match && row[match] !== undefined && row[match] !== null && String(row[match]).trim() !== '') {
        return row[match];
      }
    }
    return undefined;
  };

  // Upload Excel Spreadsheet (.xlsx, .xls, .csv) with smart header detection
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('Please upload a valid Excel spreadsheet (.xlsx, .xls) or .csv file.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setUploadSuccessMessage(null);
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      let rows: any[] = [];
      for (const name of workbook.SheetNames) {
        const s = workbook.Sheets[name];
        const r: any[] = XLSX.utils.sheet_to_json(s);
        if (r && r.length > 0) {
          rows = r;
          break;
        }
      }

      if (!rows || rows.length === 0) {
        setError('The selected spreadsheet contains no data rows.');
        return;
      }

      const validRows: RecipientRow[] = [];
      rows.forEach((r, idx) => {
        const rawPhoneVal = findColumnValue(r, [
          'phone', 'mobile', 'whatsapp', 'contact', 'cell', 'tel',
          'phonenumber', 'mobilenumber', 'contactnumber', 'whatsappnumber', 'number', 'recipient'
        ]);

        let rawPhoneStr = String(rawPhoneVal || '').trim().replace(/\.0+$/, '');
        let cleanDigits = rawPhoneStr.replace(/\D/g, '');
        if (cleanDigits.length === 10) cleanDigits = '91' + cleanDigits;

        if (cleanDigits.length >= 10) {
          const nameVal = findColumnValue(r, ['name', 'customername', 'clientname', 'fullname', 'customer', 'client', 'guest', 'passenger', 'lead', 'party']) || `Guest ${idx + 1}`;
          const pkgVal = findColumnValue(r, ['package', 'packagename', 'tour', 'tourpackage', 'itinerary', 'trip', 'destination']) || 'Tour Package';
          const dateVal = findColumnValue(r, ['traveldate', 'date', 'departuredate', 'tourdate', 'startdate']) || '';
          const bNumVal = findColumnValue(r, ['bookingnumber', 'bookingno', 'bookingid', 'refno', 'reference']) || '';
          const quotVal = findColumnValue(r, ['quotationamount', 'quotation', 'totalamount', 'totalfare', 'fare', 'amount', 'price']) || '';
          const dueVal = findColumnValue(r, ['dueamount', 'balance', 'balanceamount', 'pendingamount', 'due']) || '0';

          validRows.push({
            Phone: cleanDigits,
            customerName: String(nameVal),
            package: String(pkgVal),
            travelDate: String(dateVal),
            bookingNumber: String(bNumVal),
            quotationAmount: String(quotVal),
            dueAmount: String(dueVal),
          });
        }
      });

      if (validRows.length === 0) {
        setError('No valid phone numbers found in the uploaded file. Please make sure your sheet has a "Phone" or "Mobile" column with 10-digit numbers.');
        return;
      }

      setRecipientSource('EXCEL');
      setUploadedFileName(file.name);
      setRecipients(validRows);
      setSelectedIndices(new Set(validRows.map((_, i) => i)));
      setSelectedPreviewIndex(0);
      setUploadSuccessMessage(`Successfully imported ${validRows.length} contacts from "${file.name}". All selected for automated broadcast.`);
    } catch (err: any) {
      console.error('Failed to parse spreadsheet:', err);
      setError('Failed to parse spreadsheet. Please make sure it is a valid .xlsx or .xls file.');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Recipient Search & Filtering Logic
  const filteredRecipients = useMemo(() => {
    return recipients
      .map((r, originalIndex) => ({ r, originalIndex }))
      .filter(({ r }) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        const name = (r.customerName || r.name || '').toLowerCase();
        const phone = (r.Phone || r.phone || '').toLowerCase();
        const pkg = (r.package || '').toLowerCase();
        const bNum = (r.bookingNumber || '').toLowerCase();
        return name.includes(q) || phone.includes(q) || pkg.includes(q) || bNum.includes(q);
      });
  }, [recipients, searchTerm]);

  // Selected Target Recipients list
  const targetRecipients = useMemo(() => {
    return recipients
      .map((r, originalIndex) => ({ r, originalIndex }))
      .filter(({ originalIndex }) => selectedIndices.has(originalIndex))
      .map(({ r }) => r);
  }, [recipients, selectedIndices]);

  // Master Checkbox State calculation
  const isAllFilteredSelected = useMemo(() => {
    if (filteredRecipients.length === 0) return false;
    return filteredRecipients.every(({ originalIndex }) => selectedIndices.has(originalIndex));
  }, [filteredRecipients, selectedIndices]);

  const handleToggleSelectAll = () => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (isAllFilteredSelected) {
        filteredRecipients.forEach(({ originalIndex }) => next.delete(originalIndex));
      } else {
        filteredRecipients.forEach(({ originalIndex }) => next.add(originalIndex));
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIndices(new Set(recipients.map((_, i) => i)));
  };

  const handleDeselectAll = () => {
    setSelectedIndices(new Set());
  };

  const handleToggleRecipient = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Quick Send directly to a single recipient via Server Gateway (+91 8884845595)
  const handleQuickSend = async (recipient: RecipientRow) => {
    const rawPhone = recipient.Phone || recipient.phone || '';
    const cleanPhone = sanitizePhoneNumber(rawPhone);
    const personalizedMsg = interpolateClientTemplate(messageTemplate, recipient);
    let fullMsg = personalizedMsg;
    if (mediaUrl) {
      const mediaLabel = mediaType === 'IMAGE' ? '🖼️ Offer Poster' : '📄 Tour Itinerary';
      fullMsg = `${personalizedMsg}\n\n${mediaLabel}: ${mediaUrl}`;
    }

    try {
      setSendingSinglePhone(cleanPhone);
      const res = await api.post('/whatsapp/send', {
        phone: cleanPhone,
        message: fullMsg,
        customerId: recipient.customerId,
        mediaType,
        mediaUrl,
        mediaFilename,
      });

      if (res.data?.status === 'SENT' || res.data?.success) {
        setDispatchedHistory((prev) => [
          {
            phone: cleanPhone,
            name: recipient.customerName || 'Customer',
            status: 'SENT',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            externalId: res.data?.externalId,
          },
          ...prev,
        ]);
      } else {
        setDispatchedHistory((prev) => [
          {
            phone: cleanPhone,
            name: recipient.customerName || 'Customer',
            status: 'FAILED',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            error: res.data?.error || 'Gateway dispatch failed',
          },
          ...prev,
        ]);
      }
    } catch (err: any) {
      setDispatchedHistory((prev) => [
        {
          phone: cleanPhone,
          name: recipient.customerName || 'Customer',
          status: 'FAILED',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          error: err?.response?.data?.message || err.message || 'Dispatch error',
        },
        ...prev,
      ]);
    } finally {
      setSendingSinglePhone(null);
    }
  };

  // Dispatches recipient automatically via Server Gateway in the broadcast loop
  const dispatchRecipient = async (index: number) => {
    if (isStoppedRef.current || index >= targetRecipients.length) {
      setIsCompleted(true);
      setIsAutoBroadcasting(false);
      return;
    }

    if (isPausedRef.current) {
      return;
    }

    const recipient = targetRecipients[index];
    const rawPhone = recipient.Phone || recipient.phone || '';
    const cleanPhone = sanitizePhoneNumber(rawPhone);
    const personalizedMsg = interpolateClientTemplate(messageTemplate, recipient);

    let fullMsg = personalizedMsg;
    if (mediaUrl) {
      const mediaLabel = mediaType === 'IMAGE' ? '🖼️ Offer Poster' : '📄 Tour Itinerary';
      fullMsg = `${personalizedMsg}\n\n${mediaLabel}: ${mediaUrl}`;
    }

    try {
      const res = await api.post('/whatsapp/send', {
        phone: cleanPhone,
        message: fullMsg,
        customerId: recipient.customerId,
        mediaType,
        mediaUrl,
        mediaFilename,
      });

      if (res.data?.status === 'SENT' || res.data?.success) {
        setDispatchedHistory((prev) => [
          {
            phone: cleanPhone,
            name: recipient.customerName || 'Customer',
            status: 'SENT',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            externalId: res.data?.externalId,
          },
          ...prev,
        ]);
      } else {
        setDispatchedHistory((prev) => [
          {
            phone: cleanPhone,
            name: recipient.customerName || 'Customer',
            status: 'FAILED',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            error: res.data?.error || 'Gateway dispatch failed',
          },
          ...prev,
        ]);
      }
    } catch (err: any) {
      setDispatchedHistory((prev) => [
        {
          phone: cleanPhone,
          name: recipient.customerName || 'Customer',
          status: 'FAILED',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          error: err?.response?.data?.message || err.message || 'Dispatch error',
        },
        ...prev,
      ]);
    }

    // Automatically proceed to next contact after pacing delay
    if (index < targetRecipients.length - 1 && !isStoppedRef.current) {
      const nextIndex = index + 1;
      setCurrentBroadcastIndex(nextIndex);

      const sleepTime = Math.max(1000, delaySeconds * 1000);
      await new Promise((resolve) => setTimeout(resolve, sleepTime));

      if (!isStoppedRef.current && !isPausedRef.current) {
        dispatchRecipient(nextIndex);
      }
    } else {
      setIsCompleted(true);
      setIsAutoBroadcasting(false);
    }
  };

  // Launch Automated Broadcast
  const handleStartBroadcast = () => {
    if (targetRecipients.length === 0) {
      setError('Please select at least 1 client using the checkboxes below before starting broadcast.');
      return;
    }
    if (!messageTemplate.trim()) {
      setError('Please provide a message template.');
      return;
    }

    setError(null);
    setIsAutoBroadcasting(true);
    setIsAutoPaused(false);
    setIsCompleted(false);
    setCurrentBroadcastIndex(0);
    setDispatchedHistory([]);
    isPausedRef.current = false;
    isStoppedRef.current = false;

    // Start with first contact immediately
    dispatchRecipient(0);
  };

  const handleTogglePause = () => {
    const nextPaused = !isPausedRef.current;
    isPausedRef.current = nextPaused;
    setIsAutoPaused(nextPaused);
    if (!nextPaused && !isCompleted && !isStoppedRef.current) {
      dispatchRecipient(currentBroadcastIndex);
    }
  };

  const handleStopBroadcast = () => {
    isStoppedRef.current = true;
    setIsAutoPaused(false);
    setIsCompleted(true);
    setIsAutoBroadcasting(false);
  };

  const handleExportBroadcastReport = () => {
    if (dispatchedHistory.length === 0) return;
    const exportRows = dispatchedHistory.map((h, i) => ({
      'S.No': i + 1,
      'Customer Name': h.name,
      'Phone Number': h.phone,
      'Status': h.status,
      'Timestamp': h.time,
      'Error / Notes': h.error || 'Dispatched via connected WhatsApp number (+91 8884845595)',
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BroadcastLog');
    XLSX.writeFile(wb, `WhatsApp_Broadcast_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Gateway Config Handlers
  const handleOpenConfig = () => {
    setConfigToken(apiStatus?.token || '');
    setConfigPhoneId(apiStatus?.phoneNumberId || '1282151328312026');
    setConfigBusinessNum(apiStatus?.businessNumber || '8884845595');
    setTestResult(null);
    setIsConfigOpen(true);
  };

  const handleTestGatewayConnection = async () => {
    try {
      setIsTestingConfig(true);
      setTestResult(null);
      const res = await api.post('/whatsapp/test-connection', {
        token: configToken.trim() || undefined,
        phoneNumberId: configPhoneId.trim() || undefined,
        businessNumber: configBusinessNum.trim() || undefined,
      });
      setTestResult(res.data);
    } catch (err: any) {
      setTestResult({
        success: false,
        status: 'ERROR',
        message: err.response?.data?.message || err.message || 'Connection test failed',
      });
    } finally {
      setIsTestingConfig(false);
    }
  };

  const handleSaveGatewayConfig = async () => {
    try {
      setIsSavingConfig(true);
      setError(null);
      const res = await api.post('/whatsapp/config', {
        token: configToken.trim() || undefined,
        phoneNumberId: configPhoneId.trim() || undefined,
        businessNumber: configBusinessNum.trim() || undefined,
      });
      setApiStatus(res.data.status);
      setIsConfigOpen(false);
    } catch (err: any) {
      console.error('Failed to save gateway config:', err);
      setError(err.response?.data?.message || 'Failed to update WhatsApp gateway settings.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const currentRecipient = targetRecipients[currentBroadcastIndex];

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header Banner & Connected Sender Information */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            Automated & Bulk WhatsApp Messaging
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Broadcast personalized tour offers, departure alerts, and payment reminders via Excel or CRM list.
          </p>
        </div>

        {/* Sender Number & Active Gateway Badge */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3 py-1.5 rounded-xl border bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200 flex items-center gap-2 text-xs font-semibold shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Connected Sender: <strong>+91 {apiStatus?.businessNumber || '8884845595'}</strong></span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100 font-bold">
              {apiStatus?.verifiedName || 'Ooting'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleOpenConfig}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <SettingsIcon className="w-3.5 h-3.5 text-brand-600" />
            <span>Gateway Setup</span>
          </button>
        </div>
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center justify-between text-xs text-rose-700 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold underline text-[11px] cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Main 2-Column Responsive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Form Steps & Client Selection Checklist (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* STEP 1: Recipient Source & Client Selection Checklist */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                Step 1: Select Clients for WhatsApp Broadcast
              </h2>

              {recipientSource === 'EXCEL' && (
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Sample Excel (.xlsx)</span>
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
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  recipientSource === 'CRM'
                    ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-100 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Active CRM Customers ({recipients.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setRecipientSource('EXCEL')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  recipientSource === 'EXCEL'
                    ? 'border-brand-500 bg-brand-50/70 dark:bg-brand-950/50 text-brand-900 dark:text-brand-100 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-brand-600" />
                <span>Upload Custom Excel (.xlsx)</span>
              </button>
            </div>

            {/* Excel Upload Zone */}
            {recipientSource === 'EXCEL' && (
              <div className="space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 p-4 rounded-xl text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/30"
                >
                  <Upload className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    Click to browse and upload Excel spreadsheet (.xlsx / .xls / .csv)
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Recognizes 'Phone' / 'Mobile' / 'WhatsApp' columns, and optional 'Name', 'Package', 'Travel Date'
                  </span>
                </div>

                {uploadSuccessMessage && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{uploadSuccessMessage}</span>
                    </div>
                    <button onClick={() => setUploadSuccessMessage(null)} className="font-bold underline text-[11px] cursor-pointer">
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Client Selection Checklist Toolbar: Search + Select All + Count */}
            {recipients.length > 0 && (
              <div className="space-y-2.5 pt-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  {/* Search Filter Box */}
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <Search className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Filter clients by name, phone number, or package..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Selection Actions & Pill Counter */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Select All ({recipients.length})
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Deselect All
                    </button>
                    <span className="text-[11px] font-mono font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg border border-emerald-300 dark:border-emerald-800">
                      {selectedIndices.size} of {recipients.length} Selected
                    </span>
                  </div>
                </div>

                {/* Recipient Interactive Selection Table */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xs">
                  <div className="bg-slate-100/80 dark:bg-slate-800/80 px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isAllFilteredSelected}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                        title="Toggle all in this view"
                      />
                      <span>Client Details</span>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <span className="hidden sm:inline">Package / Due</span>
                      <span>Direct Send</span>
                    </div>
                  </div>

                  {/* Recipient Scrollable Row List */}
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {filteredRecipients.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No clients match "{searchTerm}". Try a different search.
                      </div>
                    ) : (
                      filteredRecipients.map(({ r, originalIndex }) => {
                        const isSelected = selectedIndices.has(originalIndex);
                        const isPreviewActive = selectedPreviewIndex === originalIndex;
                        const due = Number(r.dueAmount || 0);

                        return (
                          <div
                            key={originalIndex}
                            className={`px-3 py-2 flex items-center justify-between text-xs transition-colors ${
                              isSelected
                                ? 'bg-emerald-50/40 dark:bg-emerald-950/20'
                                : 'opacity-65 hover:opacity-100'
                            } ${isPreviewActive ? 'ring-1 ring-emerald-500/50 bg-emerald-50/70 dark:bg-emerald-950/40' : ''}`}
                          >
                            {/* Checkbox & Client Info */}
                            <div className="flex items-center gap-2.5 overflow-hidden pr-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleRecipient(originalIndex)}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600 shrink-0"
                              />
                              <div
                                onClick={() => setSelectedPreviewIndex(originalIndex)}
                                className="cursor-pointer truncate"
                              >
                                <span className="font-semibold text-slate-900 dark:text-slate-100 block truncate">
                                  {r.customerName || 'Customer'}
                                </span>
                                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block truncate">
                                  {r.Phone || r.phone} {r.bookingNumber ? `• ${r.bookingNumber}` : ''}
                                </span>
                              </div>
                            </div>

                            {/* Tour / Balance Details & Action Buttons */}
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right hidden sm:block">
                                <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium block truncate max-w-[130px]">
                                  {r.package || 'Tour Package'}
                                </span>
                                {due > 0 ? (
                                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                                    Due: ₹{due}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                    Paid
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedPreviewIndex(originalIndex)}
                                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-emerald-600 rounded-lg transition-colors cursor-pointer"
                                  title="Preview chat on mobile screen"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleQuickSend(r)}
                                  disabled={sendingSinglePhone === sanitizePhoneNumber(r.Phone || r.phone || '')}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                  title="Send automatically via connected number +91 8884845595"
                                >
                                  {sendingSinglePhone === sanitizePhoneNumber(r.Phone || r.phone || '') ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      <span>Sending...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Send className="w-3 h-3" />
                                      <span>Send</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: Message Template & Dynamic Tags */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-600" />
              Step 2: Message Template & Dynamic Personalization Tags
            </h2>

            {/* Template Selector Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {DEFAULT_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleSelectTemplate(tmpl.id)}
                  className={`p-2 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    selectedTemplateId === tmpl.id
                      ? 'border-brand-500 bg-brand-50/70 dark:bg-brand-950/40 text-brand-900 dark:text-brand-100 font-semibold shadow-2xs'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="block truncate">{tmpl.title}</span>
                </button>
              ))}
            </div>

            {/* Clickable Variable Tags */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Click to Insert Dynamic Placeholders:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_PLACEHOLDERS.map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => handleInsertPlaceholder(ph)}
                    className="px-2 py-0.5 text-[11px] font-mono bg-slate-100 dark:bg-slate-700 hover:bg-brand-50 dark:hover:bg-brand-950 hover:text-brand-600 dark:hover:text-brand-400 border border-slate-200 dark:border-slate-600 rounded-md transition-colors cursor-pointer"
                  >
                    + {ph}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Textarea */}
            <div className="relative">
              <textarea
                rows={5}
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                placeholder="Type your WhatsApp message template here..."
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 leading-relaxed font-sans"
              />
              <span className="absolute bottom-2.5 right-3 text-[10px] text-slate-400 font-mono">
                {messageTemplate.length} chars
              </span>
            </div>
          </div>

          {/* STEP 3: Media Attachment (Poster Image or PDF Itinerary) */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-brand-600" />
                Step 3: Attach Media (Offer Poster or PDF Itinerary)
              </h2>
              {mediaType !== 'NONE' && (
                <button
                  type="button"
                  onClick={() => {
                    setMediaType('NONE');
                    setMediaUrl('');
                    setMediaFilename('');
                  }}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                >
                  Remove Attachment
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMediaType('NONE');
                  setMediaUrl('');
                  setMediaFilename('');
                }}
                className={`p-2 rounded-xl border text-center text-xs font-medium transition-all cursor-pointer ${
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
                className={`p-2 rounded-xl border text-center text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mediaType === 'IMAGE'
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-semibold shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                Image Poster
              </button>

              <button
                type="button"
                onClick={() => setMediaType('DOCUMENT')}
                className={`p-2 rounded-xl border text-center text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mediaType === 'DOCUMENT'
                    ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100 font-semibold shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <FileText className="w-4 h-4 text-indigo-600" />
                PDF Itinerary
              </button>
            </div>

            {mediaType !== 'NONE' && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
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
                    className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isUploadingMedia ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span>
                      {isUploadingMedia
                        ? 'Uploading...'
                        : mediaType === 'IMAGE'
                        ? 'Upload Offer Poster'
                        : 'Upload PDF Itinerary'}
                    </span>
                  </button>
                  <span className="text-[11px] text-slate-400">or paste direct media URL</span>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <LinkIcon className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder={mediaType === 'IMAGE' ? 'https://example.com/poster.jpg' : 'https://example.com/itinerary.pdf'}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                {mediaUrl && (
                  <div className="p-2.5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-100">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {mediaType === 'IMAGE' ? (
                        <img src={mediaUrl} alt="preview" className="w-9 h-9 object-cover rounded-lg border border-emerald-200" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center font-bold text-[10px]">
                          PDF
                        </div>
                      )}
                      <div className="truncate">
                        <span className="font-semibold block truncate">
                          {mediaFilename || (mediaType === 'IMAGE' ? 'Offer Poster Attached' : 'PDF Itinerary Attached')}
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
                      className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded text-rose-600 shrink-0 ml-2 cursor-pointer"
                      title="Clear attachment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Chat Mockup & Dispatch Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Live Mobile Device Preview */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-brand-600" />
              Live WhatsApp Chat Mockup
            </h2>

            {/* Mobile Screen Mockup */}
            <div className="bg-[#0b141a] text-white rounded-3xl p-4 shadow-xl border-4 border-slate-800 relative overflow-hidden">
              {/* WhatsApp Header */}
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-white/10 mb-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs text-white">
                  {previews[selectedPreviewIndex]?.customerName?.charAt(0) || 'G'}
                </div>
                <div>
                  <span className="font-bold text-xs block text-slate-100">
                    {previews[selectedPreviewIndex]?.customerName || 'Customer'}
                  </span>
                  <span className="text-[10px] text-emerald-400 block font-mono">
                    {previews[selectedPreviewIndex]?.phone || '+91 8884845595'}
                  </span>
                </div>
              </div>

              {/* Chat Bubble Area */}
              <div className="space-y-2.5 min-h-[200px] flex flex-col justify-end bg-[#0b141a]">
                <div className="bg-[#005c4b] text-white p-2.5 rounded-2xl rounded-tr-xs text-xs max-w-[92%] ml-auto shadow-md space-y-2">
                  {mediaType === 'IMAGE' && mediaUrl && (
                    <div className="rounded-xl overflow-hidden bg-black/20 border border-white/10 max-h-40 flex items-center justify-center">
                      <img src={mediaUrl} alt="attachment" className="w-full h-auto max-h-40 object-cover" />
                    </div>
                  )}

                  {mediaType === 'DOCUMENT' && mediaUrl && (
                    <div className="p-2 bg-black/25 rounded-xl border border-white/10 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-[9px] shrink-0">
                        PDF
                      </div>
                      <div className="overflow-hidden truncate flex-1">
                        <span className="font-semibold text-[10px] block truncate text-slate-100">
                          {mediaFilename || 'Itinerary_Details.pdf'}
                        </span>
                        <span className="text-[8px] text-emerald-300 block uppercase font-mono">
                          PDF • Document
                        </span>
                      </div>
                    </div>
                  )}

                  <p className="whitespace-pre-wrap leading-relaxed px-1">
                    {previews[selectedPreviewIndex]?.message ||
                      'Hello Customer, your customized message preview will appear here once recipients are loaded.'}
                  </p>
                  <div className="text-[9px] text-white/60 text-right pr-1 flex items-center justify-end gap-1">
                    <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Recipient Selector for preview */}
            {previews.length > 0 && (
              <div className="space-y-1 pt-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Previewing Client ({selectedPreviewIndex + 1} of {previews.length}):
                </span>
                <select
                  value={selectedPreviewIndex}
                  onChange={(e) => setSelectedPreviewIndex(parseInt(e.target.value, 10))}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  {previews.map((p, idx) => (
                    <option key={idx} value={idx}>
                      {p.customerName} ({p.phone})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* STEP 4: Dispatch Controls & Broadcast Launcher */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-600" />
              Step 4: Dispatch Settings & Launch Broadcast
            </h2>

            {/* Connected Business Gateway Banner */}
            <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-100">
                  Automated Gateway Sender: +91 {apiStatus?.businessNumber || '8884845595'} ({apiStatus?.verifiedName || 'Ooting'})
                </span>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 leading-snug">
                Messages are dispatched automatically in the background through your connected business gateway. Zero WhatsApp Web logins and zero manual button clicks required.
              </p>
            </div>

            {/* Delay Pacing Interval */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  Anti-Spam Safety Delay (Between Clients):
                </label>
                <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  {delaySeconds}s Delay
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { sec: 1, label: '1s Fast' },
                  { sec: 2, label: '2s Safe' },
                  { sec: 3, label: '3s Steady' },
                  { sec: 5, label: '5s Paced' },
                ].map((item) => (
                  <button
                    key={item.sec}
                    type="button"
                    onClick={() => setDelaySeconds(item.sec)}
                    disabled={isAutoBroadcasting}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      delaySeconds === item.sec
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-bold shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Launch Automated Broadcast Button */}
            <button
              type="button"
              onClick={handleStartBroadcast}
              disabled={isAutoBroadcasting || selectedIndices.size === 0}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isAutoBroadcasting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>
                {isAutoBroadcasting
                  ? `Broadcasting in Progress... (${currentBroadcastIndex + 1}/${targetRecipients.length})`
                  : selectedIndices.size === 0
                  ? 'Select Clients Above to Start Broadcast'
                  : `🚀 Send Bulk Messages Automatically (${selectedIndices.size} Selected Clients)`}
              </span>
            </button>

            {recipients.length > 0 && (
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                <span>
                  Target: <strong>{selectedIndices.size}</strong> of {recipients.length} clients selected
                </span>
                <span>
                  Sender: <strong>+91 {apiStatus?.businessNumber || '8884845595'}</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gateway Configuration Modal */}
      {isConfigOpen && (
        <Modal
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
          title="Direct WhatsApp Business Gateway Setup"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-3 bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 rounded-xl text-xs text-brand-900 dark:text-brand-100 flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block">Connected Number: +91 8884845595 (Ooting)</span>
                <p className="text-[11px] leading-relaxed">
                  Your WhatsApp business number is mapped with Phone ID <strong>1282151328312026</strong>. Click <strong>Test Live Connection</strong> below to verify connectivity with Meta servers anytime.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Meta Cloud API Permanent Access Token
                </label>
                <input
                  type="password"
                  value={configToken}
                  onChange={(e) => setConfigToken(e.target.value)}
                  placeholder="EAAW..."
                  className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  WhatsApp Phone Number ID or WABA ID
                </label>
                <input
                  type="text"
                  value={configPhoneId}
                  onChange={(e) => setConfigPhoneId(e.target.value)}
                  placeholder="1282151328312026 or 1770457630964236"
                  className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  💡 You can enter Phone ID (<code>1282151328312026</code>) or WABA ID (<code>1770457630964236</code>). Both automatically route to connected number +91 8884845595.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Registered Business Sender Phone Number
                </label>
                <input
                  type="text"
                  value={configBusinessNum}
                  onChange={(e) => setConfigBusinessNum(e.target.value)}
                  placeholder="8884845595"
                  className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Test Connection Results */}
            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                  testResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                    : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100'
                }`}
              >
                <div className="flex items-start gap-2">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <span className="font-bold block">
                      {testResult.success ? '✅ Gateway Connected & Verified!' : '⚠️ Connection Result'}
                    </span>
                    <p className="text-[11px] leading-relaxed">{testResult.message}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={handleTestGatewayConnection}
                disabled={isTestingConfig}
                className="w-full sm:w-auto px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isTestingConfig ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span>{isTestingConfig ? 'Testing Gateway...' : '⚡ Test Live Connection'}</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveGatewayConfig}
                  disabled={isSavingConfig}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSavingConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save & Connect</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Automated Broadcast Execution Modal */}
      {(isAutoBroadcasting || isCompleted) && (
        <Modal
          isOpen={isAutoBroadcasting || isCompleted}
          onClose={() => {
            if (!isAutoBroadcasting) {
              setIsAutoBroadcasting(false);
              setIsCompleted(false);
            }
          }}
          title={
            isCompleted
              ? '✅ Automated Broadcast Completed (+91 8884845595)'
              : '🚀 Automated WhatsApp Gateway Broadcast (+91 8884845595)'
          }
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {/* Top Status & 4 Metric Badges */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isCompleted
                        ? 'bg-emerald-500'
                        : isAutoPaused
                        ? 'bg-amber-500 animate-pulse'
                        : 'bg-emerald-500 animate-ping'
                    }`}
                  ></div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {isCompleted
                      ? `Finished! All ${targetRecipients.length} clients processed.`
                      : `Sending to client ${currentBroadcastIndex + 1} of ${targetRecipients.length}: ${currentRecipient?.customerName || 'Customer'}`}
                  </span>
                </div>

                <span className="text-xs font-mono font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-600" />
                  <span>Sender: +91 8884845595</span>
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <span>
                    Processed {dispatchedHistory.length} of {targetRecipients.length} clients
                  </span>
                  <span>
                    {Math.min(
                      100,
                      Math.round(
                        (dispatchedHistory.length / Math.max(1, targetRecipients.length)) * 100
                      )
                    )}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2.5 transition-all duration-300 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (dispatchedHistory.length / Math.max(1, targetRecipients.length)) * 100
                        )
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* 4 Real-time Stat Badges */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl text-center border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total
                  </span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                    {targetRecipients.length}
                  </span>
                </div>
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-center border border-emerald-200 dark:border-emerald-800/60 shadow-2xs">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                    Sent
                  </span>
                  <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-300">
                    {dispatchedHistory.filter((h) => h.status === 'SENT').length}
                  </span>
                </div>
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-center border border-rose-200 dark:border-rose-800/60 shadow-2xs">
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                    Failed
                  </span>
                  <span className="text-base font-extrabold text-rose-700 dark:text-rose-300">
                    {dispatchedHistory.filter((h) => h.status === 'FAILED').length}
                  </span>
                </div>
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-center border border-blue-200 dark:border-blue-800/60 shadow-2xs">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                    Remaining
                  </span>
                  <span className="text-base font-extrabold text-blue-700 dark:text-blue-300">
                    {Math.max(0, targetRecipients.length - dispatchedHistory.length)}
                  </span>
                </div>
              </div>

              {/* Active Client Card */}
              {!isCompleted && currentRecipient && (
                <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                        {isAutoPaused ? (
                          <Pause className="w-4 h-4 text-amber-200" />
                        ) : (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                          {isAutoPaused ? 'Broadcast Paused' : 'Currently Sending To:'}{' '}
                          {currentRecipient.customerName || 'Customer'}
                        </span>
                        <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300">
                          +{currentRecipient.Phone || currentRecipient.phone} •{' '}
                          {currentRecipient.package || 'General Inquiry'}
                        </span>
                      </div>
                    </div>

                    <span className="text-[11px] font-semibold px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700">
                      Pacing: {delaySeconds}s delay
                    </span>
                  </div>

                  <p className="text-[11px] text-emerald-800 dark:text-emerald-200/90 leading-relaxed bg-white/70 dark:bg-black/30 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/40 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Automated Server Dispatch:</strong> Messages are transmitted automatically in the background directly from your official WhatsApp number (+91 8884845595).
                    </span>
                  </p>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleTogglePause}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {isAutoPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                      <span>{isAutoPaused ? 'Resume Broadcast' : 'Pause Broadcast'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleStopBroadcast}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>Stop Broadcast</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Real-time Dispatched Activity Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Dispatch Activity Log ({dispatchedHistory.length})
                </span>
                {dispatchedHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExportBroadcastReport}
                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Export Excel Report (.xlsx)</span>
                  </button>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900">
                {dispatchedHistory.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Dispatched messages will appear here in real time...
                  </div>
                ) : (
                  dispatchedHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                    >
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                          {item.name} (+{item.phone})
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Dispatched at {item.time} {item.error ? `• ${item.error}` : ''}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.status === 'SENT' || item.status === 'DISPATCHED' ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Sent
                          </span>
                        ) : (
                          <span className="text-rose-600 font-bold flex items-center gap-1 text-[11px]">
                            <AlertCircle className="w-3.5 h-3.5" /> Failed
                          </span>
                        )}

                        {item.status === 'FAILED' && (
                          <button
                            type="button"
                            disabled={sendingSinglePhone === item.phone}
                            onClick={() =>
                              handleQuickSend({
                                Phone: item.phone,
                                customerName: item.name,
                              })
                            }
                            className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 rounded font-semibold text-[10px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            title="Retry sending via connected WhatsApp Gateway (+91 8884845595)"
                          >
                            {sendingSinglePhone === item.phone ? (
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-2.5 h-2.5" />
                            )}
                            <span>Retry</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-400">
                {isCompleted ? 'All selected messages processed.' : 'Automated broadcast runner active.'}
              </span>

              <div className="flex items-center gap-2">
                {dispatchedHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExportBroadcastReport}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Report (.xlsx)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    handleStopBroadcast();
                    setIsAutoBroadcasting(false);
                    setIsCompleted(false);
                  }}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  {isCompleted ? 'Done' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
