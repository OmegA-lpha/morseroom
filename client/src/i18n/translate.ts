import { BASE_LANG, STRINGS_VERSION, type Dict, type StringKey } from "./strings";

// On-demand machine translation for languages we don't ship curated
// dictionaries for. Source is always the German base dictionary. Results are
// cached in localStorage keyed by language + strings version, so a language is
// only fetched from the network once (until the base strings change).

const CACHE_PREFIX = "morseroom.i18n.";

function cacheKey(lang: string): string {
  return `${CACHE_PREFIX}${lang}.v${STRINGS_VERSION}`;
}

export function loadCachedDict(lang: string): Dict | null {
  try {
    const raw = window.localStorage.getItem(cacheKey(lang));
    if (!raw) return null;
    return JSON.parse(raw) as Dict;
  } catch {
    return null;
  }
}

function saveCachedDict(lang: string, dict: Dict): void {
  try {
    window.localStorage.setItem(cacheKey(lang), JSON.stringify(dict));
  } catch {
    // storage full or unavailable – translations just won't persist
  }
}

// Placeholders like {name} sometimes get mangled by the translator (the text
// inside the braces can be translated too), so we swap each one for an inert
// token that survives translation, then restore it afterwards.
function protect(text: string, tokens: string[]): string {
  return text.replace(/\{[a-zA-Z0-9]+\}/g, (match) => {
    const token = `__${tokens.length}__`;
    tokens.push(match);
    return token;
  });
}

function restore(text: string, tokens: string[]): string {
  return text.replace(/__(\d+)__/g, (whole, index) => tokens[Number(index)] ?? whole);
}

interface GtxSegment {
  0: string;
}

async function callTranslator(text: string, target: string): Promise<string | null> {
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx" +
    `&sl=${encodeURIComponent(BASE_LANG)}&tl=${encodeURIComponent(target)}` +
    `&dt=t&q=${encodeURIComponent(text)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as [GtxSegment[] | null, ...unknown[]];
    const segments = data[0];
    if (!Array.isArray(segments)) return null;
    return segments.map((s) => s[0]).join("");
  } catch {
    return null;
  }
}

/**
 * Translate the whole base dictionary into `target`. All strings are joined
 * with newlines into a single request (newlines are preserved by the
 * translator), then split back apart. Returns null if anything doesn't line up
 * so callers can fall back to the base language.
 */
export async function fetchTranslations(target: string, base: Dict): Promise<Dict | null> {
  const keys = Object.keys(base) as StringKey[];
  const tokens: string[] = [];
  const joined = keys.map((k) => protect(base[k], tokens)).join("\n");

  const translatedJoined = await callTranslator(joined, target);
  if (translatedJoined == null) return null;

  const parts = restore(translatedJoined, tokens).split("\n");
  if (parts.length !== keys.length) return null;

  const dict = {} as Dict;
  keys.forEach((key, i) => {
    const value = parts[i].trim();
    dict[key] = value || base[key];
  });

  saveCachedDict(target, dict);
  return dict;
}
