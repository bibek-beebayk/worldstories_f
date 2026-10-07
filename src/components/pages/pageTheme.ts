import type { CSSProperties } from "react";
import type { PageContentWidth, PageSectionSpacing, PageThemeValues, ThemeLookValues } from "@/api/types";

/**
 * Google Fonts a page theme may use → the weights to request. Keep in step
 * with PAGE_FONT_NAMES in apps/pages/models.py. Single-weight display fonts
 * request no axis at all: asking Google for a weight a family doesn't have
 * fails the whole stylesheet.
 */
export const PAGE_FONTS: Record<string, string> = {
  Inter: "400;700",
  Roboto: "400;700",
  "Open Sans": "400;700",
  Lato: "400;700",
  Montserrat: "400;700",
  Poppins: "400;700",
  Nunito: "400;700",
  "Space Grotesk": "400;700",
  "DM Sans": "400;700",
  Raleway: "400;700",
  Merriweather: "400;700",
  Lora: "400;700",
  "Playfair Display": "400;700",
  "Libre Baskerville": "400;700",
  "Crimson Pro": "400;700",
  "EB Garamond": "400;700",
  "Cormorant Garamond": "400;700",
  Cinzel: "400;700",
  "Bebas Neue": "",
  Oswald: "400;700",
  "Abril Fatface": "",
  "Dancing Script": "400;700",
  Pacifico: "",
  Caveat: "400;700",
  Creepster: "",
  Nosifer: "",
  "Mountains of Christmas": "400;700",
  "Special Elite": "",
  "Press Start 2P": "",
};

export const PAGE_FONT_NAMES = Object.keys(PAGE_FONTS);

/** One stylesheet URL for the theme's fonts, or null when it uses the site's. */
export const themeFontsUrl = (theme: Pick<PageThemeValues, "heading_font" | "body_font">) => {
  const families = [...new Set([theme.heading_font, theme.body_font])].filter((name) => name && name in PAGE_FONTS);
  if (families.length === 0) return null;
  const params = families
    .map((name) => {
      const weights = PAGE_FONTS[name];
      return `family=${encodeURIComponent(name).replace(/%20/g, "+")}${weights ? `:wght@${weights}` : ""}`;
    })
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
};

export const fontStack = (name: string) => (name ? `'${name}', ` : "") + "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

