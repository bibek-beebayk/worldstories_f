import type { ComponentType, CSSProperties } from "react";
import {
  BookOpen,
  BookOpenText,
  Candy,
  Castle,
  Cat,
  Clock3,
  Cloud,
  Crown,
  Feather,
  Flame,
  Flower2,
  Gem,
  Ghost,
  Gift,
  Globe2,
  Headphones,
  Heart,
  Languages,
  Leaf,
  Mic2,
  Moon,
  Music,
  PartyPopper,
  Rocket,
  Skull,
  Snowflake,
  Sparkles,
  Star,
  Sun,
  TreePine,
  Trophy,
  Users,
  WandSparkles,
  Zap,
} from "lucide-react";
import type { AdminHeroTemplate, HeroConfig, HomeStats } from "@/api/types";

type IconComponent = ComponentType<{ className?: string; style?: CSSProperties }>;

// Keep in step with HERO_ICON_NAMES in apps/story/models.py — the backend only
// stores these names, never markup. Unknown names render the fallback icon.
export const HERO_ICONS: Record<string, IconComponent> = {
  BookOpen,
  BookOpenText,
  Feather,
  Globe2,
  Headphones,
  Languages,
  Mic2,
  Star,
  Sparkles,
  Heart,
  Users,
  Clock3,
  Music,
  Trophy,
  Gift,
  PartyPopper,
  Crown,
  Gem,
  Rocket,
  Zap,
  Sun,
  Moon,
  Cloud,
  Leaf,
  Flower2,
  Snowflake,
  TreePine,
  Flame,
  Ghost,
  Skull,
  Candy,
  Cat,
  Castle,
  WandSparkles,
};

export const HERO_ICON_NAMES = Object.keys(HERO_ICONS);

export const heroIcon = (name: string): IconComponent => HERO_ICONS[name] ?? Star;

/** One decorative icon's place and motion in a background preset. */
interface PresetSlot {
  icon: string;
  className: string;
  animationClass: string;
  style?: CSSProperties;
}

interface HeroPreset {
  label: string;
  /** The two large blurred colour blobs drifting behind the content. */
  blobs: boolean;
  slots: PresetSlot[];
}

