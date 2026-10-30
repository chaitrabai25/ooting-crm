/**
 * WhatsApp Integration & Session Manager for Ooting CRM
 * 
 * 1. Single-Session / Window Reuse:
 *    Maintains a single open WhatsApp window reference and targets a fixed window name ('ooting_whatsapp_window').
 *    Does NOT use rel="noreferrer" on anchors, which forces Chrome to isolate and spawn separate tabs.
 * 
 * 2. Instant Clipboard Sync:
 *    Automatically writes the full message to the system clipboard (navigator.clipboard.writeText)
 *    so user can also paste directly into WhatsApp if preferred.
 * 
 * 3. Direct Web & App Dispatch:
 *    On desktop, connects to https://web.whatsapp.com/send directly.
 *    On mobile devices, launches native WhatsApp via https://api.whatsapp.com/send.
 */

let activeWhatsAppSession: Window | null = null;

export function sanitizeWhatsAppPhone(phone?: string | null): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
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

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

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
 * Open WhatsApp with strict single-tab session reuse in Chrome.
 * Never opens multiple tabs.
 */
export function openWhatsAppShare({
  phone,
  text,
  windowName = 'ooting_whatsapp_window',
}: WhatsAppShareOptions): Window | null {
  if (typeof window === 'undefined') return null;

  copyToClipboard(text).catch(() => {});

  const cleanPhone = sanitizeWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(text);
  const isMobile = isMobileDevice();

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
    // 1. If we have an existing open session window in memory, navigate it directly!
    if (activeWhatsAppSession && !activeWhatsAppSession.closed) {
      try {
        activeWhatsAppSession.location.href = targetUrl;
        activeWhatsAppSession.focus();
        return activeWhatsAppSession;
      } catch (_) {
        // Fall back to window.open if cross-origin navigation is blocked
      }
    }

    // 2. Open named window. In Chrome, calling window.open with the same target name
    // reuses the exact same tab and avoids opening duplicate tabs.
    activeWhatsAppSession = window.open(targetUrl, windowName);
    if (activeWhatsAppSession) {
      try {
        activeWhatsAppSession.focus();
      } catch (_) {}
    }
    return activeWhatsAppSession;
  } catch (err) {
    console.warn('Error opening WhatsApp tab:', err);
    return window.open(targetUrl, windowName);
  }
}
