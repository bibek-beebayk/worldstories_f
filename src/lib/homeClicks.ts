import { trackAnalyticsEvent } from "@/lib/analytics";

// Click tracking for the homepage sections. One `home_section_click` event per
// click on a link inside a section, so the admin can see which sections earn
// clicks (clicks / homepage visits). The tracker works from the section's own
// items rather than from each card, so every card style is covered without
// touching it.

export interface ClickableItem {
  id: number;
  type: "story" | "video" | "blog";
  /** The slug the item's links end with. */
  slug?: string;
}

export interface HomeClickInput {
  sectionId: number;
  sectionType: string;
  /** 1-based place of the section on the page. */
  position: number;
  href: string | null;
  items: ClickableItem[];
}

/** Which of the section's items a link points at, matched on the slug in its path. */
export function findClickedItem(href: string | null, items: ClickableItem[]): { item: ClickableItem; index: number } | null {
  if (!href) return null;
  let path = href;
  try {
    path = new URL(href, "https://worldstories.invalid").pathname;
  } catch {
    // keep the raw href
  }
  const segments = path.split("/").filter(Boolean).map((segment) => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  });
  const index = items.findIndex((item) => item.slug && segments.includes(item.slug));
  return index === -1 ? null : { item: items[index], index };
}

export function buildHomeClickMetadata(input: HomeClickInput): Record<string, string | number | boolean | null> {
  const match = findClickedItem(input.href, input.items);
  return {
    section_id: input.sectionId,
    section_type: input.sectionType,
    position: input.position,
    item_id: match?.item.id ?? null,
    item_type: match?.item.type ?? "link",
    item_position: match ? match.index + 1 : null,
  };
}

export function trackHomeSectionClick(input: HomeClickInput) {
  trackAnalyticsEvent({ event_type: "home_section_click", metadata: buildHomeClickMetadata(input) });
}
