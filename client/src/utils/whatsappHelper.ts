/**
 * WhatsApp Integration & Session Manager for Ooting CRM
 * 
 * Objectives:
 * 1. Single-Session / Window Reuse:
 *    Reuses the existing WhatsApp Web tab/window using standard window target ('whatsapp').
 *    Never passes a 3rd windowFeatures argument, as in Chromium/Chrome any 3rd argument
 *    forces Chrome to open a new popup window rather than reusing an existing tab.
 * 
 * 2. Instant Clipboard Sync:
 *    Automatically writes the full message to the system clipboard (navigator.clipboard.writeText).
 *    If the user already has WhatsApp Web open in Chrome from an earlier session,
 *    they can switch to that tab and simply press Ctrl+V to send immediately.
 * 
 * 3. Direct Web & App Dispatch:
 *    On desktop, connects to https://web.whatsapp.com/send (bypassing the intermediate wa.me landing page).
 *    On mobile devices, launches native WhatsApp via https://api.whatsapp.com/send.
 * 
 * 4. Safe Phone Number Sanitization:
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

/**
 * Safely copy text to clipboard with fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch {
    return false;
  }
}

export interface WhatsAppShareOptions {
  phone?: string | null;
  text: string;
  windowName?: string;
}

/**
 * Open WhatsApp with active tab/session reuse to prevent repeated login prompts & extra tabs.
 * Also copies the message text to clipboard so it's ready to paste into any open WhatsApp tab.
 */
export function openWhatsAppShare({
  phone,
  text,
  windowName = 'whatsapp',
}: WhatsAppShareOptions): Window | null {
  if (typeof window === 'undefined') return null;

  // 1. Always copy text to clipboard for zero-effort manual paste if user already has WhatsApp open
  copyToClipboard(text).catch(() => {});

  const cleanPhone = sanitizeWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(text);
  const isMobile = isMobileDevice();

  // Direct target URL determination:
  // On Desktop: web.whatsapp.com directly opens the contact chat.
  // On Mobile: api.whatsapp.com triggers the native WhatsApp app.
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
    // Check if an existing session window is open and alive in memory
    if (activeWhatsAppSession && !activeWhatsAppSession.closed) {
      try {
        activeWhatsAppSession.location.href = targetUrl;
        activeWhatsAppSession.focus();
        return activeWhatsAppSession;
      } catch {
        // Cross-origin restriction fallback
      }
    }

    // Standard DOM anchor click targeting named window 'whatsapp'
    // In Chromium / Chrome, using an anchor with target="whatsapp" without any
    // window features is the most reliable mechanism to reuse the existing tab
    // and never open duplicate tabs.
    const link = document.createElement('a');
    link.href = targetUrl;
    link.target = windowName;
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Keep named window reference if possible
    try {
      activeWhatsAppSession = window.open('', windowName);
      if (activeWhatsAppSession) {
        activeWhatsAppSession.focus();
      }
    } catch {}

    return activeWhatsAppSession;
  } catch (err) {
    console.warn('WhatsApp tab reuse encountered error, using standard fallback:', err);
    return window.open(targetUrl, windowName);
  }
}
