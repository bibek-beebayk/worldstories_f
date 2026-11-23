import type {
  HomeSectionDevice,
  HomeSectionDisplay,
  HomeSectionDisplayBackground,
  HomeSectionHeadingAlign,
  HomeSectionSpacing,
  HomeSectionWidth,
} from "@/api/types";

export const DEFAULT_DISPLAY: HomeSectionDisplay = {
  background: "none",
  heading_align: "left",
  spacing: "normal",
  width: "contained",
  hide_title: false,
  show_author: true,
  show_rating: false,
  show_reading_time: true,
  show_badges: true,
  show_summary: false,
};

const VALID_BACKGROUNDS = new Set<HomeSectionDisplayBackground>(["none", "tint", "dark", "brand"]);
const VALID_HEADING_ALIGNS = new Set<HomeSectionHeadingAlign>(["left", "center"]);
const VALID_SPACINGS = new Set<HomeSectionSpacing>(["compact", "normal", "roomy"]);
const VALID_WIDTHS = new Set<HomeSectionWidth>(["contained", "full"]);

/**
 * Fill missing display keys with defaults and drop unknown or invalid values so
 * callers always get a complete, type-safe HomeSectionDisplay object.
 */
export function normalizeDisplay(
  partial?: Partial<HomeSectionDisplay> | Record<string, unknown> | null,
): HomeSectionDisplay {
  if (!partial || typeof partial !== "object") {
    return { ...DEFAULT_DISPLAY };
  }
  const raw = partial as Record<string, unknown>;
  const background =
    typeof raw.background === "string" && VALID_BACKGROUNDS.has(raw.background as HomeSectionDisplayBackground)
      ? (raw.background as HomeSectionDisplayBackground)
      : DEFAULT_DISPLAY.background;
  const heading_align =
    typeof raw.heading_align === "string" && VALID_HEADING_ALIGNS.has(raw.heading_align as HomeSectionHeadingAlign)
      ? (raw.heading_align as HomeSectionHeadingAlign)
      : DEFAULT_DISPLAY.heading_align;
  const spacing =
    typeof raw.spacing === "string" && VALID_SPACINGS.has(raw.spacing as HomeSectionSpacing)
      ? (raw.spacing as HomeSectionSpacing)
      : DEFAULT_DISPLAY.spacing;
  const width =
    typeof raw.width === "string" && VALID_WIDTHS.has(raw.width as HomeSectionWidth)
      ? (raw.width as HomeSectionWidth)
      : DEFAULT_DISPLAY.width;

  return {
    background,
    heading_align,
    spacing,
    width,
    hide_title: typeof raw.hide_title === "boolean" ? raw.hide_title : DEFAULT_DISPLAY.hide_title,
    show_author: typeof raw.show_author === "boolean" ? raw.show_author : DEFAULT_DISPLAY.show_author,
    show_rating: typeof raw.show_rating === "boolean" ? raw.show_rating : DEFAULT_DISPLAY.show_rating,
    show_reading_time:
      typeof raw.show_reading_time === "boolean" ? raw.show_reading_time : DEFAULT_DISPLAY.show_reading_time,
    show_badges: typeof raw.show_badges === "boolean" ? raw.show_badges : DEFAULT_DISPLAY.show_badges,
    show_summary: typeof raw.show_summary === "boolean" ? raw.show_summary : DEFAULT_DISPLAY.show_summary,
  };
}

// Whole static Tailwind class strings so Tailwind's scanner always emits them.
const DEVICE_CLASSES: Record<HomeSectionDevice, string> = {
  all: "",
  mobile: "md:hidden",
  desktop: "hidden md:block",
};

const BACKGROUND_SURFACE_CLASSES: Record<HomeSectionDisplayBackground, string> = {
  none: "",
  tint: "[--section-bg:hsl(var(--muted)/0.5)] bg-muted/50 text-foreground",
  dark: "[--section-bg:hsl(var(--hero-dark))] bg-[hsl(var(--hero-dark))] text-white [--foreground:0_0%_100%] [--muted-foreground:220_15%_83%] [--border:220_16%_30%] [&_h2]:text-white [&_h3]:text-white",
  brand:
    "[--section-bg:color-mix(in_srgb,hsl(var(--primary))_72%,black)] bg-[color-mix(in_srgb,hsl(var(--primary))_72%,black)] text-white [--foreground:0_0%_100%] [--muted-foreground:0_0%_92%] [--border:0_0%_100%/0.25] [&_h2]:text-white [&_h3]:text-white",
};

const SPACING_NO_BG_CLASSES: Record<HomeSectionSpacing, string> = {
  compact: "py-0",
  normal: "",
  roomy: "py-6 sm:py-8",
};

const SPACING_WITH_BG_CLASSES: Record<HomeSectionSpacing, string> = {
  compact: "py-4 sm:py-5",
  normal: "py-6 sm:py-8",
  roomy: "py-10 sm:py-12",
};

const WIDTH_WITH_BG_CLASSES: Record<HomeSectionWidth, string> = {
  contained: "rounded-lg px-4 sm:px-6",
  full: "[clip-path:inset(0_-100vmax)] shadow-[0_0_0_100vmax_var(--section-bg)]",
};

/**
 * Compute wrapper Tailwind classes for a homepage section frame.
 * Default settings (background "none", spacing "normal", device "all") return "".
 */
export function sectionFrameClasses(display: HomeSectionDisplay, device: HomeSectionDevice = "all"): string {
  const hasBg = display.background !== "none";
  const parts = [
    DEVICE_CLASSES[device] ?? "",
    BACKGROUND_SURFACE_CLASSES[display.background] ?? "",
    hasBg ? SPACING_WITH_BG_CLASSES[display.spacing] : SPACING_NO_BG_CLASSES[display.spacing],
    hasBg ? WIDTH_WITH_BG_CLASSES[display.width] : "",
  ].filter(Boolean);
  return parts.join(" ");
}

/** True when the section renders on a dark or brand surface requiring light-on-dark accents. */
export function isInvertedSurface(background: HomeSectionDisplayBackground): boolean {
  return background === "dark" || background === "brand";
}

/** Build a root-relative hash link for a section anchor id, or null when unset. */
export function anchorHref(anchorId?: string | null): string | null {
  const cleaned = (anchorId ?? "").trim();
  return cleaned ? `/#${cleaned}` : null;
}

export interface CardShowFlags {
  author?: boolean;
  rating?: boolean;
  readingTime?: boolean;
  badges?: boolean;
  summary?: boolean;
}

export function cardShowFlagsFromDisplay(display: HomeSectionDisplay): Required<CardShowFlags> {
  return {
    author: display.show_author,
    rating: display.show_rating,
    readingTime: display.show_reading_time,
    badges: display.show_badges,
    summary: display.show_summary,
  };
}
