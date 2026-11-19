import type { DiscoverJustAdded, JustAddedFormat } from "@/api/types";
import { EMPTY_FILTERS, buildLibraryParams } from "@/lib/libraryParams";

// Small pure helpers behind the Discover page, kept out of the components so
// the wording and the Library hand-off can be tested on their own.

/** The time chips: how long the reader has, as the Library's `max_minutes`. */
export const TIME_OPTIONS: { key: string; label: string; minutes: number; phrase: string }[] = [
  { key: "5", label: "5 min", minutes: 5, phrase: "under 5 min" },
  { key: "20", label: "20 min", minutes: 20, phrase: "under 20 min" },
  { key: "60", label: "1 hour", minutes: 60, phrase: "under 1 hour" },
  { key: "180", label: "An evening", minutes: 180, phrase: "up to 3 hours" },
];

/**
 * The finder's single call to action, worded for the choice made:
 * "Show scary stories · under 20 min", "Show stories · under 5 min",
 * "Show funny stories", or "Browse the library" with nothing chosen.
 */
export function finderLabel(moodName: string | null, timeKey: string | null): string {
  const time = TIME_OPTIONS.find((option) => option.key === timeKey);
  if (!moodName && !time) return "Browse the library";
  const subject = moodName ? `${moodName.toLowerCase()} stories` : "stories";
  return `Show ${subject}${time ? ` · ${time.phrase}` : ""}`;
}

/** The Library URL for the finder's choice, in the Library's own param names. */
export function finderHref(moodSlug: string | null, timeKey: string | null): string {
  const time = TIME_OPTIONS.find((option) => option.key === timeKey);
  const query = buildLibraryParams({
    ...EMPTY_FILTERS,
    mood: moodSlug ? [moodSlug] : [],
    maxMinutes: time ? String(time.minutes) : "",
  }).toString();
  return `/library${query ? `?${query}` : ""}`;
}

/** "3 readers" / "1 reader". */
export function formatReaders(count: number): string {
  return `${count.toLocaleString()} ${count === 1 ? "reader" : "readers"}`;
}

/** The trending arrow: up, down, new, or nothing when the place did not change. */
export function rankChangeLabel(change: number | null): { kind: "up" | "down" | "new" | "same"; text: string } {
  if (change === null) return { kind: "new", text: "New" };
  if (change > 0) return { kind: "up", text: `Up ${change}` };
  if (change < 0) return { kind: "down", text: `Down ${Math.abs(change)}` };
  return { kind: "same", text: "" };
}

export const JUST_ADDED_TABS: { key: JustAddedFormat | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "read", label: "Read" },
  { key: "listen", label: "Listen" },
  { key: "read_along", label: "Read Along" },
  { key: "watch", label: "Watch" },
  { key: "quick_read", label: "Quick Read" },
];

/** The rail's items for a tab; each story is already in the list once, under its newest format. */
export function justAddedFor(items: DiscoverJustAdded[], tab: JustAddedFormat | "all"): DiscoverJustAdded[] {
  return tab === "all" ? items : items.filter((item) => item.format === tab);
}

export const JOURNEY_TYPE_LABELS: Record<string, string> = {
  country: "Country",
  theme: "Theme",
  genre: "Genre",
  curated: "Curated",
};
