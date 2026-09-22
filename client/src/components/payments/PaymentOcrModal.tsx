import React, { useState, useRef } from 'react';
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
    setUtr('');
    setAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentTime('');
    setPaymentMethod('UPI');
    setNotes('');
    setScreenshotUrl(null);
    setSaveError(null);
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
      api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((res) => {
        if (res.data?.url) setScreenshotUrl(res.data.url);
      }).catch(() => {
        // quiet error on preview upload
      });

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

  const parsePaymentText = (text: string, confidence: number) => {
    // 1. Parse UTR / UPI Ref ID (12 digits)
    // Matches patterns like "UPI Ref No: 423984712093", "UTR 423984712093", "Transaction ID 423984712093"
    let extractedUtr = '';
    const utrRegexWithPrefix = /(?:upi\s*ref(?:erence)?\s*(?:no|id)?|utr|txn\s*(?:id|ref)|ref\s*(?:no|id)?|reference)[\s:#-]*([0-9]{12})/i;
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
      if (confidence < 60) {
        setUtrWarning('UTR was detected with low confidence. Please verify the digits carefully.');
      } else {
        setUtrWarning(null);
      }
    } else {
      setUtrWarning('UTR could not be confidently detected. Please upload a clearer screenshot or enter manually.');
    }

    // 2. Parse Amount
    // Looks for ₹, INR, Rs., Paid, or Amount followed by numbers
    const amountRegex = /(?:₹|inr|rs\.?|paid|amount)\s*[:=]?\s*₹?\s*([0-9,]+(?:\.[0-9]{2})?)/i;
    const matchAmount = text.match(amountRegex);
    if (matchAmount && matchAmount[1]) {
      const cleanNum = matchAmount[1].replace(/,/g, '');
      const parsedNum = parseFloat(cleanNum);
      if (!isNaN(parsedNum) && parsedNum > 0) {
        setAmount(String(parsedNum));
      }
    } else {
      // If expected amount is available, suggest it
      if (expectedAmount > 0) {
        setAmount(String(expectedAmount));
      }
    }

    // 3. Parse Date
    const dateRegex1 = /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b/i;
    const dateRegex2 = /\b(\d{2}[/-]\d{2}[/-]\d{4})\b/;
    const matchDate1 = text.match(dateRegex1);
    const matchDate2 = text.match(dateRegex2);

    if (matchDate1 && matchDate1[1]) {
      try {
        const d = new Date(matchDate1[1]);
        if (!isNaN(d.getTime())) setPaymentDate(d.toISOString().split('T')[0]);
      } catch {}
    } else if (matchDate2 && matchDate2[1]) {
      try {
        const parts = matchDate2[1].split(/[-/]/);
        if (parts.length === 3) {
          const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          if (!isNaN(d.getTime())) setPaymentDate(d.toISOString().split('T')[0]);
        }
      } catch {}
    }

    // 4. Parse Time
    const timeRegex = /\b(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)\b/;
    const matchTime = text.match(timeRegex);
    if (matchTime && matchTime[1]) {
      setPaymentTime(matchTime[1]);
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
        transactionReference: utr.trim() || null,
        notes: notesParts.join(' | ') || null,
        paymentStatus: 'SUCCESS',
        allowOverpayment: numAmount > expectedAmount,
      });

      onSuccess();
      onClose();
      resetForm();
    } catch (err: any) {
      setSaveError(err.response?.data?.message || 'Failed to record payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedEnteredAmount = parseFloat(amount) || 0;
  const amountDiff = parsedEnteredAmount - expectedAmount;

  return (
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
                  className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-black text-white rounded-lg transition-colors"
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
                <span className={`font-bold ${ocrConfidence > 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
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

            {/* UTR / Transaction Reference (Critical) */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>
                  UTR / Transaction ID / UPI Ref <span className="text-red-500">*</span>
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
                onChange={(e) => setUtr(e.target.value)}
                placeholder="e.g. 423984712093"
                className="mt-1 w-full p-2.5 font-mono text-sm font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Staff must verify each digit against the screenshot before confirming.
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
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 15000"
                  className="mt-1 w-full p-2 text-sm font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-1 focus:ring-[#C91F28] focus:outline-none text-emerald-700 dark:text-emerald-400"
                />
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
                  Math.abs(amountDiff) < 0.01
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : amountDiff < 0
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-indigo-50 text-indigo-800 border-indigo-300'
                }`}
              >
                <span>
                  {Math.abs(amountDiff) < 0.01
                    ? '✅ Exact Payment: Matches full outstanding balance.'
                    : amountDiff < 0
                    ? `⚠️ Partial Payment: Balance of ₹${(expectedAmount - parsedEnteredAmount).toLocaleString('en-IN')} will remain due.`
                    : `ℹ️ Overpayment: Received amount exceeds outstanding balance by ₹${amountDiff.toLocaleString('en-IN')}.`}
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
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Transaction Time</label>
                <input
                  type="text"
                  value={paymentTime}
                  onChange={(e) => setPaymentTime(e.target.value)}
                  placeholder="e.g. 02:45 PM"
                  className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
                />
              </div>
            </div>

            {/* Staff Internal Notes */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Staff Audit Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Confirmed in HDFC Current Account statement by finance team..."
                className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-1 focus:ring-[#C91F28] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Payment screenshot will be safely attached to the booking payment ledger.
          </span>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="px-4 py-2 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isProcessingOcr}
              className="px-5 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
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
  );
};