// Each preset is a fixed, hand-tuned layout. A template can swap which icons
// fill the slots (background.icons), but not where or how they move — new
// motion means a new preset here, plus its key in the backend choices.
export const HERO_PRESETS: Record<string, HeroPreset> = {
  classic: {
    label: "Classic",
    blobs: true,
    // Each icon nods at a facet of the platform (reading, writing, reach,
    // listening) and drifts slowly so the hero never feels static.
    slots: [
      { icon: "BookOpen", className: "left-[6%] top-[15%] h-10 w-10 sm:h-14 sm:w-14", animationClass: "animate-float", style: { animationDuration: "7s" } },
      { icon: "Globe2", className: "left-[20%] top-[70%] h-8 w-8 sm:h-12 sm:w-12", animationClass: "animate-drift-slow", style: { animationDuration: "14s" } },
      { icon: "Feather", className: "left-[38%] top-[12%] h-7 w-7 sm:h-10 sm:w-10", animationClass: "animate-float", style: { animationDelay: "1.5s", animationDuration: "8s" } },
      { icon: "Headphones", className: "right-[32%] top-[68%] h-8 w-8 sm:h-11 sm:w-11", animationClass: "animate-float", style: { animationDelay: "0.7s", animationDuration: "6.5s" } },
      { icon: "Languages", className: "right-[16%] top-[20%] h-8 w-8 sm:h-11 sm:w-11", animationClass: "animate-drift-slow", style: { animationDelay: "2s", animationDuration: "16s" } },
      { icon: "Mic2", className: "right-[6%] top-[55%] h-7 w-7 sm:h-10 sm:w-10", animationClass: "animate-float", style: { animationDelay: "1s", animationDuration: "7.5s" } },
      { icon: "Star", className: "left-[50%] top-[82%] h-5 w-5 sm:h-7 sm:w-7", animationClass: "animate-float", style: { animationDelay: "2.5s", animationDuration: "5.5s" } },
    ],
  },
  halloween: {
    label: "Halloween",
    blobs: true,
    slots: [
      { icon: "Moon", className: "right-[8%] top-[10%] h-14 w-14 sm:h-20 sm:w-20", animationClass: "animate-drift-slow", style: { animationDuration: "20s" } },
      { icon: "Ghost", className: "left-[5%] top-[18%] h-10 w-10 sm:h-14 sm:w-14", animationClass: "animate-haunt", style: { animationDuration: "9s" } },
      { icon: "Ghost", className: "right-[30%] top-[62%] h-8 w-8 sm:h-11 sm:w-11", animationClass: "animate-haunt", style: { animationDelay: "2s", animationDuration: "11s" } },
      { icon: "Flame", className: "left-[22%] top-[72%] h-7 w-7 sm:h-10 sm:w-10", animationClass: "animate-flicker", style: { animationDuration: "1.8s" } },
      { icon: "Skull", className: "left-[40%] top-[10%] h-6 w-6 sm:h-9 sm:w-9", animationClass: "animate-float", style: { animationDelay: "1s", animationDuration: "8s" } },
      { icon: "Candy", className: "right-[14%] top-[70%] h-6 w-6 sm:h-9 sm:w-9", animationClass: "animate-float", style: { animationDelay: "0.5s", animationDuration: "6s" } },
      { icon: "Cat", className: "left-[52%] top-[80%] h-6 w-6 sm:h-8 sm:w-8", animationClass: "animate-drift-slow", style: { animationDelay: "3s", animationDuration: "15s" } },
    ],
  },
  winter: {
    label: "Winter",
    blobs: true,
    slots: [
      { icon: "Snowflake", className: "left-[4%] -top-10 h-6 w-6 sm:h-8 sm:w-8", animationClass: "animate-snowfall", style: { animationDuration: "11s" } },
      { icon: "Snowflake", className: "left-[16%] -top-10 h-4 w-4 sm:h-6 sm:w-6", animationClass: "animate-snowfall", style: { animationDelay: "4s", animationDuration: "9s" } },
      { icon: "Snowflake", className: "left-[29%] -top-10 h-7 w-7 sm:h-9 sm:w-9", animationClass: "animate-snowfall", style: { animationDelay: "1.5s", animationDuration: "13s" } },
      { icon: "Snowflake", className: "left-[43%] -top-10 h-5 w-5 sm:h-6 sm:w-6", animationClass: "animate-snowfall", style: { animationDelay: "6s", animationDuration: "10s" } },
      { icon: "Snowflake", className: "right-[38%] -top-10 h-6 w-6 sm:h-8 sm:w-8", animationClass: "animate-snowfall", style: { animationDelay: "2.5s", animationDuration: "12s" } },
      { icon: "Snowflake", className: "right-[24%] -top-10 h-4 w-4 sm:h-5 sm:w-5", animationClass: "animate-snowfall", style: { animationDelay: "7s", animationDuration: "8.5s" } },
      { icon: "Snowflake", className: "right-[12%] -top-10 h-7 w-7 sm:h-9 sm:w-9", animationClass: "animate-snowfall", style: { animationDelay: "3.5s", animationDuration: "14s" } },
      { icon: "Snowflake", className: "right-[3%] -top-10 h-5 w-5 sm:h-7 sm:w-7", animationClass: "animate-snowfall", style: { animationDelay: "0.8s", animationDuration: "10.5s" } },
    ],
  },
  christmas: {
    label: "Christmas",
    blobs: true,
    slots: [
      { icon: "Star", className: "left-[46%] top-[8%] h-8 w-8 sm:h-11 sm:w-11", animationClass: "animate-flicker", style: { animationDuration: "3s" } },
      { icon: "TreePine", className: "left-[4%] top-[58%] h-12 w-12 sm:h-16 sm:w-16", animationClass: "animate-float", style: { animationDuration: "9s" } },
      { icon: "TreePine", className: "right-[5%] top-[50%] h-10 w-10 sm:h-14 sm:w-14", animationClass: "animate-float", style: { animationDelay: "1.5s", animationDuration: "10s" } },
      { icon: "Gift", className: "left-[24%] top-[74%] h-7 w-7 sm:h-9 sm:w-9", animationClass: "animate-float", style: { animationDelay: "0.8s", animationDuration: "6.5s" } },
      { icon: "Gift", className: "right-[28%] top-[72%] h-6 w-6 sm:h-8 sm:w-8", animationClass: "animate-float", style: { animationDelay: "2.2s", animationDuration: "7s" } },
      { icon: "Snowflake", className: "left-[12%] -top-10 h-5 w-5 sm:h-7 sm:w-7", animationClass: "animate-snowfall", style: { animationDuration: "11s" } },
      { icon: "Snowflake", className: "left-[34%] -top-10 h-4 w-4 sm:h-6 sm:w-6", animationClass: "animate-snowfall", style: { animationDelay: "3s", animationDuration: "9.5s" } },
      { icon: "Snowflake", className: "right-[36%] -top-10 h-6 w-6 sm:h-7 sm:w-7", animationClass: "animate-snowfall", style: { animationDelay: "5.5s", animationDuration: "12s" } },
      { icon: "Snowflake", className: "right-[16%] -top-10 h-4 w-4 sm:h-6 sm:w-6", animationClass: "animate-snowfall", style: { animationDelay: "1.5s", animationDuration: "10s" } },
    ],
  },
  none: {
    label: "None",
    blobs: false,
    slots: [],
  },
};

