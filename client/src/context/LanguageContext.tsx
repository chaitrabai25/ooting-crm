import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  Language,
  SUPPORTED_LANGUAGES,
  LanguageOption,
  DICTIONARY,
  translateKey,
} from '../i18n/translations.js';
import { TranslatorService } from '../services/translator.service.js';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (keyOrText: string, fallback?: string) => string;
  translateAsync: (text: string) => Promise<string>;
  languages: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// WeakMap to store original English text for each DOM text node
const originalTextMap = new WeakMap<Node, string>();

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('ooting_crm_language') as Language;
      if (saved && (saved === 'en' || saved === 'kn' || saved === 'hi')) {
        return saved;
      }
    } catch {
      // fallback
    }
    return 'en';
  });

  const isTranslatingRef = useRef(false);
  const scheduledPassRef = useRef<number | null>(null);

  // Initialize translator service
  useEffect(() => {
    TranslatorService.init();
  }, []);

  const setLanguage = useCallback((newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem('ooting_crm_language', newLang);
    } catch {
      // silent fallback
    }
  }, []);

  /**
   * Helper function to translate keys or English texts
   */
  const t = useCallback(
    (keyOrText: string, fallback?: string): string => {
      if (!keyOrText) return fallback || '';
      if (language === 'en') return fallback || keyOrText;

      // 1. Check pre-compiled dictionary key
      if (DICTIONARY[language]?.[keyOrText]) {
        return DICTIONARY[language][keyOrText];
      }

      // 2. Check pre-compiled dictionary reverse index
      const direct = translateKey(keyOrText, language);
      if (direct) return direct;

      // 3. Fallback to TranslatorService
      return TranslatorService.translate(keyOrText, language);
    },
    [language]
  );

  const translateAsync = useCallback(
    async (text: string): Promise<string> => {
      return TranslatorService.translateAsync(text, language);
    },
    [language]
  );

  /**
   * Automated DOM Text Node Translation Engine
   * Walks DOM text nodes, translates text content into selected language,
   * and preserves exact original text when reverting to English.
   */
  const runDomTranslationPass = useCallback(() => {
    if (typeof document === 'undefined' || isTranslatingRef.current) return;
    isTranslatingRef.current = true;

    try {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;

            const tag = parent.tagName.toLowerCase();
            if (
              tag === 'script' ||
              tag === 'style' ||
              tag === 'noscript' ||
              tag === 'input' ||
              tag === 'textarea' ||
              tag === 'code' ||
              tag === 'pre' ||
              tag === 'svg' ||
              parent.isContentEditable ||
              parent.closest('[data-no-translate="true"]')
            ) {
              return NodeFilter.FILTER_REJECT;
            }

            const val = node.nodeValue?.trim();
            if (!val || val.length <= 1) return NodeFilter.FILTER_REJECT;

            // Reject pure numbers and punctuation
            if (/^[\d\s.,:;!?₹$%#@&*()\-+=/\\|<>\[\]{}'"]+$/.test(val)) {
              return NodeFilter.FILTER_REJECT;
            }

            // Strictly protect Ooting brand name from being translated in any language
            if (/^ooting(?:\s+(?:crm|holidays|tours))?$/i.test(val)) {
              return NodeFilter.FILTER_REJECT;
            }

            return NodeFilter.FILTER_ACCEPT;
          },
        }
      );

      let currentNode = walker.nextNode();
      while (currentNode) {
        let original = originalTextMap.get(currentNode);
        if (!original) {
          original = currentNode.nodeValue || '';
          originalTextMap.set(currentNode, original);
        }

        if (language === 'en') {
          // Restore original English text
          if (currentNode.nodeValue !== original) {
            currentNode.nodeValue = original;
          }
        } else {
          // Translate to Kannada or Hindi
          const translated = TranslatorService.translate(original, language);
          if (translated && currentNode.nodeValue !== translated) {
            currentNode.nodeValue = translated;
          }
        }

        currentNode = walker.nextNode();
      }
    } finally {
      isTranslatingRef.current = false;
    }
  }, [language]);

  const scheduleTranslationPass = useCallback(() => {
    if (scheduledPassRef.current) {
      cancelAnimationFrame(scheduledPassRef.current);
    }
    scheduledPassRef.current = requestAnimationFrame(() => {
      runDomTranslationPass();
    });
  }, [runDomTranslationPass]);

  // Run DOM translation and sync html lang/font classes whenever language changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      document.documentElement.classList.toggle('lang-kn', language === 'kn');
    }

    scheduleTranslationPass();

    // Listen for incoming async translations
    const unsubscribe = TranslatorService.subscribe(() => {
      if (language !== 'en') {
        scheduleTranslationPass();
      }
    });

    // Observe dynamic DOM mutations (page transitions, tabs, modals)
    const observer = new MutationObserver(() => {
      if (!isTranslatingRef.current) {
        scheduleTranslationPass();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: false,
    });

    return () => {
      unsubscribe();
      observer.disconnect();
      if (scheduledPassRef.current) {
        cancelAnimationFrame(scheduledPassRef.current);
      }
    };
  }, [language, scheduleTranslationPass]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        translateAsync,
        languages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
