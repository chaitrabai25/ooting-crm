/**
 * WhatsApp Integration & Session Manager for Ooting CRM
 * 
 * Objectives:
 * 1. Single-Session / Window Reuse:
 *    Reuses the existing WhatsApp Web tab/window using a deterministic window handle ('ooting_crm_whatsapp_session').
 *    This prevents opening multiple tabs, eliminating the "WhatsApp is open in another window" prompt
 *    and avoiding repeated login/QR-code verification.
 * 
 * 2. Direct Web & App Dispatch:
 *    On desktop, connects directly to https://web.whatsapp.com/send (bypassing the intermediate wa.me landing page).
 *    On mobile devices, launches native WhatsApp via https://api.whatsapp.com/send.
 * 
 * 3. Safe Phone Number Sanitization:
 *    Formats numbers for international standard (E.164 without plus sign).
 */

let activeWhatsAppSession: Window | null = null;

/**
 * Clean and format phone numbers for WhatsApp
 */
export function sanitizeWhatsAppPhone(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  // 10 digits Indian mobile number (e.g. 9876543210 -> 919876543210)
  if (digits.length === 10) {
    return `91${digits}`;
  }

  // 11 digits starting with 0 (e.g. 09876543210 -> 919876543210)
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }

  return digits;
}

/**
 * Check if the client is currently running on a mobile browser
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export interface WhatsAppShareOptions {
  phone?: string | null;
  text: string;
  windowName?: string;
}

/**
 * Open WhatsApp with active tab/session reuse to prevent repeated login prompts
 */
export function openWhatsAppShare({
  phone,
  text,
  windowName = 'ooting_crm_whatsapp_session',
}: WhatsAppShareOptions): Window | null {
  if (typeof window === 'undefined') return null;

  const cleanPhone = sanitizeWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(text);
  const isMobile = isMobileDevice();

  // Direct target URL determination:
  // On Desktop: web.whatsapp.com bypasses the wa.me "Continue to Chat" splash screen.
  // On Mobile: api.whatsapp.com triggers the native WhatsApp app directly.
  let targetUrl: string;
  if (isMobile) {
    targetUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;
  } else {
    targetUrl = cleanPhone
      ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
      : `https://web.whatsapp.com/send?text=${encodedText}`;
  }

  try {
    // 1. Check if an existing session window is open and alive
    if (activeWhatsAppSession && !activeWhatsAppSession.closed) {
      try {
        activeWhatsAppSession.location.href = targetUrl;
        activeWhatsAppSession.focus();
        return activeWhatsAppSession;
      } catch {
        // Cross-origin navigation fallback: re-open named window
      }
    }

    // 2. Open or reuse existing named window
    // Using a named window ('ooting_crm_whatsapp_session') ensures the browser
    // re-targets the same tab rather than opening dozens of tabs.
    activeWhatsAppSession = window.open(
      targetUrl,
      windowName,
      'noopener=false'
    );

    if (activeWhatsAppSession) {
      try {
        activeWhatsAppSession.focus();
      } catch {
        // ignore focus errors
      }
    }

    return activeWhatsAppSession;
  } catch (err) {
    console.warn('Direct WhatsApp window reuse encountered error, using safe fallback:', err);
    // Safe standard fallback
    return window.open(targetUrl, '_blank');
  }
}
