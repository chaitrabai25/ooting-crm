import { prisma } from '../db/prisma.js';

export interface WhatsAppSendParams {
  phone: string;
  message: string;
  customerId?: string | null;
  templateName?: string | null;
  userId?: string | null;
}

export interface WhatsAppSendResult {
  success: boolean;
  configured: boolean;
  provider: 'META_CLOUD_API' | 'TWILIO' | 'DIRECT_WEB';
  externalId?: string | null;
  directWebUrl?: string;
  status: 'SENT' | 'PENDING' | 'FAILED';
  messageId?: string;
  error?: string;
  note?: string;
}

// Cleans and normalizes phone numbers
export function sanitizePhoneNumber(phone: string): { formatted: string; digitsOnly: string; isValid: boolean } {
  if (!phone) return { formatted: '', digitsOnly: '', isValid: false };
  
  // Remove spaces, parentheses, hyphens
  let clean = phone.replace(/[\s\-()]/g, '');
  
  // Handle Indian phone numbers without country code
  if (/^[6-9]\d{9}$/.test(clean)) {
    clean = '+91' + clean;
  } else if (/^0[6-9]\d{9}$/.test(clean)) {
    clean = '+91' + clean.slice(1);
  } else if (/^91[6-9]\d{9}$/.test(clean)) {
    clean = '+' + clean;
  } else if (!clean.startsWith('+') && clean.length >= 10) {
    clean = '+' + clean;
  }

  const digitsOnly = clean.replace(/\D/g, '');
  const isValid = /^\+[1-9]\d{9,14}$/.test(clean) && digitsOnly.length >= 10;

  return { formatted: clean, digitsOnly, isValid };
}

export function getWhatsAppConfigStatus(): {
  configured: boolean;
  provider: 'META_CLOUD_API' | 'TWILIO' | 'DIRECT_WEB';
  details: string;
  phoneNumberId?: string;
} {
  const metaToken = process.env.WHATSAPP_CLOUD_API_TOKEN;
  const metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (metaToken && metaPhoneId) {
    return {
      configured: true,
      provider: 'META_CLOUD_API',
      details: 'Connected to official Meta WhatsApp Cloud API',
      phoneNumberId: metaPhoneId,
    };
  }

  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  if (twilioSid && twilioToken && twilioNumber) {
    return {
      configured: true,
      provider: 'TWILIO',
      details: `Connected to Twilio WhatsApp API (${twilioNumber})`,
    };
  }

  return {
    configured: false,
    provider: 'DIRECT_WEB',
    details: 'Direct WhatsApp Web / App mode (Cloud API credentials not set in environment variables)',
  };
}

export async function sendWhatsAppMessage(params: WhatsAppSendParams): Promise<WhatsAppSendResult> {
  const { phone, message, customerId, templateName, userId } = params;
  const { formatted, digitsOnly, isValid } = sanitizePhoneNumber(phone);

  if (!isValid) {
    return {
      success: false,
      configured: false,
      provider: 'DIRECT_WEB',
      status: 'FAILED',
      error: `Invalid phone number format: "${phone}". Phone numbers must include country code (e.g. +91 98765 43210).`,
    };
  }

  const directWebUrl = `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;
  const config = getWhatsAppConfigStatus();

  // Mode 1: Meta Cloud API
  if (config.provider === 'META_CLOUD_API') {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_CLOUD_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: digitsOnly,
            type: 'text',
            text: { preview_url: false, body: message },
          }),
        }
      );

      const result: any = await response.json();

      if (!response.ok) {
        const errorMsg = result?.error?.message || 'Meta WhatsApp API request failed';
        const log = await prisma.whatsAppMessage.create({
          data: {
            customerId: customerId || null,
            phone: formatted,
            messageContent: message,
            templateName: templateName || null,
            status: 'FAILED',
            provider: 'META_CLOUD_API',
            errorDetails: errorMsg,
            sentByUserId: userId || null,
          },
        });

        return {
          success: false,
          configured: true,
          provider: 'META_CLOUD_API',
          status: 'FAILED',
          messageId: log.id,
          error: errorMsg,
          directWebUrl,
        };
      }

      const externalId = result?.messages?.[0]?.id || null;
      const log = await prisma.whatsAppMessage.create({
        data: {
          customerId: customerId || null,
          phone: formatted,
          messageContent: message,
          templateName: templateName || null,
          status: 'SENT',
          provider: 'META_CLOUD_API',
          externalId,
          sentByUserId: userId || null,
        },
      });

      return {
        success: true,
        configured: true,
        provider: 'META_CLOUD_API',
        status: 'SENT',
        externalId,
        messageId: log.id,
        directWebUrl,
      };
    } catch (err: any) {
      return {
        success: false,
        configured: true,
        provider: 'META_CLOUD_API',
        status: 'FAILED',
        error: err.message,
        directWebUrl,
      };
    }
  }

  // Mode 2: Direct WhatsApp Web Fallback (when API keys are not yet provided)
  const log = await prisma.whatsAppMessage.create({
    data: {
      customerId: customerId || null,
      phone: formatted,
      messageContent: message,
      templateName: templateName || null,
      status: 'SENT',
      provider: 'DIRECT_WEB',
      sentByUserId: userId || null,
    },
  });

  return {
    success: true,
    configured: false,
    provider: 'DIRECT_WEB',
    status: 'SENT',
    messageId: log.id,
    directWebUrl,
    note: 'Message prepared. Click the WhatsApp button to dispatch directly to customer device.',
  };
}
