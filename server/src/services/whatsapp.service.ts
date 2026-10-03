import { prisma } from '../db/prisma.js';

export interface WhatsAppSendParams {
  phone: string;
  message: string;
  customerId?: string | null;
  templateName?: string | null;
  userId?: string | null;
  mediaType?: 'NONE' | 'IMAGE' | 'DOCUMENT';
  mediaUrl?: string | null;
  mediaFilename?: string | null;
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

export async function getWhatsAppConfigStatus(): Promise<{
  configured: boolean;
  provider: 'META_CLOUD_API' | 'TWILIO' | 'DIRECT_WEB';
  details: string;
  phoneNumberId?: string;
  token?: string;
  businessNumber?: string;
}> {
  let metaToken = process.env.WHATSAPP_CLOUD_API_TOKEN;
  let metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  let businessNumber = process.env.WHATSAPP_BUSINESS_NUMBER;

  if (!metaToken || !metaPhoneId) {
    try {
      const settings = await prisma.companySetting.findMany({
        where: {
          key: { in: ['whatsapp_cloud_api_token', 'whatsapp_phone_number_id', 'whatsapp_business_number'] },
        },
      });
      const map: Record<string, string> = {};
      settings.forEach((s) => {
        map[s.key] = s.value;
      });
      if (map['whatsapp_cloud_api_token'] && map['whatsapp_phone_number_id']) {
        metaToken = map['whatsapp_cloud_api_token'];
        metaPhoneId = map['whatsapp_phone_number_id'];
      }
      if (map['whatsapp_business_number']) {
        businessNumber = map['whatsapp_business_number'];
      }
    } catch (_) {}
  }

  if (metaToken && metaPhoneId) {
    return {
      configured: true,
      provider: 'META_CLOUD_API',
      details: 'Connected to official Meta WhatsApp Cloud API',
      phoneNumberId: metaPhoneId,
      token: metaToken,
      businessNumber: businessNumber || undefined,
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
      businessNumber: twilioNumber,
    };
  }

  return {
    configured: false,
    provider: 'DIRECT_WEB',
    details: 'Direct Web WhatsApp Mode (Sequential Autopilot Timer Enabled)',
    businessNumber: businessNumber || undefined,
  };
}

export async function sendWhatsAppMessage(params: WhatsAppSendParams): Promise<WhatsAppSendResult> {
  const { phone, message, customerId, templateName, userId, mediaType = 'NONE', mediaUrl, mediaFilename } = params;
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

  const fullTextMessage = mediaUrl ? `${message}\n\n📎 Attachment: ${mediaUrl}` : message;
  const directWebUrl = `https://wa.me/${digitsOnly}?text=${encodeURIComponent(fullTextMessage)}`;
  const config = await getWhatsAppConfigStatus();

  // Mode 1: Meta Cloud API
  if (config.provider === 'META_CLOUD_API' && config.phoneNumberId && config.token) {
    try {
      let payload: any;
      if (mediaType === 'IMAGE' && mediaUrl) {
        payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: digitsOnly,
          type: 'image',
          image: {
            link: mediaUrl,
            caption: message,
          },
        };
      } else if (mediaType === 'DOCUMENT' && mediaUrl) {
        payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: digitsOnly,
          type: 'document',
          document: {
            link: mediaUrl,
            caption: message,
            filename: mediaFilename || 'Document.pdf',
          },
        };
      } else {
        payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: digitsOnly,
          type: 'text',
          text: { preview_url: true, body: fullTextMessage },
        };
      }

      const response = await fetch(
        `https://graph.facebook.com/v19.0/${config.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const result: any = await response.json();

      if (!response.ok) {
        const errorMsg = result?.error?.message || 'Meta WhatsApp API request failed';
        const log = await prisma.whatsAppMessage.create({
          data: {
            customerId: customerId || null,
            phone: formatted,
            messageContent: fullTextMessage,
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
      messageContent: fullTextMessage,
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
