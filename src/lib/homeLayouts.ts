import type { HomeSectionCardStyle, HomeSectionLayout, HomeSectionType } from "@/api/types";

export const STORY_LAYOUTS: readonly HomeSectionLayout[] = [
  "grid",
  "rail",
  "trending",
  "featured",
  "bento",
  "list",
  "carousel",
  "tworow",
  "covers",
];

export const MEDIA_LAYOUTS: readonly HomeSectionLayout[] = [
  "grid",
  "rail",
  "featured",
  "bento",
  "list",
  "carousel",
  "tworow",
];

export const STORY_CARD_STYLES: readonly HomeSectionCardStyle[] = ["default", "compact", "overlay", "wide", "text"];

export const MEDIA_CARD_STYLES: readonly HomeSectionCardStyle[] = ["default", "overlay", "wide", "text"];

export const NEW_LAYOUTS: ReadonlySet<HomeSectionLayout> = new Set([
  "featured",
  "bento",
  "list",
  "carousel",
  "tworow",
  "covers",
]);

export function allowedLayoutsForType(sectionType: HomeSectionType): readonly HomeSectionLayout[] {
  if (sectionType === "stories_query" || sectionType === "stories_manual") return STORY_LAYOUTS;
  if (sectionType === "videos" || sectionType === "blogs") return MEDIA_LAYOUTS;
  return [];
}

export function allowedCardStylesForType(sectionType: HomeSectionType): readonly HomeSectionCardStyle[] {
  if (sectionType === "stories_query" || sectionType === "stories_manual") return STORY_CARD_STYLES;
  if (sectionType === "videos" || sectionType === "blogs") return MEDIA_CARD_STYLES;
  return [];
}

export function effectiveLayout(
  layout: HomeSectionLayout,
  itemCount: number,
  columnsDesktop: number,
  sectionType: HomeSectionType,
): HomeSectionLayout {
  const allowed = allowedLayoutsForType(sectionType);
  if (!allowed.includes(layout)) return "grid";
  if ((layout === "featured" || layout === "bento") && itemCount < 3) return "grid";
  if (layout === "tworow" && itemCount <= columnsDesktop * 2) return "grid";
  if (layout === "carousel" && itemCount <= columnsDesktop) return "grid";
  if (layout === "covers" && itemCount < 2) return "grid";
  return layout;
}

export function bentoSpan(index: number): { colSpan: 1 | 2; rowSpan: 1 | 2 } {
  const mod = ((index % 7) + 7) % 7;
  if (mod === 0) return { colSpan: 2, rowSpan: 2 };
  if (mod === 3) return { colSpan: 2, rowSpan: 1 };
  return { colSpan: 1, rowSpan: 1 };
}

export function effectiveCardStyle(style: HomeSectionCardStyle, sectionType: HomeSectionType): HomeSectionCardStyle {
  const allowed = allowedCardStylesForType(sectionType);
  return allowed.includes(style) ? style : "default";
}
