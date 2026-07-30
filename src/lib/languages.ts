// Mirrors LANGUAGE_CHOICES in apps/story/models.py. Language is a fixed,
// code-level list (unlike genres/tags), so it's just hardcoded here rather
// than fetched from an endpoint — extend both lists together if it changes.
export const LANGUAGE_OPTIONS: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" },
  { code: "it", label: "Italian" },
  { code: "hi", label: "Hindi" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese" },
  { code: "ar", label: "Arabic" },
  { code: "ru", label: "Russian" },
];

const LANGUAGE_LABEL_BY_CODE = new Map(LANGUAGE_OPTIONS.map((option) => [option.code, option.label]));

export function getLanguageLabel(code: string): string {
  return LANGUAGE_LABEL_BY_CODE.get(code) || code.toUpperCase();
}
