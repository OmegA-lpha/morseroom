import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import { LANGUAGES } from "../i18n/languages";

/**
 * Small translation control pinned to the top-right corner. Opens a searchable
 * list of every offered language; German is the default, curated languages are
 * instant, and the rest are machine-translated on selection.
 */
export function LanguageSwitcher() {
  const { lang, setLang, loading, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find((l) => l.code === lang);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.native.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    );
  }, [query]);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="langSwitch" ref={rootRef}>
      <button
        type="button"
        className="langSwitch__btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("chooseLanguage")}
        title={t("chooseLanguage")}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9s1.3-6.5 3.8-9z"
            stroke="currentColor"
            strokeWidth="1.7"
          />
        </svg>
        <span className="langSwitch__code">{current?.code.toUpperCase() ?? lang.toUpperCase()}</span>
        {loading && <span className="langSwitch__spinner" aria-hidden="true" />}
      </button>

      {open && (
        <div className="langSwitch__menu" role="listbox">
          <input
            className="langSwitch__search"
            type="text"
            autoFocus
            placeholder={t("searchLanguage")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="langSwitch__list">
            {results.map((l) => (
              <button
                key={l.code}
                type="button"
                role="option"
                aria-selected={l.code === lang}
                className={`langSwitch__item${l.code === lang ? " isActive" : ""}`}
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <span className="langSwitch__native">{l.native}</span>
                <span className="langSwitch__name">{l.name}</span>
              </button>
            ))}
            {results.length === 0 && <div className="langSwitch__empty">—</div>}
          </div>
        </div>
      )}
    </div>
  );
}
