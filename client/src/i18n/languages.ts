// The set of languages offered in the translation picker. `code` is the value
// passed to the runtime translator (Google-compatible codes); `native` is what
// we show in the list so speakers recognise their own language; `rtl` flips the
// document direction. German ("de") is the base/source language – every other
// entry that isn't curated is machine-translated from it on demand.
export interface Language {
  code: string;
  /** English name (used for searching). */
  name: string;
  /** Endonym – shown in the picker. */
  native: string;
  rtl?: boolean;
}

export const LANGUAGES: Language[] = [
  { code: "de", name: "German", native: "Deutsch" },
  { code: "en", name: "English", native: "English" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "fr", name: "French", native: "Français" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "it", name: "Italian", native: "Italiano" },
  { code: "nl", name: "Dutch", native: "Nederlands" },
  { code: "pl", name: "Polish", native: "Polski" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "uk", name: "Ukrainian", native: "Українська" },
  { code: "cs", name: "Czech", native: "Čeština" },
  { code: "sk", name: "Slovak", native: "Slovenčina" },
  { code: "sl", name: "Slovenian", native: "Slovenščina" },
  { code: "hr", name: "Croatian", native: "Hrvatski" },
  { code: "bs", name: "Bosnian", native: "Bosanski" },
  { code: "sr", name: "Serbian", native: "Српски" },
  { code: "bg", name: "Bulgarian", native: "Български" },
  { code: "mk", name: "Macedonian", native: "Македонски" },
  { code: "ro", name: "Romanian", native: "Română" },
  { code: "hu", name: "Hungarian", native: "Magyar" },
  { code: "el", name: "Greek", native: "Ελληνικά" },
  { code: "tr", name: "Turkish", native: "Türkçe" },
  { code: "fi", name: "Finnish", native: "Suomi" },
  { code: "sv", name: "Swedish", native: "Svenska" },
  { code: "da", name: "Danish", native: "Dansk" },
  { code: "no", name: "Norwegian", native: "Norsk" },
  { code: "is", name: "Icelandic", native: "Íslenska" },
  { code: "et", name: "Estonian", native: "Eesti" },
  { code: "lv", name: "Latvian", native: "Latviešu" },
  { code: "lt", name: "Lithuanian", native: "Lietuvių" },
  { code: "be", name: "Belarusian", native: "Беларуская" },
  { code: "ca", name: "Catalan", native: "Català" },
  { code: "gl", name: "Galician", native: "Galego" },
  { code: "eu", name: "Basque", native: "Euskara" },
  { code: "ga", name: "Irish", native: "Gaeilge" },
  { code: "cy", name: "Welsh", native: "Cymraeg" },
  { code: "lb", name: "Luxembourgish", native: "Lëtzebuergesch" },
  { code: "mt", name: "Maltese", native: "Malti" },
  { code: "sq", name: "Albanian", native: "Shqip" },
  { code: "hy", name: "Armenian", native: "Հայերեն" },
  { code: "ka", name: "Georgian", native: "ქართული" },
  { code: "az", name: "Azerbaijani", native: "Azərbaycan" },
  { code: "kk", name: "Kazakh", native: "Қазақ" },
  { code: "ky", name: "Kyrgyz", native: "Кыргызча" },
  { code: "uz", name: "Uzbek", native: "Oʻzbek" },
  { code: "tg", name: "Tajik", native: "Тоҷикӣ" },
  { code: "mn", name: "Mongolian", native: "Монгол" },
  { code: "ar", name: "Arabic", native: "العربية", rtl: true },
  { code: "he", name: "Hebrew", native: "עברית", rtl: true },
  { code: "fa", name: "Persian", native: "فارسی", rtl: true },
  { code: "ur", name: "Urdu", native: "اردو", rtl: true },
  { code: "ps", name: "Pashto", native: "پښتو", rtl: true },
  { code: "yi", name: "Yiddish", native: "ייִדיש", rtl: true },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", native: "മലയാളം" },
  { code: "si", name: "Sinhala", native: "සිංහල" },
  { code: "ne", name: "Nepali", native: "नेपाली" },
  { code: "th", name: "Thai", native: "ไทย" },
  { code: "lo", name: "Lao", native: "ລາວ" },
  { code: "km", name: "Khmer", native: "ខ្មែរ" },
  { code: "my", name: "Burmese", native: "မြန်မာ" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia" },
  { code: "ms", name: "Malay", native: "Bahasa Melayu" },
  { code: "tl", name: "Filipino", native: "Filipino" },
  { code: "jv", name: "Javanese", native: "Basa Jawa" },
  { code: "zh-CN", name: "Chinese (Simplified)", native: "简体中文" },
  { code: "zh-TW", name: "Chinese (Traditional)", native: "繁體中文" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "ko", name: "Korean", native: "한국어" },
  { code: "sw", name: "Swahili", native: "Kiswahili" },
  { code: "am", name: "Amharic", native: "አማርኛ" },
  { code: "ha", name: "Hausa", native: "Hausa" },
  { code: "yo", name: "Yoruba", native: "Yorùbá" },
  { code: "ig", name: "Igbo", native: "Igbo" },
  { code: "so", name: "Somali", native: "Soomaali" },
  { code: "af", name: "Afrikaans", native: "Afrikaans" },
  { code: "zu", name: "Zulu", native: "isiZulu" },
  { code: "xh", name: "Xhosa", native: "isiXhosa" },
];

const RTL_CODES = new Set(LANGUAGES.filter((l) => l.rtl).map((l) => l.code));

export function isRtl(code: string): boolean {
  return RTL_CODES.has(code);
}

const SUPPORTED = new Set(LANGUAGES.map((l) => l.code));

/**
 * Pick the best supported language for a browser-provided tag list.
 * Tries exact matches first (e.g. "zh-CN"), then the primary subtag
 * ("pt-BR" -> "pt"). Returns null when nothing matches.
 */
export function matchBrowserLanguage(tags: readonly string[]): string | null {
  for (const raw of tags) {
    if (!raw) continue;
    const tag = raw.trim();
    // exact, case-insensitive
    const exact = LANGUAGES.find((l) => l.code.toLowerCase() === tag.toLowerCase());
    if (exact) return exact.code;
    // primary subtag ("en-GB" -> "en")
    const primary = tag.split("-")[0].toLowerCase();
    if (SUPPORTED.has(primary)) return primary;
    const byPrimary = LANGUAGES.find((l) => l.code.split("-")[0].toLowerCase() === primary);
    if (byPrimary) return byPrimary.code;
  }
  return null;
}
