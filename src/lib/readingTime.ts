// One place to phrase a time estimate, so a story reads as "12 min read"
// wherever it appears — card, detail, search result, recommendation rail,
// Continue Reading. The numbers themselves come from the API
// (Story.reading_time_minutes, ContinueReadingItem.remaining_minutes); this
// module only decides how they are worded.
//
// Every function returns null for a missing or non-positive estimate rather
// than a "0 min" string: a story whose length we don't know should show
// nothing, not a wrong number. Callers render the label only when it is
// non-null.

function normalize(minutes: number | null | undefined): number | null {
  if (minutes === null || minutes === undefined) return null;
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  return Math.round(minutes);
}

/** Compact form for dense surfaces such as story cards: `12 min`. */
export function formatMinutes(minutes: number | null | undefined): string | null {
  const value = normalize(minutes);
  return value === null ? null : `${value} min`;
}

/** Full form for surfaces with room to spell it out: `12 min read`. */
export function formatReadingMinutes(minutes: number | null | undefined): string | null {
  const value = normalize(minutes);
  return value === null ? null : `${value} min read`;
}

/**
 * How much of a partly-finished item is left: `~8 min remaining`.
 *
 * Approximate by design — the underlying estimate assumes an average reading
 * pace and, for chapter stories, treats chapters as equal-sized slices. The
 * tilde is the honest signal that this is a guide, not a measurement.
 */
export function formatRemainingMinutes(minutes: number | null | undefined): string | null {
  const value = normalize(minutes);
  return value === null ? null : `~${value} min remaining`;
}