/** "#ed405a" → "351 83% 59%", the HSL triplet format the site's CSS variables use. */
export const hexToHslTriplet = (hex: string) => {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return "0 0% 0%";
  const value = parseInt(match[1], 16);
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

/** An HSL triplet for `hex` with its lightness and saturation scaled — for
 *  deriving a gradient's darker stops from one colour. */
const shadeTriplet = (hex: string, lightness: number, saturation = 1) => {
  const [h, s, l] = hexToHslTriplet(hex).split(" ").map((part) => parseFloat(part));
  return `${h} ${Math.round(s * saturation)}% ${Math.round(l * lightness)}%`;
};

/**
 * The look as the site's own design-system variables (--background,
 * --primary, --card, …). Setting these on an element re-themes every shared
 * component inside it — buttons, story cards, borders — without any of them
 * knowing about themes. Used by page themes (on the page wrapper) and site
 * themes (on :root).
 */
export const lookVariables = (theme: ThemeLookValues): Record<string, string> => {
  const text = hexToHslTriplet(theme.text_color);
  const surface = hexToHslTriplet(theme.surface_color);
  const primary = hexToHslTriplet(theme.primary_color);
  const border = hexToHslTriplet(theme.border_color);
  return {
    "--background": hexToHslTriplet(theme.background_color),
    "--foreground": text,
    "--card": surface,
    "--card-foreground": text,
    "--popover": surface,
    "--popover-foreground": text,
    "--secondary": surface,
    "--secondary-foreground": text,
    "--muted": surface,
    "--muted-foreground": hexToHslTriplet(theme.muted_text_color),
    "--primary": primary,
    "--accent": primary,
    "--ring": primary,
    "--primary-foreground": hexToHslTriplet(theme.primary_text_color),
    "--accent-foreground": hexToHslTriplet(theme.primary_text_color),
    "--border": border,
    "--input": border,
    "--radius": `${theme.radius}px`,
    // Only defined under a theme; parts of the site with their own fixed
    // colours fall back to those otherwise (see .themed-banner in index.css).
    // Banners: the accent fading darker, with the theme's "text on accent"
    // colour so banner text is always readable.
    "--theme-banner-from": `hsl(${primary})`,
    "--theme-banner-via": `hsl(${shadeTriplet(theme.primary_color, 0.8)})`,
    "--theme-banner-to": `hsl(${shadeTriplet(theme.primary_color, 0.45, 0.6)})`,
    "--theme-banner-foreground": theme.primary_text_color,
    // The soft wash at the top of some pages, and full-page backgrounds.
    "--theme-page-wash": `hsl(${surface})`,
    "--theme-page-bg": `hsl(${hexToHslTriplet(theme.background_color)})`,
  };
};

/**
 * A page theme as inline CSS custom properties: the shared look plus the
 * --pt-* ones read by the .ws-page-theme rules in index.css.
 */
export const themeStyle = (theme: PageThemeValues): CSSProperties => {
  return {
    ...lookVariables(theme),
    "--pt-heading": theme.heading_color,
    "--pt-heading-font": fontStack(theme.heading_font),
    "--pt-heading-weight": String(theme.heading_weight),
    "--pt-heading-transform": theme.heading_uppercase ? "uppercase" : "none",
    "--pt-font-size": `${theme.body_font_size}px`,
    fontFamily: fontStack(theme.body_font),
  } as CSSProperties;
};

export const CONTENT_WIDTH_CLASS: Record<PageContentWidth, string> = {
  narrow: "mx-auto max-w-3xl px-3 sm:px-4",
  normal: "container px-3 sm:px-4",
  wide: "mx-auto max-w-[1600px] px-3 sm:px-6",
  full: "w-full px-3 sm:px-6",
};

export const SECTION_SPACING_CLASS: Record<PageSectionSpacing, string> = {
  compact: "space-y-6 py-6 sm:py-8",
  normal: "space-y-10 py-8 sm:py-10 md:space-y-12 md:py-12",
  relaxed: "space-y-16 py-12 sm:py-16 md:space-y-24 md:py-20",
};

/**
 * Custom CSS nested inside the theme's own selector, so rules only reach this
 * page. The backend already refuses "<" and unbalanced braces; escaping "<"
 * again here means the stylesheet can never close its <style> tag.
 */
export const scopedCustomCss = (scope: string, css: string) =>
  css.trim() ? `.${scope} {\n${css.replace(/</g, "\\3c ")}\n}` : "";

/** Values for a theme that looks like the rest of the site. */
export const SITE_THEME: PageThemeValues = {
  background_color: "#ffffff",
  surface_color: "#ffffff",
  text_color: "#1d2027",
  muted_text_color: "#6b7280",
  heading_color: "#1d2027",
  primary_color: "#ed405a",
  primary_text_color: "#ffffff",
  border_color: "#e4e4e7",
  heading_font: "",
  body_font: "",
  body_font_size: 18,
  heading_weight: 700,
  heading_uppercase: false,
  radius: 12,
  content_width: "normal",
  section_spacing: "normal",
  background_image: "",
  background_overlay_color: "#000000",
  background_overlay_opacity: 0,
  custom_css: "",
};

/** Starting points for a new theme — every value stays editable afterwards. */
export const THEME_PRESETS: { key: string; label: string; values: PageThemeValues }[] = [
  { key: "site", label: "Site default", values: SITE_THEME },
  {
    key: "night",
    label: "Night",
    values: {
      ...SITE_THEME,
      background_color: "#0f1420",
      surface_color: "#182031",
      text_color: "#e5e7eb",
      muted_text_color: "#9ca3af",
      heading_color: "#ffffff",
      primary_color: "#60a5fa",
      primary_text_color: "#0f1420",
      border_color: "#273248",
      heading_font: "Space Grotesk",
    },
  },
  {
    key: "halloween",
    label: "Halloween",
    values: {
      ...SITE_THEME,
      background_color: "#120a1f",
      surface_color: "#1e1230",
      text_color: "#ede4ff",
      muted_text_color: "#b4a3d6",
      heading_color: "#ff7518",
      primary_color: "#ff7518",
      primary_text_color: "#120a1f",
      border_color: "#3b2659",
      heading_font: "Creepster",
      heading_weight: 400,
      body_font: "Lora",
      radius: 6,
    },
  },
  {
    key: "christmas",
    label: "Christmas",
    values: {
      ...SITE_THEME,
      background_color: "#0f2a1d",
      surface_color: "#163a29",
      text_color: "#f5efe6",
      muted_text_color: "#c9bfae",
      heading_color: "#f8d27a",
      primary_color: "#c62828",
      primary_text_color: "#ffffff",
      border_color: "#2a5a40",
      heading_font: "Mountains of Christmas",
      body_font: "Lora",
      radius: 14,
    },
  },
  {
    key: "editorial",
    label: "Editorial serif",
    values: {
      ...SITE_THEME,
      background_color: "#fbf8f3",
      surface_color: "#ffffff",
      text_color: "#2b2622",
      muted_text_color: "#7a6f66",
      heading_color: "#1a1613",
      primary_color: "#8b2e2e",
      border_color: "#e7ded3",
      heading_font: "Playfair Display",
      body_font: "Libre Baskerville",
      body_font_size: 17,
      radius: 2,
      content_width: "narrow",
      section_spacing: "relaxed",
    },
  },
  {
    key: "playful",
    label: "Playful",
    values: {
      ...SITE_THEME,
      background_color: "#fff7ed",
      surface_color: "#ffffff",
      text_color: "#3f3a52",
      muted_text_color: "#7c7594",
      heading_color: "#7c3aed",
      primary_color: "#f97316",
      border_color: "#fde2c8",
      heading_font: "Poppins",
      heading_weight: 800,
      body_font: "Nunito",
      radius: 24,
    },
  },
];

/** The keys of the shared look — what a site theme takes from a page-theme preset. */
export const LOOK_KEYS = Object.keys({
  background_color: 0,
  surface_color: 0,
  text_color: 0,
  muted_text_color: 0,
  heading_color: 0,
  primary_color: 0,
  primary_text_color: 0,
  border_color: 0,
  heading_font: 0,
  body_font: 0,
  radius: 0,
  background_image: 0,
  background_overlay_color: 0,
  background_overlay_opacity: 0,
  custom_css: 0,
} satisfies Record<keyof ThemeLookValues, 0>) as (keyof ThemeLookValues)[];

export const pickLook = (values: ThemeLookValues): ThemeLookValues =>
  Object.fromEntries(LOOK_KEYS.map((key) => [key, values[key]])) as unknown as ThemeLookValues;
