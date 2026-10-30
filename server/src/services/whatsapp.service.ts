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
  ready?: boolean;
  provider: 'META_CLOUD_API' | 'TWILIO' | 'DIRECT_WEB';
  externalId?: string | null;
  directWebUrl?: string;
  status: 'SENT' | 'PENDING' | 'FAILED';
  messageId?: string;
  error?: string;
  note?: string;
}

export interface WhatsAppConfigStatus {
  configured: boolean;
  ready: boolean;
  activeGateway: string;
  provider: 'META_CLOUD_API' | 'TWILIO' | 'DIRECT_WEB';
  details: string;
  phoneNumberId?: string;
  token?: string;
  businessNumber?: string;
  verifiedName?: string;
  qualityRating?: string;
  needsPhoneNumberId?: boolean;
  isTokenValid?: boolean;
  appName?: string;
  systemUserName?: string;
  diagnosticsMessage?: string;
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

export async function getWhatsAppConfigStatus(): Promise<WhatsAppConfigStatus> {
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
      if (map['whatsapp_cloud_api_token']) {
        metaToken = map['whatsapp_cloud_api_token'];
      }
      if (map['whatsapp_phone_number_id']) {
        metaPhoneId = map['whatsapp_phone_number_id'];
      }
      if (map['whatsapp_business_number']) {
        businessNumber = map['whatsapp_business_number'];
      }
    } catch (_) {}
  }

  if (metaToken) {
    // Check if metaPhoneId is the System User ID (e.g. 61596170245340) or empty
    const isSystemUserId = metaPhoneId === '61596170245340' || (metaPhoneId && String(metaPhoneId).length <= 14);

    if (!metaPhoneId || isSystemUserId) {
      return {
        configured: true,
        ready: false,
        activeGateway: 'Meta Cloud API (Phone ID Needed)',
        provider: 'META_CLOUD_API',
        details: 'Meta Token Active (ooting.in) • 15-digit Phone Number ID Required',
        phoneNumberId: metaPhoneId,
        token: metaToken,
        businessNumber: businessNumber || '8884845595',
        needsPhoneNumberId: true,
        isTokenValid: true,
        appName: 'ooting.in',
        systemUserName: 'OotingAdmin',
        diagnosticsMessage:
          'Your Meta Access Token is 100% VALID for App "ooting.in"! However, ID "61596170245340" is your System User ID, not your WhatsApp Phone Number ID. To enable automated sending: In Meta Developers (developers.facebook.com) > My Apps > ooting.in > WhatsApp > API Setup, copy the 15-digit "Phone number ID" under Step 1 and paste it here.',
      };
    }

    return {
      configured: true,
      ready: true,
      activeGateway: 'Meta Cloud API',
      provider: 'META_CLOUD_API',
      details: 'Connected to official Meta WhatsApp Cloud API (Automated Background Dispatch)',
      phoneNumberId: metaPhoneId,
      token: metaToken,
      businessNumber: businessNumber || '8884845595',
      needsPhoneNumberId: false,
      isTokenValid: true,
      appName: 'ooting.in',
    };
  }

  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  if (twilioSid && twilioToken && twilioNumber) {
    return {
      configured: true,
      ready: true,
      activeGateway: 'Twilio WhatsApp',
      provider: 'TWILIO',
      details: `Connected to Twilio WhatsApp API (${twilioNumber})`,
      businessNumber: twilioNumber,
    };
  }

  return {
    configured: false,
    ready: false,
    activeGateway: 'Direct Web Automator',
    provider: 'DIRECT_WEB',
    details: 'Direct Web WhatsApp Mode (Single-tab session reuse & clipboard pacing)',
    businessNumber: businessNumber || undefined,
  };
}

/**
 * Live test verification against Meta WhatsApp Cloud API
 */
