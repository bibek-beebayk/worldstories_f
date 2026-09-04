import type { Story } from "@/api/types";

// "How much time do you have?" — the time-intent entry point into Quick Read.
//
// The question is about the *reader's* available time, not the story's length
// band, so the buckets are deliberately nested: with five minutes you can read
// a three-minute summary, so the 5-minute bucket contains it. Only the last
// bucket is exclusive, because "15+" is the one that means "something longer".

export interface QuickReadTimeBucket {
  key: string;
  label: string;
  /** Longest summary that fits, in minutes. Absent on the open-ended bucket. */
  maxMinutes?: number;
  /** Shortest summary that qualifies. Only the open-ended bucket sets this. */
  minMinutes?: number;
}

export const QUICK_READ_TIME_BUCKETS: QuickReadTimeBucket[] = [
  { key: "3", label: "3 min", maxMinutes: 3 },
  { key: "5", label: "5 min", maxMinutes: 5 },
  { key: "10", label: "10 min", maxMinutes: 10 },
  { key: "15", label: "15+ min", minMinutes: 11 },
];

export function fitsInBucket(minutes: number | null | undefined, bucket: QuickReadTimeBucket) {
  // A story whose summary length is unknown is never offered under a time
  // promise the site cannot keep.
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return false;
  if (bucket.maxMinutes !== undefined) return minutes <= bucket.maxMinutes;
  if (bucket.minMinutes !== undefined) return minutes >= bucket.minMinutes;
  return true;
}

export function filterByTimeBucket<T extends Pick<Story, "summary_reading_minutes">>(
  stories: T[],
  bucketKey: string | null
): T[] {
  if (!bucketKey) return stories;
  const bucket = QUICK_READ_TIME_BUCKETS.find((entry) => entry.key === bucketKey);
  if (!bucket) return stories;
  return stories.filter((story) => fitsInBucket(story.summary_reading_minutes, bucket));
}

/**
 * The buckets worth offering for a given set of stories.
 *
 * A bucket with nothing behind it is left out rather than shown and then
 * emptied on click — the same "no misleading empty states" rule §3.2 applies
 * to the logged-out homepage.
 */
export function availableTimeBuckets<T extends Pick<Story, "summary_reading_minutes">>(
  stories: T[]
): QuickReadTimeBucket[] {
  return QUICK_READ_TIME_BUCKETS.filter((bucket) =>
    stories.some((story) => fitsInBucket(story.summary_reading_minutes, bucket))
  );
}