export const heroPreset = (name: string): HeroPreset => HERO_PRESETS[name] ?? HERO_PRESETS.classic;

/** The preset's slots, with a template's own icons (if any) cycled through them. */
export const resolvePresetSlots = (preset: HeroPreset, icons: string[]): PresetSlot[] =>
  icons.length === 0
    ? preset.slots
    : preset.slots.map((slot, index) => ({ ...slot, icon: icons[index % icons.length] }));

/**
 * The hero as it was hardcoded before templates existed — shown whenever the
 * API sends no template (none default/scheduled, or an older backend), so the
 * homepage is never left without one. Mirrors the "Regular" template seeded by
 * migration 0083.
 */
export const buildDefaultHero = (stats?: HomeStats): HeroConfig => ({
  title: { prefix: "World", highlight: "Stories", highlight_from: "#ed405a", highlight_to: "#fbbf24" },
  description:
    "The home for stories from around the world. Read novels, poetry, and short fiction for free, and discover audiobooks and read-along narrations from authors across every genre and country.",
  info_lines: [
    { icon: "BookOpenText", text: "Full novels, quick reads & poetry" },
    { icon: "Headphones", text: "Audiobooks & read-along narration" },
  ],
  stats: stats
    ? [
        { label: "stories", value: stats.stories },
        { label: "creators", value: stats.creators },
        { label: "readers", value: stats.readers },
      ]
    : [],
  cta: { label: "Start Reading", url: "/library", bg_from: "#ed405a", bg_to: "#f97316", text_color: "#ffffff" },
  background: { color: "#1a212d", image: "", accent: "#ed405a", animation: "classic", icons: [] },
});

/**
 * The public shape for an admin form's current values, so the editor can
 * preview the real hero as it's typed. Mirrors serialize_hero() in
 * apps/story/serializers.py; live stats use whatever counts are passed in.
 */
export const heroConfigFromTemplate = (
  template: Omit<AdminHeroTemplate, "id" | "is_default" | "status" | "updated_at">,
  liveStats: HomeStats
): HeroConfig => {
  const stats = ([1, 2, 3] as const)
    .map((n) => ({
      source: template[`stat_${n}_source`],
      label: template[`stat_${n}_label`],
      value: template[`stat_${n}_value`],
    }))
    .filter((stat) => template.show_stats && stat.label)
    .map((stat) => ({
      label: stat.label,
      value: stat.source === "custom" ? stat.value : liveStats[stat.source],
    }));

  return {
    title: {
      prefix: template.title_prefix,
      highlight: template.title_highlight,
      highlight_from: template.title_highlight_from,
      highlight_to: template.title_highlight_to,
    },
    description: template.description,
    info_lines: [
      { icon: template.info_line_1_icon, text: template.info_line_1_text },
      { icon: template.info_line_2_icon, text: template.info_line_2_text },
    ].filter((line) => template.show_info_lines && line.text),
    stats,
    cta: {
      label: template.cta_label,
      url: template.cta_url,
      bg_from: template.cta_bg_from,
      bg_to: template.cta_bg_to,
      text_color: template.cta_text_color,
    },
    background: {
      color: template.background_color,
      image: template.background_image,
      accent: template.accent_color,
      animation: template.animation_preset,
      icons: template.animation_icons,
    },
  };
};