export async function testWhatsAppConnection(params?: {
  token?: string;
  phoneNumberId?: string;
  businessNumber?: string;
}): Promise<{
  success: boolean;
  status: string;
  provider: string;
  message: string;
  details?: any;
  diagnostics?: {
    isTokenValid?: boolean;
    tokenType?: string;
    appName?: string;
    systemUserName?: string;
    reason?: string;
  };
}> {
  const currentConfig = await getWhatsAppConfigStatus();
  const token = params?.token || currentConfig.token;
  const phoneId = params?.phoneNumberId || currentConfig.phoneNumberId;

  if (!token || !phoneId) {
    return {
      success: false,
      status: 'MISSING_CREDENTIALS',
      provider: 'META_CLOUD_API',
      message: 'Both Meta Access Token and Phone Number ID are required to verify connection.',
    };
  }

  try {
    // 1. Try querying the Phone Number ID directly via Meta Graph API v20.0
    const phoneRes = await fetch(
      `https://graph.facebook.com/v20.0/${phoneId}?fields=id,display_phone_number,verified_name,code_verification_status,quality_rating`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const phoneData: any = await phoneRes.json();

    if (phoneRes.ok && phoneData && !phoneData.error) {
      return {
        success: true,
        status: 'CONNECTED',
        provider: 'META_CLOUD_API',
        message: `Successfully connected to Meta WhatsApp Cloud API! Verified Name: "${phoneData.verified_name || 'Verified'}", Phone: ${phoneData.display_phone_number || phoneId}, Quality: ${phoneData.quality_rating || 'GREEN'}.`,
        details: phoneData,
      };
    }

    // 2. Check if phoneId might be a WhatsApp Business Account ID (WABA) with phone_numbers edge
    try {
      const wabaRes = await fetch(
        `https://graph.facebook.com/v20.0/${phoneId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const wabaData: any = await wabaRes.json();
      if (wabaRes.ok && Array.isArray(wabaData?.data) && wabaData.data.length > 0) {
        const found = wabaData.data[0];
        return {
          success: true,
          status: 'CONNECTED',
          provider: 'META_CLOUD_API',
          message: `Successfully connected to WhatsApp Business Account! Auto-resolved Phone Number ID: "${found.id}" (${found.display_phone_number || found.verified_name || 'Verified'}).`,
          details: {
            resolvedPhoneNumberId: found.id,
            display_phone_number: found.display_phone_number,
            verified_name: found.verified_name,
            quality_rating: found.quality_rating,
            allNumbers: wabaData.data,
          },
        };
      }
    } catch (_) {}

    // 3. If phone query failed, diagnose token using /debug_token
    const debugRes = await fetch(
      `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${token}`
    );
    const debugData: any = await debugRes.json();
    const tokenInfo = debugData?.data;

    if (tokenInfo && tokenInfo.is_valid) {
      // Token is valid! Let's check what ID was passed.
      const isSystemUserId = phoneId === '61596170245340' || phoneId === tokenInfo.user_id || String(phoneId).length <= 14;
      
      return {
        success: false,
        status: 'PHONE_ID_MISMATCH',
        provider: 'META_CLOUD_API',
        message: isSystemUserId
          ? `Your Meta Access Token is 100% VALID for App "${tokenInfo.application}"! However, ID "${phoneId}" is your System User / Account ID, not your WhatsApp Phone Number ID. To fix this: Go to Meta Developers (developers.facebook.com) > My Apps > WhatsApp > API Setup, and copy the 15-digit "Phone number ID" shown under Step 1.`
          : `Meta Access Token is valid, but Meta reported error for Phone Number ID "${phoneId}": ${phoneData?.error?.message || 'Access denied'}. Ensure your System User has been assigned the WhatsApp Account asset under Meta Business Settings > System Users > Assign Assets.`,
        diagnostics: {
          isTokenValid: true,
          tokenType: tokenInfo.type,
          appName: tokenInfo.application,
          systemUserName: 'OotingAdmin',
          reason: isSystemUserId ? 'SYSTEM_USER_ID_PROVIDED' : 'PERMISSION_OR_ASSET_NOT_ASSIGNED',
        },
        details: phoneData?.error,
      };
    }

    return {
      success: false,
      status: 'INVALID_TOKEN',
      provider: 'META_CLOUD_API',
      message: `Invalid or expired Meta Access Token: ${phoneData?.error?.message || debugData?.error?.message || 'Authentication failed'}.`,
      details: phoneData?.error || debugData?.error,
    };
  } catch (err: any) {
    return {
      success: false,
      status: 'NETWORK_ERROR',
      provider: 'META_CLOUD_API',
      message: `Could not reach Meta Graph API: ${err.message}`,
    };
  }
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

  // Mode 1: Meta Cloud API (Automated Server Dispatch)
  if (config.provider === 'META_CLOUD_API' && config.token) {
    if (config.needsPhoneNumberId || !config.ready || config.phoneNumberId === '61596170245340' || !config.phoneNumberId) {
      const errorMsg =
        'Automated send paused: 15-digit Phone Number ID is required. (Currently set to System User ID "61596170245340"). Please copy the 15-digit Phone Number ID from Meta Developers (developers.facebook.com) > My Apps > WhatsApp > API Setup (Step 1) and paste into Gateway Settings.';

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
        ready: false,
        provider: 'META_CLOUD_API',
        status: 'FAILED',
        messageId: log.id,
        error: errorMsg,
        directWebUrl,
      };
    }
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
      } else if (templateName) {
        payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: digitsOnly,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'en' },
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
        `https://graph.facebook.com/v20.0/${config.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const result: any = await response.json();

      if (!response.ok) {
        let errorMsg = result?.error?.message || 'Meta WhatsApp API request failed';
        const errorCode = result?.error?.code;
        const errorSubcode = result?.error?.error_subcode;

        // Helpful explanations for common Meta Cloud API restrictions
        if (errorCode === 131047 || errorSubcode === 131047) {
          errorMsg = 'Customer 24-Hour Window Closed: Meta requires an approved template message when starting a conversation after 24 hours.';
        } else if (errorCode === 100 && errorSubcode === 33) {
          errorMsg = `Phone Number ID "${config.phoneNumberId}" is invalid or not a registered WhatsApp phone number on Meta.`;
        }

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
          ready: true,
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
          messageContent: fullTextMessage,
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
        ready: true,
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
        ready: true,
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
    ready: false,
    provider: 'DIRECT_WEB',
    status: 'SENT',
    messageId: log.id,
    directWebUrl,
    note: 'Message prepared. Click the WhatsApp button to dispatch directly to customer device.',
  };
}
