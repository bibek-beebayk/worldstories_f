import type { ContinueListeningItem, ContinueReadingItem, Story } from "@/api/types";
import { audiobookUrl } from "@/lib/urls";

// The homepage "Continue" row merges what a reader is reading and listening to
// into one list, newest activity first. Items nobody has touched for a month,
// or that were barely begun, are real but not what a returning reader wants
// at a glance — they sit behind a "Show older" toggle instead of in the row.

/** No activity for this long and an item is tucked away. */
export const STALE_AFTER_DAYS = 30;
/** Below this share of the story, "in progress" is really "opened once". */
export const MIN_PROGRESS = 0.03;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ContinueEntry {
  kind: "reading" | "listening";
  story: Story;
  href: string;
  /** The chapter or track the reader is on, when known. */
  detail: string | null;
  /** 0–1 */
  progress: number;
  remainingMinutes: number | null;
  updatedAt: string;
}

const time = (iso: string) => {
  const value = new Date(iso).getTime();
  return Number.isNaN(value) ? 0 : value;
};

/**
 * One list from both queues, most recent activity first. A story that is in
 * both (read a chapter, then listened to the audiobook) appears once, as
 * whichever the reader touched last.
 */
export function mergeContinueItems(
  reading: ContinueReadingItem[] | undefined,
  listening: ContinueListeningItem[] | undefined
): ContinueEntry[] {
  const entries: ContinueEntry[] = [
    ...(reading ?? []).map(
      (item): ContinueEntry => ({
        kind: "reading",
        story: item.story,
        href: item.chapter_slug ? `/read/${item.story.slug}/${item.chapter_slug}` : `/read/${item.story.slug}`,
        detail: item.chapter_title,
        progress: item.overall_progress,
        remainingMinutes: item.remaining_minutes,
        updatedAt: item.updated_at,
      })
    ),
    ...(listening ?? []).map(
      (item): ContinueEntry => ({
        kind: "listening",
        story: item.story,
        href: item.audio_slug
          ? audiobookUrl(item.story.slug, item.audio_slug)
          : `/read/${item.story.slug}`,
        detail: item.audio_title,
        progress: item.overall_progress,
        remainingMinutes: item.remaining_minutes,
        updatedAt: item.updated_at,
      })
    ),
  ].sort((a, b) => time(b.updatedAt) - time(a.updatedAt));

  const seen = new Set<number>();
  return entries.filter((entry) => {
    if (seen.has(entry.story.id)) return false;
    seen.add(entry.story.id);
    return true;
  });
}

/** Stale = no activity for 30+ days, or under 3% of the story done. */
export function isStaleEntry(entry: ContinueEntry, now: number = Date.now()): boolean {
  const age = now - time(entry.updatedAt);
  return age >= STALE_AFTER_DAYS * DAY_MS || entry.progress < MIN_PROGRESS;
}

/** Splits a merged list into what shows in the row and what hides behind the toggle. */
export function splitContinueEntries(entries: ContinueEntry[], now: number = Date.now()) {
  const recent: ContinueEntry[] = [];
  const older: ContinueEntry[] = [];
  for (const entry of entries) (isStaleEntry(entry, now) ? older : recent).push(entry);
  return { recent, older };
}
