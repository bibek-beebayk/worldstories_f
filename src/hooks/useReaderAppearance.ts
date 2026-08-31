import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import {
  FONTS,
  THEMES,
  type CustomReaderTheme,
  type ReaderThemeConfig,
} from "@/pages/StoryReader";
import { ensureAccessibleTextColor } from "@/lib/readerContrast";

export const FONT_SIZE_MIN = 14;
export const FONT_SIZE_MAX = 30;
export const LINE_HEIGHT_MIN = 1.4;
export const LINE_HEIGHT_MAX = 2.2;

const DEFAULT_FONT_SIZE = 18;
const DEFAULT_LINE_HEIGHT = 1.8;
const DEFAULT_FONT = "literata";
const DEFAULT_THEME = "parchment";

// Font / theme / custom themes are stored under the SAME keys the HTML chapter
// reader (StoryReader) uses, so a reader's choice follows them between /read/
// and /read-along/. Font size + line height get Read-Along-specific keys —
// StoryReader deliberately doesn't persist those, but a read-along is a long
// single-track sitting where a text-size choice is expected to stick.
const KEY_FONT = "reader_font";
const KEY_THEME = "reader_theme";
const KEY_CUSTOM_THEMES = "reader_custom_themes";
const KEY_FONT_SIZE = "read_along_font_size";
const KEY_LINE_HEIGHT = "read_along_line_height";

