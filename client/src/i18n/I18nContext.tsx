import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CURATED, BASE_LANG, type Dict, type StringKey } from "./strings";
import { isRtl, matchBrowserLanguage } from "./languages";
import { fetchTranslations, loadCachedDict } from "./translate";

const LANG_KEY = "morseroom.lang";

type Params = Record<string, string | number>;

interface I18nValue {
  lang: string;
  setLang: (lang: string) => void;
  /** True while a machine translation for the current language is loading. */
  loading: boolean;
  t: (key: StringKey, params?: Params) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

/**
 * Initial language: an explicit stored choice wins; otherwise we honour what
 * the browser asks for; German is the fallback default.
 */
function detectInitialLang(): string {
  try {
    const stored = window.localStorage.getItem(LANG_KEY);
    if (stored) return stored;
  } catch {
    // ignore – fall through to browser detection
  }
  const tags = navigator.languages?.length ? navigator.languages : [navigator.language];
  return matchBrowserLanguage(tags) ?? BASE_LANG;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<string>(detectInitialLang);
  const [dicts, setDicts] = useState<Record<string, Dict>>(CURATED);

  const dict = dicts[lang] ?? CURATED[BASE_LANG];
  const loading = !dicts[lang];

  // Keep <html lang> / dir in sync for accessibility and RTL scripts.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl(lang) ? "rtl" : "ltr";
  }, [lang]);

  // Fetch (or restore from cache) a machine translation for non-curated langs.
  useEffect(() => {
    if (dicts[lang]) return;

    const cached = loadCachedDict(lang);
    if (cached) {
      setDicts((prev) => ({ ...prev, [lang]: cached }));
      return;
    }

    let cancelled = false;
    fetchTranslations(lang, CURATED[BASE_LANG]).then((result) => {
      if (cancelled || !result) return;
      setDicts((prev) => ({ ...prev, [lang]: result }));
    });
    return () => {
      cancelled = true;
    };
  }, [lang, dicts]);

  const setLang = useCallback((next: string) => {
    setLangState(next);
    try {
      window.localStorage.setItem(LANG_KEY, next);
    } catch {
      // ignore – language just won't persist across reloads
    }
  }, []);

  const t = useCallback(
    (key: StringKey, params?: Params) => {
      let value = dict[key] ?? CURATED[BASE_LANG][key] ?? key;
      if (params) {
        for (const [name, replacement] of Object.entries(params)) {
          value = value.split(`{${name}}`).join(String(replacement));
        }
      }
      return value;
    },
    [dict]
  );

  const value = useMemo<I18nValue>(() => ({ lang, setLang, loading, t }), [lang, setLang, loading, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
