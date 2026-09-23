import React, { useState, useRef, useEffect } from 'react';
import { createWorker } from 'tesseract.js';
import {
  Upload,
  Camera,
  CheckCircle2,
  AlertTriangle,
  FileText,
  CreditCard,
  X,
  Eye,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { Modal } from '../ui/Modal.js';
import { api } from '../../api/client.js';

interface PaymentOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bookingId: string;
  bookingNumber: string;
  customerName: string;
  expectedAmount: number;
}

export const PaymentOcrModal: React.FC<PaymentOcrModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  bookingId,
  bookingNumber,
  customerName,
  expectedAmount,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrRawText, setOcrRawText] = useState('');
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [utrWarning, setUtrWarning] = useState<string | null>(null);
  const [fieldWarnings, setFieldWarnings] = useState<{
    utr?: string | null;
    amount?: string | null;
    date?: string | null;
    time?: string | null;
  }>({});

  // Form states to review and verify
  const [utr, setUtr] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentTime, setPaymentTime] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [notes, setNotes] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Dedicated Duplicate UTR Alert Modal state
  const [duplicateUtrModal, setDuplicateUtrModal] = useState<string | null>(null);

  // Dedicated Extra Amount Received Modal state
  const [showExtraAmountNotice, setShowExtraAmountNotice] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setFile(null);
    setImagePreview(null);
    setIsProcessingOcr(false);
    setOcrProgress(0);
    setOcrRawText('');
    setOcrConfidence(null);
    setUtrWarning(null);
    setFieldWarnings({});
    setUtr('');
    setAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentTime('');
    setPaymentMethod('UPI');
    setNotes('');
    setScreenshotUrl(null);
    setSaveError(null);
    setDuplicateUtrModal(null);
    setShowExtraAmountNotice(false);
  };

  const handleFileChange = (selectedFile: File) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setSaveError(null);
    setUtrWarning(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setImagePreview(url);
      runOcr(url, selectedFile);
    };
    reader.readAsDataURL(selectedFile);
  };

  const runOcr = async (imageUrl: string, originalFile: File) => {
    setIsProcessingOcr(true);
    setOcrProgress(10);
    setUtrWarning(null);

    try {
      // 1. Upload screenshot to server for secure permanent attachment
      const formData = new FormData();
      formData.append('image', originalFile);
      api
        .post('/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((res) => {
          if (res.data?.url) setScreenshotUrl(res.data.url);
        })
        .catch(() => {});

      // 2. Initialize Tesseract worker in Web Worker
      const worker = await createWorker('eng');
      setOcrProgress(40);

      const ret = await worker.recognize(imageUrl);
      setOcrProgress(90);
      await worker.terminate();

      const text = ret.data.text || '';
      const confidence = ret.data.confidence || 0;
      setOcrRawText(text);
      setOcrConfidence(confidence);

      // Parse text for Banking & UPI indicators
      parsePaymentText(text, confidence);
    } catch (err: any) {
      console.error('OCR Error:', err);
      setUtrWarning('OCR could not read the screenshot. Please enter details manually.');
    } finally {
      setIsProcessingOcr(false);
      setOcrProgress(100);
    }
  };

  const unreadFieldWarning = 'Unable to confidently read this field. Please verify or upload a clearer screenshot.';

  const parsePaymentText = (text: string, confidence: number) => {
    const newWarnings: {
      utr?: string | null;
      amount?: string | null;
      date?: string | null;
      time?: string | null;
    } = {};

    // 1. Parse UTR / UPI Ref ID (12 digits)
    let extractedUtr = '';
    const utrRegexWithPrefix =
      /(?:upi\s*ref(?:erence)?\s*(?:no|id)?|utr|txn\s*(?:id|ref)|ref\s*(?:no|id)?|reference)[\s:#-]*([0-9]{12})/i;
    const matchPrefix = text.match(utrRegexWithPrefix);

    if (matchPrefix && matchPrefix[1]) {
      extractedUtr = matchPrefix[1];
    } else {
      // Fallback: search for any standalone 12-digit number
      const standaloneMatch = text.match(/\b([0-9]{12})\b/);
      if (standaloneMatch && standaloneMatch[1]) {
        extractedUtr = standaloneMatch[1];
      }
    }

    if (extractedUtr) {
      setUtr(extractedUtr);
      checkUtrDuplication(extractedUtr);
      if (confidence < 70) {
        newWarnings.utr = 'Low OCR confidence on UTR. Please verify with screenshot before saving.';
        setUtrWarning('Low OCR confidence on UTR. Please verify with screenshot before saving.');
      } else {
        setUtrWarning(null);
      }
    } else {
      setUtr('');
      newWarnings.utr = unreadFieldWarning;
      setUtrWarning(unreadFieldWarning);
    }

    // 2. Parse Amount (Never guess or default to balance)
    const amountRegex = /(?:₹|inr|rs\.?|paid|amount)\s*[:=]?\s*₹?\s*([0-9,]+(?:\.[0-9]{2})?)/i;
    const matchAmount = text.match(amountRegex);
    let amountFound = false;

    if (matchAmount && matchAmount[1]) {
      const cleanNum = matchAmount[1].replace(/,/g, '');
      const parsedNum = parseFloat(cleanNum);
      if (!isNaN(parsedNum) && parsedNum > 0) {
        setAmount(String(parsedNum));
        amountFound = true;
        if (parsedNum > expectedAmount && expectedAmount > 0) {
          setShowExtraAmountNotice(true);
        }
      }
    }

    if (!amountFound) {
      setAmount('');
      newWarnings.amount = unreadFieldWarning;
    }

    // 3. Parse Date
    const dateRegex1 = /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b/i;
    const dateRegex2 = /\b(\d{2}[/-]\d{2}[/-]\d{4})\b/;
    const matchDate1 = text.match(dateRegex1);
    const matchDate2 = text.match(dateRegex2);
    let dateFound = false;

    if (matchDate1 && matchDate1[1]) {
      try {
        const d = new Date(matchDate1[1]);
        if (!isNaN(d.getTime())) {
          setPaymentDate(d.toISOString().split('T')[0]);
          dateFound = true;
        }
      } catch {}
    } else if (matchDate2 && matchDate2[1]) {
      try {
        const parts = matchDate2[1].split(/[-/]/);
        if (parts.length === 3) {
          const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          if (!isNaN(d.getTime())) {
            setPaymentDate(d.toISOString().split('T')[0]);
            dateFound = true;
          }
        }
      } catch {}
    }

    if (!dateFound) {
      newWarnings.date = unreadFieldWarning;
    }

    // 4. Parse Time
    const timeRegex = /\b(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)\b/;
    const matchTime = text.match(timeRegex);
    if (matchTime && matchTime[1]) {
      setPaymentTime(matchTime[1]);
    } else {
      setPaymentTime('');
      newWarnings.time = unreadFieldWarning;
    }

    setFieldWarnings(newWarnings);
  };

  const checkUtrDuplication = async (utrValue: string) => {
    if (!utrValue || utrValue.trim().length < 6) return;
    try {
      const res = await api.get(`/payments/check-utr?utr=${encodeURIComponent(utrValue.trim())}`);
      if (res.data?.exists) {
        setDuplicateUtrModal('This UTR number already exists for another payment. Please enter a unique UTR number.');
      }
    } catch (e) {
      // quiet error
    }
  };

  const handleUtrBlur = () => {
    if (utr.trim()) {
      checkUtrDuplication(utr.trim());
      if (utr.trim().length !== 12) {
        setUtrWarning('Note: Standard bank/UPI UTR is usually 12 digits. Please verify carefully.');
      }
    }
  };

  const handleAmountChange = (val: string) => {
    setAmount(val);
    const num = parseFloat(val);
    if (!isNaN(num) && expectedAmount > 0 && num > expectedAmount) {
      setShowExtraAmountNotice(true);
    } else {
      setShowExtraAmountNotice(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setSaveError('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (!utr.trim()) {
      setSaveError('UTR / Transaction reference is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const notesParts = [];
      if (notes.trim()) notesParts.push(notes.trim());
      if (paymentTime) notesParts.push(`Time: ${paymentTime}`);
      if (screenshotUrl) notesParts.push(`Screenshot: ${screenshotUrl}`);
      if (ocrConfidence !== null) notesParts.push(`[OCR Verified: ${Math.round(ocrConfidence)}% confidence]`);

      await api.post('/payments', {
        bookingId,
        amount: numAmount,
        paymentDate: paymentDate || new Date().toISOString(),
        paymentMethod,
        transactionReference: utr.trim(),
        notes: notesParts.join(' | ') || null,
        paymentStatus: 'SUCCESS',
        allowOverpayment: numAmount > expectedAmount,
      });

      onSuccess();
      onClose();
      resetForm();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setDuplicateUtrModal(
          err.response?.data?.message ||
          'This UTR number already exists for another payment. Please enter a unique UTR number.'
        );
      } else {
        setSaveError(err.response?.data?.message || 'Failed to record payment. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedEnteredAmount = parseFloat(amount) || 0;
  const extraAmountToReturn = parsedEnteredAmount > expectedAmount ? parsedEnteredAmount - expectedAmount : 0;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          onClose();
          resetForm();
        }}
        title="Record Payment with Screenshot OCR"
        subtitle={`Booking: ${bookingNumber} | Customer: ${customerName} | Expected Balance: ₹${expectedAmount.toLocaleString('en-IN')}`}
        maxWidth="4xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {saveError && (
            <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Upload Zone & Side-by-Side OCR Review */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column: Upload Dropzone & Screenshot Preview */}
            <div className="lg:col-span-5 flex flex-col gap-2">
              <label className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#C91F28]" />
                Payment Screenshot / Receipt
              </label>

              {!imagePreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#C91F28] bg-slate-50 dark:bg-slate-850 p-6 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-slate-100 min-h-[220px]"
                >
                  <Upload className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    Upload Payment Screenshot
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 max-w-[200px]">
                    Supports PhonePe, Google Pay, Paytm, BHIM, Bank Transfer screenshots
                  </span>
                  <button
                    type="button"
                    className="mt-3 px-3 py-1 bg-slate-900 text-white text-[10px] font-semibold rounded-lg"
                  >
                    Choose File
                  </button>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 flex items-center justify-center max-h-[280px]">
                  <img
                    src={imagePreview}
                    alt="Payment Screenshot"
                    className="object-contain w-full h-full max-h-[280px]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setFile(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-black text-white rounded-lg transition-colors cursor-pointer"
                    title="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {isProcessingOcr && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white gap-2 p-4">
                      <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                      <span className="font-bold text-xs">Scanning UTR & Amount...</span>
                      <div className="w-36 bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
                        <div
                          className="bg-amber-400 h-full transition-all duration-300"
                          style={{ width: `${ocrProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
                }}
              />

              {ocrConfidence !== null && (
                <div className="flex items-center justify-between px-2 text-[10px] text-slate-500">
                  <span>OCR Detection Confidence:</span>
                  <span className={`font-bold ${ocrConfidence >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {Math.round(ocrConfidence)}%
                  </span>
                </div>
              )}
            </div>

            {/* Right Column: Verification & Data Form */}
            <div className="lg:col-span-7 space-y-3 bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C91F28]" />
                Verify Extracted Payment Data
              </span>

              {/* UTR Warning or Verification Banner */}
              {utrWarning && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-xl text-[11px] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>{utrWarning}</span>
                </div>
              )}

              {/* UTR / Transaction Reference (Critical & Unique) */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>
                    UTR / Transaction ID / UPI Ref <span className="text-red-500">* (Must be unique)</span>
                  </span>
                  {utr && utr.length === 12 && (
                    <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Valid 12-digit format
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  required
                  value={utr}
                  onChange={(e) => {
                    setUtr(e.target.value);
                    if (fieldWarnings.utr) setFieldWarnings((w) => ({ ...w, utr: null }));
                  }}
                  onBlur={handleUtrBlur}
                  placeholder="e.g. 423984712093"
                  className="mt-1 w-full p-2.5 font-mono text-sm font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                />
                {fieldWarnings.utr && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block mt-1">
                    ⚠️ {fieldWarnings.utr}
                  </span>
                )}
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Verify each digit against screenshot before confirming. Duplicate UTRs are rejected.
                </span>
              </div>

              {/* Amount Check */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Amount Received (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => {
                      handleAmountChange(e.target.value);
                      if (fieldWarnings.amount) setFieldWarnings((w) => ({ ...w, amount: null }));
                    }}
                    placeholder="e.g. 15000"
                    className="mt-1 w-full p-2 text-sm font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-1 focus:ring-[#C91F28] focus:outline-none text-emerald-700 dark:text-emerald-400"
                  />
                  {fieldWarnings.amount && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block mt-1">
                      ⚠️ {fieldWarnings.amount}
                    </span>
                  )}
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-1 focus:ring-[#C91F28] focus:outline-none font-semibold"
                  >
                    <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS / IMPS)</option>
                    <option value="CARD">Credit / Debit Card</option>
                    <option value="CASH">Cash</option>
                    <option value="OTHER">Other Channel</option>
                  </select>
                </div>
              </div>

              {/* Comparison against Expected Balance */}
              {parsedEnteredAmount > 0 && expectedAmount > 0 && (
                <div
                  className={`p-2.5 rounded-xl border text-[11px] font-medium flex items-center justify-between ${
                    extraAmountToReturn > 0
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                      : parsedEnteredAmount < expectedAmount
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                  }`}
                >
                  <span>
                    {extraAmountToReturn > 0
                      ? `⚠️ Extra Amount Received: ₹${extraAmountToReturn.toLocaleString('en-IN')} to be returned to customer.`
                      : parsedEnteredAmount < expectedAmount
                      ? `ℹ️ Partial Payment: Remaining balance ₹${(expectedAmount - parsedEnteredAmount).toLocaleString('en-IN')}.`
                      : '✅ Exact Payment: Matches full outstanding balance.'}
                  </span>
                  <span className="font-bold">
                    ₹{parsedEnteredAmount.toLocaleString('en-IN')} / ₹{expectedAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {/* Transaction Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Transaction Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => {
                      setPaymentDate(e.target.value);
                      if (fieldWarnings.date) setFieldWarnings((w) => ({ ...w, date: null }));
                    }}
                    className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                  />
                  {fieldWarnings.date && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block mt-1">
                      ⚠️ {fieldWarnings.date}
                    </span>
                  )}
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Transaction Time</label>
                  <input
                    type="text"
                    value={paymentTime}
                    onChange={(e) => {
                      setPaymentTime(e.target.value);
                      if (fieldWarnings.time) setFieldWarnings((w) => ({ ...w, time: null }));
                    }}
                    placeholder="e.g. 02:45 PM"
                    className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                  />
                  {fieldWarnings.time && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block mt-1">
                      ⚠️ {fieldWarnings.time}
                    </span>
                  )}
                </div>
              </div>

              {/* Staff Internal Notes */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Staff Audit Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Confirmed in bank statement by finance team..."
                  className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Payment screenshot will be safely attached to the booking payment ledger.
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  resetForm();
                }}
                className="px-4 py-2 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isProcessingOcr}
                className="px-5 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Recording...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verify & Record Payment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Duplicate UTR Alert Modal */}
      {duplicateUtrModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200 dark:border-red-900/60 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Duplicate UTR Detected
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 font-medium">
                {duplicateUtrModal}
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setDuplicateUtrModal(null)}
                className="w-full py-2.5 bg-[#C91F28] hover:bg-[#a81920] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-md"
              >
                Understood, Enter Unique UTR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extra Amount Received Notification Modal */}
      {showExtraAmountNotice && extraAmountToReturn > 0 && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-amber-200 dark:border-amber-900/60 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Notice: Extra Amount Received
                </h3>
                <p className="text-[11px] text-slate-500">
                  Customer has transferred more than the outstanding booking balance.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer Name:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">UTR Number:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{utr || 'Pending verification'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction Date & Time:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {paymentDate} {paymentTime ? `at ${paymentTime}` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Expected Balance:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  ₹{expectedAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
                <span className="text-slate-500">Amount Received:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  ₹{parsedEnteredAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 bg-amber-100/60 dark:bg-amber-950/40 p-2 rounded-lg">
                <span className="font-bold text-amber-900 dark:text-amber-200">Extra Amount to be Returned:</span>
                <span className="font-black text-amber-900 dark:text-amber-200 text-sm">
                  ₹{extraAmountToReturn.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              Please initiate a refund of the extra ₹{extraAmountToReturn.toLocaleString('en-IN')} to {customerName} via the original UPI/Bank channel or record a credit note.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowExtraAmountNotice(false)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Acknowledge & Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