export interface CreateCustomThemeInput {
  name: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  linkColor: string;
  isDark: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type Updater<T> = T | ((previous: T) => T);
const resolveUpdater = <T,>(value: Updater<T>, previous: T): T =>
  typeof value === "function" ? (value as (previous: T) => T)(previous) : value;

/**
 * Reader appearance state (font family, size, line height, theme, custom
 * themes) for the Read Along page, sharing the chapter reader's persisted
 * font/theme preferences.
 *
 * SSR-safe: every value initializes to the same default the server renders,
 * and persisted values are loaded in a post-mount effect. This avoids the
 * hydration mismatch (and resulting full-page style flash) that a
 * `localStorage`-reading `useState` initializer would cause — see
 * `SSR_MIGRATION_TODO.md`.
 */
export function useReaderAppearance() {
  const [fontSize, setFontSizeState] = useState(DEFAULT_FONT_SIZE);
  const [lineHeight, setLineHeightState] = useState(DEFAULT_LINE_HEIGHT);
  const [fontFamily, setFontFamily] = useState<string>(DEFAULT_FONT);
  const [theme, setTheme] = useState<string>(DEFAULT_THEME);
  const [customThemes, setCustomThemes] = useState<CustomReaderTheme[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const storedFont = localStorage.getItem(KEY_FONT);
      if (storedFont) setFontFamily(storedFont);

      const storedTheme = localStorage.getItem(KEY_THEME);
      if (storedTheme) setTheme(storedTheme);

      const storedCustom = localStorage.getItem(KEY_CUSTOM_THEMES);
      if (storedCustom) {
        const parsed = JSON.parse(storedCustom);
        if (Array.isArray(parsed)) setCustomThemes(parsed);
      }

      const storedSize = Number(localStorage.getItem(KEY_FONT_SIZE));
      if (Number.isFinite(storedSize) && storedSize > 0) {
        setFontSizeState(clamp(storedSize, FONT_SIZE_MIN, FONT_SIZE_MAX));
      }

      const storedLineHeight = Number(localStorage.getItem(KEY_LINE_HEIGHT));
      if (Number.isFinite(storedLineHeight) && storedLineHeight > 0) {
        setLineHeightState(clamp(storedLineHeight, LINE_HEIGHT_MIN, LINE_HEIGHT_MAX));
      }
    } catch {
      // Corrupt/unavailable storage — keep defaults.
    }
    setHydrated(true);
  }, []);

  // The `hydrated` guard stops the first render pass (still on defaults)
  // from overwriting a returning reader's stored preferences.
  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY_FONT, fontFamily);
  }, [hydrated, fontFamily]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY_THEME, theme);
  }, [hydrated, theme]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY_CUSTOM_THEMES, JSON.stringify(customThemes));
  }, [hydrated, customThemes]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY_FONT_SIZE, String(fontSize));
  }, [hydrated, fontSize]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY_LINE_HEIGHT, String(lineHeight));
  }, [hydrated, lineHeight]);

  const themeOptions = useMemo<Record<string, ReaderThemeConfig>>(() => {
    const customThemeMap: Record<string, ReaderThemeConfig> = {};

    for (const item of customThemes) {
      const textColor = ensureAccessibleTextColor(item.textColor, item.bgColor);
      const linkColor = ensureAccessibleTextColor(item.linkColor, item.bgColor);
      customThemeMap[item.key] = {
        label: item.label,
        cardClass: "border",
        proseClass: item.isDark ? "prose-invert" : "prose-slate",
        cardStyle: {
          backgroundColor: item.bgColor,
          borderColor: item.borderColor,
          color: textColor,
        },
        proseStyle: {
          color: textColor,
          "--tw-prose-body": textColor,
          "--tw-prose-headings": textColor,
          "--tw-prose-links": linkColor,
          "--tw-prose-bold": textColor,
          "--tw-prose-counters": textColor,
          "--tw-prose-bullets": textColor,
        } as CSSProperties,
        isDark: item.isDark,
      };
    }

    return { ...THEMES, ...customThemeMap };
  }, [customThemes]);

  useEffect(() => {
    if (hydrated && !themeOptions[theme]) setTheme(DEFAULT_THEME);
  }, [hydrated, themeOptions, theme]);

  const setFontSize = (value: Updater<number>) =>
    setFontSizeState((previous) => clamp(resolveUpdater(value, previous), FONT_SIZE_MIN, FONT_SIZE_MAX));

  const setLineHeight = (value: Updater<number>) =>
    setLineHeightState((previous) => {
      const next = clamp(resolveUpdater(value, previous), LINE_HEIGHT_MIN, LINE_HEIGHT_MAX);
      return Number(next.toFixed(1));
    });

  const createCustomTheme = (input: CreateCustomThemeInput): string => {
    const key = `custom-${Date.now()}`;
    const nextTheme: CustomReaderTheme = {
      key,
      label: input.name.trim().slice(0, 24),
      bgColor: input.bgColor,
      borderColor: input.borderColor,
      textColor: input.textColor,
      linkColor: input.linkColor,
      isDark: input.isDark,
    };
    setCustomThemes((previous) => [nextTheme, ...previous]);
    setTheme(key);
    return key;
  };

  const activeTheme = themeOptions[theme] || THEMES[DEFAULT_THEME];
  const isDarkReaderTheme = theme === "night" || Boolean(activeTheme.isDark);
  const nightTextClass = theme === "night" ? "[&_*]:!text-slate-300 [&_a]:!text-sky-300" : "";
  const proseNightVars: CSSProperties =
    theme === "night"
      ? ({
          color: "#cbd5e1",
          "--tw-prose-body": "#cbd5e1",
          "--tw-prose-headings": "#e2e8f0",
          "--tw-prose-links": "#93c5fd",
          "--tw-prose-bold": "#e2e8f0",
          "--tw-prose-counters": "#94a3b8",
          "--tw-prose-bullets": "#64748b",
        } as CSSProperties)
      : {};

  const typographyStyle: CSSProperties = {
    fontSize: `${fontSize}px`,
    lineHeight,
    fontFamily: FONTS[fontFamily]?.value ?? FONTS[DEFAULT_FONT].value,
    ...activeTheme.proseStyle,
    ...proseNightVars,
  };

  const proseClassName = cn(
    "prose max-w-none leading-relaxed",
    activeTheme.proseClass,
    nightTextClass,
    "m-0 p-0 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
  );

  return {
    fontSize,
    setFontSize,
    lineHeight,
    setLineHeight,
    fontFamily,
    setFontFamily,
    theme,
    setTheme,
    customThemes,
    createCustomTheme,
    themeOptions,
    activeTheme,
    isDarkReaderTheme,
    typographyStyle,
    proseClassName,
  };
}
