/**
 * High-performance Translation Service with Token Preservation & Client Caching
 * Preserves Prices, Currency, Phone Numbers, IDs, URLs, and Business Codes.
 */

import { Language, translateKey } from '../i18n/translations.js';

interface TokenProtectionResult {
  protectedText: string;
  tokens: Record<string, string>;
}

export class TranslatorService {
  private static caches: Record<Language, Map<string, string>> = {
    en: new Map(),
    kn: new Map(),
    hi: new Map(),
  };

  private static inFlightRequests: Set<string> = new Set();
  private static listeners: Set<() => void> = new Set();
  private static isInitialized = false;

  /**
   * Initialize local storage cache
   */
  public static init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      (['kn', 'hi'] as Language[]).forEach((lang) => {
        const stored = localStorage.getItem(`ooting_crm_cache_${lang}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          Object.entries(parsed).forEach(([k, v]) => {
            if (typeof v === 'string') {
              this.caches[lang].set(k, v);
            }
          });
        }
      });
    } catch (e) {
      // quiet fallback
    }
  }

  /**
   * Subscribe to cache updates (triggers UI re-render when new translations arrive)
   */
  public static subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private static notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch {
        // ignore subscriber errors
      }
    });
  }

  /**
   * Protect critical patterns (Currency, IDs, Phone, Email, URLs) from being altered
   */
  public static protectTokens(text: string): TokenProtectionResult {
    const tokens: Record<string, string> = {};
    let counter = 0;

    let protectedText = text;

    // 1. URLs & Emails
    protectedText = protectedText.replace(/https?:\/\/[^\s]+/g, (match) => {
      const key = `__URL_${counter++}__`;
      tokens[key] = match;
      return key;
    });

    protectedText = protectedText.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, (match) => {
      const key = `__EMAIL_${counter++}__`;
      tokens[key] = match;
      return key;
    });

    // 2. Prices & Currency (₹, INR, Rs., $)
    protectedText = protectedText.replace(/(?:₹|Rs\.?|INR|\$)\s*[\d,]+(?:\.\d+)?/gi, (match) => {
      const key = `__PRICE_${counter++}__`;
      tokens[key] = match;
      return key;
    });

    // 3. System Codes & Identifiers (e.g. PKG-1002, BKG-2024-001, QTN-889, ORG-001)
    protectedText = protectedText.replace(/\b[A-Z0-9]{2,10}-[A-Z0-9-]{3,}\b/g, (match) => {
      const key = `__CODE_${counter++}__`;
      tokens[key] = match;
      return key;
    });

    // 4. UUIDs
    protectedText = protectedText.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, (match) => {
      const key = `__UUID_${counter++}__`;
      tokens[key] = match;
      return key;
    });

    // 5. Phone numbers
    protectedText = protectedText.replace(/(?:\+91[\-\s]?)?[6-9]\d{9}\b/g, (match) => {
      const key = `__PHONE_${counter++}__`;
      tokens[key] = match;
      return key;
    });

    // 6. Brand names & platform identity (Ooting, OOTING, Ooting CRM, Ooting Holidays, Ooting Tours)
    protectedText = protectedText.replace(/\bOoting(?:\s+(?:CRM|Holidays|Tours|Travels))?\b/gi, (match) => {
      const key = `__BRAND_${counter++}__`;
      tokens[key] = match;
      return key;
    });

    // 7. WhatsApp branding
    protectedText = protectedText.replace(/\bWhatsApp(?:\s+(?:Web|Business|API))?\b/gi, (match) => {
      const key = `__WAPP_${counter++}__`;
      tokens[key] = match;
      return key;
    });

    return { protectedText, tokens };
  }

  /**
   * Re-insert protected tokens into translated text and guarantee brand name preservation
   */
  public static restoreTokens(translatedText: string, tokens: Record<string, string>): string {
    let result = translatedText;
    Object.entries(tokens).forEach(([token, original]) => {
      // Replace with global regex matching
      result = result.split(token).join(original);
      // Also check space-split variations
      const spacedToken = token.replace(/_/g, ' ');
      result = result.split(spacedToken).join(original);
    });

    // Safeguard: Map any accidental Kannada/Hindi transliterations of Ooting back to English "Ooting"
    result = result.replace(/(?:ಊಟಿಂಗ್|ಔಟಿಂಗ್|ಊಟಿಂಗ|ಒಟಿಂಗ್|ಊಟೀಂಗ್|ऊटिंग|उटिंग|ऊटींग|ओटिंग|औटिंग)/gi, 'Ooting');
    result = result.replace(/(?:Ooting\s+ಸಿಆರ್‌ಎಂ|Ooting\s+सीआरएम)/gi, 'Ooting CRM');

    return result;
  }

  /**
   * Synchronously translate text. If not in cache/dictionary, returns original
   * and queues background translation if language != 'en'.
   */
  public static translate(text: string, targetLang: Language): string {
    if (!text || targetLang === 'en') return text;
    const trimmed = text.trim();
    if (!trimmed || trimmed.length <= 1) return text;

    // Strictly preserve Ooting and WhatsApp brand names in English across all languages
    if (/^(?:ooting(?:\s+(?:crm|holidays|tours|travels))?|whatsapp)$/i.test(trimmed)) {
      return text;
    }

    // Check if whole text is numeric or symbols
    if (/^[\d\s.,:;!?₹$%#@&*()\-+=/\\|<>\[\]{}'"]+$/.test(trimmed)) {
      return text;
    }

    this.init();

    // 1. Direct dictionary lookup
    const dictMatch = translateKey(trimmed, targetLang);
    if (dictMatch) {
      return text.replace(trimmed, dictMatch);
    }

    // 2. Cache lookup
    const cached = this.caches[targetLang].get(trimmed);
    if (cached) {
      return text.replace(trimmed, cached);
    }

    // 3. Queue non-blocking background translation
    this.queueBackgroundTranslation(trimmed, targetLang);

    return text;
  }

  /**
   * Asynchronously fetch translation and persist to cache
   */
  public static async translateAsync(text: string, targetLang: Language): Promise<string> {
    if (!text || targetLang === 'en') return text;
    const trimmed = text.trim();
    if (!trimmed || trimmed.length <= 1) return text;

    // Strictly preserve Ooting and WhatsApp brand names in English across all languages
    if (/^(?:ooting(?:\s+(?:crm|holidays|tours|travels))?|whatsapp)$/i.test(trimmed)) {
      return text;
    }

    this.init();

    const dictMatch = translateKey(trimmed, targetLang);
    if (dictMatch) return dictMatch;

    const cached = this.caches[targetLang].get(trimmed);
    if (cached) return cached;

    return await this.fetchTranslation(trimmed, targetLang);
  }

  /**
   * Queue background translation without blocking UI
   */
  private static queueBackgroundTranslation(text: string, targetLang: Language) {
    const key = `${targetLang}:${text}`;
    if (this.inFlightRequests.has(key)) return;
    this.inFlightRequests.add(key);

    // Asynchronous non-blocking call
    setTimeout(async () => {
      try {
        await this.fetchTranslation(text, targetLang);
      } catch {
        // silent fail - UI continues safely
      } finally {
        this.inFlightRequests.delete(key);
      }
    }, 10);
  }

  /**
   * Fetch from translation API with token protection
   */
  private static async fetchTranslation(text: string, targetLang: Language): Promise<string> {
    const { protectedText, tokens } = this.protectTokens(text);

    try {
      // Use lightweight public Google Translate GTX client API
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(protectedText)}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      let rawTranslated = '';
      if (Array.isArray(data) && Array.isArray(data[0])) {
        rawTranslated = data[0].map((item: any) => item[0]).join('');
      }

      if (rawTranslated && rawTranslated.trim()) {
        const finalTranslated = this.restoreTokens(rawTranslated, tokens);
        this.saveToCache(text, finalTranslated, targetLang);
        this.notifyListeners();
        return finalTranslated;
      }
    } catch {
      // If external translation fails, fallback gracefully to original text
    }

    return text;
  }

  /**
   * Save translation to memory map and localStorage
   */
  private static saveToCache(original: string, translated: string, targetLang: Language) {
    this.caches[targetLang].set(original, translated);

    try {
      const storageKey = `ooting_crm_cache_${targetLang}`;
      const existing = localStorage.getItem(storageKey);
      const parsed = existing ? JSON.parse(existing) : {};
      parsed[original] = translated;

      // Limit stored cache items to 1500 to keep localStorage healthy
      const keys = Object.keys(parsed);
      if (keys.length > 1500) {
        delete parsed[keys[0]];
      }

      localStorage.setItem(storageKey, JSON.stringify(parsed));
    } catch {
      // localStorage may be full or disabled
    }
  }
}
