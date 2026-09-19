// Mirrors LANGUAGE_CHOICES in apps/story/models.py. Language is a fixed,
// code-level list (unlike genres/tags), so it's just hardcoded here rather
// than fetched from an endpoint — extend both lists together if it changes.
// `nativeLabel` is the language's own name written in itself (e.g. "Español"
// for Spanish), used where a language card should read in its own language
// rather than be described in English.
export const LANGUAGE_OPTIONS: { code: string; label: string; nativeLabel: string }[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
  { code: "fr", label: "French", nativeLabel: "Français" },
  { code: "de", label: "German", nativeLabel: "Deutsch" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português" },
  { code: "it", label: "Italian", nativeLabel: "Italiano" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "ne", label: "Nepali", nativeLabel: "नेपाली" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語" },
  { code: "ko", label: "Korean", nativeLabel: "한국어" },
  { code: "zh", label: "Chinese", nativeLabel: "中文" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية" },
  { code: "ru", label: "Russian", nativeLabel: "Русский" },
];

const LANGUAGE_LABEL_BY_CODE = new Map(LANGUAGE_OPTIONS.map((option) => [option.code, option.label]));
const LANGUAGE_NATIVE_LABEL_BY_CODE = new Map(LANGUAGE_OPTIONS.map((option) => [option.code, option.nativeLabel]));

export function getLanguageLabel(code: string): string {
  return LANGUAGE_LABEL_BY_CODE.get(code) || code.toUpperCase();
}

export function getLanguageNativeLabel(code: string): string {
  return LANGUAGE_NATIVE_LABEL_BY_CODE.get(code) || getLanguageLabel(code);
}

// "story"/"stories" in each language, for count labels on cards that already
// show the language's own name (e.g. the native-label language card on
// Discover) — so the whole card reads in that language, not just its title.
// Simplification: one plural form regardless of count (fine for Arabic/
// Russian's more elaborate plural rules in this compact card context), and
// CJK counters are given their own word rather than a true classifier.
const STORY_WORD_BY_LANG: Record<string, { singular: string; plural: string }> = {
  en: { singular: "story", plural: "stories" },
  es: { singular: "historia", plural: "historias" },
  fr: { singular: "histoire", plural: "histoires" },
  de: { singular: "Geschichte", plural: "Geschichten" },
  pt: { singular: "história", plural: "histórias" },
  it: { singular: "storia", plural: "storie" },
  hi: { singular: "कहानी", plural: "कहानियाँ" },
  ne: { singular: "कथा", plural: "कथाहरू" },
  ja: { singular: "話", plural: "話" },
  ko: { singular: "개", plural: "개" },
  zh: { singular: "篇", plural: "篇" },
  ar: { singular: "قصة", plural: "قصص" },
  ru: { singular: "история", plural: "истории" },
};

export function formatStoryCountLabel(code: string, count: number): string {
  const number = new Intl.NumberFormat(code).format(count);
  const words = STORY_WORD_BY_LANG[code] || STORY_WORD_BY_LANG.en;
  return `${number} ${count === 1 ? words.singular : words.plural}`;
}
