/**
 * Pure helpers for the Read Along "highlight sync" offset — a per-device
 * adjustment that shifts cue highlighting earlier or later so a reader can
 * correct timed cues that consistently run ahead of or behind the audio.
 * No React / DOM / storage imports, so it is directly unit-testable.
 */

export const SYNC_OFFSET_MAX = 5;
export const SYNC_OFFSET_STEP = 0.1;
export const SYNC_OFFSET_STORAGE_KEY = "read_along_sync_offset";

/**
 * Coerce an arbitrary stored/typed value into a safe offset in seconds:
 * non-finite input becomes `0`, the result is clamped to `±SYNC_OFFSET_MAX`,
 * and rounded to one decimal so repeated `+= 0.1` steps do not accumulate
 * floating-point drift.
 */
export function clampSyncOffset(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const clamped = Math.min(SYNC_OFFSET_MAX, Math.max(-SYNC_OFFSET_MAX, n));
  return Math.round(clamped * 10) / 10;
}

/** `0` -> `"0s"`, `0.4` -> `"+0.4s"`, `-0.3` -> `"-0.3s"`. */
export function formatSyncOffset(seconds: number): string {
  if (seconds === 0) return "0s";
  const sign = seconds > 0 ? "+" : "-";
  return `${sign}${Math.abs(seconds).toFixed(1)}s`;
}
