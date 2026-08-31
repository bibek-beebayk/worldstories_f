import type { ReadAlongResponse } from "@/api/types";

type RawCue = ReadAlongResponse["transcript"]["cues"][number];

export interface NormalizedCue {
  id: number;
  /** Authoritative position after sorting by start time. */
  index: number;
  startMs: number;
  endMs: number;
  /** Original seconds value — passed to `player.seek()` which works in seconds. */
  startSeconds: number;
  text: string;
}

/**
 * Convert the read-along payload's cue array into sorted, integer-millisecond
 * cues. Milliseconds (via `Math.round`) recover the backend's exact integer
 * boundaries so lookups and tests have no floating-point fuzz. Malformed
 * entries (non-finite times, `end <= start`) are dropped defensively.
 */
export function normalizeCues(raw: RawCue[] | undefined | null): NormalizedCue[] {
  if (!raw || raw.length === 0) return [];

  const cleaned = raw
    .filter(
      (cue) =>
        Number.isFinite(cue.start_seconds) &&
        Number.isFinite(cue.end_seconds) &&
        cue.end_seconds > cue.start_seconds
    )
    .map((cue) => ({
      id: cue.id,
      startSeconds: cue.start_seconds,
      startMs: Math.round(cue.start_seconds * 1000),
      endMs: Math.round(cue.end_seconds * 1000),
      text: cue.text,
    }))
    .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);

  return cleaned.map((cue, index) => ({ ...cue, index }));
}

/**
 * Index of the cue whose `[startMs, endMs)` window contains `timeSeconds`.
 * Returns -1 when nothing is active — before the first cue, inside a gap
 * between cues, past the last cue, or for a non-finite time. Binary search
 * over the (sorted) cue starts. When two cues touch exactly, a time on that
 * boundary belongs to the later cue (exclusive end).
 */
export function findActiveCueIndex(cues: NormalizedCue[], timeSeconds: number): number {
  const t = timeSeconds * 1000;
  let lo = 0;
  let hi = cues.length - 1;
  let candidate = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].startMs <= t) {
      candidate = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  if (candidate === -1) return -1;
  return t < cues[candidate].endMs ? candidate : -1;
}

/**
 * Index of the last cue that has *started* by `timeSeconds`, ignoring whether
 * it has ended. -1 only when the time precedes the first cue. Used by
 * auto-scroll so the viewport keeps the last-spoken line centered during gaps
 * and trailing silence rather than jumping when nothing is active.
 */
export function cueAtOrBefore(cues: NormalizedCue[], timeSeconds: number): number {
  const t = timeSeconds * 1000;
  let lo = 0;
  let hi = cues.length - 1;
  let candidate = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].startMs <= t) {
      candidate = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return candidate;
}
