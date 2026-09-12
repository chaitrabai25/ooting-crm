import React, { useState, useEffect } from 'react';
import { Send, ExternalLink, MessageSquare, History, CheckCheck, Clock, AlertCircle, Sparkles } from 'lucide-react';
import { Modal } from '../ui/Modal.js';
import { api } from '../../api/client.js';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName: string;
  recipientPhone: string;
  customerId?: string;
  bookingNumber?: string;
}

const TEMPLATES = [
  {
    id: 'WELCOME',
    label: 'Welcome Greeting',
    content: (name: string) =>
      `Hello ${name}, warm greetings from Ooting Holidays! 🌴 We received your travel enquiry and our expert holiday planner is reviewing the best options for your dream trip. How can we assist you today?`,
  },
  {
    id: 'QUOTATION',
    label: 'Quotation Follow-up',
    content: (name: string) =>
      `Dear ${name}, thank you for considering Ooting Holidays! ✈️ We have tailored a customized holiday itinerary just for you. Have you had a chance to review the quotation, or would you like us to customize any inclusions?`,
  },
  {
    id: 'BOOKING_CONFIRMED',
    label: 'Booking Confirmation',
    content: (name: string) =>
      `Dear ${name}, your booking with Ooting Holidays is officially confirmed! 🎉 All travel vouchers and hotel details are being processed. Thank you for traveling with us!`,
  },
  {
    id: 'PAYMENT_REMINDER',
    label: 'Payment Reminder',
    content: (name: string) =>
      `Hello ${name}, friendly reminder from Ooting Holidays regarding the pending balance for your upcoming tour. Please let us know if you need our bank account details or UPI payment link. Thank you!`,
  },
  {
    id: 'CUSTOM',
    label: 'Custom Message',
    content: (name: string) => `Hello ${name}, `,
  },
];

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  recipientName,
  recipientPhone,
  customerId,
}) => {
  const [activeTab, setActiveTab] = useState<'composer' | 'history'>('composer');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('WELCOME');
  const [message, setMessage] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [statusFeedback, setStatusFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Clean phone number for display and wa.me
  const cleanPhone = recipientPhone ? recipientPhone.replace(/[^0-9]/g, '') : '';
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  useEffect(() => {
    if (isOpen) {
      const tmpl = TEMPLATES.find((t) => t.id === 'WELCOME');
      if (tmpl) {
        setMessage(tmpl.content(recipientName || 'Valued Guest'));
      }
      checkStatus();
      loadHistory();
      setStatusFeedback(null);
    }
  }, [isOpen, recipientName, recipientPhone]);

  const checkStatus = async () => {
    try {
      const res = await api.get('/whatsapp/status');
      setApiStatus(res.data);
    } catch {
      // Ignore if status endpoint unreachable
    }
  };

  const loadHistory = async () => {
    if (!recipientPhone) return;
    setLoadingHistory(true);
    try {
      const res = await api.get(`/whatsapp/history/${recipientPhone}`);
      setHistory(res.data || []);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tmpl = TEMPLATES.find((t) => t.id === templateId);
    if (tmpl) {
      setMessage(tmpl.content(recipientName || 'Valued Guest'));
    }
  };

  const handleDirectWhatsAppWeb = () => {
    if (!formattedPhone) {
      setStatusFeedback({ type: 'error', text: 'Valid phone number is required.' });
      return;
    }
    const webUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(webUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSendApi = async () => {
    if (!message.trim()) {
      setStatusFeedback({ type: 'error', text: 'Please enter a message to send.' });
      return;
    }

    setSending(true);
    setStatusFeedback(null);

    try {
      const res = await api.post('/whatsapp/send', {
        customerId,
        phone: recipientPhone,
        messageContent: message.trim(),
        templateName: selectedTemplate !== 'CUSTOM' ? selectedTemplate : undefined,
      });

      if (res.data?.action === 'DIRECT_FALLBACK' || res.data?.directFallbackUrl) {
        setStatusFeedback({
          type: 'info',
          text: 'Meta Cloud API is unconfigured. Launching WhatsApp Web/App directly...',
        });
        window.open(res.data.directFallbackUrl, '_blank', 'noopener,noreferrer');
      } else {
        setStatusFeedback({
          type: 'success',
          text: 'WhatsApp message sent successfully via Business API!',
        });
      }

      loadHistory();
    } catch (err: any) {
      setStatusFeedback({
        type: 'error',
        text: err.response?.data?.message || 'Failed to dispatch via API. Opening direct WhatsApp fallback...',
      });
      // Offer direct web launch
      setTimeout(() => {
        handleDirectWhatsAppWeb();
      }, 1200);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send WhatsApp Message" maxWidth="lg">
      <div className="space-y-4">
        {/* Recipient Bar */}
        <div className="flex flex-wrap items-center justify-between p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                {recipientName || 'Customer'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {recipientPhone || 'No phone provided'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${
                apiStatus?.status === 'CONFIGURED'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
              }`}
            >
              {apiStatus?.status === 'CONFIGURED' ? '● Business API Active' : '● Direct WhatsApp Mode'}
            </span>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab('composer')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'composer'
                ? 'border-brand-600 text-brand-600 dark:border-brand-500 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Message Composer
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-brand-600 text-brand-600 dark:border-brand-500 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Message History ({history.length})
          </button>
        </div>

        {activeTab === 'composer' ? (
          <div className="space-y-3">
            {/* Quick Templates */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Select Quick Template:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleTemplateChange(tmpl.id)}
                    className={`px-2.5 py-1 text-xs rounded-md border font-medium transition-colors ${
                      selectedTemplate === tmpl.id
                        ? 'bg-brand-50 border-brand-500 text-brand-700 dark:bg-brand-950/40 dark:border-brand-600 dark:text-brand-300'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Textarea */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Message Content:
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Type your WhatsApp message here..."
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>Variables replaced: {recipientName}</span>
                <span>{message.length} characters</span>
              </div>
            </div>

            {/* Feedback notification */}
            {statusFeedback && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                  statusFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
                    : statusFeedback.type === 'info'
                    ? 'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900'
                    : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900'
                }`}
              >
                {statusFeedback.type === 'success' && <CheckCheck className="w-4 h-4 flex-shrink-0" />}
                {statusFeedback.type === 'info' && <ExternalLink className="w-4 h-4 flex-shrink-0" />}
                {statusFeedback.type === 'error' && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                <span>{statusFeedback.text}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={handleDirectWhatsAppWeb}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900/50 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open in WhatsApp Web / App
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={sending}
                  onClick={handleSendApi}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* History View */
          <div className="space-y-3">
            {loadingHistory ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading message log...</div>
            ) : history.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No previous WhatsApp messages logged for this contact.
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {history.map((h: any) => (
                  <div
                    key={h.id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {h.templateName || 'Direct Message'}
                      </span>
                      <span className="flex items-center gap-1 text-[11px]">
                        <Clock className="w-3 h-3" />
                        {new Date(h.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-200 text-xs whitespace-pre-wrap">
                      {h.messageContent}
                    </p>
                    <div className="flex items-center gap-2 pt-1 text-[11px]">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium ${
                          h.status === 'SENT' || h.status === 'DELIVERED'
                            ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/40'
                            : h.status === 'FAILED'
                            ? 'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-950/40'
                            : 'text-slate-700 bg-slate-100 dark:text-slate-300 dark:bg-slate-800'
                        }`}
                      >
                        {h.status}
                      </span>
                      <span className="text-slate-400">via {h.provider}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
